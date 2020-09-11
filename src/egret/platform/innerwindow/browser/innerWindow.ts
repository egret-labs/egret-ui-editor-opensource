import { IInnerWindow, _IModal, _IInnerWindow, IInnerWindowRoot, IInnerBtnWindow, InnerWindowClosingEvent, InnerButtonType, InnerButtonDescription, _IInnerWindowCore } from '../common/innerWindows';
import { Event, Emitter } from 'egret/base/common/event';
import { innerWindowManager } from '../common/innerWindowManager';
import { addClass, removeClass, invalidateReisizeCheck } from 'egret/base/common/dom';
import { dispose, IDisposable } from 'egret/base/common/lifecycle';
import './media/innerWindows.css';
import { SystemButton, ButtonBase } from '../../../base/browser/ui/buttons';
import { localize } from '../../../base/localization/nls';
import { isMacintosh } from 'egret/base/common/platform';

function localXToGlobal(x: number, inWindow: IInnerWindow | IInnerWindowRoot): number {
	const target = (<any>innerWindowManager.rootWindow as _IInnerWindow);
	let current = inWindow as _IInnerWindow;
	while (current != target) {
		x += current.localX;
		current = current.ownerWindow as _IInnerWindow;
	}
	return x;
}

function localYToGlobal(y: number, inWindow: IInnerWindow | IInnerWindowRoot): number {
	const target = (<any>innerWindowManager.rootWindow as _IInnerWindow);
	let current = inWindow as _IInnerWindow;
	while (current != target) {
		y += current.localY;
		current = current.ownerWindow as _IInnerWindow;
	}
	return y;
}

function globalXToLocal(x: number, inWindow: IInnerWindow | IInnerWindowRoot): number {
	const target = (<any>innerWindowManager.rootWindow as _IInnerWindow);
	let current = inWindow as _IInnerWindow;
	while (current != target) {
		x -= current.localX;
		current = current.ownerWindow as _IInnerWindow;
	}
	return x;
}

function globalYToLocal(y: number, inWindow: IInnerWindow | IInnerWindowRoot): number {
	const target = (<any>innerWindowManager.rootWindow as _IInnerWindow);
	let current = inWindow as _IInnerWindow;
	while (current != target) {
		y -= current.localY;
		current = current.ownerWindow as _IInnerWindow;
	}
	return y;
}

/**
 * 检查所有投票
 * @param vetos
 */
function handleVetos(vetos: (boolean | Promise<boolean>)[]): Promise<boolean> {
	if (vetos.length === 0) {
		return Promise.resolve(false);
	}

	const promises: Promise<void>[] = [];
	let lazyValue = false;

	for (const valueOrPromise of vetos) {
		if (valueOrPromise === true) {
			return Promise.resolve(true);
		}
		if (valueOrPromise instanceof Promise) {
			promises.push(valueOrPromise.then(value => {
				if (value) {
					lazyValue = true;
				}
			}, error => {
				console.log(error);
				lazyValue = true;
			}));
		}
	}
	return Promise.all(promises).then(() => lazyValue);
}

/**
 * 内置窗体的跟节点层
 */
class InnerWindowCls implements _IInnerWindow {

	private _onClosing: Emitter<InnerWindowClosingEvent>;
	private _onClosed: Emitter<this>;
	private _onOpend: Emitter<this>;
	private _onActivated: Emitter<this>;
	private _onDeactivated: Emitter<this>;


	private _windowElement: HTMLElement;
	private _subWindowsContainer: HTMLElement;
	private _subWindowsList: IInnerWindow[];

	constructor() {
		this._onClosing = new Emitter<InnerWindowClosingEvent>();
		this._onClosed = new Emitter<this>();
		this._onOpend = new Emitter<this>();
		this._onActivated = new Emitter<this>();
		this._onDeactivated = new Emitter<this>();

		this.titleBarMouseDown_handler = this.titleBarMouseDown_handler.bind(this);
		this.titleBarMouseMove_handler = this.titleBarMouseMove_handler.bind(this);
		this.titleBarMouseUp_handler = this.titleBarMouseUp_handler.bind(this);
		this.headerCloseButtonClick_handler = this.headerCloseButtonClick_handler.bind(this);
		this.windowMouseDown_handler = this.windowMouseDown_handler.bind(this);
		this.headerCloseButtonMouseDown_handler = this.headerCloseButtonMouseDown_handler.bind(this);

		this._subWindowsList = [];
		this.initShell();

		this.verticalCenter = true;
		this.horizontalCenter = true;

		this.title = localize('innerWindow.title', 'Title');
		// this.backgroundColor = '#ffffff';
	}


	private _modalMask: HTMLElement;
	private _modalMaskContainer: HTMLElement;
	protected initShell(): void {
		//window的主dom节点
		this._windowElement = document.createElement('div');
		this._windowElement.tabIndex = 0;

		addClass(this._windowElement, 'innerWindow');
		if (isMacintosh) {
			addClass(this._windowElement, 'mac');
		} else {
			addClass(this._windowElement, 'win');
		}
		this._windowElement.addEventListener('mousedown', this.windowMouseDown_handler);

		//window全局内容的容器
		const windowContainer = document.createElement('div');
		addClass(windowContainer, 'windowContainer');
		this._windowElement.appendChild(windowContainer);
		this.initWindow(windowContainer);

		//遮罩层
		this._modalMaskContainer = document.createElement('div');
		addClass(this._modalMaskContainer, 'mask-container');
		this._modalMaskContainer.style.pointerEvents = 'none';
		this._windowElement.appendChild(this._modalMaskContainer);

		this._modalMask = document.createElement('div');
		addClass(this._modalMask, 'mask');
		this._modalMaskContainer.appendChild(this._modalMask);

		//子windows的容器
		this._subWindowsContainer = document.createElement('div');
		this._subWindowsContainer.style.position = 'absolute';
		this._subWindowsContainer.style.width = '100%';
		this._subWindowsContainer.style.height = '100%';
		this._subWindowsContainer.style.top = '0';
		this._subWindowsContainer.style.left = '0';
		this._subWindowsContainer.style.pointerEvents = 'none';
		this._windowElement.appendChild(this._subWindowsContainer);
	}


	private headerContainer: HTMLElement;
	private titleDisplay: HTMLElement;
	private headerCloseButton: HTMLElement;
	private _contentGroup: HTMLElement;
	protected initWindow(contianer: HTMLElement): void {
		this.headerContainer = document.createElement('div');
		addClass(this.headerContainer, 'header-container');
		if (isMacintosh) {
			addClass(this.headerContainer, 'mac');
		} else {
			addClass(this.headerContainer, 'win');
		}
		contianer.appendChild(this.headerContainer);
		if (!this.titleBarVisible) {
			this.headerContainer.hidden = true;
		} else {
			this.headerContainer.hidden = false;
		}

		this.titleDisplay = document.createElement('div');
		addClass(this.titleDisplay, 'title-display');

		this.titleDisplay.innerText = this.title;
		this.headerContainer.appendChild(this.titleDisplay);
		this.titleDisplay.addEventListener('mousedown', this.titleBarMouseDown_handler);



		this.headerCloseButton = document.createElement('div');
		addClass(this.headerCloseButton, 'header-close-btn');
		this.headerCloseButton.addEventListener('mousedown', this.headerCloseButtonMouseDown_handler);
		this.headerCloseButton.addEventListener('click', this.headerCloseButtonClick_handler);
		this.headerContainer.appendChild(this.headerCloseButton);

		this._contentGroup = document.createElement('div');
		addClass(this._contentGroup, 'content-group');
		contianer.appendChild(this._contentGroup);
	}

	private rendered: boolean = false;
	/**
	 * 子类可以重载此方法以实现渲染内容
	 * @param contentGroup
	 */
	public render(contentGroup: HTMLElement): void {

	}

	private startMouseX: number = 0;
	private startMouseY: number = 0;
	private startWindowX: number = 0;
	private startWindowY: number = 0;
	private titleBarMouseDown_handler(e: MouseEvent): void {
		document.addEventListener('mousemove', this.titleBarMouseMove_handler);
		document.addEventListener('mouseup', this.titleBarMouseUp_handler);
		this.startMouseX = e.clientX;
		this.startMouseY = e.clientY;
		this.startWindowX = this.x;
		this.startWindowY = this.y;
	}

	private titleBarMouseMove_handler(e: MouseEvent): void {
		const offsetX = e.clientX - this.startMouseX;
		const offsetY = e.clientY - this.startMouseY;
		this.x = this.startWindowX + offsetX;
		this.y = this.startWindowY + offsetY;
		this.doSelfResize();
		invalidateReisizeCheck();
	}

	private titleBarMouseUp_handler(e: MouseEvent): void {
		document.removeEventListener('mousemove', this.titleBarMouseMove_handler);
		document.removeEventListener('mouseup', this.titleBarMouseUp_handler);
		const offsetX = e.clientX - this.startMouseX;
		const offsetY = e.clientY - this.startMouseY;
		this.x = this.startWindowX + offsetX;
		this.y = this.startWindowY + offsetY;
		this.doSelfResize();
	}

	private headerCloseButtonMouseDown_handler(e: MouseEvent): void {
		e.stopPropagation();
	}
	protected headerCloseButtonClick_handler(e: MouseEvent): void {
		if (!this._forbiddenHeadBtn) {
			this.close();
		}
	}

	private _forbiddenHeadBtn: boolean = false;

	public set forbiddenHeadBtn(d: boolean) {
		this._forbiddenHeadBtn = d;
	}
	private windowMouseDown_handler(e: MouseEvent): void {
		innerWindowManager.activate(this);
		// 在窗口内点击，停止向父级派发mousedown事件
		e.stopPropagation();
	}

	/**
	 * 自己尺寸改变
	 */
	public doSelfResize(): void {
		this.restrictWindowPosition();
		for (let i = 0; i < this.subWindowsList.length; i++) {
			const window: InnerWindowCls = this.subWindowsList[i] as InnerWindowCls;
			window.doSelfResize();
		}
	}

	private restrictWindowPosition(): void {
		if (!this.horizontalCenter) {
			if (this.x < 0) {
				this.x = 0;
			}
			if (this.x + this.width > innerWindowManager.rootWindow.width) {
				this.x = innerWindowManager.rootWindow.width - this.width;
			}
		}
		if (!this.verticalCenter) {
			if (this.y < 0) {
				this.y = 0;
			}
			if (this.y + this.height > innerWindowManager.rootWindow.height) {
				this.y = innerWindowManager.rootWindow.height - this.height;
			}
		}
	}

	/** 窗体的dom节点 */
	public get windowElement(): HTMLElement {
		return this._windowElement;
	}
	/** 子窗体的容器 */
	public get subWindowsContainer(): HTMLElement {
		return this._subWindowsContainer;
	}
	/** 子窗口列表 */
	public get subWindowsList(): IInnerWindow[] {
		return this._subWindowsList;
	}

	private _modal: boolean = false;
	/** 是否启用父级的遮蔽效果。*/
	public get modal(): boolean {
		return this._modal;
	}
	/**
	 * 作为父级窗体的时候，启动当前窗体的被模态的效果，该方法不需要用户手动调用。
	 */
	public enableModal(): void {
		this._modalMaskContainer.style.pointerEvents = 'auto';
		this._modalMask.style.backgroundColor = 'rgba(0,0,0,0.3)';
	}
	/**
	 * 作为父级窗体的时候，失效当前窗体的被模态的效果，该方法不需要用户手动调用。
	 */
	public disableModal(): void {
		this._modalMaskContainer.style.pointerEvents = 'none';
		this._modalMask.style.backgroundColor = '';
	}
	/**
	 * 播放父级窗体触发模态之后，当前窗体的可视提示
	 */
	public modalNotif(): void {
		setTimeout(() => {
			addClass(this._windowElement, 'lightShadow');
			setTimeout(() => {
				removeClass(this._windowElement, 'lightShadow');
				setTimeout(() => {
					addClass(this._windowElement, 'lightShadow');
					setTimeout(() => {
						removeClass(this._windowElement, 'lightShadow');
						setTimeout(() => {
							addClass(this._windowElement, 'lightShadow');
							setTimeout(() => {
								removeClass(this._windowElement, 'lightShadow');
							}, 100);
						}, 100);
					}, 100);
				}, 100);
			}, 100);
		}, 100);
	}

	/**
	 * 即将关闭，可以阻止
	 */
	public get onClosing(): Event<InnerWindowClosingEvent> {
		return this._onClosing.event;
	}
	/**
	 * 窗口关闭事件
	 */
	public get onClosed(): Event<this> {
		return this._onClosed.event;
	}
	/**
	 * 窗口打开事件
	 */
	public get onOpend(): Event<this> {
		return this._onOpend.event;
	}
	/**
	 * 窗口激活事件
	 */
	public get onActivated(): Event<this> {
		return this._onActivated.event;
	}
	/**
	 * 窗口失活事件
	 */
	public get onDeactivated(): Event<this> {
		return this._onDeactivated.event;
	}

	private _horizontalCenter: boolean;
	/** 是否水平居中 */
	public get horizontalCenter(): boolean {
		return this._horizontalCenter;
	}
	public set horizontalCenter(value: boolean) {
		this.doSetHorizontalCenter(value);
	}
	protected doSetHorizontalCenter(value: boolean): void {
		this._horizontalCenter = value;
		this.updatePosition();
	}

	private _verticalCenter: boolean;
	/** 是否纵向居中 */
	public get verticalCenter(): boolean {
		return this._verticalCenter;
	}
	public set verticalCenter(value: boolean) {
		this.doSetVerticalCenter(value);
	}
	protected doSetVerticalCenter(value: boolean): void {
		this._verticalCenter = value;
		this.updatePosition();
	}

	private _x: number = NaN;
	/** 窗体的x坐标 */
	public get x(): number {
		return localXToGlobal(this.localX, this.ownerWindow);
	}
	/** 所在父级的局部坐标X位置 */
	public get localX(): number {
		if (this.horizontalCenter) {
			return this.windowElement.offsetLeft - this.width / 2;
		}
		return this.windowElement.offsetLeft;
	}

	public set x(value: number) {
		this.doSetX(value);
	}
	protected doSetX(value: number) {
		this._x = globalXToLocal(value, this.ownerWindow);
		this._horizontalCenter = false;
		this.updatePosition();
	}

	private _y: number = NaN;
	/** 窗体的y坐标 */
	public get y(): number {
		return localYToGlobal(this.localY, this.ownerWindow);
	}
	/** 所在父级的局部坐标Y位置 */
	public get localY(): number {
		if (this.verticalCenter) {
			return this.windowElement.offsetTop - this.height / 2;
		}
		return this.windowElement.offsetTop;
	}

	public set y(value: number) {
		this.doSetY(value);
	}
	protected doSetY(value: number): void {
		this._y = globalYToLocal(value, this.ownerWindow);
		this._verticalCenter = false;
		this.updatePosition();
	}

	private updatePosition(): void {
		let transfromStyle: string = '';
		if (this.horizontalCenter && this.verticalCenter) {
			transfromStyle = 'translate(-50%,-50%)';
		} else if (this.horizontalCenter) {
			transfromStyle = 'translateX(-50%)';
		} else if (this.verticalCenter) {
			transfromStyle = 'translateY(-50%)';
		}

		if (this.horizontalCenter) {
			this.windowElement.style.left = '50%';
		} else {
			this.windowElement.style.left = this._x + 'px';
		}

		if (this.verticalCenter) {
			this.windowElement.style.top = '50%';
		} else {
			this.windowElement.style.top = this._y + 'px';
		}
		this.windowElement.style.transform = transfromStyle;
	}

	/** 窗体的宽度 */
	public get width(): number {
		return this._windowElement.offsetWidth;
	}
	public set width(value: number) {
		this.doSetWidth(value);
	}
	protected doSetWidth(value: number): void {
		if (isNaN(value)) {
			this._windowElement.style.width = '';
		} else {
			this._windowElement.style.width = value + 'px';
		}
	}


	/** 窗体的高度 */
	public get height(): number {
		return this._windowElement.offsetHeight;
	}
	public set height(value: number) {
		this.doSetHeight(value);
	}
	protected doSetHeight(value: number): void {
		if (isNaN(value)) {
			this._windowElement.style.height = '';
		} else {
			this._windowElement.style.height = value + 'px';
		}
	}

	private _title: string = '';
	/** 窗体的标题 */
	public get title(): string {
		return this._title;
	}
	public set title(value: string) {
		if (this.title != value) {
			this.doSetTitle(value);
		}
	}
	protected doSetTitle(value: string): void {
		this._title = value;
		this.titleDisplay.innerText = value;
	}

	private _backgroundColor: string = '';
	/** 背景色 */
	public get backgroundColor(): string {
		return this._backgroundColor;
	}
	public set backgroundColor(value: string) {
		if (this.backgroundColor != value) {
			this.doSetBackgroundColor(value);
		}
	}
	protected doSetBackgroundColor(value: string): void {
		this._backgroundColor = value;
		this._windowElement.style.backgroundColor = value;
	}

	/**
	 * 标题栏显示
	 */
	private _titleBarVisible: boolean = true;
	public get titleBarVisible(): boolean {
		return this._titleBarVisible;
	}
	public set titleBarVisible(value: boolean) {
		if (this._titleBarVisible != value) {
			this.doSetTitleBarVisible(value);
		}
	}
	protected doSetTitleBarVisible(value: boolean): void {
		this._titleBarVisible = value;
		if (this.headerContainer) {
			this.headerContainer.hidden = !this._titleBarVisible;
		}
	}


	/** 内容容器，用户窗体内容绘制在这个容器里 */
	public get contentGroup(): HTMLElement {
		return this._contentGroup;
	}

	private _ownerWindow: IInnerWindowRoot | IInnerWindow;
	/**
	 * 父级窗体，如果是根窗口则父级是html节点，否则为窗体接口
	 */
	public get ownerWindow(): IInnerWindowRoot | IInnerWindow {
		return this._ownerWindow;
	}
	/**
	 * 设置父级窗体
	 * @param owner
	 */
	public setOwnerWindow(owner: IInnerWindow | IInnerWindowRoot): void {
		this._ownerWindow = owner;
	}

	/**
	 * 打开窗体
	 * @param ownerWindow 父级窗体，如果设置null，则从当前激活的窗体上打开，如果设置为root则从根窗体打开
	 * @param modal 是否启用模态窗体
	 */
	public open(ownerWindow?: IInnerWindow | 'root', modal?: boolean): void {
		if (!this.rendered) {
			this.rendered = true;
			this.render(this._contentGroup);
		}
		this._modal = modal;
		innerWindowManager.open(this, ownerWindow, modal);
	}

	private _actived: boolean = false;
	/** 窗体是否已被激活 */
	public get actived(): boolean {
		return this._actived;
	}
	/**
	 * 派发打开窗体事件
	 */
	public doOpen(): void {
		this.restrictWindowPosition();
		this._onOpend.fire();
	}

	/**
	 * 派发激活窗体事件
	 */
	public doActivate(): void {
		this._actived = true;
		removeClass(this._windowElement, 'deactivated');
		addClass(this._windowElement, 'activated');

		removeClass(this.headerContainer, 'deactivated');
		addClass(this.headerContainer, 'activated');

		removeClass(this.titleDisplay, 'deactivated');
		addClass(this.titleDisplay, 'activated');

		removeClass(this.headerCloseButton, 'deactivated');
		addClass(this.headerCloseButton, 'activated');

		this._onActivated.fire();
	}
	/**
	 * 派发失活窗体事件
	 */
	public doDeactivate(): void {
		this._actived = false;
		removeClass(this._windowElement, 'activated');
		addClass(this._windowElement, 'deactivated');

		removeClass(this.headerContainer, 'activated');
		addClass(this.headerContainer, 'deactivated');

		removeClass(this.titleDisplay, 'activated');
		addClass(this.titleDisplay, 'deactivated');

		removeClass(this.headerCloseButton, 'activated');
		addClass(this.headerCloseButton, 'deactivated');
		this._onDeactivated.fire();
	}
	/**
	 * 关闭窗口
	 */
	public close(): void {
		innerWindowManager.close(this);
	}
	/**
	 * 派发即将关闭窗体事件
	 */
	public doClosing(): Promise<boolean> {
		const vetos: (boolean | Promise<boolean>)[] = [];
		this._onClosing.fire({
			veto(value) {
				vetos.push(value);
			},
			relativeWindow: this
		});
		return handleVetos(vetos);


	}
	/**
	 * 派发关闭窗体事件
	 */
	public doClose(): void {
		for (let i = 0; i < this._subWindowsList.length; i++) {
			const subWindow = <any>this._subWindowsList[i] as _IInnerWindowCore;
			subWindow.doClose();
		}
		dispose(this);
		this._onClosed.fire();
	}
	/**
	 * 执行esc
	 */
	public doEsc(): void {
		this.close();
	}
	/**
	 * 执行esc
	 */
	public doEnter(): void {

	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.titleDisplay.removeEventListener('mousedown', this.titleBarMouseDown_handler);
		this.headerCloseButton.removeEventListener('mousedown', this.headerCloseButtonMouseDown_handler);
		this.headerCloseButton.removeEventListener('click', this.headerCloseButtonClick_handler);
		document.removeEventListener('mousemove', this.titleBarMouseMove_handler);
		document.removeEventListener('mouseup', this.titleBarMouseUp_handler);
	}
}



/**
 * 具有按钮组的内部窗体
 */
class InnerBtnWindowCls extends InnerWindowCls implements IInnerBtnWindow {
	/**
	 * 按钮点击事件
	 */
	private _onButtonClick: Emitter<InnerButtonType>;

	private toDisposes: IDisposable[] = [];

	constructor() {
		super();
		this._onButtonClick = new Emitter<InnerButtonType>();
	}
	/**
	 * 窗口关闭事件
	 */
	public get onButtonClick(): Event<InnerButtonType> {
		return this._onButtonClick.event;
	}

	private _buttonContainer: HTMLElement;
	private button1: SystemButton;
	private button2: SystemButton;
	private button3: SystemButton;
	protected initWindow(contianer: HTMLElement): void {
		super.initWindow(contianer);
		this._buttonContainer = document.createElement('div');
		addClass(this._buttonContainer, 'button-container');
		contianer.appendChild(this._buttonContainer);
	}

	private button1Des: InnerButtonDescription;
	private button2Des: InnerButtonDescription;
	private button3Des: InnerButtonDescription;
	/**
	 * 初始化按钮
	 * @param button 按钮文本，该按钮为按回车时候默认激活的按钮
	 */
	public initButtons(button: InnerButtonDescription): void;
	/**
	 * 初始化按钮
	 * @param button1 第一个按钮的文本，该按钮为按回车时候默认激活的按钮
	 * @param button2 第二个按钮的文本
	 */
	public initButtons(button1: InnerButtonDescription, button2: InnerButtonDescription): void;
	/**
	 * 初始化按钮
	 * @param button1 第一个按钮的文本，该按钮为按回车时候默认激活的按钮
	 * @param button2 第二个按钮的文本
	 * @param button3 第三个按钮的文本
	 */
	public initButtons(button1: InnerButtonDescription, button2: InnerButtonDescription, button3: InnerButtonDescription): void;
	public initButtons(arg1?: InnerButtonDescription, arg2?: InnerButtonDescription, arg3?: InnerButtonDescription): void {

		this.button1Des = arg1;
		this.button2Des = arg2;
		this.button3Des = arg3;

		if (arg1 && arg2 && arg3) {
			this.button1 = new SystemButton(this._buttonContainer);
			this.button1.label = arg1.label;
			this.button1.isDefault = true;
			this.toDisposes.push(this.button1.onClick(target => this.button1Click_handler(target)));

			this.button2 = new SystemButton(this._buttonContainer);
			this.button2.label = arg2.label;
			this.button2.style.marginRight = '20px';
			this.toDisposes.push(this.button2.onClick(target => this.button2Click_handler(target)));

			// const spacer = document.createElement('div');
			// spacer.style.width = '100%';
			// this._buttonContainer.appendChild(spacer);

			this.button3 = new SystemButton(this._buttonContainer);
			this.button3.label = arg3.label;
			this.button3.style.marginRight = '20px';
			this.toDisposes.push(this.button3.onClick(target => this.button3Click_handler(target)));
		} else if (arg1 && arg2) {
			this.button1 = new SystemButton(this._buttonContainer);
			this.button1.label = arg1.label;
			this.button1.isDefault = true;
			this.toDisposes.push(this.button1.onClick(target => this.button1Click_handler(target)));

			this.button2 = new SystemButton(this._buttonContainer);
			this.button2.label = arg2.label;
			this.button2.style.marginRight = '20px';
			this.toDisposes.push(this.button2.onClick(target => this.button2Click_handler(target)));
		} else if (arg1) {
			this.button1 = new SystemButton(this._buttonContainer);
			this.button1.label = arg1.label;
			this.button1.isDefault = true;
			this.toDisposes.push(this.button1.onClick(target => this.button1Click_handler(target)));
		}
	}
	protected headerCloseButtonClick_handler(e: MouseEvent): void {
		this._onButtonClick.fire(InnerButtonType.CLOSE_BUTTON);
		super.headerCloseButtonClick_handler(e);
	}

	private button1Click_handler(target: ButtonBase): void {
		this._onButtonClick.fire(InnerButtonType.FIRST_BUTTON);
		if (!('closeWindow' in this.button1Des) || this.button1Des.closeWindow) {
			this.close();
		}
	}
	private button2Click_handler(target: ButtonBase): void {
		this._onButtonClick.fire(InnerButtonType.SECOND_BUTTON);
		if (!('closeWindow' in this.button2Des) || this.button2Des.closeWindow) {
			this.close();
		}
	}
	private button3Click_handler(target: ButtonBase): void {
		this._onButtonClick.fire(InnerButtonType.THIRD_BUTTON);
		if (!('closeWindow' in this.button3Des) || this.button3Des.closeWindow) {
			this.close();
		}
	}
	/**
	 * 执行esc
	 */
	public doEnter(): void {
		super.doEnter();
		this._onButtonClick.fire(InnerButtonType.FIRST_BUTTON);
		if (!('closeWindow' in this.button1Des) || this.button1Des.closeWindow) {
			this.close();
		}
	}

	/**
	 * 派发激活窗体事件
	 */
	public doActivate(): void {
		super.doActivate();
		if (this.button1) {
			this.button1.active();
		}
		if (this.button2) {
			this.button2.active();
		}
		if (this.button3) {
			this.button3.active();
		}
	}

	/**
	 * 派发失活窗体事件
	 */
	public doDeactivate(): void {
		super.doDeactivate();
		if (this.button1) {
			this.button1.inactive();
		}
		if (this.button2) {
			this.button2.inactive();
		}
		if (this.button3) {
			this.button3.inactive();
		}
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		super.dispose();
		dispose(this.toDisposes);
	}
}

/* ------------ 通过以下方式隐藏内部接口，只暴露对外接口  ------------ */


/**
 * 内置窗体的跟节点层
 */
export var InnerWindow = InnerWindowCls as { new(): IInnerWindow };
/**
 * 具有按钮组的内部窗体
 */
export var InnerBtnWindow = InnerBtnWindowCls as { new(): IInnerBtnWindow };