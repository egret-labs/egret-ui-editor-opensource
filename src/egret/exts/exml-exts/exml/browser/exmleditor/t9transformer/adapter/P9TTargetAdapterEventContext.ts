import {P9TTargetAdapterEvent} from './events/P9TTargetAdapterEvent';
import {EventDispatcher} from '../../EventDispatcher';
/**
 * 多点变换器目标代理事件总线对象
 * </p>此类除了用于多个代理时实现内部同步变换外，外界也可以通过设置注册事件来监听变换的相关事件
 */
export class P9TTargetAdapterEventContext extends EventDispatcher {
	constructor() {
		super();
	}
	private static instance: P9TTargetAdapterEventContext = new P9TTargetAdapterEventContext();
	public static addEventListener(type: string, listener: Function, thisObj: any,level:number=0): void {
		this.instance.addEventListener(type, listener, thisObj,level);
	}
	public static removeEventListener(type: string, listener: Function, thisObj: any): void {
		this.instance.removeEventListener(type, listener, thisObj);
	}
	public static dispatchEvent(e: P9TTargetAdapterEvent): void {
		this.instance.dispatchEvent(e);
	}
}