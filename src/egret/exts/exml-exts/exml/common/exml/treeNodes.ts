import { ExmlModelConfig } from './exmlModeConfig';
import { IExmlModel } from './models';
import { Namespace } from '../sax/Namespace';
import * as sax from '../sax/sax';
import { IHashObject } from './common';
import { Event } from 'egret/base/common/event';

/**
 * 节点事件
 */
class NodeEvent {
	/**
	 * 事件目标
	 */
	target: IValue;
}



/**
 * 实例改变事件
 */
export interface InstanceChangedEvent extends NodeEvent {
}
/**
 * 节点属性改变事件，此事件只有复杂对象节点EArray,EObject及其子类会抛出。
 */
export interface PropertyChangedEvent extends NodeEvent {
	/**
	 * 发生改变的属性,字符串或者索引
	 */
	property: string | number;
	/**
	 * 发生改变的节点对象。
	 */
	value: IValue;
	/**
	 * 忽视状态
	 */
	ignoreState:boolean;
}
/**
 * 节点instance的值发生改变
 */
export interface InstanceValueChangedEvent extends NodeEvent {
	/**
	 * 发生改变的属性,字符串或者索引
	 */
	property: string | number;
}
/**
 * ENode的locked属性发生改变
 */
export interface LockedChangedEvent extends NodeEvent {
	/**
	 * 发生改变的节点对象。
	 */
	node: IValue;
}
/**
 * 可视节点移除事件
 */
export interface NodeRemovedEvent extends NodeEvent {
	/**
	 * 索引
	 */
	index: number;
	/**
	 * 节点对象
	 */
	node: IValue;
}
/**
 * 可视节点添加事件
 */
export interface NodeAddedEvent extends NodeEvent {
	/**
	 * 索引
	 */
	index: number;
	/**
	 * 节点对象
	 */
	node: IValue;
}
/**
 * 单个节点选中状态改变事件
 */
export interface NodeSelectChangedEvent extends NodeEvent {
	/**
	 * 发生改变的节点对象。
	 */
	node: IValue;
}
/**
 * 层级堆叠容器的选中项索引发生改变
 */
export interface ViewStackIndexChangedEvent extends NodeEvent {
	/**
	 * 旧的节点
	 */
	oldNode: IValue;
	/**
	 * 新的节点
	 */
	newNode: IValue;
}

/**
 * 节点树改变类型
 */
export enum TreeChangedKind {
	ADD = 'kindAdd',
	REMOVE = 'kindRemove',
	CHANGE = 'kindChange'
}
/**
 * 节点树发生改变事件,使用kind属性来区分发生改变的类型
 */
export interface TreeChangedEvent extends NodeEvent {
	/**
	 * 索引或属性名
	 */
	property: number | string;
	/**
	 * 值
	 */
	value: IValue;
	/**
	 * 类型
	 */
	kind: TreeChangedKind;
	/**
	 * 忽视状态
	 */
	ignoreState: boolean;
}









/**
 * 检查某个节点是否属于指定接口名称
 * @param instance 节点实例
 * @param interfaceName 接口名 如eui.IValue;
 */
export function isInstanceof(instance: IValue, interfaceName: string): boolean {
	return InstanceChecker.isInstanceof(instance, interfaceName);
}

/**
 * 注册一个实例类型
 * @param instance 节点实例
 * @param interfaceName 接口名 如eui.IValue;
 */
export function registerInstanceType(instanceType: string, interfaceName: string): void {
	return InstanceChecker.registerInstanceType(instanceType, interfaceName);
}

/**
 * 类型检查器
 */
class InstanceChecker {

	private static interfaceMap: { [name: string]: any } = null;
	static inited: boolean = false;

	public static registerInstanceType(instanceType: string, interfaceName: string): void {
		interfaceName = interfaceName.toLocaleLowerCase();
		const classType: string = instanceType.toLocaleLowerCase();
		if (!InstanceChecker.interfaceMap) { InstanceChecker.interfaceMap = {}; }
		let arr: string[] = InstanceChecker.interfaceMap[interfaceName];
		if (!arr) {
			InstanceChecker.interfaceMap[interfaceName] = [];
			arr = InstanceChecker.interfaceMap[interfaceName];
		}
		if (arr.indexOf(classType) === -1) {
			arr.push(classType);
		}
	}
	/**
	 * 判断A实例是否属于B接口类型
	 */
	public static isInstanceof(instance: IValue, interfaceName: string): boolean {
		if (!instance) { return false; }
		if (!InstanceChecker.interfaceMap) { InstanceChecker.interfaceMap = {}; }
		interfaceName = interfaceName.toLocaleLowerCase();
		const classTypes: string[] = InstanceChecker.interfaceMap[interfaceName];
		if (!classTypes || classTypes.length === 0) { return false; }
		if (!('getType' in instance)) { return false; }
		let type: string = instance.getType();
		type = type.toLocaleLowerCase();
		if (classTypes.indexOf(type) === -1) { return false; }
		return true;
	}
}


/**
 * 值类型节点接口
 */
export interface IValue extends IHashObject {
	/**
	 * 实例改变事件
	 */
	onInstanceChanged: Event<InstanceChangedEvent>;
	/**
	 * 节点属性改变事件，此事件只有复杂对象节点EArray,EObject及其子类会抛出。
	 */
	onPropertyChanged: Event<PropertyChangedEvent>;
	/**
	 * 节点instance的值发生改变
	 */
	onInstanceValueChanged: Event<InstanceValueChangedEvent>;
	/**
	 * ENode的locked属性发生改变
	 */
	onLockedChanged: Event<LockedChangedEvent>;
	/**
	 * 可视节点移除事件
	 */
	onNodeRemoved: Event<NodeRemovedEvent>;
	/**
	 * 可视节点添加事件
	 */
	onNodeAdded: Event<NodeAddedEvent>;
	/**
	 * 单个节点选中状态改变事件
	 */
	onNodeSelectChanged: Event<NodeSelectChangedEvent>;
	/**
	 * 层级堆叠容器的选中项索引发生改变
	 */
	onViewStackIndexChanged: Event<ViewStackIndexChangedEvent>;
	/**
	 * 节点树发生改变事件,使用kind属性来区分发生改变的类型
	 */
	onTreeChanged: Event<TreeChangedEvent>;

	/**
	 * 类型
	 */
	getType(): string;
	/**
	 * 节点id
	 */
	getId(): string;
	/**
	 * 设置节点id
	 * @param value 
	 */
	setId(value: string): void;

	/**
	 * 得到对应的数据模块配置
	 */
	getExmlConfig(): ExmlModelConfig;
	/**
	 * 得到对应的数据模块
	 */
	getExmlModel(): IExmlModel;
	/**
	 * 节点对应的值或实例引用
	 */
	getInstance(): any;
	/**
	 * 设置实例
	 * @param value 
	 */
	setInstance(value: any): void;
	/**
	 * 节点类名
	 */
	getName(): string;
	/**
	 * 节点命名空间
	 */
	getNs(): Namespace;
	/**
	 * 宿主节点,直接持有此节点的对象。
	 */
	getHost(): IValue;
	/**
	 * 当作为属性节点时，在host上是否不可修改
	 */
	getReadOnly(): boolean;
	/**
	 * 表示此节点在host节点上的属性名。
	 */
	getHostProperty(): string;
	/**
	 * 获取能定位到对应xml节点的路径列表,返回一个索引数组。
	 */
	getXmlPath(): number[];
	/**
	 * 根节点引用
	 */
	getRoot(): IValue;
	/**
	 * 是否为根节点
	 */
	getIsRoot(): boolean;
	/**
	 * 输出字符串
	 */
	toString(): string;
	/**
	 * 销毁一个value对象
	 */
	destroy(): void;
}

/**
 * 可视元素节点接口
 */
export interface INode extends IObject {
	/**
	 * 是否被锁定无法点击或选中
	 */
	getLocked(): boolean;
	/**
	 * 是否被锁定
	 * @param value 
	 */
	setLocked(value: boolean): void;
	/**
	 * 是否被选中。
	 */
	getSelected(): boolean;
	/**
	 * 设置选择
	 * @param value 
	 */
	setSelected(value: boolean): void;
	/**
	 * 是否在指定的节点树下被选中。
	 * @param rootNode 对应节点树的根节点
	 */
	isSelectedBy(rootNode: INode): boolean;
	/**
	 * 此节点是否处于显示列表中
	 */
	getInDisplayList(): boolean;
	/**
	 * 父级显示元素节点
	 */
	getParent(): IContainer;
	/**
	 * 嵌套深度
	 */
	getNestLevel(): number;
	/**
	 * 设置嵌套深度
	 * @param value 
	 */
	setNestLevel(value: number): void;
	/**
	 * 设置ESize属性值。instance为Number或类似"100%"的String，null表示要清空属性。
	 */
	setSize(property: string, instance: any): void;
	/**
	 * 设置九宫格属性值,null或空字符串表示要清空属性。
	 */
	setScale9Grid(expression: string): void;
	/**
	 * 添加Egret事件到js对象上
	 * @param type 事件的类型。
	 * @param listener 处理事件的侦听器函数。此函数必须接受 Event 对象作为其唯一的参数，并且不能返回任何结果，
	 */
	addEgretEventlistener(type: string, listener: Function, thisArg: any): void;
	/**
	 * 移除egret事件
	 * @param type 事件的类型。
	 * @param listener 要删除的侦听器对象。
	 */
	removeEgretEventlistener(type: string, listener: Function, thisArg: any): void;
}


/**
 * 含有键值对的复杂对象节点接口
 */
export interface IObject extends IValue {
	/**
	 * 获取设置过的属性名列表
	 */
	getPropertyList(): string[];
	/**
	 * 存储指定属性的值,如果value与已经存在的相同，则直接返回什么也不做。
	 * @param key 属性名
	 * @param value 值
	 * @param addToLast true表示添加到属性列表的最末尾，false添加到列表最前。默认true。
	 */
	setProperty(key: string, value: IValue, addToLast: boolean, ignoreState: boolean): void;
	/**
	 * 存储指定属性的值,如果value与已经存在的相同，则直接返回什么也不做。
	 * @param key 属性名
	 * @param value 值
	 * @param addToLast true表示添加到属性列表的最末尾，false添加到列表最前。默认true。
	 */
	setProperty(key: string, value: IValue, addToLast: boolean): void;
	/**
	 * 存储指定属性的值,如果value与已经存在的相同，则直接返回什么也不做。
	 * @param key 属性名
	 * @param value 值
	 */
	setProperty(key: string, value: IValue): void;
	/**
	 * 获取指定属性的值
	 */
	getProperty(key: string): IValue;
	/**
	 * 默认属性名
	 */
	getDefaultProp(): string;
	/**
	 * 获取属性的默认值, 注意对于UIComponent的width和height属性返回的是NaN
	 */
	getDefaultValue(key: string): any;
	/**
	 * 设置number属性值,NaN表示要清空属性。
	 */
	setNumber(property: string, instance: number): void;
	/**
	 * 设置string属性值,null表示要清空属性。
	 */
	setString(property: string, instance: string): void;
	/**
	 * 设置boolean属性值。
	 */
	setBoolean(property: string, instance: boolean): void;
	/**
	 * 设置class属性值。
	 */
	setClass(property: string, instance: string): void;
	/**
	 * 设置实例的值，此方法会直接作用于instance对象，可能会造成视图与数据不同步，请慎用
	 */
	setInstanceValue(key: string, value: any): void;
	/**
	 * 批量设置实例的值，此方法会直接作用于instance对象，可能会造成视图与数据不同步，请慎用
	 */
	setInstanceValues(props: { [key: string]: any }): void;
	/**
	 * 刷新instance的属性，与node的属性保持一致
	 */
	refresh(): void;
}

/**
 * 类定义引用节点接口
 */
export interface IClass extends IValue {
	/**
	 * 包含包路径的完整类名
	 */
	getClassName(): string;
	/**
	 * 是否是内部类
	 */
	getIsInner(): boolean;
	/**
	 * 当为内部类时，节点表示的xml对象
	 */
	getClassXML(): sax.Tag;
}

/**
 * 数组节点接口
 */
export interface IArray extends IValue {
	/**
	 * 数组长度
	 */
	getLength(): number;
	/**
	 * 获取指定索引的子节点
	 */
	getValueAt(index: number): IValue;
	/**
	 *	获取指定节点的索引
	 */
	indexOf(value: IValue): number;
	/**
	 * 添加一个节点到数组
	 */
	push(value: IValue): void;
	/**
	 * 给数组节点添加元素以及从数组节点中删除元素。
	 * @param startIndex  一个整数，它指定数组中开始进行插入或删除的位置处的元素的索引。
	 * 您可以用一个负整数来指定相对于数组结尾的位置（例如，-1 是数组的最后一个元素）。
	 * @param deleteCount 一个整数，它指定要删除的元素数量。该数量包括 startIndex
	 * 参数中指定的元素。如果没有为 deleteCount 参数指定值，则该方法将删除从 startIndex
	 * 元素到数组中最后一个元素的所有值。如果该参数的值为 0，则不删除任何元素。
	 * @param value 插入的节点
	 */
	splice(startIndex: number, deleteCount: number, value: IValue): void;
	/**
	 * 给数组节点添加元素以及从数组节点中删除元素。
	 * @param startIndex  一个整数，它指定数组中开始进行插入或删除的位置处的元素的索引。
	 * 您可以用一个负整数来指定相对于数组结尾的位置（例如，-1 是数组的最后一个元素）。
	 * @param deleteCount 一个整数，它指定要删除的元素数量。该数量包括 startIndex
	 * 参数中指定的元素。如果没有为 deleteCount 参数指定值，则该方法将删除从 startIndex
	 * 元素到数组中最后一个元素的所有值。如果该参数的值为 0，则不删除任何元素。
	 */
	splice(startIndex: number, deleteCount: number): void;
}

/**
 * 显示元素容器节点接口
 */
export interface IContainer extends INode {
	/**
	 * 子节点数量
	 */
	getNumChildren(): number;
	/**
	 * 获取指定索引位置的子节点
	 */
	getNodeAt(index: number): INode;
	/**
	 * 添加子节点
	 */
	addNode(node: INode): INode;
	/**
	 * 添加子节点到指定的索引位置
	 */
	addNodeAt(node: INode, index: number): INode;
	/**
	 * 移除子节点
	 */
	removeNode(node: INode): INode;
	/**
	 * 移除指定索引位置的子节点
	 */
	removeNodeAt(index: number): INode;
	/**
	 * 移除所有节点
	 */
	removeAllNodes(): void;
	/**
	 * 获取指定节点的索引位置
	 */
	getNodeIndex(node: INode): number;
	/**
	 * 设置指定节点的索引位置
	 */
	setNodeIndex(node: INode, index: number): void;
	/**
	 * 交换两个子节点的位置
	 */
	swapNodes(node1: INode, node2: INode): void;
	/**
	 * 交换两个指定索引位置的子节点
	 */
	swapNodesAt(index1: number, index2: number): void;
	/**
	 * 是否包含有某个节点，当节点为子项或自身时都返回true。
	 */
	contains(node: INode): boolean;
}

/**
 * 链接值类型节点接口
 */
export interface ILink extends IValue {
	/**
	 * 根据ID获取对应的值节点
	 */
	getRelativeByID(id: string): IValue;
	/**
	 * 添加一个引用的ID节点
	 */
	addRelatives(values: IValue[]): void;
	/**
	 * 关联的id列表
	 */
	getRelativeIdList(): string[];
}

/**
 * 九宫格数据接口
 */
export interface IScale9Grid {
	/**
	 * 由四个数字组成的字符串表达式。
	 */
	getExpression(): string;
}

/**
 * 只含有一个子项的容器节点接口
 */
export interface ISingleChild extends INode {
	/**
	 * 当前的直接子项
	 */
	getDirectChild(): INode;
	/**
	 * 设置当前的直接子项
	 * @param value 
	 */
	setDirectChild(value: INode): void;
}

/**
 * 视域滚动容器节点接口。例如Scroller,它虽然继承于EContainer，
 * 但子项数量限制为一个，且只能通过viewport属性改变子项，无法通过EContainer的addNode()等方法修改。
 */
export interface IScroller extends IContainer, ISingleChild {

}

/**
 * 尺寸类型节点接口。通常用于表示width,percentWidth,height和percentHeight的值。
 * 设置instance为数字表示修改width和height，设置instance为类似"100%"的字符串表示修改percentWidth和percentHeight。
 */
export interface ISize extends IValue {

}

/**
 * 层级堆叠容器节点接口
 */
export interface IViewStack extends IContainer, ISingleChild {
	/**
	 * 当前可见子元素的索引。索引从0开始。
	 */
	getSelectedIndex(): number;
	/**
	 * 设置选中的索引
	 * @param value 
	 */
	setSelectedIndex(value: number): void;
}