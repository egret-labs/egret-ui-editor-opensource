'use strict';

import { createDecorator } from 'egret/platform/instantiation/common/instantiation';
import { FileStat } from './explorerModel';
import URI from 'egret/base/common/uri';

export const IExplorerService = createDecorator<IExplorerService>('explorerService');
/**
 * 资源管理器服务
 */
export interface IExplorerService {
	_serviceBrand: undefined;
	init(impl: IExplorerService): void;
	/**
	 * 得到当前选择的文件列表
	 */
	getFileSelection():FileStat[];
	/**
	 * 获取根文件夹
	 */
	getRoot(): URI;
	/**
	 * 得到首个被选中的文件夹
	 */
	getFirstSelectedFolder():URI;
	/**
	 * 根据指定的文件，选中并且使该项目可见。
	 */
	select(resource: URI, reveal: boolean): Promise<void>;
}