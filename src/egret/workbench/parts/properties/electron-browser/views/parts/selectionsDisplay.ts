import { IUIBase, getTargetElement } from 'egret/base/browser/ui/common';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { localize } from 'egret/base/localization/nls';
import { addClass, removeClass } from 'egret/base/common/dom';

import 'egret/workbench/parts/base/media/eui-components/icons.css';
import '../media/selectionsDisplay.css';

/**
 * 选择显示控件
 */
export class SelectionDisplay implements IUIBase {

	private container: HTMLElement;
	private el: HTMLElement;

	constructor(container: HTMLElement | IUIBase = null) {
		this.el = document.createElement('div');
		if (container) {
			this.create(container);
		}
	}

	private _selectedNodes: INode[];
	/**
	 * 选择节点，设置将更新显示
	 */
	public get selectedNodes(): INode[] {
		return this._selectedNodes;
	}
	public set selectedNodes(value: INode[]) {
		this._selectedNodes = value;
		this.updateDisplay();
	}

	/**
	 * 核心dom对象
	 */
	public getElement(): HTMLElement {
		return null;
	}
	/**
	 * 创建
	 */
	public create(container: HTMLElement | IUIBase): void {
		this.container = getTargetElement(container);
		this.container.appendChild(this.el);
		this.initView();
	}

	private iconDisplay:HTMLElement;
	private labelDisplay:HTMLElement;
	/**
	 * 初始化内容
	 * @param element 
	 */
	protected initView(): void {
		this.iconDisplay = document.createElement('div');
		this.labelDisplay = document.createElement('span');

		this.el.appendChild(this.iconDisplay);
		this.el.appendChild(this.labelDisplay);

		addClass(this.el,'selections-display-container');

		this.updateDisplay();
	}

	private updateDisplay():void{
		if(this.selectedNodes && this.selectedNodes.length > 0){
			let icon = '';
			let label = '';
			if(this.selectedNodes.length == 1){
				const node = this.selectedNodes[0];
				icon = node.getName();
				label = 'e:' + icon;
			}else{
				label = localize('propertyView.numSelected','{0} items is Selected',this.selectedNodes.length);
			}
			this.iconDisplay.className = '';
			addClass(this.iconDisplay,'component-icon');
			addClass(this.iconDisplay,icon);
			this.labelDisplay.innerText = label;

			addClass(this.el,'visible');
		}else{
			removeClass(this.el,'visible');
		}
	}
}