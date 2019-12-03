import { EgretRuntimeDelegate } from '../../runtime/runtime';
import { Event } from 'egret/base/common/event';

/**
 * 资源适配器
 */
export interface IAssetsAdapter{
	/**
	 * 资源配置变化的事件
	 */
	readonly onConfigChanged:Event<IAssetsAdapter>;
	/**
	 * 确保已经加载完成
	 */
	ensureLoaded():Promise<void>;
	/**
	 * 设置运行时
	 * @param runtime 
	 */
	setRuntime(runtime: EgretRuntimeDelegate):void;
	/**
	 * 重新加载RES配置
	 */
	reload(): void;
}