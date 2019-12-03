/**
 * 全局事件监听器
 */
export class ResGlobalEventManager {
	/**
	 * 缓存监听
	 */
	private static maps_listener: any = {};
	/**
	 * 事件对象
	 */
	private static maps_this: any = {};

	public constructor() {

	}
	/**
	 * 添加全局事件
	 */
	public static addListen(type: string, listener: Function, thisObject?: any) {
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
	public static removeListen(type: string, listener: Function, thisObject?: any) {
		const listenPool: Array<Function> = this.maps_listener[type];
		const thisPool: Array<any> = this.maps_this[type];
		if (listenPool) {
			const listenerIndex: number = listenPool.indexOf(listener);
			listenPool.splice(listenerIndex, 1);
			thisPool.splice(listenerIndex, 1);
		}
	}

	/**
	 * 
	 * @param type 删除事件
	 */
	public static removeAllListener(type: string): void {
		const listenPool: Array<Function> = this.maps_listener[type];
		if (listenPool) {
			this.maps_listener[type] = null;
			this.maps_this[type] = null;
		}
	}
	/**
	 * 发送事件
	 */
	public static sendEvent(type: string, data?: any) {
		const listenPool: Array<Function> = this.maps_listener[type];
		const thisPool: Array<any> = this.maps_this[type];
		if (listenPool) {
			for (let i: number = 0; i < listenPool.length; i++) {
				const listener: Function = listenPool[i];
				const thisObject: any = thisPool[i];
				if (listener) {
					listener.call(thisObject, data);
				}
			}
		}
	}

}