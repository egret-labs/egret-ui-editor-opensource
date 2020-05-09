import { ILifecycleService, ShutdownEvent, handleVetos } from '../common/lifecycle';
import { ipcRenderer as ipc } from 'electron';
import { Emitter, Event } from 'egret/base/common/event';
import { IWindowClientService } from '../../windows/common/window';
import { INotificationService } from 'egret/platform/notification/common/notifications';

/**
 * 生命周期管理服务
 */
export class LifecycleService implements  ILifecycleService {
	_serviceBrand: undefined;

	private readonly _onWillShutdown = new Emitter<ShutdownEvent>();
	private readonly _onShutdown = new Emitter<boolean/** reload */>();

	constructor(
		@INotificationService private  notificationService: INotificationService,
		@IWindowClientService private windowService: IWindowClientService
	){
		this.registerListener();
	}

	private registerListener():void{
		const windowId = this.windowService.getCurrentWindowId();
		ipc.on('egret:onBeforeUnload', (event, reply: { okChannel: string, cancelChannel: string, reload: boolean }) => {
			this.onBeforeUnload(reply.reload).then(veto=>{
				if (veto) {
					ipc.send(reply.cancelChannel, windowId);
				}else{
					ipc.send(reply.okChannel, windowId);
				}
			});
		});
		ipc.on('egret:onWillUnload', (event, reply: { replyChannel: string, reload: boolean }) => {
			this._onShutdown.fire(reply.reload);
			ipc.send(reply.replyChannel, windowId);
		});
	}

	private onBeforeUnload(reload: boolean): Promise<boolean> {
		const vetos: (boolean | Promise<boolean>)[] = [];
		this._onWillShutdown.fire({
			veto(value) {
				vetos.push(value);
			},
			reload
		});
		return handleVetos(vetos);
	}

	/**
	 * 窗体即将关闭事件，可以被阻止
	 */
	public get onWillShutdown(): Event<ShutdownEvent> {
		return this._onWillShutdown.event;
	}
	/**
	 * 关闭事件
	 */
	public get onShutdown(): Event<boolean> {
		return this._onShutdown.event;
	}
}