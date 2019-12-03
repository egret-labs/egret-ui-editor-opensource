'use strict';
import { createDecorator } from 'egret/platform/instantiation/common/instantiation';

export const IOutputService = createDecorator<IOutputService>('outputService');
/**
 * 输出服务，用于管理运行的各种进程的输出
 */
export interface IOutputService {
	_serviceBrand: any;
	/**
	 * 锁定滚动
	 */
	scrollLock: boolean;
	/**
	 * 向通道追加输出
	 */
	append(output: string): void;
	/**
	 * 清除此通道的所有接收输出
	 */
	clear(): void;
}