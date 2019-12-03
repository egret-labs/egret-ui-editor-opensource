/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { IConstructorSignature0, IInstantiationService } from '../../platform/instantiation/common/instantiation';
import { Action } from '../../base/common/actions';


/**
 * action 描述接口
 */
export interface IActionDescriptor {

	/**
	 * 获取Action 的实例
	 * @param instantiationService action 实例
	 */
	instantiate(instantiationService: IInstantiationService): Action;

	/**
	 * 获取Action id
	 */
	getId(): string;

	/**
	 * 获取action name
	 */
	getLabel(): string;


}
/**
 * action基本实现
 */
export class ActionDescriptor implements IActionDescriptor {
	private ctor: IConstructorSignature0<Action>;
	private id: string;
	private label: string;
	constructor(ctor: IConstructorSignature0<Action>, id: string, label: string) {
		this.ctor = ctor;
		this.id = id;
		this.label = label;
	}
	/**
	 * 获取实例
	 * @param instantiationService 
	 */
	public instantiate(instantiationService: IInstantiationService): Action {
		return instantiationService.createInstance(this.ctor);
	}

	/**
	 * 获取action id
	 */
	public getId(): string {
		return this.id;
	}

	/**
	 * 获取显示
	 */
	public getLabel(): string {
		return this.label;
	}
}


/**
 * action注册器接口
 */
export interface IRendenerActionRegistry {

	/**
	 * 添加action 注册
	 * @param id 
	 * @param data 
	 */
	add(id: string, data: any): void;

	/**
	 * 包含id 的action
	 * @param id 
	 */
	has(id: string): boolean;

	/**
	 * 获得action
	 * @param id 
	 */
	getAction<T>(id: string): T;
}

/**
 * 渲染进程action 注册器
 */
class RendenerActionRegistryImpl implements IRendenerActionRegistry {

	private data: { [id: string]: any; };

	constructor() {
		this.data = {};
	}

	/**
	 * 添加action 注册
	 * @param id 
	 * @param data 
	 */
	public add(id: string, data: any): void {
		this.data[id] = data;
	}

	/**
	 * 包含id 的action
	 * @param id 
	 */
	public has(id: string): boolean {
		return this.data.hasOwnProperty(id);
	}

	/**
	 * 获得action
	 * @param id 
	 */
	public getAction(id: string): any {
		return this.data[id] || null;
	}
}

export const actionRegistryImpl = <IRendenerActionRegistry>new RendenerActionRegistryImpl();