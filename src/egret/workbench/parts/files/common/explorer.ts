'use strict';

import { createDecorator } from 'egret/platform/instantiation/common/instantiation';
import { FileStat } from './explorerModel';
import URI from 'egret/base/common/uri';

export const IExplorerService = createDecorator<IExplorerService>('explorerService');
/**
 * 资源管理器服务
 */
export interface IExplorerService {
	_serviceBrand: any;
	/**
	 * 得到当前选择的文件列表
	 */
	getFileSelection():FileStat[];

	/**
	 * 得到首个被选中的文件夹
	 */
	getFirstSelectedFolder():URI;
}