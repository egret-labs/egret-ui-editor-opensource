import { createDecorator } from 'egret/platform/instantiation/common/instantiation';

export const INotificationService = createDecorator<INotificationService>('notificationService');

/**
 * 提示消息内容
 */
export interface IMessage {
	/**
	 * 提示内容,可以自定义 提示内容,支持简单的内容
	 */
	content: string | HTMLElement;
	/**
	 * 自动关闭的延时，单位秒。设为 0 时不自动关闭。
	 */
	duration?: number ;
}

/**
 * 通知服务
 */
export interface INotificationService {
	_serviceBrand: undefined;
	/**
	 * 报告 info 
	 */
	info(message: IMessage): void;

	/**
	 * 报告warn.
	 */
	warn(message: IMessage): void;

	/**
	 * 报告errors. 
	 */
	error(message: IMessage): void;
}