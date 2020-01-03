import { BasePart } from '../../parts/basePart';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { HGroup, AttributeItemGroup } from 'egret/base/browser/ui/containers';
import { localize } from 'egret/base/localization/nls';
import { addClass } from 'egret/base/common/dom';
import { IUIBase } from 'egret/base/browser/ui/common';
import { IAnimationService } from 'egret/workbench/parts/animation/common/animation';
import { EditingPath } from 'egret/exts/exml-exts/exml/common/plugin/IAnimationModel';
import { DivideLine } from 'egret/base/browser/ui/dividelines';
import { ComboBox } from 'egret/base/browser/ui/comboboxs';
import { IDropDownTextDataSource } from 'egret/base/browser/ui/dropdowns';

const eases1 = [
	'Quad',
	'Cubic',
	'Quart',
	'Quint',
	'Sine',
	'Back',
	'Circ',
	'Bounce',
	'Elastic'
];

const eases2 = [
	'In',
	'Out',
	'InOut'
];

export class TweenPart extends BasePart {
	private currentEase: string[];
	/**
	 *
	 */
	constructor(container: HTMLElement | IUIBase = null,
		@IAnimationService private animationService: IAnimationService) {
		super(container);
		this.currentEase = [];
		this.initDataSource();
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

		const tagName = editingPath.path.instance.getName();
		if (tagName !== 'To') {
			this.hide();
			return;
		}
		const easeNode = editingPath.path.instance.getProperty('ease');
		const easeValue: string = easeNode ? easeNode.getInstance() : null;
		this.currentEase = easeValue ? easeValue.match(/(^[a-z]*)(.*)/).slice(1) : [];

		const ease1 = this.currentEase.length > 0 ? this.convert2UpperCase(this.currentEase[0]) : null;
		const ease2 = this.currentEase.length > 1 ? this.currentEase[1] : null;
		this.ease1Combobox.setSelection(ease1);
		this.ease2Combobox.setSelection(ease2);
		this.show();
	}

	private convert2UpperCase(value: string): string {
		return value.charAt(0).toUpperCase() + value.slice(1);
	}

	private easesGroup = new HGroup();
	private ease1Combobox = new ComboBox();
	private ease2Combobox = new ComboBox();
	/**
	 * 渲染
	 * @param el 
	 */
	protected render(container: HTMLElement): void {
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.padding = '4px 0 4px 0';

		const line = new DivideLine(container);
		line.text = localize('property.frame.title.interpolation', 'Interpolation');
		line.style.marginBottom = '6px';

		this.easesGroup.create(container);
		this.easesGroup.style.flexWrap = 'wrap';

		const attribute = new AttributeItemGroup(container);
		this.initAttributeStyle(attribute);
		attribute.style.marginRight = '6px';
		attribute.label = localize('property.frame.tweenFunction', 'Ease:');
		attribute.labelWidth = 60;
		this.ease1Combobox.create(attribute);
		this.toDisposes.push(this.ease1Combobox.onSelectChanged(t => this.ease1Changed_handler(t.getSelection())));

		this.ease2Combobox.create(attribute);
		this.ease2Combobox.getElement().style.marginLeft = '6px';
		this.toDisposes.push(this.ease2Combobox.onSelectChanged(t => this.ease2Changed_handler(t.getSelection())));
	}

	private initAttributeStyle(attribute: AttributeItemGroup): void {
		attribute.labelWidth = 60;
		addClass(attribute.getItemElement(), 'property-attribute-item');
		addClass(attribute.getElement(), 'property-animation-ease');
	}

	private initDataSource(): void {
		const ease1Source: IDropDownTextDataSource[] = [];
		for (var i = 0; i < eases1.length; i++) {
			ease1Source.push({ id: eases1[i], data: eases1[i] });
		}
		this.ease1Combobox.setDatas(ease1Source);

		const ease2Source: IDropDownTextDataSource[] = [];
		for (var i = 0; i < eases2.length; i++) {
			ease2Source.push({ id: eases2[i], data: eases2[i] });
		}
		this.ease2Combobox.setDatas(ease2Source);
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

	private ease1Changed_handler(value: IDropDownTextDataSource): void {
		const editingPath = this.getEditingPath();
		if (!editingPath) {
			return;
		}
		if (value) {
			this.currentEase = [value.id.toLowerCase(), 'In'];
		} else {
			this.currentEase = [];
		}
		this.applyEase();
	}

	private ease2Changed_handler(value: IDropDownTextDataSource): void {
		const editingPath = this.getEditingPath();
		if (!editingPath) {
			return;
		}
		if (value) {
			if (this.currentEase.length > 1) {
				this.currentEase[1] = value.id;
			} else {
				this.currentEase = ['sine', value.id];
			}
		} else {
			this.currentEase = [];
		}
		this.applyEase();
	}

	private applyEase(): void {
		const editingPath = this.getEditingPath();
		if (!editingPath) {
			return;
		}
		const ease = this.currentEase.join('');
		if (ease) {
			editingPath.path.instance.setString('ease', ease);
		} else {
			editingPath.path.instance.setString('ease', null);
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