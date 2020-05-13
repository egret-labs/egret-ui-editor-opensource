import { ipcMain as ipc, app } from 'electron';
import { createDecorator } from '../../instantiation/common/instantiation';
import { Emitter, Event } from 'egret/base/common/event';
import { handleVetos } from '../common/lifecycle';
import { IBrowserWindowEx } from '../../windows/common/window';

/**
 * 窗体卸载事件
 */
export interface IWindowUnloadEvent {
	/**
	 * 即将卸载的窗体
	 */
	window: IBrowserWindowEx;
	/**
	 * 是否是由于重新加载而卸载的
	 */
	reload: boolean;
	/**
	 * 是否拒绝卸载
	 * @param value 
	 */
	veto(value: boolean | Promise<boolean>): void;
}


export const ILifecycleService = createDecorator<ILifecycleService>('lifecycleService');
/**
 * 主进程生命周期服务
 */
export interface ILifecycleService {
	_serviceBrand: undefined;
	/**
	 * 程序退出之前
	 */
	onBeforeShutdown: Event<void>;
	/**
	 * 程序退出
	 */
	onShutdown: Event<void>;
	/**
	 * 窗体即将被关闭
	 */
	onBeforeWindowClose: Event<IBrowserWindowEx>;
	/**
	 * 窗体即将被卸载，可以阻止卸载
	 */
	onBeforeWindowUnload: Event<IWindowUnloadEvent>;
	/**
	 * 窗体被关闭
	 */
	onWindowClosed: Event<IBrowserWindowEx>;
	/**
	 * 准备
	 */
	ready(): void;
	/**
	 * 注册一个窗体
	 * @param window 
	 */
	registerWindow(window: IBrowserWindowEx): void;
	/**
	 * 卸载一个窗口
	 * @param window 要卸载的窗体
	 * @param reload 是否要重新加载，默认为false
	 */
	unload(window: IBrowserWindowEx, reload?: boolean): Promise<boolean>;
	/**
	 * 退出，返回退出过程是否被阻止
	 */
	quit(): Promise<boolean>;
}

/**
 * 主进程生命周期管理
 */
export class LifecycleService implements ILifecycleService {
	_serviceBrand: undefined;

	private windowToCloseRequest: { [windowId: string]: boolean };
	/** 已请求退出程序 */
	private pendingQuitPromise: Promise<boolean>;
	private pendingQuitPromiseComplete: (value?: boolean | PromiseLike<boolean>) => void;

	/** ipc通信时间戳 */
	private oneTimeListenerTokenGenerator: number;
	private windowCounter: number;

	private _onBeforeShutdown = new Emitter<void>();
	onBeforeShutdown: Event<void> = this._onBeforeShutdown.event;

	private _onShutdown = new Emitter<void>();
	onShutdown: Event<void> = this._onShutdown.event;

	private _onBeforeWindowUnload = new Emitter<IWindowUnloadEvent>();
	onBeforeWindowUnload: Event<IWindowUnloadEvent> = this._onBeforeWindowUnload.event;

	private _onBeforeWindowClose = new Emitter<IBrowserWindowEx>();
	onBeforeWindowClose: Event<IBrowserWindowEx> = this._onBeforeWindowClose.event;

	private _onWindowClosed = new Emitter<IBrowserWindowEx>();
	onWindowClosed: Event<IBrowserWindowEx> = this._onWindowClosed.event;

	constructor() {
		this.windowToCloseRequest = Object.create(null);
		this.oneTimeListenerTokenGenerator = 0;

	}
	/**
	 * 准备
	 */
	public ready(): void {
		this.registerListeners();
	}

	private registerListeners(): void {
		//所有窗体即将关闭
		app.on('window-all-closed', () => {
			this._onBeforeShutdown.fire();
			this._onShutdown.fire();
			app.quit();
		});
	}


	/**
	 * 注册一个窗体
	 * @param window 
	 */
	public registerWindow(window: IBrowserWindowEx): void {
		// 记录window的数量
		this.windowCounter++;

		//阻止关闭，直到渲染进程内部告知可以关闭。
		window.win.on('close', e => {
			const windowId = window.id;
			if (this.windowToCloseRequest[windowId]) {
				delete this.windowToCloseRequest[windowId];
				return;
			}
			e.preventDefault();
			this.unload(window).then(veto=>{
				if (!veto) {
					this.windowToCloseRequest[windowId] = true;
					this._onBeforeWindowClose.fire(window);
					window.close();
				}else{
					delete this.windowToCloseRequest[windowId];
				}
			});
		});
		window.win.on('closed', e => {
			this._onWindowClosed.fire(window);
			const windowId = window.id;
			this.windowCounter--;
		});
	}


	/**
	 * 卸载一个窗口
	 * @param window 要卸载的窗体
	 * @param reload 是否要重新加载，默认为false
	 */
	public unload(window: IBrowserWindowEx, reload: boolean = false): Promise<boolean> {
		const needReload: boolean = reload;
		//检查window所在的渲染进程，是否允许卸载
		return this.onBeforeUnloadWindowInRenderer(window, needReload).then(veto => {
			if (veto) {
				return this.handleVeto(veto);
			}
			return this.onBeforeUnloadWindowInMain(window, needReload).then(veto => {
				if (veto) {
					return this.handleVeto(veto);
				}
				return this.onWillUnloadWindowInRenderer(window, needReload).then(() => false);
			});
		});
	}

	private onBeforeUnloadWindowInRenderer(window: IBrowserWindowEx, reload: boolean): Promise<boolean> {
		return new Promise<boolean>(c => {
			const oneTimeEventToken = this.oneTimeListenerTokenGenerator++;
			const okChannel = `egret:ok${oneTimeEventToken}`;
			const cancelChannel = `egret:cancel${oneTimeEventToken}`;
			ipc.once(okChannel, () => {
				c(false); // no veto
			});
			ipc.once(cancelChannel, () => {
				c(true); // veto
			});
			window.send('egret:onBeforeUnload', { okChannel, cancelChannel, reload });
		});
	}

	private onBeforeUnloadWindowInMain(window: IBrowserWindowEx, reload: boolean): Promise<boolean> {
		const vetos: (boolean | Promise<boolean>)[] = [];
		this._onBeforeWindowUnload.fire({
			reload,
			window,
			veto(value) {
				vetos.push(value);
			}
		});
		return handleVetos(vetos);
	}

	private onWillUnloadWindowInRenderer(window: IBrowserWindowEx, reload: boolean): Promise<void> {
		return new Promise<void>(c => {
			const oneTimeEventToken = this.oneTimeListenerTokenGenerator++;
			const replyChannel = `egret:reply${oneTimeEventToken}`;
			ipc.once(replyChannel, () => c(void 0));
			window.send('egret:onWillUnload', { replyChannel, reload });
		});
	}

	/**
	 * 退出
	 */
	public quit(): Promise<boolean> {
		if (!this.pendingQuitPromise) {
			this.pendingQuitPromise = new Promise<boolean>(resolve => {
				this.pendingQuitPromiseComplete = resolve;
				app.once('will-quit', () => {
					if (this.pendingQuitPromiseComplete) {
						this.pendingQuitPromiseComplete(false);
						this.pendingQuitPromiseComplete = null;
						this.pendingQuitPromise = null;
					}
				});
				app.quit();
			});
		}
		return this.pendingQuitPromise;
	}

	private handleVeto(veto: boolean): boolean {
		// 终止退出
		if (veto && this.pendingQuitPromiseComplete) {
			this.pendingQuitPromiseComplete(true);
			this.pendingQuitPromiseComplete = null;
			this.pendingQuitPromise = null;
		}
		return veto;
	}
}