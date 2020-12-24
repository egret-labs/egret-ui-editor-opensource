import { IBrowserWindowEx, IWindowConfiguration } from '../common/window';
import { BrowserWindowConstructorOptions, BrowserWindow, app, screen } from 'electron';
import { parseArgs } from '../../environment/node/argv';
import { assign } from 'egret/base/common/objects';
import { Event, Emitter } from 'vs/base/common/event';
import * as path from 'path';
import * as fsextra from 'fs-extra';
import { IEnvironmentService } from 'egret/platform/environment/common/environment';

type WindowState = {
	x?: number;
	y?: number;
	height?: number;
	width?: number;
	isMaximized?: boolean;
};

const enum ReadyState {

	/**
	 * This window has not loaded any HTML yet
	 */
	NONE,

	/**
	 * This window is loading HTML
	 */
	LOADING,

	/**
	 * This window is done loading HTML
	 */
	READY
}

/**
 * 窗体扩展
 */
export class BrowserWindowEx implements IBrowserWindowEx {
	private _onClosed: Emitter<void> = new Emitter<void>();
	private _readyState: ReadyState;
	private readonly whenReadyCallbacks: { (window: IBrowserWindowEx): void }[];
	protected _id: number;
	protected _win: Electron.BrowserWindow;

	constructor(protected windowId: string,
		newWindow: boolean,
		@IEnvironmentService private environmentService: IEnvironmentService) {
		this.whenReadyCallbacks = [];
		this._readyState = ReadyState.NONE;
		this.initWindow(newWindow);
	}

	protected initWindow(newWindow: boolean): void {
		if (newWindow) {
			const options: BrowserWindowConstructorOptions = {
				backgroundColor: '#3b3b3b',
				width: 1144,
				height: 690,
				disableAutoHideCursor: true,
				title: 'EUI Editor',
				webPreferences: {
					webSecurity: false,
					nodeIntegration: true,
					enableRemoteModule: true
				}
			};
			this._win = new BrowserWindow(options);
		} else {
			const state = this.getWindowState();
			this.normalBounds = {
				x: state.x,
				y: state.y,
				width: state.width,
				height: state.height
			};
			const options: BrowserWindowConstructorOptions = {
				backgroundColor: '#3b3b3b',
				width: state.width,
				height: state.height,
				x: state.x,
				y: state.y,
				disableAutoHideCursor: true,
				title: 'EUI Editor',
				webPreferences: {
					webSecurity: false,
					nodeIntegration: true,
					enableRemoteModule: true
				}
			};
			this._win = new BrowserWindow(options);
			if (state.isMaximized) {
				this._win.maximize();
			}
			this.saveNormalBounds();
		}
		this._win.on('resize', this.onStateHandler);
		this._win.on('move', this.onStateHandler);
		this._win.on('close', this.onClosingHanlder);
		this._win.on('closed', this.onClosedHanlder);
		this._id = this._win.id;
	}

	private _config: IWindowConfiguration;
	/**
	 * 当前窗体的配置
	 */
	public get config(): IWindowConfiguration {
		return this._config;
	}

	public get onClosed(): Event<void> {
		return this._onClosed.event;
	}
	/**
	 * 重新加载
	 */
	public reload(): void {
		if (this._win) {
			this._win.reload();
		}
	}

	public focus(): void {
		if (this._win) {
			if (this._win.isMinimized()) {
				this._win.restore();
			}
			this._win.setAlwaysOnTop(true);
			this._win.focus();
			this._win.setAlwaysOnTop(false);
		}
	}

	public isFocus(): boolean {
		const window = BrowserWindow.getFocusedWindow();
		return this._win === window;
	}

	setReady(): void {
		this._readyState = ReadyState.READY;

		// inform all waiting promises that we are ready now
		while (this.whenReadyCallbacks.length) {
			this.whenReadyCallbacks.pop()!(this);
		}
	}

	ready(): Promise<IBrowserWindowEx> {
		return new Promise<IBrowserWindowEx>(resolve => {
			if (this.isReady) {
				return resolve(this);
			}

			// otherwise keep and call later when we are ready
			this.whenReadyCallbacks.push(resolve);
		});
	}

	get isReady(): boolean {
		return this._readyState === ReadyState.READY;
	}

	/**
	 * 打开窗体
	 * @param config 窗体的打开配置
	 */
	public load(config: IWindowConfiguration): void {
		this._readyState = ReadyState.LOADING;
		this._config = config;
		const url = this.getUrl(config);
		this._win.loadURL(url);
		const webContents = this._win.webContents;
		webContents.on('did-finish-load', () => {
			webContents.zoomFactor = 1;
			webContents.setVisualZoomLevelLimits(1, 1);
		});
		webContents.addListener('will-navigate', e => {
			e.preventDefault();
		});
	}

	protected getUrl(windowConfiguration: IWindowConfiguration): string {
		windowConfiguration.windowId = this._win.id;
		const environment = parseArgs(process.argv);
		const config = assign(environment, windowConfiguration);
		return `file://${path.join(app.getAppPath(), './out/egret/workbench/electron-browser/bootstrap/index.html')}?config=${encodeURIComponent(JSON.stringify(config))}`;
	}
	/**
	 * 窗体的id
	 */
	public get id(): number {
		return this._id;
	}
	/**
	 * 窗体核心对象
	 */
	public get win(): Electron.BrowserWindow {
		return this._win;
	}
	/**
	 * 关闭窗体
	 */
	public close(): void {
		if (this._win && !this._win.isDestroyed()) {
			this._win.close();
		}
	}

	public sendWhenReady(channel: string, ...args: any[]): void {
		if (this.isReady) {
			this.send(channel, ...args);
		} else {
			this.ready().then(() => this.send(channel, ...args));
		}
	}

	/**
	 * 通过channel向渲染器进程发送异步消息
	 * @param channel 信道
	 * @param args 任意数据
	 */
	public send(channel: string, ...args: any[]): void {
		if (this._win) {
			this._win.webContents.send(channel, ...args);
		}
	}

	private onClosedHanlder = (e: Electron.Event): void => {
		this._onClosed.fire();
	}

	private onClosingHanlder = (e: Electron.Event): void => {
		this.saveWindowState();
	}

	private isNormal(): boolean {
		return !this._win.isMaximized() && !this._win.isMinimized() && !this._win.isFullScreen();
	}

	private isEmptyBound(bound: Electron.Rectangle): boolean {
		if (!bound) {
			return true;
		}
		return bound.x == 0 && bound.y == 0 && bound.width == 0 && bound.height == 0;
	}

	private normalBounds: Electron.Rectangle;
	private onStateHandler = (e: Electron.Event): void => {
		this.saveNormalBounds();
	}

	private saveNormalBounds(): void {
		if (this.isNormal()) {
			this.normalBounds = this._win.getBounds();
		}
	}

	private get configFile(): string {
		return path.join(this.environmentService.userDataPath, 'windowState.json');
	}

	private getAllWindowState(): any {
		try {
			const exist = fsextra.pathExistsSync(this.configFile);
			if (exist) {
				return fsextra.readJsonSync(this.configFile);
			}
		} catch (error) {
			console.log(error);
		}
		return {};
	}

	private saveWindowState(): void {
		const window = this._win;
		let bounds = window.getBounds();
		const isMaximized = window.isMaximized();
		if (!this.isNormal() && !this.isEmptyBound(this.normalBounds)) {
			bounds = this.normalBounds;
		}
		const state: WindowState = {
			x: bounds.x,
			y: bounds.y,
			height: bounds.height,
			width: bounds.width,
			isMaximized: isMaximized
		};
		const allState = this.getAllWindowState();
		allState[this.windowId] = state;
		try {
			fsextra.writeJsonSync(this.configFile, allState, { spaces: '\t' });
		} catch (error) {
			// ignore
			console.log(error);
		}
	}

	private getWindowState(): WindowState {
		const displays = screen.getAllDisplays();
		const layoutConfig = this.getAllWindowState();
		if (!layoutConfig || !layoutConfig[this.windowId]) {
			return {
				width: 1144,
				height: 690
			};
		}
		let boundsState: WindowState = layoutConfig[this.windowId];

		let isInScreen = false;
		const offsetW: number = 40;
		const offsetH: number = 40;
		for (let i = 0; i < displays.length; i++) {
			var curDisplay = displays[i].bounds;
			if (
				boundsState.x + boundsState.width - offsetW >= curDisplay.x &&
				boundsState.y + boundsState.height - offsetH >= curDisplay.y &&
				boundsState.x + offsetW <= curDisplay.x + curDisplay.width &&
				boundsState.y + offsetH <= curDisplay.y + curDisplay.height
			) {
				isInScreen = true;
				break;
			}
		}
		if (!isInScreen) {
			curDisplay = displays[0].bounds;
			boundsState.x = curDisplay.x + 20;
			boundsState.y = curDisplay.y + 20;
			boundsState.width = curDisplay.x + curDisplay.width - 40;
			boundsState.height = curDisplay.y + curDisplay.height - 40;
		}
		return boundsState;
	}
}