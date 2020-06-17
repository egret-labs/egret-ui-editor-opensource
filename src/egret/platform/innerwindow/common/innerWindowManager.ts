import { _IInnerWindow, _IInnerWindowRoot, IInnerWindow, IInnerWindowRoot, _IInnerWindowCore } from './innerWindows';
import { isInDOM, watchResizeChange } from '../../../base/common/dom';
import { Emitter, Event } from 'egret/base/common/event';

export interface IInnerWindowConstructor {
	new(...params: any[]): IInnerWindow;
}

/**
 * 内置窗体的跟节点层
 */
class RootLayer implements _IInnerWindowRoot {
	constructor() {
	}


	private _modalMask: HTMLElement;
	private _subWindowsContainer: HTMLElement;
	private _subWindowsList: _IInnerWindow[];
	public init(container: HTMLElement): void {
		this.windowMouseDown_handler = this.windowMouseDown_handler.bind(this);
		this._subWindowsList = [];

		this._modalMask = document.createElement('div');
		this._modalMask.style.position = 'absolute';
		this._modalMask.style.width = '100%';
		this._modalMask.style.height = '100%';
		this._modalMask.style.top = '0';
		this._modalMask.style.left = '0';
		this._modalMask.style.pointerEvents = 'none';
		container.appendChild(this._modalMask);

		this._subWindowsContainer = document.createElement('div');
		this._subWindowsContainer.style.position = 'absolute';
		this._subWindowsContainer.style.width = '100%';
		this._subWindowsContainer.style.height = '100%';
		this._subWindowsContainer.style.top = '0';
		this._subWindowsContainer.style.left = '0';
		this._subWindowsContainer.style.pointerEvents = 'none';

		container.appendChild(this._subWindowsContainer);
		container.addEventListener('mousedown', this.windowMouseDown_handler);
	}
	private windowMouseDown_handler(e: MouseEvent): void {
		innerWindowManager.activate(this);
	}
	/**
	 * 自己尺寸改变
	 */
	public doSelfResize(): void {
		for (let i = 0; i < this.subWindowsList.length; i++) {
			const window: _IInnerWindowCore = <any>this.subWindowsList[i] as _IInnerWindowCore;
			window.doSelfResize();
		}
	}

	/** 窗体的dom节点 */
	public get windowElement(): HTMLElement {
		//根容器不是窗体，不存在窗体的dom节点
		return null;
	}
	/** 子窗体的容器 */
	public get subWindowsContainer(): HTMLElement {
		return this._subWindowsContainer;
	}
	/** 子窗口列表 */
	public get subWindowsList(): IInnerWindow[] {
		return this._subWindowsList;
	}

	/** 窗体的x坐标 */
	public get x(): number {
		return 0;
	}
	/** 所在父级的局部坐标X位置 */
	public get localX(): number {
		return 0;
	}
	/** 窗体的y坐标 */
	public get y(): number {
		return 0;
	}
	/** 所在父级的局部坐标Y位置 */
	public get localY(): number {
		return 0;
	}
	/** 窗体的宽度 */
	public get width(): number {
		return this.subWindowsContainer.offsetWidth;
	}
	/** 窗体的高度 */
	public get height(): number {
		return this.subWindowsContainer.offsetHeight;
	}

	/**
	 * 设置父级窗体
	 * @param owner 
	 */
	public setOwnerWindow(owner: IInnerWindow | IInnerWindowRoot): void {
		//do nothing
	}
	/**
	 * 是否启用父级的遮蔽效果。
	 */
	public get modal(): boolean {
		return false;
	}
	/**
	 * 作为父级窗体的时候，启动当前窗体的被模态的效果，该方法不需要用户手动调用。
	 */
	public enableModal(): void {
		this._modalMask.style.pointerEvents = 'auto';
		this._modalMask.style.backgroundColor = 'rgba(0,0,0,0.3)';
	}
	/**
	 * 作为父级窗体的时候，失效当前窗体的被模态的效果，该方法不需要用户手动调用。
	 */
	public disableModal(): void {
		this._modalMask.style.pointerEvents = 'none';
		this._modalMask.style.backgroundColor = '';
	}
	/** 窗体是否已被激活 */
	public get actived(): boolean {
		//do nothing
		return false;
	}
	/**
	 * 播放父级窗体触发模态之后，当前窗体的可视提示 
	 */
	public modalNotif(): void {
		//do nothing
	}

	/**
	 * 派发打开窗体事件
	 */
	public doOpen(): void {
		//do nothing
	}
	/**
	 * 执行激活窗体
	 */
	public doActivate(): void {
		//do nothing
	}
	/**
	 * 执行失活窗体
	 */
	public doDeactivate(): void {
		//do nothing
	}
	/**
	 * 派发即将关闭窗体事件
	 */
	public doClosing(): Promise<boolean> {
		//do nothing
		return Promise.resolve(true);
	}
	/**
	 * 派发关闭窗体事件
	 */
	public doClose(): void {
		//do nothing
	}
	/**
	 * 执行esc
	 */
	public doEsc(): void {
		//do nothing
	}
	/**
	 * 执行esc
	 */
	public doEnter(): void {
		//do nothing
	}
}


/**
 * 内置窗口管理器
 */
class InnerWindowManager {

	private _rootLayer: RootLayer;
	private _windowChanged: Emitter<void>;
	constructor() {
		this.keydown_handler = this.keydown_handler.bind(this);

		this._rootLayer = new RootLayer();
		this._windowChanged = new Emitter<void>();

		document.addEventListener('keydown', this.keydown_handler);
	}

	private keydown_handler(e: KeyboardEvent): void {
		const activateWindow = this.currentActivateWindow;
		if (activateWindow && !(activateWindow instanceof RootLayer)) {
			if (e.keyCode == 27) {//esc
				(activateWindow as _IInnerWindow).doEsc();
			} else if (e.keyCode == 13) {//enter
				let canDoEnter = true;
				if (e.target instanceof HTMLInputElement) {
					e.target.type == 'text';
					canDoEnter = false;
				}
				if (canDoEnter) {
					(activateWindow as _IInnerWindow).doEnter();
				}
			}
		}
	}

	/**
	 * 窗口变更事件，在窗口打开和关闭时触发
	 */
	public get WindowChanged(): Event<void> {
		return this._windowChanged.event;
	}

	/**
	 * 根节点
	 */
	public get rootWindow(): IInnerWindowRoot {
		return this._rootLayer;
	}

	/**
	 * 初始化inner管理器
	 * @param container 
	 */
	public init(container: HTMLElement): void {
		this._rootLayer.init(container);
		watchResizeChange(this._rootLayer.subWindowsContainer);
		this._rootLayer.subWindowsContainer.addEventListener('resize', e => this.rootResize_handler());
	}

	private rootResize_handler(): void {
		this._rootLayer.doSelfResize();
	}


	/**
	 * 打开一个窗体
	 * @param window 要被打开的窗体 
	 * @param ownerWindow 窗体的父级
	 * @param modal 是否是模态
	 */
	public open(window: _IInnerWindow, ownerWindow?: IInnerWindow | 'root', modal?: boolean): void {
		if (!ownerWindow) {
			window.setOwnerWindow(this.currentActivateWindow);
		} else if (ownerWindow == 'root') {
			window.setOwnerWindow(this._rootLayer);
		} else {
			window.setOwnerWindow(ownerWindow);
		}

		const owner: _IInnerWindow = <any>window.ownerWindow as _IInnerWindow;
		if (owner.subWindowsList.indexOf(window) == -1) {
			owner.subWindowsContainer.appendChild(window.windowElement);
			owner.subWindowsList.push(window);
			window.doOpen();
		}
		if (modal) {
			owner.enableModal();
		}
		this.activate(window);
		this._windowChanged.fire();
	}

	/**
	 * 关闭一个窗口
	 * @param window 
	 */
	public close(window: _IInnerWindow): void {
		window.doClosing().then(veto => {
			if (veto) {
				return;
			}

			window.doDeactivate();
			const owner: _IInnerWindow = <any>window.ownerWindow as _IInnerWindow;
			const index = owner.subWindowsList.indexOf(window);
			if (index != -1) {
				owner.subWindowsList.splice(index, 1);
			}
			if (window.windowElement) {
				window.windowElement.remove();
			}
			window.doClose();

			//更新父级模态撞他
			let canRemoveOwnerModal: boolean = window.modal;
			for (let i = 0; i < owner.subWindowsList.length; i++) {
				const subWindow = <any>(owner.subWindowsList[i]) as _IInnerWindow;
				if (subWindow.modal) {
					canRemoveOwnerModal = false;
					break;
				}
			}
			if (canRemoveOwnerModal) {
				owner.disableModal();
			}

			//关闭窗口之后找到新的激活窗口并激活
			let nextActiveWindow: _IInnerWindow = null;
			if (owner.subWindowsList.length > 0) {
				nextActiveWindow = this.getRealActivateWindow(owner.subWindowsList[owner.subWindowsList.length - 1] as _IInnerWindow) as _IInnerWindow;
			} else {
				nextActiveWindow = this.getRealActivateWindow(owner) as _IInnerWindow;
			}
			if (nextActiveWindow && !(nextActiveWindow instanceof RootLayer)) {
				this.activate(nextActiveWindow);
			}
			this._windowChanged.fire();
		});
	}

	private _currentActivateWindow: IInnerWindow | IInnerWindowRoot;
	/** 当前激活的窗体 */
	public get currentActivateWindow(): IInnerWindow | IInnerWindowRoot {
		if (this._currentActivateWindow && isInDOM((<any>this._currentActivateWindow as _IInnerWindow).subWindowsContainer)) {
			return this._currentActivateWindow;
		}
		return this._rootLayer;
	}
	/**
	 * 激活一个窗体
	 * @param window 
	 */
	public activate(window: _IInnerWindow | _IInnerWindowRoot): void {
		this._currentActivateWindow = this.doActivate(window);
	}

	public tryActive(windowType: IInnerWindowConstructor): boolean {
		const window = this.getOpenedWindow(windowType, this._rootLayer);
		if (!window) {
			return false;
		} else {
			this.activate(window as _IInnerWindow);
			return true;
		}
	}

	private getOpenedWindow(windowType: IInnerWindowConstructor, root: _IInnerWindowCore): IInnerWindow {
		if (!root) {
			return null;
		}
		if (root instanceof windowType) {
			return root;
		}
		for (let i = 0; i < root.subWindowsList.length; i++) {
			const subWindow = <any>(root.subWindowsList[i]) as _IInnerWindow;
			const find = this.getOpenedWindow(windowType, subWindow);
			if (find) {
				return find;
			}
		}
		return null;
	}

	private doActivate(window: _IInnerWindow | _IInnerWindowRoot): IInnerWindow | _IInnerWindowRoot {
		const readActiveWindow = this.getRealActivateWindow(window);
		if (readActiveWindow instanceof RootLayer) {
			this.deactivateWindowsExcept(null);
		} else {
			this.movetoTop(readActiveWindow as _IInnerWindow);
			this.deactivateWindowsExcept(readActiveWindow as _IInnerWindow);
			if (!readActiveWindow.actived) {
				readActiveWindow.doActivate();
			}
			if (readActiveWindow != window) {
				readActiveWindow.modalNotif();
			}
			return readActiveWindow;
		}
	}

	private movetoTop(window: _IInnerWindow): void {
		if (window) {
			var owner: _IInnerWindow = <any>window.ownerWindow as _IInnerWindow;
			const index = owner.subWindowsList.indexOf(window);
			// 如果window不再subWindowsList中，则忽略
			if (index != -1) {
				owner.subWindowsList.splice(index, 1);
				owner.subWindowsList.push(window);

				for (let i = 0; i < owner.subWindowsList.length; i++) {
					const subWindow = <any>owner.subWindowsList[i] as _IInnerWindow;
					subWindow.windowElement.style.zIndex = i + '';
				}
			}
		}
	}


	private getRealActivateWindow(window: _IInnerWindow | _IInnerWindowRoot): _IInnerWindow | _IInnerWindowRoot {
		if (window.subWindowsList.length == 0) {
			return window;
		}
		let hasModalChild: boolean = false;
		for (var i = window.subWindowsList.length - 1; i >= 0; i--) {
			var subWindow: _IInnerWindow = window.subWindowsList[i] as _IInnerWindow;
			if (subWindow.modal) {
				hasModalChild = true;
				break;
			}
		}
		if (!hasModalChild) {
			return window;
		}
		for (var i = window.subWindowsList.length - 1; i >= 0; i--) {
			var subWindow = this.getRealActivateWindow(window.subWindowsList[i] as _IInnerWindow) as _IInnerWindow;
			if (subWindow) {
				return subWindow;
			}
		}
		return null;
	}

	private deactivateWindowsExcept(exceptWindow: _IInnerWindow): void {
		this.doDeactivateWindowsExcept(this._rootLayer, exceptWindow);
	}

	private doDeactivateWindowsExcept(ownerWindow: _IInnerWindowCore, exceptWindow: _IInnerWindow): void {
		for (let i = 0; i < ownerWindow.subWindowsList.length; i++) {
			const subWindow = <any>(ownerWindow.subWindowsList[i]) as _IInnerWindow;
			if (subWindow != exceptWindow) {
				if (subWindow.actived) {
					subWindow.doDeactivate();
				}
			}
			this.doDeactivateWindowsExcept(subWindow, exceptWindow);
		}
	}
}

/**
 * 内置窗体管理器
 */
export var innerWindowManager = new InnerWindowManager();