import { createDecorator } from 'egret/platform/instantiation/common/instantiation';
import { EgretProjectModel } from './exml/common/project/egretProject';
import { AbstractExmlConfig } from './exml/common/project/exmlConfigs';
import { IExmlModel } from './exml/common/exml/models';
import { ITheme } from './exml/common/theme/themes';
import { IAssetsAdapter } from './exml/common/assets/adapters';
import { Event } from 'egret/base/common/event';

export const IEgretProjectService = createDecorator<IEgretProjectService>('egretProjectService');
/**
 * Egret项目服务
 */
export interface IEgretProjectService {
	_serviceBrand: undefined;
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
	onProjectConfigChanged: Event<void>;
	/**
	 * tsconfit.json改变
	 */
	onTsConfigChanged: Event<void>;

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