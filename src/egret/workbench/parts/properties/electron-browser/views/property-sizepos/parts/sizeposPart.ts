import { BasePart } from '../../parts/basePart';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { NumberInput } from 'egret/base/browser/ui/inputs';
import { HGroup, AttributeItemGroup } from 'egret/base/browser/ui/containers';
import { localize } from 'egret/base/localization/nls';
import { addClass } from 'egret/base/common/dom';
import { UserValue, DefaultValue, getSameKeyValue, getProperty, setPropertyNum, setPropertyNumPro } from 'egret/workbench/parts/properties/common/properties';
import { IUIBase } from 'egret/base/browser/ui/common';

import '../../media/propertyView.css';
import '../../media/propertyViewStyle.css';
import { isNumber } from 'egret/base/common/types';

enum PropertyTypes {
	X = 'x',
	Y = 'y',
	WIDTH = 'width',
	HEIGHT = 'height',
	ANCHOR_OFFSET_X = 'anchorOffsetX',
	ANCHOR_OFFSET_Y = 'anchorOffsetY',
	SCALE_X = 'scaleX',
	SCALE_Y = 'scaleY'
}

/**
 * 尺寸和大小部分
 */
export class SizePosPart extends BasePart {

	private currentNodes: INode[] = null;
	private skinNodes:INode[] = null;
	/**
	 * 关联的属性发生了改变
	 * @param nodes 
	 */
	public doRelatePropsChanged(nodes: INode[]): void {
		this.currentNodes = null;
		this.hide();
		if (!this.model) {
			return;
		}

		const targetNodes: INode[] = [];
		const targetSkinNodes:INode[] = [];
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			const className = this.model.getExmlConfig().getClassNameById(node.getName(), node.getNs());
			//Skin的getInstance()会被解析成Group，但是Skin不能设置布局
			if (className !== 'eui.Skin') {
				targetNodes.push(node);
			}else{
				targetSkinNodes.push(node);
			}
		}
		if (targetNodes.length == 0 && targetSkinNodes.length == 0) {
			return;
		}
		this.show();
		this.currentNodes = targetNodes;
		this.skinNodes = targetSkinNodes;


		if(targetNodes.length > 0){
			let keyValue: {
				[type: string]: {
					user: UserValue;
					default: DefaultValue;
				};
			} = {};
			if (targetNodes.length > 0) {
				var keyvalues: { [type: string]: { user: UserValue, default: string } }[] = [];
				for (var i = 0; i < targetNodes.length; i++) {
					keyvalues.push(this.getDisplayKeyValue(targetNodes[i]));
				}
				keyValue = getSameKeyValue(keyvalues);
			}
			for (const type in keyValue) {
				const value = keyValue[type];
				var component = this.compMap[type] as NumberInput;
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
			this.posGroup.style.display = null;
			this.sizeGroup.style.display = null;
			this.anchorGroup.style.display = null;
			this.scaleGroup.style.display = null;
			this.compMap[PropertyTypes.HEIGHT]['supportPercent'] = true;
			this.compMap[PropertyTypes.WIDTH]['supportPercent'] = true;
		}else if(targetSkinNodes.length > 0){
			this.compMap[PropertyTypes.HEIGHT]['supportPercent'] = false;
			this.compMap[PropertyTypes.WIDTH]['supportPercent'] = false;
			let keyValue: {
				[type: string]: {
					user: UserValue;
					default: DefaultValue;
				};
			} = {};
			if (targetSkinNodes.length > 0) {
				var keyvalues: { [type: string]: { user: UserValue, default: string } }[] = [];
				for (var i = 0; i < targetSkinNodes.length; i++) {
					keyvalues.push(this.getDisplayKeyValue(targetSkinNodes[i]));
				}
				keyValue = getSameKeyValue(keyvalues);
			}
			for (const type in keyValue) {
				const value = keyValue[type];
				var component = this.compMap[type] as NumberInput;
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
			this.posGroup.style.display = 'none';
			this.sizeGroup.style.display = null;
			this.anchorGroup.style.display = 'none';
			this.scaleGroup.style.display = 'none';
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
		if (!this.model) {
			return result;
		}
		result[PropertyTypes.X] = getProperty(node, PropertyTypes.X);
		result[PropertyTypes.Y] = getProperty(node, PropertyTypes.Y);
		result[PropertyTypes.WIDTH] = getProperty(node, PropertyTypes.WIDTH);
		result[PropertyTypes.HEIGHT] = getProperty(node, PropertyTypes.HEIGHT);
		result[PropertyTypes.ANCHOR_OFFSET_X] = getProperty(node, PropertyTypes.ANCHOR_OFFSET_X);
		result[PropertyTypes.ANCHOR_OFFSET_Y] = getProperty(node, PropertyTypes.ANCHOR_OFFSET_Y);
		result[PropertyTypes.SCALE_X] = getProperty(node, PropertyTypes.SCALE_X);
		result[PropertyTypes.SCALE_Y] = getProperty(node, PropertyTypes.SCALE_Y);
		return result;
	}

	private compMap: { [type: string]: IUIBase } = {};
	private posGroup = new HGroup();
	private sizeGroup = new HGroup();
	private anchorGroup = new HGroup();
	private scaleGroup = new HGroup();

	/**
	 * 渲染
	 * @param el 
	 */
	protected render(container: HTMLElement): void {
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.padding = '4px 0 4px 0';
		this.compMap = {};


		this.posGroup.create(container);
		this.posGroup.style.flexWrap = 'wrap';
		this.createNumberAtt(PropertyTypes.X, localize('property.sizepos.x', 'X:'), this.posGroup, false);
		this.createNumberAtt(PropertyTypes.Y, localize('property.sizepos.y', 'Y:'), this.posGroup, false);

		this.sizeGroup.create(container);
		this.sizeGroup.style.flexWrap = 'wrap';
		this.createNumberAtt(PropertyTypes.WIDTH, localize('property.sizepos.width', 'Width:'), this.sizeGroup, true);
		this.createNumberAtt(PropertyTypes.HEIGHT, localize('property.sizepos.height', 'Height:'), this.sizeGroup, true);

		this.anchorGroup.create(container);
		this.anchorGroup.style.flexWrap = 'wrap';
		this.createNumberAtt(PropertyTypes.ANCHOR_OFFSET_X, localize('property.sizepos.anchorX', 'Anchor X:'), this.anchorGroup, false);
		this.createNumberAtt(PropertyTypes.ANCHOR_OFFSET_Y, localize('property.sizepos.anchorY', 'Anchor Y:'), this.anchorGroup, false);

		this.scaleGroup.create(container);
		this.scaleGroup.style.flexWrap = 'wrap';
		this.createNumberAtt(PropertyTypes.SCALE_X, localize('property.sizepos.scaleX', 'Scale X:'), this.scaleGroup, false);
		this.createNumberAtt(PropertyTypes.SCALE_Y, localize('property.sizepos.scaleY', 'Scale Y:'), this.scaleGroup, false);
	}

	private createNumberAtt(type: PropertyTypes, label: string, container: IUIBase, supportPercent: boolean): void {
		const attribute = new AttributeItemGroup(container);
		this.initAttributeStyle(attribute);
		attribute.style.marginRight = '6px';
		attribute.label = label;
		attribute.labelWidth = 60;
		const input = new NumberInput(attribute);
		input.style.maxWidth = '50px';
		input.regulateStep = 0.1;
		input.supportPercent = supportPercent;
		this.toDisposes.push(input.onValueChanging(e => {
			let value:string|number = null;
			if(supportPercent){
				value = e;
			}else if(e){
				value =  Number.parseFloat(e);
			}
			this.numberChanging_handler(type, value, supportPercent);
		}));
		this.toDisposes.push(input.onValueChanged(e => {
			let value:string|number = null;
			if(supportPercent){
				value = e;
			}else if(e){
				value =  Number.parseFloat(e);
			}
			this.numberhanged_handler(type, value, supportPercent);
		}));
		this.compMap[type] = input;
	}

	private initAttributeStyle(attribute: AttributeItemGroup): void {
		attribute.labelWidth = 60;
		addClass(attribute.getItemElement(), 'property-attribute-item');
	}

	private numberChanging_handler(type: PropertyTypes, value: number | string, supportPercent: boolean): void {
		if (!this.currentNodes) {
			return;
		}
		if(supportPercent){
			let prop = '';
			if(type == PropertyTypes.WIDTH){
				prop = 'percentWidth';
			}else if(type == PropertyTypes.HEIGHT){
				prop = 'percentHeight';
			}
			value = Number.parseFloat(value as string);
			for (let i = 0; i < this.currentNodes.length; i++) {
				const node = this.currentNodes[i];
				node.setInstanceValue(prop,value);
			}

			for (let i = 0; i < this.skinNodes.length; i++) {
				const node = this.skinNodes[i];
				node.setInstanceValue(prop,value);
			}

			
		}else{
			for (let i = 0; i < this.currentNodes.length; i++) {
				const node = this.currentNodes[i];
				node.setInstanceValue(type,value);
			}
			for (let i = 0; i < this.skinNodes.length; i++) {
				const node = this.skinNodes[i];
				node.setInstanceValue(type,value);
			}
		}
	}

	private numberhanged_handler(type: PropertyTypes, value: number | string, supportPercent: boolean): void {
		if (!this.currentNodes) {
			return;
		}
		if (!this.model) {
			return;
		}
		if (supportPercent) {
			setPropertyNumPro(this.currentNodes, type, value, this.model, true);
			setPropertyNumPro(this.skinNodes, type, value, this.model, true);
		} else if (isNumber(value) || value == null) {
			for (var i = 0; i < this.currentNodes.length; i++) {
				var node = this.currentNodes[i];
				setPropertyNum(node, type, value as any);
			}
			for (var i = 0; i < this.skinNodes.length; i++) {
				var node = this.skinNodes[i];
				setPropertyNum(node, type, value as any);
			}
		}
	}
}