/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { AbstractSchemaModel } from './AbstractSchemaModel';
import { ISchemaStrategy } from './ISchemaStrategy';
import { Namespace } from './../sax/Namespace';
import * as sax from '../sax/sax';
import { ClassChangedType } from '../project/parsers/parser';

/**
 * xsd规范校验数据层
 */

export class SchemaModel extends AbstractSchemaModel {
	private schemaStrategy: ISchemaStrategy;
	private inited: boolean = false;
	private lastIdelRequest: any;
	/**
     * 安装Xsd规范数据层
     * @param schemaStrategy
     */
	public install(schemaStrategy: ISchemaStrategy, xsd: sax.Tag): void {
		this.uninstall();
		this.schemaStrategy = schemaStrategy;
		if (this.schemaStrategy) {
			this.schemaStrategy.addCustomChangedHandler(this.componentsChanged_handler, this);
		}
		this.inited = this.initSchema(xsd);
		if (this.inited) {
			this.updateComponents(this.componentClassNames);
		}
	}

	/**
     * 卸载Xsd规范数据层
     */
	public uninstall(): void {
		if (this.schemaStrategy) {
			this.schemaStrategy.removeCustomChangedHandler(this.componentsChanged_handler, this);
		}
		this.schemaStrategy = null;
	}
	/**
     * 自定义控件列表变化
     * @param event
     */
	private componentsChanged_handler(e: ClassChangedType): void {
		if(e === 'exml'){
			return;
		}
		if (!this.inited) {
			return;
		}
		this.updateComponents(this.componentClassNames);
	}

	/**
     * 得到gui的命名空间
     * @return
     */
	public getGuiNS(): Namespace {
		if (this.schemaStrategy) {
			return this.schemaStrategy.guiNS;
		}
		return new Namespace();
	}
	/**
     * 工作用的命名空间
     */
	public getWorkNS(): Namespace {
		if (this.schemaStrategy) {
			return this.schemaStrategy.workNS;
		}
		return new Namespace();
	}
	/**
     * 对自定义组件类名进行排序，按照从子类到父类的顺序排列。
     * @param classNames
     */
	protected sortComponentClassNames(classNames: string[]): void {
		if (this.schemaStrategy) {
			this.schemaStrategy.sortComponentClassNames(classNames);
		}
	}
	/**
     * 通过类名得到实现的接口列表。
     * @param className 类名
     * @return 指定类实现的接口列表
     */
	protected getAllInterface(className: string): string[] {
		if (this.schemaStrategy) {
			return this.schemaStrategy.getAllInterface(className);
		}
		return [];
	}
	/**
     * 得到一个类的继承链，子类继承实现此方法。
     * @param className 类名
     * @return 继承联列表
     */
	protected getExtendsChain(className: string): string[] {
		if (this.schemaStrategy) {
			return this.schemaStrategy.getExtendsChain(className);
		}
		return [];
	}
	/**
     * 得到父类的类名，子类继承实现此方法。
     * @param className 类名
     * @return 父类的类名
     */
	protected getSuperClassName(className: string): string {
		if (this.schemaStrategy) {
			return this.schemaStrategy.getSuperClassName(className);
		}
		return '';
	}
	/**
     * 得到当前类相对于指定父类的所有属性字典。
     * @param className 类名
     * @param superClassName 父类名
     * @return 属性字典，key:属性名,value:属性类型。
     */
	protected getPropertyAfterBase(className: string, superClassName: string): any {
		if (this.schemaStrategy) {
			return this.schemaStrategy.getPropertyAfterBase(className, superClassName);
		}
		return {};
	}
	/**
     * 为指定的完整类名创建命名空间。
     * @param className 类名
     * @param xml 要加入到的XML对象，用于检查前缀重复。
     */
	public createNamespace(className: string, nsList: Namespace[]): Namespace {
		if (this.schemaStrategy) {
			return this.schemaStrategy.createNamespace(className, nsList);
		}
		return new Namespace();
	}

	/**
     * 组件类名列表
     */
	public get componentClassNames(): string[] {
		if (this.schemaStrategy) {
			return this.schemaStrategy.componentClassNames;
		}
		return [];
	}
	/**
     * 皮肤类名列表
     */
	public get skinClassNames(): string[] {
		if (this.schemaStrategy) {
			return this.schemaStrategy.skinClassNames;
		}
		return [];
	}
}