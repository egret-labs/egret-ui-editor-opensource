import { IExmlModelCreater } from './exmlCreater';
import { IExmlModel } from '../exml/models';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';

/**
 * EUI的数据模块创建者
 */
export class ExmlModelCreaterEui implements IExmlModelCreater {

	/**
	 * 数据模块
	 */
	public static ExmlModel = null;
	/**
	 * 数据模块
	 */
	public static SubExmlModel = null;

	constructor(@IInstantiationService private instantiationService: IInstantiationService){
	}


	/**
	 * 创建一个Exml数据模块
	 * @param exmlString exml的字符串
	 */
	public createExmlModel(exmlString?: string): IExmlModel {
		return this.instantiationService.createInstance(ExmlModelCreaterEui.ExmlModel,exmlString);
	}
	/**
	 * 创建一个Exml数据模块子项
	 * @param exmlString exml的字符串
	 * @param parentModel 父级数据模块
	 */
	public createSubExmlModel(exmlString: string, parentModel: IExmlModel): IExmlModel {
		const subModel = this.instantiationService.createInstance(ExmlModelCreaterEui.SubExmlModel,exmlString);
		subModel['setParent'](parentModel);
		return subModel as IExmlModel;
	}
}