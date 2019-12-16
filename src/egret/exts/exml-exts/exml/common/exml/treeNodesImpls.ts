import { IValue, registerInstanceType, IArray, IObject, IClass, INode, IContainer, IScale9Grid, IViewStack, ISingleChild, IScroller, ILink, InstanceChangedEvent, PropertyChangedEvent, InstanceValueChangedEvent, LockedChangedEvent, NodeRemovedEvent, NodeAddedEvent, NodeSelectChangedEvent, ViewStackIndexChangedEvent, TreeChangedEvent, TreeChangedKind, ISize } from './treeNodes';
import { Namespace } from '../sax/Namespace';
import { ExmlModelConfig } from './exmlModeConfig';
import { IExmlModel } from './models';
import { EUI, W_EUI } from '../project/parsers/core/commons';
import * as sax from '../sax/sax';
import * as xmlTagUtil from '../sax/xml-tagUtils';
import { parseClassName } from '../utils/eui/exmls';
import { trim, unescapeHTMLEntity } from '../utils/strings';
import { unescape } from '../utils/escapeCharacters';
import { Event, Emitter } from 'egret/base/common/event';
import { IDisposable } from 'egret/base/common/lifecycle';
import { getScale9Grid } from '../utils/scale9Grids';
import { HashObject } from './common';


/**
 * 事件释放管理器
 */
class EventDisposableManager {
	private disposables: { node: IValue, disposable: IDisposable }[] = [];
	public addDisposable(node: IValue, disposable: IDisposable): void {
		this.dispose(node);
		this.disposables.push({ node: node, disposable: disposable });
	}
	public dispose(node: IValue): void {
		for (let i = 0; i < this.disposables.length; i++) {
			if (this.disposables[i].node == node) {
				this.disposables[i].disposable.dispose();
				this.disposables.splice(i, 1);
				break;
			}
		}
	}
	public disposeAll(): void {
		for (let i = 0; i < this.disposables.length; i++) {
			this.disposables[i].disposable.dispose();
		}
		this.disposables.length = 0;
	}
}

/**
 * 值类型节点
 */
export class EValue extends HashObject implements IValue {
	readonly _onInstanceChanged: Emitter<InstanceChangedEvent>;
	/**
	 * 实例改变事件
	 */
	public get onInstanceChanged(): Event<InstanceChangedEvent> {
		return this._onInstanceChanged.event;
	}
	readonly _onPropertyChanged: Emitter<PropertyChangedEvent>;
	/**
	 * 节点属性改变事件，此事件只有复杂对象节点EArray,EObject及其子类会抛出。
	 */
	public get onPropertyChanged(): Event<PropertyChangedEvent> {
		return this._onPropertyChanged.event;
	}
	readonly _onInstanceValueChanged: Emitter<InstanceValueChangedEvent>;
	/**
	 * 节点instance的值发生改变
	 */
	public get onInstanceValueChanged(): Event<InstanceValueChangedEvent> {
		return this._onInstanceValueChanged.event;
	}
	readonly _onLockedChanged: Emitter<LockedChangedEvent>;
	/**
	 * ENode的locked属性发生改变
	 */
	public get onLockedChanged(): Event<LockedChangedEvent> {
		return this._onLockedChanged.event;
	}
	readonly _onNodeRemoved: Emitter<NodeRemovedEvent>;
	/**
	 * 可视节点移除事件
	 */
	public get onNodeRemoved(): Event<NodeRemovedEvent> {
		return this._onNodeRemoved.event;
	}

	readonly _onNodeAdded: Emitter<NodeAddedEvent>;
	/**
	 * 可视节点添加事件
	 */
	public get onNodeAdded(): Event<NodeAddedEvent> {
		return this._onNodeAdded.event;
	}
	readonly _onNodeSelectChanged: Emitter<NodeSelectChangedEvent>;
	/**
	 * 单个节点选中状态改变事件
	 */
	public get onNodeSelectChanged(): Event<NodeSelectChangedEvent> {
		return this._onNodeSelectChanged.event;
	}
	readonly _onViewStackIndexChanged: Emitter<ViewStackIndexChangedEvent>;
	/**
	 * 层级堆叠容器的选中项索引发生改变
	 */
	public get onViewStackIndexChanged(): Event<ViewStackIndexChangedEvent> {
		return this._onViewStackIndexChanged.event;
	}
	readonly _onTreeChanged: Emitter<TreeChangedEvent>;
	/**
	 * 节点树发生改变事件,使用kind属性来区分发生改变的类型
	 */
	public get onTreeChanged(): Event<TreeChangedEvent> {
		return this._onTreeChanged.event;
	}



	/**
	 * 构造函数
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	constructor(name: string, ns: Namespace, ins: any = null) {
		super();
		this._name = name;
		this._ns = ns;
		this._instance = ins;

		this._onInstanceChanged = new Emitter<InstanceChangedEvent>();
		this._onPropertyChanged = new Emitter<PropertyChangedEvent>();
		this._onInstanceValueChanged = new Emitter<InstanceValueChangedEvent>();
		this._onLockedChanged = new Emitter<LockedChangedEvent>();
		this._onNodeRemoved = new Emitter<NodeRemovedEvent>();
		this._onNodeAdded = new Emitter<NodeAddedEvent>();
		this._onNodeSelectChanged = new Emitter<NodeSelectChangedEvent>();
		this._onViewStackIndexChanged = new Emitter<ViewStackIndexChangedEvent>();
		this._onTreeChanged = new Emitter<TreeChangedEvent>();

		registerInstanceType(this.getType(), 'eui.IValue');
	}
	/**
	 * 类型
	 */
	public getType(): string {
		return 'eui.EValue';
	}
	/**
	 * exml配置
	 */
	public getExmlConfig(): ExmlModelConfig {
		if (this.getExmlModel()) {
			return this.getExmlModel().getExmlConfig();
		}
		return null;

	}
	private _exmlModel: IExmlModel;
	/**
	 * 对应的EXMLModel数据模型
	 */
	public getExmlModel(): IExmlModel {
		if (this._exmlModel) {
			return this._exmlModel;
		} else if (this.getHost()) {
			return this.getHost().getExmlModel();
		} else {
			return null;
		}
	}
	/**
	 * 设置当前文件的exml数据模块
	 * @param value 
	 */
	public setExmlModel(value: IExmlModel): void {
		this._exmlModel = value;
	}

	private _id: string = '';
	/**
	 * 节点id
	 */
	public getId(): string {
		return this._id;
	}
	/**
 * 设置节点id
 * @param value 
 */
	public setId(value: string): void {
		this._id = value;
	}
	public _instance: any;
	/**
	 * 节点对应的值或实例引用
	 */
	public getInstance(): any {
		return this._instance;
	}
	/**
	 * 设置实例
	 * @param value 
	 */
	public setInstance(value: any): void {
		if (this._instance === value) {
			return;
		}
		this._instance = value;
		this._onInstanceChanged.fire({ target: this });
	}

	private _name: string;
	/**
	 * 节点类名
	 */
	public getName(): string {
		return this._name;
	}

	private _ns: Namespace;
	/**
	 * 节点命名空间
	 */
	public getNs(): Namespace {
		return this._ns;
	}

	public _host: EValue;
	/**
	 * 宿主节点,直接持有此节点的对象。
	 */
	public getHost(): IValue {
		return this._host;
	}
	/**
	 * 设置宿主节点
	 */
	public setHost(h: EValue): void {
		if (this._host === h) {
			return;
		}
		this._host = h;
	}
	public _readOnly: boolean = false;

	/**
	 * 当作为属性节点时，在host上是否不可修改
	 */
	public getReadOnly(): boolean {
		return this._readOnly;
	}

	/**
	 * 当父级节点是EObject时，是否作为子节点添加(否则添加到xml的属性节点上)。
	 */
	public asChild: boolean = false;

	public _propVisible: boolean = false;
	/**
	 * 当作为子节点时，属性名节点是否存在。当asChild属性为false时此属性无效。
	 */
	public getPropVisible(): boolean {
		return this._propVisible;
	}

	/**
	 * 设置属性值
	 * @param value 
	 */
	public setPropVisible(value: boolean): void {
		if (this._propVisible === value || this._host instanceof EArray) {
			return;
		}
		this._propVisible = value;
		if (this._host) {
			this._host.childIndexDirty = true;
		}
	}

	public _hostProperty: string = '';
	/**
	 * 表示此节点在host节点上的属性名。
	 */
	public getHostProperty(): string {
		return this._hostProperty;
	}

	/**
	 * 在父级节点中的xml索引位置。
	 */
	public xmlIndex: number = 0;
	/**
	 * 是否需要重新验证子项索引
	 */
	public childIndexDirty: boolean = false;
	/**
	 * 更新子项索引
	 */
	public updateChildIndex(): void {
		this.childIndexDirty = false;
	}

	/**
	 * 获取能定位到对应xml节点的路径列表,返回一个索引数组。
	 */
	public getXmlPath(): number[] {
		if (!this._host) {
			return [0];
		}
		let parent: EValue = this.asChild ? this : this._host;
		const path: number[] = [];
		let host: EValue;
		while (parent) {
			host = parent._host;
			if (host && host.childIndexDirty) {
				host.updateChildIndex();
			}
			if (!(parent instanceof EArray) || (<EArray>parent).xmlVisible) {
				path.splice(0, 0, parent.xmlIndex);
				if (parent.getPropVisible()) {
					path.splice(1, 0, 0);
				}
			}
			else if (parent.getPropVisible()) {
				path.splice(0, 0, parent.xmlIndex);
			}
			parent = parent._host;
		}
		return path;
	}

	/**
	 * 根节点引用
	 */
	public getRoot(): IValue {
		let _root: EValue = this;
		while (_root._host) {
			_root = _root._host;
		}
		return _root;
	}
	/**
	 * 根节点是否是自己
	 */
	public getIsRoot(): boolean {
		return !this._host;
	}

	public toString(): string {
		if (this._instance !== undefined && this._instance !== null) {
			if (this._name === 'number' && this._hostProperty &&
				this._hostProperty.toLowerCase().indexOf('color') !== -1) {
				let numStr: string = (<number>this._instance).toString(16).toUpperCase();
				while (numStr.length < 6) {
					numStr = '0' + numStr;
				}
				return '0x' + numStr;
			}
			else {
				return this._instance.toString();
			}
		}
		return '';
	}

	/**
	 * 销毁
	 */
	public destroy(): void {
	}
}


/**
 * 数组节点
 */
export class EArray extends EValue implements IArray {
	private instanceChangeDisposables: EventDisposableManager = new EventDisposableManager();

	/**
	 * 构造函数
	 */
	constructor(name?: string, ns?: Namespace) {
		super(name ? name : 'Array', ns ? ns : EUI, []);
		this.asChild = true;
		registerInstanceType(this.getType(), 'eui.IArray');
	}
	/**
	 * 类型
	 */
	public getType(): string {
		return 'eui.EArray';
	}

	/**
	 * @private 设置数组节点的此属性无效
	 */
	public setInstance(value: any): void {
	}

	/**
	 * 此节点是否存在于多个状态
	 */
	public inMutipleStates: boolean = false;
	/**
	 * 是否存在对应的xml节点,默认true。
	 */
	public xmlVisible: boolean = true;
	/**
	 * 子节点列表
	 */
	public childNodes: EValue[] = [];
	/**
	 * 数组长度
	 */
	public getLength(): number {
		return this.childNodes.length;
	}
	/**
	 * 获取指定索引的子节点
	 */
	public getValueAt(index: number): IValue {
		return this.childNodes[index];
	}
	/**
	 * 获取指定节点的索引
	 */
	public indexOf(value: IValue): number {
		return this.childNodes.indexOf(<EValue>value);
	}
	/**
	 * 添加一个节点到数组
	 */
	public push(value: IValue): void {
		const eValue: EValue = value as EValue;
		if (!eValue || !(eValue instanceof EValue)) {
			return;
		}
		this.childNodes.push(eValue);
		this._instance.push(eValue.getInstance());
		eValue.setHost(this);
		eValue._hostProperty = <string><any>(this.childNodes.length - 1);
		eValue._propVisible = false;
		this.instanceChangeDisposables.addDisposable(eValue, eValue.onInstanceChanged(e => this.onInstanceChange(e)));
		if (this._host) {
			this._host.childIndexDirty = true;
		}
		this.childIndexDirty = true;
		this._onPropertyChanged.fire({
			target: this,
			property: this.childNodes.length - 1,
			value: eValue,
			ignoreState: false
		});
		(this.getRoot() as EValue)._onTreeChanged.fire({
			property: this.childNodes.length - 1,
			value: eValue,
			kind: TreeChangedKind.ADD,
			target: this,
			ignoreState: false
		});
	}

	/**
	 * 子项的值发生改变
	 */
	private onInstanceChange(e: InstanceChangedEvent): void {
		const value: EValue = e.target as EValue;
		if (!value || !(value instanceof EValue)) {
			return;
		}
		const index: number = this.childNodes.indexOf(value);
		this._instance.splice(index, 1, value.getInstance());
		this._onPropertyChanged.fire({
			property: index,
			value: value,
			target: this,
			ignoreState: false
		});
		(this.getRoot() as EValue)._onTreeChanged.fire({
			property: index,
			value: value,
			kind: TreeChangedKind.CHANGE,
			target: this,
			ignoreState: false
		});
	}
	/**
	 * 给数组节点添加元素以及从数组节点中删除元素。
	 * @param startIndex  一个整数，它指定数组中开始进行插入或删除的位置处的元素的索引。
	 * 您可以用一个负整数来指定相对于数组结尾的位置（例如，-1 是数组的最后一个元素）。
	 * @param deleteCount 一个整数，它指定要删除的元素数量。该数量包括 startIndex
	 * 参数中指定的元素。如果没有为 deleteCount 参数指定值，则该方法将删除从 startIndex
	 * 元素到数组中最后一个元素的所有值。如果该参数的值为 0，则不删除任何元素。
	 * @param value 插入的节点
	 */
	public splice(startIndex: number, deleteCount: number, value: IValue = null): void {
		const _root: IValue = this.getRoot();
		if (deleteCount > 0) {
			const oldValues: EValue[] = this.childNodes.slice(startIndex, startIndex + deleteCount);
			let index: number = 0;
			for (let i = 0; i < oldValues.length; i++) {
				const v: EValue = oldValues[i];
				(_root as EValue)._onTreeChanged.fire({
					property: startIndex + index,
					value: v,
					kind: TreeChangedKind.REMOVE,
					target: this,
					ignoreState: false
				});
				index++;
				v.setHost(null);
				v.xmlIndex = 0;
				this.instanceChangeDisposables.dispose(v);
			}
			this.childNodes.splice(startIndex, deleteCount);
			this._instance.splice(startIndex, deleteCount);
		}
		let rootEvent: TreeChangedEvent = null;
		if (value) {
			rootEvent = {
				property: startIndex,
				value: value,
				kind: TreeChangedKind.ADD,
				target: this,
				ignoreState: false
			};
			this.childNodes.splice(startIndex, 0, <EValue>value);
			this._instance.splice(startIndex, 0, value.getInstance());
			(<EValue>value).setHost(this);
			(<EValue>value)._hostProperty = <string><any>startIndex;
			(<EValue>value)._propVisible = false;
			this.instanceChangeDisposables.addDisposable(value, value.onInstanceChanged(e => this.onInstanceChange(e)));
		}
		if (this._host) {
			this._host.childIndexDirty = true;
		}
		this.childIndexDirty = true;
		if (deleteCount > 0 || value) {
			this._onPropertyChanged.fire({
				property: startIndex,
				value: value,
				target: this,
				ignoreState: false
			});
		}
		if (rootEvent) {
			(_root as EValue)._onTreeChanged.fire(rootEvent);
		}
	}
	/**
	 * 设置节点是否可见
	 * @param value 
	 */
	public setPropVisible(value: boolean): void {
		if (this._propVisible === value || this._host instanceof EArray) {
			return;
		}
		this._propVisible = value;
		if (this._host) {
			this._host.childIndexDirty = true;
		}
		this.childIndexDirty = true;
	}
	/**
	 * 更新子项索引
	 */
	public updateChildIndex(): void {
		super.updateChildIndex();
		if (!this.getPropVisible() && !this.xmlVisible && this.getNs().uri !== W_EUI.uri) {
			if (this._host) {
				this._host.updateChildIndex();
			}
			return;
		}
		let index: number = 0;
		for (let i = 0; i < this.childNodes.length; i++) {
			const dV: EValue = this.childNodes[i];
			dV.xmlIndex = index;
			index++;
		}
	}
	public toString(): string {
		return '';
	}
	/**
	 * 销毁
	 */
	public destroy(): void {
		for (let i = 0; i < this.childNodes.length; i++) {
			const dV: EValue = this.childNodes[i];
			dV.destroy();
		}
		this.childNodes.length = 0;
		this.instanceChangeDisposables.disposeAll();
		super.destroy();
	}
}



/**
 * 含有键值对的复杂对象节点
 */
export class EObject extends EValue implements IObject {
	private instanceChangeDisposables: EventDisposableManager = new EventDisposableManager();
	/**
	 * 构造函数
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	constructor(name: string, ns: Namespace, instance: any = null) {
		super(name, ns, instance);
		this.asChild = true;
		registerInstanceType(this.getType(), 'eui.IObject');
	}
	/**
	 * 类型
	 */
	public getType(): string {
		return 'eui.EObject';
	}

	/**
	 * 设置此属性无效
	 */
	public setInstance(value: any): void {
	}
	/**
	 * 节点id
	 */
	public getId(): string {
		const idValue: IValue = this.getProperty('id');
		if (idValue) {
			return idValue.getInstance();
		}
		return super.getId();
	}
	/**
	 * 设置节点id
	 * @param value 
	 */
	public setId(value: string): void {
		if (this.getId() === value) {
			return;
		}
		super.setId(value);
		if (value) {
			this.setProperty('id', new EValue('string', W_EUI, value), false);
		}
		else {
			this.setProperty('id', null);
		}
	}

	/**
	 * 属性列表字典
	 */
	public propertyDic: { [key: string]: EValue } = {};

	/**
	 * 已经设置过实例属性的字典
	 */
	private changedPropertyDic: { [key: string]: boolean } = Object.create(null);

	private _propertyList: string[] = [];

	private _realPropertyList: string[] = [];
	/**
	 * 获取设置过的属性名列表
	 */
	public getPropertyList(): string[] {
		return this._realPropertyList.concat();
	}

	private static READ_ONLY: string = '.readOnly';
	/**
	 * 存储指定属性的值,如果value与已经存在的相同，则直接返回什么也不做。
	 * @param key 属性名
	 * @param value 值
	 * @param addToLast true表示添加到属性列表的最末尾，false添加到列表最前。默认true。
	 */
	public setProperty(key: string, value: IValue, addToLast: boolean = true, ignoreState: boolean = false): void {
		const curValue: EValue = value as EValue;
		let oldValue: EValue = this.propertyDic[key];
		if (key.indexOf('w:') === 0) {
			ignoreState = true;
		}
		if (!oldValue && ignoreState) {
			oldValue = this.propertyDic[key + EObject.READ_ONLY];
		}
		if (!key || (curValue && curValue === oldValue) || (!curValue && !oldValue)) {
			return;
		}
		if (!oldValue || !curValue || !curValue._readOnly) {
			this.setValue(key, curValue);
		}
		const _root: IValue = this.getRoot();
		const prop: string = key + EObject.READ_ONLY;
		if (oldValue) {
			(_root as EValue)._onTreeChanged.fire({
				property: key,
				value: oldValue,
				kind: TreeChangedKind.REMOVE,
				ignoreState: ignoreState,
				target: this
			});
			if (!curValue) {
				if (ignoreState) {
					delete this.propertyDic[prop];
				}
				delete this.propertyDic[key];
				var index: number = this._propertyList.indexOf(key);
				this._propertyList.splice(index, 1);
				index = this._realPropertyList.indexOf(key);
				this._realPropertyList.splice(index, 1);
			}
			if (!curValue || !curValue._readOnly) {
				this.instanceChangeDisposables.dispose(oldValue);
				oldValue.setHost(null);
				oldValue.xmlIndex = 0;
			}
		}

		const readOnlyValue: EValue = this.propertyDic[prop];
		if (!curValue && readOnlyValue && !ignoreState) {
			(_root as EValue)._onTreeChanged.fire({
				property: key,
				value: readOnlyValue,
				kind: TreeChangedKind.REMOVE,
				ignoreState: ignoreState,
				target: this
			});
			delete this.propertyDic[prop];
			index = this._propertyList.indexOf(prop);
			this._propertyList.splice(index, 1);
			this.instanceChangeDisposables.dispose(readOnlyValue);
			readOnlyValue.setHost(null);
			readOnlyValue.xmlIndex = 0;
		}

		let rootEvent: TreeChangedEvent = null;
		if (curValue) {
			rootEvent = {
				property: key,
				value: curValue,
				kind: TreeChangedKind.ADD,
				ignoreState: ignoreState,
				target: this
			};
			if (curValue._readOnly) {
				if (this._propertyList.indexOf(prop) === -1) {
					if (addToLast) {
						this._propertyList.push(prop);
					}
					else if (curValue.getNs().uri === W_EUI.uri) {
						this._propertyList.splice(0, 0, prop);
					}
					else {
						this.addToFirst(this._propertyList, prop);
					}
				}
				this.propertyDic[prop] = curValue;
			}
			else {
				if (!oldValue) {
					if (addToLast) {
						this._propertyList.push(key);
						this._realPropertyList.push(key);
					}
					else if (curValue.getNs().uri === W_EUI.uri) {
						this._propertyList.splice(0, 0, key);
						this._realPropertyList.splice(0, 0, key);
					}
					else {
						this.addToFirst(this._propertyList, key);
						this.addToFirst(this._realPropertyList, key);
					}
				}
				this.propertyDic[key] = curValue;
			}

			curValue.setHost(this);
			curValue._hostProperty = key;
			curValue._propVisible = (key === 'w:Declarations' || key === this.getDefaultProp()) ? false : true;
			this.instanceChangeDisposables.addDisposable(curValue, curValue.onInstanceChanged(e => this.onInstanceChange(e)));
		}
		this.childIndexDirty = true;
		this._onPropertyChanged.fire({
			property: key,
			value: curValue,
			ignoreState: ignoreState,
			target: this
		});
		if (rootEvent) {
			(_root as EValue)._onTreeChanged.fire(rootEvent);
		}
	}
	/**
	 * 添加属性到列表的首位，跳过命名空间是w的项。
	 */
	private addToFirst(list: string[], key: string): void {
		const length: number = list.length;
		for (var i = 0; i < length; i++) {
			const prop: string = list[i];
			const value: EValue = this.propertyDic[prop];
			if (value && value.asChild && value.getNs().uri !== W_EUI.uri && prop !== 'states') {
				break;
			}
		}
		if (i > length) {
			i = length;
		}
		list.splice(i, 0, key);
	}
	/**
	 * 更新子项索引
	 */
	public updateChildIndex(): void {
		super.updateChildIndex();
		let childIndex: number = 0;
		let propIndex: number = 0;
		for (let i = 0; i < this._propertyList.length; i++) {
			const key: string = this._propertyList[i];
			const dV: EValue = this.propertyDic[key];
			if (!dV) {
				continue;
			}
			if (dV.asChild) {
				dV.xmlIndex = childIndex;
				if (dV._hostProperty === this.getDefaultProp() && dV instanceof EArray &&
					!(<EArray>dV).getPropVisible() && !(<EArray>dV).xmlVisible) {
					for (let j = 0; j < (<EArray>dV).childNodes.length; j++) {
						const child: EValue = (<EArray>dV).childNodes[j];
						child.xmlIndex = childIndex;
						childIndex++;
					}
				}
				if (dV instanceof EArray && !(<EArray>dV).getPropVisible() && !(<EArray>dV).xmlVisible) {
					childIndex--;
				}
				childIndex++;
			}
			else {
				dV.xmlIndex = propIndex;
				propIndex++;
			}
		}
	}
	/**
	 * 根据xmlIndex索引获取对应的子项
	 */
	public getChildByXmlIndex(xmlIndex: number): EValue {
		if (this.childIndexDirty) {
			this.updateChildIndex();
		}
		for (let i = 0; i < this._propertyList.length; i++) {
			const key: string = this._propertyList[i];
			const dV: EValue = this.propertyDic[key];
			if (!dV) {
				continue;
			}
			if (dV.asChild) {
				if (dV.xmlIndex === xmlIndex && (!(dV instanceof EArray) || (<EArray>dV).getPropVisible() || (<EArray>dV).xmlVisible)) {
					return dV;
				}
				if (dV._hostProperty === this.getDefaultProp() && dV instanceof EArray && !(<EArray>dV).getPropVisible() && !(<EArray>dV).xmlVisible) {
					for (let j = 0; j < (<EArray>dV).childNodes.length; j++) {
						const child: EValue = (<EArray>dV).childNodes[j];
						if (child.xmlIndex === xmlIndex) {
							return child;
						}
					}
				}
			}
		}
		return null;
	}
	/**
	 * 获取指定属性的值
	 */
	public getProperty(key: string): IValue {
		let value: EValue = this.propertyDic[key];
		if (!value) {
			value = this.propertyDic[key + EObject.READ_ONLY];
		}
		return value;
	}

	/**
	 * 子项的值发生改变
	 */
	private onInstanceChange(event: InstanceChangedEvent): void {
		const value: EValue = event.target as EValue;
		let found: boolean = false;
		let key: string;
		if (this._instance) {
			for (const prop in this.propertyDic) {
				if (this.propertyDic[prop] === value) {
					key = prop;
					if (prop.indexOf(EObject.READ_ONLY) !== -1) {
						key = prop.substring(0, prop.length - 9);
					}
					this.setValue(key, value);
					found = true;
					break;
				}
			}
		}
		if (found) {
			this._onPropertyChanged.fire({
				property: key,
				value: value,
				ignoreState: false,
				target: this
			});
			(this.getRoot() as EValue)._onTreeChanged.fire({
				property: key,
				value: value,
				kind: TreeChangedKind.CHANGE,
				ignoreState: false,
				target: this
			});
		}
	}

	/**
	 * 获取属性的默认值, 注意对于UIComponent的width和height属性返回的是NaN
	 */
	public getDefaultValue(key: string): any {
		let value = this.getExmlConfig().getDefaultValueById(this.getName(), key, this.getNs());
		if (this.getExmlConfig().isInstance(this._instance, 'eui.UIComponent')) {
			if (key === 'height' || key === 'width') {
				value = NaN;
			}
		}
		return value;
	}

	private sizeKeyMap: any = { width: 'percentWidth', height: 'percentHeight' };
	/**
	 * 设置instance指定属性的值
	 */
	public setValue(key: string, value: IValue): void {
		if (value && value.getNs().uri === W_EUI.uri) {
			return;
		}

		let formatValue: any = undefined;
		if (value) {
			formatValue = value.getInstance();
		} else {
			formatValue = this.getDefaultValue(key);
		}
		try {
			if (this.getExmlConfig().isInstance(this._instance, 'eui.UIComponent') &&
				(key === 'height' || key === 'width')) {
				const percentKey: string = this.sizeKeyMap[key];
				this.setInstanceValue(percentKey, NaN);
				const size: ESize = value as ESize;
				if (size && typeof size.getInstance() === 'string' && (<string>size.getInstance()).indexOf('%') !== -1) {
					this.setInstanceValue(key, NaN);
					key = percentKey;
					formatValue = Number(size.getInstance().substr(0, size.getInstance().length - 1));
				}
			}

			if (formatValue !== undefined) {
				// if (typeof formatValue === 'string') {
				// 	formatValue = unescape(formatValue);
				// }
				if (value instanceof ELink) {
					//数据绑定测试数据的替换处理
					//TODO 数据绑定支持
					// let configModel = this.getExmlModel().getEditConfigModel();
					// let finalValue = DataBindingUtil.getFinalValueAfterReplaceByBindingData(value.toString(), configModel);
					// if (finalValue.isReplacedByTestData) {
					// 	this.setInstanceValue(key, finalValue.value);
					// }
					// else {
					this.setInstanceValue(key, formatValue);
					// }
				}
				// else if (typeof formatValue === 'string') {
				// 	let configModel = this.getExmlModel().getEditConfigModel();
				// 	this.setInstanceValue(key, DataBindingUtil.getFinalValueAfterReplaceByBindingData(formatValue, configModel).value);
				// }
				else {
					this.setInstanceValue(key, formatValue);
				}
			}
		}
		catch (e) {
		}
	}

	/**
	 * 直接改变实例的属性
	 */
	public setInstanceValue(key: string, value: any): void {
		// if(typeof value === 'string'){
		// 	value = unescape(value);
		// }
		this._setInstanceValue(key, value);
	}

	private _setInstanceValue(key: string, value: any, enabledDispatchEvent: boolean = true): void {
		if (this.sizeKeyMap[key] && typeof value === 'string' && value.indexOf('%') !== -1) {
			key = this.sizeKeyMap[key];
			value = Number(value.substr(0, value.length - 1));
		} else if (typeof value === 'string') {
			value = unescape(value);
		}
		this._instance[key] = value;
		this.changedPropertyDic[key] = true;
		if (enabledDispatchEvent) {
			this._onInstanceValueChanged.fire({ property: key, target: this });
		}
	}
	/**
	 * 批量设置实例的值，此方法会直接作用于instance对象，可能会造成视图与数据不同步，请慎用
	 */
	public setInstanceValues(props: { [key: string]: any }): void {
		Object.keys(props).forEach(key => {
			this._setInstanceValue(key, props[key], false);
		});
		this._onInstanceValueChanged.fire({ property: null, target: this });
	}
	private _defaultProp: string;
	/**
	 * 默认属性名
	 */
	public getDefaultProp(): string {
		if (!this._defaultProp) {
			this._defaultProp = this.getExmlConfig().getDefaultPropById(this.getName(), this.getNs());
		}
		return this._defaultProp;
	}

	/**
	 * 此节点是否存在于多个状态,若节点树当前处于'所有状态'，此属性始终为false。
	 */
	public inMutipleStates: boolean = false;

	public toString(): string {
		return '';
	}

	//=======================setProperty()的便利方法=====================
	/**
	 * 设置number属性值,NaN表示要清空属性。
	 */
	public setNumber(property: string, instance: number): void {
		if (isNaN(instance)) {
			this.setProperty(property, null);
			return;
		}
		const value: IValue = this.getProperty(property);
		if (value && !value.getReadOnly() && value.getName() === 'number') {
			value.setInstance(instance);
		}
		else {
			this.setProperty(property, new EValue('number', EUI, instance));
		}
	}
	/**
	 * 设置string属性值,null表示要清空属性。
	 */
	public setString(property: string, instance: string): void {
		if (instance === null) {
			this.setProperty(property, null);
			return;
		}
		const value: IValue = this.getProperty(property);
		if (value && !value.getReadOnly() && value.getName() === 'string') {
			value.setInstance(instance);
		}
		else {
			this.setProperty(property, new EValue('string', EUI, instance));
		}
	}
	/**
	 * 设置Class属性值,null或空字符串表示要清空属性。
	 */
	public setClass(property: string, instance: string): void {
		if (!instance) {
			this.setProperty(property, null);
			return;
		}
		instance = instance.split('::').join('.');
		this.setProperty(property, new EClass(this.getExmlModel(), instance));
	}

	/**
	 * 设置boolean属性值。
	 */
	public setBoolean(property: string, instance: boolean): void {
		const value: IValue = this.getProperty(property);
		if (value && !value.getReadOnly() && value.getName() === 'boolean') {
			value.setInstance(instance);
		}
		else {
			this.setProperty(property, new EValue('boolean', EUI, instance));
		}
	}

	/**
	 * 刷新instance的属性，与node的属性保持一致
	 */
	public refresh(): void {
		Object.keys(this.changedPropertyDic).forEach(prop => {
			this._setInstanceValue(prop, this.getDefaultValue(prop), false);
		});
		this.changedPropertyDic = Object.create(null);

		const properties = Object.create(null);
		Object.keys(this.propertyDic).forEach(prop => {
			if (prop.lastIndexOf('.readOnly') !== -1) {
				prop = prop.substring(0, prop.lastIndexOf('.readOnly'));
			}
			const value = this.getProperty(prop);
			if (value) {
				properties[prop] = value.getInstance();
			}
		});
		this.setInstanceValues(properties);
	}
	/**
	 * 销毁
	 */
	public destroy(): void {
		for (const prop in this.propertyDic) {
			const value: IValue = this.propertyDic[prop] as IValue;
			value.destroy();
		}
		this.instanceChangeDisposables.disposeAll();
		super.destroy();
	}
}



/**
 * 尺寸类型节点。通常用于表示width,percentWidth,height和percentHeight的值。
 * 设置instance为数字表示修改width和height，设置instance为类似'100%'的字符串表示修改percentWidth和percentHeight。
 */
export class ESize extends EValue implements ISize {
	/**
	 * 构造函数
	 * @param instance Number或类似'100%'的String
	 */
	constructor(instance: any = null) {
		if (typeof instance === 'string' && (<string>instance).indexOf('%') === -1) {
			if (instance.trim() === '') {
				instance = Number.NaN;
			} else {
				instance = Number(instance);
			}
		}
		super('number', EUI, instance);
		registerInstanceType(this.getType(), 'eui.ISize');
	}
	/**
	 * 类型
	 */
	public getType(): string {
		return 'eui.ESize';
	}

	/**
	 * 此属性为数字时表示修改width和height，为类似'100%'的字符串时表示修改percentWidth和percentHeight。
	 */
	public getInstance(): any {
		return this._instance;
	}
	/**
	 * 设置实例
	 * @param value 
	 */
	public setInstance(value: any): void {
		if (typeof value === 'string' && (<string>value).indexOf('%') === -1) {
			value = Number(value);
		}
		super.setInstance(value);
	}
}


/**
 * 类定义引用节点
 */
export class EClass extends EValue implements IClass {
	/**
	 * 构造函数
	 * @param className 类名
	 */
	constructor(exmlModel: IExmlModel, className: string, xml: sax.Tag = null) {
		super('Class', EUI, null);
		let ins: any = null;
		this.setExmlModel(exmlModel);
		if (xml) {
			this._classXML = xmlTagUtil.parse(xmlTagUtil.stringify(xml));
			this._isInner = true;
			this.asChild = true;
		}

		if (className) {
			ins = this.getExmlConfig().compileIfNeed(className);
		}
		else if (xml) {
			className = EClass.getClassName(xml);
			xml = xmlTagUtil.parse(xmlTagUtil.stringify(xml));
			xml.attributes['class'] = className;
			const attribute: sax.Attribute = {
				name: 'class',
				value: className,
				start: 0,
				end: 0,
			};
			let index: number = -1;
			for (let i = 0; i < xml.attributeNodes.length; i++) {
				if (xml.attributeNodes[i].name === 'class') {
					index = i;
					break;
				}
			}
			if (index === -1) {
				xml.attributeNodes.push(attribute);
			} else {
				xml.attributeNodes[index] = attribute;
			}
			ins = this.getExmlConfig().getClassByName(className);
			if (!ins) {
				ins = this.getExmlConfig().compile(null, xmlTagUtil.stringify(xml));
			}
		}
		this._className = className;
		this._instance = ins;
		// this.getExmlConfig().addEventListener(ExmlConfigEvent.SKIN_FACTORY_CHANGE, this.onClassChange, this);
		registerInstanceType(this.getType(), 'eui.IClass');
	}
	/**
	 * 类型
	 */
	public getType(): string {
		return 'eui.EClass';
	}


	private _isInner: boolean = false;
	/**
	 * 是否是内部类
	 */
	public getIsInner(): boolean {
		return this._isInner;
	}

	private _classXML: sax.Tag;
	/**
	 * 表示该类节点的xml对象，当作为内部类时有效，否则为null
	 */
	public getClassXML(): sax.Tag {
		return this._classXML;
	}

	private static count: number = 0;
	/**
	 * 返回类名
	 */
	private static getClassName(xml: sax.Tag): string {
		const className: string = parseClassName(xml);
		if (className) {
			return className;
		}
		else {
			EClass.count++;
			return '$wing_exmlClass' + EClass.count;
		}
	}

	private _className: string;
	/**
	 * 包含包路径的完整类名
	 */
	public getClassName(): string {
		return this._className;
	}
	// /**
	//  * 类定义改变
	//  */
	// private onClassChange(event: ExmlConfigEvent): void {
	// 	if (event.className !== this._className) {
	// 		return;
	// 	}
	// 	super.setInstance(this.getExmlConfig().getClassByName(this._className));
	// }

	/**
	 * 转换成字符串
	 */
	public toString(): string {
		return this._className ? this._className : '';
	}
	/**
	 * 销毁
	 */
	public destroy(): void {
		// this.getExmlConfig().removeEventListener(ExmlConfigEvent.SKIN_FACTORY_CHANGE, this.onClassChange, this);
		super.destroy();
	}
}



/**
 * 可视元素节点
 */
export class ENode extends EObject implements INode {
	/**
	 * 构造函数
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	constructor(name: string, ns: Namespace, instance: any = null) {
		super(name, ns, instance);
		registerInstanceType(this.getType(), 'eui.INode');
	}
	/**
	 * 类型
	 */
	public getType(): string {
		return 'eui.ENode';
	}

	private _locked: boolean = false;
	/**
	 * 是否被锁定无法点击或选中
	 */
	public getLocked(): boolean {
		const lockedValue: IValue = this.getProperty('locked');
		if (lockedValue) {
			return lockedValue.getInstance();
		}
		return this._locked;
	}
	/**
	 * 是否被锁定
	 * @param value 
	 */
	public setLocked(value: boolean): void {
		if (this.getLocked() === value) {
			return;
		}
		this._locked = value;
		if (value) {
			this.setProperty('locked', new EValue('boolean', W_EUI, value), false);
		}
		else {
			this.setProperty('locked', null);
		}
		this._onLockedChanged.fire({
			node: this,
			target: this
		});
		if (this._locked && this.getInDisplayList()) {
			this.cancelAllSelected(this, this.getRoot());
		}
	}

	private cancelAllSelected(nodeValue: INode, root: IValue): void {
		const node: ENode = <ENode><any>nodeValue;
		if (node._selected) {
			node._selected = false;
			(root as EValue)._onNodeSelectChanged.fire({
				node: node,
				target: this
			});
		}
		const container: IContainer = <IContainer><any>node;
		if (container && 'getNumChildren' in container && 'getNodeAt' in container) {
			const length = container.getNumChildren();
			for (let i = 0; i < length; i++) {
				nodeValue = container.getNodeAt(i);
				this.cancelAllSelected(nodeValue, root);
			}
		}
	}

	public _selected: boolean = false;
	/**
	 * 是否被选中。
	 */
	public getSelected(): boolean {
		return this._selected;
	}
	/**
	 * 设置选择
	 * @param value 
	 */
	public setSelected(value: boolean): void {
		if (this._selected === value || this.getLocked() || !this.getInDisplayList()) {
			return;
		}
		//节点删除时的选中状态改变事件，在ExmlModel中实现。
		this._selected = value;
		(this.getRoot() as EValue)._onNodeSelectChanged.fire({
			node: this,
			target: this
		});
		if (this._selected) {
			let node: INode = this;
			while (node.getParent()) {
				if (node.getParent() instanceof EViewStack) {
					(<EViewStack>node.getParent()).setSelectedIndex((<EViewStack>node.getParent()).getNodeIndex(node));
				}
				node = node.getParent();
			}
		}
	}

	/**
	 * 是否在指定的节点树下被选中。
	 * @param rootNode 对应节点树的根节点
	 */
	public isSelectedBy(rootNode: INode): boolean {
		return this._selected && this.getRoot() === rootNode && this.getInDisplayList();
	}
	/**
	 * 此节点是否处于显示列表中
	 */
	public getInDisplayList(): boolean {
		let node: INode = this;
		if (node.getInstance() && !node.getInstance()['visible']) {
			return false;
		}
		while (node.getParent()) {
			node = node.getParent();
			if (node.getInstance() && !node.getInstance()['visible']) {
				return false;
			}
		}
		return node.getIsRoot();
	}

	public _parent: EContainer;
	/**
	 * 设置父级容器节点
	 */
	public setParent(value: EContainer): void {
		if (this._parent === value) {
			return;
		}
		this._parent = value;
	}
	/**
	 * 父级显示元素节点
	 */
	public getParent(): IContainer {
		return this._parent;
	}

	public _nestLevel: number = 0;
	/**
	 * 嵌套深度
	 */
	public getNestLevel(): number {
		return this._nestLevel;
	}
	/**
	 * 设置嵌套深度
	 * @param value 
	 */
	public setNestLevel(value: number): void {
		this._nestLevel = value;
	}
	/**
	 * 设置ESize属性值。instance为Number或类似'100%'的String，null表示要清空属性。
	 */
	public setSize(property: string, instance: any): void {
		if (instance === null) {
			this.setProperty(property, null);
			return;
		}
		const value: ESize = this.getProperty(property) as ESize;
		if (value && !value.getReadOnly()) {
			value.setInstance(instance);
		}
		else {
			this.setProperty(property, new ESize(instance));
		}
	}
	/**
	 * 设置九宫格属性值,null或空字符串表示要清空属性。
	 */
	public setScale9Grid(expression: string): void {
		const property: string = 'scale9Grid';
		if (!expression) {
			this.setProperty(property, null);
			return;
		}
		this.setProperty(property, new EScale9Grid(expression));
	}
	/**
	 * 设置实例
	 * @param value 
	 */
	public setInstance(value: any): void {
		if (this._instance === value) {
			return;
		}
		if (this._instance) {
			this.removeEventFormOld(this._instance);
		}
		this._instance = value;
		if (this._instance) {
			this.addEventForNew(this._instance);
		}
	}
	/**
	 * 给旧的对象移除事件
	 * @param $instance
	 */
	private removeEventFormOld($instance: any): void {
		for (const eventType in this.egretEventsMap) {
			const listenersMap: any = this.egretEventsMap[eventType];
			for (const funcKey in listenersMap) {
				//移除js事件
				if ($instance[funcKey]) {
					$instance.removeEventListener(eventType, $instance[funcKey], $instance);
				}
				//移除js的回调方法
				delete $instance[funcKey];
			}
		}
	}
	/**
	 * 给新的对象添加已有事件
	 * @param $instance
	 */
	private addEventForNew($instance: any): void {
		for (const eventType in this.egretEventsMap) {
			const listenersMap: any = this.egretEventsMap[eventType];
			for (const funcKey in listenersMap) {
				//赋值js方法
				$instance[funcKey] = listenersMap[funcKey]['jsFunc'];
				//添加js事件
				$instance.addEventListener(eventType, $instance[funcKey], $instance);
			}
		}
	}

	private egretEventsMap: { [type: string]: any } = {};
	/**
	 * 添加Egret事件到js对象上
	 * @param type 事件的类型。
	 * @param listener 处理事件的侦听器函数。此函数必须接受 Event 对象作为其唯一的参数，并且不能返回任何结果，
	 */
	public addEgretEventlistener(type: string, listener: Function, thisArg: any): void {
		let listenersMap: any = this.egretEventsMap[type];
		if (!listenersMap) {
			this.egretEventsMap[type] = {};
			listenersMap = this.egretEventsMap[type];
		}
		//检查是否已经添加过该事件了
		for (const key in listenersMap) {
			const obj = listenersMap[key];
			if (obj['asFunc'] === listener && obj['thisArg'] === thisArg) {
				return;
			}
		}
		const funcKey: string = '__' + type + '_handler' + (new Date().getTime()).toString(16);
		//创建as方法，js方法，js方法名的对应关系
		listenersMap[funcKey] = {
			'jsFunc': function (event: any): void { listener.call(thisArg, event); },
			'asFunc': listener,
			'thisArg': thisArg
		};
		//添加js事件
		if (this.getInstance()) {
			this.getInstance()[funcKey] = listenersMap[funcKey]['jsFunc'];
			this.getInstance().addEventListener(type, this.getInstance()[funcKey], this.getInstance());
		}
	}
	/**
	 * 移除egret事件
	 * @param type 事件的类型。
	 * @param listener 要删除的侦听器对象。
	 */
	public removeEgretEventlistener(type: string, listener: Function, thisArg: any): void {
		let listenersMap: any = this.egretEventsMap[type];
		if (!listenersMap) {
			this.egretEventsMap[type] = {};
			listenersMap = this.egretEventsMap[type];
		}
		//检查是否已经添加过该事件了
		let funcKey: string = '';
		for (const tempFuncKey in listenersMap) {
			if (listenersMap[tempFuncKey]['asFunc'] === listener && listenersMap[tempFuncKey]['thisArg'] === thisArg) {
				funcKey = tempFuncKey;
				break;
			}
		}
		if (funcKey) {
			if (this._instance) {
				//给js对象移除事件。
				if (this._instance[funcKey]) {
					this._instance.removeEventListener(type, this._instance[funcKey], this._instance);
				}
				//移除js的回调方法
				delete this._instance[funcKey];
			}
			delete listenersMap[funcKey];
		}
	}
}


/**
 * 九宫格数据。通常表示UIAsset.scale9Grid属性的值。可以写为
 */
export class EScale9Grid extends EValue implements IScale9Grid {
	/**
	 * 构造函数
	 * @param value 由四个数字组成的字符串,分别表示x，y，width，height，例如：'7,7,46,46';
	 */
	constructor(expression: string) {
		super('EScale9Grid', EUI, null);
		let instance: any;
		this._expression = expression;
		if (expression) {
			instance = getScale9Grid(expression);
		}
		this._instance = instance;
		registerInstanceType(this.getType(), 'eui.IScale9Gird');
	}
	/**
	 * 类型
	 */
	public getType(): string {
		return 'eui.EScale9Grid';
	}
	private _expression: string;
	/**
	 * 由四个数字组成的字符串表达式。
	 */
	public getExpression(): string {
		return this._expression;
	}
	public toString(): string {
		return this.getExpression() ? this.getExpression() : '';
	}
}


/**
 * 显示元素容器节点
 */
export class EContainer extends ENode implements IContainer {
	private propertyChangeDisposables: EventDisposableManager = new EventDisposableManager();
	/**
	 * 构造函数
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	constructor(name: string, ns: Namespace, instance: any = null) {
		super(name, ns, instance);
		registerInstanceType(this.getType(), 'eui.IContainer');
	}
	/**
	 * 类型
	 */
	public getType(): string {
		return 'eui.EContainer';
	}

	/**
	 * 备份的子项列表
	 */
	protected backupChildNodes: INode[] = [];
	/**
	 * 子项列表
	 */
	private getChildNodes(): EArray {
		let _childNodes: EArray;
		const dV: IValue = this.getProperty(this.getDefaultProp());
		if (dV && dV instanceof EArray) {
			_childNodes = dV as EArray;
		} else {
			_childNodes = new EArray();
			_childNodes.xmlVisible = false;
			this.setProperty(this.getDefaultProp(), _childNodes);
		}
		return _childNodes;
	}
	/**
	 * 容器自身正在调整子项的标志
	 */
	private inAdjustingChild: boolean = false;
	/**
	 * 为子类保留原始的setValue接口
	 */
	public $setValue(key: string, value: IValue): void {
		super.setValue(key, value);
	}
	/**
	 * 设置值
	 * @param key 
	 * @param value 
	 */
	public setValue(key: string, value: IValue): void {
		if (key === this.getDefaultProp()) {
			const oldValue: EArray = this.getProperty(key) as EArray;
			if (oldValue === value) {
				return;
			}
			const newValue: EArray = value as EArray;
			if (oldValue) {
				this.propertyChangeDisposables.dispose(oldValue);
			}
			if (newValue) {
				this.propertyChangeDisposables.addDisposable(newValue, newValue.onPropertyChanged(e => this.onChildNodesChange(e)));
			}
			if (this.inAdjustingChild) {
				return;
			}
			if (!oldValue && newValue.getLength() === 0) {
				return;
			}
			this.invalidateChildList();
		}
		else {
			super.setValue(key, value);
		}
	}
	/**
	 * 子项列表改变
	 */
	private onChildNodesChange(event: PropertyChangedEvent): void {
		if (this.inAdjustingChild) {
			return;
		}
		this.invalidateChildList();
	}

	private invalidateChildListFlag: boolean = false;
	/**
	 * 标记需要重置子项列表
	 */
	private invalidateChildList(): void {
		if (this.invalidateChildListFlag) {
			return;
		}
		this.invalidateChildListFlag = true;
		setTimeout(() => {
			this.validateChildList();
		}, 1);
	}
	/**
	 * 如果子项列表发生过改变,则立即刷新子项列表。
	 */
	public validateChildList(): void {
		if (!this.invalidateChildListFlag) {
			return;
		}
		this.invalidateChildListFlag = false;
		let i: number;
		for (i = this.backupChildNodes.length - 1; i >= 0; i--) {
			this.nodeRemoved(this.backupChildNodes[i], i);
		}
		const childArray: EArray = this.getProperty(this.getDefaultProp()) as EArray;
		if (childArray) {
			const childNodes: EValue[] = childArray.childNodes;
			const n = childNodes.length;
			for (i = 0; i < n; i++) {
				const node: ENode = <ENode>childNodes[i];
				if (node.getParent()) {
					node.getParent().removeNode(node);
				}
				this.nodeAdded(node, i);
			}
		}
	}
	/**
	 * 子节点数量
	 */
	public getNumChildren(): number {
		return this.getChildNodes().getLength();
	}

	/**
	 * 获取指定索引位置的子节点
	 */
	public getNodeAt(index: number): INode {
		if (this.checkForRangeError(index)) {
			return null;
		}
		return <INode><any>this.getChildNodes().childNodes[index];
	}

	/**
	 * 检查索引是否越界,返回是否越界。
	 */
	private checkForRangeError(index: number, addingNode: boolean = false): Boolean {
		let maxIndex: number = this.getChildNodes().getLength() - 1;

		if (addingNode) {
			maxIndex++;
		}

		if (index < 0 || index > maxIndex) {
			console.log('Index: "' + index + '" is beyond the scope of the visual elements');
			return true;
		}
		return false;
	}

	/**
	 * 添加子节点
	 */
	public addNode(node: INode): INode {
		if (!node) {
			return node;
		}
		let index: number = this.getNumChildren();

		if (node.getParent() === this) {
			index = this.getNumChildren() - 1;
		}

		return this.addNodeAt(node, index);
	}

	/**
	 * 添加子节点到指定的索引位置
	 */
	public addNodeAt(node: INode, index: number): INode {
		if (node === this) {
			return node;
		}

		if (this.checkForRangeError(index, true)) {
			return node;
		}

		const host: IContainer = node.getParent();
		if (host === this) {
			this.setNodeIndex(node, index);
			return node;
		}
		else if (host) {
			host.removeNode(node);
		}
		this.inAdjustingChild = true;
		this.getChildNodes().splice(index, 0, node);
		this.inAdjustingChild = false;
		this.nodeAdded(node, index);
		return node;
	}
	/**
	 * 设置嵌套深度
	 * @param value 
	 */
	public setNestLevel(value: number): void {
		if (this.getNestLevel() === value) {
			return;
		}
		super.setNestLevel(value);
		for (let i = 0; i < this.getChildNodes().childNodes.length; i++) {
			const node: ENode = <ENode>this.getChildNodes().childNodes[i];
			node.setNestLevel(value + 1);
		}
	}

	/**
	 * 移除子节点
	 */
	public removeNode(node: INode): INode {
		return this.removeNodeAt(this.getNodeIndex(node));
	}

	/**
	 * 移除指定索引位置的子节点
	 */
	public removeNodeAt(index: number): INode {
		if (this.checkForRangeError(index)) {
			return null;
		}

		const node: ENode = this.getChildNodes().getValueAt(index) as ENode;
		this.nodeRemoved(node, index);
		this.inAdjustingChild = true;
		this.getChildNodes().splice(index, 1, null);
		this.inAdjustingChild = false;
		return node;
	}
	/**
	 * 移除所有节点
	 */
	public removeAllNodes(): void {
		for (let i = this.getNumChildren() - 1; i >= 0; i--) {
			this.removeNodeAt(i);
		}
	}

	/**
	 * 获取指定节点的索引位置
	 */
	public getNodeIndex(node: INode): number {
		return this.getChildNodes().indexOf(node);
	}

	/**
	 * 设置指定节点的索引位置
	 */
	public setNodeIndex(node: INode, index: number): void {
		if (this.checkForRangeError(index)) {
			return;
		}

		const oldIndex: number = this.getNodeIndex(node);
		if (oldIndex === -1 || oldIndex === index) {
			return;
		}

		this.nodeRemoved(node, oldIndex);

		this.inAdjustingChild = true;
		this.getChildNodes().splice(oldIndex, 1, null);
		this.getChildNodes().splice(index, 0, node);
		this.inAdjustingChild = false;

		this.nodeAdded(node, index);
	}
	/**
	 * 交换两个子节点的位置
	 */
	public swapNodes(node1: INode, node2: INode): void {
		this.swapNodesAt(this.getNodeIndex(node1), this.getNodeIndex(node2));
	}
	/**
	 * 交换两个指定索引位置的子节点
	 */
	public swapNodesAt(index1: number, index2: number): void {
		if (this.checkForRangeError(index1)) {
			return;
		}
		if (this.checkForRangeError(index2)) {
			return;
		}

		if (index1 > index2) {
			const temp: number = index2;
			index2 = index1;
			index1 = temp;
		}
		else if (index1 === index2) {
			return;
		}

		const node1: ENode = this.getChildNodes().getValueAt(index1) as ENode;
		const node2: ENode = this.getChildNodes().getValueAt(index2) as ENode;

		this.nodeRemoved(node1, index1);
		this.nodeRemoved(node2, index2);

		this.inAdjustingChild = true;
		this.getChildNodes().splice(index2, 1, null);
		this.getChildNodes().splice(index1, 1, null);

		this.getChildNodes().splice(index1, 0, node2);
		this.getChildNodes().splice(index2, 0, node1);
		this.inAdjustingChild = false;

		this.nodeAdded(node2, index1);
		this.nodeAdded(node1, index2);
	}
	/**
	 * 是否包含有某个节点，当节点为子项或自身时都返回true。
	 */
	public contains(node: INode): boolean {
		if (node === this) {
			return true;
		}
		while (node.getParent()) {
			node = node.getParent();
			if (node === this) {
				return true;
			}
		}
		return false;
	}

	/**
	 * 添加了一个node
	 */
	public nodeAdded(node: INode, index: number, notifyListeners: boolean = true): void {
		if (this.invalidateChildListFlag) {
			return;
		}
		this.backupChildNodes.splice(index, 0, node);
		if (this._instance && node.getInstance()) {
			try {
				let skinChildNum: number = 0;
				if (this._instance.skin && this._instance.skin.$elementsContent) {
					skinChildNum = this._instance.skin.$elementsContent.length;
				}
				this._instance.addChildAt(node.getInstance(), index + skinChildNum);
			}
			catch (e) { }
		}

		(<ENode>node).setParent(this);
		node.setNestLevel(this.getNestLevel() + 1);
		node.refresh();
		if (notifyListeners) {
			if (this.getInDisplayList()) {
				(this.getRoot() as EValue)._onNodeAdded.fire({
					index: index,
					node: node,
					target: this
				});
			}
		}
	}
	/**
	 * 移除了一个node
	 */
	public nodeRemoved(node: INode, index: number, notifyListeners: boolean = true): void {
		if (this.invalidateChildListFlag) {
			return;
		}
		this.backupChildNodes.splice(index, 1);
		if (notifyListeners) {
			if (this.getInDisplayList()) {
				(this.getRoot() as EValue)._onNodeRemoved.fire({
					index: index,
					node: node,
					target: this
				});
			}
		}
		if (this._instance && node.getInstance()) {
			try {
				this._instance.removeChild(node.getInstance());
			}
			catch (e) { }
		}
		(<ENode>node).setParent(null);
	}
	/**
	 * 销毁
	 */
	public destroy() {
		this.propertyChangeDisposables.disposeAll();
		super.destroy();
	}
}


/**
 * 层级堆叠容器节点。
 */
export class EViewStack extends EContainer implements IViewStack {
	/**
	 * 构造函数
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	constructor(name: string, ns: Namespace, instance: any = null) {
		super(name, ns, instance);
		registerInstanceType(this.getType(), 'eui.IViewStack');
	}
	/**
	 * 类型
	 */
	public getType(): string {
		return 'eui.EViewStack';
	}
	/**
	 * 当前可见子元素的索引。索引从0开始。
	 */
	public getSelectedIndex(): number {
		if (this.getInstance()) {
			return this.getInstance().selectedIndex;
		}
		return -1;
	}
	/**
	 * 设置选中的索引
	 * @param value 
	 */
	public setSelectedIndex(value: number): void {
		const oldIndex: number = this.getSelectedIndex();
		if (oldIndex === value) {
			return;
		}
		this.setNumber('selectedIndex', value);
		if (this.getInDisplayList()) {
			let oldNode: INode;
			if (oldIndex >= 0 && oldIndex < this.getNumChildren()) {
				oldNode = this.getNodeAt(oldIndex);
			}
			this._onViewStackIndexChanged.fire({
				oldNode: oldNode,
				newNode: this,
				target: this
			});
			(this.getRoot() as EValue)._onViewStackIndexChanged.fire({
				oldNode: oldNode,
				newNode: this,
				target: this
			});
		}
	}

	/**
	 * 当前选中的可见子元素。
	 */
	public getDirectChild(): INode {
		const index: number = this.getSelectedIndex();
		if (index >= 0 && index < this.getNumChildren()) {
			return this.getNodeAt(index);
		}
		return null;
	}
	/**
	 * 设置当前的直接子项
	 * @param value 
	 */
	public setDirectChild(value: INode): void {
		this.setSelectedIndex(this.getNodeIndex(value));
	}
	/**
	 * 移除了一个node
	 */
	public nodeRemoved(node: INode, index: number, notifyListeners: boolean = true): void {
		const selectedIndexChange: Boolean = Boolean(index === this.getSelectedIndex());
		super.nodeRemoved(node, index, notifyListeners);
		if (selectedIndexChange && this.getInDisplayList()) {

			this._onViewStackIndexChanged.fire({
				oldNode: node,
				newNode: this,
				target: this
			});
			(this.getRoot() as EValue)._onViewStackIndexChanged.fire({
				oldNode: node,
				newNode: this,
				target: this
			});
		}
	}
}

/**
 * 视域滚动容器节点。例如Scroller,PageNavigator。它虽然继承于EContainer，
 * 但子项数量限制为一个，且只能通过viewport属性改变子项，无法通过EContainer的addNode()等方法修改。
 */
export class EScroller extends EContainer implements ISingleChild, IScroller {
	/**
	 * 构造函数
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	constructor(name: string, ns: Namespace, instance: any = null) {
		super(name, ns, instance);
		registerInstanceType(this.getType(), 'eui.ISingleChild');
		registerInstanceType(this.getType(), 'eui.IScroller');
	}
	/**
	 * 类型
	 */
	public getType(): string {
		return 'eui.EScroller';
	}
	/**
	 * 要滚动的视域组件。
	 */
	public getDirectChild(): INode {
		return this.getProperty(this.getDefaultProp()) as INode;
	}
	/**
	 * 设置当前的直接子项
	 * @param value 
	 */
	public setDirectChild(node: INode): void {
		if (node === this) {
			return;
		}
		if (node) {
			const host: IContainer = node.getParent();
			if (host === this) {
				return;
			}
			if (host) {
				host.removeNode(node);
			}
		}
		this.setProperty(this.getDefaultProp(), node);
	}
	/**
	 * 设置值
	 * @param key 
	 * @param value 
	 */
	public setValue(key: string, value: IValue): void {
		this.$setValue(key, value);
		if (key === this.getDefaultProp()) {
			const oldValue: ENode = this.getProperty(key) as ENode;
			if (oldValue === value) {
				return;
			}
			const newValue: ENode = value as ENode;
			if (oldValue) {
				this.viewPortRemoved(oldValue);
			}
			if (newValue) {
				this.viewPortAdded(newValue);
			}
		}
	}

	private viewPortRemoved(node: ENode): void {
		this.backupChildNodes.splice(0, 1);
		if (this.getInDisplayList()) {
			(this.getRoot() as EValue)._onNodeRemoved.fire({
				index: 0,
				node: node,
				target: this
			});
		}

		if (this._instance) {
			try {
				this._instance.viewport = null;
			}
			catch (e) { }
		}
		(<ENode>node).setParent(null);
	}

	private viewPortAdded(node: ENode): void {
		this.backupChildNodes.splice(0, 0, node);
		if (this._instance && node.getInstance()) {
			try {
				this._instance.viewport = node.getInstance();
			}
			catch (e) { }
		}

		(<ENode>node).setParent(this);
		node.setNestLevel(this.getNestLevel() + 1);
		node.refresh();
		if (this.getInDisplayList()) {
			(this.getRoot() as EValue)._onNodeAdded.fire({
				index: 0,
				node: node,
				target: this
			});
		}
	}
	/**
	 * 验证子项列表
	 */
	public validateChildList(): void {

	}
	/**
	 * 设置嵌套深度
	 * @param value 
	 */
	public setNestLevel(value: number): void {
		if (this._nestLevel === value) {
			return;
		}
		this._nestLevel = value;
		const _viewport: INode = this.getDirectChild();
		if (_viewport) {
			this.getDirectChild().setNestLevel(value + 1);
		}
	}
	/**
	 * 得到子项数量
	 */
	public getNumChildren(): number {
		return this.getDirectChild() ? 1 : 0;
	}

	/**
	 * 抛出索引越界异常
	 */
	private throwRangeError(index: number): void {
		console.log('Index: "' + index + '" is beyond the scope of the visual elements');
	}
	/**
	 * 获取指定索引位置的子节点
	 */
	public getNodeAt(index: number): INode {
		const _viewport: INode = this.getDirectChild();
		if (_viewport && index === 0) {
			return _viewport;
		} else {
			this.throwRangeError(index);
		}
		return null;
	}
	/**
	 * 获取指定节点的索引位置
	 */
	public getNodeIndex(node: INode): number {
		if (node && node === this.getDirectChild()) {
			return 0;
		} else {
			return -1;
		}
	}

	private throwNotSupportedError(): void {
		console.log('This method is not available in the Scroller component!  ');
	}
	/**
	 * 添加子节点
	 */
	public addNode(node: INode): INode {
		this.throwNotSupportedError();
		return null;
	}
	/**
	 * 添加子节点到指定的索引位置
	 */
	public addNodeAt(node: INode, index: number): INode {
		this.throwNotSupportedError();
		return null;
	}
	/**
	 * 移除子节点
	 */
	public removeNode(node: INode): INode {
		this.throwNotSupportedError();
		return null;
	}
	/**
	 * 移除指定索引位置的子节点
	 */
	public removeNodeAt(index: number): INode {
		this.throwNotSupportedError();
		return null;
	}
	/**
	 * 移除所有节点
	 */
	public removeAllNodes(): void {
		this.throwNotSupportedError();
	}
	/**
	 * 设置指定节点的索引位置
	 */
	public setNodeIndex(node: INode, index: number): void {
		this.throwNotSupportedError();
	}
	/**
	 * 交换两个子节点的位置
	 */
	public swapNodes(node1: INode, node2: INode): void {
		this.throwNotSupportedError();
	}
	/**
	 * 交换两个指定索引位置的子节点
	 */
	public swapNodesAt(index1: number, index2: number): void {
		this.throwNotSupportedError();
	}
}


/**
 * 链接值类型节点
 */
export class ELink extends EValue implements ILink {
	private instanceChangeDisposables: EventDisposableManager = new EventDisposableManager();
	/**
	 * 构造函数
	 * @param expression 对象表达式。
	 * 若表达式里含有对其他id的引用，务必在之后调用addRelatives()添加引用的EValue对象列表
	 */
	constructor(expression: string) {
		super('ELink', EUI);
		this.expression = trim(expression);
		this.updateInstance();
		registerInstanceType(this.getType(), 'eui.ILink');
	}
	/**
	 * 类型
	 */
	public getType(): string {
		return 'eui.ELink';
	}
	/**
	 * 设置此属性无效
	 */
	public setInstance(value: any): void {
	}
	/**
	 * 节点对应的值或实例引用
	 */
	public getInstance(): any {
		const superInstance: any = super.getInstance();
		if (this.getHost() && !superInstance) {
			const className: string = this.getExmlConfig().getClassNameById(this.getHost().getName(), this.getHost().getNs());
			const type: String = this.getExmlConfig().getPropertyType(this.getHostProperty(), className);
			if (type === 'string') {
				return this.toString();
			}
		}
		return superInstance;
	}

	/**
	 * 对象表达式
	 */
	private expression: string = '';
	/**
	 * id缓存表
	 */
	private idMap: { [id: string]: IValue } = {};
	/**
	 * 根据ID获取对应的值节点
	 */
	public getRelativeByID(id: string): IValue {
		return this.idMap[id];
	}
	/**
	 * 添加一个引用的ID节点
	 */
	public addRelatives(values: EValue[]): void {
		for (let i = 0; i < values.length; i++) {
			const value: EValue = values[i];
			if (value.getId() in this.idMap) {
				continue;
			}
			this.instanceChangeDisposables.addDisposable(value, value.onInstanceChanged(e => this.updateInstance(e)));
			this.idMap[value.getId()] = value;
		}
		this.updateInstance();
	}

	private _relativeIdList: string[] = [];
	/**
	 * 关联的id列表
	 */
	public getRelativeIdList(): string[] {
		return this._relativeIdList;
	}

	/**
	 * 更新instance属性的值
	 */
	private updateInstance(event: InstanceChangedEvent = null): void {
		super.setInstance(this.parseExp(this.expression));
		this._onInstanceChanged.fire({ target: this });
	}

	/**
	 * 解析表达式
	 */
	private parseExp(exp: string): any {
		exp = trim(exp);
		if (!exp) {
			return null;
		}
		// var firstChar: string = exp.charAt(0);
		let instance: any;
		// if (firstChar === '[') {
		// 	var strs: string[] = exp.substring(1, exp.length - 1).split(',');
		// 	var arr: any[] = [];
		// 	for (var i = 0; i < strs.length; i++) {
		// 		var str: string = strs[i];
		// 		if (str === '') {
		// 			continue;
		// 		}
		// 		arr.push(this.parseExp(str));
		// 	}
		// 	instance = arr;
		// }
		// else if (firstChar === '{') {
		// 	strs = exp.substring(1, exp.length - 1).split(',');
		// 	var obj: Object = {};
		// 	for (var i = 0; i < strs.length; i++) {
		// 		var str: string = strs[i];
		// 		if (str === '' || str.indexOf(':') === -1) {
		// 			continue;
		// 		}
		// 		var keyArr: string[] = str.split(':');
		// 		var key: string = this.escapeQuotation(keyArr[0]);
		// 		var value: string = keyArr[1];
		// 		obj[key] = this.parseExp(value);
		// 	}
		// 	instance = obj;
		// }
		// else if (firstChar === '\'' || firstChar === '\"') {
		// 	instance = this.escapeQuotation(exp);
		// }
		if (!isNaN((<number><any>exp))) {
			instance = Number(exp);
		} else if (exp === 'true') {
			instance = true;
		} else if (exp === 'false') {
			instance = false;
		}
		else {
			const dV: EValue = <EValue>this.idMap[exp];
			//如果不在idmap，那么直接返回表达式
			instance = dV ? dV.getInstance() : null;
			if (this._relativeIdList.indexOf(exp) === -1) {
				this._relativeIdList.push(exp);
			}
		}
		return instance;
	}
	// /**
	//  * 移除字符串的双引号
	//  */
	// private escapeQuotation(str: string): string {
	// 	str = StringUtil.trim(str);
	// 	if (!str) {
	// 		return '';
	// 	}
	// 	if (str.charAt(0) === '\'' || str.charAt(0) === '\"') {
	// 		return str.substring(1, str.length - 1);
	// 	}
	// 	return str;
	// }
	/**
	 * 转为字符串
	 */
	public toString(): string {
		return this.expression ? '{' + this.expression + '}' : '';
	}
	/**
	 * 销毁
	 */
	public destroy(): void {
		this.instanceChangeDisposables.disposeAll();
		super.destroy();
	}
}