import * as chokidar from 'chokidar';
import { isMacintosh } from 'egret/base/common/platform';
import { normalizeNFC } from 'egret/base/common/strings';
import { IRawFileChange, normalize, toFileChangesEvent, IWatcher } from '../common';
import { FileChangeType, FileChangesEvent } from 'egret/platform/files/common/files';

import * as paths from 'path';
import * as fs from 'fs';
import URI from 'egret/base/common/uri';

/**
 * 文件观察器
 */
export class Watcher implements IWatcher {

	private spamCheckStartTime: number;
	private spamWarningLogged: boolean;
	private enospcErrorLogged: boolean;

	constructor(
		private workspaceUri: URI,
		private ignored: string[],
		private onFileChanges: (changeds: FileChangesEvent) => void
	) {
	}

	/**
	 * 启动watcher服务
	 */
	public startup(): () => void {
		this.setRoots(this.workspaceUri.fsPath, this.ignored);
		return () => { this.stopWatch(); };
	}

	/**
	 * 停止观察
	 */
	public stopWatch(): void {
		if (this.chokidarWatcher) {
			this.chokidarWatcher.close();
			this.chokidarWatcher = null;
		}

	}




	private undeliveredFileEvents: IRawFileChange[] = [];
	private chokidarWatcher:chokidar.FSWatcher;
	/**
	 * 设置根路径
	 * @param roots 观察请求
	 */
	private setRoots(basePath: string, ignored: string[]): Promise<void> {
		const watcherOpts: chokidar.WatchOptions = {
			ignoreInitial: true,
			ignorePermissionErrors: true,
			followSymlinks: true, // this is the default of chokidar and supports file events through symlinks
			ignored: ignored,
			interval: 1000, // while not used in normal cases, if any error causes chokidar to fallback to polling, increase its intervals
			binaryInterval: 1000,
			disableGlobbing: true // fix https://github.com/Microsoft/vscode/issues/4586
		};
		const originalBasePath = basePath;
		const realBasePath = isMacintosh ? (this.realcaseSync(originalBasePath) || originalBasePath) : originalBasePath;
		const realBasePathLength = realBasePath.length;
		const realBasePathDiffers = (originalBasePath !== realBasePath);


		if (realBasePathDiffers) {
			console.warn(`Watcher basePath does not match version on disk and was corrected (original: ${originalBasePath}, real: ${realBasePath})`);
		}

		this.chokidarWatcher = chokidar.watch(realBasePath, watcherOpts);

		// Detect if for some reason the native watcher library fails to load
		if (isMacintosh && !this.chokidarWatcher.options.useFsEvents) {
			console.error('Watcher is not using native fsevents library and is falling back to unefficient polling.');
		}



		return new Promise<void>((resolve, reject) => {
			this.chokidarWatcher.on('all', (type: string, path: string) => {
				if (isMacintosh) {
					path = normalizeNFC(path);
				}
				if (path.indexOf(realBasePath) < 0) {
					return; //不属于根路径
				}
				//确保转换为真正的路径
				if (realBasePathDiffers) {
					path = originalBasePath + path.substr(realBasePathLength);
				}

				let event: IRawFileChange = null;



				if (type === 'change') { // 改变
					event = { type: 0, path };
				} else if (type === 'add' || type === 'addDir') { // 添加
					event = { type: 1, path };
				} else if (type === 'unlink' || type === 'unlinkDir') { // 删除
					event = { type: 2, path };
				}

				if (event) {
					console.log(event.type === FileChangeType.ADDED ? '[ADDED]' : event.type === FileChangeType.DELETED ? '[DELETED]' : '[CHANGED]', event.path);

					const now = Date.now();
					if (this.undeliveredFileEvents.length === 0) {
						this.spamWarningLogged = false;
						this.spamCheckStartTime = now;
					} else if (!this.spamWarningLogged && this.spamCheckStartTime + 60 * 1000 < now) {
						this.spamWarningLogged = true;
						console.warn('Watcher is busy catching up with ' + this.undeliveredFileEvents.length + ' file changes in 60 seconds. Latest changed path is "' + event.path + '"');
					}

					// 添加到缓存
					this.undeliveredFileEvents.push(event);
					this.fireFileChanged();
				}
				resolve();
			});

			this.chokidarWatcher.on('error', (error: Error) => {
				if (error) {
					if ((<any>error).code === 'ENOSPC') {
						if (!this.enospcErrorLogged) {
							this.enospcErrorLogged = true;
							reject(new Error('Inotify limit reached (ENOSPC)'));
						}
					} else {
						console.error(error.toString());
					}
				}
			});
		});
	}

	private fireFileChanged(): void {
		if (this.doFireFileChangedFlag) {
			return;
		}
		this.doFireFileChangedFlag = true;
		setTimeout(() => {
			this.doFireFileChanged();
		}, 50);
	}
	private doFireFileChangedFlag: boolean = false;
	private doFireFileChanged(): void {
		this.doFireFileChangedFlag = false;

		const events = this.undeliveredFileEvents.concat();
		this.undeliveredFileEvents = [];

		const res = normalize(events);
		this.onFileChanges(toFileChangesEvent(res));
	}



	private realcaseSync(path: string): string {
		const dir = paths.dirname(path);
		if (path === dir) {	// end recursion
			return path;
		}

		const name = (paths.basename(path) /* can be '' for windows drive letters */ || path).toLowerCase();
		try {
			const entries = this.readdirSync(dir);
			const found = entries.filter(e => e.toLowerCase() === name);	// use a case insensitive search
			if (found.length === 1) {
				// on a case sensitive filesystem we cannot determine here, whether the file exists or not, hence we need the 'file exists' precondition
				const prefix = this.realcaseSync(dir);   // recurse
				if (prefix) {
					return paths.join(prefix, found[0]);
				}
			} else if (found.length > 1) {
				// must be a case sensitive $filesystem
				const ix = found.indexOf(name);
				if (ix >= 0) {	// case sensitive
					const prefix = this.realcaseSync(dir);   // recurse
					if (prefix) {
						return paths.join(prefix, found[ix]);
					}
				}
			}
		} catch (error) {
			// silently ignore error
		}
		return null;
	}

	private readdirSync(path: string): string[] {
		// Mac: uses NFD unicode form on disk, but we want NFC
		// See also https://github.com/nodejs/node/issues/2165
		if (isMacintosh) {
			return fs.readdirSync(path).map(c => normalizeNFC(c));
		}

		return fs.readdirSync(path);
	}
}