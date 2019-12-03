import { IInstantiationService, createDecorator } from 'egret/platform/instantiation/common/instantiation';
import { IFileService, FileChangesEvent, IFileStat, FileChangeType } from '../../platform/files/common/files';
import { IWorkspaceService } from '../../platform/workspace/common/workspace';
import { EgretProjectModel } from './exml/common/project/egretProject';
import { AbstractExmlConfig, EUIExmlConfig, GUIExmlConfig } from './exml/common/project/exmlConfigs';
import { IExmlModelCreater } from './exml/common/factory/exmlCreater';
import { IExmlModel } from './exml/common/exml/models';
import { ITheme } from './exml/common/theme/themes';
import { ThemeEUI } from './exml/common/theme/ThemeEui';
import { IAssetsAdapter } from './exml/common/assets/adapters';
import { AssetAdapterEUI } from './exml/common/assets/AssetAdapterEUI';
import { ExmlModelCreaterEui } from './exml/common/factory/exmlCreaterEui';
import { EgretChecker } from './egretChecker';
import { ensureLogin } from 'egret/platform/launcher/launcher';
import { IWorkbenchEditorService } from 'egret/workbench/services/editor/common/ediors';
import { Emitter, Event } from 'egret/base/common/event';

/**
 * 初始化项目
 * @param instantiationService 
 */
export function initProject(instantiationService: IInstantiationService): void {
	//将Egret项目作为服务加入到实例化服务中
	const projectServiceImpl = instantiationService.createInstance(EgretProjectService);
	instantiationService.addService(IEgretProjectService, projectServiceImpl);
	projectServiceImpl.ensureLoaded();
}


export const IEgretProjectService = createDecorator<IEgretProjectService>('egretProjectService');
/**
 * Egret项目服务
 */
export interface IEgretProjectService {
	_serviceBrand: any;
	/**
	 * 得到项目数据层
	 */
	readonly projectModel: EgretProjectModel;
	/**
	 * 项目Exml配置,根据项目类型，为EUIExmlConfig或者GUIExmlConfig
	 */
	readonly exmlConfig: AbstractExmlConfig;
	/**
	 * 主题配置
	 */
	readonly theme: ITheme;

	/**
	 * 资源配置文件改变
	 */
	onResConfigChanged: Event<void>;
	/**
	 * 项目配置文件改变
	 */
	onProjectConfigChanged:Event<void>;

	/**
	 * 确保已经刷新过了
	 */
	ensureLoaded(): Promise<void>;
	/**
	 * 创建一个资源适配器
	 */
	createAssetsAdapter(): IAssetsAdapter;
	/**
	 * 创建一个Exml数据模块
	 * @param exmlString exml的字符串
	 */
	createExmlModel(exmlString?: string): Promise<IExmlModel>;
	/**
	 * 创建一个Exml数据模块子项
	 * @param exmlString exml的字符串
	 * @param parentModel 父级数据模块
	 */
	createSubExmlModel(exmlString: string, parentModel: IExmlModel): IExmlModel;
}

/**
 * Egret项目模块服务实现
 */
class EgretProjectService implements IEgretProjectService {
	_serviceBrand: any;

	//TODO 这个项目管理里还差一个资源RES模块，原本是写在EUIExmlService里的。
	private _projectModel: EgretProjectModel;
	private _exmlConfig: AbstractExmlConfig;
	private _exmlModelCreater: IExmlModelCreater;
	private projectChecker: EgretChecker;
	private _theme: ITheme;

	private _onResConfigChanged: Emitter<void>;
	private _onProjectConfigChanged:Emitter<void>;

	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IWorkspaceService private workspaceService: IWorkspaceService,
		@IFileService private fileService: IFileService,
		@IWorkbenchEditorService private workbenchEditorService: IWorkbenchEditorService
	) {
		console.log('Egret Project Service Initializing...');
		this._onResConfigChanged = new Emitter<void>();
		this._onProjectConfigChanged = new Emitter<void>();
		this.projectChecker = this.instantiationService.createInstance(EgretChecker);
		this.initListener();
	}
	/**
	 * 资源配置文件改变
	 */
	public get onResConfigChanged(): Event<void> {
		return this._onResConfigChanged.event;
	}
	/**
	 * 项目配置文件改变
	 */
	public get onProjectConfigChanged():Event<void>{
		return this._onProjectConfigChanged.event;
	}

	/**
	 * 初始化事件监听
	 */
	private initListener(): void {
		this.fileService.onFileChanges(e => this.fileChanges_handler(e));
	}
	private fileChanges_handler(e: FileChangesEvent): void {
		if (!this.projectModel) {
			return;
		}
		let refreshProj: boolean = false;
		let refreshTheme: boolean = false;
		let refreshAssets: boolean = false;
		//TODO Need refresh res
		for (let i = 0; i < e.changes.length; i++) {
			if (this.projectModel.needRefreshProject(e.changes[i].resource.fsPath)) {
				refreshProj = true;
				break;
			}
			if (this.projectModel.needRefreshTheme(e.changes[i].resource.fsPath)) {
				refreshTheme = true;
				break;
			}
			if (this.projectModel.needRefreshAssets(e.changes[i].resource.fsPath)) {
				refreshAssets = true;
				break;
			}
		}
		if (refreshProj) {
			this.initProject().then(() => {
				const editors = this.workbenchEditorService.getOpenEditors();
				editors.forEach(editor => {
					if ('refreshInput' in editor) {
						(editor as any)['refreshInput']();
					}
				});
			});
			this._onProjectConfigChanged.fire();
		} else if (refreshTheme) {
			if (this._theme) {
				this._theme.reload();
			}
			var editors = this.workbenchEditorService.getOpenEditors();
			editors.forEach(editor => {
				if ('refreshExml' in editor) {
					(editor as any)['refreshExml']();
				}
			});
		} else if (refreshAssets) {
			var editors = this.workbenchEditorService.getOpenEditors();
			editors.forEach(editor => {
				if ('refreshExml' in editor) {
					(editor as any)['refreshExml']();
				}
			});
			this._onResConfigChanged.fire();
		}
	}
	/**
	 * 创建一个资源适配器
	 */
	public createAssetsAdapter(): IAssetsAdapter {
		if (this._projectModel) {
			if (this._projectModel.UILibrary === 'eui') {
				return this.instantiationService.createInstance(AssetAdapterEUI, this.projectModel);
			}
		}
		return null;
	}


	private loaded: boolean = false;
	private loadPromise: Promise<void> = null;
	/**
	 * 确保已经刷新过了
	 */
	public ensureLoaded(): Promise<void> {
		if (this.loaded) {
			return Promise.resolve(void 0);
		} else if (this.loadPromise) {
			return this.loadPromise;
		} else {
			this.loadPromise = this.initProject().then(() => {
				this.loadPromise = null;
				this.loaded = true;
			});
			return this.loadPromise;
		}
	}



	/**
	 * 检查项目是否正常
	 */
	private checkProject(project: EgretProjectModel): Promise<boolean> {
		return ensureLogin().then(result => {
			if (!result) {
				return false;
			}
			return this.projectChecker.checkProject(project);
		});
	}

	/**
	 * 初始化项目数据模块
	 */
	private initProject(): Promise<void> {
		this._projectModel = null;
		this._exmlConfig = null;
		this._theme = null;
		this._exmlModelCreater = null;
		if (!this.workspaceService.getWorkspace()) {
			return Promise.resolve(void 0);
		}
		this._projectModel = this.instantiationService.createInstance(EgretProjectModel, this.workspaceService.getWorkspace().uri);
		return this.checkProject(this._projectModel).then(result => {
			if (result) {
				if (this._projectModel.UILibrary === 'eui') {
					this._exmlModelCreater = this.instantiationService.createInstance(ExmlModelCreaterEui);
					this._exmlConfig = this.instantiationService.createInstance(EUIExmlConfig);
					this._theme = this.instantiationService.createInstance(ThemeEUI, this.projectModel);
				} else if (this._projectModel.UILibrary === 'gui') {
					this._exmlModelCreater = null;// 不支持GUI的可视化编辑
					this._exmlConfig = this.instantiationService.createInstance(GUIExmlConfig);
					this._theme = null;
				}
				if (this._theme) {
					//TODO 在theme文件改变之后，应该重新调用theme的reload方法，让他重新派发事件。
					this._theme.reload();
				}
				if (this._exmlConfig) {
					this._exmlConfig.init(this.projectModel);
				}
			}
		});
	}
	/**
	 * 得到项目数据层
	 */
	public get projectModel(): EgretProjectModel {
		return this._projectModel;
	}
	/**
	 * 项目Exml配置,根据项目类型，为EUIExmlConfig或者GUIExmlConfig
	 */
	public get exmlConfig(): AbstractExmlConfig {
		return this._exmlConfig;
	}
	/**
	 * 主题配置
	 */
	public get theme(): ITheme {
		return this._theme;
	}

	/**
	 * 创建一个Exml数据模块
	 * @param exmlString exml的字符串
	 */
	public createExmlModel(exmlString?: string): Promise<IExmlModel> {
		return this.ensureLoaded().then(() => {
			if (this._exmlModelCreater) {
				return this._exmlModelCreater.createExmlModel(exmlString);
			}
			return null;
		});
	}
	/**
	 * 创建一个Exml数据模块子项
	 * @param exmlString exml的字符串
	 * @param parentModel 父级数据模块
	 */
	public createSubExmlModel(exmlString: string, parentModel: IExmlModel): IExmlModel {
		if (this._exmlModelCreater) {
			return this._exmlModelCreater.createSubExmlModel(exmlString, parentModel);
		}
		return null;
	}
}