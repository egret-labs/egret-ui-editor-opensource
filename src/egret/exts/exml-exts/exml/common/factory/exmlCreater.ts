import { IExmlModel } from '../exml/models';

/**
 * Exml创建者
 */
export interface IExmlModelCreater {
	/**
	 * 创建一个Exml数据模块
	 * @param exmlString exml的字符串
	 */
	createExmlModel(exmlString?: string): IExmlModel;
	/**
	 * 创建一个Exml数据模块子项
	 * @param exmlString exml的字符串
	 * @param parentModel 父级数据模块
	 */
	createSubExmlModel(exmlString: string, parentModel: IExmlModel): IExmlModel;
}