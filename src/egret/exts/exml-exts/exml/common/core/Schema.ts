import { QName } from './../sax/QName';
import { Namespace } from './../sax/Namespace';
import * as StringUtil from './../utils/strings';

import * as sax from '../sax/sax';
/**
 * xsd常量
 *
 */
export class SchemaConstants {
	// XML Namespace URI Constants
	public static XSD_URI_1999: string = 'http://www.w3.org/1999/XMLSchema';
	public static XSD_URI_2000: string = 'http://www.w3.org/2000/10/XMLSchema';
	public static XSD_URI_2001: string = 'http://www.w3.org/2001/XMLSchema';
}
/**
 * 基本xsd解析器
 *
 */
export class SchemaDecoder {
	public constructor() { }

	private targetNamespace: string;
	private xmlns: Namespace;
	private root: sax.Tag;

	private _schema: Schema;

	public get schema(): Schema {
		return this._schema;
	}

	public deocdeSchema(xsd: sax.Tag): void {
		this._schema = new Schema();
		this._schema.decode(xsd, null, null, null);
	}
}

export class SchemaNodeCreater {
    /**
     * 创建一个simpleType
     * @param qName
     * @return
     *
     */
	public static createSimpleType(qName: QName): SimpleType {
		let simpleType: SimpleType = new SimpleType();
		simpleType.qName = qName;
		return simpleType;
	}

    /**
     * 创建一个complexType
     * @param qName
     * @return
     *
     */
	public static createComplexType(qName: QName): ComplexType {
		let complexType: ComplexType = new ComplexType();
		complexType.qName = qName;
		return complexType;
	}

    /**
     * 创建一个Restriction
     * @param base
     * @param values
     * @return
     *
     */
	public static createRestriction(base: QName, values: any[]): Restriction {
		let restriction: Restriction = new Restriction();
		restriction.base = base;
		restriction.values = values;
		return restriction;
	}

    /**
     * 创建一个Element
     * @param qName
     * @param ref
     * @return
     *
     */
	public static createElement(qName: QName, ref: ISchemaNode): Element {
		let element: Element = new Element();
		element.qName = qName;
		element.ref = ref;
		return element;
	}

    /**
     * 创建一个group
     * @param qName
     * @param ref
     * @return
     *
     */
	public static createGroup(qName: QName, ref: ISchemaNode): Group {
		let group: Group = new Group();
		group.qName = qName;
		group.ref = ref;
		return group;
	}

    /**
     * 创建一个属性组,这两个属性不能同时存在
     * @param qName
     * @param ref
     *
     */
	public static createAttributeGroup(qName: QName, ref: ISchemaNode): AttributeGroup {
		let attributeGroup: AttributeGroup = new AttributeGroup();
		attributeGroup.qName = qName;
		attributeGroup.ref = ref;
		return attributeGroup;
	}

    /**
     * 创建一个属性
     * @param qName
     * @param ref
     * @return
     *
     */
	public static createAttribute(qName: QName, ref: ISchemaNode): Attribute {
		let attribute: Attribute = new Attribute();
		attribute.qName = qName;
		attribute.ref = ref;
		return attribute;
	}

    /**
     * 创建一个choice
     * @return
     *
     */
	public static createChoice(): Choice {
		let choice: Choice = new Choice();
		return choice;
	}
    /**
     * 创建一个any
     * @return
     *
     */
	public static createAny(): Any {
		return new Any();
	}
}

/**
 * xsd工具
 *
 */
export class SchemaUtil {
    /**
     * 得到内置数据
     * @param type
     * @return
     *
     */
	public static getBuiltInDataValues(type: String): any[] {
		let values: any[] = [];
		if (type === 'boolean') {
			values.push('true');
			values.push('false');
		}
		return values;
	}


    /**
     * 判断是否是内置的数据类型
     * @param type
     * @return
     *
     */
	public static isBuiltInType(type: QName): boolean {
		let uri: string = (type != null) ? type.uri : null;
		if (uri != null) {
			if (URLUtil.urisEqual(uri, SchemaConstants.XSD_URI_1999) ||
				URLUtil.urisEqual(uri, SchemaConstants.XSD_URI_2000) ||
				URLUtil.urisEqual(uri, SchemaConstants.XSD_URI_2001)) {
				return true;
			}
		}
		return false;
	}

    /**
     * 通过加好前缀的字符串得到QName
     * @param prefixedName 拼好前缀的字符串
     * @param currentSchema 当前的Schema
     * @param parentDefinition 父级的xml定义
     * @param qualifyToTargetNamespace 是否限定到目标命名空间
     * @return
     */
	public static getQNameForPrefixedName(prefixedName: string, currentSchema: Schema, parentDefinition?: sax.Tag, qualifyToTargetNamespace?: boolean): QName {
		let qname: QName;
		// 将传入的prefixedName分解成前缀和本地名
		if (!prefixedName) prefixedName = '';
		let prefix: string;
		let localName: string;
		let prefixIndex: number = prefixedName.indexOf(':');
		if (prefixIndex > 0) {
			prefix = prefixedName.substr(0, prefixIndex);
			localName = prefixedName.substr(prefixIndex + 1);
		} else {
			localName = prefixedName;
		}

		let ns: Namespace;
		// 如果传入的prefixedName本身就是无前缀的。并且设置了规范到目标命名空间。命名空间为当前Schema的targetNamespace
		if (prefix == null && qualifyToTargetNamespace === true) {
			ns = currentSchema.targetNamespace;
		}
		// 如果前缀为null的话赋值为""
		if (prefix == null) {
			prefix = '';
		}

		// First, check if a parent XML has a local definition for this
		// namespace...
		if (ns == null) {
			if (parentDefinition != null) {

				let localNamespaces: Namespace[] = [];
				for (let i: number = 0; i < parentDefinition.attributeNodes.length; i++) {
					if (parentDefinition.attributeNodes[i].name && parentDefinition.attributeNodes[i].name.indexOf('xmlns') === 0) {
						if (parentDefinition.attributeNodes[i].name === 'xmlns') {
							localNamespaces.push(new Namespace('', parentDefinition.attributeNodes[i].value));
						} else {
							localNamespaces.push(new Namespace(parentDefinition.attributeNodes[i].name.split(':')[1], parentDefinition.attributeNodes[i].value));
						}
					}
				}

				for (let i: number = 0; i < localNamespaces.length; i++) {
					if (localNamespaces[i].prefix === prefix) {
						ns = localNamespaces[i];
						break;
					}
				}
			}
		}

		// Next, check top level namespaces
		// 			if (ns == null)
		// 			{
		// 				ns = namespaces[prefix];
		// 			}

		// 检查当前schema的命名空间
		if (ns == null) {
			ns = currentSchema.namespaces[prefix];
		}

		if (ns == null) {
			// Check if parent XML node is in the default namespace

			let parentNS: Namespace = (parentDefinition != null) ? new Namespace(parentDefinition.prefix, parentDefinition.namespace) : null;
			if (parentNS != null && parentNS.prefix === '')
				ns = parentNS;
			// Otherwise we use the target namespace of the current definition
			else
				ns = currentSchema.targetNamespace;
		}

		if (ns != null)
			qname = new QName(ns.uri, localName);
		else
			qname = new QName('', localName);

		return qname;
	}
}

/**
 * URL工具
 *
 */
export class URLUtil {
    /**
     * 判断两个uri是否相等
     * @param uri1
     * @param uri2
     * @return
     */
	public static urisEqual(uri1: string, uri2: string): boolean {
		if (uri1 != null && uri2 != null) {
			uri1 = StringUtil.trim(uri1).toLowerCase();
			uri2 = StringUtil.trim(uri2).toLowerCase();

			if (uri1.charAt(uri1.length - 1) !== '/')
				uri1 = uri1 + '/';

			if (uri2.charAt(uri2.length - 1) !== '/')
				uri2 = uri2 + '/';
		}
		return uri1 === uri2;
	}
}

/**
 * any不是一个容器，any的目的是代表任意元素
 *
 */
export interface ISchemaAny extends ISchemaNode {
    /**
     * 进行如下操作之前要进行一个刷新，以重新获得根节点下的所有元素
     */
	refresh(): void;
    /**
     * 是否可以代表指定节点
     * @param node
     * @return
     */
	isTypeOf(node: ISchemaNode): boolean;
    /**
     * 得到指定位置的元素
     * @param index
     * @return
     */
	getNodeAt(index: number): ISchemaNode;
    /**
     * 可以代表的元素数量
     * @return
     */
	numNode: number;

    /**
     * 可选。规定包含可以使用的元素的命名空间。如果没有指定命名空间，则 ##any 为默认值。
     * 如果指定命名空间，则必须是以下值之一：<br/>
     * <li>##any - 来自任何命名空间的元素都可以出现（默认）。</li>
     * <li>##other - 来自该元素的父元素的目标命名空间之外的任何命名空间的元素都可以出现。</li>
     * <li>##local - 未由命名空间限定的元素可以出现。</li>
     * <li>##targetNamespace - 来自包含该元素的父元素的目标命名空间的元素可以出现。</li>
     * <li>{URI references of namespaces, ##targetNamespace, ##local} 的列表 -
     * 来自通过空格分隔的命名空间列表的元素可以出现。 该列表可以包含以下内容：
     * 命名空间 ##targetNamespace 和 ##local 的 URI 引用。</li>
     * @return
     */
	nameSpace: string;
}

export class SchemaAnyChecker {
	public static isTypeOf(target: any): boolean {
		if (target instanceof Any)
			return true;
		return false;
	}
}
/**
 * 在某个节点的基础上
 */
export interface ISchemaBase extends ISchemaNode {
	base: QName;
}

export class SchemaBaseChecker {
	public static isTypeOf(target: any): boolean {
		return false;
	}
}

/**
 * 一个xsd容器
 */
export interface ISchemaContainer extends ISchemaNode {
    /**
     * 子节点数量
     */
	numChildren: number;
    /**
     * 获取指定索引位置的子节点
     */
	getNodeAt(index: number): ISchemaNode;
    /**
     * 添加子节点
     */
	addNode(node: ISchemaNode): ISchemaNode;
    /**
     * 添加子节点到指定的索引位置
     */
	addNodeAt(node: ISchemaNode, index: number): ISchemaNode;
    /**
     * 移除子节点
     */
	removeNode(node: ISchemaNode): ISchemaNode;
    /**
     * 移除指定索引位置的子节点
     */
	removeNodeAt(index: number): ISchemaNode;
    /**
     * 移除所有节点
     */
	removeAllNodes(): void;
    /**
     * 获取指定节点的索引位置
     */
	getNodeIndex(node: ISchemaNode): number;
    /**
     * 是否包含有某个节点，当节点为子项或自身时都返回true。
     * @param node 目标节点
     * @param recursive 是否递归
     * @return
     */
	contains(node: ISchemaNode, recursive: boolean): boolean;
    /**
     * 得到当前域一个节点，该节点为递归方法，会逐层向外进行查找，在当前域中找不到会去寻找父级域。
     * 该方法的目的是查找某一种数据类型在当前可用域中的定义，所以该节点必须是ISchemaName类型。
     * @param qName 节点名
     * @param nodeType 节点类型
     * @param recursive 是否递归
     */
	getNodeInDomain(qName: QName, nodeType: string, recursive?: boolean): ISchemaName;

    /**
     * 从当前节点向内部开始遍历，得到指定的节点列表。
     * @param qName 节点的名字
     * @param type 节点的类型，如果为null则忽视节点类型
     * @param recursive 是否从根节点开始递归到每个子节点
     * @return
     */
	getNodes(qName: QName, type?: string, recursive?: boolean): ISchemaNode[];
}

export class SchemaContainerChecker {
	public static isTypeOf(target: any): boolean {
		if (target instanceof Attribute)
			return true;
		if (target instanceof AttributeGroup)
			return true;
		if (target instanceof Choice)
			return true;
		if (target instanceof ComplexType)
			return true;
		if (target instanceof Element)
			return true;
		if (target instanceof Group)
			return true;
		if (target instanceof Restriction)
			return true;
		if (target instanceof Schema)
			return true;
		if (target instanceof SimpleType)
			return true;
		if (target instanceof SchemaContainer)
			return true;
		return false;
	}
}


/**
 * 具有name属性的节点
 */
export interface ISchemaName extends ISchemaNode {
    /**
     * 节点的name属性值
     */
	name: string;
    /**
     * 目标xml中与之对应的qName。
     * 该QName的命名空间为所在xsd的targetNamespace。
     */
	qName: QName;
}


export class SchemaNameChecker {
	public static isTypeOf(target: any): boolean {
		if (target instanceof Attribute)
			return true;
		if (target instanceof AttributeGroup)
			return true;
		if (target instanceof ComplexType)
			return true;
		if (target instanceof Element)
			return true;
		if (target instanceof Group)
			return true;
		if (target instanceof SimpleType)
			return true;
		return false;
	}
}


/**
 * 一个基本xsd节点
 */
export interface ISchemaNode {
    /**
     * 当前节点的xml定义
     */
	definition: sax.Tag;
    /**
     * 父节点的xml定义，可能为null
     */
	parentDefinition: sax.Tag;
    /**
     * 父级节点
     */
	parent: ISchemaContainer;
    /**
     * 解析xml定义
     * @param definition 要解析的xml定义
     * @param parentDefinition 要解析的父级xml定义，可能为null
     * @param parentNode 要解析的父级节点，可能为null
     * @param root 根节点，用传入的方式目的是为了更快，向上递归获得相比较而言比较消耗性能。
     * @return
     */
	decode(definition: sax.Tag, parentDefinition: sax.Tag, parentNode: ISchemaContainer, root: ISchemaContainer): void;
    /**
     * 得到根节点，一般来讲根节点一定是Schema
     */
	root: ISchemaContainer;
    /**
     * 节点类型
     */
	nodeType: string;
}

export class SchemaNodeChecker {
	public static isTypeOf(target: any): boolean {
		if (target instanceof Any)
			return true;
		if (target instanceof Attribute)
			return true;
		if (target instanceof AttributeGroup)
			return true;
		if (target instanceof Choice)
			return true;
		if (target instanceof ComplexType)
			return true;
		if (target instanceof Element)
			return true;
		if (target instanceof Group)
			return true;
		if (target instanceof Restriction)
			return true;
		if (target instanceof Schema)
			return true;
		if (target instanceof SimpleType)
			return true;
		if (target instanceof SchemaContainer)
			return true;
		if (target instanceof SchemaNode)
			return true;
		return false;
	}
}

/**
 * 含有引用节点
 */
export interface ISchemaRef extends ISchemaNode {
    /**
     * 引用
     */
	ref: ISchemaNode;
    /**
     * 如果存在引用则返回引用，如果不存在则返回本身。
     */
	resolveForRef: ISchemaNode;
}

export class SchemaRefChecker {
	public static isTypeOf(target: any): boolean {
		if (target instanceof Attribute)
			return true;
		if (target instanceof AttributeGroup)
			return true;
		if (target instanceof Element)
			return true;
		if (target instanceof Group)
			return true;
		return false;
	}
}

export interface ISchemaType extends ISchemaNode {
	type: ISchemaNode;
}

export class SchemaTypeChecker {
	public static isTypeOf(target: any): boolean {
		if (target instanceof Element)
			return true;
		return false;
	}
}

/**
 * 可以获得取值列表的节点
 */
export interface ISchemaValues extends ISchemaNode {
	values: any[];
}

export class SchemaValuesChecker {
	public static isTypeOf(target: any): boolean {
		if (target instanceof Attribute)
			return true;
		if (target instanceof Restriction)
			return true;
		if (target instanceof SimpleType)
			return true;
		return false;
	}
}


/**
 * 节点基类
 *
 */
export class SchemaNode implements ISchemaNode {
	public constructor() {
	}

    /**
     * 解析xml定义
     * @param definition 要解析的xml定义
     * @param parentDefinition 要解析的父级xml定义，可能为null
     * @param parentNode 要解析的父级节点，可能为null
     * @return
     */
	public decode(definition: sax.Tag, parentDefinition: sax.Tag, parentNode: ISchemaContainer, root: ISchemaContainer): void {
		this._definition = definition;
		this._parentDefinition = parentDefinition;
		this._parent = parentNode;
		this._root = root;
	}
	private _definition: sax.Tag;
    /**
     * 当前节点的xml定义
     */
	public get definition(): sax.Tag {
		return this._definition;
	}

	private _parent: ISchemaContainer;
    /**
     * 父级节点
     */
	public get parent(): ISchemaContainer {
		return this._parent;
	}
    /**
     * 设置父级节点
     * @param $parent
     */
	setParent($parent: ISchemaContainer): void {
		this._parent = $parent;
	}

	private _parentDefinition: sax.Tag;
    /**
     * 父节点的xml定义，可能为null
     */
	public get parentDefinition(): sax.Tag {
		return this._parentDefinition;
	}

	private _root: ISchemaContainer;
    /**
     * 得到根节点，一般来讲根节点一定是Schema
     */
	public get root(): ISchemaContainer {
		return this._root;
	}

    /**
     * 设置根节点
     * @param $root
     */
	setRoot($root: ISchemaContainer): void {
		this._root = $root;
		let container: ISchemaContainer = <ISchemaContainer><any>this;
		for (let i: number = 0; i < container.numChildren; i++) {
			let childNode: SchemaNode = <SchemaNode><any>container.getNodeAt(i);
			if (childNode) {
				childNode.setRoot(this._root);
			}
		}
	}

	public get nodeType(): string {
		return '';
	}
}
/**
 * xsd节点的容器基类，实现了接口里的所有方法。
 */
export class SchemaContainer extends SchemaNode implements ISchemaContainer {
	private _children: ISchemaNode[] = [];
	public constructor() {
		super();
	}
    /**
     * 子节点数量
     */
	public get numChildren(): number {
		return this._children.length;
	}
    /**
     * 获取指定索引位置的子节点
     */
	public getNodeAt(index: number): ISchemaNode {
		if (index < this._children.length && index >= 0)
			return this._children[index];
		return null;
	}
    /**
     * 添加子节点
     */
	public addNode(node: ISchemaNode): ISchemaNode {
		this._children.push(node);
		if (node instanceof SchemaNode) {
			(<SchemaNode>node).setParent(<ISchemaContainer><any>this);
			(<SchemaNode>node).setRoot(this.root);
		}
		return node;
	}

    /**
     * 添加子节点到指定的索引位置
     */
	public addNodeAt(node: ISchemaNode, index: number): ISchemaNode {
		if (index >= this._children.length) {
			this._children.push(node);
		} else if (index <= 0) {
			this._children.unshift(node);
		} else {
			this._children.push(node);
			for (let i: number = this._children.length - 1; i > index; i++) {
				this._children[i] = this._children[i - 1];
			}
			this._children[index] = node;
		}
		if (node instanceof SchemaNode) {
			(<SchemaNode>node).setParent(<ISchemaContainer><any>this);
			(<SchemaNode>node).setRoot(this.root);
		}
		return node;
	}

    /**
     * 移除子节点
     */
	public removeNode(node: ISchemaNode): ISchemaNode {
		let deletedNode: ISchemaNode;
		let index: number = this._children.indexOf(node);
		if (index !== -1) {
			this._children.splice(index, 1);
		}
		if (node && node instanceof SchemaNode) {
			(<SchemaNode>node).setParent(null);
			(<SchemaNode>node).setRoot(null);
		}
		return node;
	}

    /**
     * 移除指定索引位置的子节点
     */
	public removeNodeAt(index: number): ISchemaNode {
		if (index >= this._children.length) {
			return null;
		}
		if (index < 0) {
			return null;
		}
		let deletedNode: ISchemaNode;
		deletedNode = this._children[index];
		this._children.splice(index, 1);
		if (deletedNode && deletedNode instanceof SchemaNode) {
			(<SchemaNode>deletedNode).setParent(null);
			(<SchemaNode>deletedNode).setRoot(null);
		}
		return deletedNode;
	}

    /**
     * 移除所有节点
     */
	public removeAllNodes(): void {
		while (this._children.length > 0) {
			let schemaNode: ISchemaNode = this._children.pop();
			if (schemaNode && schemaNode instanceof SchemaNode) {
				(<SchemaNode>schemaNode).setParent(null);
				(<SchemaNode>schemaNode).setRoot(null);
			}
		}
	}

    /**
     * 获取指定节点的索引位置
     */
	public getNodeIndex(node: ISchemaNode): number {
		let targetIndex: number = -1;
		for (let i: number = 0; i < this._children.length; i++) {
			if (this._children[i] === node) {
				targetIndex = i;
				break;
			}
		}
		return targetIndex;
	}
    /**
     * 是否包含有某个节点，当节点为子项或自身时都返回true。
     * @param node 目标节点
     * @param recursive 是否递归
     * @return
     *
     */
	public contains(node: ISchemaNode, recursive: boolean): boolean {
		if (this === node) return true;
		if (!recursive) {
			for (let i: number = 0; i < this._children.length; i++) {
				if (this._children[i] === node) {
					return true;
				}
			}
			return false;
		} else {
			return this.containsHandler(this, node);
		}
	}

	private containsHandler(current: ISchemaNode, target: ISchemaNode): boolean {
		if (current === target) return true;
		if (SchemaContainerChecker.isTypeOf(current)) {
			let currentContainer: ISchemaContainer = <ISchemaContainer><any>current;
			for (let i: number = 0; i < currentContainer.numChildren; i++) {
				let result: boolean = this.containsHandler(currentContainer.getNodeAt(i), target);
				if (result) return true;
			}
		}
		return false;
	}

    /**
     * 得到当前域一个节点，该节点为递归方法，会逐层向外进行查找，在当前域中找不到会去寻找父级域。
     * 该方法的目的是查找某一种数据类型在当前可用域中的定义，所以该节点必须是ISchemaName类型。
     * @param qName 节点名
     * @param type 节点类型
     */
	public getNodeInDomain(qName: QName, nodeType: string, recursive: Boolean = false): ISchemaName {
		let target: ISchemaName;
		if (!recursive) {
			for (let i: number = 0; i < this.numChildren; i++) {
				let child: ISchemaName = this.getNodeAt(i) as ISchemaName;
				if (child && SchemaNameChecker.isTypeOf(child) && child.qName && child.qName.localName === qName.localName && child.qName.uri === qName.uri && child.nodeType === nodeType) {
					target = child;
					break;
				}
			}
			return target;
		}
		target = this.getNodeInDomainHandler(<ISchemaContainer><any>this, qName, nodeType);
		return target;
	}

	private getNodeInDomainHandler(current: ISchemaContainer, qName: QName, nodeType: string): ISchemaName {
		let target: ISchemaName;
		for (let i: number = 0; i < current.numChildren; i++) {
			let child: ISchemaName = current.getNodeAt(i) as ISchemaName;
			if (child && SchemaNameChecker.isTypeOf(child) && child.qName && child.qName.localName === qName.localName && child.qName.uri === qName.uri && child.nodeType === nodeType) {
				target = child;
				break;
			}
		}
		if (target) return target;
		else {
			let parent: ISchemaContainer = current.parent;
			if (parent)
				return this.getNodeInDomainHandler(parent, qName, nodeType);
			else
				return null;
		}
	}

    /**
     * 从当前节点向内部开始遍历，得到指定的节点列表。
     * @param qName 节点的名字
     * @param type 节点的类型，如果为null则忽视节点类型
     * @param recursive 是否从根节点开始递归到每个子节点
     * @return
     *
     */
	public getNodes(qName: QName, type: string = null, recursive: Boolean = false): ISchemaNode[] {
		let result: ISchemaNode[] = [];
		if (!recursive) {
			for (let i: number = 0; i < this._children.length; i++) {
				let currentNode: ISchemaName = this._children[i] as ISchemaName;
				if (currentNode && SchemaNameChecker.isTypeOf(currentNode) && currentNode.qName && currentNode.qName.localName === qName.localName && currentNode.qName.uri === qName.uri) {
					if (!type) {
						result.push(currentNode);
					} else {
						if (currentNode.nodeType === type) {
							result.push(currentNode);
						}
					}
				}
			}
		} else {
			this.getNodesHandler(this, result, qName, type);
		}
		return result;
	}

	private getNodesHandler(current: ISchemaContainer, result: ISchemaNode[], qName: QName, type: string = null): void {
		for (let i: number = 0; i < current.numChildren; i++) {
			let currentNameNode: ISchemaName = current.getNodeAt(i) as ISchemaName;
			if (currentNameNode && SchemaNameChecker.isTypeOf(currentNameNode) && currentNameNode.qName && currentNameNode.qName.localName === qName.localName && currentNameNode.qName.uri === qName.uri) {
				if (!type) {
					result.push(currentNameNode);
				} else {
					if (currentNameNode.nodeType === type) {
						result.push(currentNameNode);
					}
				}
			}
			let currentContainerNode: ISchemaContainer = current.getNodeAt(i) as ISchemaContainer;
			if (currentContainerNode && SchemaContainerChecker.isTypeOf(currentContainerNode)) {
				this.getNodesHandler(currentContainerNode, result, qName, type);
			}
		}
	}

    /**
     * 解析子项
     */
	protected decodeChildren(): void {
		// 先把所有的类型缓存进当前的列表里。稍后再解析。本次解析只对name进行赋值,并不会处理内部详细解析。
		let xmllist: sax.Tag[] = this.definition.children;
		let tempName: number = Math.random() * 10000;
		let nodesCache: NodeCache[] = [];
		for (let i: number = 0; i < xmllist.length; i++) {
			let xml: sax.Tag = xmllist[i];
			let childQName: QName = new QName(xml.namespace, xml.localName);
			// 先判断是否是内置类型
			if (SchemaUtil.isBuiltInType(childQName)) {
				let node: ISchemaNode = null;
				switch (childQName.localName) {
					case 'all':
						break;
					case 'annotation':
						break;
					case 'any':
						node = new Any();
						break;
					case 'anyAttribute':
						break;
					case 'appInfo':
						break;
					case 'attribute':
						node = new Attribute();
						break;
					case 'attributeGroup':
						node = new AttributeGroup();
						break;
					case 'choice':
						node = new Choice();
						break;
					case 'complexContent':
						break;
					case 'complexType':
						node = new ComplexType();
						break;
					case 'documentation':
						break;
					case 'element':
						node = new Element();
						break;
					case 'extension':
						break;
					case 'field':
						break;
					case 'group':
						node = new Group();
						break;
					case 'import':
						break;
					case 'include':
						break;
					case 'key':
						break;
					case 'keyref':
						break;
					case 'list':
						break;
					case 'notation':
						break;
					case 'redefine':
						break;
					case 'restriction':
						node = new Restriction();
						break;
					case 'schema':
						node = new Schema();
						break;
					case 'selector':
						break;
					case 'sequence':
						break;
					case 'simpleContent':
						break;
					case 'simpleType':
						node = new SimpleType();
						break;
					case 'union':
						break;
					case 'unique':
						break;
					default:
						break;
				}
				if (node) {
					nodesCache.push(new NodeCache(node, xml));
					if (SchemaNameChecker.isTypeOf(node)) {
						(<ISchemaName>node).name = xml.attributes['name'];
						(<ISchemaName>node).qName = new QName((<Schema>this.root).targetNamespace.uri, (<ISchemaName>node).name);
					}
					this.addNode(node);
				}
			}
		}
		for (let i = 0; i < nodesCache.length; i++) {
			nodesCache[i].node.decode(nodesCache[i].definition, this.definition, this, this.root);
		}
	}
}

class NodeCache {
	public node: ISchemaNode;
	public definition: sax.Tag;

	public constructor($node?: ISchemaNode, $definition?: sax.Tag) {
		this.node = $node;
		this.definition = $definition;
	}
}


/**
 * schema节点的类型
 */
export class SchemaNodeType {
    /**
     * 规定子元素能够以任意顺序出现，每个子元素可出现零次或一次。
     */
	public static ALL: string = 'all';
    /**
     * annotation 元素是一个顶层元素，规定 schema 的注释。
     */
	public static ANNOTATION: string = 'annotation';
    /**
     * 使创作者可以通过未被 schema 规定的元素来扩展 XML 文档。
     */
	public static ANY: string = 'any';
    /**
     * 使创作者可以通过未被 schema 规定的属性来扩展 XML 文档。
     */
	public static ANY_ATTRIBUTE: string = 'anyAttribute';
    /**
     * 规定 annotation 元素中应用程序要使用的信息。
     */
	public static APP_INFO: string = 'appInfo';
    /**
     * 定义一个属性。
     */
	public static ATTRIBUTE: string = 'attribute';
    /**
     * 定义在复杂类型定义中使用的属性组。
     */
	public static ATTRIBUTE_GROUP: string = 'attributeGroup';
    /**
     * 仅允许在 <choice> 声明中包含一个元素出现在包含元素中。
     */
	public static CHOICE: string = 'choice';
    /**
     * 定义对复杂类型（包含混合内容或仅包含元素）的扩展或限制。
     */
	public static COMPLEX_CONTENT: string = 'complexContent';
    /**
     * 定义复杂类型。
     */
	public static COMPLEX_TYPE: string = 'complexType';
    /**
     * 定义 schema 中的文本注释。
     */
	public static DOCUMENTATION: string = 'documentation';
    /**
     * 定义元素。
     */
	public static ELEMENT: string = 'element';
    /**
     * 扩展已有的 simpleType 或 complexType 元素。
     */
	public static EXTENSION: string = 'extension';
    /**
     * 规定 XPath 表达式，该表达式规定用于定义标识约束的值。
     */
	public static FIELD: string = 'field';
    /**
     * 定义在复杂类型定义中使用的元素组。
     */
	public static GROUP: string = 'group';
    /**
     * 向一个文档添加带有不同目标命名空间的多个 schema。
     */
	public static IMPORT: string = 'import';
    /**
     * 向一个文档添加带有相同目标命名空间的多个 schema。
     */
	public static INCLUDE: string = 'include';
    /**
     * 指定属性或元素值（或一组值）必须是指定范围内的键。
     */
	public static KEY: string = 'key';
    /**
     * 规定属性或元素值（或一组值）对应指定的 key 或 unique 元素的值。
     */
	public static KEYREF: string = 'keyref';
    /**
     * 把简单类型定义为指定数据类型的值的一个列表。
     */
	public static LIST: string = 'list';
    /**
     * 描述 XML 文档中非 XML 数据的格式。
     */
	public static NOTATION: string = 'notation';
    /**
     * 重新定义从外部架构文件中获取的简单和复杂类型、组和属性组。
     */
	public static REDEFINE: string = 'redefine';
    /**
     * 定义对 simpleType、simpleContent 或 complexContent 的约束。
     */
	public static RESTRICTION: string = 'restriction';
    /**
     * 定义 schema 的根元素。
     */
	public static SCHEMA: string = 'schema';
    /**
     * 指定 XPath 表达式，该表达式为标识约束选择一组元素。
     */
	public static SELECTOR: string = 'selector';
    /**
     * 要求子元素必须按顺序出现。每个子元素可出现 0 到任意次数。
     */
	public static SEQUENCE: string = 'sequence';
    /**
     * 包含对 complexType 元素的扩展或限制且不包含任何元素。
     */
	public static SIMPLE_CONTENT: string = 'simpleContent';
    /**
     * 定义一个简单类型，规定约束以及关于属性或仅含文本的元素的值的信息。
     */
	public static SIMPLE_TYPE: string = 'simpleType';
    /**
     * 定义多个 simpleType 定义的集合。
     */
	public static UNION: string = 'union';
    /**
     * 指定属性或元素值（或者属性或元素值的组合）在指定范围内必须是唯一的。
     */
	public static UNIQUE: string = 'unique';
}

export class All {
	public constructor() {
	}
}

/**
 * any 元素使来自指定命名空间的任何元素可以显示在包含 sequence 或 choice 元素中。<br/>
 * 该元素使创作者可以通过未被 schema 规定的元素来扩展 XML 文档。<br/>
 * <b>出现次数:</b>无限制<br/>
 * <b>父元素:</b>choice、sequence<br/>
 * <b>内容:</b>annotation
 */
export class Any extends SchemaNode implements ISchemaAny {
	public constructor() {
		super();
	}

	private _nameSpace: string = '';
	public get nameSpace(): string {
		return this._nameSpace;
	}

	public set nameSpace(value: string) {
		this._nameSpace = value;
	}


	public decode(definition: sax.Tag, parentDefinition: sax.Tag, parentNode: ISchemaContainer, root: ISchemaContainer): void {
		super.decode(definition, parentDefinition, parentNode, root);
		if (definition.attributes['namespace'])
			this._nameSpace = definition.attributes['namespace'];

		if (!(parentNode instanceof Choice) && !(parentNode instanceof Sequence)) {
			throw new Error('any的父级节点必须(choice | sequence)');
		}
	}

    /**
     * 是否可以代表指定节点
     * @param node
     * @return
     */
	public isTypeOf(node: ISchemaNode): boolean {
		// todo，完善any的处理。现在特殊处理，any不做任何操作
		if (this._nameSpace === '##other')
			return false;

		for (let i: number = 0; i < this._elements.length; i++) {
			if (this._elements[i] === node) {
				return true;
			}
		}
		return false;
	}
    /**
     * 得到指定位置的元素
     * @param index
     * @return
     */
	public getNodeAt(index: number): ISchemaNode {
		// todo，完善any的处理。现在特殊处理，any不做任何操作
		if (this._nameSpace === '##other')
			return null;
		if (index < 0) return null;
		if (index >= this._elements.length) return null;
		return this._elements[index];
	}
    /**
     * 可以代表的元素数量
     * @return
     */
	public get numNode(): number {
		// todo，完善any的处理。现在特殊处理，any不做任何操作
		if (this._nameSpace === '##other')
			return 0;
		return this._elements.length;
	}

	private _elements: Element[] = [];
	public refresh(): void {
		this._elements.length = 0;
		if (this.root) {
			for (let i: number = 0; i < this.root.numChildren; i++) {
				if (this.root.getNodeAt(i) instanceof Element) {
					this._elements.push(<Element>this.root.getNodeAt(i));
				}
			}
		}
	}
}

/**
 * attribute 元素定义一个属性。<br/>
 * <b>出现次数:</b>在 schema 元素中定义一次。 在复杂类型或属性组中引用多次。<br/>
 * <b>父元素:</b>attributeGroup、schema、complexType、restriction (simpleContent)、extension (simpleContent)、restriction (complexContent)、extension (complexContent)<br/>
 * <b>内容:</b>	annotation、simpleType
 */
export class Attribute extends SchemaContainer implements ISchemaName, ISchemaValues, ISchemaRef {
	private _name: string;
    /**
     * 可选。规定属性的名称。name 和 ref 属性不能同时出现。
     */
	public get name(): string {
		return this._name;
	}
	public set name(value: string) {
		this._name = value;
	}

	private _qName: QName;
	public get qName(): QName {
		return this._qName;
	}

	public set qName(value: QName) {
		this._qName = value;
	}

	// 当前attribute的引用
	private _ref: Attribute;
    /**
     * 当前attribute的引用
     */
	public get ref(): ISchemaNode {
		return this._ref;
	}
	public set ref(value: ISchemaNode) {
		this._ref = value as Attribute;
	}

	public get resolveForRef(): ISchemaNode {
		if (!this.ref) return this;
		return this.ref;
	}

	// 当前简单数据类型
	private _type: SimpleType;
    /**
     * 当前简单数据类型
     */
	public get type(): SimpleType {
		return this._type;
	}

	public set type(value: SimpleType) {
		this._type = value;
	}

	public decode(definition: sax.Tag, parentDefinition: sax.Tag, parentNode: ISchemaContainer, root: ISchemaContainer): void {
		super.decode(definition, parentDefinition, parentNode, root);
		// ref
		let attributeRef: QName;
		if (definition.attributes['ref'])
			attributeRef = SchemaUtil.getQNameForPrefixedName(definition.attributes['ref'], root as Schema, definition, true);
		// name
		let attributeName: string = definition.attributes['name'];

		// type
		let attributeType: QName;
		if (definition.attributes['type'])
			attributeType = SchemaUtil.getQNameForPrefixedName(definition.attributes['type'], root as Schema, definition, true);

		// 不存在name并且父级就是根节点
		if (parentNode === root && !attributeName) {
			throw new Error('父元素是 schema 元素，该attribute节点必须存在name属性');
		}
		if (attributeName && attributeRef) {
			throw new Error('attribute中不允许name与ref共存');
		}
		// 规定内建的数据类型或简单类型。type 属性只能在内容不包含 simpleType 元素时出现。
		if (this.checkHasSimpleType(definition) && attributeType) {
			throw new Error('attribute中type 属性只能在内容不包含 simpleType 元素时出现。');
		}
		if (attributeRef) {
			this._ref = parentNode.getNodeInDomain(attributeRef, SchemaNodeType.ATTRIBUTE, true) as Attribute;
			if (!(this._ref instanceof Attribute))
				this._ref = null;
			if (!this._ref)
				throw new Error('attribute参考的ref:' + definition.attributes['ref'] + '未定义');
		}

		if (attributeType) {
			// 如果是内置的
			if (SchemaUtil.isBuiltInType(attributeType)) {
				this._values = SchemaUtil.getBuiltInDataValues(attributeType.localName);
			} else {
				this._type = parentNode.getNodeInDomain(attributeType, SchemaNodeType.SIMPLE_TYPE, true) as SimpleType;
				if (!(this._type instanceof SimpleType))
					this._type = null;
				if (!this._type) {
					throw new Error('attribute的数据类型type:' + definition.attributes['type'] + '未定义');
				}
			}
		}
		if (!(parentNode instanceof AttributeGroup) && !(parentNode instanceof Schema) && !(parentNode instanceof ComplexType) && !(parentNode instanceof Restriction) &&
			!(parentNode instanceof SimpleContent) && !(parentNode instanceof Extension) && !(parentNode instanceof ComplexContent)) {
			throw new Error('attribute的父级节点必须(attributeGroup | schema | complexType | restriction | simpleContent | extension | complexContent)');
		}
		this.decodeChildren();
	}

	// 检查xml定义的子项中是否含有SimpleType
	private checkHasSimpleType(definition: sax.Tag): boolean {
		let xmllist: sax.Tag[] = definition.children;
		for (let i: number = 0; i < xmllist.length; i++) {
			let xml: sax.Tag = xmllist[i];
			let childQName: QName = new QName(xml.namespace, xml.localName);
			// 先判断是否是内置类型
			if (SchemaUtil.isBuiltInType(childQName)) {
				if (childQName.localName === 'simpleType') {
					return true;
				}
			}
		}
		return false;
	}

	private _values: any[];
	public get values(): any[] {
		// 有没有ref，如果有ref就返回ref的values。
		if (this._ref) return this._ref.values;
		// 再看是否有type，如果有就返回type的values。
		if (this._type) return this._type.values;
		// 先看是否已经有_valuse了，如果有就直接返回。
		if (this._values) return this._values;
		// 再看子项有没有values，如果有就返回子项的values。
		let tempvalues: any[] = [];
		for (let i: number = 0; i < this.numChildren; i++) {
			let node: ISchemaNode = this.getNodeAt(i);
			if (SchemaValuesChecker.isTypeOf(node)) {
				let childValues: any[] = (<ISchemaValues>node).values;
				for (let j: number = 0; j < childValues.length; j++) {
					tempvalues.push(childValues[j]);
				}
			}
		}
		return tempvalues;
	}

	public get nodeType(): string {
		return SchemaNodeType.ATTRIBUTE;
	}
}

/**
 * attributeGroup 元素用于对属性声明进行组合，这样这些声明就能够以组合的形式合并到复杂类型中。<br/>
 * <b>出现次数:</b>无限制<br/>
 * <b>父元素:</b>attributeGroup、complexType、schema、restriction (simpleContent)、extension (simpleContent)、restriction (complexContent)、extension (complexContent)<br/>
 * <b>内容:</b>annotation、attribute、attributeGroup、anyAttribute<br/>
 * <b></b><br/>
 */
export class AttributeGroup extends SchemaContainer implements ISchemaName, ISchemaRef {
	private _name: string;

    /**
     * 可选。规定属性组的名称。name 和 ref 属性不能同时出现。
     * @return
     *
     */
	public get name(): string {
		return this._name;
	}
	public set name(value: string) {
		this._name = value;
	}

	private _qName: QName;
	public get qName(): QName {
		return this._qName;
	}
	public set qName(value: QName) {
		this._qName = value;
	}

	// 当前attribute的引用
	private _ref: AttributeGroup;
    /**
     * 当前attribute的引用
     */
	public get ref(): ISchemaNode {
		return this._ref;
	}

	public set ref(value: ISchemaNode) {
		this._ref = value as AttributeGroup;
	}

	public get resolveForRef(): ISchemaNode {
		if (!this.ref) return this;
		return this.ref;
	}

	public decode(definition: sax.Tag, parentDefinition: sax.Tag, parentNode: ISchemaContainer, root: ISchemaContainer): void {
		super.decode(definition, parentDefinition, parentNode, root);
		// ref
		let attributeGroupRef: QName;
		if (definition.attributes['ref'])
			attributeGroupRef = SchemaUtil.getQNameForPrefixedName(definition.attributes['ref'], root as Schema, definition, true);
		// name
		let attributeGroupName: String = definition.attributes['name'];

		// 不存在name并且父级就是根节点
		if (parentNode === root && !attributeGroupName) {
			throw new Error('父元素是 schema 元素，该attributeGroup节点必须存在name属性');
		}
		if (attributeGroupName && attributeGroupRef) {
			throw new Error('attributeGroup中不允许name与ref共存');
		}
		if (attributeGroupRef) {
			this._ref = parentNode.getNodeInDomain(attributeGroupRef, SchemaNodeType.ATTRIBUTE_GROUP, true) as AttributeGroup;
			if (!(this._ref instanceof AttributeGroup))
				this._ref = null;
			if (!this._ref)
				throw new Error('attributeGroup参考的ref:' + definition.attributes['ref'] + '未定义');
		}

		if (!(parentNode instanceof AttributeGroup) && !(parentNode instanceof ComplexType) && !(parentNode instanceof Schema) && !(parentNode instanceof Restriction) &&
			!(parentNode instanceof SimpleContent) && !(parentNode instanceof Extension) && !(parentNode instanceof ComplexContent)) {
			throw new Error('attributeGroup的父级节点必须(attributeGroup | complexType | schema | restriction | simpleContent | extension | complexContent)');
		}
		this.decodeChildren();
	}

	public get nodeType(): string {
		return SchemaNodeType.ATTRIBUTE_GROUP;
	}
}

/**
 * XML Schema 的 choice 元素仅允许包含在 <choice> 声明中的元素之一出现在包含元素中。<br/>
 * <b>出现次数:</b>在 group 和 complexType 元素中为一次；其他为无限制。<br/>
 * <b>父元素:</b>group、choice、sequence、complexType、restriction (simpleContent)、extension (simpleContent)、restriction (complexContent)、extension (complexContent)<br/>
 * <b>内容</b>annotation、any、choice、element、group、sequence<br/>
 */
export class Choice extends SchemaContainer implements ISchemaContainer {
	public constructor() {
		super();
	}

	public decode(definition: sax.Tag, parentDefinition: sax.Tag, parentNode: ISchemaContainer, root: ISchemaContainer): void {
		super.decode(definition, parentDefinition, parentNode, root);

		let timesInComplexType: number = 0;
		if (parentNode instanceof ComplexType) {
			for (let i: number = 0; i < parentNode.numChildren; i++) {
				if (parentNode.getNodeAt(i) instanceof Choice) {
					timesInComplexType++;
				}
			}
		}
		if (timesInComplexType > 1)
			throw new Error('在 complexType 元素中choice只能出现一次');

		let timesInGroup: number = 0;
		if (parentNode instanceof Group) {
			for (let i = 0; i < parentNode.numChildren; i++) {
				if (parentNode.getNodeAt(i) instanceof Choice) {
					timesInGroup++;
				}
			}
		}
		if (timesInGroup > 1)
			throw new Error('在 group 元素中choice只能出现一次');

		if (!(parentNode instanceof Group) && !(parentNode instanceof Choice) && !(parentNode instanceof Sequence) && !(parentNode instanceof ComplexType) &&
			!(parentNode instanceof Restriction) && !(parentNode instanceof SimpleContent) && !(parentNode instanceof Extension)) {
			throw new Error('choice的父级节点必须(group | choice | sequence | complexType | restriction | simpleContent | extension)');
		}
		this.decodeChildren();
	}

	public get nodeType(): string {
		return SchemaNodeType.CHOICE;
	}
}

export class ComplexContent {
	public constructor() {
	}
}


/**
 * complexType 元素定义复杂类型。复杂类型的元素是包含其他元素和/或属性的 XML 元素。<br/>
 * <b>出现次数:</b>在架构内为无限制；在元素内为一次。<br/>
 * <b>父元素:</b>element、redefine、schema<br/>
 * <b>内容</b>annotation、simpleContent、complexContent、group、all、choice、sequence、attribute、attributeGroup、anyAttribute<br/>
 */
export class ComplexType extends SchemaContainer implements ISchemaContainer, ISchemaName {
	public constructor() {
		super();
	}

	private _name: string;

    /**
     * 可选。规定元素的名称。
     */
	public get name(): string {
		return this._name;
	}
	public set name(value: string) {
		this._name = value;
	}

	private _qName: QName;
	public get qName(): QName {
		return this._qName;
	}
	public set qName(value: QName) {
		this._qName = value;
	}

	public decode(definition: sax.Tag, parentDefinition: sax.Tag, parentNode: ISchemaContainer, root: ISchemaContainer): void {
		super.decode(definition, parentDefinition, parentNode, root);
		if (!(parentNode instanceof Element) && !(parentNode instanceof Redefine) && !(parentNode instanceof Schema)) {
			throw new Error('complexType的父级节点必须(element | redefine | schema)');
		}
		this.decodeChildren();
	}

	public get nodeType(): string {
		return SchemaNodeType.COMPLEX_TYPE;
	}
}


/**
 * element 元素定义一个元素。<br/>
 * <b>出现次数:</b>在架构中定义的元素的数目。<br/>
 * <b>父元素:</b>schema、choice、all、sequence<br/>
 * <b>内容</b>simpleType、complexType、key、keyref、unique<br/>
 *
 */
export class Element extends SchemaContainer implements ISchemaName, ISchemaRef, ISchemaType {
	public constructor() {
		super();
	}

	private _name: string;
    /**
     * 可选。规定元素的名称。如果父元素是 schema 元素，则此属性是必需的。
     * @return
     *
     */
	public get name(): string {
		return this._name;
	}
	public set name(value: string) {
		this._name = value;
	}

	private _qName: QName;
	public get qName(): QName {
		return this._qName;
	}
	public set qName(value: QName) {
		this._qName = value;
	}

	// 当前attribute的引用
	private _ref: Element;
    /**
     * 当前attribute的引用
     */
	public get ref(): ISchemaNode {
		return this._ref;
	}

	public set ref(value: ISchemaNode) {
		this._ref = value as Element;
	}

	public get resolveForRef(): ISchemaNode {
		if (!this.ref) return this;
		return this.ref;
	}

	private _type: ISchemaNode;

	public get type(): ISchemaNode {
		return this._type;
	}

	public set type(value: ISchemaNode) {
		this._type = value;
	}


	public decode(definition: sax.Tag, parentDefinition: sax.Tag, parentNode: ISchemaContainer, root: ISchemaContainer): void {
		super.decode(definition, parentDefinition, parentNode, root);
		// ref
		let elementRef: QName;
		if (definition.attributes['ref'])
			elementRef = SchemaUtil.getQNameForPrefixedName(definition.attributes['ref'], root as Schema, definition, true);
		// name
		let elementName: String = definition.attributes['name'];

		// type
		let elementType: QName;
		if (definition.attributes['type'])
			elementType = SchemaUtil.getQNameForPrefixedName(definition.attributes['type'], root as Schema, definition, true);

		// 不存在name并且父级就是根节点
		if (parentNode === root && !elementName) {
			throw new Error('父元素是 schema 元素，该element节点必须存在name属性');
		}
		if (elementName && elementRef) {
			throw new Error('element中不允许name与ref共存');
		}
		if (elementRef) {
			this._ref = parentNode.getNodeInDomain(elementRef, SchemaNodeType.ELEMENT, true) as Element;
			if (!this._ref)
				throw new Error('element参考的ref:' + definition.attributes['ref'] + '未定义');
		}
		if (elementType) {
			// 如果是内置的
			if (SchemaUtil.isBuiltInType(elementType)) {

			} else {
				this._type = parentNode.getNodeInDomain(elementType, SchemaNodeType.SIMPLE_TYPE, true) as SimpleType;
				if (!(this._type instanceof SimpleType))
					this._type = null;
				if (!this._type) {
					this._type = parentNode.getNodeInDomain(elementType, SchemaNodeType.COMPLEX_TYPE, true) as ComplexType;
					if (!(this._type instanceof ComplexType))
						this._type = null;
				}
				if (!this._type) {
					throw new Error('element的数据类型type:' + definition.attributes['type'] + '未定义');
				}
			}
		}
		if (!(parentNode instanceof Schema) && !(parentNode instanceof Choice) && !(parentNode instanceof All) && !(parentNode instanceof Sequence)) {
			throw new Error('element的父级节点必须(schema | choice | all | sequence)');
		}
		this.decodeChildren();
	}

	public get nodeType(): string {
		return SchemaNodeType.ELEMENT;
	}
}

export class Extension {
	public constructor() {
	}
}

/**
 * group 元素用于定义在复杂类型定义中使用的元素组。 <br/>
 * <b>出现次数:</b>无限制<br/>
 * <b>父元素:</b>schema、choice、sequence、complexType、restriction (complexContent)、extension (complexContent)<br/>
 * <b>内容</b>annotation、all、choice、sequence<br/>
 *
 */
export class Group extends SchemaContainer implements ISchemaContainer, ISchemaName, ISchemaRef {
	public constructor() {
		super();
	}

	private _name: string;
    /**
     * 可选。规定组的名称。该名称必须是在 XML 命名空间规范中定义的无冒号名称 (NCName)。
     * <br/>
     * 仅当 schema 元素是该 group 元素的父元素时才使用该属性。在此情况下，group 是由 complexType、choice 和 sequence 元素使用的模型组。
     * <br/>
     * name 属性和 ref 属性不能同时出现。
     * @return
     *
     */
	public get name(): string {
		return this._name;
	}
	public set name(value: string) {
		this._name = value;
	}

	private _qName: QName;
	public get qName(): QName {
		return this._qName;
	}
	public set qName(value: QName) {
		this._qName = value;
	}

	// 当前attribute的引用
	private _ref: Group;
    /**
     * 当前attribute的引用
     */
	public get ref(): ISchemaNode {
		return this._ref;
	}
	public set ref(value: ISchemaNode) {
		this._ref = value as Group;
	}
	public get resolveForRef(): ISchemaNode {
		if (!this.ref) return this;
		return this.ref;
	}

	public decode(definition: sax.Tag, parentDefinition: sax.Tag, parentNode: ISchemaContainer, root: ISchemaContainer): void {
		super.decode(definition, parentDefinition, parentNode, root);

		// ref
		let groupRef: QName;
		if (definition.attributes['ref'])
			groupRef = SchemaUtil.getQNameForPrefixedName(definition.attributes['ref'], root as Schema, definition, true);
		// name
		let groupName: String = definition.attributes['name'];

		// 不存在name并且父级就是根节点
		if (parentNode === root && !groupName) {
			throw new Error('父元素是 schema 元素，该group节点必须存在name属性');
		}
		if (groupName && groupRef) {
			throw new Error('group中不允许name与ref共存');
		}
		if (groupRef) {
			this._ref = parentNode.getNodeInDomain(groupRef, SchemaNodeType.GROUP, true) as Group;
			if (!(this._ref instanceof Group))
				this._ref = null;
			if (!this._ref)
				throw new Error('group参考的ref:' + definition.attributes['ref'] + '未定义');
		}
		if (!(parentNode instanceof Schema) && !(parentNode instanceof Choice) && !(parentNode instanceof Sequence) && !(parentNode instanceof ComplexType) &&
			!(parentNode instanceof Restriction) && !(parentNode instanceof Extension)) {
			throw new Error('choice的父级节点必须(schema | choice | sequence | complexType | restriction | extension)');
		}
		this.decodeChildren();
	}

	public get nodeType(): string {
		return SchemaNodeType.GROUP;
	}
}

export class Key {
	public constructor() {
	}
}

export class Keyref {
	public constructor() {
	}
}

export class List {
	public constructor() {
	}
}

export class Redefine {
	public constructor() {
	}
}


/**
 * restriction 元素定义对 simpleType、simpleContent 或 complexContent 定义的约束。<br/>
 * <b>出现次数:</b>一次<br/>
 * <b>父元素:</b>complexContent<br/>
 * <b>内容</b>group、all、choice、sequence、attribute、attributeGroup、anyAttribute<br/>
 */
export class Restriction extends SchemaContainer implements ISchemaContainer, ISchemaBase, ISchemaValues {
	public constructor() {
		super();
	}
	private _base: QName;
    /**
     * 必需。规定在该 schema（或由指定的命名空间指示的其他 schema）
     * 中定义的内建数据类型、simpleType 或 complexType 元素的名称。
     */
	public get base(): QName {
		return this._base;
	}
	public set base(value: QName) {
		this._base = value;
	}

	private _values: any[];
	public get values(): any[] {
		if (!this._values) {
			this._values = [];
		}
		return this._values;
	}

	public set values(value: any[]) {
		this._values = value;
	}

	public decode(definition: sax.Tag, parentDefinition: sax.Tag, parentNode: ISchemaContainer, root: ISchemaContainer): void {
		super.decode(definition, parentDefinition, parentNode, root);
		if (definition.attributes['base'])
			this._base = SchemaUtil.getQNameForPrefixedName(definition.attributes['base'], root as Schema, definition, true);
		if (!this._base) {
			throw new Error('restriction节点必须存在base属性');
		}
		let xmllist: sax.Tag[] = definition.children;
		if (parentNode instanceof SimpleType) {
			if (SchemaUtil.isBuiltInType(this._base)) {
				let buildInValues: any[] = SchemaUtil.getBuiltInDataValues(this._base.localName);
				for (let i: number = 0; i < buildInValues.length; i++) {
					this.values.push(buildInValues[i]);
				}
			} else {

			}
			for (let i = 0; i < xmllist.length; i++) {
				let xml: sax.Tag = xmllist[i];
				let childQName: QName = new QName(xml.namespace, xml.localName);
				if (SchemaUtil.isBuiltInType(childQName)) {
					switch (childQName.localName) {
						case 'enumeration':
							this.values.push(xml.attributes['value'] ? xml.attributes['value'] : '');
							break;
						default:
							break;
					}
				}
			}
		} else if (parentNode instanceof SimpleContent) {

		} else if (parentNode instanceof ComplexContent) {

		}

		if (!(parentNode instanceof SimpleType) && !(parentNode instanceof SimpleContent) && !(parentNode instanceof ComplexContent)) {
			throw new Error('restriction的父级节点必须(complexContent)');
		}
	}

	public get nodeType(): string {
		return SchemaNodeType.RESTRICTION;
	}
}

/**
 * schema 元素定义 schema 的根元素。
 * <b>出现次数:</b>一次<br/>
 * <b>父元素:</b>（无父元素）<br/>
 * <b>内容:</b>include、import、annotation、redefine、attribute、attributeGroup、element、group、notation、simpleType、complexType<br/>
 * <b></b><br/>
 *
 */
export class Schema extends SchemaContainer implements ISchemaContainer {
	public constructor() {
		super();
	}

	private _targetNamespace: Namespace;
    /**
     * 该 schema 的命名空间的 URI 引用。还可以分配该命名空间的前缀。如果没有分配任何前缀，
     * 则该命名空间的 schema 组件可以和非限定的引用一起使用。
     */
	public get targetNamespace(): Namespace {
		return this._targetNamespace;
	}
	private _namespaces: any = {};
    /**
     * 规定在此 schema 中使用的一个或多个命名空间的 URI 引用。如果没有分配前缀，该命名空间的 schema 组件可与未限制的引用使用。
     */
	public get namespaces(): any {
		return this._namespaces;
	}

	private _attributeFormDefault: string = 'unqualified';
    /**
     * 可选。在该 schema 的目标命名空间中声明的属性的形式。该值必须是下列字符串之一： "qualified" 或 "unqualified"。 默认值为 "unqualified"。
     * <li>"unqualified" 指示无须通过命名空间前缀限定目标命名空间的属性。</li>
     * <li>"qualified" 指示必须通过命名空间前缀限定目标命名空间的属性。 </li>
     */
	public get attributeFormDefault(): string {
		return this._attributeFormDefault;
	}

	private _blockDefault: string;
    /**
     * 可选。规定在目标命名空间中 element 和 complexType 元素上的 block 属性的默认值。block 属性防止具有指定派生类型的复杂类型（或元素）
     * 被用来代替继承的复杂类型（或元素）。该值可以包含 #all 或者一个列表，该列表是 extension、restriction 或 substitution 的子集：
     * <li>extension - 防止通过扩展派生的复杂类型被用来替代该复杂类型。</li>
     * <li>restriction - 防止通过限制派生的复杂类型被用来替代该复杂类型。</li>
     * <li>substitution - 防止元素的替换。</li>
     * <li>#all - 防止所有派生的复杂类型被用来替代该复杂类型。 </li>
     */
	public get blockDefault(): string {
		return this._blockDefault;
	}

	private _elementFormDefault: string = 'unqualified';
    /**
     * 可选。在该 schema 的目标命名空间中声明的元素的形式。该值必须是下列字符串之一： "qualified" 或 "unqualified"。 默认值为 "unqualified"。
     * <li>"unqualified" 指示无须通过命名空间前缀限定目标命名空间的元素。</li>
     * <li>"qualified" 指示必须通过命名空间前缀限定目标命名空间的元素。</li>
     */
	public get elementFormDefault(): string {
		return this._elementFormDefault;
	}


	private _finalDefault: string;
    /**
     * 可选。规定在该架构的目标命名空间中 element、simpleType 和 complexType 元素的 final 属性的默认值。final 属性防止
     *  element、simpleType 或 complexType 元素的指定的派生类型。对于 element 和 complexType 元素，该值可以包含 #all 或一个列表，
     * 该列表是 extension 或 restriction 的子集。 对于 simpleType 元素，该值还可以包含 list 和 union：
     * <li>extension - 默认情况下，该 schema 中的元素不能通过扩展派生。仅适用于 element 和 complexType 元素。</li>
     * <li>restriction - 防止通过限制派生。</li>
     * <li>list - 防止通过列表派生。仅适用于 simpleType 元素。</li>
     * <li>union - 防止通过联合派生。仅适用于 simpleType 元素。</li>
     * <li>#all - 默认情况下，该 schema 中的元素不能通过任何方法派生。 </li>
     *
     */
	public get finalDefault(): string {
		return this._finalDefault;
	}


	public decode(definition: sax.Tag, parentDefinition: sax.Tag, parentNode: ISchemaContainer, root: ISchemaContainer): void {
		super.decode(definition, definition, null, this);

		// targetNamespace
		let tns: string = definition.attributes['targetNamespace'] ? definition.attributes['targetNamespace'] : '';
		this._targetNamespace = new Namespace('', tns);

		// attributeFormDefault="unqualified|qualified"
		this._attributeFormDefault = definition.attributes['attributeFormDefault'];
		if (!this._attributeFormDefault)
			this._attributeFormDefault = 'unqualified';

		// blockDefault=""
		this._blockDefault = definition.attributes['blockDefault'] ? definition.attributes['blockDefault'] : '';

		// elementFormDefault="unqualified|qualified"
		this._elementFormDefault = definition.attributes['elementFormDefault'];
		if (!this._elementFormDefault)
			this._elementFormDefault = 'unqualified';

		// finalDefault=""
		this._finalDefault = definition.attributes['finalDefault'] ? definition.attributes['finalDefault'] : '';

		// XSD namespaces
		let inScopeNamespaces: Namespace[] = [];
		for (let i: number = 0; i < definition.attributeNodes.length; i++) {
			if (definition.attributeNodes[i].name && definition.attributeNodes[i].name.indexOf('xmlns') === 0) {
				if (definition.attributeNodes[i].name === 'xmlns') {
					inScopeNamespaces.push(new Namespace('', definition.attributeNodes[i].value));
				} else {
					inScopeNamespaces.push(new Namespace(definition.attributeNodes[i].name.split(':')[1], definition.attributeNodes[i].value));
				}
			}
		}
		for (let i: number = 0; i < inScopeNamespaces.length; i++) {
			this._namespaces[inScopeNamespaces[i].prefix] = inScopeNamespaces[i];
		}
		// 解析子项
		this.decodeChildren();
	}

    /**
     * 得到当前的命名空间
     */
	public get xmlns(): Namespace {
		if (!this.definition) return null;
		return new Namespace(this.definition.prefix, this.definition.namespace);
	}

	public get nodeType(): string {
		return SchemaNodeType.SCHEMA;
	}
}

export class Sequence {
	public constructor() {
	}
}

export class SimpleContent {
	public constructor() {
	}
}

/**
 * simpleType 元素定义一个简单类型，规定与具有纯文本内容的元素或属性的值有关的信息以及对它们的约束。<br/>
 * <b>出现次数:</b>在架构内为无限制；在元素内为一次。<br/>
 * <b>父元素:</b>attribute、element、list、restriction (simpleType)、schema、union<br/>
 * <b>内容</b>annotation、list、restriction (simpleType)、union<br/>
 */
export class SimpleType extends SchemaContainer implements ISchemaContainer, ISchemaName, ISchemaValues {
	public constructor() {
		super();
	}

	private _name: string;
    /**
     * 类型名称。 该名称必须是在 XML 命名空间规范中定义的无冒号名称 (NCName)。<br/>
     * 如果指定，该名称在所有 simpleType 和 complexType 元素之间必须是唯一的。<br/>
     * 如果 simpleType 元素是 schema 元素的子元素，则为必选项，在其他时候则是不允许的。
     */
	public get name(): string {
		return this._name;
	}
	public set name(value: string) {
		this._name = value;
	}

	private _qName: QName;
	public get qName(): QName {
		return this._qName;
	}

	public set qName(value: QName) {
		this._qName = value;
	}

	public decode(definition: sax.Tag, parentDefinition: sax.Tag, parentNode: ISchemaContainer, root: ISchemaContainer): void {
		super.decode(definition, parentDefinition, parentNode, root);
		this.decodeChildren();
		if (!(parentNode instanceof Attribute) && !(parentNode instanceof Element) && !(parentNode instanceof List) && !(parentNode instanceof Restriction) && !(parentNode instanceof Schema) &&
			!(parentNode instanceof Union)) {
			throw new Error('complexType的父级节点必须(attribute | element | list | restriction (simpleType) | schema | union)');
		}
	}

	public get values(): any[] {
		let values: any[] = [];
		for (let i: number = 0; i < this.numChildren; i++) {
			let node: ISchemaNode = this.getNodeAt(i);
			if (SchemaValuesChecker.isTypeOf(node)) {
				let childValues: any[] = (<ISchemaValues>node).values;
				for (let j: number = 0; j < childValues.length; j++) {
					values.push(childValues[j]);
				}
			}
		}
		return values;
	}

	public get nodeType(): string {
		return SchemaNodeType.SIMPLE_TYPE;
	}
}

export class Union {
	public constructor() {
	}
}

export class Unique {
	public constructor() {
	}
}