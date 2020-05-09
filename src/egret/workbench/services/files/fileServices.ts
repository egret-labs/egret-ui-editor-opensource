import { IFileService, FileChangesEvent, FileOperation, IFileStat, IResolveFileResult, isParent, IContent, ISelectedStat, FileOperationEvent } from '../../../platform/files/common/files';
import { Event, Emitter } from '../../../base/common/event';
import { IDisposable, dispose, toDisposable } from '../../../base/common/lifecycle';
import URI from '../../../base/common/uri';
import * as path from 'path';
import * as fs from 'fs';
import { coalesce } from '../../../base/common/arrays';
import { isMacintosh, isWindows } from '../../../base/common/platform';
import { normalizeNFC, endsWith } from '../../../base/common/strings';
import { isEqualOrParent, normalize } from '../../../base/common/paths';
import { shell } from 'electron';
import { Watcher as WatcherUnix } from './watcher/unix/watcher-unix';
import { Watcher as WatcherWin32 } from './watcher/win32/watcher-win32';
import { IWatcher } from './watcher/common';
import { localize } from 'egret/base/localization/nls';
import * as fileUtils from './fileUtils';


/**
 * 文件服务
 */
export class FileService implements IFileService {
	_serviceBrand: undefined;
	private toDispose: IDisposable[];

	private _onFileChanges: Emitter<FileChangesEvent>;
	private _onAfterOperation: Emitter<FileOperationEvent>;


	private activeWorkspaceFileChangeWatcher: IDisposable;

	constructor(private workspaceUri: URI) {
		this.toDispose = [];

		this._onFileChanges = new Emitter<FileChangesEvent>();
		this.toDispose.push(this._onFileChanges);
		this._onAfterOperation = new Emitter<FileOperationEvent>();
		this.toDispose.push(this._onAfterOperation);
		if (this.workspaceUri) {
			fs.exists(this.workspaceUri.fsPath, exist => {
				if (exist) {
					this.setupFileWatching();
				}
			});
		}
	}

	private setupFileWatching(): void {
		if (this.activeWorkspaceFileChangeWatcher) {
			this.activeWorkspaceFileChangeWatcher.dispose();
		}
		let watcher: IWatcher = null;

		const ignores: string[] = [];
		ignores.push(path.join(this.workspaceUri.fsPath, 'bin-debug'));
		ignores.push(path.join(this.workspaceUri.fsPath, 'bin-release'));

		if (isWindows) {
			watcher = new WatcherWin32(this.workspaceUri, ignores, e => this._onFileChanges.fire(e));
		} else {
			watcher = new WatcherUnix(this.workspaceUri, ignores, e => this._onFileChanges.fire(e));
		}
		this.activeWorkspaceFileChangeWatcher = toDisposable(watcher.startup());
	}

	/**
	 * 监听文件改变，在指定工作空间下的任何文件的改变都会派发事件。
	 */
	public get onFileChanges(): Event<FileChangesEvent> {
		return this._onFileChanges.event;
	}
	/**
	 * 对文件的操作，操作成功后派发事件
	 */
	public get onAfterOperation(): Event<FileOperationEvent> {
		return this._onAfterOperation.event;
	}
	/**
	 * 解析一个文件
	 * @param resource 要被解析的文件
	 * @param resolveTo 要被解析的子路径
	 */
	public resolveFile(resource: URI, resolveTo?: URI[]): Promise<IFileStat> {
		return this.resolve(resource, resolveTo);
	}
	/**
	 * 解析多个文件
	 * @param toResolve 要被解析的文件列表
	 */
	public resolveFiles(toResolve: { resource: URI, resolveTo?: URI[] }[]): Promise<IResolveFileResult[]> {
		return Promise.all(toResolve.map(resourceAndOptions => this.resolve(resourceAndOptions.resource, resourceAndOptions.resolveTo)
			.then(stat => ({ stat: stat, success: true }), error => ({ stat: void 0, success: false }))));
	}
	/**
	 * 解析文件内容
	 * @param resource 要解析的文件
	 * @param encoding 编码
	 */
	public resolveContent(resource: URI, encoding: string = 'utf8'): Promise<IContent> {
		return new Promise<IContent>((resolve, reject) => {
			this.resolve(resource).then(stat => {
				fs.readFile(resource.fsPath, { encoding: encoding }, (err, data) => {
					if (err) {
						reject(err);
					} else {
						resolve({
							encoding: encoding,
							value: data,
							resource: resource,
							name: stat.name,
							mtime: stat.mtime
						});
					}
				});
			}, err => {
				reject(err);
			});
		});
	}

	/**
	 * 得到工作空间的根目录
	 */
	public getWorkspaceRoot(): URI {
		return this.workspaceUri;
	}

	/**
	 * 解析工作空间的根目录
	 */
	public resolveWorkspaceRoot(): Promise<IFileStat> {
		return this.resolveFile(this.getWorkspaceRoot());
	}

	/**
	 * 选择文件，这个方法是递归的
	 * @param resource 开始查找的文件
	 * @param exts 要查找的扩展名，如['.bmp','.txt']
	 * @param onSelected 每查到一个目标文件的时候调用
	 */
	public select(resource: URI, exts: string[], onSelected?: (stat: ISelectedStat) => void, ignores?: string[]): Promise<ISelectedStat[]> {
		return fileUtils.select(resource, exts, onSelected, ignores);
	}

	/**
	 * 执行解析
	 * @param resource 要被解析的资源路径
	 * @param resolveTo 要被解析的子路径
	 */
	private resolve(resource: URI, resolveTo?: URI[]): Promise<IFileStat> {
		return this.toStatResolver(resource)
			.then(model => model.resolve(resolveTo));
	}
	private toStatResolver(resource: URI): Promise<StatResolver> {
		const absolutePath = this.toAbsolutePath(resource);
		return statLink(absolutePath).then(({ isSymbolicLink, stat }) => {
			return new StatResolver(resource, isSymbolicLink, stat.isDirectory(), stat.mtime.getTime(), stat.size);
		});
	}

	private toAbsolutePath(arg1: URI | IFileStat): string {
		let resource: URI;
		if (arg1 instanceof URI) {
			resource = <URI>arg1;
		} else {
			resource = (<IFileStat>arg1).resource;
		}
		return normalize(resource.fsPath, true);
	}


	/**
	 * 是否存在某一个文件
	 * @param resource 是否存在一个文件
	 */
	public existsFile(resource: URI): Promise<boolean> {
		return this.resolveFile(resource).then(() => true, () => false);
	}
	/**
	 * 替换文件内容
	 * @param resource 要重写的文件路径
	 * @param value 要重写的内容
	 * @param options 重写配置
	 */
	public updateContent(resource: URI, value: string): Promise<IFileStat> {
		return this.doUpdateContent(resource, value);
	}

	private doUpdateContent(resource: URI, value: string): Promise<IFileStat> {
		const absolutePath = this.toAbsolutePath(resource);
		return this.checkFile(absolutePath).then(exist => {
			let createParentsPromise: Promise<boolean>;
			if (exist) {
				createParentsPromise = Promise.resolve(void 0);
			} else {
				createParentsPromise = this.mkdirp(path.dirname(absolutePath));
			}
			return createParentsPromise.then(() => {
				return this.doSetContentsAndResolve(resource, absolutePath, value);
			});
		});
	}

	private doSetContentsAndResolve(resource: URI, absolutePath: string, value: string): Promise<IFileStat> {
		const writeFile = new Promise((resolve, reject) => {
			fs.writeFile(absolutePath, value, { encoding: 'utf8', mode: 0o666 }, err => {
				if (err) {
					reject(err);
				} else {
					resolve(void 0);
				}
			});
		});
		return writeFile.then(() => {
			return this.resolve(resource);
		});
	}

	/**
	 * 递归创建路径
	 * @param target 
	 */
	private mkdirp(target: string): Promise<boolean> {
		const mkdir = new Promise((resolve, reject) => {
			fs.mkdir(target, error => {
				if (error) {
					if (error.code === 'EEXIST') {
						fs.stat(target, (err, stat) => {
							if (stat) {
								if (stat.isDirectory) {
									resolve(true);
								} else {
									reject(localize('fileService.checkFile.pathExistAndIsFile', 'The {0} path already exists and is not a folder.', target));
								}
							} else {
								reject(err);
							}
						});
					} else {
						reject(error);
					}
				} else {
					resolve(false);
				}
			});
		});
		// 遇到根路径就结束
		if (target === path.dirname(target)) {
			return Promise.resolve(true);
		}
		// 递归创建目录
		return mkdir.then(result => {
			if (result) {
				return true;
			} else {
				return this.mkdirp(path.dirname(target));
			}
		});
	}


	private checkFile(absolutePath: string): Promise<boolean /* exists */> {
		return new Promise<boolean>((resolve, reject) => {
			fs.exists(absolutePath, exists => {
				if (exists) {
					fs.stat(absolutePath, (err, stat) => {
						if (err) {
							reject(err);
							return;
						}
						if (stat.isDirectory()) {
							reject(new Error(localize('fileService.checkFile.isDirectory', 'The file to be changed is a folder')));
							return;
						}
						if (!(stat.mode & 128) /* 只读 */) {
							reject(new Error(localize('fileService.checkFile.isReadonly', 'Read-only files are not writable')));
							return;
						}
						resolve(true);
					});
					return;
				}
				resolve(false);
			});

		});
	}

	/**
	 * 移动文件到一个新的位置
	 * @param source 原位置
	 * @param target 目标位置
	 * @param overwrite 是否覆盖已存在文件
	 */
	public moveFile(source: URI, target: URI, overwrite?: boolean): Promise<IFileStat> {
		return this.moveOrCopyFile(source, target, false, overwrite);
	}
	/**
	 * 复制文件到一个指定位置
	 * @param source 原位置
	 * @param target 目标路径
	 * @param overwrite 是否覆盖已存在文件
	 */
	public copyFile(source: URI, target: URI, overwrite?: boolean): Promise<IFileStat> {
		return this.moveOrCopyFile(source, target, true, overwrite);
	}

	private moveOrCopyFile(source: URI, target: URI, keepCopy: boolean, overwrite: boolean): Promise<IFileStat> {
		const sourcePath = this.toAbsolutePath(source);
		const targetPath = this.toAbsolutePath(target);
		return this.doMoveOrCopyFile(sourcePath, targetPath, keepCopy, overwrite).then(() => {
			return this.resolve(target).then(result => {
				// 事件
				this._onAfterOperation.fire(new FileOperationEvent(source, keepCopy ? FileOperation.COPY : FileOperation.MOVE, result));
				return result;
			});
		});
	}

	private doMoveOrCopyFile(sourcePath: string, targetPath: string, keepCopy: boolean, overwrite: boolean): Promise<boolean /* exists */> {
		if (isParent(targetPath, sourcePath)) {
			return Promise.reject<boolean>(new Error('指定径是目标路径的父级，无法移动或复制指定目录 '));
		}
		return new Promise<boolean>((resolve, reject) => {
			fs.exists(targetPath, exists => {
				const isCaseRename = sourcePath.toLowerCase() === targetPath.toLowerCase();
				const isSameFile = sourcePath === targetPath;
				if (exists && !isCaseRename && !overwrite) {
					reject(new Error(localize('fileService.doMoveOrCopyFile.existNoMoveOrCopy', 'The target path already exists and cannot be moved or copied')));
					return;
				}
				let deleteTargetPromise = Promise.resolve();
				if (exists && !isCaseRename) {
					if (isEqualOrParent(normalize(sourcePath), normalize(targetPath))) {
						reject(new Error(localize('fileService.doMoveOrCopyFile.noMoveOrCopyToParentDirectory', 'Unable to move or copy to replace its parent folder')));
						return;
					}
					deleteTargetPromise = this.del(URI.file(targetPath), true);
				}
				deleteTargetPromise.then(() => {
					this.mkdirp(path.dirname(targetPath)).then(() => {
						if (isSameFile) {
							resolve(exists);
						} else if (keepCopy) {
							this.copy(sourcePath, targetPath, error => {
								if (error) {
									reject(error);
								} else {
									resolve(exists);
								}
							});
						} else {
							this.mv(sourcePath, targetPath, error => {
								if (error) {
									reject(error);
								} else {
									resolve(exists);
								}
							});
						}
					}, error => {
						reject(error);
					});
				}, error => {
					reject(error);
				});
			});
		});
	}


	private copy(source: string, target: string, callback: (error: Error) => void, copiedSources?: { [path: string]: boolean }): void {
		if (!copiedSources) {
			copiedSources = Object.create(null);
		}
		fs.stat(source, (error, stat) => {
			if (error) {
				return callback(error);
			}
			if (!stat.isDirectory()) {
				return this.doCopyFile(source, target, stat.mode & 511, callback);
			}
			if (copiedSources[source]) {
				return callback(null); // 如果遇到链接类型的文件，会进重新进入外层的递归循环，所以这里记录一下
			}
			copiedSources[source] = true; // 标记为已经复制过。
			this.mkdirp(target).then(() => {
				fileUtils.readdir(source, (err, files) => {
					if (files) {
						const numSum = files.length;
						let numFinish = 0;
						let copiedError = null;
						const checkComplete = (error) => {
							if (error) {
								copiedError = err;
							}
							if (numFinish == numSum) {
								callback(copiedError);
							}
						};
						const clb = (error) => {
							numFinish++;
							checkComplete(error);
						};
						for (let i = 0; i < files.length; i++) {
							const file = files[i];
							this.copy(path.join(source, file), path.join(target, file), clb, copiedSources);
						}
						checkComplete(null);
					} else {
						callback(err);
					}
				});
			}, error => {
				callback(error);
			});
		});
	}


	private mv(source: string, target: string, callback: (error: Error) => void): void {
		if (source === target) {
			return callback(null);
		}
		function updateMtime(err: Error): void {
			if (err) {
				return callback(err);
			}

			fs.stat(target, (error, stat) => {
				if (error) {
					return callback(error);
				}

				if (stat.isDirectory()) {
					return callback(null);
				}

				fs.open(target, 'a', null, (err: Error, fd: number) => {
					if (err) {
						return callback(err);
					}

					fs.futimes(fd, stat.atime, new Date(), (err: Error) => {
						if (err) {
							return callback(err);
						}

						fs.close(fd, callback);
					});
				});
			});
		}

		fs.rename(source, target, (err: Error) => {
			if (!err) {
				return updateMtime(null);
			}
			if (err && source.toLowerCase() !== target.toLowerCase() && ((<any>err).code === 'EXDEV') || endsWith(source, '.')) {
				return this.copy(source, target, (err: Error) => {
					if (err) {
						return callback(err);
					}
					this.rmRecursive(source, updateMtime);
				});
			}

			return callback(err);
		});
	}
	private rmRecursive(target: string, callback: (error: Error) => void): void {
		if (target === '\\' || target === '/') {
			return callback(new Error(localize('fileService.rmRecursive.cantDeleteDirectory', 'Unable to delete root directory')));
		}
		fs.exists(target, exists => {
			if (!exists) {
				callback(null);
			} else {
				fs.lstat(target, (err, stat) => {
					if (err || !stat) {
						callback(err);
					} else if (!stat.isDirectory() || stat.isSymbolicLink() /* !!! never recurse into links when deleting !!! */) {
						const mode = stat.mode;
						if (!(mode & 128)) { // 128 === 0200
							fs.chmod(target, mode | 128, (err: Error) => { // 128 === 0200
								if (err) {
									callback(err);
								} else {
									fs.unlink(target, callback);
								}
							});
						} else {
							fs.unlink(target, callback);
						}
					} else {
						fileUtils.readdir(target, (err, children) => {
							if (err || !children) {
								callback(err);
							} else if (children.length === 0) {
								fs.rmdir(target, callback);
							} else {
								let firstError: Error = null;
								let childrenLeft = children.length;
								children.forEach(child => {
									this.rmRecursive(path.join(target, child), (err: Error) => {
										childrenLeft--;
										if (err) {
											firstError = firstError || err;
										}

										if (childrenLeft === 0) {
											if (firstError) {
												callback(firstError);
											} else {
												fs.rmdir(target, callback);
											}
										}
									});
								});
							}
						});
					}
				});
			}
		});
	}

	private doCopyFile(source: string, target: string, mode: number, callback: (error: Error) => void): void {
		this.mkdirp(path.dirname(target)).then(() => {
			const reader = fs.createReadStream(source);
			const writer = fs.createWriteStream(target, { mode });
			let finished = false;
			const finish = (error?: Error) => {
				if (!finished) {
					finished = true;
					if (error) {
						callback(error);
					} else {
						fs.chmod(target, mode, callback);
					}
				}
			};
			reader.once('error', error => finish(error));
			writer.once('error', error => finish(error));
			writer.once('close', () => finish());
			reader.pipe(writer);
		});
	}


	/**
	 * 创建一个文件
	 * @param resource 要创建文件的位置
	 * @param content 创建文件的内容
	 * @param overwrite 是否覆盖已存在文件
	 */
	public createFile(resource: URI, content?: string, overwrite?: boolean): Promise<IFileStat> {
		const absolutePath = this.toAbsolutePath(resource);

		let checkFilePromise: Promise<boolean>;
		if (overwrite) {
			checkFilePromise = Promise.resolve(false);
		} else {
			checkFilePromise = new Promise((resolve, reject) => {
				fs.exists(absolutePath, exists => {
					resolve(exists);
				});
			});
		}
		return new Promise<IFileStat>((resolve, reject) => {
			checkFilePromise.then(exists => {
				if (exists && overwrite) {
					reject(localize('fileService.createFile.exist', '{0} file already exists and cannot be created.', resource.fsPath));
				} else {
					this.updateContent(resource, content).then(result => {
						//事件
						this._onAfterOperation.fire(new FileOperationEvent(resource, FileOperation.CREATE, result));
						resolve(result);
					}, error => {
						reject(error);
					});
				}
			});
		});
	}


	/**
	 * 创建一个文件夹
	 * @param resource 要创建文件夹的位置
	 */
	public createFolder(resource: URI): Promise<IFileStat> {
		const absolutePath = this.toAbsolutePath(resource);
		return this.mkdirp(absolutePath).then(() => {
			return this.resolve(resource).then(result => {
				//事件
				this._onAfterOperation.fire(new FileOperationEvent(resource, FileOperation.CREATE, result));
				return result;
			});
		});
	}
	/**
	 * 重命名一个文件
	 * @param resource 要重命名的文件
	 * @param newName 文件名
	 */
	public rename(resource: URI, newName: string): Promise<IFileStat> {
		const newPath = path.join(path.dirname(resource.fsPath), newName);
		return this.moveFile(resource, URI.file(newPath));
	}
	/**
	 * 删除一个文件
	 * @param resource 要删除的文件路径
	 * @param useTrash 是否删除到回收站中
	 */
	public del(resource: URI, useTrash?: boolean): Promise<void> {
		const absolutePath = this.toAbsolutePath(resource);
		if (useTrash) {
			const result = shell.moveItemToTrash(absolutePath);
			if (!result) {
				return Promise.reject(new Error(localize('fileService.del.deleteError', 'Delete {0} error', resource.fsPath)));
			} else {
				// 事件
				this._onAfterOperation.fire(new FileOperationEvent(resource, FileOperation.DELETE));
				return Promise.resolve(void 0);
			}
		} else {
			return new Promise((resolve, reject) => {
				this.doDel(absolutePath, error => {
					if (error) {
						reject(error);
					} else {
						// 事件
						this._onAfterOperation.fire(new FileOperationEvent(resource, FileOperation.DELETE));
						resolve(void 0);
					}
				});
			});
		}
	}

	private doDel(path: string, callback: (error: Error) => void): void {
		fs.exists(path, exists => {
			if (!exists) {
				return callback(null);
			}
			fs.stat(path, (err, stat) => {
				if (err || !stat) {
					return callback(err);
				}
				return this.rmRecursive(path, callback);
			});
		});
	}

	/**
	 * 释放所有路径
	 */
	public dispose(): void {
		this.toDispose = dispose(this.toDispose);
		if (this.activeWorkspaceFileChangeWatcher) {
			this.activeWorkspaceFileChangeWatcher.dispose();
			this.activeWorkspaceFileChangeWatcher = null;
		}
	}
}




/**
 * 文件解析器
 */
export class StatResolver {
	private name: string;
	constructor(
		private resource: URI,
		private isSymbolicLink: boolean,
		private isDirectory: boolean,
		private mtime: number,
		private size: number,
	) {
		this.name = path.basename(resource.fsPath);
	}

	/**
	 * 解析文件
	 * @param options 
	 */
	public resolve(resolveTo?: URI[]): Promise<IFileStat> {
		//基本数据
		const fileStat: IFileStat = {
			resource: this.resource,
			isDirectory: this.isDirectory,
			isSymbolicLink: this.isSymbolicLink,
			name: this.name,
			size: this.size,
			mtime: this.mtime
		};
		if (!this.isDirectory) {
			return Promise.resolve(fileStat);
		}
		let absoluteTargetPaths: string[] = null;
		if (resolveTo) {
			absoluteTargetPaths = [];
			resolveTo.forEach(resource => {
				absoluteTargetPaths.push(resource.fsPath);
			});
		}

		return new Promise<IFileStat>((resolve, reject) => {
			//加载子文件
			this.resolveChildren(this.resource.fsPath, absoluteTargetPaths, children => {
				children = coalesce(children); //去除空对象
				fileStat.children = children || [];
				resolve(fileStat);
			});
		});
	}

	private resolveChildren(absolutePath: string, absoluteTargetPaths: string[], callback: (children: IFileStat[]) => void): void {
		this.readDir(absolutePath, (error, files) => {
			if (error) {
				return callback(null); //可能没有权限读这个目录
			}
			const numSum = files.length;
			let finishNum = 0;
			const children: IFileStat[] = [];

			const checkComplete = () => {
				if (finishNum == numSum) {
					callback(children);
				}
			};

			files.forEach((file) => {
				const fileResource = URI.file(path.join(absolutePath, file));
				statLink(fileResource.fsPath).then(
					({ isSymbolicLink, stat }) => {
						const fileStat: fs.Stats = stat;
						const childStat: IFileStat = {
							resource: fileResource,
							isDirectory: fileStat.isDirectory(),
							isSymbolicLink,
							name: file,
							mtime: fileStat.mtime.getTime(),
							size: fileStat.size
						};
						children.push(childStat);

						let resolveFolderChildren = false;
						if (childStat.isDirectory) {
							if (files.length === 1) {
								resolveFolderChildren = true;
							} else if (absoluteTargetPaths && absoluteTargetPaths.some(targetPath => isEqualOrParent(normalize(targetPath), normalize(fileResource.fsPath)))) {
								resolveFolderChildren = true;
							}
						}
						if (resolveFolderChildren) {
							this.resolveChildren(fileResource.fsPath, absoluteTargetPaths, children => {
								const newChildren: IFileStat[] = [];
								for (let i = 0; i < children.length; i++) {
									if (children[i]) {
										newChildren.push(children[i]);
									}
								}
								childStat.children = newChildren;
								finishNum++;
								checkComplete();
							});
						} else {
							finishNum++;
							checkComplete();
						}
					}, error => {
						finishNum++;
						checkComplete();
					}
				);
			});
			checkComplete();
		});
	}

	private readDir(path: string, callback: (error: Error, files: string[]) => void): void {
		if (isMacintosh) {
			return fs.readdir(path, (error, children) => {
				if (error) {
					return callback(error, null);
				}
				return callback(null, children.map(c => normalizeNFC(c)));
			});
		}
		return fs.readdir(path, callback);
	}

}

function statLink(path: string): Promise<{ stat: fs.Stats, isSymbolicLink: boolean }> {
	return new Promise((resolve, reject) => {
		fs.lstat(path, (error, lstat) => {
			if (error || lstat.isSymbolicLink()) {
				fs.stat(path, (error, stat) => {
					if (error) {
						reject(error);
					}
					resolve({ stat: stat, isSymbolicLink: lstat && lstat.isSymbolicLink() });
				});
			} else {
				resolve({ stat: lstat, isSymbolicLink: false });
			}
		});
	});
}