import * as paths from 'path';
import * as cp from 'child_process';
import * as sd from 'string_decoder';

import { remote } from 'electron';
import { IWatcher, IRawFileChange, normalize, toFileChangesEvent } from '../common';
import { FileChangesEvent, FileChangeType } from 'egret/platform/files/common/files';
import URI from 'egret/base/common/uri';
/**
 * 文件观察器
 */
export class Watcher implements IWatcher {

	private static changeTypeMap: FileChangeType[] = [FileChangeType.UPDATED, FileChangeType.ADDED, FileChangeType.DELETED];


	constructor(
		private workspaceUri: URI,
		private ignored: string[],
		private onFileChanges: (changeds: FileChangesEvent) => void
	) {
		this.restartCounter = 0;

	}

	private watcherStoped:boolean = false;
	/**
	 * 启动watcher服务
	 */
	public startup(): () => void {
		this.watcherStoped = false;
		this.setRoots(this.workspaceUri.fsPath, this.ignored);
		return () => { this.stopWatch(); };
	}

	/**
	 * 停止观察
	 */
	public stopWatch(): void {
		this.watcherStoped = true;
		if(this.handle){
			try {
				this.handle.kill();
			} catch (error) {}
			this.handle = null;
		}
	}

	private handle: cp.ChildProcess;
	private restartCounter: number;

	/**
	 * 设置根路径
	 * @param roots 观察请求
	 */
	private setRoots(basePath: string, ignored: string[]): Promise<void> {
		const args = [basePath];

		const exePath = paths.join(remote.app.getAppPath(), './out/egret/workbench/services/files/watcher/win32/CodeHelper.exe');
		this.handle = cp.spawn(exePath, args);

		const stdoutLineDecoder = new LineDecoder();
		// Events over stdout
		this.handle.stdout.on('data', (data: Buffer) => {
			// Collect raw events from output
			const rawEvents: IRawFileChange[] = [];
			stdoutLineDecoder.write(data).forEach((line) => {
				const eventParts = line.split('|');
				if (eventParts.length === 2) {
					const changeType = Number(eventParts[0]);
					const absolutePath = eventParts[1];

					// File Change Event (0 Changed, 1 Created, 2 Deleted)
					if (changeType >= 0 && changeType < 3) {

						// Support ignores
						if (ignored && ignored.some(ignore => {
							const curIgnore = paths.normalize(ignore);
							const curAbsolutePath = paths.normalize(absolutePath);
							if (curAbsolutePath.indexOf(curIgnore) == 0) {
								return true;
							}
							return false;
						})) {
							return;
						}

						// Otherwise record as event
						rawEvents.push({
							type: Watcher.changeTypeMap[changeType],
							path: absolutePath
						});
					}

					// 3 Logging
					else {
						console.log('%c[File Watcher]', 'color: darkgreen', eventParts[1]);
					}
				}
			});

			// Trigger processing of events through the delayer to batch them up properly
			if (rawEvents.length > 0) {
				rawEvents.forEach(event=>{
					console.log(event.type === FileChangeType.ADDED ? '[ADDED]' : event.type === FileChangeType.DELETED ? '[DELETED]' : '[CHANGED]', event.path);
				});
				const res = normalize(rawEvents);
				this.onFileChanges(toFileChangesEvent(res));
			}
		});
		// Errors
		this.handle.on('error', (error: Error) => this.onError(error));
		this.handle.stderr.on('data', (data: Buffer) => this.onError(data));

		// Exit
		this.handle.on('exit', (code: number, signal: string) => this.onExit(code, signal));

		return Promise.resolve(void 0);
	}

	private onError(error: Error | Buffer): void {
		console.error('[FileWatcher] process error: ' + error.toString());
	}


	private onExit(code: number, signal: string): void {
		if(this.watcherStoped){
			return;
		}
		if (this.handle) { // exit while not yet being disposed is unexpected!
			console.error(`[FileWatcher] terminated unexpectedly (code: ${code}, signal: ${signal})`);

			if (this.restartCounter <= 5) {
				console.error('[FileWatcher] is restarted again...');
				this.restartCounter++;
				this.setRoots(this.workspaceUri.fsPath, this.ignored); // restart
			} else {
				console.error('[FileWatcher] Watcher failed to start after retrying for some time, giving up. Please report this as a bug report!');
			}
		}
	}
}






/**
 * Convenient way to iterate over output line by line. This helper accommodates for the fact that
 * a buffer might not end with new lines all the way.
 *
 * To use:
 * - call the write method
 * - forEach() over the result to get the lines
 */
class LineDecoder {
	private stringDecoder: sd.NodeStringDecoder;
	private remaining: string;

	constructor(encoding: string = 'utf8') {
		this.stringDecoder = new sd.StringDecoder(encoding);
		this.remaining = null;
	}

	public write(buffer: Buffer): string[] {
		const result: string[] = [];
		const value = this.remaining
			? this.remaining + this.stringDecoder.write(buffer)
			: this.stringDecoder.write(buffer);

		if (value.length < 1) {
			return result;
		}
		let start = 0;
		let ch: number;
		let idx = start;
		while (idx < value.length) {
			ch = value.charCodeAt(idx);
			if (ch === 13 || ch === 10) {
				result.push(value.substring(start, idx));
				idx++;
				if (idx < value.length) {
					const lastChar = ch;
					ch = value.charCodeAt(idx);
					if ((lastChar === 13 && ch === 10) || (lastChar === 10 && ch === 13)) {
						idx++;
					}
				}
				start = idx;
			} else {
				idx++;
			}
		}
		this.remaining = start < value.length ? value.substr(start) : null;
		return result;
	}

	public end(): string {
		return this.remaining;
	}
}