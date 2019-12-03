import * as nsfw from 'vscode-nsfw';
import * as path from 'path';
import { IRawFileChange, normalize, toFileChangesEvent, IWatcher } from '../common';
import { FileChangeType, FileChangesEvent } from 'egret/platform/files/common/files';
import { isMacintosh } from 'egret/base/common/platform';
import { normalizeNFC } from 'egret/base/common/strings';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';

const nsfwActionToRawChangeType: { [key: number]: number } = [];
nsfwActionToRawChangeType[nsfw.actions.CREATED] = FileChangeType.ADDED;
nsfwActionToRawChangeType[nsfw.actions.MODIFIED] = FileChangeType.UPDATED;
nsfwActionToRawChangeType[nsfw.actions.DELETED] = FileChangeType.DELETED;


interface IWatcherObjet {
	start(): any;
	stop(): any;
}

interface IPathWatcher {
	ready: Promise<IWatcherObjet>;
	watcher?: IWatcherObjet;
}

/**
 * 文件观察器
 */
export class Watcher implements IWatcher {

	private _ignored: string[];
	private _basePath: string;

	constructor(
		private contextservice: IWorkspaceService,
		private ignored: string[],
		private onFileChanges: (changeds: FileChangesEvent) => void
	) {
	}
	/**
	 * 启动watcher服务
	 */
	public startup(): () => void {
		this.setRoots(this.contextservice.getWorkspace().uri.fsPath, this.ignored);
		return () => { this.stopWatch(); };
	}


	/**
	 * 设置根路径
	 * @param roots 观察请求
	 */
	private setRoots(basePath: string, ignored: string[]): Promise<void> {
		this._ignored = ignored;
		this._basePath = basePath;
		console.log('Start watching ' + basePath);
		this.stopWatch();
		this.watch();
		return Promise.resolve(void 0);
	}

	/**
	 * 停止观察
	 */
	public stopWatch(): void {
		if (this.watcher) {
			this.watcher.ready.then(watcher => watcher.stop());
			this.watcher = null;
		}
	}

	private undeliveredFileEvents: IRawFileChange[] = [];
	private watcher: IPathWatcher = null;
	private watch(): void {

		let readyPromiseCallback = null;
		this.watcher = {
			ready: new Promise<IWatcherObjet>(c => readyPromiseCallback = c)
		};

		nsfw(this._basePath, events => {
			for (let i = 0; i < events.length; i++) {
				const e = events[i];
				let type: string = '';
				if (e.action === nsfw.actions.CREATED) {
					type = '[CREATED]';
				} else if (e.action === nsfw.actions.DELETED) {
					type = '[DELETED]';
				} else if (e.action === nsfw.actions.MODIFIED) {
					type = '[RENAMED]';
				}
				const logPath = e.action === nsfw.actions.RENAMED ? path.join(e.directory, e.oldFile) + ' -> ' + e.newFile : path.join(e.directory, e.file);
				console.log(type, logPath);

				let absolutePath: string;
				if (e.action === nsfw.actions.RENAMED) {
					absolutePath = path.join(e.directory, e.oldFile);
					if (!this.isPathIgnored(absolutePath)) {
						this.undeliveredFileEvents.push({ type: FileChangeType.DELETED, path: absolutePath });
					}
					absolutePath = path.join(e.directory, e.newFile);
					if (!this.isPathIgnored(absolutePath)) {
						this.undeliveredFileEvents.push({ type: FileChangeType.ADDED, path: absolutePath });
					}
				} else {
					absolutePath = path.join(e.directory, e.file);
					if (!this.isPathIgnored(absolutePath)) {
						this.undeliveredFileEvents.push({
							type: nsfwActionToRawChangeType[e.action],
							path: absolutePath
						});
					}
				}
			}
			this.fireFileChanged();
		}).then(watcher => {
			this.watcher.watcher = watcher;
			const startPromise = watcher.start();
			startPromise.then(() => readyPromiseCallback(watcher));
			return startPromise;
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

		//Mac系统
		if (isMacintosh) {
			events.forEach(e => e.path = normalizeNFC(e.path));
		}

		const res = normalize(events);
		this.onFileChanges(toFileChangesEvent(res));
	}

	private isPathIgnored(absolutePath: string): boolean {
		absolutePath = path.normalize(absolutePath).toLocaleLowerCase();
		for (let i = 0; i < this._ignored.length; i++) {
			const ignore = this._ignored[i];
			if (absolutePath == path.normalize(ignore).toLocaleLowerCase()) {
				return true;
			}
		}
		return false;
	}

}