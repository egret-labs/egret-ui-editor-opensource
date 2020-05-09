'use strict';

import { ServiceCollection } from './serviceCollection';
import * as descriptors from './descriptors';
import { Component, ComponentState } from 'react';
import { InstantiationProps } from '../../react/common/component';

/**
 * 内部工具
 */
export namespace _util {
	export const serviceIds = new Map<string, ServiceIdentifier<any>>();
	export const DI_TARGET = '$di$target';
	export const DI_DEPENDENCIES = '$di$dependencies';

	/**
	 * 得到构造函数依赖的服务
	 * @param ctor 构造函数
	 */
	export function getServiceDependencies(ctor: any): { id: ServiceIdentifier<any>, index: number, optional: boolean }[] {
		return ctor[DI_DEPENDENCIES] || [];
	}
}

export type BrandedService = { _serviceBrand: undefined };
/**
 * 0个参数构造函数接口
 * @tslint false
 */
export interface IConstructorSignature0<T> {
	new(...services: BrandedService[]): T;
}
/**
 * 1个参数构造函数接口
 * @tslint false
 */
export interface IConstructorSignature1<A1, T> {
	new <Services extends BrandedService[]>(first: A1, ...services: Services): T;
}
/**
 * 2个参数构造函数接口
 * @tslint false
 */
export interface IConstructorSignature2<A1, A2, T> {
	new(first: A1, second: A2, ...services: BrandedService[]): T;
}
/**
 * 3个参数构造函数接口
 * @tslint false
 */
export interface IConstructorSignature3<A1, A2, A3, T> {
	new(first: A1, second: A2, third: A3, ...services: BrandedService[]): T;
}
/**
 * 4个参数构造函数接口
 * @tslint false
 */
export interface IConstructorSignature4<A1, A2, A3, A4, T> {
	new(first: A1, second: A2, third: A3, fourth: A4, ...services: BrandedService[]): T;
}
/**
 * 5个参数构造函数接口
 * @tslint false
 */
export interface IConstructorSignature5<A1, A2, A3, A4, A5, T> {
	new(first: A1, second: A2, third: A3, fourth: A4, fifth: A5, ...services: BrandedService[]): T;
}
/**
 * 6个参数构造函数接口
 * @tslint false
 */
export interface IConstructorSignature6<A1, A2, A3, A4, A5, A6, T> {
	new(first: A1, second: A2, third: A3, fourth: A4, fifth: A5, sixth: A6, ...services: BrandedService[]): T;
}
/**
 * 7个参数构造函数接口
 * @tslint false
 */
export interface IConstructorSignature7<A1, A2, A3, A4, A5, A6, A7, T> {
	new(first: A1, second: A2, third: A3, fourth: A4, fifth: A5, sixth: A6, seventh: A7, ...services: BrandedService[]): T;
}
/**
 * 8个参数构造函数接口
 * @tslint false
 */
export interface IConstructorSignature8<A1, A2, A3, A4, A5, A6, A7, A8, T> {
	new(first: A1, second: A2, third: A3, fourth: A4, fifth: A5, sixth: A6, seventh: A7, eigth: A8, ...services: BrandedService[]): T;
}
/**
 * 服务访问器
 * @tslint false
 */
export interface ServicesAccessor {
	get<T>(id: ServiceIdentifier<T>): T;
	get<T>(id: ServiceIdentifier<T>, isOptional: typeof optional): T | undefined;
}

export const IInstantiationService = createDecorator<IInstantiationService>('instantiationService');

/**
 * Given a list of arguments as a tuple, attempt to extract the leading, non-service arguments
 * to their own tuple.
 */
type GetLeadingNonServiceArgs<Args> =
	Args extends [...BrandedService[]] ? []
	: Args extends [infer A1, ...BrandedService[]] ? [A1]
	: Args extends [infer A1, infer A2, ...BrandedService[]] ? [A1, A2]
	: Args extends [infer A1, infer A2, infer A3, ...BrandedService[]] ? [A1, A2, A3]
	: Args extends [infer A1, infer A2, infer A3, infer A4, ...BrandedService[]] ? [A1, A2, A3, A4]
	: Args extends [infer A1, infer A2, infer A3, infer A4, infer A5, ...BrandedService[]] ? [A1, A2, A3, A4, A5]
	: Args extends [infer A1, infer A2, infer A3, infer A4, infer A5, infer A6, ...BrandedService[]] ? [A1, A2, A3, A4, A5, A6]
	: Args extends [infer A1, infer A2, infer A3, infer A4, infer A5, infer A6, infer A7, ...BrandedService[]] ? [A1, A2, A3, A4, A5, A6, A7]
	: Args extends [infer A1, infer A2, infer A3, infer A4, infer A5, infer A6, infer A7, infer A8, ...BrandedService[]] ? [A1, A2, A3, A4, A5, A6, A7, A8]
	: never;

/**
 * 实例化服务
 */
export interface IInstantiationService {

	_serviceBrand: undefined;

	/**
	 * 创建实例
	 */
	createInstance<T>(descriptor: descriptors.SyncDescriptor0<T>): T;
	createInstance<A1, T>(descriptor: descriptors.SyncDescriptor1<A1, T>, a1: A1): T;
	createInstance<A1, A2, T>(descriptor: descriptors.SyncDescriptor2<A1, A2, T>, a1: A1, a2: A2): T;
	createInstance<A1, A2, A3, T>(descriptor: descriptors.SyncDescriptor3<A1, A2, A3, T>, a1: A1, a2: A2, a3: A3): T;
	createInstance<A1, A2, A3, A4, T>(descriptor: descriptors.SyncDescriptor4<A1, A2, A3, A4, T>, a1: A1, a2: A2, a3: A3, a4: A4): T;
	createInstance<A1, A2, A3, A4, A5, T>(descriptor: descriptors.SyncDescriptor5<A1, A2, A3, A4, A5, T>, a1: A1, a2: A2, a3: A3, a4: A4, a5: A5): T;
	createInstance<A1, A2, A3, A4, A5, A6, T>(descriptor: descriptors.SyncDescriptor6<A1, A2, A3, A4, A5, A6, T>, a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6): T;
	createInstance<A1, A2, A3, A4, A5, A6, A7, T>(descriptor: descriptors.SyncDescriptor7<A1, A2, A3, A4, A5, A6, A7, T>, a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7): T;
	createInstance<A1, A2, A3, A4, A5, A6, A7, A8, T>(descriptor: descriptors.SyncDescriptor8<A1, A2, A3, A4, A5, A6, A7, A8, T>, a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8): T;

	createInstance<Ctor extends new (...args: any[]) => any, R extends InstanceType<Ctor>>(t: Ctor, ...args: GetLeadingNonServiceArgs<ConstructorParameters<Ctor>>): R;

	/**
	 * 调用方法
	 */
	invokeFunction<R, TS extends any[] = []>(fn: (accessor: ServicesAccessor, ...args: TS) => R, ...args: TS): R;
	/**
	 * 添加一个服务到当前的实例化服务
	 * @param id 
	 * @param instanceOrDescriptor 
	 */
	addService<T>(id: ServiceIdentifier<T>, instanceOrDescriptor: T | descriptors.SyncDescriptor<T>):void;
	/**
	 * 创建一个子的实例化服务，该实例化服务讲包含当前实例化服务中的所有服务
	 */
	createChild(services: ServiceCollection): IInstantiationService;
	/**
	 * 渲染一个React控件
	 * @param element 要渲染的元素
	 * @param container 所处的容器
	 * @param rest 所需的参数
	 */
	renderReact<P extends InstantiationProps>(element: React.ReactElement<P>, container: Element | null, ...rest: any[]): Promise<Component<P, ComponentState> | Element | void>;
	/**
	 * 调用一个具有服务依赖的方法
	 * @param func 方法
	 * @param owner 所有者
	 * @param rest 参数
	 */
	invokeServiceDependenciesFunc(func: Function, owner: any, rest: any[]): void;
}


/**
 * 服务标识
 * @tslint false
 */
export interface ServiceIdentifier<T> {
	(...args: any[]): void;
	type: T;
}

function storeServiceDependency(id: Function, target: Function, index: number, optional: boolean): void {
	if (target[_util.DI_TARGET] === target) {
		target[_util.DI_DEPENDENCIES].push({ id, index, optional });
	} else {
		target[_util.DI_DEPENDENCIES] = [{ id, index, optional }];
		target[_util.DI_TARGET] = target;
	}
}

/**
 * 通过原标签创建服务依赖
 */
export function createDecorator<T>(serviceId: string): { (...args: any[]): void; type: T; } {

	if (_util.serviceIds.has(serviceId)) {
		return _util.serviceIds.get(serviceId);
	}
	const id = <any>function (target: Function, key: string, index: number): any {
		if (arguments.length !== 3) {
			throw new Error('@IServiceName-decorator can only be used to decorate a parameter');
		}
		//给普通的方法也添加装饰器的支持
		if (key && key in target && typeof target[key] == 'function') {
			target = target[key];
		}
		storeServiceDependency(id, target, index, false);
	};
	id.toString = () => serviceId;
	_util.serviceIds.set(serviceId, id);
	return id;
}

/**
 * 将一个服务依赖作为可选依赖
 */
export function optional<T>(serviceIdentifier: ServiceIdentifier<T>) {
	return function (target: Function, key: string, index: number) {
		if (arguments.length !== 3) {
			throw new Error('@optional-decorator can only be used to decorate a parameter');
		}
		storeServiceDependency(serviceIdentifier, target, index, true);
	};
}