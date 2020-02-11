/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ITree, IRenderer } from 'vs/base/parts/tree/browser/tree';
import * as DOM from 'vs/base/browser/dom';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { IDisposable } from 'vs/base/common/lifecycle';
import { IconButton } from 'egret/base/browser/ui/buttons';
import { removeClass, hasClass, addClass } from 'egret/base/common/dom';

import 'egret/workbench/parts/components/electron-browser/views/media/euiComponent.css';
import 'egret/workbench/parts/layers/media/euiComponent.css';
/**
 * 数据
 */
export interface DomLayerTreeTemplateData {

	//容器
	container: HTMLElement;

	//根
	root: HTMLElement;

	//action 条
	optionItem: OptionItem;
}

/**
 * 数据
 */
export interface LayerOptionContext {
	// 层数据
	element: INode;

	//action 条
	optionItem: OptionItem;

	//根
	root: HTMLElement;
}

/**
 * 层 树渲染
 */
export class LayerTreeRenderer implements IRenderer {

	constructor() {
	}

	/**
	 * 宽
	 * @param tree 
	 * @param element 
	 */
	public getHeight(tree: ITree, element: INode): number {
		return 22;
	}

	/**
	 * 模版id
	 * @param tree 
	 * @param element 
	 */
	public getTemplateId(tree: ITree, element: INode): string {
		return '';
	}

	/**
	 * 渲染模版
	 * @param tree 
	 * @param templateId 
	 * @param container 
	 */
	public renderTemplate(tree: ITree, templateId: string, container: HTMLElement): DomLayerTreeTemplateData {
		DOM.addClass(container, 'layerItemContainer');
		const span = DOM.append(container, DOM.$('span'));
		span.id = 'mask';
		DOM.addClass(span, 'layerItemMask');
		DOM.addClass(span, 'iconSpan');

		const rootBuilder = DOM.append(container, DOM.$('div'));
		const optionItem = this.initOptionItem(container, tree);
		return {
			container: container,
			root: rootBuilder,
			optionItem
		};
	}

	/**
	 * 渲染 一条数据
	 * @param tree 
	 * @param element 
	 * @param templateId 
	 * @param templateData 
	 */
	public renderElement(tree: ITree, element: INode, templateId: string, templateData: DomLayerTreeTemplateData): void {
		//clean
		templateData.root.className = '';
		//render
		const elementName = element.getName();
		let text = elementName;
		if (element.getId()) {
			text += ' - ' + element.getId();
		}

		DOM.addClass(templateData.root, 'layerPanelSpanItem');
		DOM.addClass(templateData.root, 'componentPanelSpanItem');
		DOM.addClass(templateData.root, 'iconFallBack');
		DOM.addClass(templateData.root, elementName);
		templateData.root.textContent = text;
		templateData.root.title = text;

		//
		let visible = false;
		const visibleProp = element.getProperty('visible');
		if (!visibleProp) {
			visible = true;
		}
		else {
			visible = visibleProp.getInstance();
		}

		this.refreshInvisible(visible, templateData.root);
		templateData.optionItem.context = { element: element, optionItem: templateData.optionItem, root: templateData.container };
		this.renderOptions(templateData.optionItem, element);
	}

	disposeTemplate(tree: ITree, templateId: string, templateData: DomLayerTreeTemplateData): void {
		templateData.optionItem.dispose();
	}

	private initOptionItem(container: HTMLElement, tree: ITree): OptionItem {
		const optionItem: OptionItem = new OptionItem();
		optionItem.tree = tree;

		const visibleIcon: IconButton = new IconButton(container);
		visibleIcon.iconClass = 'visibleAction';
		visibleIcon.cancelBubble = true;
		optionItem.pushIcon(visibleIcon);

		const blockIcon: IconButton = new IconButton(container);
		blockIcon.cancelBubble = true;
		blockIcon.iconClass = 'layerBlockAction unblock';
		optionItem.pushIcon(blockIcon);

		return optionItem;
	}

	private blockActionEvent(tree: ITree, context: LayerOptionContext): Promise<any> {
		if (!context) {
			return null;
		}
		const node = context.element;
		node.setLocked(!node.getLocked());
		const blockIcon = context.optionItem.iconBtns[1] as IconButton;

		const locked = node.getLocked();
		if (locked) {
			tree.collapse(context.element);
			blockIcon.iconClass = 'layerBlockAction';
		}
		else {
			blockIcon.iconClass = 'layerBlockAction unblock';
		}

		const rootContainer = context.root;
		if (locked) {
			const selections = <INode[]>tree.getSelection();
			const newSelections: INode[] = [];
			selections.forEach(eachElement => {
				if (!eachElement.getLocked()) {
					newSelections.push(eachElement);
				}
			});
			tree.setSelection(newSelections);

			if (!DOM.hasClass(rootContainer, 'locked')) {
				DOM.addClass(rootContainer, 'locked');
			}
		}
		else {
			if (DOM.hasClass(rootContainer, 'locked')) {
				DOM.removeClass(rootContainer, 'locked');
			}
		}

		return Promise.resolve(null);
	}

	private visibleActionEvent(tree: ITree, context: LayerOptionContext): Promise<any> {

		if (!context) {
			return null;
		}

		const node = context.element;

		const visibleIcon: IconButton = context.optionItem.iconBtns[0];
		//
		const locked = node.getLocked();
		let visible = false;
		const visibleProp = node.getProperty('visible');
		if (!visibleProp) {
			visible = true;
		}
		else {
			visible = visibleProp.getInstance();
			visibleProp.setInstance(!visible);
		}

		visible = !visible;

		if (visible) {
			removeClass(visibleIcon.getElement(), 'invisible');
			visibleIcon.iconClass = 'visibleAction';
			node.setProperty('visible', visibleProp);
		}
		else {
			visibleIcon.iconClass = 'visibleAction invisible';
			node.setBoolean('visible', visible);
		}

		this.refreshShouldShow(locked, context.root);
		const rootContainer = context.root;
		this.refreshInvisible(visible, rootContainer);

		return Promise.resolve(null);
	}

	private refreshInvisible(visible: boolean, rootContainer: HTMLElement): void {
		if (!visible) {
			if (!DOM.hasClass(rootContainer, 'invisible')) {
				DOM.addClass(rootContainer, 'invisible');
			}
		}
		else {
			if (DOM.hasClass(rootContainer, 'invisible')) {
				DOM.removeClass(rootContainer, 'invisible');
			}
		}
	}


	private renderOptions(optionItem: OptionItem, element: INode) {

		const node = element;
		//更新block action的样式
		const blockIcon: IconButton = optionItem.iconBtns[1];

		optionItem.disposeBtn();
		optionItem.btnDisposes.push(blockIcon.onClick(() => this.blockActionEvent(optionItem.tree, optionItem.context)));

		const locked = node.getLocked();
		if (locked) {
			blockIcon.iconClass = 'layerBlockAction';
		} else {
			blockIcon.iconClass = 'layerBlockAction unblock';
		}

		const visibleIcon: IconButton = optionItem.iconBtns[0];

		optionItem.btnDisposes.push(visibleIcon.onClick(() => this.visibleActionEvent(optionItem.tree, optionItem.context)));
		let visible = false;
		const visibleProp = node.getProperty('visible');
		if (!visibleProp) {
			visible = true;
		} else {
			visible = visibleProp.getInstance();
		}
		if (visible) {
			visibleIcon.iconClass = 'visibleAction';
		} else {
			visibleIcon.iconClass = 'visibleAction invisible';
		}

		const mouseOver = () => {
			blockIcon.getElement().style.visibility = 'visible';
			visibleIcon.getElement().style.visibility = 'visible';
		};

		const mouseOut = () => {
			if (element.getLocked()) {
				blockIcon.getElement().style.visibility = 'visible';
			} else {
				blockIcon.getElement().style.visibility = 'hidden';
			}
			visibleIcon.getElement().style.visibility = 'hidden';
		};

		mouseOut();
		optionItem.disposeEvent();
		optionItem.addEvent([{ key: 'mouseover', fun: mouseOver }, { key: 'mouseout', fun: mouseOut }]);
		this.refreshShouldShow(locked, optionItem.context.root);
	}


	private refreshShouldShow(locked: boolean, root: HTMLElement) {
		if (locked) {
			if (!hasClass(root, 'shouldShow')) {
				addClass(root, 'shouldShow');
			}
		} else {
			if (hasClass(root, 'shouldShow')) {
				removeClass(root, 'shouldShow');
			}
		}
	}
}



// option 容器 承载
class OptionItem {

	private _icons: Array<IconButton>;

	public tree: ITree;

	constructor() {
		this._dispose = [];
	}

	public btnDisposes: Array<IDisposable> = [];

	/**
	 * 清空按钮事件
	 */
	public disposeBtn() {
		this.btnDisposes.forEach(v => v.dispose());
		this.btnDisposes = [];
	}

	/**
	 * 按钮集合
	 */
	public get iconBtns(): Array<IconButton> {
		return this._icons;
	}

	private _context: LayerOptionContext;

	/**
	 * 上下文对象
	 */
	public set context(_context: LayerOptionContext) {
		this._context = _context;
	}

	public get context(): LayerOptionContext {
		return this._context;
	}


	private _events: Array<{ key: string, fun: () => void }>;

	/**
	 * 添加注册事件
	 * @param _events 
	 */
	public addEvent(_events: Array<{ key: string, fun: () => void }>): void {
		this._events = _events || [];
		if (this._context) {
			this._events.forEach(v => {
				this.context.root.addEventListener(v.key, v.fun);
			});
		}
	}

	/**
	 * 添加按钮
	 * @param _iconButton 
	 */
	public pushIcon(_iconButton: IconButton): IconButton {
		if (this._icons) {
			this._icons.push(_iconButton);
		} else {
			this._icons = [_iconButton];
		}

		return _iconButton;
	}

	private _dispose: Array<IDisposable>;

	/**
	 * 清理事件
	 */
	public disposeEvent() {
		if (this._events && this.context.root) {
			this._events.forEach(v => {
				this.context.root.removeEventListener(v.key, v.fun);
			});
		}
	}

	/**
	 * 清理
	 */
	public dispose() {
		this.disposeEvent();
		this._events = [];

		this.disposeBtn();
		this.btnDisposes = [];

		this._dispose.forEach(v => v.dispose());
		this._dispose = [];
	}
}