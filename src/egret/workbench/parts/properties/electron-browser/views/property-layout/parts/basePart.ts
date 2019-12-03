import { BasePart } from '../../parts/basePart';
import { INode, isInstanceof, IObject } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { AttributeItemGroup } from 'egret/base/browser/ui/containers';
import { addClass } from 'egret/base/common/dom';
import { IUIBase } from 'egret/base/browser/ui/common';
import { NumberInput } from 'egret/base/browser/ui/inputs';
import { ComboBox } from 'egret/base/browser/ui/comboboxs';
import { UserValue, DefaultValue, getSameKeyValue, getProperty, setPropertyNum, setPropertyStr } from 'egret/workbench/parts/properties/common/properties';
import { IDropDownTextDataSource } from 'egret/base/browser/ui/dropdowns';

import '../../media/propertyView.css';
import '../../media/propertyViewStyle.css';

/**
 * 布局部件的基类
 */
export class BaseLayoutPart extends BasePart {

	private currentNodes: INode[] = null;
	private types: string[] = [];

	protected initTypes(...types: string[]): void {
		this.types = types;
	}
	/**
	 * 关联的属性发生了改变
	 * @param nodes 
	 */
	public doRelatePropsChanged(nodes: INode[]): void {
		this.currentNodes = nodes;
		if (!this.model) {
			return;
		}
		if (nodes.length == 0) {
			return;
		}

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

		for (const type in keyValue) {
			const value = keyValue[type];
			const component = this.getComp(type);
			if (component instanceof ComboBox) {
				if (value.user != null) {
					component.setSelection(value.user as string);
					component.prompt = value.user as string;
				} else if (value.default != null) {
					component.setSelection(null);
					component.prompt = value.default as string;
				} else {
					component.setSelection(null);
					component.prompt = '-';
				}
			} else if (component instanceof NumberInput) {
				if (value.user != null) {
					component.text = value.user as string;
				} else if (value.default != null) {
					component.text = null;
					component.prompt = value.default as string;
				} else {
					component.text = null;
					component.prompt = '-';
				}
			}
		}
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
		node = this.getLayoutNode(node);
		if (!node) {
			return result;
		}
		this.types.forEach(type => {
			result[type] = getProperty(node, type);
		});
		return result;
	}

	private getLayoutNode(node: INode): INode {
		if (!this.model) {
			return null;
		}
		const value = node.getProperty('layout');
		if (!value && !isInstanceof(value, 'eui.INode')) {
			return;
		}
		node = value as any;
		return node;
	}

	private compsMap: { [type: string]: IUIBase } = {};
	/**
	 * 渲染
	 * @param el 
	 */
	protected render(container: HTMLElement): void {
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.padding = '4px 0 4px 0';


	}

	protected createNumberAtt(type: string, label: string, container: IUIBase | HTMLElement): void {
		const attribute = new AttributeItemGroup(container);
		this.initAttributeStyle(attribute);
		attribute.style.marginRight = '6px';
		attribute.label = label;
		attribute.labelWidth = 50;
		const input = new NumberInput(attribute);
		input.style.maxWidth = '50px';
		input.regulateStep = 0.1;
		this.toDisposes.push(input.onValueChanging(e => {
			let value: number = null;
			if (e) {
				value = Number.parseFloat(e);
			}
			this.numberChanging_handler(type, value);
		}));
		this.toDisposes.push(input.onValueChanged(e => {
			let value: number = null;
			if (e) {
				value = Number.parseFloat(e);
			}
			this.numberChanged_handler(type, value);
		}));
		this.reigsterComps(type, input);
	}

	protected createCombobox(type: string, label: string, container: IUIBase | HTMLElement, datas: IDropDownTextDataSource[]): void {
		const attribute = new AttributeItemGroup(container);
		attribute.label = label;
		const combobox = new ComboBox(attribute);
		combobox.setDatas(datas);
		this.reigsterComps(type, combobox);
		this.initAttributeStyle(attribute);
		this.toDisposes.push(combobox.onSelectChanged(t => {
			const value = t.getSelection();
			if (!value) {
				this.comboboxChanged_handler(type, null);
			} else {
				this.comboboxChanged_handler(type, value.id);
			}
		}));
	}

	protected initAttributeStyle(attribute: AttributeItemGroup): void {
		attribute.labelWidth = 50;
		addClass(attribute.getItemElement(), 'property-attribute-item');
	}

	protected reigsterComps(type: string, comp: IUIBase): void {
		this.compsMap[type] = comp;
	}
	protected getComp(type: string): IUIBase {
		return this.compsMap[type];
	}

	private numberChanging_handler(type: string, value: number): void {
		if (!this.currentNodes) {
			return;
		}
		for (let i = 0; i < this.currentNodes.length; i++) {
			const node = this.currentNodes[i];
			const layoutValue = node.getProperty('layout') as IObject;
			if (!layoutValue || !isInstanceof(layoutValue, 'eui.IObject')) {
				return;
			}
			node.setInstanceValue(type, value);
		}
	}
	private numberChanged_handler(type: string, value: number): void {
		if (!this.currentNodes) {
			return;
		}
		for (let i = 0; i < this.currentNodes.length; i++) {
			const node = this.currentNodes[i];
			const layoutValue = node.getProperty('layout') as IObject;
			if (!layoutValue || !isInstanceof(layoutValue, 'eui.IObject')) {
				return;
			}
			setPropertyNum(layoutValue, type, value);
		}
	}
	private comboboxChanged_handler(type: string, value: string): void {
		if (!this.currentNodes) {
			return;
		}
		for (let i = 0; i < this.currentNodes.length; i++) {
			const node = this.currentNodes[i];
			const layoutValue = node.getProperty('layout') as IObject;
			if (!layoutValue || !isInstanceof(layoutValue, 'eui.IObject')) {
				return;
			}
			setPropertyStr(layoutValue, type, value);
		}
	}
}