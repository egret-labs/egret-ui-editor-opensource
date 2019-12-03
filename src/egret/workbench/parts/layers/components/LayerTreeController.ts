/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import Mouse = require('vs/base/browser/mouseEvent');
import Keyboard = require('vs/base/browser/keyboardEvent');
import platform = require('vs/base/common/platform');
import { ITree, IController, ContextMenuEvent } from 'vs/base/parts/tree/browser/tree';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { LayerPanelUtil } from 'egret/workbench/parts/layers/components/LayerPanelUtil';


/**
 * 树控制器
 */
export class DomLayerTreeController implements IController {

	
	constructor() {
		// @IContextMenuService private contextMenuService: IContextMenuService
	}
	onceClick: boolean = false;
	private intervalTag: any = -1;
	isAvailableClick(event: Mouse.IMouseEvent): boolean {
		return event['button'] == 0;
	}

	onClick(tree: ITree, element: INode, event: Mouse.IMouseEvent): boolean {
		if (element.getLocked()) {
			return;
		}
		const isMac = platform.isMacintosh;
		const isWindows = platform.isWindows;
		const selectionAction = ((isMac && event.metaKey) || (isWindows && event.ctrlKey));
		const focusElement: INode = tree.getFocus();
		const shiftAction = event.shiftKey && focusElement;
		if (selectionAction) {
			this.onSelectionClick(tree, element, event);
		}
		else if (shiftAction) {
			this.onShiftClick(tree, element, event);
		}
		else {
			this.onCommonClick(tree, element, event);
			if (this.isAvailableClick(event)) {
				const expandedElements: INode[] = tree.getExpandedElements();
				if (LayerPanelUtil.isContainer(element)) {
					if (expandedElements.indexOf(element) !== -1) {
						tree.collapse(element);
					}
					else {
						tree.expand(element);
					}
				}
			}
		}
		return true;
	}

	onShiftClick(tree: ITree, element: INode, event: Mouse.IMouseEvent) {
		const focusElement: INode = tree.getFocus();
		tree.getSelection().forEach((each: INode) => {
			each.setSelected(false);
		});
		tree.deselectAll(tree.getSelection());
		tree.selectRange(focusElement, element);
		tree.getSelection().forEach((each: INode) => {
			each.setSelected(true);
		});
		if (!focusElement.getSelected()) {
			tree.setFocus(null);
		}
		tree.selectRange(focusElement, element);
	}

	onSelectionClick(tree: ITree, element: INode, event: Mouse.IMouseEvent) {
		const selection: INode[] = tree.getSelection();
		const indexOfElement = selection.indexOf(element);
		if (indexOfElement !== -1) {
			selection.splice(indexOfElement, 1);
		}
		else {
			selection.push(element);
		}
		tree.setSelection(selection);
		const nodeList = LayerPanelUtil.getNodeListByANode(tree.getInput());
		nodeList.forEach(each => {
			if (each.getSelected()) {
				each.setSelected(false);
			}
		});
		selection.forEach(each => {
			each.setSelected(true);
		});
	}

	onCommonClick(tree: ITree, element: INode, event: Mouse.IMouseEvent) {
		const nodeList = LayerPanelUtil.getNodeListByANode(tree.getInput());
		nodeList.forEach(each => {
			each.setSelected(false);
		});
		element.setSelected(true);
		tree.setSelection([element]);
		//合并展开节点,如果点中的是三角区域的隐藏节点，则执行操作
		const targetElement = event.target as HTMLElement;
		if (targetElement && targetElement.id === 'mask') {
			const expandedElements: INode[] = tree.getExpandedElements();
			if (LayerPanelUtil.isContainer(element)) {
				if (expandedElements.indexOf(element) !== -1) {
					tree.collapse(element);
				}
				else {
					tree.expand(element);
				}
			}
		}

		tree.setFocus(element);
	}

	/**
	 * 拷贝节点
	 */
	public copySelectDefCallback: (element: INode[]) => void;

	onContextMenu(tree: ITree, element: INode, event: ContextMenuEvent): boolean {
		tree.setFocus(element);
		const selection = tree.getSelection();
		const items: any[] = [];
		selection.forEach((item) => {
			items.push(item);
		});
		if (items.indexOf(element) === -1) {
			items.push(element);
		}

		// TODO 暂时没有写右键操作 ，老版本wing 是拷贝引用
		return true;
	}

	onTap(tree: ITree, element: INode, event: any): boolean {
		return false;
	}

	onKeyDown(tree: ITree, event: Keyboard.IKeyboardEvent): boolean {
		return true;
	}

	onKeyUp(tree: ITree, event: Keyboard.IKeyboardEvent): boolean {
		return true;
	}

}