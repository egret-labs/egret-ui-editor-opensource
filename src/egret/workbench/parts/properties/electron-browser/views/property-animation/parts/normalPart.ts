import { BasePart } from '../../parts/basePart';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { NumberInput } from 'egret/base/browser/ui/inputs';
import { HGroup, AttributeItemGroup } from 'egret/base/browser/ui/containers';
import { localize } from 'egret/base/localization/nls';
import { addClass } from 'egret/base/common/dom';
import { IUIBase } from 'egret/base/browser/ui/common';
import { IDisposable } from 'egret/base/common/lifecycle';

enum PropertyTypes {
	X = 'x',
	Y = 'y',
	WIDTH = 'width',
	HEIGHT = 'height',
	SCALE_X = 'scaleX',
	SCALE_Y = 'scaleY',
	ALPHA = 'alpha',
	ROTATION = 'rotation'
}

export class NormalPart extends BasePart {
	/**
	 * 关联的属性发生了改变
	 * @param nodes 
	 */
	public doRelatePropsChanged(nodes: INode[]): void {
		if (!this.model || !nodes || nodes.length === 0) {
			this.hide();
			return;
		}

		const node = nodes[0];
		if (node.getIsRoot()) {
			this.hide();
			return;
		}
		this.show();
		this.registerEvent(node);
		this.updateValue(node);
		this.posGroup.style.display = null;
		this.sizeGroup.style.display = null;
		this.scaleGroup.style.display = null;
		this.otherGroup.style.display = null;
		this.compMap[PropertyTypes.HEIGHT]['supportPercent'] = true;
		this.compMap[PropertyTypes.WIDTH]['supportPercent'] = true;
	}

	private valueChangeDispose: IDisposable;
	private registerEvent(node: INode): void {
		if (this.valueChangeDispose) {
			this.valueChangeDispose.dispose();
			this.valueChangeDispose = null;
		}
		this.valueChangeDispose = node.onInstanceValueChanged(() => this.updateValue(node));
	}

	private updateValue(node: INode): void {
		const keyValue: { [type: string]: any } = this.getDisplayKeyValue(node);
		for (const type in keyValue) {
			let value = keyValue[type];
			if (typeof value === 'number') {
				value = Math.round(value * 100) / 100;
			} else if (!value) {
				value = '';
			}
			value = value.toString();
			var component = this.compMap[type] as NumberInput;
			component.text = value;
		}
	}

	private getDisplayKeyValue(node: INode): { [type: string]: any } {
		const result: { [type: string]: any } = {};
		if (!this.model) {
			return result;
		}
		result[PropertyTypes.X] = node.getInstance()[PropertyTypes.X];
		result[PropertyTypes.Y] = node.getInstance()[PropertyTypes.Y];
		result[PropertyTypes.WIDTH] = node.getInstance()[PropertyTypes.WIDTH];
		result[PropertyTypes.HEIGHT] = node.getInstance()[PropertyTypes.HEIGHT];
		result[PropertyTypes.SCALE_X] = node.getInstance()[PropertyTypes.SCALE_X];
		result[PropertyTypes.SCALE_Y] = node.getInstance()[PropertyTypes.SCALE_Y];
		result[PropertyTypes.ALPHA] = node.getInstance()[PropertyTypes.ALPHA];
		result[PropertyTypes.ROTATION] = node.getInstance()[PropertyTypes.ROTATION];
		return result;
	}

	private compMap: { [type: string]: IUIBase } = {};
	private posGroup = new HGroup();
	private sizeGroup = new HGroup();
	private otherGroup = new HGroup();
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

		this.scaleGroup.create(container);
		this.scaleGroup.style.flexWrap = 'wrap';
		this.createNumberAtt(PropertyTypes.SCALE_X, localize('property.sizepos.scaleX', 'Scale X:'), this.scaleGroup, false);
		this.createNumberAtt(PropertyTypes.SCALE_Y, localize('property.sizepos.scaleY', 'Scale Y:'), this.scaleGroup, false);

		this.otherGroup.create(container);
		this.otherGroup.style.flexWrap = 'wrap';
		this.createNumberAtt(PropertyTypes.ALPHA, localize('property.sizepos.alpha', 'Alpha:'), this.otherGroup, false);
		this.createNumberAtt(PropertyTypes.ROTATION, localize('property.sizepos.rotation', 'Rotation:'), this.otherGroup, false);
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
		input.readonly = true;
		this.compMap[type] = input;
	}

	private initAttributeStyle(attribute: AttributeItemGroup): void {
		attribute.labelWidth = 60;
		addClass(attribute.getItemElement(), 'property-attribute-item');
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		super.dispose();
		if (this.valueChangeDispose) {
			this.valueChangeDispose.dispose();
			this.valueChangeDispose = null;
		}
	}

}