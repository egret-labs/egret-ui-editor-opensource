import { IInstantiationService, createDecorator } from 'egret/platform/instantiation/common/instantiation';
import { ServiceCollection } from 'egret/platform/instantiation/common/serviceCollection';

export function initResEventService(instantiationService: IInstantiationService): IInstantiationService {
	const services = new ServiceCollection();

	const resEventService = instantiationService.createInstance(ResEventService);
	services.set(IResEventService, resEventService);

	return instantiationService.createChild(services);
}

export const IResEventService = createDecorator<IResEventService>('resEventService');

export interface IResEventService {
	_serviceBrand: undefined;
	addListen(type: string, listener: Function, thisObject?: any);
	removeListen(type: string, listener: Function, thisObject?: any);
	sendEvent(type: string, data?: any);
}

/**
 * 全局事件监听器
 */
class ResEventService implements IResEventService {
	_serviceBrand: undefined;
	/** events-listeners map*/
	private maps_listener: any = {};
	/** events-thisobj map */
	private maps_this: any = {};
	/**
	 *
	 */
	constructor() {

	}
	/**
	 * 添加全局事件
	 */
	public addListen(type: string, listener: Function, thisObject?: any) {
		let listenPool: Array<Function> = this.maps_listener[type];
		let thisPool: Array<any> = this.maps_this[type];
		if (!listenPool) {
			listenPool = new Array<Function>();
			this.maps_listener[type] = listenPool;

			thisPool = new Array<any>();
			this.maps_this[type] = thisPool;
		}
		listenPool.push(listener);
		thisPool.push(thisObject);
	}
	/**
	 * 移除全局事件监听
	 */
	public removeListen(type: string, listener: Function, thisObject?: any) {
		let listenPool: Array<Function> = this.maps_listener[type];
		let thisPool: Array<any> = this.maps_this[type];
		if (listenPool) {
			var listenerIndex: number = listenPool.indexOf(listener);
			listenPool.splice(listenerIndex, 1);
			thisPool.splice(listenerIndex, 1);
		}
	}
	/**
	 * 发送事件
	 */
	public sendEvent(type: string, data?: any) {
		let listenPool: Array<Function> = this.maps_listener[type];
		let thisPool: Array<any> = this.maps_this[type];
		if (listenPool) {
			for (var i: number = 0; i < listenPool.length; i++) {
				var listener: Function = listenPool[i];
				var thisObject: any = thisPool[i];
				if (listener) {
					listener.call(thisObject, data);
				}
			}
		}
	}

}