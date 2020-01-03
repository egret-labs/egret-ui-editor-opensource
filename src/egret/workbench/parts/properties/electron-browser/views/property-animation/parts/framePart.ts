import { BasePart } from '../../parts/basePart';
import { INode, IObject } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { NumberInput } from 'egret/base/browser/ui/inputs';
import { HGroup, AttributeItemGroup } from 'egret/base/browser/ui/containers';
import { localize } from 'egret/base/localization/nls';
import { addClass } from 'egret/base/common/dom';
import { IUIBase } from 'egret/base/browser/ui/common';
import { IAnimationService } from 'egret/workbench/parts/animation/common/animation';
import { EditingPath } from 'egret/exts/exml-exts/exml/common/plugin/IAnimationModel';

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

export class FramePart extends BasePart {
	/**
	 *
	 */
	constructor(container: HTMLElement | IUIBase = null,
		@IAnimationService private animationService: IAnimationService) {
		super(container);

	}
	/**
	 * 关联的属性发生了改变
	 * @param nodes 
	 */
	public doRelatePropsChanged(nodes: INode[]): void {
		if (!this.model || !nodes || nodes.length === 0) {
			this.hide();
			return;
		}
		const editingPath = this.getEditingPath();
		if (!editingPath) {
			this.hide();
			return;
		}
		if (editingPath.position === 'between') {
			this.hide();
			return;
		}
		const animation = this.animationService.animation;
		const node = animation && animation.getSelectedNode();
		if (!node) {
			this.hide();
			return;
		}
		this.show();
		const keyValue: { [type: string]: any } = this.getDisplayKeyValue(editingPath);
		for (const type in keyValue) {
			let value = keyValue[type];
			if (typeof value === 'number') {
				value = Math.round(value * 100) / 100;
			} else if (!value){
				value = '';
			}
			value = value.toString();
			var component = this.compMap[type] as NumberInput;
			component.text = value;
		}

		this.posGroup.style.display = null;
		this.sizeGroup.style.display = null;
		this.scaleGroup.style.display = null;
		this.otherGroup.style.display = null;
		this.compMap[PropertyTypes.HEIGHT]['supportPercent'] = false;
		this.compMap[PropertyTypes.WIDTH]['supportPercent'] = false;
	}

	private getDisplayKeyValue(editingPath: EditingPath): { [type: string]: any } {
		const result: { [type: string]: any } = {};
		if (!editingPath) {
			return result;
		}
		const setProps: IObject = editingPath.path.instance.getProperty('props') as IObject;
		result[PropertyTypes.X] = setProps ? setProps.getInstance()[PropertyTypes.X] : null;
		result[PropertyTypes.Y] = setProps ? setProps.getInstance()[PropertyTypes.Y] : null;
		result[PropertyTypes.WIDTH] = setProps ? setProps.getInstance()[PropertyTypes.WIDTH] : null;
		result[PropertyTypes.HEIGHT] = setProps ? setProps.getInstance()[PropertyTypes.HEIGHT] : null;
		result[PropertyTypes.SCALE_X] = setProps ? setProps.getInstance()[PropertyTypes.SCALE_X] : null;
		result[PropertyTypes.SCALE_Y] = setProps ? setProps.getInstance()[PropertyTypes.SCALE_Y] : null;
		result[PropertyTypes.ALPHA] = setProps ? setProps.getInstance()[PropertyTypes.ALPHA] : null;
		result[PropertyTypes.ROTATION] = setProps ? setProps.getInstance()[PropertyTypes.ROTATION] : null;
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
		this.createNumberAtt(PropertyTypes.WIDTH, localize('property.sizepos.width', 'Width:'), this.sizeGroup, false);
		this.createNumberAtt(PropertyTypes.HEIGHT, localize('property.sizepos.height', 'Height:'), this.sizeGroup, false);

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
		if (type === PropertyTypes.SCALE_X ||
			type === PropertyTypes.SCALE_Y ||
			type === PropertyTypes.ALPHA) {
			input.regulateStep = 0.1;
		} else {
			input.regulateStep = 1;
		}
		input.supportPercent = supportPercent;
		this.toDisposes.push(input.onRegulateValue(e => {
			let value: string | number = null;
			if (supportPercent) {
				value = e;
			} else if (e) {
				value = Number.parseFloat(e);
			}
			this.numberhange_handler(type, value, supportPercent);
		}));
		this.toDisposes.push(input.onValueChanged(e => {
			let value: string | number = null;
			if (supportPercent) {
				value = e;
			} else if (e) {
				value = Number.parseFloat(e);
			}
			this.numberhange_handler(type, value, supportPercent);
		}));
		this.compMap[type] = input;
	}

	private initAttributeStyle(attribute: AttributeItemGroup): void {
		attribute.labelWidth = 60;
		addClass(attribute.getItemElement(), 'property-attribute-item');
	}

	private getEditingPath(): EditingPath {
		const animation = this.animationService.animation;
		const item = animation && animation.getSelectedItem();
		if (item && item.target === animation.getSelectedNode()) {
			const path = item.findEditingPath(animation.getTime());
			if (path) {
				return path;
			}
		}
		return null;
	}

	private numberhange_handler(type: PropertyTypes, value: number | string, supportPercent: boolean): void {
		const editingPath = this.getEditingPath();
		if (!editingPath) {
			return;
		}
		if (!this.model) {
			return;
		}
		if (supportPercent) {
			let prop = '';
			if (type == PropertyTypes.WIDTH) {
				prop = 'percentWidth';
			} else if (type == PropertyTypes.HEIGHT) {
				prop = 'percentHeight';
			}
			value = Number.parseFloat(value as string);
			editingPath.path.setProperty(prop, value);
		} else {
			editingPath.path.setProperty(type, value as number);
		}
		this.refreshPaths();
	}

	private refreshPaths(): void {
		const animation = this.animationService.animation;
		const item = animation && animation.getSelectedItem();
		if (item) {
			item.refreshPaths();
		}
	}
}