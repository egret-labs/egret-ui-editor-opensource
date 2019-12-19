/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import {
	SchemaDecoder, Element, ComplexType, ISchemaNode, SchemaNodeCreater,
	ISchemaContainer, Attribute, SchemaNodeType, Choice, Any,
	AttributeGroup, Group
} from '../core/Schema';


import { ISchemaContentAssist } from './ISchemaContentAssist';
import { SchemaContentAssist } from './SchemaContentAssist';
import { QName } from './../sax/QName';
import { Namespace } from './../sax/Namespace';

import * as sax from '../sax/sax';
/**
 * xsd规则的数据层基类
 */
export class AbstractSchemaModel {
	public constructor() {
	}

	/** xsd解析器 */
	private _schemaDecoder: SchemaDecoder = new SchemaDecoder();
	/** xsd解析器 */
	public get schemaDecoder(): SchemaDecoder {
		return this._schemaDecoder;
	}
	/** 规则内容助手 */
	private _contentAssist: ISchemaContentAssist = new SchemaContentAssist();
	/** 规则内容助手 */
	public get contentAssist(): ISchemaContentAssist {
		return this._contentAssist;
	}
	/**
	 * 初始化xsd对象
	 * @param xsd
	 */
	protected initSchema(xsd: sax.Tag): boolean {
		try {
			this._schemaDecoder.deocdeSchema(xsd);
		} catch (error) {
			console.log('\nerror:\nEgret类型项目xsd解析错误:' + error.message + '\n');
			return false;
		}
		this.updateDefaultNS();
		return true;
	}
	private classNames: any[] = [];
	/** 自定义组件节点 */
	protected customComponentNodes: ISchemaNode[] = [];
	/**
	 * 更新自定义组件列表，此方法会移除掉所有旧的自定义组件节点，以新传入的替代。
	 * @param classNames 自定义组件类名列表
	 */
	protected updateComponents(classNames: string[]): void {
		this.classNames = classNames;
		// 更新默认的命名空间
		this.updateDefaultNS();
		// 移除掉所有旧的自定义组件列表
		AbstractSchemaModel.removeCustomNodes(this.customComponentNodes);
		// 给Skin添加一个<w:Declarations/>，内部添加一个any
		let declarationsElement: Element = SchemaNodeCreater.createElement(new QName(this.getWorkNS().uri, 'Declarations'), null);
		this._schemaDecoder.schema.addNode(declarationsElement);
		this.customComponentNodes.push(declarationsElement);
		let declarationsComplexType: ComplexType = SchemaNodeCreater.createComplexType(null);
		declarationsElement.addNode(declarationsComplexType);
		this.customComponentNodes.push(declarationsComplexType);
		let declarationsChoice: Choice = SchemaNodeCreater.createChoice();
		declarationsComplexType.addNode(declarationsChoice);
		this.customComponentNodes.push(declarationsChoice);
		let declarationsAny: Any = SchemaNodeCreater.createAny();
		declarationsChoice.addNode(declarationsAny);
		this.customComponentNodes.push(declarationsAny);

		let declarationsRef: Element = SchemaNodeCreater.createElement(null, declarationsElement);
		let skinElementQName: QName = new QName(this.getGuiNS().uri, 'Skin');
		let skinElements: ISchemaNode[] = this._schemaDecoder.schema.getNodes(skinElementQName, SchemaNodeType.ELEMENT);
		let skinElement: Element;
		if (skinElements.length > 0) {
			skinElement = skinElements[0] as Element;
		}
		let skinChoice: Choice = null;
		if (skinElement) {
			if (skinElement.numChildren > 0 && skinElement.getNodeAt(0) instanceof ComplexType) {
				let skinComplexType: ComplexType = skinElement.getNodeAt(0) as ComplexType;
				if (skinComplexType) {
					for (let i = 0; i < skinComplexType.numChildren; i++) {
						if (skinComplexType.getNodeAt(i) instanceof Choice) {
							skinChoice = skinComplexType.getNodeAt(i) as Choice;
							break;
						}
					}
				}
			}
		}
		if (skinChoice) {
			skinChoice.addNode(declarationsRef);
			this.customComponentNodes.push(declarationsRef);
		}
		// 给Skin添加一个 <w:HostComponent/> 他有一个name属性
		let hostComponentElement: Element = SchemaNodeCreater.createElement(new QName(this.getWorkNS().uri, 'HostComponent'), null);
		this._schemaDecoder.schema.addNode(hostComponentElement);
		this.customComponentNodes.push(hostComponentElement);
		let hostComponentComplexType: ComplexType = SchemaNodeCreater.createComplexType(null);
		hostComponentElement.addNode(hostComponentComplexType);
		this.customComponentNodes.push(hostComponentComplexType);
		let hostComponentAttributeGroup: AttributeGroup = SchemaNodeCreater.createAttributeGroup(null, null);
		hostComponentComplexType.addNode(hostComponentAttributeGroup);
		this.customComponentNodes.push(hostComponentAttributeGroup);
		let hostComponentAttribute: Attribute = SchemaNodeCreater.createAttribute(new QName(this.getWorkNS().uri, 'name'), null);
		hostComponentAttributeGroup.addNode(hostComponentAttribute);
		this.customComponentNodes.push(hostComponentAttribute);
		if (skinChoice) {
			let hostComponentElementRef: Element = SchemaNodeCreater.createElement(null, hostComponentElement);
			skinChoice.addNode(hostComponentElementRef);
			this.customComponentNodes.push(hostComponentElementRef);
		}
		// 对自定义组件类名进行排序，按照从子类到父类的顺序排列
		this.sortComponentClassNames(classNames);
		// 开始添加自定义组件节点到动态xsd中
		for (let i = 0; i < classNames.length; i++) {
			let currentClassName: string = classNames[i];
			// 得到当前自定义类的命名空间
			let currentQname: QName = AbstractSchemaModel.getCustomClassQName(currentClassName);
			// 将这个命名空间注册到默认命名空间里
			this.contentAssist.registerDefaultNs(currentQname.uri, currentQname.localName);
			// 创建一个新的Element，添加到schema节点下
			let elementQName: QName = this.getClassQNameForElement(currentClassName);
			let nameElement: Element = SchemaNodeCreater.createElement(elementQName, null);
			this._schemaDecoder.schema.addNode(nameElement);
			this.customComponentNodes.push(nameElement);

			//////////////// 第一步////////////////////
			// 查找这个类都实现了哪些接口。
			// 并将这个类的ref加到可以找到的接口的组里
			/////////////////////////////////////////
			let interfaceArr: string[] = this.getAllInterface(currentClassName);
			for (let j = 0; j < interfaceArr.length; j++) {
				for (let k = 0; k < this._schemaDecoder.schema.numChildren; k++) {
					let currentGroup: Group = this._schemaDecoder.schema.getNodeAt(k) as Group;
					if (currentGroup instanceof Group && currentGroup.qName.localName === interfaceArr[j] && currentGroup.qName.uri === this.getGuiNS().uri) {
						// 将创建的element添加的这个group的choice里
						if (currentGroup.numChildren >= 1 && currentGroup.getNodeAt(0) instanceof Choice) {
							// 找到了这个接口命名的组
							let refElement: Element = SchemaNodeCreater.createElement(null, nameElement);
							let c: Choice = currentGroup.getNodeAt(0) as Choice;
							if (c instanceof Choice) {
								c.addNode(refElement);
							}
							this.customComponentNodes.push(refElement);
						}
						break;
					}
				}
			}

			//////////////// 第二步////////////////////
			// 查找这个类都继承了哪些父类。一层一层的找
			// 并将这个类的ref加到可以找到的父类的组里
			/////////////////////////////////////////
			let superArr: string[] = this.getExtendsChain(currentClassName);
			for (let j = 0; j < superArr.length; j++) {
				for (let k = 0; k < this._schemaDecoder.schema.numChildren; k++) {
					const currentGroup = this._schemaDecoder.schema.getNodeAt(k) as Group;
					if (currentGroup instanceof Group && currentGroup.qName.localName === superArr[j] && currentGroup.qName.uri === this.getClassQNameForElement(superArr[j]).uri) {
						// 将创建的element添加的这个group的choice里
						if (currentGroup.numChildren >= 1 && currentGroup.getNodeAt(0) instanceof Choice) {
							// 找到了这个以类名命名的组
							const refElement = SchemaNodeCreater.createElement(null, nameElement);
							const c = currentGroup.getNodeAt(0) as Choice;
							if (c instanceof Choice) {
								c.addNode(refElement);
							}
							this.customComponentNodes.push(refElement);
						}
						break;
					}
				}
			}

			//////////////// 第三步////////////////////
			// 查找父类的element里有没有m:defaultPropType节点。
			// 如果有，对应的复杂类型defaultType内的所有组创建一个ref副本，加入到自己的choice里
			// 如果没有，继续往上找
			/////////////////////////////////////////
			let defaultPropType: string = '';
			for (let j = 0; j < superArr.length; j++) {
				let found: boolean = false;
				if (classNames.indexOf(superArr[j]) === -1) {
					let tempArr: string[] = (<string>superArr[j]).split('.');
					let classId: string = tempArr.length > 0 ? tempArr[tempArr.length - 1] : '';
					if (classId) {
						for (let k = 0; k < this._schemaDecoder.schema.numChildren; k++) {
							let currentElement: Element = this._schemaDecoder.schema.getNodeAt(k) as Element;
							if (currentElement instanceof Element && currentElement.qName.localName === classId && currentElement.qName.uri === this.getGuiNS().uri) {
								if (currentElement.definition) {
									for (let l = 0; l < currentElement.definition.attributeNodes.length; l++) {
										if (currentElement.definition.attributeNodes[l].name === 'm:defaultPropType') {
											defaultPropType = currentElement.definition.attributeNodes[l].value;
											found = true;
											break;
										}
									}
								}
							}
						}
					}
				}
				if (found) {
					break;
				}
			}

			// 给新的element添加一个complexType，给其内部添加一个choice
			let elementComplexType: ComplexType = SchemaNodeCreater.createComplexType(null);
			nameElement.addNode(elementComplexType);
			this.customComponentNodes.push(elementComplexType);
			let elementChoice: Choice = SchemaNodeCreater.createChoice();
			elementComplexType.addNode(elementChoice);
			this.customComponentNodes.push(elementChoice);

			if (defaultPropType) {
				let defaultPropTypeQname: QName = new QName(this.getGuiNS().uri, defaultPropType);
				let complexTypes: ISchemaNode[] = this._schemaDecoder.schema.getNodes(defaultPropTypeQname, SchemaNodeType.COMPLEX_TYPE);
				let complexType: ComplexType = complexTypes.length > 0 ? complexTypes[0] as ComplexType : null;
				if (complexType instanceof ComplexType) {
					for (let j = 0; j < complexType.numChildren; j++) {
						let groupRef: Group = complexType.getNodeAt(j) as Group;
						if (groupRef instanceof Group) {
							groupRef = SchemaNodeCreater.createGroup(null, groupRef.resolveForRef);
							elementChoice.addNode(groupRef);
							this.customComponentNodes.push(groupRef);
						}
					}
				}
			}

			//////////////// 第四步////////////////////
			// 创建一个名为'name_attributeElement'的group，添加到根节点。
			// 将自己的属性作为element添加到这个组的choice里。
			// 找到'parentName_attributeElement'的group，添加到刚刚创建的组的choice里。
			// 把刚刚创建的group，添加到创建的element的complexType的choice里。
			/////////////////////////////////////////
			let attributeElementGroupQName: QName = new QName(elementQName.uri, elementQName.localName + '_attributeElement');
			let attributeElementGroup: Group = SchemaNodeCreater.createGroup(attributeElementGroupQName, null);
			this._schemaDecoder.schema.addNode(attributeElementGroup);
			this.customComponentNodes.push(attributeElementGroup);
			// 找到父类的属性组
			let parentClassName: string = this.getSuperClassName(currentClassName);
			let parentAttributeElementGroup: Group;
			let parentQName: QName;
			if (parentClassName) {
				parentQName = this.getClassQNameForElement(parentClassName);
				let parentAttributeElementGroupQName: QName = new QName(parentQName.uri, parentQName.localName + '_attributeElement');
				let parentAttributeElementGroups: ISchemaNode[] = this._schemaDecoder.schema.getNodes(parentAttributeElementGroupQName, SchemaNodeType.GROUP);
				parentAttributeElementGroup = parentAttributeElementGroups.length > 0 ? parentAttributeElementGroups[0] as Group : null;
			}
			// 将这个父级的属性组添加到自己的choice里
			const choice = SchemaNodeCreater.createChoice();
			attributeElementGroup.addNode(choice);
			this.customComponentNodes.push(choice);
			if (parentAttributeElementGroup instanceof Group) {
				let parentAttributeElementGroupRef: Group = SchemaNodeCreater.createGroup(null, parentAttributeElementGroup);
				choice.addNode(parentAttributeElementGroupRef);
				this.customComponentNodes.push(parentAttributeElementGroupRef);
			}
			// 将自身的属性所谓element添加到choice里
			let properties: any = this.getPropertyAfterBase(currentClassName, parentClassName);
			for (let key in properties) {
				const item = properties[key];
				let attributeElement: Element = SchemaNodeCreater.createElement(new QName(elementQName.uri, item.name), null);

				// 把类型也放进去
				let type: string = item.type as string;
				let typeQName: QName;
				if (classNames.indexOf(type) === -1) {
					typeQName = new QName(this.getGuiNS().uri, type);
				} else {
					typeQName = new QName(this.getClassQNameForElement(type).uri, type);
				}

				let typeNode: ISchemaNode;
				let typeNodes: ISchemaNode[] = this._schemaDecoder.schema.getNodes(typeQName, SchemaNodeType.COMPLEX_TYPE);
				if (typeNodes.length === 0) {
					typeNodes = this._schemaDecoder.schema.getNodes(typeQName, SchemaNodeType.SIMPLE_TYPE);
				}

				if (typeNodes.length > 0) {
					typeNode = typeNodes[0];
				}

				if (typeNode) {
					attributeElement.type = typeNode;
				}

				choice.addNode(attributeElement);
				this.customComponentNodes.push(attributeElement);
			}
			// 把刚刚创建的group，添加到创建的element的complexType的choice里。
			let attributeElementGroupRef: Group = SchemaNodeCreater.createGroup(null, attributeElementGroup);
			elementChoice.addNode(attributeElementGroupRef);
			this.customComponentNodes.push(attributeElementGroupRef);

			//////////////// 第五步////////////////////
			// 创建一个自身类名的attributeGroup，添加到根节点。
			// 把刚刚创建的Element的属性分别加到这个刚刚创建的属性组里。
			// 找到这个element的父级类名的属性组。将其添加到刚刚创建的属性组里。
			// 把刚刚创建的属性组添加到创建的element.complexType里
			/////////////////////////////////////////
			// 创建一个自身类名的attributeGroup，添加到根节点。
			let attributeGroup: AttributeGroup = SchemaNodeCreater.createAttributeGroup(new QName(elementQName.uri, currentClassName), null);
			this._schemaDecoder.schema.addNode(attributeGroup);
			this.customComponentNodes.push(attributeGroup);
			// 找到父类的属性组
			let parentAttributeGroup: AttributeGroup;
			if (parentClassName) {
				let parentAttributeGroupQName: QName = new QName(parentQName.uri, parentClassName);
				let parentAttributeGroups: ISchemaNode[] = this._schemaDecoder.schema.getNodes(parentAttributeGroupQName, SchemaNodeType.ATTRIBUTE_GROUP);
				parentAttributeGroup = parentAttributeGroups.length > 0 ? parentAttributeGroups[0] as AttributeGroup : null;
			}
			// 将这个父级的属性组添加到自己里
			if (parentAttributeGroup instanceof AttributeGroup) {
				let parentAttributeGroupRef: AttributeGroup = SchemaNodeCreater.createAttributeGroup(null, parentAttributeGroup);
				attributeGroup.addNode(parentAttributeGroupRef);
				this.customComponentNodes.push(parentAttributeGroupRef);
			}
			// 把刚刚创建的Element的属性分别加到这个刚刚创建的属性组里。
			for (let key in properties) {
				const item = properties[key];
				// todo type 类型
				let attribute: Attribute = SchemaNodeCreater.createAttribute(new QName(elementQName.uri, item.name), null);
				attributeGroup.addNode(attribute);
				this.customComponentNodes.push(attribute);
			}

			// 把刚刚创建的属性组添加到创建的element.complexType里
			let attributeGroupRef: AttributeGroup = SchemaNodeCreater.createAttributeGroup(null, attributeGroup);
			elementComplexType.addNode(attributeGroupRef);
			this.customComponentNodes.push(attributeGroupRef);
		}
	}
	/**
	 * 更新默认的命名空间，该方法子类中重写
	 */
	private updateDefaultNS(): void {
		this.contentAssist.clearDefaultNs();
		this.contentAssist.registerDefaultNs(this.getGuiNS().uri, this.getGuiNS().prefix);
		this.contentAssist.registerDefaultNs(this.getWorkNS().uri, this.getWorkNS().prefix);
	}
	/**
	 * 对自定义组件类名进行排序，按照从子类到父类的顺序排列。子类重写此方法
	 * @param classNames
	 */
	protected sortComponentClassNames(classNames: string[]): void {
	}
	/**
	 * 通过类名得到实现的接口列表，子类继承实现此方法。
	 * @param className 类名
	 * @return 指定类实现的接口列表
	 */
	protected getAllInterface(className: string): string[] {
		return [];
	}
	/**
	 * 得到一个类的继承链，子类继承实现此方法。
	 * @param className 类名
	 * @return 继承联列表
	 */
	protected getExtendsChain(className: string): string[] {
		return [];
	}
	/**
	 * 得到父类的类名，子类继承实现此方法。
	 * @param className 类名
	 * @return 父类的类名
	 */
	protected getSuperClassName(className: string): string {
		return '';
	}
	/**
	 * 得到当前类相对于指定父类的所有属性字典，key:属性名,value:属性类型，子类继承实现此方法。
	 * @param className 类名
	 * @param superClassName 父类名
	 * @return 属性字典，key:属性名,value:属性类型。
	 */
	protected getPropertyAfterBase(className: string, superClassName: string): any {
		return {};
	}

	/**
	 * 工作的命名空间，具体子类重写
	 */
	public getWorkNS(): Namespace {
		return null;
	}
	/**
	 * GUI的命名空间，具体子类重写
	 */
	public getGuiNS(): Namespace {
		return null;
	}

	/**
	 * 通过类名的字符串形式，得到得到类名的QName。<p/>
	 * 如通过'a.b.C'得到uri为'*'，短名为'a.b.*'的的QName
	 * @param className 字符串表示的类名
	 * @return
	 */
	protected static getCustomClassQName(className: string): QName {
		let uri: string = '*';
		let prefix: string = 'locol';
		let classNameArr: string[] = className.split('.');
		if (classNameArr.length > 1) {
			prefix = classNameArr[classNameArr.length - 2];
			let tempClassNameArr: string[] = classNameArr.splice(0, classNameArr.length - 1);
			uri = tempClassNameArr.join('.');
			uri += '.*';
		}
		return new QName(uri, prefix);
	}
	/**
	 * 得到类名的QName，给Element用
	 * @param className
	 * @return
	 */
	private getClassQNameForElement(className: string): QName {
		let uri: string = '*';
		let prefix: string = className;
		let classNameArr: string[] = className.split('.');
		if (classNameArr.length > 1) {
			prefix = classNameArr[classNameArr.length - 1];
			let tempClassNameArr: string[] = classNameArr.splice(0, classNameArr.length - 1);
			uri = tempClassNameArr.join('.');
			uri += '.*';
		}
		// 如果不是自定义组件则为默认组件，默认组件用默认命名空间
		if (this.classNames.indexOf(className) === -1) {
			uri = this.getGuiNS().uri;
		}
		return new QName(uri, prefix);
	}
	/**
	 * 移除所有自定义节点
	 */
	protected static removeCustomNodes(nodes: ISchemaNode[]): void {
		if (!nodes) {
			return;
		}
		while (nodes.length > 0) {
			let node: ISchemaNode = nodes.pop();
			let parent: ISchemaContainer = node.parent;
			if (parent) {
				parent.removeNode(node);
			}
		}
	}
}