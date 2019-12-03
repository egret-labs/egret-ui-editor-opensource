import * as paths from 'path';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import URI from 'egret/base/common/uri';
import { IFileStat } from 'egret/platform/files/common/files';
import { isEqualOrParent, isEqual } from 'egret/base/common/resources';


/**
 * 数据层
 */
export class Model {
	constructor(@IWorkspaceService private contextService: IWorkspaceService){
		if(this.contextService.getWorkspace()){
			this._root = new FileStat(this.contextService.getWorkspace().uri,undefined);
		}else{
			this._root = new FileStat(null,null,false,false,'');
		}
	}
	private _root:FileStat;
	/**
	 * 根文件
	 */
	public get root():FileStat{
		return this._root;
	}
	/**
	 * 返回基于根文件的符合的文件，如果不存在返回null
	 */
	public find(resource: URI): FileStat {
		return this.root.find(resource);
	}
}

/**
 * 文件数据
 */
export class FileStat implements IFileStat {

	private _isDirectory: boolean;
	private _isSymbolicLink: boolean;

	/**
	 * 目录是否已被解析
	 */
	public isDirectoryResolved: boolean;

	constructor(
		public resource: URI,
		public root: FileStat, isSymbolicLink?: boolean, isDirectory?: boolean, name?: string, mtime?: number) {
		this.name = name;
		if (!this.name && resource) {
			this.name = paths.basename(resource.fsPath);
		}
		this.isDirectory = !!isDirectory;
		this._isSymbolicLink = !!isSymbolicLink;
		this.mtime = mtime;
		if (!this.root) {
			this.root = this;
		}

	}
	/**
	 * 名称
	 */
	public name: string;
	/**
	 * 修改时间戳
	 */
	public mtime: number;
	/**
	 * 是否是文件夹
	 */
	public get isDirectory(): boolean {
		return this._isDirectory;
	}
	public set isDirectory(value: boolean) {
		if (value !== this._isDirectory) {
			this._isDirectory = value;
			if (this._isDirectory) {
				this.children = [];
			} else {
				this.children = undefined;
			}
		}
	}

	/**
	 * 是否是标签链接
	 */
	public get isSymbolicLink(): boolean {
		return this._isSymbolicLink;
	}

	/**
	 * 文件数据的id
	 */
	public getId(): string {
		if(this.resource){
			return this.resource.toString();
		}
		return '';
	}

	/**
	 * 是否是根文件节点
	 */
	public get isRoot(): boolean {
		if(this.resource){
			return this.resource.toString() === this.root.resource.toString();
		}
		return this == this.root;
	}

	/**
	 * 创建一个文件数据
	 * @param raw 
	 * @param root 
	 * @param resolveTo 
	 */
	public static create(raw: IFileStat, root: FileStat, resolveTo?: URI[]): FileStat {
		const stat = new FileStat(raw.resource, root, raw.isSymbolicLink, raw.isDirectory, raw.name, raw.mtime);
		if (stat.isDirectory) {
			stat.isDirectoryResolved = !!raw.children || (!!resolveTo && resolveTo.some((r) => {
				return isEqualOrParent(r, stat.resource);
			}));
			if (raw.children) {
				for (let i = 0, len = raw.children.length; i < len; i++) {
					const child = FileStat.create(raw.children[i], root, resolveTo);
					child.parent = stat;
					stat.children.push(child);
				}
			}
		}
		return stat;
	}

	/**
	 * 合并本地与磁盘上的文件节点
	 * @param disk 
	 * @param local 
	 */
	public static mergeLocalWithDisk(disk: FileStat, local: FileStat): void {
		if (disk.resource.toString() !== local.resource.toString()) {
			return; // Merging only supported for stats with the same resource
		}

		// Stop merging when a folder is not resolved to avoid loosing local data
		const mergingDirectories = disk.isDirectory || local.isDirectory;
		if (mergingDirectories && local.isDirectoryResolved && !disk.isDirectoryResolved) {
			return;
		}

		// Properties
		local.resource = disk.resource;
		local.name = disk.name;
		local.isDirectory = disk.isDirectory;
		local.mtime = disk.mtime;
		local.isDirectoryResolved = disk.isDirectoryResolved;

		// Merge Children if resolved
		if (mergingDirectories && disk.isDirectoryResolved) {
			// Map resource => stat
			const oldLocalChildren:{[key:string]:FileStat} = {};
			if (local.children) {
				local.children.forEach((localChild: FileStat) => {
					oldLocalChildren[localChild.resource.toString().toLocaleLowerCase()] = localChild;
				});
			}
			// Clear current children
			local.children = [];
			// Merge received children
			disk.children.forEach((diskChild: FileStat) => {
				const formerLocalChild = oldLocalChildren[diskChild.resource.toString().toLocaleLowerCase()];
				// Existing child: merge
				if (formerLocalChild) {
					FileStat.mergeLocalWithDisk(diskChild, formerLocalChild);
					formerLocalChild.parent = local;
					local.children.push(formerLocalChild);
				}

				// New child: add
				else {
					diskChild.parent = local;
					local.children.push(diskChild);
				}
			});
		}
	}

	/**
	 * 添加子项到当前文件夹
	 */
	public addChild(child: FileStat): void {
		child.parent = this;
		child.updateResource(false);
		this.children.push(child);
	}

	/**
	 * 从当前文件夹中移除子项
	 */
	public removeChild(child: FileStat): void {
		for (let i = 0; i < this.children.length; i++) {
			if (this.children[i].resource.toString() === child.resource.toString()) {
				this.children.splice(i, 1);
				break;
			}
		}
	}

	/**
	 * 将当前文件移动到一个新的父级
	 * @param newParent 
	 * @param fnBetweenStates 
	 * @param fnDone 
	 */
	public move(newParent: FileStat, fnBetweenStates?: (callback: () => void) => void, fnDone?: () => void): void {
		if (!fnBetweenStates) {
			fnBetweenStates = (cb: () => void) => { cb(); };
		}
		this.parent.removeChild(this);
		fnBetweenStates(() => {
			newParent.removeChild(this); //确保也删除了之前的版本
			newParent.addChild(this);
			this.updateResource(true);
			if (fnDone) {
				fnDone();
			}
		});
	}

	private updateResource(recursive: boolean): void {
		this.resource = this.parent.resource.with({ path: paths.join(this.parent.resource.path, this.name) });
		if (recursive) {
			if (this.isDirectory && this.children) {
				this.children.forEach((child: FileStat) => {
					child.updateResource(true);
				});
			}
		}
	}

	/**
	 * 重命名当前文件
	 * @param renamedStat 
	 */
	public rename(renamedStat: IFileStat): void {
		// 更新的当前自己的属性
		this.name = renamedStat.name;
		this.mtime = renamedStat.mtime;
		// 更新子项所有名称
		this.updateResource(true);
	}

	/**
	 * 根据URI递归查找当前文件的子文件
	 * @param resource 
	 */
	public find(resource: URI): FileStat {
		// 如果要找的和当前自己一样，直接返回
		if (isEqual(resource, this.resource)) {
			return this;
		}
		// 如果没有任何子项返回null
		if (!this.children) {
			return null;
		}
		for (let i = 0; i < this.children.length; i++) {
			const child = this.children[i];
			if (isEqual(resource, child.resource)) {
				return child;
			}
			if (child.isDirectory && isEqualOrParent(resource, child.resource)) {
				return child.find(resource);
			}
		}
		return null; //无法找到
	}
	/**
	 * 文件的子节点列表
	 */
	public children: FileStat[];
	/**
	 * 父级文件节点
	 */
	public parent: FileStat;
}