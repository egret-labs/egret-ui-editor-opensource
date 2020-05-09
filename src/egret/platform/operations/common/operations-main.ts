import { createDecorator } from '../../instantiation/common/instantiation';
import { Event } from 'egret/base/common/event';

export const IOperationMainService = createDecorator<IOperationMainService>('operationMainService');
/**
 * 主进程命令服务
 */
export interface IOperationMainService {
	_serviceBrand: undefined;

	/**
	 * 快捷键绑定数据更新，需要重新绑定快捷键
	 */
	onKeybindingUpdate: Event<void>;
	/**
	 * 得到主进程需要的快捷键
	 * @param command 要执行的命令
	 * @param defaultKey 默认的快捷键
	 * @param name 命令名
	 * @param description 命令描述 
	 */
	getKeybinding(command: string, defaultKey: string, name: string, description: string): string;

	/**
	 * 执行操作
	 * @param operationId 
	 * @param args 
	 */
	executeOperation<T = any>(command: string, ...args: any[]): Promise<T>;
}