import { IWindowsMainService } from '../../windows/common/windows';
import { ipcMain as ipc } from 'electron';
import { KeybindingType, KeyBindingBrowserMap, KeyBindingMainMap } from '../common/operations';
import { IStateService } from '../../state/common/state';
import { clone } from 'egret/base/common/objects';
import { Emitter, Event } from 'egret/base/common/event';
import { IOperationMainService } from '../common/operations-main';
import { localize } from '../../../base/localization/nls';

const KEYBINDING_MAIN = 'keybindingMain';
const KEYBINDING_BROWSER = 'keybindingBrowser';

/**
 * 操作服务，主进程使用
 */
export class OperationMainService implements IOperationMainService {
	_serviceBrand: undefined;

	/** ipc通信时间戳 */
	private oneTimeListenerTokenGenerator: number;

	private _onKeybindingUpdate: Emitter<void>;
	constructor(
		@IStateService private stateService: IStateService,
		@IWindowsMainService private windowsMainService: IWindowsMainService
	) {
		this.oneTimeListenerTokenGenerator = 0;
		this._onKeybindingUpdate = new Emitter<void>();
		this.initKeybinding();
		this.registerListener();
	}
	/**
	 * 快捷键绑定数据更新，需要重新绑定快捷键
	 */
	public get onKeybindingUpdate(): Event<void> {
		return this._onKeybindingUpdate.event;
	}

	private registerListener(): void {
		//注册快捷键按
		ipc.on('egret:registerKeybingding', (event, reply: {
			resolveChannel: string,
			defaultKey: string,
			command: string,
			type: KeybindingType,
			name: string,
			description: string,
			global: boolean,
			windowId: number
		}) => {
			const fromWindow = this.windowsMainService.getWindowById(reply.windowId);
			if (reply.command in this.keyBindingMainDefault) {
				fromWindow.send(reply.resolveChannel, {
					error: localize('operationMainService.registerListener.existMainProcess','The command {0} already exists in the main process and cannot be resumed in the re-rendering process.',reply.command)
				});
				return;
			}
			if (reply.defaultKey) {
				this.keyBindingBrowserDefault[reply.command] = {
					key: reply.defaultKey,
					type: reply.type,
					global: reply.global,
					name:reply.name,
					description:reply.description
				};
				let targetKey = reply.defaultKey;
				let targetType = reply.type;
				let targetGlobal = reply.global;
				let targetName = reply.name;
				let targetDescription = reply.description;

				if (reply.command in this.keyBindingBrowserUser) {
					targetKey = this.keyBindingBrowserUser[reply.command].key;
					targetType = this.keyBindingBrowserUser[reply.command].type;
					targetGlobal = this.keyBindingBrowserUser[reply.command].global;
					targetName = this.keyBindingBrowserUser[reply.command].name;
					targetDescription = this.keyBindingBrowserUser[reply.command].description;
				}
				if (fromWindow) {
					fromWindow.send(reply.resolveChannel, {
						key: targetKey,
						command: reply.command,
						type: targetType,
						global: targetGlobal,
						name:targetName,
						description:targetDescription
					});
				}
			}
		});

		//修改快捷键
		ipc.on('egret:updateKeybinding', (event, reply: {
			mainConfig: KeyBindingMainMap
			browserConfig: KeyBindingBrowserMap
		}) => {
			this.stateService.setItem(KEYBINDING_MAIN, reply.mainConfig);
			this.stateService.setItem(KEYBINDING_BROWSER, reply.browserConfig);
			this.keyBindingMainUser = reply.mainConfig;
			this.keyBindingBrowserUser = reply.browserConfig;

			const browserKeyMap: KeyBindingBrowserMap = clone(this.keyBindingBrowserDefault);
			for (const key in this.keyBindingBrowserUser) {
				browserKeyMap[key] = this.keyBindingBrowserUser[key];
			}
			this.windowsMainService.getAllWindows().forEach(window => {
				window.send('egret:updateBrowserKeybinding', { browserKeyMap });
			});
			this._onKeybindingUpdate.fire();
		});

		//得到快捷键绑定配置表
		ipc.on('egret:getKeybingdsConfig', (event, reply: {
			resolveChannel: string,
			windowId: number
		}) => {
			const fromWindow = this.windowsMainService.getWindowById(reply.windowId);
			if (fromWindow) {
				fromWindow.send(reply.resolveChannel, {
					mainDefault: this.keyBindingMainDefault,
					browserDrault: this.keyBindingBrowserDefault,
					mainUser: this.keyBindingMainUser,
					browserUser: this.keyBindingBrowserUser
				});
			}
		});
	}



	//主进程使用的快捷键, 默认
	private keyBindingMainDefault: KeyBindingMainMap = {};
	//渲染进程使用的快捷键, 默认
	private keyBindingBrowserDefault: KeyBindingBrowserMap = {};

	//主进程使用的快捷键, 自定义
	private keyBindingMainUser: KeyBindingMainMap = {};
	//渲染进程使用的快捷键, 自定义
	private keyBindingBrowserUser: KeyBindingBrowserMap = {};
	/**
	 * 从本地初始化快捷键列表映射关系
	 */
	private initKeybinding(): void {
		this.keyBindingMainUser = this.stateService.getItem<KeyBindingMainMap>(KEYBINDING_MAIN, {});
		this.keyBindingBrowserUser = this.stateService.getItem<KeyBindingBrowserMap>(KEYBINDING_BROWSER, {});
	}


	/**
	 * 得到主进程需要的快捷键
	 * @param command 要执行的命令
	 * @param defaultKey 默认的快捷键
	 * @param name 命令名
	 * @param description 命令描述 
	 */
	public getKeybinding(command: string, defaultKey: string, name: string, description: string): string {
		if (!defaultKey) {
			return '';
		}
		//存储默认快捷键
		this.keyBindingMainDefault[command] = { key: defaultKey, name, description };
		//先看用户表里是否存在，执行此方法钱一定要
		if (command in this.keyBindingMainUser) {
			return this.keyBindingMainUser[command].key;
		}
		return this.keyBindingMainDefault[command].key;
	}

	/**
	 * 执行操作
	 * @param operationId 
	 * @param args 
	 */
	public executeOperation<T = any>(command: string, ...args: any[]): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const executeOperationToken = this.oneTimeListenerTokenGenerator++;
			const resolveChannel = `egret:resolveChannel${executeOperationToken}`;
			ipc.once(resolveChannel, (event, replay) => {
				resolve(replay);
			});
			this.windowsMainService.sendToFocused('egret:runCommand', { resolveChannel, command, args });
		});
	}
}