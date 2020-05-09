import { IWindowClientService, IWindowConfiguration } from '../common/window';
import { INativeOpenDialogOptions, MessageBoxOptions, IMessageBoxResult } from '../common/windows';
import { ipcRenderer as ipc } from 'electron';

/**
 * 渲染进程当前窗体服务
 */
export class WindowClientService implements IWindowClientService {
	_serviceBrand: undefined;


	constructor(
		private windowId: number,
		private configuration: IWindowConfiguration
	) {
	}

	private ipcFlag: number = 0;
	private getIpcFlag(): string {
		this.ipcFlag++;
		return this.windowId + '_' + this.ipcFlag;
	}

	/**
	 * 得到当前窗体的id
	 */
	public getCurrentWindowId(): number {
		return this.windowId;
	}
	/**
	 * 得到窗体的配置
	 */
	public getConfiguration(): IWindowConfiguration {
		return this.configuration;
	}
	/**
	 * 选择文件打开
	 */
	public pickFolderAndOpen(options: INativeOpenDialogOptions): void {
		options.windowId = this.windowId;
		ipc.send('egret:pickFolderAndOpen', options);
	}
	/**
	 * 弹出消息盒子
	 * @param options 
	 */
	public showMessageBox(options: MessageBoxOptions): Promise<IMessageBoxResult> {
		return new Promise((resolve, reject) => {
			options.windowId = this.windowId;
			const replyChannel = `egret:reply${this.getIpcFlag()}`;
			ipc.once(replyChannel, (event, data: IMessageBoxResult) => {
				resolve(data);
			});
			ipc.send('egret:showMessageBox', { options, replyChannel });
		});
	}
}