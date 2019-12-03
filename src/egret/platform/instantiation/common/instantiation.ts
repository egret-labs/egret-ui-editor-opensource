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

/**
 * 0个参数构造函数接口
 * @tslint false
 */
export interface IConstructorSignature0<T> {
	new(...services: { _serviceBrand: any; }[]): T;
}
/**
 * 1个参数构造函数接口
 * @tslint false
 */
export interface IConstructorSignature1<A1, T> {
	new(first: A1, ...services: { _serviceBrand: any; }[]): T;
}
/**
 * 2个参数构造函数接口
 * @tslint false
 */
export interface IConstructorSignature2<A1, A2, T> {
	new(first: A1, second: A2, ...services: { _serviceBrand: any; }[]): T;
}
/**
 * 3个参数构造函数接口
 * @tslint false
 */
export interface IConstructorSignature3<A1, A2, A3, T> {
	new(first: A1, second: A2, third: A3, ...services: { _serviceBrand: any; }[]): T;
}
/**
 * 4个参数构造函数接口
 * @tslint false
 */
export interface IConstructorSignature4<A1, A2, A3, A4, T> {
	new(first: A1, second: A2, third: A3, fourth: A4, ...services: { _serviceBrand: any; }[]): T;
}
/**
 * 5个参数构造函数接口
 * @tslint false
 */
export interface IConstructorSignature5<A1, A2, A3, A4, A5, T> {
	new(first: A1, second: A2, third: A3, fourth: A4, fifth: A5, ...services: { _serviceBrand: any; }[]): T;
}
/**
 * 6个参数构造函数接口
 * @tslint false
 */
export interface IConstructorSignature6<A1, A2, A3, A4, A5, A6, T> {
	new(first: A1, second: A2, third: A3, fourth: A4, fifth: A5, sixth: A6, ...services: { _serviceBrand: any; }[]): T;
}
/**
 * 7个参数构造函数接口
 * @tslint false
 */
export interface IConstructorSignature7<A1, A2, A3, A4, A5, A6, A7, T> {
	new(first: A1, second: A2, third: A3, fourth: A4, fifth: A5, sixth: A6, seventh: A7, ...services: { _serviceBrand: any; }[]): T;
}
/**
 * 8个参数构造函数接口
 * @tslint false
 */
export interface IConstructorSignature8<A1, A2, A3, A4, A5, A6, A7, A8, T> {
	new(first: A1, second: A2, third: A3, fourth: A4, fifth: A5, sixth: A6, seventh: A7, eigth: A8, ...services: { _serviceBrand: any; }[]): T;
}
/**
 * 服务访问器
 * @tslint false
 */
export interface ServicesAccessor {
	get<T>(id: ServiceIdentifier<T>, isOptional?: typeof optional): T;
}

/**
 * 0个参数方法签名
 * @tslint false
 */
export interface IFunctionSignature0<R> {
	(accessor: ServicesAccessor): R;
}
/**
 * 1个参数方法签名
 * @tslint false
 */
export interface IFunctionSignature1<A1, R> {
	(accessor: ServicesAccessor, first: A1): R;
}
/**
 * 2个参数方法签名
 * @tslint false
 */
export interface IFunctionSignature2<A1, A2, R> {
	(accessor: ServicesAccessor, first: A1, second: A2): R;
}
/**
 * 3个参数方法签名
 * @tslint false
 */
export interface IFunctionSignature3<A1, A2, A3, R> {
	(accessor: ServicesAccessor, first: A1, second: A2, third: A3): R;
}
/**
 * 4个参数方法签名
 * @tslint false
 */
export interface IFunctionSignature4<A1, A2, A3, A4, R> {
	(accessor: ServicesAccessor, first: A1, second: A2, third: A3, fourth: A4): R;
}
/**
 * 5个参数方法签名
 * @tslint false
 */
export interface IFunctionSignature5<A1, A2, A3, A4, A5, R> {
	(accessor: ServicesAccessor, first: A1, second: A2, third: A3, fourth: A4, fifth: A5): R;
}
/**
 * 6个参数方法签名
 * @tslint false
 */
export interface IFunctionSignature6<A1, A2, A3, A4, A5, A6, R> {
	(accessor: ServicesAccessor, first: A1, second: A2, third: A3, fourth: A4, fifth: A5, sixth: A6): R;
}
/**
 * 7个参数方法签名
 * @tslint false
 */
export interface IFunctionSignature7<A1, A2, A3, A4, A5, A6, A7, R> {
	(accessor: ServicesAccessor, first: A1, second: A2, third: A3, fourth: A4, fifth: A5, sixth: A6, seventh: A7): R;
}
/**
 * 8个参数方法签名
 * @tslint false
 */
export interface IFunctionSignature8<A1, A2, A3, A4, A5, A6, A7, A8, R> {
	(accessor: ServicesAccessor, first: A1, second: A2, third: A3, fourth: A4, fifth: A5, sixth: A6, seventh: A7, eigth: A8): R;
}

export const IInstantiationService = createDecorator<IInstantiationService>('instantiationService');

/**
 * 实例化服务
 */
export interface IInstantiationService {

	_serviceBrand: any;

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

	createInstance<T>(ctor: IConstructorSignature0<T>): T;
	createInstance<A1, T>(ctor: IConstructorSignature1<A1, T>, first: A1): T;
	createInstance<A1, A2, T>(ctor: IConstructorSignature2<A1, A2, T>, first: A1, second: A2): T;
	createInstance<A1, A2, A3, T>(ctor: IConstructorSignature3<A1, A2, A3, T>, first: A1, second: A2, third: A3): T;
	createInstance<A1, A2, A3, A4, T>(ctor: IConstructorSignature4<A1, A2, A3, A4, T>, first: A1, second: A2, third: A3, fourth: A4): T;
	createInstance<A1, A2, A3, A4, A5, T>(ctor: IConstructorSignature5<A1, A2, A3, A4, A5, T>, first: A1, second: A2, third: A3, fourth: A4, fifth: A5): T;
	createInstance<A1, A2, A3, A4, A5, A6, T>(ctor: IConstructorSignature6<A1, A2, A3, A4, A5, A6, T>, first: A1, second: A2, third: A3, fourth: A4, fifth: A5, sixth: A6): T;
	createInstance<A1, A2, A3, A4, A5, A6, A7, T>(ctor: IConstructorSignature7<A1, A2, A3, A4, A5, A6, A7, T>, first: A1, second: A2, third: A3, fourth: A4, fifth: A5, sixth: A6, seventh: A7): T;
	createInstance<A1, A2, A3, A4, A5, A6, A7, A8, T>(ctor: IConstructorSignature8<A1, A2, A3, A4, A5, A6, A7, A8, T>, first: A1, second: A2, third: A3, fourth: A4, fifth: A5, sixth: A6, seventh: A7, eigth: A8): T;

	/**
	 * 调用方法
	 */
	invokeFunction<R>(ctor: IFunctionSignature0<R>): R;
	invokeFunction<A1, R>(ctor: IFunctionSignature1<A1, R>, first: A1): R;
	invokeFunction<A1, A2, R>(ctor: IFunctionSignature2<A1, A2, R>, first: A1, second: A2): R;
	invokeFunction<A1, A2, A3, R>(ctor: IFunctionSignature3<A1, A2, A3, R>, first: A1, second: A2, third: A3): R;
	invokeFunction<A1, A2, A3, A4, R>(ctor: IFunctionSignature4<A1, A2, A3, A4, R>, first: A1, second: A2, third: A3, fourth: A4): R;
	invokeFunction<A1, A2, A3, A4, A5, R>(ctor: IFunctionSignature5<A1, A2, A3, A4, A5, R>, first: A1, second: A2, third: A3, fourth: A4, fifth: A5): R;
	invokeFunction<A1, A2, A3, A4, A5, A6, R>(ctor: IFunctionSignature6<A1, A2, A3, A4, A5, A6, R>, first: A1, second: A2, third: A3, fourth: A4, fifth: A5, sixth: A6): R;
	invokeFunction<A1, A2, A3, A4, A5, A6, A7, R>(ctor: IFunctionSignature7<A1, A2, A3, A4, A5, A6, A7, R>, first: A1, second: A2, third: A3, fourth: A4, fifth: A5, sixth: A6, seventh: A7): R;
	invokeFunction<A1, A2, A3, A4, A5, A6, A7, A8, R>(ctor: IFunctionSignature8<A1, A2, A3, A4, A5, A6, A7, A8, R>, first: A1, second: A2, third: A3, fourth: A4, fifth: A5, sixth: A6, seventh: A7, eigth: A8): R;

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