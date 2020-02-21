import { IBrowserWindowEx, IWindowConfiguration } from '../common/window';
import { BrowserWindowConstructorOptions, BrowserWindow, app } from 'electron';
import { parseArgs } from '../../environment/node/argv';
import { assign } from 'egret/base/common/objects';
import * as path from 'path';


/**
 * 窗体扩展
 */
export class BrowserWindowEx implements IBrowserWindowEx {
	private _id: number;
	private _win: Electron.BrowserWindow;

	constructor() {
		const options: BrowserWindowConstructorOptions = {
			backgroundColor:'#3b3b3b',
			disableAutoHideCursor: true,
			title: 'EUI Editor - Prerelease',
			webPreferences: {
				nodeIntegration: true
			}
		};
		this._win = new BrowserWindow(options);
		this._id = this._win.id;
	}
	private _config:IWindowConfiguration;
	/**
	 * 当前窗体的配置
	 */
	public get config():IWindowConfiguration{
		return this._config;
	}
	/**
	 * 重新加载
	 */
	public reload():void{
		if(this._win){
			this._win.reload();
		}
	}

	/**
	 * 打开窗体
	 * @param config 窗体的打开配置
	 */
	public load(config: IWindowConfiguration): void {
		this._config = config;
		const url = this.getUrl(config);
		this._win.loadURL(url);
		const webContents = this._win.webContents;
		webContents.on('did-finish-load', () => {
			webContents.setZoomFactor(1);
			webContents.setVisualZoomLevelLimits(1, 1);
			webContents.setLayoutZoomLevelLimits(0, 0);
		});
		webContents.addListener('will-navigate',e=>{
			e.preventDefault();
		});
	}
	private getUrl(windowConfiguration: IWindowConfiguration): string {
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
		if (this._win) {
			this._win.close();
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
}