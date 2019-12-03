import { FileChangeType, isParent, FileChangesEvent } from 'egret/platform/files/common/files';
import URI from 'egret/base/common/uri';

/**
 * 文件改变
 */
export interface IRawFileChange {
	/**
	 * 文件改变类型
	 */
	type: FileChangeType;
	/**
	 * 文件路径
	 */
	path: string;
}

/**
 * 将文件改变数据转换为文件改变事件
 * @param changes 
 */
export function toFileChangesEvent(changes: IRawFileChange[]): FileChangesEvent {
	// map to file changes event that talks about URIs
	return new FileChangesEvent(changes.map((c) => {
		return {
			type: c.type,
			resource: URI.file(c.path)
		};
	}));
}

/**
 * 标准化文件改变事件列表
 * @param changes 
 */
export function normalize(changes: IRawFileChange[]): IRawFileChange[] {
	const normalizer = new EventNormalizer();
	for (let i = 0; i < changes.length; i++) {
		const event = changes[i];
		normalizer.processEvent(event);
	}

	return normalizer.normalize();
}

class EventNormalizer {
	private normalized: IRawFileChange[];
	private mapPathToChange: { [path: string]: IRawFileChange };

	constructor() {
		this.normalized = [];
		this.mapPathToChange = Object.create(null);
	}

	public processEvent(event: IRawFileChange): void {

		// Event path already exists
		const existingEvent = this.mapPathToChange[event.path];
		if (existingEvent) {
			const currentChangeType = existingEvent.type;
			const newChangeType = event.type;

			// ignore CREATE followed by DELETE in one go
			if (currentChangeType === FileChangeType.ADDED && newChangeType === FileChangeType.DELETED) {
				delete this.mapPathToChange[event.path];
				this.normalized.splice(this.normalized.indexOf(existingEvent), 1);
			}

			// flatten DELETE followed by CREATE into CHANGE
			else if (currentChangeType === FileChangeType.DELETED && newChangeType === FileChangeType.ADDED) {
				existingEvent.type = FileChangeType.UPDATED;
			}

			// Do nothing. Keep the created event
			else if (currentChangeType === FileChangeType.ADDED && newChangeType === FileChangeType.UPDATED) {
			}

			// Otherwise apply change type
			else {
				existingEvent.type = newChangeType;
			}
		}

		// Otherwise Store
		else {
			this.normalized.push(event);
			this.mapPathToChange[event.path] = event;
		}
	}

	public normalize(): IRawFileChange[] {
		const addedChangeEvents: IRawFileChange[] = [];
		const deletedPaths: string[] = [];

		// This algorithm will remove all DELETE events up to the root folder
		// that got deleted if any. This ensures that we are not producing
		// DELETE events for each file inside a folder that gets deleted.
		//
		// 1.) split ADD/CHANGE and DELETED events
		// 2.) sort short deleted paths to the top
		// 3.) for each DELETE, check if there is a deleted parent and ignore the event in that case
		return this.normalized.filter(e => {
			if (e.type !== FileChangeType.DELETED) {
				addedChangeEvents.push(e);
				return false; // remove ADD / CHANGE
			}

			return true; // keep DELETE
		}).sort((e1, e2) => {
			return e1.path.length - e2.path.length; // shortest path first
		}).filter(e => {
			if (deletedPaths.some(d => isParent(e.path, d))) {
				return false; // DELETE is ignored if parent is deleted already
			}

			// otherwise mark as deleted
			deletedPaths.push(e.path);

			return true;
		}).concat(addedChangeEvents);
	}
}

/**
 * 文件观察器
 */
export interface IWatcher{
	/** 启动watcher服务 */
	startup(): () => void;
	/** 停止观察 */
	stopWatch(): void ;
}