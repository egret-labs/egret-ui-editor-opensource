import { Event } from 'egret/base/common/event';

/**
 * 项目主题接口
 */
export interface ITheme{
	/**
	 * 主题配置变化的事件
	 */
	readonly onConfigChanged:Event<ITheme>;
	/**
	 * 重新加载
	 */
	reload():void;
	/**
	 * 根据主机组件实例获取默认主题的皮肤类名， 此方法不做递归处理。
	 */
	getDefaultSkin(className: string): string;
	/**
	 * 得到指定的皮肤配置，用于注册到编辑器的runtime里，给引擎回调用
	 * @param style 
	 */
	getStyleConfig(style:string):any;
}