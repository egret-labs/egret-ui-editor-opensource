import { IFocusablePart, IOperationEvent, KeybindingType, KeyBindingBrowserMap, KeyBindingMainMap } from '../common/operations';
import { Emitter, Event } from 'egret/base/common/event';
import { ipcRenderer as ipc } from 'electron';
import { IWindowClientService } from '../../windows/common/window';
import { IOperationBrowserService } from '../common/operations-browser';
import { systemRols, SystemCommands } from '../commands/systemCommands';

import * as Mousetrap from 'mousetrap';
import { isWindows } from 'egret/base/common/platform';


(function (Mousetrap) {
	const _globalCallbacks = {};
	const _originalStopCallback = Mousetrap.prototype.stopCallback;
	Mousetrap.prototype.stopCallback = function (e, element, combo, sequence) {
		const self = this;

		if (self.paused) {
			return true;
		}

		if (_globalCallbacks[combo] || _globalCallbacks[sequence]) {
			return false;
		}

		return _originalStopCallback.call(self, e, element, combo);
	};

	Mousetrap.prototype.bindGlobal = function (keys, callback, action) {
		const self = this;
		self.bind(keys, callback, action);

		if (keys instanceof Array) {
			for (let i = 0; i < keys.length; i++) {
				_globalCallbacks[keys[i]] = true;
			}
			return;
		}

		_globalCallbacks[keys] = true;
	};
	Mousetrap['init']();
})(Mousetrap);

/**
 * 判断是否是系统命令
 */
function isSystemRols(command: string): boolean {
	return systemRols.indexOf(command) != -1;
}

/**
 * 操作服务
 */
export class OperationBrowserService implements IOperationBrowserService {
	_serviceBrand: undefined;

	private _onWillExecuteCommand: Emitter<IOperationEvent>;

	/** ipc通信时间戳 */
	private oneTimeListenerTokenGenerator: number;
	constructor(
		@IWindowClientService private windowService: IWindowClientService
	) {
		this.oneTimeListenerTokenGenerator = 0;
		this._onWillExecuteCommand = new Emitter<IOperationEvent>();
		this.registerListener();
	}

	private registerListener(): void {
		//从主进程运行命令
		ipc.on('egret:runCommand', (event, reply: { resolveChannel: string, command: string, args: any[] }) => {
			this.doExecuteCommand(reply.command, reply.args).then(result => {
				ipc.send(reply.resolveChannel, result);
			});
		});

		//更新渲染进程快捷键
		ipc.on('egret:updateBrowserKeybinding', (event, reply: { browserKeyMap: KeyBindingBrowserMap }) => {
			this.doUpdateKeybingding(reply.browserKeyMap);
		});

		//system
		if (isWindows) {
			[SystemCommands.COPY, SystemCommands.CUT, SystemCommands.PASTE].forEach(key => {
				document.addEventListener(key, e => {
					this.doExecuteCommand(key, [], false);
				});
			});
			//对全选做特殊处理
			Mousetrap.bindGlobal('ctrl+a', (e, combo) => {
				this.executeCommand(SystemCommands.SELECT_ALL);
			});
			// 修复 https://github.com/egret-labs/egret-ui-editor-opensource/issues/67
			document.addEventListener('keydown', (e) => {
				if (!(e.target instanceof HTMLInputElement) &&
					!(e.target instanceof HTMLTextAreaElement)) {
					if (e.ctrlKey && e.key === 'z') {
						e.preventDefault();
						this.doExecuteCommand(SystemCommands.UNDO, [], false);
					}
				}
			});
		}
	}

	private currentKeybingdingMap: KeyBindingBrowserMap = {};
	/**
	 * 注册命令对应的快捷键
	 * @param command 命令
	 * @param defaultKey 快捷键
	 * @param type 键盘按下还是松起时触发
	 * @param name 命令名
	 * @param description 命令描述 
	 * @param global 是否是全局快捷键，即如果焦点在input里是否会触发该快捷键
	 */
	public registerKeybingding(command: string, defaultKey: string, type: KeybindingType, name: string, description: string, global: boolean = false): void {
		const executeOperationToken = this.oneTimeListenerTokenGenerator++;
		const resolveChannel = `egret:resolveChannel${executeOperationToken}`;
		ipc.once(resolveChannel, (event, replay: {
			key: string,
			command: string,
			type: KeybindingType,
			global: boolean,
			name: string,
			description: string,
			error: string
		}) => {
			if (replay.error) {
				throw new Error(replay.error);
			} else {
				this.doRegisterKeybingding(replay.key, replay.command, replay.type, replay.name, replay.description, replay.global);
			}
		});
		ipc.send('egret:registerKeybingding', {
			resolveChannel,
			defaultKey,
			command,
			type,
			name,
			description,
			global,
			windowId: this.windowService.getCurrentWindowId()
		});
	}

	private doRegisterKeybingding(key: string, command: string, type: KeybindingType, name: string, description: string, global: boolean): void {
		if (command in this.currentKeybingdingMap) {
			return;
		}
		this.currentKeybingdingMap[command] = { key, type, global, name, description };

		if (global) {
			Mousetrap.bindGlobal(key.split(' '), (e, combo) => this.keyTigger_handler(e, combo), type);
		} else {
			Mousetrap.bind(key.split(' '), (e, combo) => this.keyTigger_handler(e, combo), type);
		}
	}

	/**
	 * 得到当前快捷键绑定关系表，用于渲染进程弹出面板进行修改
	 */
	public getKeybingdsConfig(): Promise<{
		mainDefault: KeyBindingMainMap,
		browserDrault: KeyBindingBrowserMap,
		mainUser: KeyBindingMainMap,
		browserUser: KeyBindingBrowserMap
	}> {
		return new Promise((resolve) => {
			const executeOperationToken = this.oneTimeListenerTokenGenerator++;
			const resolveChannel = `egret:resolveChannel${executeOperationToken}`;
			ipc.once(resolveChannel, (event, replay: {
				mainDefault: KeyBindingMainMap,
				browserDrault: KeyBindingBrowserMap,
				mainUser: KeyBindingMainMap,
				browserUser: KeyBindingBrowserMap
			}) => {
				resolve(replay);
			});
			ipc.send('egret:getKeybingdsConfig', {
				resolveChannel,
				windowId: this.windowService.getCurrentWindowId()
			});

		});
	}

	/**
	 * 更新快捷键配置
	 */
	public updateKeybinding(mainConfig: KeyBindingMainMap, browserConfig: KeyBindingBrowserMap): void {
		ipc.send('egret:updateKeybinding', {
			mainConfig,
			browserConfig
		});
	}

	/**
	 * 替换当前渲染进程快捷键
	 */
	private doUpdateKeybingding(browserKeyMap: KeyBindingBrowserMap): void {
		for (var command in this.currentKeybingdingMap) {
			var key = this.currentKeybingdingMap[command].key;
			var type = this.currentKeybingdingMap[command].type;
			Mousetrap.unbind(key.split(' '), type);
		}
		this.currentKeybingdingMap = {};
		for (var command in browserKeyMap) {
			var key = browserKeyMap[command].key;
			var type = browserKeyMap[command].type;
			const global = browserKeyMap[command].global;
			const name = browserKeyMap[command].name;
			const description = browserKeyMap[command].description;
			this.doRegisterKeybingding(key, command, type, name, description, global);
		}
	}

	private keyTigger_handler(e: ExtendedKeyboardEvent, combo: string): void {
		let command = '';
		for (const curCommand in this.currentKeybingdingMap) {
			if (
				this.currentKeybingdingMap[curCommand].key == combo ||
				this.currentKeybingdingMap[curCommand].key.split(' ').indexOf(combo) != -1
			) {
				command = curCommand;
				break;
			}
		}
		this.doExecuteCommandWithFocus(e.target as Element, command, [], true);
	}

	/**
	 * 操作即将被执行
	 */
	public get onWillExecuteCommand(): Event<IOperationEvent> {
		return this._onWillExecuteCommand.event;
	}

	private partList: IFocusablePart[] = [];
	/**
	 * 注册一个可聚焦的部件，不可重复注册
	 * @param part 可聚焦的部件
	 */
	public registerFocusablePart(part: IFocusablePart): void {
		if (this.partList.indexOf(part) != -1) {
			console.warn('可聚焦部件 ' + part + ' 被重复注册');
			return;
		}
		this.partList.push(part);
	}
	/**
	 * 取消注册一个可接受快捷键的部件
	 * @param part 
	 */
	public unregisterFocusablePart(part: IFocusablePart): void {
		const index = this.partList.indexOf(part);
		if (index != -1) {
			this.partList.splice(index, 1);
		}
	}

	/**
	 * 执行操作
	 * @param command 要执行的命令 
	 * @param args 命令初始化的参数
	 */
	public executeCommand<T = any>(command: string, ...args: any[]): Promise<T> {
		return this.doExecuteCommand(command, args);
	}

	private doExecuteCommand<T = any>(command: string, args: any[], execInDocument: boolean = true): Promise<T> {
		let targetElement = document.activeElement;
		if (!targetElement) {
			targetElement = document.body;
		}
		//直接执行的命令都是全局命令，会忽视Input获得焦点的情况
		return this.doExecuteCommandWithFocus(targetElement, command, args, execInDocument);
	}

	private doExecuteCommandWithFocus<T = any>(el: Element, command: string, args: any[], execInDocument: boolean = true): Promise<T> {
		if (!el) {
			console.warn('当前没有任何焦点，无法执行命令: ' + command);
			return Promise.resolve(void 0);
		}
		let isInput = false;
		if (el && (el.tagName.toLocaleLowerCase() == 'input' || el.tagName.toLocaleLowerCase() == 'textarea')) {
			isInput = true;
		}
		if (isInput) {
			//如果执行的是系统命令，则直接
			if (isSystemRols(command)) {
				if (execInDocument) {
					if (command != SystemCommands.SELECT_ALL) {
						document.execCommand(command);
					} else {
						this.textInputSelectAll(el as HTMLInputElement);
					}
				}
				return Promise.resolve(void 0);
			}
		}
		let targetPart: IFocusablePart = null;
		let current = el;
		while (current) {
			for (let i = 0; i < this.partList.length; i++) {
				const part = this.partList[i];
				if (part.getRelativeELement() == current) {
					//被注册指定命令的part 才是真正要得到的part
					if (part.hasCommand(command)) {
						targetPart = part;
						break;
					}
				}
			}
			current = current.parentElement;
		}
		if (targetPart) {
			this._onWillExecuteCommand.fire({ command });
			return targetPart.executeCommand(command, ...args);
		}
		if (!targetPart && isSystemRols(command)) {
			//如果没有找到任何聚焦部件，并且是系统命令，则直接执行系统命令
			if (execInDocument) {
				if (command != SystemCommands.SELECT_ALL) {
					document.execCommand(command);
				}
			}
			return Promise.resolve(void 0);
		}
		console.warn('要执行的命令 ' + command + ' 没有被任何可聚焦部件接收，无法执行。');
		return Promise.resolve(void 0);
	}

	private textInputSelectAll(input: HTMLInputElement): void {
		input.setSelectionRange(0, input.value ? input.value.length : 0);
	}
}
