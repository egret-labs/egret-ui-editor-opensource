import { IStateService } from '../common/state';

import * as paths from 'path';
import * as fs from 'original-fs';
import { isMacintosh, isWindows } from '../../../base/common/platform';

/**
 * 文件状态存储
 */
export class FileStorage {

	private database: object = null;

	constructor(private dbPath: string, private onError: (error) => void) { }

	private ensureLoaded(): void {
		if (!this.database) {
			this.database = this.loadSync();
		}
	}
	/**
	 * 得到存储内容
	 * @param key 
	 * @param defaultValue 
	 */
	public getItem<T>(key: string, defaultValue?: T): T {
		this.ensureLoaded();
		const res = this.database[key];
		if (!res) {
			return defaultValue;
		}
		return res;
	}
	/**
	 * 设置存储内容
	 * @param key 
	 * @param data 
	 */
	public setItem(key: string, data: any): void {
		this.ensureLoaded();

		// Remove an item when it is undefined or null
		if (!data) {
			return this.removeItem(key);
		}
		// Shortcut for primitives that did not change
		if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
			if (this.database[key] === data) {
				return;
			}
		}
		this.database[key] = data;
		this.saveSync();
	}

	/**
	 * 移除存储内容
	 * @param key 
	 */
	public removeItem(key: string): void {
		this.ensureLoaded();

		// Only update if the key is actually present (not undefined)
		if (!this.database[key]) {
			this.database[key] = void 0;
			this.saveSync();
		}
	}

	private loadSync(): object {
		try {
			return JSON.parse(fs.readFileSync(this.dbPath).toString()); // invalid JSON or permission issue can happen here
		} catch (error) {
			if (error && error.code !== 'ENOENT') {
				this.onError(error);
			}

			return {};
		}
	}

	private saveSync(): void {
		try {
			mkdirsSync(paths.dirname(this.dbPath));
			fs.writeFileSync(this.dbPath, JSON.stringify(this.database, null, 4));
		} catch (error) {
			this.onError(error);
		}
	}
}

/**
 * 本次存储服务
 */
export class StateService implements IStateService {

	_serviceBrand: undefined;

	private fileStorage: FileStorage;

	constructor() {
		this.fileStorage = new FileStorage(paths.join(storageDir(), 'storage.json'), error => {
			console.error(error);
		});
	}
	/**
	 * 得到存储内容
	 * @param key 
	 * @param defaultValue 
	 */
	public getItem<T>(key: string, defaultValue?: T): T {
		return this.fileStorage.getItem(key, defaultValue);
	}
	/**
	 * 设置存储内容
	 * @param key 
	 * @param data 
	 */
	public setItem(key: string, data: any): void {
		this.fileStorage.setItem(key, data);
	}
	/**
	 * 移除存储内容
	 * @param key 
	 */
	public removeItem(key: string): void {
		this.fileStorage.removeItem(key);
	}
}

/**
 * 递归创建目录
 * @param dirname 
 * @param mode 
 */
function mkdirsSync(dirname: string, mode?: number): boolean {
	if (fs.existsSync(dirname)) {
		return true;
	} else {
		if (mkdirsSync(paths.dirname(dirname), mode)) {
			fs.mkdirSync(dirname, mode);
			return true;
		}
	}
}

/**
 * home路径
 */
function homeDir() {
	let baseDir: string = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
	baseDir = baseDir.replace(/\\/g, '/');
	if (baseDir.length > 0) {
		if (baseDir.charAt(baseDir.length - 1) != '/') {
			baseDir += '/';
		}
	}
	return baseDir;
}

/**
 * 可以存储插件信息的路径
 */
function storageDir(): string {
	let localPath: string = '';
	if (isMacintosh) {
		localPath = paths.join(homeDir(), './Library/Application Support/' + 'com.egret.wing' + '/');
	} else if (isWindows) {
		localPath = paths.join(process.env.APPDATA, './' + 'com.egret.wing' + '/');
	}
	localPath = localPath.replace(/\\/g, '/');
	if (localPath.length > 0) {
		if (localPath.charAt(localPath.length - 1) != '/') {
			localPath += '/';
		}
	}
	return localPath;
}