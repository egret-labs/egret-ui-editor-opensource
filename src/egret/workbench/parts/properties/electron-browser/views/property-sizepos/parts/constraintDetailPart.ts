import { BasePart } from '../../parts/basePart';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { DivideLine } from 'egret/base/browser/ui/dividelines';
import { localize } from 'egret/base/localization/nls';
import { addClass, removeClass } from 'egret/base/common/dom';
import { NumberInput } from 'egret/base/browser/ui/inputs';

import '../../media/propertyView.css';
import '../../media/propertyViewStyle.css';
import '../../media/constraint.css';
import { UserValue, DefaultValue, getSameKeyValue, getProperty, setPropertyNum, setPropertyNumPro, setPropertyStr } from 'egret/workbench/parts/properties/common/properties';
import { isNumber } from 'egret/base/common/types';


enum PositionType {
	LEFT = 'left',
	HORIZONTAL_CENTER = 'horizontalCenter',
	RIGHT = 'right',
	TOP = 'top',
	VERTICAL_CENTER = 'verticalCenter',
	BOTTOM = 'bottom'
}

class ConstraintPanel {
	private root: HTMLElement;
	constructor() {
		this.root = document.createElement('div');
		addClass(this.root, 'constraint-panel');
	}

	public getElement(): HTMLElement {
		return this.root;
	}

	public render(owner: HTMLElement): void {
		owner.appendChild(this.root);
		const titleBar = document.createElement('div');
		addClass(titleBar, 'title-bar');
		this.root.appendChild(titleBar);
	}
}

class ConstraintImage {

	public onCheckBoxChanged: (type: PositionType, checked: boolean) => void = null;
	public onValueChanging: (type: PositionType, value: number | string) => void = null;
	public onValueChanged: (type: PositionType, value: number | string) => void = null;

	constructor() {
		this.root = document.createElement('div');
		addClass(this.root, 'constraint-root');
	}

	private validateValue(value: number | string): boolean {
		if (value == null) {
			return false;
		}
		if (isNumber(value) && !isNaN(value)) {
			return true;
		} else if (typeof value == 'string') {
			if (!value) {
				return false;
			}
			return true;
		}
		return false;
	}

	public setValue(type: PositionType, value: number | string, prompt: string): void {
		if (this.validateValue(value) || prompt) {
			this.selectType(type, false);
		} else {
			this.unSelectedType(type, false);
		}

		if (this.validateValue(value)) {
			if (isNumber(value)) {
				this.getNumberInput(type).text = value.toString(10);
			} else {
				this.getNumberInput(type).text = value;
			}
		} else {
			this.getNumberInput(type).text = '';
		}

		if (prompt) {
			this.getNumberInput(type).prompt = prompt;
		} else {
			this.getNumberInput(type).prompt = '';
		}

	}

	private root: HTMLElement;
	private panelContainer: HTMLElement;
	private panel: ConstraintPanel;

	public render(owner: HTMLElement): void {
		owner.appendChild(this.root);
		this.panelContainer = document.createElement('div');
		this.root.appendChild(this.panelContainer);
		addClass(this.panelContainer, 'panel-container');

		const subContainer = document.createElement('div');
		this.panelContainer.appendChild(subContainer);
		addClass(subContainer, 'sub-container');

		const topContainer = document.createElement('div');
		const leftContainer = document.createElement('div');
		const rightContainer = document.createElement('div');
		const bottomContainer = document.createElement('div');
		addClass(topContainer, 'comps-container top');
		addClass(leftContainer, 'comps-container left');
		addClass(rightContainer, 'comps-container right');
		addClass(bottomContainer, 'comps-container bottom');

		this.root.appendChild(topContainer);
		this.root.appendChild(leftContainer);
		this.root.appendChild(rightContainer);
		this.root.appendChild(bottomContainer);

		this.createCheckBox(PositionType.LEFT, topContainer);
		this.createCheckBox(PositionType.HORIZONTAL_CENTER, topContainer);
		this.createCheckBox(PositionType.RIGHT, topContainer);

		this.createCheckBox(PositionType.TOP, leftContainer);
		this.createCheckBox(PositionType.VERTICAL_CENTER, leftContainer);
		this.createCheckBox(PositionType.BOTTOM, leftContainer);

		this.createNumberInput(PositionType.LEFT, bottomContainer);
		this.createNumberInput(PositionType.HORIZONTAL_CENTER, bottomContainer);
		this.createNumberInput(PositionType.RIGHT, bottomContainer);

		this.createNumberInput(PositionType.TOP, rightContainer);
		this.createNumberInput(PositionType.VERTICAL_CENTER, rightContainer);
		this.createNumberInput(PositionType.BOTTOM, rightContainer);

		this.panel = new ConstraintPanel();
		this.panel.render(subContainer);

		this.createLine(PositionType.LEFT, this.panelContainer);
		this.createLine(PositionType.HORIZONTAL_CENTER, this.panelContainer);
		this.createLine(PositionType.RIGHT, this.panelContainer);

		this.createLine(PositionType.TOP, this.panelContainer);
		this.createLine(PositionType.VERTICAL_CENTER, this.panelContainer);
		this.createLine(PositionType.BOTTOM, this.panelContainer);
	}

	private checkBoxMap: { [type: string]: HTMLInputElement } = {};
	private createCheckBox(type: PositionType, owner: HTMLElement): void {
		const checkBox = document.createElement('input');
		checkBox.type = 'checkbox';
		checkBox.addEventListener('change', e => {
			this.checkBoxChanged_handler(type);
		});
		addClass(checkBox, 'checkbox');
		owner.appendChild(checkBox);
		this.checkBoxMap[type] = checkBox;
	}
	private getCheckBox(type: PositionType): HTMLInputElement {
		return this.checkBoxMap[type];
	}

	private numberInputMap: { [type: string]: NumberInput } = {};
	private createNumberInput(type: PositionType, owner: HTMLElement): void {
		const numberInput = new NumberInput(owner);
		numberInput.regulateStep = 1;
		addClass(numberInput.getElement(), 'numberInput');
		this.numberInputMap[type] = numberInput;
		numberInput.onValueChanging((value) => {
			if (this.onValueChanging) {
				if (value.indexOf('%') != -1) {
					this.onValueChanging(type, value ? value : null);
				} else {
					this.onValueChanging(type, value ? Number.parseFloat(value) : null);
				}
			}
		});
		numberInput.onValueChanged((value) => {
			if (this.onValueChanged) {
				if (value.indexOf('%') != -1) {
					this.onValueChanged(type, value ? value : null);
				} else {
					this.onValueChanged(type, value ? Number.parseFloat(value) : null);
				}
			}
		});
	}
	private getNumberInput(type: PositionType): NumberInput {
		return this.numberInputMap[type];
	}

	private lineDisplayMap: { [type: string]: HTMLElement } = {};
	private createLine(type: PositionType, owner: HTMLElement): void {
		const line = document.createElement('div');
		addClass(line, 'line');
		addClass(line, type);
		owner.appendChild(line);
		this.lineDisplayMap[type] = line;
	}
	private getLine(type: PositionType): HTMLElement {
		return this.lineDisplayMap[type];
	}

	private checkBoxChanged_handler(type: PositionType): void {
		const checkBox = this.getCheckBox(type);
		if (checkBox.checked) {
			this.selectType(type, true);
		} else {
			this.unSelectedType(type, true);
		}
	}

	private selectType(type: PositionType, fire: boolean): void {
		removeClass(this.getLine(type), 'hide');
		removeClass(this.getNumberInput(type).getElement(), 'hide');
		this.getCheckBox(type).checked = true;
		addClass(this.panel.getElement(), type);
		if (this.onCheckBoxChanged && fire) {
			this.onCheckBoxChanged(type, true);
		}
	}
	private unSelectedType(type: PositionType, fire: boolean): void {
		addClass(this.getLine(type), 'hide');
		addClass(this.getNumberInput(type).getElement(), 'hide');
		this.getCheckBox(type).checked = false;
		removeClass(this.panel.getElement(), type);
		if (this.onCheckBoxChanged && fire) {
			this.onCheckBoxChanged(type, false);
		}
	}
}


/**
 * 详细约束部分
 */
export class ConstraintDetailPart extends BasePart {

	private currentNodes: INode[] = null;
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
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			const className = this.model.getExmlConfig().getClassNameById(node.getName(), node.getNs());
			//Skin的getInstance()会被解析成Group，但是Skin不能设置布局
			if (className !== 'eui.Skin') {
				targetNodes.push(node);
			}
		}
		nodes = targetNodes;

		if (nodes.length == 0) {
			return;
		}
		this.show();
		this.currentNodes = nodes;

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
			if (value.user != null) {
				this.constraint.setValue(type as PositionType, value.user as number, '');
			} else if (value.default != null) {
				this.constraint.setValue(type as PositionType, null, value.default as string);
			} else {
				this.constraint.setValue(type as PositionType, null, '-');
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
		if (!this.model) {
			return result;
		}
		result[PositionType.LEFT] = getProperty(node, PositionType.LEFT);
		result[PositionType.HORIZONTAL_CENTER] = getProperty(node, PositionType.HORIZONTAL_CENTER);
		result[PositionType.RIGHT] = getProperty(node, PositionType.RIGHT);
		result[PositionType.TOP] = getProperty(node, PositionType.TOP);
		result[PositionType.VERTICAL_CENTER] = getProperty(node, PositionType.VERTICAL_CENTER);
		result[PositionType.BOTTOM] = getProperty(node, PositionType.BOTTOM);
		return result;
	}


	private constraint = new ConstraintImage();
	/**
	 * 渲染
	 * @param el 
	 */
	protected render(container: HTMLElement): void {
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.padding = '4px 0 4px 0';

		const line = new DivideLine(container);
		line.text = localize('property.sizepos.title.detailConstrain', 'Detail Constrain');
		line.style.marginBottom = '6px';

		const constraintContainer = document.createElement('div');
		constraintContainer.style.display = 'flex';
		constraintContainer.style.position = 'relative';
		constraintContainer.style.justifyContent = 'space-around';
		container.appendChild(constraintContainer);
		this.constraint.render(constraintContainer);
		this.constraint.onCheckBoxChanged = (t, c) => this.checkboxChanged_handler(t, c);
		this.constraint.onValueChanged = (t, v) => this.valueChanged_handler(t, v);
		this.constraint.onValueChanging = (t, v) => this.valueChanging_handler(t, v);
	}

	private checkboxChanged_handler(type: PositionType, checked: boolean): void {
		if (!this.model || !this.currentNodes) {
			return;
		}

		for (let i = 0; i < this.currentNodes.length; i++) {
			const node = this.currentNodes[i];
			const element = node.getInstance();
			if (!element || !element.parent) {
				continue;
			}
			const parentWidth = element.parent.width;
			const parentHeight = element.parent.height;

			const leftValue = node.getProperty('left');
			const rightValue = node.getProperty('right');
			const hCValue = node.getProperty('horizontalCenter');
			const topValue = node.getProperty('top');
			const bottomValue = node.getProperty('bottom');
			const vCValue = node.getProperty('verticalCenter');

			switch (type) {
				case PositionType.LEFT:
					if (checked) {
						const AABB = this.getAABB(element, element.parent);
						const value = AABB.x;
						node.setNumber('left', value);
						node.setProperty('x', null);
						if (rightValue) {
							node.setProperty('width', null);
						}
					} else {
						if (rightValue) {
							node.setSize('width', element.width);
						} else if (!hCValue) {
							node.setNumber('x', element.x);
						}
						node.setProperty('left', null);
					}
					break;
				case PositionType.HORIZONTAL_CENTER:
					if (checked) {
						const AABB = this.getAABB(element, element.parent);
						const value = AABB.x + AABB.w * 0.5 - parentWidth * 0.5;
						node.setNumber('horizontalCenter', value);
						node.setProperty('x', null);
					} else {
						if (!leftValue && !rightValue) {
							node.setNumber('x', element.x);
						}
						node.setProperty('horizontalCenter', null);
					}
					break;
				case PositionType.RIGHT:
					if (checked) {
						const AABB = this.getAABB(element, element.parent);
						const value = parentWidth - AABB.x - AABB.w;
						node.setProperty('x', null);
						node.setNumber('right', value);
						if (leftValue) {
							node.setProperty('width', null);
						}
					}
					else {
						if (leftValue) {
							node.setSize('width', element.width);
						} else if (!hCValue) {
							node.setNumber('x', element.x);
						}
						node.setProperty('right', null);
					}
					break;
				case PositionType.TOP:
					if (checked) {
						const AABB = this.getAABB(element, element.parent);
						const value = AABB.y;
						node.setNumber('top', value);
						node.setProperty('y', null);
						if (bottomValue) {
							node.setProperty('height', null);
						}
					} else {
						if (bottomValue) {
							node.setSize('height', element.height);
						} else if (!vCValue) {
							node.setNumber('y', element.y);
						}
						node.setProperty('top', null);
					}
					break;
				case PositionType.VERTICAL_CENTER:
					if (checked) {
						const AABB = this.getAABB(element, element.parent);
						const value = AABB.y + AABB.h * 0.5 - parentHeight * 0.5;
						node.setNumber('verticalCenter', value);
						node.setProperty('y', null);
					} else {
						if (!topValue && !bottomValue) {
							node.setNumber('y', element.y);
						}
						node.setProperty('verticalCenter', null);
					}
					break;
				case PositionType.BOTTOM:
					if (checked) {
						const AABB = this.getAABB(element, element.parent);
						const value = parentHeight - AABB.y - AABB.h;
						node.setProperty('y', null);
						node.setNumber('bottom', value);
						if (topValue) {
							node.setProperty('height', null);
						}
					} else {
						if (topValue) {
							node.setSize('height', element.height);
						} else if (!vCValue) {
							node.setNumber('y', element.y);
						}
						node.setProperty('bottom', null);
					}
					break;
			}
		}
	}

	private getAABB(target: egret.DisplayObject, host: egret.DisplayObject): { x: number, y: number, w: number, h: number } {
		let p1 = target.localToGlobal(0, 0);
		let p2 = target.localToGlobal(target.width, 0);
		let p3 = target.localToGlobal(target.width, target.height);
		let p4 = target.localToGlobal(0, target.height);
		p1 = host.globalToLocal(p1.x, p1.y);
		p2 = host.globalToLocal(p2.x, p2.y);
		p3 = host.globalToLocal(p3.x, p3.y);
		p4 = host.globalToLocal(p4.x, p4.y);

		let minx: number = p1.x;
		let maxx: number = p1.x;
		let miny: number = p1.y;
		let maxy: number = p1.y;
		[p2, p3, p4].forEach(element => {
			minx = Math.min(minx, element.x);
			maxx = Math.max(maxx, element.x);
			miny = Math.min(miny, element.y);
			maxy = Math.max(maxy, element.y);
		});
		const rect = { x: minx, y: miny, w: maxx - minx, h: maxy - miny };
		rect.x = Math.round(rect.x);
		rect.y = Math.round(rect.y);
		rect.w = Math.round(rect.w);
		rect.h = Math.round(rect.h);
		return rect;
	}

	private valueChanged_handler(type: PositionType, value: number | string): void {
		if (!this.model || !this.currentNodes) {
			return;
		}
		for (let i = 0; i < this.currentNodes.length; i++) {
			const node = this.currentNodes[i];
			if (isNumber(value)) {
				setPropertyNum(node, type, value);
			} else {
				setPropertyStr(node, type, value);
			}
		}
	}
	private valueChanging_handler(type: PositionType, value: number | string): void {
		if (!this.model || !this.currentNodes) {
			return;
		}
		for (let i = 0; i < this.currentNodes.length; i++) {
			const node = this.currentNodes[i];
			node.setInstanceValue(type, value);
		}
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		super.dispose();
		this.constraint.onCheckBoxChanged = null;
		this.constraint.onValueChanged = null;
		this.constraint.onValueChanging = null;
	}
}