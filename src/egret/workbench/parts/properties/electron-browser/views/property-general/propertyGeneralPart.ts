import { PropertyBasePart } from '../core/PropertyDetailParts';
import { localize } from 'egret/base/localization/nls';
import { INode, isInstanceof } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { AttributeItemGroup } from 'egret/base/browser/ui/containers';
import { TextInput, NumberInput } from 'egret/base/browser/ui/inputs';
import { CheckBoxDropDown, IDropDownCheckBoxDataSource } from 'egret/base/browser/ui/checkboxDropdowns';
import { ComboBox } from 'egret/base/browser/ui/comboboxs';
import { trim } from 'egret/base/common/strings';
import { addClass, removeClass } from 'egret/base/common/dom';
import { AccordionGroup } from 'egret/base/browser/ui/accordionGroup';
import { IUIBase } from 'egret/base/browser/ui/common';
import { IDropDownTextDataSource } from 'egret/base/browser/ui/dropdowns';
import { W_EUI } from 'egret/exts/exml-exts/exml/common/project/parsers/core/commons';
import { getSameKeyValue, UserValue, DefaultValue } from '../../../common/properties';

import '../media/propertyView.css';

enum PropertyTypes {
	ID = 'id',
	STATE = 'state',
	LABEL = 'label',
	TEXT = 'text',
	NAME = 'name',
	CLASS = 'class',
	ENABLE = 'enable',
	DATA_PROVIDER = 'dataProvider',
	ALPHA = 'alpha',
	TOUCH_ENABLE = 'touchEnable',
	TOUCH_CHILDREN = 'touchChildren'
}

/**
 * 通用属性部分
 */
export class PropertyGeneralPart extends PropertyBasePart {

	constructor(owner: AccordionGroup) {
		super(owner);
		this.init('general', localize('property.title.general', 'General'),
			['id', 'source', 'label', 'text', 'name', 'class', 'enabled', 'includeIn', 'excludeFrom', 'dataProvider', 'alpha', 'touchEnabled', 'touchChildren']
		);
	}

	/**
	 * 关联的属性发生了改变
	 * @param nodes 
	 */
	protected relatePropsChanged_handler(nodes: INode[]): void {
		let keyValue: {
			[type: string]: {
				user: UserValue;
				default: DefaultValue;
			};
		} = {};
		if (nodes.length > 0) {
			const keyvalues: { [type: string]: { user: UserValue, default: string } }[] = [];
			for (let i = 0; i < nodes.length; i++) {
				keyvalues.push(this.getDisplayKeyValue(nodes[i]));
			}
			keyValue = getSameKeyValue(keyvalues);
		}
		this.updateView(nodes.length == 1 ? nodes[0] : null, keyValue);
	}


	private getDisplayKeyValue(node: INode): {
		[type: string]: {
			user: UserValue,
			default: string
		}
	} {
		const result: {
			[type: string]: {
				user: UserValue,
				default: string
			}
		} = {};

		if (!this.model) {
			return result;
		}
		if (this.model.getExmlConfig().isInstance(node.getInstance(), 'eui.DataGroup')) {
			result[PropertyTypes.DATA_PROVIDER] = {
				user: null,
				default: '-'
			};
		}
		//如果是根节点
		if (node.getIsRoot()) {
			const type = PropertyTypes.CLASS;
			const classValue = node.getProperty('class');
			const value = (classValue ? classValue.getInstance() : null);

			let defaultValue = node.getInstance()['class'];
			defaultValue = defaultValue ? defaultValue : '-';

			result[type] = {
				user: value,
				default: defaultValue
			};

		} else {
			let type = PropertyTypes.ID;
			const idValue = node.getProperty('id');
			let value = idValue ? idValue.getInstance() : null;

			let defaultValue = node.getInstance()['id'];
			defaultValue = defaultValue ? defaultValue : '';

			result[type] = {
				user: value,
				default: defaultValue
			};

			if (this.model.getStates().length > 0) {
				const type = PropertyTypes.STATE;
				const value = this.getStates(node);
				result[type] = {
					user: value,
					default: localize('property.general.state.default', '[All Status]'),
				};
			}

			const showEnabled = this.model.getExmlConfig().isInstance(node.getInstance(), 'eui.Component');
			if (showEnabled) {
				const type = PropertyTypes.ENABLE;
				const enabledValue = node.getProperty('enabled');
				const value = enabledValue ? enabledValue.getInstance() : null;

				let defaultValue = node.getInstance()['enabled'];
				defaultValue = defaultValue ? 'true' : 'false';

				result[type] = {
					user: value,
					default: defaultValue
				};
			}

			type = PropertyTypes.ALPHA;
			const alphaValue = node.getProperty('alpha');
			value = alphaValue ? alphaValue.getInstance() : null;
			defaultValue = node.getInstance()['alpha'];
			defaultValue = defaultValue ? defaultValue.toString() : '1';
			result[type] = {
				user: value,
				default: defaultValue
			};


			const isContainer = this.model.getExmlConfig().isInstance(node.getInstance(), 'egret.DisplayObjectContainer');
			if (isContainer) {
				const type = PropertyTypes.TOUCH_CHILDREN;
				const touchChildrenValue = node.getProperty('touchChildren');
				const value = touchChildrenValue ? touchChildrenValue.getInstance() : null;

				let defaultValue = node.getInstance()['touchChildren'];
				defaultValue = defaultValue ? 'true' : 'false';

				result[type] = {
					user: value,
					default: defaultValue
				};

			}

			const isDisplayObject = this.model.getExmlConfig().isInstance(node.getInstance(), 'egret.DisplayObject');
			if (isDisplayObject) {
				const type = PropertyTypes.TOUCH_ENABLE;
				const touchEnabledValue = node.getProperty('touchEnabled');
				const value = touchEnabledValue ? touchEnabledValue.getInstance() : null;

				let defaultValue = node.getInstance()['touchEnabled'];
				defaultValue = defaultValue ? 'true' : 'false';

				result[type] = {
					user: value,
					default: defaultValue
				};
			}

			const isText = this.model.getExmlConfig().isInstance(node.getInstance(), 'egret.TextField') ||
				this.model.getExmlConfig().isInstance(node.getInstance(), 'eui.IDisplayText');
			if (isText) {
				const type = PropertyTypes.TEXT;
				const textValue = node.getProperty('text');
				const value = textValue ? textValue.getInstance() : null;
				let defaultValue = node.getInstance()['text'];
				defaultValue = defaultValue ? defaultValue : '';
				result[type] = {
					user: value,
					default: defaultValue
				};
			}

			const isButtonBase = this.model.getExmlConfig().isInstance(node.getInstance(), 'eui.Button');
			if (isButtonBase) {
				const type = PropertyTypes.LABEL;
				const labelValue = node.getProperty('label');
				const value = labelValue ? labelValue.getInstance() : null;
				let defaultValue = node.getInstance()['label'];
				defaultValue = defaultValue ? defaultValue : '';
				result[type] = {
					user: value,
					default: defaultValue
				};
			}
			const parentIsViewStack = isInstanceof(node.getParent(), 'eui.IViewStack');
			if (parentIsViewStack) {
				const type = PropertyTypes.NAME;
				const nameValue = node.getProperty('name');
				const value = nameValue ? nameValue.getInstance() : null;
				let defaultValue = node.getInstance()['name'];
				defaultValue = defaultValue ? defaultValue : '';
				result[type] = {
					user: value,
					default: defaultValue
				};
			}
		}
		return result;
	}


	/**
	 * 获取节点所属的状态列表
	 */
	public getStates(node: INode): string[] {
		let stateNames: string[] = [];
		if (!this.model) {
			return stateNames;
		}
		const states = this.model.getStates();
		let value = node.getProperty('includeIn');
		if (value) {
			stateNames = trim(value.toString()).split(',');
		} else {
			value = node.getProperty('excludeFrom');
			if (value) {
				const excludeNames = trim(value.toString()).split(',');
				states.forEach(state => {
					if (excludeNames.indexOf(state) === -1) {
						stateNames.push(state);
					}
				});
			}
		}
		return stateNames;
	}

	private updateView(node: INode, keyValue: { [type: string]: { user:UserValue, default: DefaultValue } }): void {
		for (const type in this.attributeMap) {
			if (type in keyValue) {
				removeClass(this.attributeMap[type].group.getItemElement(), 'invisible');
			} else {
				addClass(this.attributeMap[type].group.getItemElement(), 'invisible');
			}
		}
		//更新显示
		for (const type in keyValue) {
			const value = keyValue[type];
			if(!(type in this.attributeMap)){
				continue;
			}
			const component = this.attributeMap[type].comp;
			switch (type) {
				case PropertyTypes.ID:
				case PropertyTypes.LABEL:
				case PropertyTypes.TEXT:
				case PropertyTypes.NAME:
				case PropertyTypes.CLASS:
				case PropertyTypes.ALPHA:
					const input: TextInput = component as TextInput;
					if (value.user != null) {
						input.text = value.user as string;
					} else {
						input.text = '';
					}
					input.prompt = value.default != null ? value.default as any : '-';
					break;
				case PropertyTypes.STATE:
					const stateDropdown = component as CheckBoxDropDown;
					var sources = this.getStatesDataProvder(node);
					stateDropdown.setDatas(sources);
					if (value.user != null) {
						stateDropdown.setSelections(value.user as string[]);
					} else {
						stateDropdown.setSelections([]);
					}
					stateDropdown.prompt = value.default != null ? value.default as any : '-';
					break;
				case PropertyTypes.ENABLE:
				case PropertyTypes.TOUCH_ENABLE:
				case PropertyTypes.TOUCH_CHILDREN:
					const combobox = component as ComboBox;
					if (value.user != null) {
						combobox.setSelection(value.user ? 'true' : 'false');
					} else {
						combobox.setSelection('');
					}
					combobox.prompt = value.default != null ? value.default as any : '-';
				default:
					break;
			}
		}
		this.owner.layout();
	}


	private getStatesDataProvder(node: INode): IDropDownCheckBoxDataSource[] {
		if (this.model && this.model.getSelectedNodes().length > 0) {
			const names = this.model.getStates();
			const actives = node ? this.getStates(node) : [];
			const datas: IDropDownCheckBoxDataSource[] = [];
			for (let i = 0; i < names.length; i++) {
				const data: IDropDownCheckBoxDataSource = { id: names[i], data: { chekced: false, label: names[i] } };
				for (let j = 0; j < actives.length; j++) {
					if (data.id === actives[j]) {
						data.data.chekced = true;
					}
				}
				datas.push(data);
			}
			return datas;
		}
		else {
			return [];
		}
	}



	//ID属性
	private idAttribute: AttributeItemGroup;
	private idInput: TextInput;
	//状态属性
	private stateAttribute: AttributeItemGroup;
	private stateSelect: CheckBoxDropDown;
	//类名属性
	private classNameAttribute: AttributeItemGroup;
	private classNameInput: TextInput;
	//标签属性
	private labelAttribute: AttributeItemGroup;
	private labelInput: TextInput;
	//文本属性
	private textAttribute: AttributeItemGroup;
	private textInput: TextInput;
	//名称属性
	private nameAttribute: AttributeItemGroup;
	private nameInput: TextInput;
	//生效属性
	private enableAttribute: AttributeItemGroup;
	private enableSelect: ComboBox;
	//触碰属性
	private touchEnableAttribute: AttributeItemGroup;
	private touchEnableSelect: ComboBox;
	//触碰子项属性
	private touchChildrenAttribute: AttributeItemGroup;
	private touchChildrenSelect: ComboBox;
	//不透明度属性
	private alphaAttribute: AttributeItemGroup;
	private alphaInput: NumberInput;


	/**
	 * 渲染
	 * @param container 
	 */
	protected render(container: HTMLElement): void {
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.padding = '4px 10px 4px 10px';

		//ID属性
		this.idAttribute = new AttributeItemGroup(container);
		this.idAttribute.label = 'ID:';
		this.idInput = new TextInput(this.idAttribute);
		this.toDisposes.push(this.idInput.onValueChanged(e => this.idChanged_handler(e)));
		this.initAttributeStyle(this.idAttribute);
		this.registerAttribute(this.idAttribute, this.idInput, PropertyTypes.ID);

		//状态属性
		this.stateAttribute = new AttributeItemGroup(container);
		this.stateAttribute.label = localize('property.general.status', 'Status:');
		this.stateSelect = new CheckBoxDropDown(this.stateAttribute);
		this.toDisposes.push(this.stateSelect.onSelectChanged(t => this.stateChanged_handler(t.getSelections())));
		this.initAttributeStyle(this.stateAttribute);
		this.registerAttribute(this.stateAttribute, this.stateSelect, PropertyTypes.STATE);

		//类名属性
		this.classNameAttribute = new AttributeItemGroup(container);
		this.classNameAttribute.label = localize('property.general.className', 'Class Name:');
		this.classNameInput = new TextInput(this.classNameAttribute);
		this.toDisposes.push(this.classNameInput.onValueChanged(e => this.classNameChanged_handler(e)));
		this.initAttributeStyle(this.classNameAttribute);
		this.registerAttribute(this.classNameAttribute, this.classNameInput, PropertyTypes.CLASS);

		//标签属性
		this.labelAttribute = new AttributeItemGroup(container);
		this.labelAttribute.label = localize('property.general.label', 'Label:');
		this.labelInput = new TextInput(this.labelAttribute);
		this.toDisposes.push(this.labelInput.onValueChanged(e => this.labelChanged_handler(e)));
		this.initAttributeStyle(this.labelAttribute);
		this.registerAttribute(this.labelAttribute, this.labelInput, PropertyTypes.LABEL);

		//文本属性
		this.textAttribute = new AttributeItemGroup(container);
		this.textAttribute.label = localize('property.general.text', 'Text:');
		this.textInput = new TextInput(this.textAttribute);
		this.toDisposes.push(this.textInput.onValueChanged(e => this.textChanged_handler(e)));
		this.initAttributeStyle(this.textAttribute);
		this.registerAttribute(this.textAttribute, this.textInput, PropertyTypes.TEXT);

		//名称属性
		this.nameAttribute = new AttributeItemGroup(container);
		this.nameAttribute.label = localize('property.general.name', 'Name:');
		this.nameInput = new TextInput(this.nameAttribute);
		this.toDisposes.push(this.nameInput.onValueChanged(e => this.nameChanged_handler(e)));
		this.initAttributeStyle(this.nameAttribute);
		this.registerAttribute(this.nameAttribute, this.nameInput, PropertyTypes.NAME);

		//生效属性
		this.enableAttribute = new AttributeItemGroup(container);
		this.enableAttribute.label = localize('property.general.enable', 'Enable:');
		this.enableSelect = new ComboBox(this.enableAttribute);
		this.enableSelect.setDatas([
			{ id: 'true', data: 'true' },
			{ id: 'false', data: 'false' },
		]);
		this.toDisposes.push(this.enableSelect.onSelectChanged(t => this.enableChanged_handler(t.getSelection())));
		this.initAttributeStyle(this.enableAttribute);
		this.registerAttribute(this.enableAttribute, this.enableSelect, PropertyTypes.ENABLE);

		//触碰属性
		this.touchEnableAttribute = new AttributeItemGroup(container);
		this.touchEnableAttribute.label = localize('property.general.touchEnabled', 'Touch Enable:');
		this.touchEnableSelect = new ComboBox(this.touchEnableAttribute);
		this.touchEnableSelect.setDatas([
			{ id: 'true', data: 'true' },
			{ id: 'false', data: 'false' },
		]);
		this.toDisposes.push(this.touchEnableSelect.onSelectChanged(t => this.touchEnableChanged_handler(t.getSelection())));
		this.initAttributeStyle(this.touchEnableAttribute);
		this.registerAttribute(this.touchEnableAttribute, this.touchEnableSelect, PropertyTypes.TOUCH_ENABLE);

		//触碰子项属性
		this.touchChildrenAttribute = new AttributeItemGroup(container);
		this.touchChildrenAttribute.label = localize('property.general.touchChildren', 'Touch Children:');
		this.touchChildrenSelect = new ComboBox(this.touchChildrenAttribute);
		this.touchChildrenSelect.setDatas([
			{ id: 'true', data: 'true' },
			{ id: 'false', data: 'false' },
		]);
		this.toDisposes.push(this.touchChildrenSelect.onSelectChanged(t => this.touchChildrenChanged_handler(t.getSelection())));
		this.initAttributeStyle(this.touchChildrenAttribute);
		this.registerAttribute(this.touchChildrenAttribute, this.touchChildrenSelect, PropertyTypes.TOUCH_CHILDREN);

		//不透明度属性
		this.alphaAttribute = new AttributeItemGroup(container);
		this.alphaAttribute.label = localize('property.general.alpha', 'Alpha:');
		this.alphaInput = new NumberInput(this.alphaAttribute);
		this.alphaInput.minValue = 0;
		this.alphaInput.maxValue = 1;
		this.alphaInput.regulateStep = 0.01;
		this.toDisposes.push(this.alphaInput.onValueChanging(e => this.alphaChanging_handler(e)));
		this.toDisposes.push(this.alphaInput.onValueChanged(e => this.alphaChanged_handler(e)));
		this.initAttributeStyle(this.alphaAttribute);
		this.registerAttribute(this.alphaAttribute, this.alphaInput, PropertyTypes.ALPHA);

	}

	private initAttributeStyle(attribute: AttributeItemGroup): void {
		attribute.labelWidth = 60;
		addClass(attribute.getItemElement(), 'property-attribute-item');
	}


	private attributeMap: { [type: string]: { group: AttributeItemGroup, comp: IUIBase } } = {};
	private registerAttribute(attribute: AttributeItemGroup, component: IUIBase, type: PropertyTypes): void {
		this.attributeMap[type] = { group: attribute, comp: component };
	}

	private idChanged_handler(value: string): void {
		const nodes: INode[] = this.model.getSelectedNodes();
		if (!nodes || nodes.length == 0) {
			return;
		}
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			if (!value) {
				node.setProperty('id', null);
			} else {
				if (nodes.length == 1) {
					node.setString('id', value);
				} else {
					node.setString('id', value + '_' + i);
				}
			}
		}
	}

	private stateChanged_handler(states: IDropDownCheckBoxDataSource[]): void {
		const nodes: INode[] = this.model.getSelectedNodes();
		if (!nodes || nodes.length == 0) {
			return;
		}
		if(!states){
			states = [];
		}
		let stateStrs: string = '';
		if (states) {
			for (let i = 0; i < states.length; i++) {
				stateStrs += states[i].id;
				if (i != states.length - 1) {
					stateStrs += ',';
				}
			}
		}
		let isDefaultState:boolean = false;
		if(states.length == 0){
			isDefaultState = true;
		}else{
			isDefaultState = true;
			const existStates: string[] = this.model.getStates();
			if(existStates.length != states.length){
				isDefaultState = false;
			}else{
				for(let i = 0;i<states.length;i++){
					if(existStates.indexOf(states[i].id) == -1){
						isDefaultState = false;
						break;
					}
				}
			}
		}
		if(isDefaultState){
			for (let i = 0; i < nodes.length; i++) {
				const node = nodes[i];
				node.setProperty('includeIn', null);
				node.setProperty('excludeFrom', null);
			}
			return;
		}

		for (let i = 0; i < nodes.length; i++) {
			let node = nodes[i];
			if (!states) {
				if (node.getProperty('includeIn')) {
					node.setProperty('includeIn', null);
				} else if (node.getProperty('excludeFrom')) {
					node.setProperty('excludeFrom', null);
				}
			} else {
				if (node.getProperty('excludeFrom')) {
					node.setProperty('excludeFrom', null);
				}
				let value = node.getProperty('includeIn');
				if (value) {
					value.setInstance(stateStrs);
				} else {
					value = this.model.createIValue('String', W_EUI, stateStrs);
					node.setProperty('includeIn', value);
				}
			}
			let curStates: string[];
			if (!states) {
				curStates = this.model.getStates();
			} else {
				curStates = stateStrs.split(',');
			}
			if (this.model.getCurrentState()) {
				if (curStates.indexOf(this.model.getCurrentState()) === -1) {
					this.model.refreshTree();
				} else {
					const xmlPath = node.getXmlPath();
					this.model.refreshTree();
					node = this.model.getNodeByXmlPath(xmlPath);
					if (node) {
						node.setSelected(true);
					}
				}
			}
		}
	}

	private classNameChanged_handler(value: string): void {
		this.setPropertyStrByLabel('class',value);
	}

	private labelChanged_handler(value: string): void {
		this.setPropertyStrByLabel('label',value);
	}

	private textChanged_handler(value: string): void {
		this.setPropertyStrByLabel('text',value);
	}

	private nameChanged_handler(value: string): void {
		this.setPropertyStrByLabel('name',value);
	}

	private enableChanged_handler(value: IDropDownTextDataSource): void {
		this.setPropertyBooleanByLabel('enable',value ? value.id : null);
	}

	private touchEnableChanged_handler(value: IDropDownTextDataSource): void {
		this.setPropertyBooleanByLabel('touchEnabled',value ? value.id : null);
	}

	private touchChildrenChanged_handler(value: IDropDownTextDataSource): void {
		this.setPropertyBooleanByLabel('touchChildren',value ? value.id : null);
	}

	private alphaChanging_handler(value: string): void {
		const nodes: INode[] = this.model.getSelectedNodes();
		if (!nodes || nodes.length == 0) {
			return;
		}
		const valueNumber = value ?  Number.parseFloat(value) : 1;
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			if(node.getInstance()){
				node.getInstance()['alpha'] = valueNumber;
			}
		}
	}

	private alphaChanged_handler(value: string): void {
		this.setPropertyNumberByLabel('alpha',value ?  Number.parseFloat(value) : null);
	}

	private setPropertyStrByLabel(key:string,value:string):void{
		const nodes: INode[] = this.model.getSelectedNodes();
		if (!nodes || nodes.length == 0) {
			return;
		}
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			if (!value) {
				node.setProperty(key, null);
			} else {
				node.setString(key, value);
			}
		}
	}
	private setPropertyBooleanByLabel(key:string,value:string):void{
		const nodes: INode[] = this.model.getSelectedNodes();
		if (!nodes || nodes.length == 0) {
			return;
		}
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			if (!value) {
				node.setProperty(key, null);
			} else {
				node.setBoolean(key, value == 'true' ? true : false);
			}
		}
	}
	private setPropertyNumberByLabel(key:string,value:number):void{
		const nodes: INode[] = this.model.getSelectedNodes();
		if (!nodes || nodes.length == 0) {
			return;
		}
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			if (value == null) {
				node.setProperty(key, null);
			} else {
				node.setNumber(key, value);
			}
		}
	}
}