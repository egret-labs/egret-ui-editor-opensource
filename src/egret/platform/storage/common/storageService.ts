import * as types from 'egret/base/common/types';
import * as strings from 'egret/base/common/strings';
import { IStorageService, StorageScope } from 'egret/platform/storage/common/storage';

/**
 * 本地存储
 */
export interface IStorage {
	//长度
	length: number;
	//获取key
	key(index: number);
	//设置
	setItem(key: string, value: string): void;
	//获得值
	getItem(key: string): string;
	//remove 值
	removeItem(key: string): void;
	//清除
	clear(scope?:string);
}

/**
 * 本地存储服务接口
 */
export class StorageService implements IStorageService {

	
	public _serviceBrand: undefined;


	/**
	 * 公共前缀
	 */
	public static readonly COMMON_PREFIX = 'storage://';

	/**
	 * 本地存储 全局前缀
	 */
	public static readonly GLOBAL_PREFIX = `${StorageService.COMMON_PREFIX}global/`;

	/**
	 * 本地存储 工作区前缀
	 */
	public static readonly WORKSPACE_PREFIX = `${StorageService.COMMON_PREFIX}workspace/`;

	/**
	 * 本地存储  工作区标示前缀
	 */
	public static readonly WORKSPACE_IDENTIFIER = 'workspaceidentifier';

	/**
	 * 本地存储 无工作空间前缀
	 */
	public static readonly NO_WORKSPACE_IDENTIFIER = '__$noWorkspace__';

	private _workspaceStorage: IStorage;
	private _globalStorage: IStorage;

	private workspaceKey: string;
	private _workspaceId: string;

	constructor(
		globalStorage: IStorage,
		workspaceStorage: IStorage,
		workspaceId?: string,
		legacyWorkspaceId?: number
	) {
		this._globalStorage = globalStorage;
		this._workspaceStorage = workspaceStorage || globalStorage;
		
		this.setWorkspaceId(workspaceId, legacyWorkspaceId);
	}

	/**
	 * 获取工作空间Id
	 */
	public get workspaceId(): string {
		return this._workspaceId;
	}

	/**
	 * 
	 * @param workspaceId 工作空间ID
	 * @param legacyWorkspaceId 
	 */
	public setWorkspaceId(workspaceId: string, legacyWorkspaceId?: number): void {
		this._workspaceId = workspaceId;
		this.workspaceKey = this.getWorkspaceKey(workspaceId);

		// TODO 不清楚功能
		if (types.isNumber(legacyWorkspaceId)) {
			this.cleanupWorkspaceScope(legacyWorkspaceId);
		}
	}

	/**
	 * 获取全局本地存储
	 */
	public get globalStorage(): IStorage {
		return this._globalStorage;
	}

	/**
	 * 获取工作空间 本地存储
	 */
	public get workspaceStorage(): IStorage {
		return this._workspaceStorage;
	}


	/**
	 * 移除
	 * @param scope 范围
	 */
	public clear(scope?: StorageScope): void {
		const storage = (scope === StorageScope.GLOBAL) ? this._globalStorage : this._workspaceStorage;

		storage.clear();
	}

	private getWorkspaceKey(id?: string): string {
		if (!id) {
			return StorageService.NO_WORKSPACE_IDENTIFIER;
		}

		// Special case file:// URIs: strip protocol from key to produce shorter key
		const fileProtocol = 'file:///';
		if (id.indexOf(fileProtocol) === 0) {
			id = id.substr(fileProtocol.length);
		}

		// Always end with "/"
		return `${strings.rtrim(id, '/')}/`;
	}

	private cleanupWorkspaceScope(workspaceUid: number): void {
		const id = this.get(StorageService.WORKSPACE_IDENTIFIER, StorageScope.WORKSPACE);


		if (types.isNumber(parseInt(id)) && workspaceUid !== parseInt(id)) {
			const keyPrefix = this.toStorageKey('', StorageScope.WORKSPACE);
			const toDelete: string[] = [];
			const length = this._workspaceStorage.length;

			for (let i = 0; i < length; i++) {
				const key = this._workspaceStorage.key(i);
				if (key.indexOf(StorageService.WORKSPACE_PREFIX) < 0) {
					continue; 
				}

				if (key.indexOf(keyPrefix) === 0) {
					toDelete.push(key);
				}
			}

			toDelete.forEach((keyToDelete) => {
				this._workspaceStorage.removeItem(keyToDelete);
			});
		}

		if (workspaceUid !== parseInt(id)) {
			this.store(StorageService.WORKSPACE_IDENTIFIER, workspaceUid, StorageScope.WORKSPACE);
		}
	}

	/**
	 * 
	 * 存储
	 * @param key key 
	 * @param value value
	 * @param scope 范围
	 */
	public store(key: string, value: any, scope = StorageScope.GLOBAL): void {
		const storage = (scope === StorageScope.GLOBAL) ? this._globalStorage : this._workspaceStorage;

		if (types.isUndefinedOrNull(value)) {
			this.remove(key, scope); 
			return;
		}

		const storageKey = this.toStorageKey(key, scope);

		// Store
		try {
			storage.setItem(storageKey, value);
		} catch (error) {
			
		}
	}

	/**
	 * 根据key获取本地存储的值
	 * @param key key
	 * @param scope 范围
	 * @param defaultValue 默认值
	 */
	public get(key: string, scope = StorageScope.GLOBAL, defaultValue?: any): string {
		const storage = (scope === StorageScope.GLOBAL) ? this._globalStorage : this._workspaceStorage;

		const value = storage.getItem(this.toStorageKey(key, scope));
		if (types.isUndefinedOrNull(value)) {
			return defaultValue;
		}

		return value;
	}


	/**
	 * 移除scope 内key 的存储
	 * @param key key
	 * @param scope 范围
	 */
	public remove(key: string, scope = StorageScope.GLOBAL): void {
		const storage = (scope === StorageScope.GLOBAL) ? this._globalStorage : this._workspaceStorage;
		const storageKey = this.toStorageKey(key, scope);

		// Remove
		storage.removeItem(storageKey);
	}

	private toStorageKey(key: string, scope: StorageScope): string {
		if (scope === StorageScope.GLOBAL) {
			return StorageService.GLOBAL_PREFIX + key.toLowerCase();
		}

		return StorageService.WORKSPACE_PREFIX + this.workspaceKey + key.toLowerCase();
	}
}