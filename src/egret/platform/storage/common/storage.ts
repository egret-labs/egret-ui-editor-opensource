'use strict';

import { createDecorator } from 'egret/platform/instantiation/common/instantiation';

export const ID = 'storageService';

export const IStorageService = createDecorator<IStorageService>(ID);

/**
 * 本地缓存服务
 */
export interface IStorageService {
	_serviceBrand: undefined;

	/**
	 * 将给定键值下的字符串值存储到本地存储。
	 * 可选范围参数允许定义操作的范围。
	 * @param key 键
	 * @param value 值
	 * @param scope 范围
	 */
	store(key: string, value: any, scope?: StorageScope): void;

	/**
	 * 删除 scope 中键位key 的值
	 * @param key 键
	 * @param scope 范围
	 */
	remove(key: string, scope?: StorageScope): void;

	/**
	 * 获取本地存储中的值
	 * @param key 键
	 * @param scope 范围
	 * @param defaultValue 默认值
	 */
	get(key: string, scope?: StorageScope, defaultValue?: string): string;

	/**
	 * 
	 * @param scope 范围
	 */
	clear(scope?: StorageScope): void;

}

/**
 * 本地存储范围
 */
export enum StorageScope {

	//全局
	GLOBAL,

	//当前workspace
	WORKSPACE
}

export const NullStorageService: IStorageService = {
	_serviceBrand: undefined,
	store() { return void 0; },
	remove() { return void 0; },
	clear() { return void 0; },
	get(a, b, defaultValue) { return defaultValue; },
};