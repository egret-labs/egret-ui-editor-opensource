import { IAssetsAdapter } from './adapters';
import { EgretProjectModel, IResourceConfigItem } from '../project/egretProject';
import { Event, Emitter } from 'egret/base/common/event';
import { EgretRuntimeDelegate } from '../../runtime/runtime';
import { INotificationService } from 'egret/platform/notification/common/notifications';
import { localize } from 'egret/base/localization/nls';


/**
 * 资源适配器
 */
export class AssetAdapterEUI implements IAssetsAdapter {

	private _onConfigChanged: Emitter<IAssetsAdapter>;
	constructor(
		private project: EgretProjectModel,
		@INotificationService private notificationService:INotificationService
	) {
		this._onConfigChanged = new Emitter<IAssetsAdapter>();
	}

	/**
	 * 资源配置变化的事件
	 */
	public get onConfigChanged(): Event<IAssetsAdapter> {
		return this._onConfigChanged.event;
	}

	private _runtime: EgretRuntimeDelegate;
	/**
	 * 设置运行时
	 * @param runtime 
	 */
	public setRuntime(runtime: EgretRuntimeDelegate): void {
		this._runtime = runtime;
		this.reload();
	}

	private loadSuccess: boolean = false;
	private loadError: any = null;

	private loading: boolean = false;
	/**
	 * 重新加载RES配置
	 */
	public reload(): void {
		if (!this._runtime) {
			this.notificationService.error({content:localize('assetAdapterEUI.reload.preConfig','You need to set the runtime before loading the resource configuration file.'),duration:3});
			return;
		}
		this.loadSuccess = false;
		this.loadError = null;
		if (this.loading) {
			return;
		}
		this.loading = true;
		this.doReload().then(() => {
			if (this.ensureLoadedPromiseResolve) {
				this.ensureLoadedPromiseResolve(void 0);
			}
			this.ensureLoadedPromise = null;
			this.ensureLoadedPromiseResolve = null;
			this.ensureLoadedPromiseReject = null;
			this.loading = false;
			this.loadSuccess = true;
		}, error => {
			if (this.ensureLoadedPromiseReject) {
				this.ensureLoadedPromiseReject(error);
			}
			this.ensureLoadedPromise = null;
			this.ensureLoadedPromiseResolve = null;
			this.ensureLoadedPromiseReject = null;
			this.loading = false;
			this.loadError = error;
		});
	}


	private doReload(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this._runtime.getRuntime().then(runtime => {
				if (runtime.RES) {
					const resConfigs: IResourceConfigItem[] = this.project.resConfigs;
					if (resConfigs.length === 0) {
						runtime.RES.dispose();//TODO 应该在某一个地方统一教研一下这个RES是否有dispose方法
						this._onConfigChanged.fire(this);
						resolve(void 0);
					} else {
						var configComplete = (event) => {
							runtime.RES.removeEventListener(runtime.RES.ResourceEvent.CONFIG_COMPLETE, configComplete);
							runtime.RES.removeEventListener(runtime.RES.ResourceEvent.CONFIG_LOAD_ERROR, configError);
							this._onConfigChanged.fire(this);
							resolve(void 0);
							runtime.RES.cleanAsync();//TODO 应该在某一个地方统一教研一下这个RES是否有dispose方法
						};
						var configError = (event) => {
							runtime.RES.removeEventListener(runtime.RES.ResourceEvent.CONFIG_COMPLETE, configComplete);
							runtime.RES.removeEventListener(runtime.RES.ResourceEvent.CONFIG_LOAD_ERROR, configError);
							runtime.RES.cleanAsync();//TODO 应该在某一个地方统一教研一下这个RES是否有dispose方法
							runtime.RES.dispose();//TODO 应该在某一个地方统一教研一下这个RES是否有dispose方法
							this.notificationService.error({content:localize('assetAdapterEUI.doReload.loadError','Resource configuration file loading error'),duration:3});
							reject(localize('assetAdapterEUI.doReload.loadError','Resource configuration file loading error'));
						};
						runtime.RES.addEventListener(runtime.RES.ResourceEvent.CONFIG_COMPLETE, configComplete);
						runtime.RES.addEventListener(runtime.RES.ResourceEvent.CONFIG_LOAD_ERROR, configError);
						runtime.RES.dispose();//TODO 应该在某一个地方统一教研一下这个RES是否有dispose方法
						for (let i = 0; i < resConfigs.length; i++) {
							const configPath: string = resConfigs[i].url;
							const folderPath: string = resConfigs[i].folder;
							runtime.RES.loadConfig(configPath, folderPath);
						}
					}
				} else {
					this.notificationService.error({content:localize('assetAdapterEUI.doReload.loadResError','The RES module could not be found in editor runtime'),duration:3});
					reject(localize('assetAdapterEUI.doReload.loadResError','The RES module could not be found in editor runtime'));
				}
			}, error => {
				this.notificationService.error({content:localize('assetAdapterEUI.doReload.runtimeError','Runtime Error!'),duration:3});
				reject(localize('assetAdapterEUI.doReload.runtimeError','Runtime Error!'));
			});
		});
	}

	private ensureLoadedPromise: Promise<void> = null;
	private ensureLoadedPromiseResolve: (value?: void | PromiseLike<void>) => void = null;
	private ensureLoadedPromiseReject: (reason?: any) => void = null;
	/**
	 * 确保已经加载完成
	 */
	public ensureLoaded(): Promise<void> {
		if (this.loadSuccess) {
			return Promise.resolve(void 0);
		} else if (this.loadError) {
			return Promise.reject(this.loadError);
		} else {
			if (!this.ensureLoadedPromise) {
				this.ensureLoadedPromise = new Promise<void>((resolve, reject) => {
					this.ensureLoadedPromiseResolve = resolve;
					this.ensureLoadedPromiseReject = reject;
				});
			}
			this.reload();
			return this.ensureLoadedPromise;
		}
	}

}