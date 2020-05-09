'use strict';

import URI from 'egret/base/common/uri';
import { createDecorator } from 'egret/platform/instantiation/common/instantiation';

export const IWorkspaceService = createDecorator<IWorkspaceService>('workspaceService');
/**
 * 工作空间服务
 */
export interface IWorkspaceService {
	_serviceBrand: undefined;
	/**
	 * 获取当前workspace
	 */
	getWorkspace(): IWorkspace;
	/**
	 * 获取当前盒式布局的根
	 */
	readonly boxlayout: boxlayout.BoxLayout;
	/**
	 * 注册盒式布局的根
	 * @param box 
	 */
	registerBoxlayout(box: boxlayout.BoxLayout): void;
}
/**
 * 工作空间接口
 */
export interface IWorkspace {
	/**
	 * 空间名字
	 */
	readonly name: string;
	/**
	 * 工作空间文件夹
	 */
	readonly uri: URI;
	/**
	 * 工作空间默认打开的文件
	 */
	readonly file: URI;
}

/**
 * 工作空间基本实现
 */
export class Workspace implements IWorkspace {

	constructor(
		private _name: string = '',
		private _uri: URI = null,
		private _file: URI = null
	) {
	}
	/**
	 * 工作空间名称
	 */
	public get name(): string {
		return this._name;
	}
	public set name(value: string) {
		this._name = value;
	}
	/**
	 * 工作空间路径
	 */
	public get uri(): URI {
		return this._uri;
	}
	public set uri(value: URI) {
		this._uri = value;
	}
	/**
	 * 工作空间默认打开的文件
	 */
	public get file(): URI {
		return this._file;
	}
	public set file(value: URI) {
		this._file = value;
	}

	/**
	 * 更新工作空间
	 * @param workspace 
	 */
	public update(workspace: Workspace) {
		this._name = workspace.name;
		this._uri = workspace.uri;
		this._file = workspace.file;
	}
}