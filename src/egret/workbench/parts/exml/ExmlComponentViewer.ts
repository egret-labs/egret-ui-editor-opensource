/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ITree, IRenderer, IDataSource, IFilter, IController, IDragAndDrop, IDragOverReaction } from 'vs/base/parts/tree/browser/tree';
import * as DOM from 'vs/base/browser/dom';
import { INode } from '../../../exts/exml-exts/exml/common/exml/treeNodes';
import 'egret/workbench/parts/layers/media/euiComponent.css';
import { IHost } from '../../../exts/exml-exts/exml/common/project/exmlConfigs';
import { DefaultController, ClickBehavior, OpenMode } from 'vs/base/parts/tree/browser/treeDefaults';
import { Tree } from 'vs/base/parts/tree/browser/treeImpl';
import { IMouseEvent } from 'vs/base/browser/mouseEvent';
import 'vs/base/parts/tree/browser/tree.less';

/**
 * Exml 数据
 * @class ExmlStat
 */
export class ExmlStat {
	/**
	 * 唯一id标识
	 */
	public id: string;

	/**
	 * 文件的子节点列表
	 */
	public children: ExmlStat[];
	/**
	 * 父级文件节点
	 */
	public parent: ExmlStat;

	/**
	 * 当前节点数据
	 */
	public data: IHost;

}
/**
 * 数据
 */
export interface DomLayerTreeTemplateData {

	//容器
	container: HTMLElement;

	//根
	root: HTMLElement;
}

/**
 * 数据
 */
export interface LayerActionContext {
	// 层数据
	element: INode;

	//根
	root: HTMLElement;
}

/**
 * 层 树渲染
 */
export class ExmlComponentRenderer implements IRenderer {

	disposeTemplate(tree: ITree, templateId: string, templateData: {container: HTMLElement; root: HTMLElement;}): void {
		templateData.root.textContent = '';
		templateData.root.title = '';
	}

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
		return 'ExmlComponentRenderer';
	}

	/**
	 * 渲染模版
	 * @param tree 
	 * @param templateId 
	 * @param container 
	 */
	public renderTemplate(tree: ITree, templateId: string, container: HTMLElement): DomLayerTreeTemplateData {
		const span = DOM.append(container, DOM.$('span'));
		DOM.addClass(span, 'iconSpan');

		const rootBuilder = DOM.append(container, DOM.$('div'));
		rootBuilder.style.marginLeft = '-15px';

		return {
			container: container,
			root: rootBuilder,
		};
	}

	/**
	 * 渲染 一条数据
	 * @param tree 
	 * @param element 
	 * @param templateId 
	 * @param templateData 
	 */
	public renderElement(tree: ITree, element: IHost, templateId: string, templateData: DomLayerTreeTemplateData): void {
		//render
		const elementName = element.id;
		let text = elementName;
		if (element.module) {
			text += ' - ' + element.module;
		}

		DOM.addClass(templateData.root, 'layerPanelSpanItem');
		DOM.addClass(templateData.root, 'componentPanelSpanItem');
		DOM.addClass(templateData.root, 'classIcon');
		templateData.root.textContent = text;
		templateData.root.title = text;
	}
}



/**
 * 资源面板数据源
 */
export class ExmlComponentDataSource implements IDataSource {

	constructor() {
	}
	/**
	 * 得到给定元素的唯一id标识。
	 * @param tree 
	 * @param element 
	 */
	public getId(tree: ITree, stat: any): string {
		return stat.id;
	}
	/**
	 * 返回此元素是否具有子项
	 * @param tree 
	 * @param element 
	 */
	public hasChildren(tree: ITree, stat: ExmlStat): boolean {
		return stat.children ? true : false;
	}
	/**
	 * 异步返回元素的子项
	 * @param tree 
	 * @param element 
	 */
	public getChildren(tree: ITree, stat: ExmlStat): Promise<any[]> {
		return Promise.resolve(stat.children.length !== 0 ? stat.children : []);
	}
	/**
	 * 异步返回一个元素的父级
	 * @param tree 
	 * @param element 
	 */
	public getParent(tree: ITree, stat: ExmlStat): Promise<any> {

		return Promise.resolve(stat.parent);
	}
}


/**
 * 文件过滤
 */
export class ExmlComponentTreeFilter implements IFilter {

	/**过滤文本 */
	public filterText = '';

	constructor() {

	}

	isVisible(tree: ITree, element: ExmlStat): boolean {
		if (this.filterText === '') {
			return true;
		}
		else {
			const elementName = element.id;
			const text = elementName;

			if (text.toUpperCase().indexOf(this.filterText.toUpperCase()) !== -1) {
				return true;
			}
			else {
				return false;
			}
		}

	}
}



/**
 * 处理用户交互
 */
export class ExmlComponentController extends DefaultController implements IController {

	private doubleClickCallback: Function;
	private clickCallback: Function;
	constructor(dcb: Function, ck: Function) {
		super({ clickBehavior: ClickBehavior.ON_MOUSE_UP, keyboardSupport: true, openMode: OpenMode.SINGLE_CLICK });
		this.doubleClickCallback = dcb;
		this.clickCallback = ck;
	}

	/**
	 * 点击
	 *
	 * @param {Tree} tree
	 * @param {ExmlStat} stat
	 * @param {IMouseEvent} event
	 * @param {string} [origin='mouse']
	 * @returns {boolean}
	 * @memberof ExmlComponentController
	 */
	public onLeftClick(tree: Tree, stat: ExmlStat, event: IMouseEvent, origin: string = 'mouse'): boolean {
		const payload = { origin: origin };

		const isDoubleClick = (origin === 'mouse' && event.detail === 2);
		tree.setFocus(stat, payload);
		tree.setSelection([stat], payload);

		if (isDoubleClick) {
			this.doubleClickCallback(stat);
			event.preventDefault();
		} else {
			this.clickCallback(stat);
		}

		return true;
	}

}



/**
 * 点击拖动
 *
 * @class ExmlComponentDragAndDrop
 * @implements {IDragAndDrop}
 */
export class ExmlComponentDragAndDrop implements IDragAndDrop {
	getDragURI(tree: ITree, element: any): string {
		return element.id;
	}
	getDragLabel?(tree: ITree, elements: any[]): string {
		return '';
	}

	onDragStart(tree: ITree, data: any, originalEvent: any) {

	}

	onDragOver(tree: ITree, data: any, targetElement: INode, originalEvent: any): IDragOverReaction {

		return null;
	}

	drop(tree: ITree, data: any, targetElement: INode, originalEvent: any) {

	}

}