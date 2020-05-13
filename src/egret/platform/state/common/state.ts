import { createDecorator } from '../../instantiation/common/instantiation';


export const IStateService = createDecorator<IStateService>('stateService');

/**
 * 状态存储服务
 */
export interface IStateService {
	_serviceBrand: undefined;
	/**
	 * 得到内容
	 * @param key 
	 * @param defaultValue 
	 */
	getItem<T>(key: string, defaultValue?: T): T;
	/**
	 * 设置内容
	 * @param key 
	 * @param data 
	 */
	setItem(key: string, data: any): void;
	/**
	 * 移除内容
	 * @param key 
	 */
	removeItem(key: string): void;
}