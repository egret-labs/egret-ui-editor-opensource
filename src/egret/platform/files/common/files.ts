'use strict';

import * as paths from 'egret/base/common/paths';
import URI from 'egret/base/common/uri';
import { createDecorator } from 'egret/platform/instantiation/common/instantiation';
import { Event } from 'egret/base/common/event';
import { isEqualOrParent, isEqual } from 'egret/base/common/resources';

export const IFileService = createDecorator<IFileService>('fileService');



/**
 * 文件服务接口
 */
export interface IFileService {
	_serviceBrand: undefined;
	/**
	 * 监听文件改变，在指定工作空间下的任何文件的改变都会派发事件。
	 */
	readonly onFileChanges: Event<FileChangesEvent>;
	/**
	 * 对文件的操作，操作成功后派发事件
	 */
	readonly onAfterOperation: Event<FileOperationEvent>;
	/**
	 * 得到工作空间的根目录
	 */
	getWorkspaceRoot(): URI;
	/**
	 * 选择文件，这个方法是递归的
	 * @param resource 开始查找的文件
	 * @param exts 要查找的扩展名，如['.bmp','.txt']
	 * @param onSelected 每查到一个目标文件的时候调用
	 */
	select(resource: URI, exts: string[], onSelected?: (stat: ISelectedStat) => void, ignores?: string[]): Promise<ISelectedStat[]>;
	/**
	 * 解析工作空间的根目录
	 */
	resolveWorkspaceRoot(): Promise<IFileStat>;
	/**
	 * 解析一个文件
	 * @param resource 要被解析的文件
	 * @param resolveTo 要被解析的子路径
	 */
	resolveFile(resource: URI, resolveTo?: URI[]): Promise<IFileStat>;

	/**
	 * 解析多个文件
	 * @param toResolve 要被解析的文件列表
	 */
	resolveFiles(toResolve: { resource: URI, resolveTo?: URI[] }[]): Promise<IResolveFileResult[]>;
	/**
	 * 解析文件内容
	 * @param resource 要解析的文件
	 * @param encoding 编码
	 */
	resolveContent(resource: URI, encoding?: string): Promise<IContent>;
	/**
	 * 是否存在某一个文件
	 * @param resource 是否存在一个文件
	 */
	existsFile(resource: URI): Promise<boolean>;
	/**
	 * 替换文件内容
	 * @param resource 要重写的文件路径
	 * @param value 要重写的内容
	 * @param options 重写配置
	 */
	updateContent(resource: URI, value: string): Promise<IFileStat>;
	/**
	 * 移动文件到一个新的位置
	 * @param source 原位置
	 * @param target 目标位置
	 * @param overwrite 是否覆盖已存在文件
	 */
	moveFile(source: URI, target: URI, overwrite?: boolean): Promise<IFileStat>;
	/**
	 * 复制文件到一个指定位置
	 * @param source 原位置
	 * @param target 目标路径
	 * @param overwrite 是否覆盖已存在文件
	 */
	copyFile(source: URI, target: URI, overwrite?: boolean): Promise<IFileStat>;
	/**
	 * 创建一个文件
	 * @param resource 要创建文件的位置
	 * @param content 创建文件的内容
	 * @param overwrite 是否覆盖已存在文件
	 */
	createFile(resource: URI, content?: string, overwrite?: boolean): Promise<IFileStat>;
	/**
	 * 创建一个文件夹
	 * @param resource 要创建文件夹的位置
	 */
	createFolder(resource: URI): Promise<IFileStat>;
	/**
	 * 重命名一个文件
	 * @param resource 要重命名的文件
	 * @param newName 文件名
	 */
	rename(resource: URI, newName: string): Promise<IFileStat>;
	/**
	 * 删除一个文件
	 * @param resource 要删除的文件路径
	 * @param useTrash 是否删除到回收站中
	 */
	del(resource: URI, useTrash?: boolean): Promise<void>;
	/**
	 * 释放所有路径
	 */
	dispose(): void;
}


/**
 * 解析一个文件的结果
 */
export interface IResolveFileResult {
	/**
	 * 文件
	 */
	stat: IFileStat;
	/**
	 * 是否成功
	 */
	success: boolean;
}
/**
 * 文件描述
 */
export interface IStat {
	/**
	 * 目标的ID
	 */
	id: number | string;
	/**
	 * 目标的修改时间戳
	 */
	mtime: number;
	/**
	 * 目标的大小
	 */
	size: number;
	/**
	 * 目标类型
	 */
	type: FileType;
}
/**
 * 文件类型
 */
export enum FileType {
	File = 0,
	Dir = 1,
	Symlink = 2
}

/**
 * 文件操作
 */
export enum FileOperation {
	/** 创建 */
	CREATE,
	/** 删除 */
	DELETE,
	/** 移动 */
	MOVE,
	/** 复制 */
	COPY
}

/**
 * 文件操作事件
 */
export class FileOperationEvent {

	constructor(private _resource: URI, private _operation: FileOperation, private _target?: IFileStat) {
	}
	/**
	 * 文件的资源
	 */
	public get resource(): URI {
		return this._resource;
	}
	/**
	 * 操作的filestat
	 */
	public get target(): IFileStat {
		return this._target;
	}
	/**
	 * 操作方式
	 */
	public get operation(): FileOperation {
		return this._operation;
	}
}
/**
 * 文件改变类型
 */
export enum FileChangeType {
	UPDATED = 0,
	ADDED = 1,
	DELETED = 2
}
/**
 * 文件改变
 */
export interface IFileChange {
	/**
	 * 文件改变类型
	 */
	type: FileChangeType;
	/**
	 * 文件路径
	 */
	resource: URI;
}
/**
 * 文件改变事件
 */
export class FileChangesEvent {

	private _changes: IFileChange[];
	constructor(changes: IFileChange[]) {
		this._changes = changes;
	}
	/**
	 * 文件改变
	 */
	public get changes() {
		return this._changes;
	}
	/**
	 * 是否包含某个文件改变，如果要检查的是删除，且是文件的父级被删除了，同样会返回true
	 * @param resource 要检查的文件
	 * @param type 文件改变的类型
	 */
	public contains(resource: URI, type: FileChangeType): boolean {
		if (!resource) {
			return false;
		}
		return this._changes.some(change => {
			if (change.type !== type) {
				return false;
			}
			if (type === FileChangeType.DELETED) {
				return isEqualOrParent(resource, change.resource);
			}
			return isEqual(resource, change.resource);
		});
	}

	/**
	 * 得到添加文件的更改
	 */
	public getAdded(): IFileChange[] {
		return this.getOfType(FileChangeType.ADDED);
	}
	/**
	 * 是否有添加文件
	 */
	public gotAdded(): boolean {
		return this.hasType(FileChangeType.ADDED);
	}
	/**
	 * 得到删除文件的更改
	 */
	public getDeleted(): IFileChange[] {
		return this.getOfType(FileChangeType.DELETED);
	}
	/**
	 * 是否有删除文件
	 */
	public gotDeleted(): boolean {
		return this.hasType(FileChangeType.DELETED);
	}
	/**
	 * 得到更新文件的更改
	 */
	public getUpdated(): IFileChange[] {
		return this.getOfType(FileChangeType.UPDATED);
	}
	/**
	 * 是否有更新文件
	 */
	public gotUpdated(): boolean {
		return this.hasType(FileChangeType.UPDATED);
	}
	private getOfType(type: FileChangeType): IFileChange[] {
		return this._changes.filter(change => change.type === type);
	}
	private hasType(type: FileChangeType): boolean {
		return this._changes.some(change => {
			return change.type === type;
		});
	}
}
/**
 * 是否是父子关系
 * @param path 父级目录
 * @param candidate 子级目录
 */
export function isParent(path: string, candidate: string): boolean {
	if (!path || !candidate || path === candidate) {
		return false;
	}

	if (candidate.length > path.length) {
		return false;
	}

	path = paths.normalize(path).toLocaleLowerCase();
	candidate = paths.normalize(candidate).toLocaleLowerCase();

	const value1 = paths.isEqualOrParent(path, candidate);
	const value2 = paths.isEqual(path, candidate);
	if(value1 && !value2){
		return true;
	}
	return false;
}
/**
 * 得到索引
 * @param path 
 * @param candidate 
 */
export function indexOf(path: string, candidate: string): number {
	if (candidate.length > path.length) {
		return -1;
	}

	if (path === candidate) {
		return 0;
	}

	path = paths.normalize(path).toLocaleLowerCase();
	candidate = paths.normalize(candidate).toLocaleLowerCase();

	return path.indexOf(candidate);
}

/**
 * 文件基础描述
 */
export interface IBaseStat {
	/**
	 * 文件路径
	 */
	resource: URI;
	/**
	 * 名称
	 */
	name: string;
	/**
	 * 修改时间戳
	 */
	mtime: number;
}
/**
 * 选择的文件描述
 */
export interface ISelectedStat extends IBaseStat {
	/**
	 * 文件扩展名
	 */
	ext: string;
}

/**
 * 文件描述
 */
export interface IFileStat extends IBaseStat {
	/**
	 * 是否是文件夹
	 */
	isDirectory: boolean;
	/**
	 * 是否是标签链接
	 */
	isSymbolicLink?: boolean;
	/**
	 * 文件的子节点列表
	 */
	children?: IFileStat[];
	/**
	 * 文件大小
	 */
	size?: number;
}
/**
 * 文件内容
 */
export interface IContent extends IBaseStat {
	/**
	 * 文件的值
	 */
	value: string;
	/**
	 * 文件的编码
	 */
	encoding: string;
}