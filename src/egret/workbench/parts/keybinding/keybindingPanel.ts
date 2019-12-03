import { InnerBtnWindow } from 'egret/platform/innerwindow/browser/innerWindow';
import { IOperationBrowserService } from '../../../platform/operations/common/operations-browser';
import { VGroup, HGroup } from '../../../base/browser/ui/containers';
import { IDisposable, dispose } from '../../../base/common/lifecycle';
import { KeybindingType, KeyBindingMainMap, KeyBindingBrowserMap } from '../../../platform/operations/common/operations';
import { IUIBase, getTargetElement } from '../../../base/browser/ui/common';
import { Label } from '../../../base/browser/ui/labels';
import { TextInput } from '../../../base/browser/ui/inputs';
import { IconButton } from '../../../base/browser/ui/buttons';
import { Select, SelectDataSource } from '../../../base/browser/ui/selects';
import { addClass, removeClass } from '../../../base/common/dom';
import { isMacintosh } from '../../../base/common/platform';
import { Emitter, Event } from '../../../base/common/event';

import './media/keybinding.css';
import { InnerButtonType } from '../../../platform/innerwindow/common/innerWindows';
import { localize } from '../../../base/localization/nls';
import { INotificationService } from 'egret/platform/notification/common/notifications';

/**
 * 快捷键设置面板
 */
export class KeybindingPanel extends InnerBtnWindow {
	private toDisposes: IDisposable[] = [];
	constructor(
		@IOperationBrowserService private operationService: IOperationBrowserService,
		@INotificationService private notificationService: INotificationService
	) {
		super();

		this.title = localize('keybindPanel.constructor.title','Shortcut Key Settings');
		this.initButtons(
			{ label: localize('alert.button.confirm', 'Confirm'), closeWindow: false },
			{ label: localize('alert.button.cancel', 'Cancel') }
		);

		this.toDisposes.push(this.onButtonClick(e => {
			if (e == InnerButtonType.FIRST_BUTTON) {
				this.confirmClick_handler();
			}
		}));
	}

	private confirmClick_handler(): void {
		let hasError = false;
		for (let i = 0; i < this.items.length; i++) {
			if (this.items[i].error) {
				hasError = true;
				break;
			}
		}
		if (hasError) {
			this.notificationService.error({ content: localize('keybindingPanel.confirmClick_handler.configError','The shortcut key configuration is incorrect. Please solve the red prompt error and click OK.') });
		} else {
			const config = this.getUserConfig();
			this.operationService.updateKeybinding(config.mainUser,this.getUserConfig().browserUser);
			this.close();
		}
	}

	private getUserConfig(): { mainUser: KeyBindingMainMap, browserUser: KeyBindingBrowserMap } {
		const mainUser: KeyBindingMainMap = {};
		const browserUser: KeyBindingBrowserMap = {};
		for (let i = 0; i < this.items.length; i++) {
			const data = this.items[i].getData();
			if (data.browser) {
				if (data.keyUser || data.typeUser) {
					browserUser[data.command] = {
						key: data.keyUser ? formatKeyForBrowser(data.keyUser) : formatKeyForBrowser(data.key),
						type: data.typeUser ? data.typeUser : data.type,
						global: data.global,
						name: data.name,
						description: data.description
					};
				}
			} else {
				if (data.keyUser) {
					mainUser[data.command] = {
						key: formatKeyForMain(data.keyUser),
						name: data.name,
						description: data.name
					};
				}
			}
		}
		return { mainUser, browserUser };
	}


	private items: KeybindingItem[] = [];

	private container: VGroup;
	/**
	 * 重载父类方法，对窗体进行渲染
	 */
	public render(contentGroup: HTMLElement): void {
		super.render(contentGroup);
		this.container = new VGroup(contentGroup);
		addClass(this.container.getElement(), 'keybinding-setting-container');
		this.getDatasFromMap().then(datas => {
			for (let i = 0; i < datas.length; i++) {
				const item = new KeybindingItem(datas[i], i, this.container);
				this.items.push(item);
				this.toDisposes.push(item.onKeybindingChanged(item => this.keybindingChanged_handle(item)));
			}
		});

	}

	private keybindingChanged_handle(target: KeybindingItem): void {
		this.checkError();
	}

	private checkError(): void {
		const tmpMap: { [key: string]: KeybindingItem } = {};
		for (var i = 0; i < this.items.length; i++) {
			this.items[i].cancelPrompt();
			tmpMap[this.items[i].getPreferredKey()] = this.items[i];
		}

		for (var i = 0; i < this.items.length; i++) {
			const curItem = this.items[i];
			if (tmpMap[curItem.getPreferredKey()] && tmpMap[curItem.getPreferredKey()] != curItem) {
				curItem.promptError(localize('keybindingPanel.checkError.keyRepeat','Shortcut key Duplicate'));
				tmpMap[curItem.getPreferredKey()].promptError(localize('keybindingPanel.checkError.keyRepeat','Shortcut key Duplicate'));
			}
		}
	}


	private getDatasFromMap(): Promise<KeybindingData[]> {
		return this.operationService.getKeybingdsConfig().then(configs => {
			const datas: KeybindingData[] = [];

			for (var command in configs.browserDrault) {
				const defaultConfig2 = configs.browserDrault[command];
				const userConfig2 = configs.browserUser[command];
				var data: KeybindingData = {
					command: command,
					name: defaultConfig2.name,
					description: defaultConfig2.description,
					key: formatKeyFromBrowser(defaultConfig2.key),
					keyUser: userConfig2 ? formatKeyFromBrowser(userConfig2.key) : null,
					type: defaultConfig2.type,
					typeUser: userConfig2 ? userConfig2.type : null,
					browser: true,
					global: defaultConfig2.global
				};
				datas.push(data);
			}

			for (var command in configs.mainDefault) {
				const defaultConfig1 = configs.mainDefault[command];
				const userConfig1 = configs.mainUser[command];
				var data: KeybindingData = {
					command: command,
					name: defaultConfig1.name,
					description: defaultConfig1.description,
					key: formatKeyFromMain(defaultConfig1.key),
					keyUser: userConfig1 ? formatKeyFromMain(userConfig1.key) : null,
					type: null,
					typeUser: null,
					browser: false,
					global: false
				};
				datas.push(data);
			}

			return datas;
		});
	}

	/**
	 * 销毁
	 */
	public dispose(): void {
		super.dispose();
		this.operationService = null;
		this.notificationService = null;
		dispose(this.toDisposes);
		dispose(this.items);
	}
}

interface KeybindingData {
	command: string;
	name: string;
	description: string;
	key: string;
	keyUser: string;
	type: KeybindingType;
	typeUser: KeybindingType;
	browser: boolean;
	global: boolean;
}

function formatKeyFromMain(key: string): string {
	key = key.toLocaleLowerCase();
	if (isMacintosh) {
		key = key.replace('cmdorctrl', 'cmd');
	} else {
		key = key.replace('cmdorctrl', 'ctrl');
	}
	key = key.replace('alt', 'alt');
	key = key.replace('option', 'alt');
	return key;
}
function formatKeyFromBrowser(key: string): string {
	key = key.toLocaleLowerCase();
	if (isMacintosh) {
		key = key.replace('mod', 'cmd');
	} else {
		key = key.replace('mod', 'ctrl');
	}
	key = key.replace('command', 'cmd');
	key = key.replace('option', 'alt');
	key = key.replace('delete','del');
	return key;
}

function formatKeyForMain(key: string): string {
	key = key.toUpperCase();
	key = key.replace('MOD', 'CmdOrCtrl');
	key = key.replace('CMD', 'CmdOrCtrl');
	key = key.replace('CTRL', 'CmdOrCtrl');
	key = key.replace('COMMAND', 'CmdOrCtrl');
	key = key.replace('OPTION', 'Alt');
	key = key.replace('ALT', 'Alt');
	key = key.replace('SHIFT', 'Shift');
	return key;
}

function formatKeyForBrowser(key: string): string {
	key = key.toLocaleLowerCase();
	key = key.replace('mod', 'mod');
	key = key.replace('cmd', 'mod');
	key = key.replace('ctrl', 'mod');
	key = key.replace('command', 'mod');
	key = key.replace('option', 'alt');
	key = key.replace('alt', 'alt');
	key = key.replace('shift', 'shift');
	key = key.replace('delete','del');
	return key;
}

function formatKeyForDisplay(key: string): string {
	key = key.toLocaleLowerCase();
	if (isMacintosh) {
		key = key.replace('mod', 'cmd');
		key = key.replace('cmdorctrl', 'cmd');
	} else {
		key = key.replace('mod', 'ctrl');
		key = key.replace('cmdorctrl', 'ctrl');
	}
	key = key.replace('command', 'cmd');
	key = key.replace('option', 'alt');
	key = key.replace('delete','del');
	return key;
}


const typeDataProvider: SelectDataSource[] = [
	{ label: localize('keybindingPanel.create.keyUp','Key Up'), id: KeybindingType.KEY_UP, data: { id: KeybindingType.KEY_UP } },
	{ label: localize('keybindingPanel.create.keyDown','Key Down'), id: KeybindingType.KEY_DOWN, data: { id: KeybindingType.KEY_DOWN } }
];

class KeybindingItem implements IUIBase, IDisposable {
	private _onKeybindingChanged: Emitter<KeybindingItem>;

	private toDispose: IDisposable[] = [];
	protected el: HTMLElement;
	private container: HTMLElement;
	private index: number = 0;
	constructor(private data: KeybindingData, index: number, container: HTMLElement | IUIBase = null) {

		this._onKeybindingChanged = new Emitter<KeybindingItem>();

		this.index = index;
		this.el = document.createElement('div');
		if (container) {
			this.create(container);
		}
	}
	/**
	 * 快捷键改变事件
	 */
	public get onKeybindingChanged(): Event<KeybindingItem> {
		return this._onKeybindingChanged.event;
	}

	public getData(): KeybindingData {
		return this.data;
	}
	/**
	 * 首选显示的快捷键
	 */
	public getPreferredKey(): string {
		if (this.data.keyUser) {
			return this.data.keyUser;
		}
		return this.data.key;
	}

	private _error: boolean = false;
	public get error(): boolean {
		return this._error;
	}
	/**
	 * 提示错误
	 */
	public promptError(error: string): void {
		this.errorDisplay.text = error;
		addClass(this.keyInput.getElement(), 'error');
		removeClass(this.errorDisplay.getElement(), 'invisible');
		this._error = true;
	}
	/**
	 * 取消提示
	 */
	public cancelPrompt(): void {
		removeClass(this.keyInput.getElement(), 'error');
		addClass(this.errorDisplay.getElement(), 'invisible');
		this._error = false;
	}

	/**
	 * 核心dom对象
	 */
	public getElement(): HTMLElement {
		return this.el;
	}
	private keyInput: TextInput;
	private revertBtn: IconButton;
	private typeSelect: Select;
	private errorDisplay: Label;
	/**
	 * 创建
	 * @param container 
	 */
	public create(container: HTMLElement | IUIBase): void {
		this.container = getTargetElement(container);
		this.container.appendChild(this.el);
		addClass(this.el, 'keybinding-setting-item');
		if (this.index % 2 == 0) {
			addClass(this.el, 'even');
		}

		var hGroup = new HGroup(this.el);
		hGroup.style.alignItems = 'flex-start';
		const nameDisplay = new Label(hGroup);
		nameDisplay.text = this.data.name;
		addClass(nameDisplay.getElement(), 'name-display');

		const descriptionDisplay = new Label(hGroup);
		descriptionDisplay.autoWrap = true;
		descriptionDisplay.fontSize = 12;
		descriptionDisplay.text = '( ' + this.data.description + ' )';
		addClass(descriptionDisplay.getElement(), 'description-display');

		var hGroup = new HGroup(this.el);
		hGroup.style.marginTop = '5px';
		this.keyInput = new TextInput(hGroup);
		addClass(this.keyInput.getElement(), 'key-input');
		this.toDispose.push(this.keyInput.onValueChanged(() => this.keyInputChanged_handler()));

		this.typeSelect = new Select(hGroup);
		addClass(this.typeSelect.getElement(), 'type-select');
		this.typeSelect.dataProvider = typeDataProvider;
		this.toDispose.push(this.typeSelect.onSelectedChanged(() => { this.onTypeChanged_handler(); }));

		this.revertBtn = new IconButton(hGroup);
		this.revertBtn.iconClass = 'revert-icon';
		this.revertBtn.toolTip = localize('alert.button.reset','Reset');
		this.toDispose.push(this.revertBtn.onClick(() => { this.onRevertClick_handler(); }));
		addClass(this.revertBtn.getElement(), 'revert-btn');

		this.errorDisplay = new Label(this.el);
		this.errorDisplay.fontSize = 12;
		addClass(this.errorDisplay.getElement(), 'error-display');
		addClass(this.errorDisplay.getElement(), 'invisible');

		this.updateDisplay();
	}


	private keyInputChanged_handler(): void {
		this.data.keyUser = formatKeyForDisplay(this.keyInput.text);
		if (this.data.keyUser == this.data.key) {
			this.data.keyUser = null;
		}
		this.updateDisplay();
		this._onKeybindingChanged.fire(this);
	}
	private onTypeChanged_handler(): void {
		this.data.typeUser = this.typeSelect.selection.id as KeybindingType;
		if (this.data.typeUser == this.data.type) {
			this.data.typeUser = null;
		}
		this.updateDisplay();
		this._onKeybindingChanged.fire(this);
	}
	private onRevertClick_handler(): void {
		this.data.keyUser = null;
		this.data.typeUser = null;
		this.updateDisplay();
		this._onKeybindingChanged.fire(this);
	}

	private updateDisplay(): void {
		this.updateKeyDisplay();
		this.updateRevertBtn();
		this.updateTypeSelect();
	}

	private updateKeyDisplay(): void {
		if (this.data.keyUser) {
			this.keyInput.text = this.data.keyUser;
		} else {
			this.keyInput.text = this.data.key;
		}
	}
	private updateRevertBtn(): void {
		if (this.data.keyUser || this.data.typeUser) {
			this.revertBtn.style.visibility = '';
		} else {
			this.revertBtn.style.visibility = 'hidden';
		}
	}
	private updateTypeSelect(): void {
		if (this.data.browser) {
			this.typeSelect.style.visibility = '';
			let targetType = this.data.type;
			if (this.data.typeUser) {
				targetType = this.data.typeUser;
			}
			let selection = typeDataProvider.find((a) => { return a.id == targetType; });
			if (!selection) {
				selection = typeDataProvider[1];
			}
			this.typeSelect.selection = selection;
		} else {
			this.typeSelect.style.visibility = 'hidden';
		}
	}

	public dispose() {
		this.container = null;
		this.el.remove();
		dispose(this.toDispose);
	}
}