import { IFileEditorModel, IInnerModel } from 'egret/editor/core/models';
import { IArray, INode, IObject, IValue, IClass, IContainer, ILink, IScroller, ISize, IScale9Grid, IViewStack, NodeSelectChangedEvent, ViewStackIndexChangedEvent, NodeRemovedEvent, NodeAddedEvent, TreeChangedEvent } from './treeNodes';
import { Rectangle, Point } from './common';
import { ExmlModelConfig } from './exmlModeConfig';
import * as sax from '../sax/sax';
import { Namespace } from '../sax/Namespace';
import { Event } from 'egret/base/common/event';
import { HistoryInfo } from './exmlModel';
import { IAnimationModel } from '../plugin/IAnimationModel';

interface ExmlModelEvent {
	target: IExmlModel;
}
/**
 * 实例改变事件
 */
export interface RootChangedEvent extends ExmlModelEvent {
}
/**
 * 视图状态列表或者选中的视图状态发生改变
 */
export interface StateChangedEvent extends ExmlModelEvent {
}
/**
 * 选中节点的列表发生改变
 */
export interface SelectedListChangedEvent extends ExmlModelEvent {
}
/**
 * 文本改变事件
 */
export interface TextChangedEvent extends ExmlModelEvent {
	/**
	 * 插入的文本内容
	 */
	insertText: string;
	/**
	 * 要替换文本的起始索引
	 */
	oldStartIndex: number;
	/**
	 * 要替换文本的结束索引(不包括)
	 */
	oldEndIndex: number;
}
/**
 * ExmlModel的临时数据存储
 */
export interface ITemporaryData {
	/**
	 * 展开的节点路径
	 */
	layerExpandList: number[][];
	/**
	 * 图层滚动条的位置
	 */
	layerScrollPos:number;
}


//TODO 动画编辑
//TODO 配置，如背景色 背景图等的数据模块
/**
 * Exml数据层接口
 */
export interface IExmlModel extends IInnerModel {
	/**
	 * 根节点改变
	 */
	readonly onRootChanged: Event<RootChangedEvent>;
	/**
	 * 文本内容改变
	 */
	readonly onTextChanged: Event<TextChangedEvent>;
	/**
	 * 视图状态列表或者选中的视图状态发生改变
	 */
	readonly onStateChanged: Event<StateChangedEvent>;
	/**
	 * 选中节点的列表发生改变
	 */
	readonly onSelectedListChanged: Event<SelectedListChangedEvent>;
	/**
	 * 单个节点选中状态改变事件
	 */
	readonly onNodeSelectChanged: Event<NodeSelectChangedEvent>;
	/**
	 * 层级堆叠容器的选中项索引发生改变
	 */
	readonly onViewStackIndexChanged: Event<ViewStackIndexChangedEvent>;
	/**
	 * 可视节点移除事件
	 */
	readonly onNodeRemoved: Event<NodeRemovedEvent>;
	/**
	 * 可视节点添加事件
	 */
	readonly onNodeAdded: Event<NodeAddedEvent>;
	/**
	 * 节点树发生改变事件,使用kind属性来区分发生改变的类型
	 */
	readonly onTreeChanged: Event<TreeChangedEvent>;

	/**
	 * 编译错误
	 */
	readonly onCompileError: Event<string>;
	/**
	 * 编译警告
	 */
	readonly onCompileWarning: Event<string>;



	/**
	 * 临时数据存储
	 */
	readonly temporaryData: ITemporaryData;

	/**
	 * 添加子数据模块
	 * @param child 
	 */
	addChildModel(child: IExmlModel);
	/**
	 * 移除子数据模块
	 * @param child 
	 */
	removeChildModel(child: IExmlModel);
	/**
	 * 皮肤类名
	 */
	getClassName(): string;
	/**
	 * 是否是启用状态。 当设置为false时，应当禁用交互行为。以增加效率。
	 */
	getEnabled(): boolean;
	/**
	 * 设置是否启用
	 * @param value 
	 */
	setEnabled(value: boolean): void;
	/**
	 * 编辑的文本
	 */
	getText(): string;
	/**
	 * 设置编辑的文本
	 * @param value 
	 */
	setText(value: string): void;
	/**
	 * 主机组件完整类名
	 */
	getHostComponent(): string;
	/**
	 * 设置主机组件的完整类名
	 * @param value 
	 */
	setHostComponent(value: string): void;
	/**
	 * 声明节点列表
	 */
	getDeclarations(): IArray;
	/**
	 * Tree根节点
	 */
	getRootNode(): INode;
	/**
	 * 根节点显示对象
	 */
	getRootElement(): any;
	/**
	 * 视图状态列表。
	 */
	getStates(): string[];
	/**
	 * 当前视图状态,设置任何不存在的状态都会变成BASIC_STATE
	 */
	getCurrentState(): string;
	/**
	 * 设置当前的视图状态
	 * @param value 
	 */
	setCurrentState(value: string): void;
	/**
	 * 起始状态
	 */
	getStartState(): string;
	/**
	 * 设置起始状态
	 * @param value 
	 */
	setStartState(value: string): void;
	/**
	 * 创建一个新的视图状态
	 * @param stateName 视图状态名称
	 * @param copyFrom 要拷贝的视图状态,""表示"所有状态"，null表示空白状态。
	 */
	createNewState(stateName: string, copyFrom: string): void;
	/**
	 * 创建一个新的视图状态
	 * @param stateName 视图状态名称
	 */
	createNewState(stateName: string): void;
	/**
	 * 移除一个视图状态 返回是否移除成功
	 * @param stateName 视图状态名称
	 */
	removeState(stateName: string): boolean;
	/**
	 * 修改状态名
	 * @param oldName 要修改的状态名
	 * @param newName 新的状态名
	 */
	changeStateName(oldName: string, newName: string): void;
	/**
	 * 刷新并重新生成节点树。
	 */
	refreshTree(): void;
	/**
	 * 是否支持视图状态功能
	 */
	getSupportState(): boolean;
	/**
	 * 当前选中的节点列表,此属性为原始数组的一个浅复制。
	 */
	getSelectedNodes(): INode[];
	/**
	 * 当设置为ture时，忽略所有的选中节点的改变，不抛出ExmlModelEvent.SELECTD_LIST_CHANGED事件。
	 * 再次置为false时才抛出。此属性通常用于框选时优化性能。
	 */
	getIgnoreSelectionChange(): boolean;
	/**
	 * 当设置为ture时，忽略所有的选中节点的改变，不抛出ExmlModelEvent.SELECTD_LIST_CHANGED事件。
	 * 再次置为false时才抛出。此属性通常用于框选时优化性能。
	 */
	setIgnoreSelectionChange(value: boolean): void;
	/**
	 * 删除选中的节点,返回删除的节点列表。
	 */
	removeSelectedNodes(): INode[];
	/**
	 * 插入文本,并记录历史记录。
	 * @param text 插入的文本内容
	 * @param startIndex 要替换的起始索引
	 * @param endIndex 要替换的结束索引(不包含)
	 */
	insertText(insertText: string, startIndex: number, endIndex: number, notifyListeners: boolean, refresh: boolean): void;
	/**
	 * 插入文本,并记录历史记录。
	 * @param text 插入的文本内容
	 * @param startIndex 要替换的起始索引
	 * @param endIndex 要替换的结束索引(不包含)
	 */
	insertText(insertText: string, startIndex: number, endIndex: number, notifyListeners: boolean): void;
	/**
	 * 插入文本,并记录历史记录。
	 * @param text 插入的文本内容
	 * @param startIndex 要替换的起始索引
	 * @param endIndex 要替换的结束索引(不包含)
	 */
	insertText(insertText: string, startIndex: number, endIndex: number): void;
	/**
	 * 插入文本,并记录历史记录。
	 * @param text 插入的文本内容
	 * @param startIndex 要替换的起始索引
	 */
	insertText(insertText: string, startIndex: number): void;
	/**
	 * 插入文本,并记录历史记录。
	 * @param text 插入的文本内容
	 */
	insertText(insertText: string): void;
	/**
	 * 是否可以撤销
	 */
	getCanUndo(): boolean;
	/**
	 * 撤销
	 */
	undo(): void;
	/**
	 * 是否可以重做
	 */
	getCanRedo(): boolean;
	/**
	 * 重做
	 */
	redo(): void;
	/**
	 * 获取指定坐标下最内层的可视节点
	 * @param point 节点所在舞台上的点
	 * @param ignoreSelected 是否忽略当前被选中的节点，默认false。
	 * @param returnRoot 如果没有碰撞结果，是否返回根节点，默认flase。
	 */
	getNodeUnderXY(point: Point, ignoreSelected: boolean, returnRoot: boolean): INode;
	/**
	 * 获取指定坐标下最内层的可视节点
	 * @param point 节点所在舞台上的点
	 * @param ignoreSelected 是否忽略当前被选中的节点，默认false。
	 * @param returnRoot 如果没有碰撞结果，是否返回根节点，默认flase。
	 */
	getNodeUnderXY(point: Point, ignoreSelected: boolean): INode;
	/**
	 * 获取指定坐标下最内层的可视节点
	 * @param point 节点所在舞台上的点
	 * @param ignoreSelected 是否忽略当前被选中的节点，默认false。
	 * @param returnRoot 如果没有碰撞结果，是否返回根节点，默认flase。
	 */
	getNodeUnderXY(point: Point): INode;
	/**
	 * 获取矩形区域下的所有可视节点
	 * @param rect 矩形的XY坐标相对于舞台
	 */
	getNodesUnderRect(rect: Rectangle): INode[];
	/**
	 * 根据在xml中的路径，获取对应的节点对象。
	 */
	getNodeByXmlPath(xmlPath: number[]): INode;
	/**
	 * 以字符串方式在指定节点上修改一个属性值，若指定属性不存在，则增加属性。若value为null，则删除该属性。
	 * @param host 要修改属性的节点
	 * @param prop 属性名
	 * @param value 属性值
	 */
	setPropertyByString(host: IObject, prop: string, value: string, ignoreState: boolean): void;
	/**
	 * 以字符串方式在指定节点上修改一个属性值，若指定属性不存在，则增加属性。若value为null，则删除该属性。
	 * @param host 要修改属性的节点
	 * @param prop 属性名
	 * @param value 属性值
	 */
	setPropertyByString(host: IObject, prop: string, value: string): void;
	/**
	 * 复制选中的节点到系统剪贴板
	 */
	copyNodesToClipboard(): void;
	/**
	 * 粘贴系统剪贴板中的节点
	 */
	pasteNodesFromClipboard(): void;
	/**
	 * 剪切选中的节点到系统剪贴板
	 */
	cutNodesToClipboard(): void;
	/**
	 * 立即复制整个选中项列表，粘贴进节点树，并设置为新的选中项列表。返回是否复制成功。
	 */
	cloneSelectedNodes(): boolean;
	/**
	 * 从当前节点树里移除指定列表id的节点。若该节点id被节点树上其他节点引用。则不移除。
	 */
	cleanUntappedIds(ids: string[]): void;
	/**
	 * 相关联的EUISingleConfig实例
	 */
	getExmlConfig(): ExmlModelConfig;
	/**
	 * 解析一个EValue对象为XML节点
	 * @param value 要解析的节点
	 * @param parseChildren 是否解析子节点，默认true。
	 */
	parseXML(value: IValue, parseChildren?: boolean): sax.Tag;
	/**
	 * 解析一个XML节点为EValue
	 */
	parseExmlValue(xml: sax.Tag, inMultipleStates?: boolean): IValue;
	/**
	 * 创建IArray实例
	 */
	createIArray(name?: string, ns?: Namespace): IArray;
	/**
	 * 创建IClass实例
	 * @param className 类名
	 */
	createIClass(className: string, xml: sax.Tag): IClass;
	/**
	 * 创建IClass实例
	 * @param className 类名
	 */
	createIClass(className: string): IClass;
	/**
	 * 创建IContainer实例,若不传入instance，则根据name和ns自动实例化一个。
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	createIContainer(name: string, ns: Namespace, instance: any): IContainer;
	/**
	 * 创建IContainer实例,若不传入instance，则根据name和ns自动实例化一个。
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	createIContainer(name: string, ns: Namespace): IContainer;
	/**
	 * 创建ILink实例
	 * @param expression 实例表达式。
	 * 若表达式里含有对其他id的引用，务必在之后调用addRelatives()添加引用的EValue实例列表
	 */
	createILink(expression: string): ILink;
	/**
	 * 创建INode实例,若不传入instance，则根据name和ns自动实例化一个。
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	createINode(name: string, ns: Namespace, instance: any): INode;
	/**
	* 创建INode实例,若不传入instance，则根据name和ns自动实例化一个。
	* @param name 节点名,通常是类名的简短表示(非完全限定)
	* @param ns 该类所属的命名空间
	* @param instance 节点对应的值或实例引用
	*/
	createINode(name: string, ns: Namespace): INode;
	/**
	 * 创建IObject实例,若不传入instance，则根据name和ns自动实例化一个。
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	createIObject(name: string, ns: Namespace, instance: any): IObject;
	/**
	* 创建IObject实例,若不传入instance，则根据name和ns自动实例化一个。
	* @param name 节点名,通常是类名的简短表示(非完全限定)
	* @param ns 该类所属的命名空间
	* @param instance 节点对应的值或实例引用
	*/
	createIObject(name: string, ns: Namespace): IObject;
	/**
	 * 创建IScroller实例,若不传入instance，则根据name和ns自动实例化一个。
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	createIScroller(name: string, ns: Namespace, instance: any): IScroller;
	/**
	 * 创建IScroller实例,若不传入instance，则根据name和ns自动实例化一个。
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	createIScroller(name: string, ns: Namespace): IScroller;
	/**
	 * 创建ISize实例
	 * @param instance Number或类似"100%"的String
	 */
	createISize(instance: any): ISize;
	/**
	 * 创建ISize实例
	 * @param instance Number或类似"100%"的String
	 */
	createISize(): ISize;
	/**
	 * 创建IScale9Grid实例
	 * @param value 由四个数字组成的字符串,分别表示x，y，width，height，例如："7,7,46,46";
	 */
	createIScale9Grid(expression: string): IScale9Grid;
	/**
	 * 创建IValue实例
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	createIValue(name: string, ns: Namespace, instance: any): IValue;
	/**
	 * 创建IValue实例
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 */
	createIValue(name: string, ns: Namespace): IValue;
	/**
	 * 创建IViewStack实例,若不传入instance，则根据name和ns自动实例化一个。
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	createIViewStack(name: string, ns: Namespace, instance: any): IViewStack;
	/**
	 * 创建IViewStack实例,若不传入instance，则根据name和ns自动实例化一个。
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	createIViewStack(name: string, ns: Namespace): IViewStack;
	/**
	 * 返回下一个可撤销的操作对象，但不移除它。
	 */
	peekUndo(): HistoryInfo;
	/**
	 * 遍历所有节点 
	 */
	foreachNode(callBack: (node: INode) => void): void;
	/**
	 * 标记是否正在操作节点层级
	 */
	isChangeNodeFloor(value: boolean): void;
	/**
	 * 生成一个可用的id
	 */
	generateId(target: IObject): string;

	/**
	 * 根据ID获取对应的节点
	 * @param id 
	 */
	getValueByID(id): IValue;
	getAnimationModel(): IAnimationModel;
}

/**
 * Exml文件的编辑数据层接口
 */
export interface IExmlFileEditorModel extends IFileEditorModel {
	/** 
	 * exml数据模块 
	 */
	getModel(): IExmlModel;
}

