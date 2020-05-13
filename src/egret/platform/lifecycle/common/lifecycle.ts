import { createDecorator } from '../../instantiation/common/instantiation';
import { Event } from 'egret/base/common/event';


/**
 * 窗体的关闭事件,可以拒绝
 */
export interface ShutdownEvent {
	/**
	 * 是否拒绝本次关闭请求
	 */
	veto(value: boolean | Promise<boolean>): void;
	/**
	 * 是否是由于重新加载而拒绝的
	 */
	reload: boolean;
}



export const ILifecycleService = createDecorator<ILifecycleService>('lifecycleService');
/**
 * 生命周期管理服务
 */
export interface ILifecycleService {
	_serviceBrand: undefined;
	/**
	 * 窗体即将关闭事件，可以被阻止
	 */
	readonly onWillShutdown: Event<ShutdownEvent>;
	/**
	 * 关闭事件
	 */
	readonly onShutdown: Event<boolean>;
}


/**
 * 生命周期服务中，拒绝主进程与渲染进程关闭的handle
 * @param vetos 
 */
export function handleVetos(vetos: (boolean | Promise<boolean>)[]): Promise<boolean> {
	if (vetos.length === 0) {
		return Promise.resolve(false);
	}

	const promises: Promise<void>[] = [];
	let lazyValue = false;

	for (const valueOrPromise of vetos) {
		if (valueOrPromise === true) {
			return Promise.resolve(true);
		}
		if (valueOrPromise instanceof Promise) {
			promises.push(valueOrPromise.then(value => {
				if (value) {
					lazyValue = true;
				}
			}, error => {
				console.log(error);
				lazyValue = true;
			}));
		}
	}
	return Promise.all(promises).then(() => lazyValue);
}