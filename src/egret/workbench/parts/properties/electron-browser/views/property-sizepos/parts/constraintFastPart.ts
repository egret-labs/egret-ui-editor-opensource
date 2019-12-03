import { BasePart } from '../../parts/basePart';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { DivideLine } from 'egret/base/browser/ui/dividelines';
import { localize } from 'egret/base/localization/nls';
import { HGroup } from 'egret/base/browser/ui/containers';
import { addClass } from 'egret/base/common/dom';
import { IconButton } from 'egret/base/browser/ui/buttons';
import { IUIBase } from 'egret/base/browser/ui/common';
import { setTop, setBottom, setVerticalCenter, setY, setLeft, setRight, setHorizontalCenter, setX, setWidth, setHeight } from 'egret/workbench/parts/properties/common/sizepos';

import '../../media/propertyView.css';
import '../../media/propertyViewStyle.css';

enum PropertyTypes {
	LEFT = 'left',
	HORIZONTAL_CENTER = 'horizontalCenter',
	RIGHT = 'right',
	TOP = 'top',
	VERTICAL_CENTER = 'verticalCenter',
	BOTTOM = 'bottom',
	LEFT_AND_RIGHT = 'leftAndRight',
	TOP_AND_BOTTOM = 'topAndBottom',
	ALL = 'all'
}

/**
 * 快捷约束部分
 */
export class ConstraintFastPart extends BasePart {

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
	}

	/**
	 * 渲染
	 * @param el 
	 */
	protected render(container: HTMLElement): void {
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.padding = '4px 0 4px 0';

		const line = new DivideLine(container);
		line.text = localize('property.sizepos.title.fastConstrain', 'Fast Constrain');
		line.style.marginBottom = '6px';

		this.compMap = {};

		const hGroup = new HGroup(container);
		addClass(hGroup.getElement(), 'property-attribute-item');
		hGroup.style.flexWrap = 'wrap';

		this.createIconButton(PropertyTypes.LEFT, 'layout_left', hGroup);
		this.createIconButton(PropertyTypes.HORIZONTAL_CENTER, 'layout_hcenter', hGroup);
		this.createIconButton(PropertyTypes.RIGHT, 'layout_right', hGroup);
		this.createIconButton(PropertyTypes.TOP, 'layout_top', hGroup);
		this.createIconButton(PropertyTypes.VERTICAL_CENTER, 'layout_vcenter', hGroup);
		this.createIconButton(PropertyTypes.BOTTOM, 'layout_bottom', hGroup);
		this.createIconButton(PropertyTypes.LEFT_AND_RIGHT, 'layout_leftandright', hGroup);
		this.createIconButton(PropertyTypes.TOP_AND_BOTTOM, 'layout_topandbottom', hGroup);
		this.createIconButton(PropertyTypes.ALL, 'layout_all', hGroup);
	}

	private compMap: { [type: string]: IconButton } = {};
	private createIconButton(type: PropertyTypes, icon: string, container: IUIBase): void {
		const iconButton = new IconButton(container);
		iconButton.iconClass = icon;
		iconButton.style.marginRight = '4px';
		this.toDisposes.push(iconButton.onClick(t => {
			this.iconClick_handler(type);
		}));
		this.compMap[type] = iconButton;
	}

	private iconClick_handler(type: PropertyTypes): void {
		if (!this.currentNodes) {
			return;
		}
		if (!this.model) {
			return;
		}
		this.setConstraint(type);
	}

	private setConstraint(constraint: PropertyTypes): void {
		if (
			constraint == PropertyTypes.TOP ||
			constraint == PropertyTypes.BOTTOM ||
			constraint == PropertyTypes.VERTICAL_CENTER
		) {
			setTop(this.currentNodes, NaN, this.model);
			setBottom(this.currentNodes, NaN, this.model);
			setVerticalCenter(this.currentNodes, NaN, this.model);
			setY(this.currentNodes, NaN, this.model);
			if (constraint == PropertyTypes.TOP) {
				setTop(this.currentNodes, 0, this.model);
			} else if (constraint == PropertyTypes.BOTTOM) {
				setBottom(this.currentNodes, 0, this.model);
			} else if (constraint == PropertyTypes.VERTICAL_CENTER) {
				setVerticalCenter(this.currentNodes, 0, this.model);
			} else {
				this.currentNodes.forEach((node: INode) => {
					if (node.getInstance() !== null) {
						node.setInstanceValue('y', 0);
					}
				});
			}
		} else if (
			constraint == PropertyTypes.LEFT ||
			constraint == PropertyTypes.RIGHT ||
			constraint == PropertyTypes.HORIZONTAL_CENTER
		) {
			setLeft(this.currentNodes, NaN, this.model);
			setRight(this.currentNodes, NaN, this.model);
			setHorizontalCenter(this.currentNodes, NaN, this.model);
			setX(this.currentNodes, NaN, this.model);
			if (constraint == PropertyTypes.LEFT) {
				setLeft(this.currentNodes, 0, this.model);
			} else if (constraint == PropertyTypes.RIGHT) {
				setRight(this.currentNodes, 0, this.model);
			} else if (constraint == PropertyTypes.HORIZONTAL_CENTER) {
				setHorizontalCenter(this.currentNodes, 0, this.model);
			} else {
				this.currentNodes.forEach((node: INode) => {
					if (node.getInstance() !== null) {
						node.setInstanceValue('x', 0);
					}
				});
			}
		} else if (constraint == PropertyTypes.LEFT_AND_RIGHT) {
			setX(this.currentNodes, NaN, this.model);
			setWidth(this.currentNodes, NaN, this.model);
			setHorizontalCenter(this.currentNodes, NaN, this.model);
			setLeft(this.currentNodes, 0, this.model);
			setRight(this.currentNodes, 0, this.model);
		} else if (constraint == PropertyTypes.TOP_AND_BOTTOM) {
			setY(this.currentNodes, NaN, this.model);
			setHeight(this.currentNodes, NaN, this.model);
			setVerticalCenter(this.currentNodes, NaN, this.model);
			setTop(this.currentNodes, 0, this.model);
			setBottom(this.currentNodes, 0, this.model);
		} else if (constraint == PropertyTypes.ALL) {
			setX(this.currentNodes, NaN, this.model);
			setWidth(this.currentNodes, NaN, this.model);
			setHorizontalCenter(this.currentNodes, NaN, this.model);
			setLeft(this.currentNodes, 0, this.model);
			setRight(this.currentNodes, 0, this.model);
			setY(this.currentNodes, NaN, this.model);
			setHeight(this.currentNodes, NaN, this.model);
			setVerticalCenter(this.currentNodes, NaN, this.model);
			setTop(this.currentNodes, 0, this.model);
			setBottom(this.currentNodes, 0, this.model);
		}
	}
}