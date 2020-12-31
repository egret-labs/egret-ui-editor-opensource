import { IExmlModel, RootChangedEvent, TextChangedEvent, StateChangedEvent, SelectedListChangedEvent, ITemporaryData } from './models';
import { ExmlModelConfig } from './exmlModeConfig';
import { EValue, ENode, ELink, EObject, EContainer, EArray, ESize, EScale9Grid, EClass, EViewStack, EScroller } from './treeNodesImpls';
import * as sax from '../sax/sax';
import * as xmlTagUtil from '../sax/xml-tagUtils';
import * as xmlStrUtil from '../sax/xml-strUtils';
import { W_EUI, EUI } from '../project/parsers/core/commons';
import { trim, startWith, endWith, escapeHTMLEntity } from '../utils/strings';
import { Namespace } from '../sax/Namespace';
import { IObject, IValue, IArray, INode, isInstanceof, IContainer, ISingleChild, IClass, ILink, ISize, IScale9Grid, IViewStack, IScroller, TreeChangedEvent, TreeChangedKind, NodeAddedEvent, NodeRemovedEvent, NodeSelectChangedEvent, ViewStackIndexChangedEvent } from './treeNodes';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IEgretProjectService } from '../../../project';
import { Point, Rectangle, localToGlobal } from './common';
import { Emitter, Event } from 'egret/base/common/event';
import { IDisposable } from 'egret/base/common/lifecycle';
import { clipboard } from 'electron';
import { setTags, getTags } from './nodeClipboard';
import { ExmlModelCreaterEui } from '../factory/exmlCreaterEui';
import { IAnimationModel } from '../plugin/IAnimationModel';
import { AnimationModel } from '../plugin/animationModelImpl';
import { WingNodeModel, DesignConfig } from './designConfigImpl';
import { IWingNodeModel, IDesignConfig } from './designConfig';


/**
 * 清除相对位置属性
 */
export function cleanRelatvieProps(node: INode): void {
	node.setProperty('left', null);
	node.setProperty('right', null);
	node.setProperty('top', null);
	node.setProperty('bottom', null);
	node.setProperty('horizontalCenter', null);
	node.setProperty('verticalCenter', null);
	if (node.getInstance()) {
		if (node.getInstance().x != 0) { node.setNumber('x', node.getInstance().x); }
		if (node.getInstance().y != 0) { node.setNumber('y', node.getInstance().y); }
	}
	const widthValue: ISize = node.getProperty('width') as ISize;
	if (widthValue && 'setSize' in widthValue && typeof (<any>widthValue).getInstance() === 'string') {
		node.setSize('width', node.getInstance().width);
	}
	const heightValue: ISize = node.getProperty('height') as ISize;
	if (heightValue && 'setSize' in heightValue && typeof (<any>heightValue).getInstance() === 'string') {
		node.setSize('height', node.getInstance().height);
	}
}
/**
 * 可视节点深度排序函数
 */
export function sortOnDepth(a: INode, b: INode): number {
	const aParent: IContainer = a.getParent();
	const bParent: IContainer = b.getParent();

	if (!aParent || !bParent) { return 0; }

	const aNestLevel: number = a.getNestLevel();
	const bNestLevel: number = b.getNestLevel();

	let aIndex: number = 0;
	let bIndex: number = 0;

	if (aParent === bParent) {
		aIndex = aParent.getNodeIndex(a);
		bIndex = bParent.getNodeIndex(b);
	}

	if (aNestLevel > bNestLevel || aIndex > bIndex) { return 1; }
	else if (aNestLevel < bNestLevel || bIndex > aIndex) { return -1; }
	else if (a === b) { return 0; }
	else { return sortOnDepth(aParent, bParent); }
}




/**
 * 历史记录数据对象
 */
export class HistoryInfo {
	/**
	 * 文本信息
	 */
	public textInfo: TextChangeInfo[] = [];
	/**
	 * 文本改变前选中项路径列表
	 */
	public beforeSelected: (number[])[] = [];
	/**
	 * 文本改变后选中项路径列表
	 */
	public afterSelected: (number[])[] = [];
}

/**
 * 文本改变数据对象
 */
export class TextChangeInfo {
	/**
	 * 构造函数
	 */
	constructor(newText: string, oldText: string, startIndex: number) {
		this.newText = newText;
		this.oldText = oldText;
		this.startIndex = startIndex;
	}
	/**
	 * 要插入的文本
	 */
	public newText: string;
	/**
	 * 被替换的文本
	 */
	public oldText: string;
	/**
	 * 要替换的文本起始索引
	 */
	public startIndex: number;
}


/**
 * EXML解析器
 */
export class ExmlTreeParser {
	constructor(exmlModel: ExmlModel) {
		this.exmlModel = exmlModel;
	}
	/**
	 * exml配置管理器
	 */
	private exmlModel: ExmlModel;
	private getExmlConfig(): ExmlModelConfig {
		return this.exmlModel.getExmlConfig();
	}
	/**
	 * id映射表
	 */
	private idDic: { [id: string]: EValue } = {};
	private currentIdMap: { [id: string]: any } = {};
	/**
	 * 当前的视图状态
	 */
	private currentState: string = '';
	private states: string[];

	/**
	 * 根据XML创建对应的DTree，返回根节点。
	 */
	public createExmlTree(xml: sax.Tag, state: string = '', idMap: { [id: string]: EValue } = null): ENode {
		this.currentState = state;
		this.currentIdMap = idMap ? idMap : {};
		this.states = [];

		let currentStates: sax.Tag = null;
		for (var i = 0; i < xml.children.length; i++) {
			if (xml.children[i].namespace === xml.namespace &&
				xml.children[i].localName === 'states') {
				currentStates = xml.children[i];
				break;
			}
		}
		if (currentStates) {
			for (var i = 0; i < currentStates.children.length; i++) {
				if (
					currentStates.children[i].namespace === xml.namespace &&
					currentStates.children[i].localName === 'State'
				) {
					const stateName = currentStates.children[i].attributes['name'];
					this.states.push(stateName);
				}
			}
		}

		if (this.states.length === 0) {
			const statesString: string = xml.attributes['states'];
			if (statesString) {
				this.states = statesString.split(',');
			}
		}

		const eNode: ENode = this.parseExmlValue(xml, !(!this.currentState)) as ENode;

		for (var i = 0; i < this.eLinkList.length; i++) {
			const eLink: ELink = <ELink>this.eLinkList[i];
			const list: EValue[] = [];
			for (let j = 0; j < eLink.getRelativeIdList().length; j++) {
				const id: string = eLink.getRelativeIdList()[j];
				if (this.idDic[id]) {
					list.push(this.idDic[id]);
				}
			}
			eLink.addRelatives(list);
		}
		this.idDic = {};
		this.currentIdMap = {};
		this.eLinkList = [];
		return eNode;
	}

	private eLinkList: EValue[] = [];
	/**
	 * 解析一个XML节点为EValue
	 */
	public parseExmlValue(xml: sax.Tag, inMultipleStates: boolean = false): EValue {
		let eValue: EValue;
		let type: string = xml.localName;
		if (!type) {
			type = 'string';
		}
		if (xml.namespace === W_EUI.uri) {
			eValue = this.parseWingNode(xml);
		}
		else {
			let value: string;
			if (type === 'string') {
				value = xmlTagUtil.stringify(xml);
			}
			else {
				value = trim(xmlTagUtil.stringify(xml));
			}

			eValue = this.createEValue(type, value);
			if (inMultipleStates) {
				inMultipleStates = !xmlStrUtil.isSingleStateItem(xml, this.states);
			}
			if (!eValue) {
				eValue = this.parseEObject(xml);
				const eObject: EObject = eValue as EObject;
				eObject.inMutipleStates = inMultipleStates;
				this.addAttribsToEObject(eObject, xml);
				this.parseChildren(eObject, xml, inMultipleStates);
				//立即刷新子项列表，这里只是为了节点树创建完成时能立即返回正确的结果。默认情况下，容器自身会延迟执行它。
				//这是一个极其显著的性能优化措施，在子项列表EArray发生改变时，只是标记改变，延迟后统一刷新，能节省大量重复刷新时间。
				if (eValue instanceof EContainer) {
					(<EContainer>eValue).validateChildList();
				}
			}
			if (eValue instanceof EArray) {
				(<EArray>eValue).inMutipleStates = inMultipleStates;
				for (let i = 0; i < xml.children.length; i++) {
					const child: sax.Tag = xml.children[i];
					(<EArray>eValue).push(this.parseExmlValue(child, inMultipleStates));
				}
			}
			const id: string = xml.attributes['id'];
			if (id) {
				if (!(eValue instanceof EObject)) {
					eValue.setId(id);
				}
				const idValue: any = this.currentIdMap[id];
				if (!idValue) {
					this.currentIdMap[id] = eValue;
				}
				else if (Array.isArray(idValue)) {
					(<any[]>idValue).push(eValue);
				}
				else {
					this.currentIdMap[id] = [idValue, eValue];
				}
				this.idDic[id] = eValue;
			}
		}
		return eValue;
	}

	/**
	 * 声明节点名常量
	 */
	public static DECLARATIONS: string = 'Declarations';
	/**
	 * 解析一个命名空间为w的节点
	 */
	private parseWingNode(xml: sax.Tag): EValue {
		let eValue: EValue;
		const name: string = xml.localName;
		const ns: Namespace = W_EUI;
		if (name === ExmlTreeParser.DECLARATIONS) {
			const declarations: EArray = new EArray(name, ns);
			for (let i = 0; i < xml.children.length; i++) {
				const decl: sax.Tag = xml.children[i];
				if (!decl.localName) {
					continue;
				}
				declarations.push(this.parseExmlValue(decl, false));
			}
			eValue = declarations;
		}
		else {
			const eObject: EObject = new EObject(name, ns);
			eObject.setExmlModel(this.exmlModel);
			this.addAttribsToEObject(eObject, xml);
			eValue = eObject;
		}
		return eValue;
	}

	/**
	 * 为节点添加属性
	 */
	private addAttribsToEObject(eObject: EObject, xml: sax.Tag): void {
		const className: string = this.getExmlConfig().getClassNameById(xml.localName, new Namespace(xml.prefix, xml.namespace));
		let eValue: EValue;
		for (let i = 0; i < xml.attributeNodes.length; i++) {
			const attrib: sax.Attribute = xml.attributeNodes[i];
			const localName: string = attrib.name;
			// var attribValue: string = unescapeHTMLEntity(attrib.value);
			// var attribValue: string = unescape(attrib.value);
			const attribValue: string = attrib.value;
			const prop: string = this.formatProp(localName);
			if (this.getExmlConfig().wingKeys.hasOwnProperty(prop)) {
				this.addWingAttribs(eObject, prop, attribValue);
				continue;
			}
			const state: string = this.getState(localName);
			if (state && state !== this.currentState) {
				continue;
			}
			let value: string = trim(attribValue);
			if (startWith(value, '{') && endWith(value, '}')) {
				eValue = new ELink(value.substring(1, value.length - 1));
				this.eLinkList.push(eValue);
			}
			else {
				const type: string = this.getExmlConfig().getPropertyType(prop, className);
				if (!type) {
					continue;
				}
				if (type === 'string' || type === 'any') {
					value = attribValue;
				}
				else if (type === 'number' && value.indexOf('#') === 0) {
					value = '0x' + value.substring(1, value.length);
				}
				if (prop === 'height' || prop === 'width' || type === 'Percentage') {
					eValue = new ESize(value);
				}
				else if (prop === 'scale9Grid') {
					eValue = new EScale9Grid(value);
				}
				else {
					eValue = this.createEValue(type, value);
				}
			}
			if (!eValue) {
				continue;
			}
			eValue.asChild = false;
			eValue._readOnly = eObject.inMutipleStates && localName.indexOf('.') === -1;
			eObject.setProperty(prop, eValue);
		}
	}
	/**
	 * 添加Wing节点属性
	 */
	private addWingAttribs(eObject: IObject, prop: string, value: any): void {
		if (this.getExmlConfig().wingKeys.hasOwnProperty(prop)) {
			if (this.getExmlConfig().wingKeys[prop] === 'boolean') {
				value = (value === 'true');
			}
			eObject.setProperty(prop, new EValue(this.getExmlConfig().wingKeys[prop], W_EUI, value));
		}
	}

	/**
	 * 为指定XML节点创建EValue,若目标节点不是基本数据类型，返回null。
	 */
	private createEValue(type: string, value: string): EValue {
		let eValue: EValue;
		const ns: Namespace = EUI;
		switch (type) {
			case 'Array':
				eValue = new EArray();
				break;
			case 'Class':
				eValue = new EClass(this.exmlModel, value);
				break;
			case 'boolean':
				eValue = new EValue(type, ns, value === 'true');
				break;
			case 'number':
				eValue = new EValue(type, ns, Number(value));
				break;
			case 'string':
			case 'any':
				eValue = new EValue(type, ns, value);
				break;
			default:
				break;
		}
		return eValue;
	}

	/**
	 * 解析xml的所有子节点
	 */
	private parseChildren(eObject: EObject, xml: sax.Tag, inMultipleStates: boolean): void {
		let prop: string;
		let state: string;
		let childEValue: EValue;
		let eArray: EArray;
		const className: string = this.getExmlConfig().getClassNameById(eObject.getName(), eObject.getNs());
		let isFirstDirectChild: boolean = true;
		const isContainer: boolean = eObject instanceof EContainer;
		for (let i = 0; i < xml.children.length; i++) {
			const child: sax.Tag = xml.children[i];
			const localName: string = child.localName;
			if (!localName) {
				continue;
			}
			prop = this.formatProp(localName);
			if (child.namespace === W_EUI.uri) {
				childEValue = this.parseExmlValue(child, inMultipleStates);
				eObject.setProperty('w:' + childEValue.getName(), childEValue);
				childEValue.setPropVisible(false);
			}
			else if (this.getExmlConfig().isProperty(child)) {
				state = this.getState(localName);
				if ((state && state !== this.currentState)) {
					continue;
				}
				const inMultiState: boolean = inMultipleStates && !Boolean(state);

				var type: string;
				if (this.getExmlConfig().wingKeys.hasOwnProperty(prop)) {
					type = this.getExmlConfig().wingKeys[prop];
				}
				else {
					type = this.getExmlConfig().getPropertyType(prop, className);
				}
				childEValue = this.getChildrenValue(child.children, type, prop, inMultiState);
				if (!childEValue) {
					continue;
				}
				if (!(childEValue instanceof EArray) && inMultiState && localName.indexOf('.') === -1) {
					childEValue._readOnly = true;
				}
				eObject.setProperty(prop, childEValue);
				childEValue.setPropVisible(true);
			}
			else {
				if (!this.isIncludeIn(child)) {
					continue;
				}

				//解析节点下的skinName属性
				if (this.getExmlConfig().isInstance(eObject.getInstance(), 'eui.Component') && localName === 'Skin') {
					childEValue = new EClass(this.exmlModel, null, child);
					childEValue.asChild = true;
					eObject.setProperty('skinName', childEValue);
					childEValue.setPropVisible(false);
				}
				else if (isFirstDirectChild) {
					isFirstDirectChild = false;
					const defaultProp: string = eObject.getDefaultProp();
					const defaultType: string = this.getExmlConfig().getPropertyType(defaultProp, className);
					if (!defaultProp || !defaultType) {
						continue;
					}
					childEValue = this.getChildrenValue([child], defaultType, defaultProp, inMultipleStates);
					childEValue.asChild = true;
					eObject.setProperty(defaultProp, childEValue);
					childEValue.setPropVisible(false);
					if (childEValue instanceof EArray) {
						eArray = childEValue as EArray;
					}
				}
				else {
					childEValue = this.parseExmlValue(child, inMultipleStates);
					if (isContainer && !(childEValue instanceof ENode)) {
						continue;
					}
					eArray.push(childEValue);
				}
			}
		}
	}

	private getChildrenValue(children: sax.Tag[], type: string, prop: string, inMultiState: boolean): EValue {
		const childLength: number = children.length;
		let childEValue: EValue;
		if (childLength > 1) {
			if (type !== 'Array') {
				return null;
			}
			var eArray: EArray = new EArray();
			eArray.inMutipleStates = inMultiState;
			eArray.xmlVisible = false;
			for (var i = 0; i < children.length; i++) {
				var item: sax.Tag = children[i];
				if (!this.isIncludeIn(item)) {
					continue;
				}
				childEValue = this.parseExmlValue(item, inMultiState);
				eArray.push(childEValue);
			}
			childEValue = eArray;
		}
		else if (childLength === 1) {
			const child: sax.Tag = children[0];
			if (type === 'Array') {
				if (child.localName === 'Array') {
					eArray = new EArray();
					eArray.inMutipleStates = inMultiState;
					for (var i = 0; i < child.children.length; i++) {
						var item: sax.Tag = child.children[i];
						if (!this.isIncludeIn(item)) {
							continue;
						}
						eArray.push(this.parseExmlValue(item, inMultiState));
					}
					childEValue = eArray;
				}
				else {
					eArray = new EArray();
					eArray.inMutipleStates = inMultiState;
					eArray.xmlVisible = false;
					eArray.push(this.parseExmlValue(child, inMultiState));
					childEValue = eArray;
				}
			}
			else {
				if (prop === 'height' || prop === 'width') {
					childEValue = new ESize(trim(child.toString()));
				}
				else if (type === 'Class') {
					childEValue = new EClass(this.exmlModel, null, child);
				}
				else {
					childEValue = this.parseExmlValue(child, inMultiState);
				}
				childEValue.asChild = true;
			}
		}
		return childEValue;
	}

	/**
	 * 检查某个节点是否存在于当前状态
	 */
	private isIncludeIn(item: sax.Tag): boolean {
		if (!item.localName) {
			return false;
		}
		if (!this.currentState) {
			return true;
		}
		let stateNames: string[] = [];
		if (item.attributes.hasOwnProperty('includeIn')) {
			stateNames = trim(item.attributes['includeIn']).split(',');
		}
		else if (item.attributes.hasOwnProperty('excludeFrom')) {
			const excludeNames: string[] = trim(item.attributes['excludeFrom']).split(',');
			for (let i = 0; i < this.states.length; i++) {
				const state: string = this.states[i];
				if (excludeNames.indexOf(state) === -1) {
					stateNames.push(state);
				}
			}
		}
		else {
			return true;
		}
		return stateNames.indexOf(this.currentState) !== -1;
	}

	/**
	 * 格式化属性名，去掉状态。
	 */
	private formatProp(prop: string): string {
		return prop.split('.')[0];
	}
	/**
	 * 获取属性的状态名
	 */
	private getState(prop: string): string {
		if (prop.indexOf('.') === -1) {
			return '';
		}
		return prop.split('.')[1];
	}

	/**
	 * 根据xml节点创建一个EObject对象
	 */
	private parseEObject(xml: sax.Tag): EObject {
		let eObject: EObject;
		const name: string = xml.localName;
		const ns: Namespace = new Namespace(xml.prefix, xml.namespace);
		const className: string = this.getExmlConfig().getClassNameById(name, ns);
		let instance: any = this.getExmlConfig().getInstanceByName(className);
		if (!instance) {
			return null;
		}

		const defaultProp: string = this.getExmlConfig().getDefaultPropById(name, ns);
		if (this.getExmlConfig().isInstance(instance, 'eui.ViewStack')) {
			eObject = new EViewStack(name, ns, instance);
		}
		else if (this.getExmlConfig().isInstance(instance, 'eui.Scroller')) {
			eObject = new EScroller(name, ns, instance);
		}
		else if (defaultProp === 'elementsContent') {
			if (this.getExmlConfig().isInstance(instance, 'eui.Skin')) {
				instance = this.getExmlConfig().getInstanceByName('eui.Group');
				eObject = new EContainer(name, ns, instance);
			}
			else {
				eObject = new EContainer(name, ns, instance);
			}
		}
		else if (this.getExmlConfig().isInstance(instance, 'eui.UIComponent')) {
			eObject = new ENode(name, ns, instance);
		}
		else {
			eObject = new EObject(name, ns, instance);
		}
		eObject.setExmlModel(this.exmlModel);
		return eObject;
	}

	/**
	 * 解析一个EValue对象为XML节点
	 * @param value 要解析的节点
	 * @param parseChildren 是否解析子节点，默认true。
	 */
	public parseXML(value: IValue, parseChildren: boolean = true): sax.Tag {
		const xmlStr: string = '<' + value.getNs().prefix + ':' + value.getName() + ' xmlns:' + value.getNs().prefix + '=\"' + value.getNs().uri + '\"/>';
		const xml: sax.Tag = xmlTagUtil.parse(xmlStr);
		if (value instanceof EObject) {
			this.parseXMLForEObject(value as EObject, xml, parseChildren);
		}
		else if (value instanceof EArray) {
			for (let i = 0; i < (<EArray>value).childNodes.length; i++) {
				const childValue: EValue = (<EArray>value).childNodes[i];
				const childXML: sax.Tag = this.parseXML(childValue, parseChildren);
				xmlTagUtil.appendChild(xml, childXML, false);
			}
			if (value.getId()) {
				xmlTagUtil.setAttribute(xml, 'id', value.getId());
			}
		}
		else if (value instanceof EClass && (<EClass>value).getIsInner()) {
			return (<EClass>value).getClassXML();
		}
		else {
			xml.text = escapeHTMLEntity(value.toString());
			if (value.getId()) {
				xmlTagUtil.setAttribute(xml, 'id', value.getId());
			}
		}
		return xml;
	}

	/**
	 * 解析一个DOBject为xml节点
	 */
	private parseXMLForEObject(dO: EObject, xml: sax.Tag, parseChildren: boolean = true): void {
		let childXML: sax.Tag;
		let childValue: EValue;
		const propDic: { [prop: string]: boolean } = {};
		for (let prop in dO.propertyDic) {
			childValue = dO.propertyDic[prop];
			prop = this.formatProp(prop);
			if (childValue._readOnly && propDic[prop]) {
				continue;
			}
			if (!childValue.asChild) {
				propDic[prop] = true;
				xmlTagUtil.setAttribute(xml, prop, escapeHTMLEntity(childValue.toString()));
			}
			else if (parseChildren) {
				if (prop === dO.getDefaultProp() && childValue instanceof EArray &&
					!(<EArray>childValue).xmlVisible) {
					for (let i = 0; i < (<EArray>childValue).childNodes.length; i++) {
						const v: EValue = (<EArray>childValue).childNodes[i];
						childXML = this.parseXML(v);
						propDic[prop] = true;
						xmlTagUtil.appendChild(xml, childXML);
					}
				}
				else {
					const parentXML: sax.Tag = xml;
					if (childValue.getPropVisible()) {

						const xmlStr: string = '<' + dO.getNs().prefix + ':' + prop + ' xmlns:' + dO.getNs().prefix + '=\"' + dO.getNs().uri + '\"/>';
						var xml: sax.Tag = xmlTagUtil.parse(xmlStr);
						propDic[prop] = true;
						xmlTagUtil.appendChild(xml, this.parseXML(childValue));
						xmlTagUtil.appendChild(parentXML, xml);
					} else {
						xmlTagUtil.appendChild(parentXML, this.parseXML(childValue));
					}
				}
			}
		}
	}
}

/**
 * ExmlModel的临时数据存储
 */
export class TemporaryData implements ITemporaryData {
	/**
	 * 展开的节点路径
	 */
	public layerExpandList: number[][] = [];
	/**
	 * 图层滚动条的位置
	 */
	public layerScrollPos: number = 0;
}




/**
 * EXML数据模型
 */
export class ExmlModel implements IExmlModel {

	private _onRootChanged: Emitter<RootChangedEvent>;
	/**
	 * 根节点改变
	 */
	public get onRootChanged(): Event<RootChangedEvent> {
		return this._onRootChanged.event;
	}
	private _onTextChanged: Emitter<TextChangedEvent>;
	/**
	 * 文本内容改变
	 */
	public get onTextChanged(): Event<TextChangedEvent> {
		return this._onTextChanged.event;
	}
	private _onStateChanged: Emitter<StateChangedEvent>;
	/**
	 * 视图状态列表或者选中的视图状态发生改变
	 */
	public get onStateChanged(): Event<StateChangedEvent> {
		return this._onStateChanged.event;
	}
	private _onSelectedListChanged: Emitter<SelectedListChangedEvent>;
	/**
	 * 选中节点的列表发生改变
	 */
	public get onSelectedListChanged(): Event<SelectedListChangedEvent> {
		return this._onSelectedListChanged.event;
	}
	private _onNodeSelectChanged: Emitter<NodeSelectChangedEvent>;
	/**
	 * 单个节点选中状态改变事件
	 */
	public get onNodeSelectChanged(): Event<NodeSelectChangedEvent> {
		return this._onNodeSelectChanged.event;
	}
	private _onViewStackIndexChanged: Emitter<ViewStackIndexChangedEvent>;
	/**
	 * 层级堆叠容器的选中项索引发生改变
	 */
	public get onViewStackIndexChanged(): Event<ViewStackIndexChangedEvent> {
		return this._onViewStackIndexChanged.event;
	}
	private _onNodeRemoved: Emitter<NodeRemovedEvent>;
	/**
	 * 可视节点移除事件
	 */
	public get onNodeRemoved(): Event<NodeRemovedEvent> {
		return this._onNodeRemoved.event;
	}

	private _onNodeAdded: Emitter<NodeAddedEvent>;
	/**
	 * 可视节点添加事件
	 */
	public get onNodeAdded(): Event<NodeAddedEvent> {
		return this._onNodeAdded.event;
	}
	private _onTreeChanged: Emitter<TreeChangedEvent>;
	/**
	 * 节点树发生改变事件,使用kind属性来区分发生改变的类型
	 */
	public get onTreeChanged(): Event<TreeChangedEvent> {
		return this._onTreeChanged.event;
	}
	private _onDesignConfigChanged: Emitter<void>;
	/**
	 * 设计配置变更，比如背景色更改
	 */
	public get onDesignConfigChanged(): Event<void> {
		return this._onDesignConfigChanged.event;
	}
	private _onDesignBackgroundChanged: Emitter<void>;
	/**
	 * 设计配置的背景设置变更，背景色、参考图等
	 */
	public get onDesignBackgroundChanged(): Event<void> {
		return this._onDesignBackgroundChanged.event;
	}


	/**
	 * exml解析器
	 */
	private exmlParser: ExmlTreeParser;
	/**
	 * exml配置管理器
	 */
	private _exmlConfig: ExmlModelConfig;
	private _temporaryData: ITemporaryData;

	private _onCompileWarning: Emitter<string>;
	private _onCompileError: Emitter<string>;
	private _animationModel: AnimationModel;
	private _wingNodeModel: WingNodeModel;
	private _designConfig: DesignConfig;


	constructor(
		text: string = '',
		@IInstantiationService private instantiationService: IInstantiationService,
		@IEgretProjectService private egretProjectService: IEgretProjectService
	) {
		this._onCompileWarning = new Emitter<string>();
		this._onCompileError = new Emitter<string>();


		this._onRootChanged = new Emitter<RootChangedEvent>();
		this._onTextChanged = new Emitter<TextChangedEvent>();
		this._onStateChanged = new Emitter<StateChangedEvent>();
		this._onSelectedListChanged = new Emitter<SelectedListChangedEvent>();
		this._onNodeSelectChanged = new Emitter<NodeSelectChangedEvent>();
		this._onNodeRemoved = new Emitter<NodeRemovedEvent>();
		this._onNodeAdded = new Emitter<NodeAddedEvent>();
		this._onTreeChanged = new Emitter<TreeChangedEvent>();
		this._onViewStackIndexChanged = new Emitter<ViewStackIndexChangedEvent>();
		this._onDesignConfigChanged = new Emitter<void>();
		this._onDesignBackgroundChanged = new Emitter<void>();

		this._temporaryData = new TemporaryData();
		this._designConfig = this.instantiationService.createInstance(DesignConfig);
		this._designConfig.init(this);
		this._designConfig.onDesignConfigChanged(() => {
			this._onDesignConfigChanged.fire();
		});
		this._designConfig.onDesignBackgroundChanged(() => {
			this._onDesignBackgroundChanged.fire();
		});
		this._animationModel = new AnimationModel();
		this._animationModel.init(this);
		this._wingNodeModel = new WingNodeModel();
		this._wingNodeModel.init(this);

		this._exmlConfig = this.instantiationService.createInstance(ExmlModelConfig,
			this.egretProjectService.exmlConfig as any, this._onCompileWarning, this._onCompileError);

		this.exmlParser = this.instantiationService.createInstance(ExmlTreeParser,
			this);
		if (text) {
			this.setText(text);
		}
	}
	/**
	 * 编译错误
	 */
	public get onCompileError(): Event<string> {
		return this._onCompileError.event;
	}
	/**
	 * 编译警告
	 */
	public get onCompileWarning(): Event<string> {
		return this._onCompileWarning.event;
	}


	/**
	 * 临时数据存储
	 */
	public get temporaryData(): ITemporaryData {
		return this._temporaryData;
	}
	private childModels: IExmlModel[] = [];
	/**
	 * 添加子数据模块
	 * @param child 
	 */
	public addChildModel(child: IExmlModel) {
		this.childModels.push(child);
	}
	/**
	 * 移除子数据模块
	 * @param child 
	 */
	public removeChildModel(child: IExmlModel) {
		const index = this.childModels.indexOf(child);
		if (index !== -1) {
			this.childModels.splice(index, 1);
		}
	}
	/**
	 * 相关联的EUISingleConfig实例
	 */
	public getExmlConfig(): ExmlModelConfig {
		return this._exmlConfig;
	}
	/**
	 * 皮肤类名
	 */
	public getClassName(): string {
		if (!this._rootNode) {
			return '';
		}
		const value: IValue = this._rootNode.getProperty('class');
		if (value) {
			return (<string>value.getInstance());
		}
		return '';
	}

	private _configId: string;
	/**
	 * 配置的ID
	 */
	public getConfigId(): string {
		if (!this.refreshWNSPropsInited) {
			this.refreshWNSProps();
		}
		return this._configId;
	}
	/**
	 * 配置的ID
	 */
	public setConfigId(value: string): void {
		this.setWingNode('Config', 'id', value);
		this._configId = value;
	}
	private _hostComponent: string;
	/**
	 * 主机组件完整类名
	 */
	public getHostComponent(): string {
		return this._hostComponent;
	}
	/**
	 * 设置主机组件的完整类名
	 * @param value 
	 */
	public setHostComponent(value: string): void {
		this.setWingNode('HostComponent', 'name', value);
		this._hostComponent = value;
	}
	/**
	 * 设置wing的节点
	 */
	public setWingNode(nodeName: string, valueName: string, value: string): void {
		if (!value) {
			value = '';
		}
		const nss = xmlStrUtil.getNamespaces(this._text);
		let hasWingNs: boolean = false;
		let wingPrefix: string = '';
		for (let i = 0; i < nss.length; i++) {
			if (nss[i].uri === W_EUI.uri) {
				hasWingNs = true;
				wingPrefix = nss[i].prefix;
				break;
			}
		}
		if (!hasWingNs) {
			wingPrefix = W_EUI.prefix;
		}
		let index: number = this._text.indexOf('<' + wingPrefix + ':' + nodeName);
		let range: number[];
		if (index === -1) {
			range = xmlStrUtil.findRangeByPath(this._text, [0], '', this._states);
			if (range[2] === range[3]) {
				const subStr: string = this._text.substr(range[0] + 1);
				index = subStr.indexOf(' ');
				const prefiex: string = subStr.substring(0, index);
				this.pushTextChange('>\n</' + prefiex + '>', range[1] - 1, range[1] + 1);
				range[1]--;
			}
			else if (range[1] + 1 === range[2]) {
				this.pushTextChange('\n', range[1] + 1, range[2]);
			}
			if (!hasWingNs) {
				const key: string = 'xmlns:' + W_EUI.prefix + '=\"' + W_EUI.uri + '\"';
				this.pushTextChange(' ' + key, range[1], range[1]);
				range[1] += key.length + 1;
			}
			if (valueName) {
				this.pushTextChange('\n\t<' + wingPrefix + ':' + nodeName + ' ' + valueName + '=\"' + value + '\"/>', range[1] + 1, range[1] + 1);
			} else {
				this.pushTextChange('\n\t<' + wingPrefix + ':' + nodeName + '/>', range[1] + 1, range[1] + 1);
			}
		}
		else if (valueName) {
			const path: number[] = xmlStrUtil.findPathAtPos(this._text, index, '', this._states);
			range = xmlStrUtil.findRangeByPath(this._text, path, '', this._states);
			const nodeText: string = this._text.substring(range[0], range[1] + 1);
			const valueRange: number[] = xmlStrUtil.getValueIndex(nodeText, valueName);
			if (valueRange) {
				const oldValue: string = this._text.substring(range[0] + valueRange[1], range[0] + valueRange[2]);
				if (value !== oldValue) {
					this.pushTextChange(value, range[0] + valueRange[1], range[0] + valueRange[2]);
				}
			}
			else {
				const valueStr: string = ' ' + valueName + '=\"' + value + '\"';
				if (range[2] === range[3]) {
					this.pushTextChange(valueStr, range[1] - 1, range[1] - 1);
				}
				else {
					this.pushTextChange(valueStr, range[1], range[1]);
				}
			}
		}
	}
	/**
	 * 声明节点列表
	 */
	public getDeclarations(): IArray {
		if (!this._rootNode) {
			return null;
		}
		return this._rootNode.getProperty('w:Declarations') as IArray;
	}

	private _enabled: boolean = true;
	/**
	 * 是否是启用状态。 当设置为false时，应当禁用交互行为。以增加效率。
	 */
	public getEnabled(): boolean {
		return this._enabled;
	}
	/**
	 * 设置是否启用
	 * @param value 
	 */
	public setEnabled(value: boolean): void {
		if (this._enabled === value) {
			return;
		}
		this._enabled = value;
		if (this._rootNode) {
			this.cleanTree();
			this._onRootChanged.fire({ target: this });
		}
	}

	private _rootNode: ENode;
	/**
	 * DTree根节点
	 */
	public getRootNode(): INode {
		return this._rootNode;
	}
	/**
	 * 遍历所有节点 
	 */
	public foreachNode(callBack: (node: INode) => void): void {
		if (this._rootNode instanceof EContainer) {
			this.foreachContainer(<EContainer>this._rootNode, callBack);
		}
	}

	private foreachContainer(container: EContainer, callBack: (node: INode) => void): void {
		callBack(container);
		const len: number = container.getNumChildren();
		let i: number = 0;
		for (; i < len; i++) {
			const node: INode = container.getNodeAt(i);
			callBack(node);
			if (node instanceof EContainer) {
				this.foreachContainer(<EContainer>node, callBack);
			}
		}
	}
	/**
	 * 根节点显示对象
	 */
	public getRootElement(): any {
		return this._rootNode ? this._rootNode.getInstance() : null;
	}

	private _text: string = '';
	/**
	 * 编辑的文本
	 */
	public getText(): string {
		return this._text;
	}
	/**
	 * 设置编辑的文本
	 * @param value 
	 */
	public setText(value: string): void {
		if (value === this._text) {
			return;
		}
		this._text = value;
		this.needRefreshTree = true;
		this.undoList.length = 0;
		this.redoList.length = 0;
		this.refreshTree();
	}

	private _contentTag: sax.Tag;
	/** XML Tags of text content in this model.  */
	public getContentTag(): sax.Tag {
		return this._contentTag;
	}

	private needRefreshTree: boolean = false;

	private _states: string[] = [];
	/**
	 * 视图状态列表。
	 */
	public getStates(): string[] {
		return this._states.concat();
	}
	private _currentState: string = '';
	/**
	 * 当前视图状态,设置任何不存在的状态都会变成BASIC_STATE
	 */
	public getCurrentState(): string {
		return this._currentState;
	}
	/**
	 * 设置当前的视图状态
	 * @param value 
	 */
	public setCurrentState(value: string): void {
		if (this._currentState === value) {
			return;
		}
		this._currentState = value;
		this.needRefreshTree = true;
		this.refreshTree().then(() => {
			if (!this.stateChanged) {
				this.stateChanged = true;
				this.invalidateProperties();
			}
		});
	}
	/**
	 * 创建一个新的视图状态
	 * @param stateName 视图状态名称
	 * @param copyFrom 要拷贝的视图状态,'"表示"所有状态"，null表示空白状态。
	 */
	public createNewState(stateName: string, copyFrom: string = null): void {
		if (this._states.indexOf(stateName) !== -1) {
			return;
		}
		const newText: string = xmlStrUtil.createNewState(this._text, this.getStates(), stateName, copyFrom);
		this._currentState = stateName;
		this.refreshOnStateChange(newText);
	}

	private refreshOnStateChange(newText: string): void {
		this.pushTextChange(newText, 0, this._text.length);
		this.pushHistory();
		this.refreshTree().then(() => {
			this.stateChanged = true;
			this.invalidateProperties();
		});
	}

	/**
	 * 移除一个视图状态 返回是否移除成功
	 * @param stateName 视图状态名称
	 */
	public removeState(stateName: string): boolean {
		const index: number = this._states.indexOf(stateName);
		if (index === -1) {
			return false;
		}
		this._currentState = index === 0 ? this.getStates()[0] : this.getStates()[index - 1];
		const newText: string = xmlStrUtil.removeState(this._text, stateName, this.getStates());
		this.refreshOnStateChange(newText);
		return true;
	}

	private _startState: string = '';
	/**
	 * 起始状态
	 */
	public getStartState(): string {
		return this._startState;
	}
	/**
	 * 设置起始状态
	 * @param value 
	 */
	public setStartState(value: string): void {
		if (value === null) {
			value = '';
		}
		if (this._startState === value || (value && this._states.indexOf(value) === -1)) {
			return;
		}
		this._startState = value;
		const range: number[] = xmlStrUtil.findRangeByPath(this._text, [0], this._currentState, this.getStates());
		const nodeText: string = this._text.substring(range[0], range[1] + 1);
		const valueRange: number[] = xmlStrUtil.getValueIndex(nodeText, 'currentState');
		if (value) {
			if (valueRange) {
				this.pushTextChange(value, range[0] + valueRange[1], range[0] + valueRange[2]);
			}
			else {
				const index: number = nodeText.indexOf('xmlns:');
				this.pushTextChange('currentState=\"' + value + '\" ', range[0] + index, range[0] + index);
			}
		}
		else if (valueRange) {
			this.pushTextChange('', range[0] + valueRange[0], range[0] + valueRange[2] + 1);
		}
		this.pushHistory();
		this.stateChanged = true;
		this.invalidateProperties();
	}

	/**
	 * 修改状态名
	 * @param oldName 要修改的状态名
	 * @param newName 新的状态名
	 */
	public changeStateName(oldName: string, newName: string): void {
		if (this._states.indexOf(oldName) === -1) {
			return;
		}
		const newText: string = xmlStrUtil.changeStateName(this._text, oldName, newName);
		this._currentState = newName;
		this.refreshOnStateChange(newText);
	}
	/**
	 * 视图状态发生改变的标志
	 */
	private stateChanged: boolean = false;

	private treeChangedDisposable: IDisposable;
	private treeNodeAddedDisposable: IDisposable;
	private treeNodeRemovedDisposable: IDisposable;
	private treeNodeSelectChangedDisposable: IDisposable;
	private treeNodeViewStackIndexChangedDisposable: IDisposable;

	/**
	 * 刷新并重新生成节点树。
	 */
	public refreshTree(): Promise<void> {
		if (!this._enabled) {
			return Promise.resolve(void 0);
		}
		return this.getExmlConfig().ensureLoaded().then(() => {
			var xml: sax.Tag = null;
			if (this.getText()) {
				xml = xmlTagUtil.parse(this.getText(), false, true);
				this._contentTag = xml;
				if (xml.errors.length > 0) {
					for (let i = 0; i < xml.errors.length; i++) {
						//TODO 看看这个格式是否需要优化
						// this._onCompileError.fire(xml.errors[i].message + ' in line:' + xml.errors[i].line + ' column:' + xml.errors[i].column);
						this._onCompileError.fire(xml.errors[i].message);
					}
					this.refreshNext(xml);
				} else {
					return this.getExmlConfig().getProjectConfig().ensureLoaded().then(() => {
						const result: any = this.getExmlConfig().compile(null, this._text, xml);
						if (!result) {
							xml = null;
						}
						if (xml) {
							this.refreshProps(xml);
						}
						this.refreshNext(xml);
					});
				}
			} else {
				if (this._rootNode) {
					this.cleanTree();
				}
			}
		});
	}

	private refreshNext(xml: sax.Tag): void {
		if (this._rootNode) {
			this.cleanTree();
		}
		if (xml) {
			this.tryCatch(() => {
				this._rootNode = this.exmlParser.createExmlTree(xml, this._currentState, this.idMap);
				this._rootNode.setExmlModel(this);
			});
			if (this._rootNode) {
				this.cleanTree();
			}
			if (xml) {
				try {
					this._rootNode = this.exmlParser.createExmlTree(xml, this._currentState, this.idMap);
					this._rootNode.setExmlModel(this);
				}
				catch (error) {
				}
				if (this._rootNode) {
					this.needRefreshTree = false;
					this.treeChangedDisposable = this._rootNode.onTreeChanged(e => this.exmlTreeChange_handler(e));
					this.treeNodeAddedDisposable = this._rootNode.onNodeAdded(e => this.nodeAdded_handler(e));
					this.treeNodeRemovedDisposable = this._rootNode.onNodeRemoved(e => this.nodeRemoved_handler(e));
					this.treeNodeSelectChangedDisposable = this._rootNode.onNodeSelectChanged(e => this.nodeSelectChanged_handler(e));
					this.treeNodeViewStackIndexChangedDisposable = this._rootNode.onViewStackIndexChanged(e => this.viewStackIndexChanged_handler(e));
				}
			}
		}
		this._onRootChanged.fire({ target: this });
	}

	private viewStackIndexChanged_handler(e: ViewStackIndexChangedEvent): void {
		this._onViewStackIndexChanged.fire(e);
	}

	private tryCatch(func) {
		try {
			func();
		} catch (error) {
			if (error instanceof Error) {
				this._onCompileError.fire(error.message);
			} else if (typeof error == 'string') {
				this._onCompileError.fire(error);
			}
		}
	}
	/**
	 * 清理节点树
	 */
	private cleanTree(): void {
		this.needRefreshTree = true;
		if (this.treeChangedDisposable) {
			this.treeChangedDisposable.dispose();
			this.treeChangedDisposable = null;
		}
		if (this.treeNodeAddedDisposable) {
			this.treeNodeAddedDisposable.dispose();
			this.treeNodeAddedDisposable = null;
		}
		if (this.treeNodeRemovedDisposable) {
			this.treeNodeRemovedDisposable.dispose();
			this.treeNodeRemovedDisposable = null;
		}
		if (this.treeNodeSelectChangedDisposable) {
			this.treeNodeSelectChangedDisposable.dispose();
			this.treeNodeSelectChangedDisposable = null;
		}
		if (this.treeNodeViewStackIndexChangedDisposable) {
			this.treeNodeViewStackIndexChangedDisposable.dispose();
			this.treeNodeViewStackIndexChangedDisposable = null;
		}
		this._rootNode = null;
		this._selectedNodes.length = 0;
		this.nodeXMLDic = {};
		this.idMap = {};
	}

	private _supportState: boolean = false;
	/**
	 * 是否支持视图状态功能
	 */
	public getSupportState(): boolean {
		return this._supportState;
	}

	private refreshWNSPropsInited: boolean = false;
	private refreshWNSProps(xml: sax.Tag = null): void {
		if (!xml) {
			try {
				xml = xmlTagUtil.parse(this.getText());
			} catch (error) { }
		}
		this.refreshWNSPropsInited = true;
		if (!xml) {
			return;
		}
		let hostItem: sax.Tag = null;
		let configItem: sax.Tag = null;
		for (let i = 0; i < xml.children.length; i++) {
			if (xml.children[i].localName === 'HostComponent' && xml.children[i].namespace === W_EUI.uri) {
				hostItem = xml.children[i];
			}
			if (xml.children[i].localName === 'Config' && xml.children[i].namespace === W_EUI.uri) {
				configItem = xml.children[i];
			}
		}
		this._hostComponent = hostItem ? trim(String(hostItem.attributes['name'])) : '';
		this._configId = configItem ? trim(String(configItem.attributes['id'])) : '';
	}

	/**
	 * 刷新视图状态列表等属性
	 */
	private refreshProps(xml: sax.Tag): void {
		const oldStates: string[] = this._states;
		this._states = [];

		const className: string = this._exmlConfig.getClassNameById(xml.localName, new Namespace(xml.prefix, xml.namespace));
		const type: String = this._exmlConfig.getPropertyType('currentState', className);
		if (type) {
			this._supportState = true;
		}
		else {
			this._supportState = false;
		}
		let state: string;
		let change: boolean = this.stateChanged;
		const oldStartState: string = this._startState;
		if (this._supportState) {
			if (xml.attributes.hasOwnProperty('currentState')) {
				this._startState = xml.attributes['currentState'];
				this._startState = trim(this._startState);
				if (oldStartState !== this._startState) {
					change = true;
				}
			}
			else {
				this._startState = '';
				change = true;
			}

			let currentStates: sax.Tag = null;
			for (var i = 0; i < xml.children.length; i++) {
				if (xml.children[i].namespace === xml.namespace &&
					xml.children[i].localName === 'states') {
					currentStates = xml.children[i];
					break;
				}
			}
			if (currentStates) {
				for (var i = 0; i < currentStates.children.length; i++) {
					if (
						currentStates.children[i].namespace === xml.namespace &&
						currentStates.children[i].localName === 'State'
					) {
						state = currentStates.children[i].attributes['name'];
						this._states.push(trim(state));
					}
				}
			}

			if (this._states.length === 0) {

				const statesString: string = xml.attributes['states'];
				if (statesString) {
					this._states = statesString.split(',');
					for (var i = 0; i < this._states.length; i++) {
						this._states[i] = trim(this._states[i]);
					}
				}
			}

			if (!change && oldStates.join(',') !== this._states.join(',')) {
				change = true;
			}
		}
		else {
			if (oldStartState !== '') {
				this._startState = '';
				change = true;
			}
			if (oldStates.length !== 0) {
				change = true;
			}
		}

		if (this._states.indexOf(this._currentState) === -1) {
			change = true;
			this._currentState = '';
		}
		if (!this.stateChanged && change) {
			this.stateChanged = true;
			this.invalidateProperties();
		}
	}

	private needCheckNodes: INode[] = [];
	private nodeXMLDic: { [nodeHashCode: number]: sax.Tag } = {};
	/**
	 * 节点已经被移除的字典标记。
	 */
	private nodeRemoveDic: { [nodeHashCode: number]: boolean } = {};

	private _isChangeNodeFloor: boolean = false;
	/**
	 * 标记是否正在操作节点层级
	 */
	public isChangeNodeFloor(value: boolean): void {
		this._isChangeNodeFloor = value;
	}
	/**
	 * 节点移除事件
	 */
	private nodeRemoved_handler(event: NodeRemovedEvent): void {
		const node: ENode = event.node as ENode;
		this.checkSelectedNodeOnRemove(node);
		this.nodeXMLDic[node.hashCode] = xmlStrUtil.findItemByPath(xmlTagUtil.parse(this._text), node.getXmlPath(), this._currentState, this._states);
		if (node.inMutipleStates && !this._isChangeNodeFloor) {
			this.nodeRemoveDic[node.hashCode] = true;
			const range: number[] = xmlStrUtil.findRangeByPath(this._text, node.getXmlPath(), this._currentState, this._states);
			const nodeText: string = this._text.substring(range[0], range[1] + 1);
			let valueRange: number[] = xmlStrUtil.getValueIndex(nodeText, 'includeIn');
			let states: string[];
			if (valueRange) {
				states = nodeText.substring(valueRange[1], valueRange[2]).split(',');
				for (var i = states.length; i >= 0; i--) {
					if (states[i] === this._currentState) {
						states.splice(i, 1);
						break;
					}
				}
				this.pushTextChange(states.join(','), range[0] + valueRange[1], range[0] + valueRange[2]);
			}
			else {
				states = this.getStates().concat();
				valueRange = xmlStrUtil.getValueIndex(nodeText, 'excludeFrom');
				if (valueRange) {
					const exStates: string[] = nodeText.substring(valueRange[1], valueRange[2]).split(',');
					for (var i = 0; i < exStates.length; i++) {
						const s: string = exStates[i];
						var index: number = states.indexOf(s);
						if (index !== -1) {
							states.splice(index, 1);
						}
					}
					this.pushTextChange('', range[0] + valueRange[0], range[0] + valueRange[2] + 1);
					range[1] -= valueRange[2] + 1 - valueRange[0];
				}
				index = states.indexOf(this._currentState);
				if (index !== -1) {
					states.splice(index, 1);
				}
				const includeText: string = ' includeIn=\"' + states.join(',') + '\"';
				if (range[2] === range[3]) {
					this.pushTextChange(includeText, range[1] - 1, range[1] - 1);
				}
				else {
					this.pushTextChange(includeText, range[1], range[1]);
				}
			}
		}
		this._onNodeRemoved.fire(event);
	}
	/**
	 * 递归检查移除的节点及其子孙节点是否含有选中项
	 */
	private checkSelectedNodeOnRemove(node: INode): void {
		const index: number = this._selectedNodes.indexOf(node);
		if (index !== -1) {
			this._selectedNodes.splice(index, 1);
			if (this.needCheckNodes.indexOf(node) === -1) {
				this.needCheckNodes.push(node);
			}
		}
		let container: IContainer; //= node as IContainer;
		if (isInstanceof(node, 'eui.IContainer')) {
			container = <any>node;
			for (let i = container.getNumChildren() - 1; i >= 0; i--) {
				node = container.getNodeAt(i);
				this.checkSelectedNodeOnRemove(node);
			}
		}
	}
	/**
	 * 节点添加事件
	 */
	private nodeAdded_handler(event: NodeAddedEvent): void {
		const node: ENode = event.node as ENode;
		this.checkSelectedNodeOnAdd(node);
		if ((<EContainer>node.getParent()).inMutipleStates && !this._isChangeNodeFloor) {
			// var range: number[] = XMLUtil.findRangeByPath(this._text, node.getXmlPath(), this._currentState, this._states);
			// var singleNode: Boolean = (range[2] === range[3]);
			// var nodeText: string = this._text.substring(range[0], range[1] + 1);
			// var valueRange: number[] = XMLUtil.getValueIndex(nodeText, 'includeIn');
			// if (valueRange) {
			// 	this.pushTextChange('', range[0] + valueRange[0], range[0] + valueRange[2] + 1);
			// 	nodeText = nodeText.substring(0, valueRange[0]) + nodeText.substring(valueRange[2] + 1);
			// 	range[1] -= valueRange[2] + 1 - valueRange[0];
			// }
			// valueRange = XMLUtil.getValueIndex(nodeText, 'excludeFrom');
			// if (valueRange) {
			// 	this.pushTextChange('', range[0] + valueRange[0], range[0] + valueRange[2] + 1);
			// 	range[1] -= valueRange[2] + 1 - valueRange[0];
			// }
			node.setString('includeIn', this._currentState);
			// var includeText: string = ' includeIn=\"' + this._currentState + '\"';
			// if (singleNode) {
			// 	this.pushTextChange(includeText, range[1] - 1, range[1] - 1);
			// }
			// else {
			// 	this.pushTextChange(includeText, range[1], range[1]);
			// }
		}
		node.inMutipleStates = false;
		this._onNodeAdded.fire(event);
	}

	/**
	 * 递归检查新增的节点极其子孙节点是否含有选中项
	 */
	private checkSelectedNodeOnAdd(node: INode): void {
		if (node.getSelected()) {
			if (this._selectedNodes.indexOf(node) === -1) {
				this._selectedNodes.push(node);
				this._selectedNodes.sort(sortOnDepth);
				const index: number = this.needCheckNodes.indexOf(node);
				if (index !== -1) {
					this.needCheckNodes.splice(index, 1);
				}
				else {
					this.selectedNodesChange = true;
					this.invalidateProperties();
					this._onNodeSelectChanged.fire({
						target: node,
						node: node
					});
				}
			}
		}
		let container: IContainer; //= node as IContainer;
		if (isInstanceof(node, 'eui.IContainer')) {
			container = <any>node;
			for (let i: number = container.getNumChildren() - 1; i >= 0; i--) {
				node = container.getNodeAt(i);
				this.checkSelectedNodeOnAdd(node);
			}
		}
	}
	/**
	 * 更新节点的inMultipleStates属性
	 */
	private updateMultipleStates(dValue: IValue, inMutipleStates: boolean, xml: sax.Tag = null): void {
		const dO: EObject = dValue as EObject;
		if (inMutipleStates) {
			if (this._states.length === 0 || this._currentState === '') {
				inMutipleStates = false;
			}
			else {
				if (!xml) {
					xml = xmlTagUtil.parse(this._text);
				}
				const item: sax.Tag = xmlStrUtil.findItemByPath(xml, dValue.getXmlPath(), this._currentState, this._states);
				if (item) {
					const parent: sax.Tag = item.parent;
					if (parent) {
						const localName: string = parent.localName;
						if (localName.indexOf('.') !== -1) {
							inMutipleStates = false;
						}
					}
					if (dO) {
						inMutipleStates = inMutipleStates && !xmlStrUtil.isSingleStateItem(item, this._states);
					}
				}
			}
		}
		if (dValue instanceof EArray) {
			(<EArray>dValue).inMutipleStates = inMutipleStates;
			for (let i = 0; i < (<EArray>dValue).childNodes.length; i++) {
				const v: IValue = (<EArray>dValue).childNodes[i];
				if (v instanceof EObject) {
					this.updateMultipleStates(v, inMutipleStates, xml);
				}
			}
		}
		else if (dO) {
			dO.inMutipleStates = inMutipleStates;
			for (const key in dO.propertyDic) {
				const value: IValue = dO.propertyDic[key];
				if (value instanceof EObject) {
					this.updateMultipleStates(value, inMutipleStates, xml);
				}
			}
		}
	}
	private _selectedNodes: INode[] = [];
	/**
	 * 当前选中的节点列表,此属性为原始数组的一个浅复制。
	 */
	public getSelectedNodes(): INode[] {
		return this._selectedNodes.concat();
	}
	/**
	 * 删除选中的节点,返回删除的节点列表。
	 */
	public removeSelectedNodes(): INode[] {
		const list: INode[] = this._selectedNodes.concat();
		//获取一个显示层级最浅的一个节点
		let minDepth: number = Number.MAX_VALUE;
		let minDepthNode: INode;
		list.forEach((element) => {
			let tmpDepth: number = 0;
			let tmpParentElement: INode = element;
			while (tmpParentElement.getParent()) {
				tmpDepth++;
				tmpParentElement = tmpParentElement.getParent();
			}
			if (tmpDepth < minDepth) {
				minDepthNode = element;
				minDepth = tmpDepth;
			}
		});
		//记录一下最前层级的父级以及当前索引位置
		let minDepthNodeParent: IContainer;
		let minDepthNodeIndex: number = -1;
		if (minDepthNode) {
			minDepthNodeParent = minDepthNode.getParent();
			if (minDepthNodeParent) {
				minDepthNodeIndex = minDepthNodeParent.getNodeIndex(minDepthNode);
			}
		}
		if (list.indexOf(this._rootNode) !== -1) {
			return;
		}
		var animationEnabled = this.getAnimationModel().getEnabled();
		if (animationEnabled) {
			return [];
		}
		for (let i = 0; i < list.length; i++) {
			const node: INode = list[i];
			const parentNode: IContainer = node.getParent();
			if (parentNode) {
				if (isInstanceof(parentNode, 'eui.ISingleChild')) {
					(<ISingleChild><any>parentNode).setDirectChild(null);
				} else {
					parentNode.removeNode(node);
				}
			}
			// if (parentNode instanceof EScroller) {
			// 	node = parentNode;
			// 	parentNode = node.getParent();
			// }
			// if (parentNode) {

			// }
			if (parentNode instanceof EViewStack && parentNode.getNumChildren() === 0 && parentNode.getParent()) {
				parentNode.getParent().removeNode(parentNode);
			}
		}
		//设置新的选中节点
		if (minDepthNodeParent) {
			if (minDepthNodeParent.getNumChildren() === 0) {
				minDepthNodeParent.setSelected(true);
			}
			else {
				let tmpNode: INode = minDepthNodeParent.getNodeAt(minDepthNodeIndex);
				if (tmpNode) {
					tmpNode.setSelected(true);
					return;
				}
				tmpNode = minDepthNodeParent.getNodeAt(minDepthNodeIndex - 1);
				if (tmpNode) {
					tmpNode.setSelected(true);
					return;
				}
				tmpNode = minDepthNodeParent.getNodeAt(0);
				if (tmpNode) {
					tmpNode.setSelected(true);
					return;
				}
				minDepthNodeParent.setSelected(true);
			}
		}
		return list;
	}
	/**
	 * 选中的节点列表发生改变
	 */
	private selectedNodesChange: boolean = false;

	private _ignoreSelectionChange: boolean = false;
	/**
	 * 当设置为ture时，忽略所有的选中节点的改变，不抛出ExmlModelEvent.SELECTD_LIST_CHANGED事件。
	 * 再次置为false时才抛出。此属性通常用于框选时优化性能。
	 */
	public getIgnoreSelectionChange(): boolean {
		return this._ignoreSelectionChange;
	}
	/**
	 * 当设置为ture时，忽略所有的选中节点的改变，不抛出ExmlModelEvent.SELECTD_LIST_CHANGED事件。
	 * 再次置为false时才抛出。此属性通常用于框选时优化性能。
	 */
	public setIgnoreSelectionChange(value: boolean): void {
		if (this._ignoreSelectionChange === value) {
			return;
		}
		this._ignoreSelectionChange = value;
		if (!value) {
			this.selectedNodesChange = true;
			this.invalidateProperties();
		}
	}

	/**
	 * 节点选中状态改变事件
	 */
	private nodeSelectChanged_handler(event: NodeSelectChangedEvent): void {
		const node: ENode = event.node as ENode;
		if (node.getSelected()) {
			let found: boolean = false;
			for (var i = 0; i < this._selectedNodes.length; i++) {
				var child: INode = this._selectedNodes[i];
				if (child instanceof EContainer && (<IContainer>child).contains(node)) {
					found = true;
					break;
				}
			}
			if (found) {
				node._selected = false;
				return;
			}
			if (node instanceof EContainer) {
				for (var i = this._selectedNodes.length - 1; i >= 0; i--) {
					child = this._selectedNodes[i];
					if ((<IContainer>node).contains(child)) {
						child.setSelected(false);
					}
				}
			}
			if (this._selectedNodes.indexOf(node) === -1) {
				this._selectedNodes.push(node);
				this._selectedNodes.sort(sortOnDepth);
			}
		}
		else {
			const index = this._selectedNodes.indexOf(node);
			if (index !== -1) {
				this._selectedNodes.splice(index, 1);
			}
		}
		this.selectedNodesChange = true;
		this.invalidateProperties();
		this._onNodeSelectChanged.fire(event);
	}

	/**
	 * 插入文本,并记录历史记录。
	 * @param text 插入的文本内容
	 * @param startIndex 要替换的起始索引
	 * @param endIndex 要替换的结束索引(不包含)
	 */
	public async insertText(insertText: string, startIndex: number = 0, endIndex: number = 2147483647, notifyListeners: boolean = false, refresh: boolean = true): Promise<void> {
		const maxLength: number = this._text ? this._text.length : 0;
		if (endIndex >= maxLength) {
			endIndex = maxLength;
			if (startIndex === 0 && insertText === this._text) {
				return;
			}
		}
		this.pushTextChange(insertText, startIndex, endIndex, notifyListeners);
		if (refresh) {
			await this.refreshTree();
			this.pushHistory();
		} else {
			this.pushHistory();
		}
	}
	/**
	 * 撤销动作列表
	 */
	private undoList: HistoryInfo[] = [];
	/**
	 * 重做动作列表
	 */
	private redoList: HistoryInfo[] = [];

	/**
	 * 返回下一个可撤销的操作对象，但不移除它。
	 */
	public peekUndo(): HistoryInfo {
		return this.undoList.length > 0 ? this.undoList[this.undoList.length - 1] : null;
	}
	/**
	 * 当前正在操作的一步历史记录对象
	 */
	private historyInfo: HistoryInfo;
	/**
	 * 插入一条历史记录
	 */
	private pushTextChange(newText: string, startIndex: number, endIndex: number, notifyListeners: boolean = true): void {
		if (this._text === null) {
			this._text = '';
		}

		this.needRefreshTree = true;
		if (newText === null) {
			newText = '';
		}
		const oldText: string = this._text.substring(startIndex, endIndex);
		if (newText === oldText || startIndex === -1 || endIndex === -1) {
			return;
		}
		this._text = this._text.substring(0, startIndex) + newText + this._text.substring(endIndex);
		this.needRefreshTree = true;
		const textInfo: TextChangeInfo = new TextChangeInfo(newText, oldText, startIndex);
		if (!this.historyInfo) {
			this.historyInfo = new HistoryInfo();
			const list: INode[] = this._selectedNodes.concat(this.needCheckNodes);
			for (let i = 0; i < list.length; i++) {
				const node: INode = list[i];
				this.historyInfo.beforeSelected.push(node.getXmlPath().concat());
			}
		}
		this.historyInfo.textInfo.push(textInfo);
		if (!this.historyInfoChanged) {
			this.historyInfoChanged = true;
			this.invalidateHistory();
		}
		if (notifyListeners) {
			this.dispatchTextChangeEvent(newText, startIndex, endIndex);
		}
	}
	/**
	 * 将当前的历史记录数据插入列表
	 */
	private pushHistory(): void {
		if (!this.historyInfo) {
			return;
		}
		for (let i = 0; i < this._selectedNodes.length; i++) {
			const node: INode = this._selectedNodes[i];
			node.setSelected(true);
			this.historyInfo.afterSelected.push(node.getXmlPath().concat());
		}
		this.undoList.push(this.historyInfo);
		this.historyInfo = null;
		this.redoList.length = 0;
	}
	/**
	 * 是否可以撤销
	 */
	public getCanUndo(): boolean {
		return this.undoList.length > 0;
	}
	/**
	 * 撤销
	 */
	public undo(): void {
		if (this.undoList.length === 0) {
			return;
		}
		const historyInfo: HistoryInfo = this.undoList.pop();
		const textInfo: TextChangeInfo[] = historyInfo.textInfo;
		for (let i: number = textInfo.length - 1; i >= 0; i--) {
			const info: TextChangeInfo = textInfo[i];
			this._text = this._text.substring(0, info.startIndex) + info.oldText +
				this._text.substring(info.startIndex + info.newText.length);
			this.needRefreshTree = true;
			this.dispatchTextChangeEvent(info.oldText, info.startIndex, info.startIndex + info.newText.length);
		}
		this.redoList.push(historyInfo);
		this.refreshTree().then(() => {
			for (let i = 0; i < historyInfo.beforeSelected.length; i++) {
				const path: number[] = historyInfo.beforeSelected[i];
				const node: INode = this.getNodeByXmlPath(path);
				if (node) {
					node.setSelected(true);
				}
			}
		});
	}
	/**
	 * 是否可以重做
	 */
	public getCanRedo(): boolean {
		return this.redoList.length > 0;
	}
	/**
	 * 重做
	 */
	public redo(): void {
		if (this.redoList.length === 0) {
			return;
		}
		const historyInfo: HistoryInfo = this.redoList.pop();
		const textInfo: TextChangeInfo[] = historyInfo.textInfo;
		const length: number = textInfo.length;
		for (let i: number = 0; i < length; i++) {
			const info: TextChangeInfo = textInfo[i];
			this._text = this._text.substring(0, info.startIndex) + info.newText +
				this._text.substring(info.startIndex + info.oldText.length);
			this.needRefreshTree = true;
			this.dispatchTextChangeEvent(info.newText, info.startIndex, info.startIndex + info.oldText.length);
		}
		this.undoList.push(historyInfo);
		this.refreshTree().then(() => {
			for (let i = 0; i < historyInfo.afterSelected.length; i++) {
				const path: number[] = historyInfo.afterSelected[i];
				const node: INode = this.getNodeByXmlPath(path);
				if (node) {
					node.setSelected(true);
				}
			}
		});
	}

	private dispatchTextChangeEvent(insertText: string, startIndex: number, endIndex: number): void {
		this._onTextChanged.fire({
			target: this,
			insertText: insertText,
			oldStartIndex: startIndex,
			oldEndIndex: endIndex
		});
	}

	/**
	 * ID缓存字典
	 */
	private idMap: { [id: string]: any } = {};

	/**
	 * 根据ID获取对应的节点
	 */
	public getValueByID(id: string): IValue {
		const value: any = this.idMap[id];
		if (value instanceof EValue) {
			return <IValue>value;
		}
		if (Array.isArray(value)) {
			return value[0] as IValue;
		}
		return null;
	}

	/**
	 * 根据NOde节点，获取SKin皮肤内的所有id，（不包括嵌套皮肤内部id）
	 * @return
	 */
	public getIdsInNodeSkin(node: INode, ids: string[]): void {
		let rootNode: INode = node;
		while (rootNode.getName() !== 'Skin' && rootNode.getParent()) {
			rootNode = rootNode.getParent();
		}
		this.getIdDeep = 0;
		this.getIdsByNode(rootNode, ids);
	}

	private getIdDeep: number = 0;
	private getIdsByNode(node: INode, ids: string[]): void {
		this.getIdDeep++;
		const id: string = node.getId();
		if (id && id.length !== 0) {
			ids.push(id);
		}
		if (this.getIdDeep > 1 && node.getName() === 'Skin') { return; }
		let container: EContainer;
		if (node instanceof EContainer) {
			container = node as EContainer;
			const len: number = container.getNumChildren();
			for (let i = 0; i < len; i++) {
				this.getIdsByNode(container.getNodeAt(i), ids);
			}
		}
		this.getIdDeep--;
	}

	/**
	 * 根据XML节点，获取SKin皮肤内的所有id，（不包括嵌套皮肤内部id）
	 * @return
	 */
	public getIdsInXmlSkin(xml: sax.Tag, ids: string[]): void {
		let rootXml: sax.Tag = xml;
		while (rootXml.name !== 'e:Skin' && rootXml.parent) {
			rootXml = rootXml.parent;
		}
		this.getIdsByXml(rootXml, ids);
	}

	private getIdsByXml(xml: sax.Tag, ids: string[]): void {
		let id: string = '';
		for (let i = 0; i < xml.children.length; i++) {
			const currentXml: sax.Tag = xml.children[i];
			id = currentXml.attributes['id'];
			if (id && id.length !== 0) {
				ids.push(id);
			}
			for (let j = 0; j < currentXml.children.length; j++) {
				if (currentXml.children[j].namespace === xml.namespace && currentXml.children[j].localName === 'string') {
					ids.push(currentXml.children[j].text);
					break;
				}
			}
			if (currentXml.name !== 'e:Skin') {
				this.getIdsByXml(currentXml, ids);
			}
		}
	}

	/**
	 * 获取指定坐标下最内层的可视节点
	 * @param point 节点所在舞台上的点
	 * @param ignoreSelected 是否忽略当前被选中的节点，默认false。
	 * @param returnRoot 如果没有碰撞结果，是否返回根节点，默认flase。
	 */
	public getNodeUnderXY(point: Point, ignoreSelected: boolean = false, returnRoot: boolean = false): INode {
		let node: INode = this.hitTestPoint(this._rootNode, point, ignoreSelected);
		if (returnRoot && !node) {
			node = this._rootNode;
		}
		return node;
	}

	/**
	 * 坐标碰撞测试
	 */
	private hitTestPoint(node: INode, point: Point, ignoreSelected: boolean = false): INode {
		if (!node || !this.getExmlConfig().isInstance(node.getInstance(), 'eui.UIComponent') || !node.getInstance().parent ||
			(ignoreSelected && node.getSelected()) || node.getLocked()) {
			return null;
		}
		const visibleValue: IValue = node.getProperty('visible');
		if (visibleValue && !visibleValue.getInstance()) {
			return null;
		}
		const element: any = node.getInstance();
		const pos: any = element.parent.globalToLocal(point.x, point.y);
		const rect: any = this._exmlConfig.getInstanceByName('egret.Rectangle');
		element.getLayoutBounds(rect);
		if (!rect.contains(pos.x, pos.y)) {
			return null;
		}
		if (node instanceof EContainer && (<IContainer>node).getNumChildren() > 0) {
			let child: INode;
			if (node instanceof EViewStack) {
				child = this.hitTestPoint((<EViewStack>node).getDirectChild(), point, ignoreSelected);
				if (child) {
					return child;
				}
			}
			else {
				for (let i = (<IContainer>node).getNumChildren() - 1; i >= 0; i--) {
					child = this.hitTestPoint((<IContainer>node).getNodeAt(i), point, ignoreSelected);
					if (child) {
						return child;
					}
				}
			}
		}
		return node;
	}
	/**
	 * 获取矩形区域下的所有可视节点
	 * @param rect 矩形的XY坐标相对于舞台
	 */
	public getNodesUnderRect(rect: Rectangle): INode[] {
		const nodeList: INode[] = [];
		this.hitTestRect(this._rootNode, rect, nodeList);
		return nodeList;
	}

	/**
	 * 矩形框碰撞测试
	 */
	private hitTestRect(node: INode, hitRect: Rectangle, nodeList: INode[]): void {
		if (!node || !this.getExmlConfig().isInstance(node.getInstance(), 'eui.UIComponent') || !node.getInstance().parent || node.getLocked()) {
			return;
		}
		const visibleValue: IValue = node.getProperty('visible');
		if (visibleValue instanceof EValue && !visibleValue.getInstance()) {
			return;
		}
		const element: any = node.getInstance();
		let rect: any = this._exmlConfig.getInstanceByName('egret.Rectangle');
		element.getLayoutBounds(rect);
		rect = localToGlobal(rect, element.parent);
		if (node instanceof EContainer) {
			if (hitRect.containsRect(rect as Rectangle) && !node.getIsRoot()) {
				nodeList.push(node);
				return;
			}
			if (node instanceof EViewStack) {
				this.hitTestRect((<EViewStack>node).getDirectChild(), hitRect, nodeList);
			}
			else {
				for (let i = (<IContainer>node).getNumChildren() - 1; i >= 0; i--) {
					this.hitTestRect((<IContainer>node).getNodeAt(i), hitRect, nodeList);
				}
			}
		}
		else if (hitRect.intersects(rect)) {
			nodeList.push(node);
		}
	}
	/**
	 * 根据在xml中的路径，获取对应的节点对象。
	 */
	public getNodeByXmlPath(xmlPath: number[]): INode {
		if (!this._rootNode || xmlPath.length === 0) {
			return null;
		}
		let dValue: EValue = this._rootNode as EValue;
		xmlPath = xmlPath.concat();
		xmlPath.shift();
		while (xmlPath.length > 0) {
			const xmlIndex: number = xmlPath.shift();
			if (dValue instanceof EObject) {
				dValue = (<EObject>dValue).getChildByXmlIndex(xmlIndex);
				if (!dValue) {
					break;
				}
				if (dValue.getPropVisible() && (!(dValue instanceof EArray) || (<EArray>dValue).xmlVisible)) {
					xmlPath.shift();
				}
			}
			else if (dValue instanceof EArray) {
				dValue = (<EArray>dValue).childNodes[xmlIndex];
			}
			else {
				break;
			}
		}
		return <INode><any>dValue;
	}

	private historyInfoChanged: boolean = false;
	/**
	 * DTree结构改变
	 */
	private exmlTreeChange_handler(event: TreeChangedEvent): void {
		switch (event.kind) {
			case TreeChangedKind.CHANGE:
				this.valueChanged(event.value as EValue, event.property, event.ignoreState);
				break;
			case TreeChangedKind.ADD:
				this.valueAdded(event.value as EValue, event.property, event.ignoreState);
				break;
			case TreeChangedKind.REMOVE:
				this.valueRemoved(event.value as EValue, event.property, event.ignoreState);
				break;
		}
		this._onTreeChanged.fire(event);
	}
	/**
	 * 节点改变
	 */
	private valueChanged(value: EValue, property: any, ignoreState: boolean): void {
		if (property === 'visible') {
			const node: INode = <INode><any>value._host;
			if (node instanceof ENode) {
				if (value.getInstance()) {
					this.checkSelectedNodeOnAdd(node);
				}
				else {
					this.checkSelectedNodeOnRemove(node);
				}
			}
		}
		else if (property === 'id') {
			const host: IValue = value._host;
			for (const id in this.idMap) {
				const idValue: any = this.idMap[id];
				if (idValue instanceof EValue) {
					if (idValue === host) {
						delete this.idMap[id];
						break;
					}
				}
				else if (Array.isArray(idValue)) {
					const index: number = idValue.indexOf(host);
					if (index !== -1) {
						if (idValue.length === 0) {
							delete this.idMap[id];
						}
						else {
							(<any[]>idValue).splice(index, 1);
						}
						break;
					}
				}
			}
			this.addIds(value._host, false);
		}
		if (value.asChild || value._host instanceof EArray) {
			const range: number[] = xmlStrUtil.findRangeByPath(this._text, value.getXmlPath(), this._currentState, this._states);
			this.pushTextChange(value.toString(), range[1] + 1, range[2]);
		}
		else {
			this.changeProperty(value, property, value.toString(), ignoreState);
		}
	}

	/**
	 * 修改非子节点的属性
	 */
	private changeProperty(value: EValue, property: any, newValue: string, ignoreState: boolean): void {
		newValue = escapeHTMLEntity(newValue);
		const range: number[] = xmlStrUtil.findRangeByPath(this._text, value.getXmlPath(), this._currentState, this._states);
		const nodeText: string = this._text.substring(range[0], range[1] + 1);
		let prop: string = property;

		const hostInMultiState: boolean = value._host['inMutipleStates'];
		const oldProp: string = prop;
		if (this._currentState && (hostInMultiState || !value._readOnly) && value.getNs().uri !== W_EUI.uri && !ignoreState) {
			prop += '.' + this._currentState;
			value._readOnly = false;
		}
		let valueRange: number[] = xmlStrUtil.getValueIndex(nodeText, prop);
		if (valueRange) {
			var startIndex: number = range[0] + valueRange[1];
			var endIndex: number = range[0] + valueRange[2];
			this.pushTextChange(newValue, startIndex, endIndex);
		} else if (!hostInMultiState) {
			/*
				处理<e:Image includeIn="state1" x="0" y="0"/> 当前状态为state1, oldProp为x，prop为x.state1的情况。
				因为在这种情况下，XMLUtil.getValueIndex(nodeText, 'x.state1');是找不到内容的，所以valueRange为null
			*/
			valueRange = xmlStrUtil.getValueIndex(nodeText, oldProp);
			if (valueRange) {
				var startIndex: number = range[0] + valueRange[1];
				var endIndex: number = range[0] + valueRange[2];
				this.pushTextChange(newValue, startIndex, endIndex);
			}
		}
	}

	/**
	 * 节点添加
	 */
	private valueAdded(value: EValue, property: any, ignoreState: boolean): void {
		if (property === 'visible') {
			var node: INode = <INode><any>value._host;
			if (node instanceof ENode) {
				if (value.getInstance()) {
					this.checkSelectedNodeOnAdd(node);
				}
				else {
					this.checkSelectedNodeOnRemove(node);
				}
			}
		}

		const newText: string = xmlStrUtil.addNamespace(this._text, value.getNs()).newXml;
		if (this._text !== newText) {
			this.pushTextChange(newText, 0, this._text.length);
		}

		let hostInMultiState: boolean = ignoreState ? false : value._host['inMutipleStates'];
		//todo 这个目的是当当EArray不可见EArray的属性可见的时候，做的处理。  留到下个版本前测试开放。
		//			if(!(value is EArray)|| EArray(value).xmlVisible || EArray(value).propVisible )
		if (!(value instanceof EArray) || (<EArray>value).xmlVisible) {
			let host: EValue = value._host;
			if (host instanceof EArray && !(<EArray>host).xmlVisible && !host.getPropVisible()) {
				host = host._host;
			}

			if (value.asChild || value._host instanceof EArray) {
				const propStr: string = (!ignoreState) && hostInMultiState && value.getNs().uri !== W_EUI.uri ? property + '.' + this._currentState : property;
				let range: number[] = xmlStrUtil.findRangeByPath(this._text, host.getXmlPath(), this._currentState, this._states);
				let xmlNode: sax.Tag = this.nodeXMLDic[value.hashCode];
				if (xmlNode) {
					delete this.nodeXMLDic[value.hashCode];
				}
				else {
					xmlNode = this.exmlParser.parseXML(value);
					if (hostInMultiState && !(value._host instanceof EArray) && !value.getPropVisible()) {
						value.setPropVisible(true);
					}
					if (value._host instanceof EObject && value.getPropVisible()) {
						let propNode: sax.Tag = null;
						let propNodeStr: string = '';
						if (value._host.getNs()) {
							propNodeStr = '<' + value._host.getNs().prefix + ':' + propStr + ' xmlns:' + value._host.getNs().prefix + '=\"' + value._host.getNs().uri + '\"/>';
							propNode = xmlTagUtil.parse(propNodeStr);
						} else {
							propNodeStr = '<' + propStr + '/>';
							propNode = xmlTagUtil.parse(propNodeStr);
						}
						if (!(value instanceof EArray) || (<EArray>value).xmlVisible) {
							xmlTagUtil.appendChild(propNode, xmlNode);
						}
						xmlNode = propNode;
					}
				}

				const indentStr: string = xmlStrUtil.getIndentStr(this._text, range[0]);
				const nodeText: string = this.toXMLString(xmlNode, indentStr + '\t', xmlStrUtil.getNamespaces(this.getText()));
				if (range[2] === range[3]) {
					//todo 这个方法是为了当earray不可见，但是他的属性可见的时候， 把如<e:transitions/>的属性拆成<e:transitions></e:transitions>这样的属性。
					//因为属性节点不占host，留到下个版本前开启进行测试。
					//if(host is EArray && !EArray(host).xmlVisible && EArray(host).propVisible)
					//{
					//	pushTextChange('>\n'+indentStr+'</'+_text.slice(range[0]+1,range[1]-2)+'>',range[1]-2,range[1]);
					//}else
					//{
					this.pushTextChange('>\n' + indentStr + '</' + host.getNs().prefix + ':' + host.getName() + '>', range[1] - 1, range[1] + 1);
					//}
					range[1]--;
				}
				else if (range[1] + 1 === range[2]) {
					this.pushTextChange('\n', range[1] + 1, range[1] + 1);
				}

				if (value._host.childIndexDirty) {
					value._host.updateChildIndex();
				}
				if (value.xmlIndex === 0) {
					var insertIndex: number = range[1] + 1;
					this.pushTextChange('\n' + nodeText, insertIndex, insertIndex);
				}
				else {
					let xmlPath: number[] = [];
					if (host instanceof EArray) {
						xmlPath = (<EArray>host).getValueAt(property - 1).getXmlPath();
					}
					else {
						const preValue: EValue = (<EObject>host).getChildByXmlIndex(value.xmlIndex - 1) as EValue;
						xmlPath = preValue.getXmlPath();
						if (preValue._propVisible && (!(preValue instanceof EArray) || (<EArray>preValue).xmlVisible)) {
							xmlPath.pop();
						}
					}
					range = xmlStrUtil.findRangeByPath(this._text, xmlPath, this._currentState, this._states);
					insertIndex = range[3] + 1;
					this.pushTextChange('\n' + nodeText, insertIndex, insertIndex);
				}
			}
			else {
				this.addProperty(host, property, value.toString(), value.getNs(), ignoreState);
			}
		}

		if (value instanceof EArray || value instanceof EObject) {
			if (hostInMultiState && value instanceof ENode && this.needCheckNodes.indexOf(node) === -1) {
				hostInMultiState = false;
			}
			this.updateMultipleStates(value, hostInMultiState);
		}
		if (property === 'id') {
			this.addIds(value._host, false);
		}
		else {
			this.addIds(value);
		}
	}

	/**
	 * 添加节点属性
	 */
	private addProperty(host: IValue, property: any, newValue: string, ns: Namespace, ignoreState: boolean): void {
		newValue = escapeHTMLEntity(newValue);
		const range: number[] = xmlStrUtil.findRangeByPath(this._text, host.getXmlPath(), this._currentState, this._states);
		const hostInMultiState: boolean = host['inMutipleStates'];
		const propStr: string = (!ignoreState) && hostInMultiState && ns.uri !== W_EUI.uri ? property + '.' + this._currentState : property;
		if (property === 'id') {
			const subStr: String = this._text.substr(range[0]);
			var insertIndex: number = subStr.indexOf(' ');
			if (insertIndex === -1 || insertIndex > range[1] - range[0] + 1) {
				insertIndex = range[1];
				if (range[2] === range[3]) {
					insertIndex--;
				}
			}
			else {
				insertIndex += range[0];
			}
		}
		else {
			insertIndex = range[1];
			if (range[2] === range[3]) {
				insertIndex--;
			}
		}
		this.pushTextChange(' ' + propStr + '=\"' + newValue + '\"', insertIndex, insertIndex);
	}

	/**
	 * 添加ID映射表
	 */
	private addIds(value: IValue, recursive: boolean = true): void {
		const id: string = value.getId();
		if (id) {
			const idValue: any = this.idMap[id];
			if (!idValue) {
				this.idMap[id] = value;
			}
			else if (Array.isArray(idValue)) {
				(<any[]>idValue).push(value);
			}
			else {
				this.idMap[id] = [idValue, value];
			}
		}
		if (!recursive) {
			return;
		}
		if (value instanceof EArray) {
			for (var i = 0; i < (<EArray>value).childNodes.length; i++) {
				var childValue: IValue = (<EArray>value).childNodes[i];
				this.addIds(childValue);
			}
		}
		else if (value instanceof EObject) {
			const dO: EObject = value as EObject;
			for (var i = 0; i < dO.getPropertyList().length; i++) {
				const prop: string = dO.getPropertyList()[i];
				childValue = dO.getProperty(prop);
				this.addIds(childValue);
			}
		}
	}

	/**
	 * 节点移除
	 */
	private valueRemoved(value: EValue, property: any, ignoreState: boolean): void {
		if (property === 'visible') {
			const node: INode = <INode><any>value._host;
			if (node instanceof ENode) {
				this.checkSelectedNodeOnAdd(node);
			}
		}
		if (property === 'id') {
			const id: string = value.toString();
			if (id) {
				this.removeIds(value._host, id);
			}
		}
		else {
			this.removeIds(value);
		}

		if (value instanceof EArray && !(<EArray>value).xmlVisible && !value.getPropVisible()) {
			return;
		}
		if (this.nodeRemoveDic[value.hashCode]) {
			delete this.nodeRemoveDic[value.hashCode];
			return;
		}
		const hostInMultiState: boolean = ignoreState ? false : value._host['inMutipleStates'];
		const xmlPath: number[] = value.getXmlPath();
		if (value._host instanceof EObject && value.asChild && value.getPropVisible() && (!(value instanceof EArray) || (<EArray>value).xmlVisible)) {
			xmlPath.pop();
		}
		let range: number[];
		range = xmlStrUtil.findRangeByPath(this._text, xmlPath, this._currentState, this._states);

		if (value.asChild || value._host instanceof EArray) {
			//如下代码是为了找到要被删除的部分前的最后一个换行之后，即：保留前一个换行
			var startIndex = range[0];
			var limitIndex = this._text.indexOf('<', startIndex);
			var tmpIndex1 = this._text.lastIndexOf('>', startIndex);
			var tmpIndex2 = this._text.indexOf('\r', tmpIndex1);
			var tmpIndex3 = this._text.indexOf('\n', tmpIndex1);
			var tmps = [];
			if (tmpIndex1 != -1) { tmps.push(tmpIndex1); }
			if (tmpIndex2 != -1) { tmps.push(tmpIndex2); }
			if (tmpIndex3 != -1) { tmps.push(tmpIndex3); }
			var targetIndex = -1;
			for (var i = 0; i < tmps.length; i++) {
				if (tmps[i] < limitIndex && tmps[i] > targetIndex) {
					targetIndex = tmps[i];
				}
			}
			startIndex = targetIndex + 1;

			//如下代码是为了找到要被删除的部分后的最后一个换行之后，即：删除后一个换行
			var endIndex = range[3];
			var limitIndex = this._text.indexOf('<', endIndex);
			if (limitIndex == -1) {
				limitIndex = this._text.length;
			}
			var tmpIndex1 = this._text.indexOf('>', endIndex);
			var tmpIndex2 = this._text.indexOf('\r', tmpIndex1);
			var tmpIndex3 = this._text.indexOf('\n', tmpIndex1);
			var tmps = [];
			if (tmpIndex1 != -1) { tmps.push(tmpIndex1); }
			if (tmpIndex2 != -1) { tmps.push(tmpIndex2); }
			if (tmpIndex3 != -1) { tmps.push(tmpIndex3); }
			var targetIndex = -1;
			for (var i = 0; i < tmps.length; i++) {
				if (tmps[i] < limitIndex && tmps[i] > targetIndex) {
					targetIndex = tmps[i];
				}
			}
			endIndex = targetIndex + 1;

			this.pushTextChange('', startIndex, endIndex);
			if (value._readOnly && value._host instanceof EObject && hostInMultiState && value.getNs().uri !== W_EUI.uri) {
				var hostItem: sax.Tag = xmlStrUtil.findItemByPath(xmlTagUtil.parse(this._text), value._host.getXmlPath(), this.getCurrentState(), this.getStates());
				const childNames: string[] = [];
				for (var i = 0; i < hostItem.children.length; i++) {
					const item: sax.Tag = hostItem.children[i];
					childNames.push(item.localName);
				}
				const xmlNode: sax.Tag = this.exmlParser.parseXML(value);
				range = xmlStrUtil.findRangeByPath(this._text, value._host.getXmlPath(), this._currentState, this._states);
				const indentStr: string = xmlStrUtil.getIndentStr(this._text, range[0]);
				for (var i = 0; i < this._states.length; i++) {
					var state: string = this._states[i];
					if (state === this._currentState) {
						continue;
					}
					var propStr: string = ignoreState ? property : property + '.' + state;
					if (childNames.indexOf(propStr) !== -1) {
						continue;
					}
					let propNode: sax.Tag = null;
					let propNodeStr: string = '';
					propNodeStr = '<' + value._host.getNs().prefix + ':' + propStr + ' xmlns:' + value._host.getNs().prefix + '=\"' + value._host.getNs().uri + '\"/>';
					propNode = xmlTagUtil.parse(propNodeStr);
					xmlTagUtil.appendChild(propNode, xmlNode);
					var nodeText: string = this.toXMLString(propNode, indentStr + '\t', [EUI]);
					this.pushTextChange('\n' + nodeText, startIndex, startIndex);
				}
			}
		}
		else {
			nodeText = this._text.substring(range[0], range[1] + 1);
			let prop: string = property;
			if (!value._readOnly && hostInMultiState && value.getNs().uri !== W_EUI.uri && !ignoreState) {
				prop += '.' + this._currentState;
			}
			const valueRange: number[] = xmlStrUtil.getValueIndex(nodeText, prop);
			if (valueRange) {
				var startIndex: number = range[0] + valueRange[0];
				var endIndex: number = range[0] + valueRange[2] + 1;
				this.pushTextChange('', startIndex, endIndex);
				if (value._readOnly && hostInMultiState && value.getNs().uri !== W_EUI.uri && !ignoreState) {
					hostItem = xmlStrUtil.findItemByPath(xmlTagUtil.parse(this._text), value._host.getXmlPath(), this.getCurrentState(), this.getStates());
					for (var i = 0; i < this._states.length; i++) {
						var state: string = this._states[i];
						if (state === this._currentState) {
							continue;
						}
						propStr = ignoreState ? property : property + '.' + state;
						if (hostItem.attributes.hasOwnProperty(propStr)) {
							continue;
						}
						this.pushTextChange(' ' + propStr + '=\"' + value.toString() + '\"', startIndex, startIndex);
					}
				}
			}
		}
	}

	/**
	 * 移除ID映射表
	 */
	private removeIds(value: IValue, hostID: string = null): void {
		const id: string = hostID ? hostID : value.getId();
		if (id) {
			const idValue: any = this.idMap[id];
			if (Array.isArray(idValue) && (<any[]>idValue).length > 1) {
				const index: number = (<any[]>idValue).indexOf(value);
				if (index !== -1) {
					(<any[]>idValue).splice(index, 1);
				}
			}
			else {
				delete this.idMap[id];
			}
		}
		if (hostID) {
			return;
		}
		if (value instanceof EArray) {
			for (var i = 0; i < (<EArray>value).childNodes.length; i++) {
				var childValue: IValue = (<EArray>value).childNodes[i];
				this.removeIds(childValue);
			}
		}
		else if (value instanceof EObject) {
			const dO: EObject = value as EObject;
			for (var i = 0; i < dO.getPropertyList().length; i++) {
				const prop: string = dO.getPropertyList()[i];
				childValue = dO.getProperty(prop);
				this.removeIds(childValue);
			}
		}
	}
	/**
	 * 将xml转换成字符串，不含命名空间。
	 */
	private toXMLString(node: sax.Tag, indentStr: string = '', needRemovedXmlns: Namespace[] = []): string {
		let nodeText: string = xmlTagUtil.stringify(node);
		let startIndex = 0;
		while (true) {
			startIndex = nodeText.indexOf('xmlns:', startIndex);
			if (startIndex === -1) {
				break;
			}
			let charEnd = nodeText.indexOf('=', startIndex + 6);
			let prefix = nodeText.slice(startIndex + 6, charEnd);
			prefix = trim(prefix);
			let char: string = '';
			let charStart = -1;
			const charIndex1 = nodeText.indexOf('\'', startIndex);
			const charIndex2 = nodeText.indexOf('\"', startIndex);
			if (charIndex1 === -1 && charIndex2 !== -1) {
				charStart = charIndex2;
				char = '\"';
			} else if (charIndex1 !== -1 && charIndex2 === -1) {
				charStart = charIndex1;
				char = '\'';
			} else if (charIndex1 !== -1 && charIndex2 !== -1) {
				if (charIndex1 < charIndex2) {
					charStart = charIndex1;
					char = '\'';
				} else {
					charStart = charIndex2;
					char = '\"';
				}
			}
			charEnd = nodeText.indexOf(char, charStart + 1);
			const uri = nodeText.slice(charStart + 1, charEnd);

			let needDelete: boolean = false;
			for (var i = 0; i < needRemovedXmlns.length; i++) {
				if (prefix === needRemovedXmlns[i].prefix && uri === needRemovedXmlns[i].uri) {
					needDelete = true;
					break;
				}
			}
			if (needDelete) {
				let endIndex: number = nodeText.indexOf('\"', startIndex);
				endIndex = nodeText.indexOf('\"', endIndex + 1);
				endIndex = endIndex + 1;
				if (nodeText.charAt(endIndex) === ' ') {
					endIndex += 1;
				}
				nodeText = nodeText.slice(0, startIndex) + nodeText.slice(endIndex);
			} else {
				startIndex += 6;
			}
		}

		const lines: string[] = nodeText.split('\n');
		for (var i = lines.length - 1; i >= 0; i--) {
			let line: string = lines[i];
			let index: number = line.indexOf('<');
			line = line.substring(index);
			index *= 0.5;
			while (index > 0) {
				line = '\t' + line;
				index--;
			}
			lines[i] = indentStr + line;
		}
		nodeText = lines.join('\n');
		nodeText = nodeText.split(' />').join('/>');
		nodeText = nodeText.split(' >').join('>');
		return nodeText;
	}
	/**
	 * 以字符串方式在指定节点上修改一个属性值，若指定属性不存在，则增加属性。若value为null，则删除该属性。
	 * @param host 要修改属性的节点
	 * @param prop 属性名
	 * @param value 属性值
	 */
	public setPropertyByString(host: IObject, prop: string, value: string, ignoreState: boolean = false): void {
		if (host.getRoot() !== this._rootNode) {
			return;
		}
		const paths: (number[])[] = [];
		for (let i = 0; i < this._selectedNodes.length; i++) {
			var node: INode = this._selectedNodes[i];
			paths.push(node.getXmlPath());
		}

		if (!value) {
			host.setProperty(prop, null);
			this.refreshTree().then(() => {
				for (let i = 0; i < paths.length; i++) {
					const path: number[] = paths[i];
					node = this.getNodeByXmlPath(path);
					if (node) {
						node.setSelected(true);
					}
				}
			});
			return;
		}


		const dValue: EValue = host.getProperty(prop) as EValue;
		let ns: Namespace;
		if (dValue && !dValue.getReadOnly()) {
			ns = dValue.getNs();
			if (dValue.asChild || dValue._host instanceof EArray) {
				host.setProperty(prop, null);
			}
			else {
				this.changeProperty(dValue, prop, value, ignoreState);
			}
		}
		if (!dValue || dValue.getReadOnly() || dValue.asChild || dValue._host instanceof EArray) {
			if (!ns) {
				if (prop === 'id' || prop === 'includeIn' || prop === 'excludeFrom') {
					ns = W_EUI;
				}
				else {
					ns = EUI;
				}
			}
			this.addProperty(host, prop, value, ns, ignoreState);
		}

		this.refreshTree().then(() => {
			for (let i = 0; i < paths.length; i++) {
				const path: number[] = paths[i];
				node = this.getNodeByXmlPath(path);
				if (node) {
					node.setSelected(true);
				}
			}
		});
	}
	private _invalidateHistory: boolean = false;
	//标记历史纪录失效
	private invalidateHistory(): void {
		if (!this._invalidateHistory) {
			this._invalidateHistory = true;
			setTimeout(() => {
				this._invalidateHistory = false;
				this.commitHistory();
			}, 20);
		}
	}
	private commitHistory(): void {
		if (this.historyInfoChanged) {
			this.historyInfoChanged = false;
			this.pushHistory();
		}
	}

	private invalidatePropertiesFlag: boolean = false;
	protected invalidateProperties(): void {
		if (this.invalidatePropertiesFlag) {
			return;
		}
		this.invalidatePropertiesFlag = true;
		setTimeout(() => {
			this.invalidatePropertiesFlag = false;
			this.commitProperties();
		}, 10);
	}

	protected commitProperties(): void {
		if (this.needCheckNodes.length > 0) {
			this.selectedNodesChange = true;
			while (this.needCheckNodes.length > 0) {
				const node = this.needCheckNodes.pop();
				this._onNodeSelectChanged.fire({
					target: node,
					node: node
				});
			}
		}
		if (this.selectedNodesChange) {
			this.selectedNodesChange = false;
			if (!this._ignoreSelectionChange) {
				this._onSelectedListChanged.fire({ target: this });
			}
		}
		if (this.stateChanged) {
			this.stateChanged = false;
			this._onStateChanged.fire({ target: this });
		}
	}

	/**
	 * 复制选中的节点到系统剪贴板
	 */
	public copyNodesToClipboard(): void {
		const xmlList: sax.Tag[] = this.getCopyNodes();
		var animationEnabled = this.getAnimationModel().getEnabled();
		if (animationEnabled) {
			return;
		}
		if (xmlList.length === 0) {
			return;
		}
		const textList: string[] = [];
		for (let i = 0; i < xmlList.length; i++) {
			const xml: sax.Tag = xmlList[i];
			textList.push(this.toXMLString(xml, '\t', [EUI]));
		}
		// var clipboard: egret.Clipboard = egret.Clipboard.generalClipboard;
		// clipboard.clear();
		// clipboard.setData(egret.ClipboardFormats.TEXT_FORMAT, textList.join('\n'));
		// clipboard.setData(ExmlDataFormat.NODE_LIST, xmlList);
		clipboard.clear();
		clipboard.writeText(textList.join('\n'));
		setTags(xmlList);
	}
	/**
	 * 获取选中节点副本的xml列表
	 */
	private getCopyNodes(): sax.Tag[] {
		const xmlList: sax.Tag[] = [];
		if (this._selectedNodes.length === 0 || this._selectedNodes.indexOf(this._rootNode) !== -1) {
			return xmlList;
		}
		const nodeList: INode[] = this._selectedNodes.concat();
		nodeList.sort(sortOnDepth);
		for (let i = 0; i < nodeList.length; i++) {
			const node: INode = nodeList[i];
			const xml: sax.Tag = this.exmlParser.parseXML(node);
			xmlList.push(xml);
		}
		return xmlList;
	}
	/**
	 * 粘贴系统剪贴板中的节点
	 */
	public pasteNodesFromClipboard(): void {
		if (!this._rootNode) {
			return;
		}
		var animationEnabled = this.getAnimationModel().getEnabled();
		if (animationEnabled) {
			return;
		}
		// var clipboard: egret.Clipboard = egret.Clipboard.generalClipboard;
		// var xmlList: sax.Tag[] = clipboard.getData(ExmlDataFormat.NODE_LIST) as sax.Tag[];
		const xmlList: sax.Tag[] = getTags();
		if (!xmlList || xmlList.length === 0) {
			return;
		}
		this.doPasteNodes(xmlList);
	}

	/**
	 * 执行粘贴节点操作,返回是否粘贴成功
	 */
	private doPasteNodes(xmlList: sax.Tag[]): boolean {
		let parentNode: IContainer = <IContainer><any>this._rootNode;
		let preValue: INode;
		if (this._selectedNodes.length > 0) {
			preValue = this._selectedNodes[this._selectedNodes.length - 1];
			if (preValue !== this._rootNode) {
				parentNode = preValue.getParent();
				if (parentNode instanceof EScroller) {
					preValue = parentNode;
					parentNode = parentNode.getParent();
				}
				if (!parentNode) {
					return false;
				}
			}
			else if (parentNode.getNumChildren() > 0) {
				preValue = parentNode.getNodeAt(parentNode.getNumChildren() - 1);
			}
			else {
				preValue = null;
			}
		}
		else if (parentNode.getNumChildren() > 0) {
			preValue = parentNode.getNodeAt(parentNode.getNumChildren() - 1);
		}

		const nodeList: INode[] = [];
		let index: number = 0;
		if (preValue) {
			index = parentNode.getNodeIndex(preValue) + 1;
		}
		for (var i = 0; i < xmlList.length; i++) {
			const xml: sax.Tag = xmlList[i];
			this.checkRepeatIdForXml(xml, parentNode);
			var node: INode = <INode><any>this.exmlParser.parseExmlValue(xml);
			if (node) {
				nodeList.push(node);
				parentNode.addNodeAt(node, index);
				if (this.checkHasSamePosNode(node, parentNode)) {
					const nodeX: number = this.getProperty(node, 'x');
					const nodeY: number = this.getProperty(node, 'y');
					if (!isNaN(nodeX)) {
						node.setNumber('x', nodeX + 10);
					}
					if (!isNaN(nodeY)) {
						node.setNumber('y', nodeY + 10);
					}
				}
				index++;
			}
			this.checkELink(node);
		}
		if ('validateNow' in parentNode.getInstance()) {
			parentNode.getInstance().validateNow();
		}
		const selections = this.getSelectedNodes();
		for (var i = 0; i < selections.length; i++) {
			var node: INode = selections[i];
			node.setSelected(false);
		}
		for (var i = 0; i < nodeList.length; i++) {
			var node: INode = nodeList[i];
			node.setSelected(true);
		}
		this.copyNodesToClipboard();
		return true;
	}

	/**
	 * 检查时候有位置相同的节点
	 * @param node
	 * @return
	 *
	 */
	private checkHasSamePosNode(node: INode, nodeParent: IContainer): Boolean {
		const tmpRootNode: INode = this.getRootNode();
		let result: boolean = false;
		const getProperty: Function = this.getProperty;
		function check($node: INode): void {
			if ($node.getParent() && $node.getParent() === nodeParent) {
				if ($node.getName() === node.getName() && $node !== node) {
					if (getProperty($node, 'x') === getProperty(node, 'x') &&
						getProperty($node, 'y') === getProperty(node, 'y') &&
						getProperty($node, 'width') === getProperty(node, 'width') &&
						getProperty($node, 'height') === getProperty(node, 'height')) {
						result = true;
					}
				}
			}
			if ($node instanceof EContainer) {
				for (let i = 0; i < (<IContainer>$node).getNumChildren(); i++) {
					check((<IContainer>$node).getNodeAt(i));
				}
			}
		}
		check(tmpRootNode);
		return result;
	}

	private getProperty(node: INode, property: string): number {
		let result: number = NaN;
		if (node.getProperty(property)) {
			result = node.getProperty(property).getInstance();
		}
		else if (node.getInstance()) {
			result = node.getInstance()[property];
		}
		else {
			result = NaN;
		}
		return result;
	}

	/**
	 * 检查引用的节点
	 */
	private checkELink(nodeValue: IObject): void {
		const node: ENode = nodeValue as ENode;
		if (!node) {
			return;
		}
		for (const key in node.propertyDic) {
			let dValue: IValue = node.propertyDic[key];
			const link: ELink = dValue as ELink;
			if (link instanceof ELink) {
				const relatives: EValue[] = [];
				for (var i = 0; i < link.getRelativeIdList().length; i++) {
					const id: string = link.getRelativeIdList()[i];
					dValue = this.getValueByID(id);
					if (dValue) {
						relatives.push(<EValue>dValue);
					}
				}
				link.addRelatives(relatives);
			}
			else if (dValue instanceof EArray) {
				for (var i = 0; i < (<EArray>dValue).childNodes.length; i++) {
					const childValue: IValue = (<EArray>dValue).childNodes[i];
					if (childValue instanceof EObject) {
						this.checkELink(childValue as EObject);
					}
				}
			}
			else if (dValue instanceof EObject) {
				this.checkELink(dValue as EObject);
			}
		}
	}
	/**
	 * 检查节点所携带的id是否与已有id重复,若重复则修改
	 */
	private checkRepeatIdForXml(xml: sax.Tag, parentNode: INode): void {
		if (!xml) {
			return;
		}

		let rootXML: sax.Tag = xml;
		while (rootXML.parent) {
			rootXML = rootXML.parent;
		}
		let id: string = xml.attributes['id'];
		const ids: string[] = [];
		this.getIdsInNodeSkin(parentNode, ids);
		this.getIdsInXmlSkin(rootXML, ids);
		if (id && ids.indexOf(id) !== -1) {
			let index: number = id.length - 1;
			while (index > 0) {
				const char: string = id.charAt(index);
				if (char >= '0' && char <= '9') {
					id = id.substr(0, index);
				}
				else {
					break;
				}
				index--;
			}
			index = 0;
			while (index < 10000) {
				if (ids.indexOf(id + index) < 0) {
					id = id + index;
					break;
				}
				index++;
			}
			this.idMap[id] = null;
			xmlTagUtil.setAttribute(xml, 'id', id);
			xml.attributes['id'] = id;
		}

		for (let i = 0; i < xml.children.length; i++) {
			const child: sax.Tag = xml.children[i];
			if (this.getExmlConfig().isProperty(child)) {
				for (let j = 0; j < child.children.length; j++) {
					const childXML: sax.Tag = child.children[j];
					this.checkRepeatIdForXml(childXML, parentNode);
				}
			}
			else {
				this.checkRepeatIdForXml(child, parentNode);
			}
		}
	}

	/**
	 * 剪切选中的节点到系统剪贴板
	 */
	public cutNodesToClipboard(): void {
		this.copyNodesToClipboard();
		const nodeList: INode[] = this._selectedNodes.concat();
		if (nodeList.indexOf(this._rootNode) !== -1) {
			return;
		}
		var animationEnabled = this.getAnimationModel().getEnabled();
		if (animationEnabled) {
			return;
		}
		for (let i = 0; i < nodeList.length; i++) {
			let node: INode = nodeList[i];
			if (node.getParent() instanceof EScroller) {
				node = node.getParent();
			}
			if (node.getParent()) {
				node.getParent().removeNode(node);
			}
		}
	}
	/**
	 * 立即复制整个选中项列表，粘贴进节点树，并设置为新的选中项列表。返回是否复制成功。
	 */
	public cloneSelectedNodes(): boolean {
		if (!this._rootNode) {
			return false;
		}
		const xmlList: sax.Tag[] = this.getCopyNodes();
		if (xmlList.length === 0) {
			return false;
		}
		return this.doPasteNodes(xmlList);
	}
	/**
	 * 从当前节点树里移除指定列表id的节点。若该节点id被节点树上其他节点引用。则不移除。
	 */
	public cleanUntappedIds(ids: string[]): void {
		if (!this._rootNode || !ids) {
			return;
		}
		const idDic: { [id: string]: number } = {};
		this.countIdLinkNum(this._rootNode as EObject, idDic);
		for (let i = 0; i < ids.length; i++) {
			const id: string = ids[i];
			if (idDic[id] === undefined) {
				const value: any = this.idMap[id];
				if (value instanceof EValue) {
					if (value._host instanceof EArray) {
						var index: number = (<EArray>value._host).indexOf(value);
						(<EArray>value._host).splice(index, 1);
					}
				}
				else if (Array.isArray(value)) {
					const arr: any[] = (<any[]>value).concat();
					for (let j = 0; j < arr.length; j++) {
						const idValue: EValue = arr[j];
						if (idValue._host instanceof EArray) {
							index = (<EArray>idValue._host).indexOf(idValue);
							(<EArray>idValue._host).splice(index, 1);
						}
					}
				}

			}
		}
	}

	private countIdLinkNum(dO: EObject, idDic: { [id: string]: number }): void {
		for (const key in dO.propertyDic) {
			const dValue: IValue = dO.propertyDic[key];
			const link: ELink = dValue as ELink;
			if (link instanceof ELink) {
				for (var i = 0; i < link.getRelativeIdList().length; i++) {
					const id: string = link.getRelativeIdList()[i];
					if (idDic[id] === undefined) {
						idDic[id] = 1;
					}
					else {
						idDic[id]++;
					}
				}
			}
			else if (dValue instanceof EArray) {
				for (var i = 0; i < (<EArray>dValue).childNodes.length; i++) {
					const childValue: IValue = (<EArray>dValue).childNodes[i];
					if (childValue instanceof EObject) {
						this.countIdLinkNum(childValue as EObject, idDic);
					}
				}
			}
			else if (dValue instanceof EObject) {
				this.countIdLinkNum(dValue as EObject, idDic);
			}
		}
	}

	/**
	 * 解析一个EValue对象为XML节点
	 * @param value 要解析的节点
	 * @param parseChildren 是否解析子节点，默认true。
	 */
	public parseXML(value: IValue, parseChildren: boolean = true): sax.Tag {
		return this.exmlParser.parseXML(value, parseChildren);
	}
	/**
	 * 解析一个XML节点为EValue
	 */
	public parseExmlValue(xml: sax.Tag, inMultipleStates: boolean = false): IValue {
		return this.exmlParser.parseExmlValue(xml, inMultipleStates);
	}

	/**
	 * 创建IArray实例
	 */
	public createIArray(name?: string, ns?: Namespace): IArray {
		return new EArray(name, ns);
	}
	/**
	 * 创建IClass实例
	 * @param className 类名
	 */
	public createIClass(className: string, xml: sax.Tag = null): IClass {
		const value: EClass = new EClass(this, className, xml);
		return value;
	}

	private internalCreateIObject(clazz: any, name: string, ns: Namespace, instance: any = null): IObject {
		if (!instance) {
			instance = this._exmlConfig.getInstanceById(name, ns);
		}
		const value: EObject = new clazz(name, ns, instance) as EObject;
		value.setExmlModel(this);
		return value;
	}
	/**
	 * 创建IContainer实例,若不传入instance，则根据name和ns自动实例化一个。
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	public createIContainer(name: string, ns: Namespace, instance: any = null): IContainer {
		return this.internalCreateIObject(EContainer, name, ns, instance) as EContainer;
	}
	/**
	 * 创建ILink实例
	 * @param expression 实例表达式。
	 * 若表达式里含有对其他id的引用，务必在之后调用addRelatives()添加引用的EValue实例列表
	 */
	public createILink(expression: string): ILink {
		return new ELink(expression);
	}
	/**
	 * 创建INode实例,若不传入instance，则根据name和ns自动实例化一个。
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	public createINode(name: string, ns: Namespace, instance: any = null): INode {
		return this.internalCreateIObject(ENode, name, ns, instance) as ENode;
	}
	/**
	 * 创建IObject实例,若不传入instance，则根据name和ns自动实例化一个。
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	public createIObject(name: string, ns: Namespace, instance: any = null): IObject {
		return this.internalCreateIObject(EObject, name, ns, instance) as EObject;
	}
	/**
	 * 创建IScroller实例,若不传入instance，则根据name和ns自动实例化一个。
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	public createIScroller(name: string, ns: Namespace, instance: any = null): IScroller {
		return this.internalCreateIObject(EScroller, name, ns, instance) as EScroller;
	}
	/**
	 * 创建ISize实例
	 * @param instance Number或类似'100%'的String
	 */
	public createISize(instance: any = null): ISize {
		return new ESize(instance);
	}
	/**
	 * 创建IScale9Grid实例
	 * @param value 由四个数字组成的字符串,分别表示x，y，width，height，例如：'7,7,46,46';
	 */
	public createIScale9Grid(expression: string): IScale9Grid {
		return new EScale9Grid(expression);
	}
	/**
	 * 创建IValue实例
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	public createIValue(name: string, ns: Namespace, instance: any = null): IValue {
		return new EValue(name, ns, instance);
	}
	/**
	 * 创建IViewStack实例,若不传入instance，则根据name和ns自动实例化一个。
	 * @param name 节点名,通常是类名的简短表示(非完全限定)
	 * @param ns 该类所属的命名空间
	 * @param instance 节点对应的值或实例引用
	 */
	public createIViewStack(name: string, ns: Namespace, instance: any = null): IViewStack {
		return this.internalCreateIObject(EViewStack, name, ns, instance) as EViewStack;
	}
	/**
	 * 生成一个可用的id
	 */
	public generateId(target: IObject): string {
		let name = target.getName();
		name = name[0].toLowerCase() + name.substring(1);

		const _generateID = (name: string, seed?: number): string => {
			const id = name + (seed < 0 ? '' : seed);
			if (this.getValueByID(id)) {
				return _generateID(name, seed + 1);
			} else {
				return id;
			}
		};

		return _generateID(name, -1);
	}

	public getDesignConfig(): IDesignConfig {
		return this._designConfig;
	}

	public getAnimationModel(): IAnimationModel {
		return this._animationModel;
	}

	public getWingNodeModel(): IWingNodeModel {
		return this._wingNodeModel;
	}
}

/**
 * 子ExmlModel
 */
export class SubExmlModel extends ExmlModel {
	private parentModel: IExmlModel;
	/**
	 * 设置父级
	 * @param value 
	 */
	public setParent(value: IExmlModel): void {
		this.parentModel = value;
	}
}
ExmlModelCreaterEui.ExmlModel = ExmlModel;
ExmlModelCreaterEui.SubExmlModel = SubExmlModel;