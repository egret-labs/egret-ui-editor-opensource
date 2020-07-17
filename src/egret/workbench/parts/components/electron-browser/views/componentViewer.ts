import { IDataSource, ITree, IRenderer, IController, IDragAndDrop, IDragOverReaction, ContextMenuEvent, IFilter, ISorter } from 'vs/base/parts/tree/browser/tree';
import { ComponentStat } from '../../common/componentModel';
import * as DOM from 'vs/base/browser/dom';
import { DefaultController, ClickBehavior, OpenMode } from 'vs/base/parts/tree/browser/treeDefaults';
import { IMouseEvent, DragMouseEvent } from 'vs/base/browser/mouseEvent';
import { Tree } from 'vs/base/parts/tree/browser/treeImpl';
import { addClass } from 'vs/base/browser/dom';
import { matchesFuzzy } from 'egret/base/common/filters';
import { IClipboardService } from 'egret/platform/clipboard/common/clipboardService';

import './media/euiComponent.css';
import 'egret/workbench/parts/base/media/eui-components/icons.css';
import { IDragAndDropData } from 'vs/base/browser/dnd';

/**
 * 组件数据源
 */
export class ComponentDataSource implements IDataSource {

	constructor(
	) {
	}
	/**
	 * 得到给定元素的唯一id标识。
	 * @param tree 
	 * @param element 
	 */
	public getId(tree: ITree, stat: ComponentStat): string {
		return stat.id;
	}

	/**
	 * 返回此元素是否具有子项
	 * @param tree 
	 * @param element 
	 */
	public hasChildren(tree: ITree, stat: ComponentStat): boolean {
		return stat instanceof ComponentStat && stat.isFolder;
	}

	/**
	 * 异步返回元素的子项
	 * @param tree 
	 * @param element 
	 */
	public getChildren(tree: ITree, stat: ComponentStat): Promise<ComponentStat[]> {
		return new Promise<ComponentStat[]>((resolve, reject) => {
			resolve(stat.children);
		});

	}
	/**
	 * 异步返回一个元素的父级
	 * @param tree 
	 * @param element 
	 */
	public getParent(tree: ITree, stat: ComponentStat): Promise<ComponentStat> {
		if (stat instanceof ComponentStat && stat.parent) {
			return Promise.resolve(stat.parent);
		}
		return Promise.resolve(null);
	}
}


/**
 * 组件模板数据接口
 */
export interface IComponentTemplateData {
	/**
	 * 容器
	 */
	container: HTMLElement;
	/**
	 * 箭头图标
	 */
	iconSpan: HTMLElement;
	/**
	 * 图片
	 */
	image: HTMLElement;
	/**
	 * 文本显示
	 */
	textSpan: HTMLElement;
}
/**
 * 组件项的渲染器
 */
export class ComponentRenderer implements IRenderer {

	private static readonly ITEM_HEIGHT = 22;
	private static readonly FILE_TEMPLATE_ID = 'Component';
	constructor() {
	}
	/**
	 * 返回一个元素在树中的高度，单位是像素
	 * @param tree 
	 * @param element 
	 */
	public getHeight(tree: ITree, element: any): number {
		return ComponentRenderer.ITEM_HEIGHT;
	}
	/**
	 * 返回给定元素的模板id。
	 * @param tree 
	 * @param element 
	 */
	public getTemplateId(tree: ITree, element: any): string {
		return ComponentRenderer.FILE_TEMPLATE_ID;
	}
	/**
	 * 在DOM节点中渲染一个模板。 这个方法需要渲染元素的所有DOM结构。返回的内容将在 `renderElement` 方法中进行数据填充。
	 * 需要再这个方法中构建高所有的DOM元素，这个方法仅被调用有点次数。
	 * @param tree 
	 * @param templateId 
	 * @param container 
	 */
	public renderTemplate(tree: ITree, templateId: string, container: HTMLElement): IComponentTemplateData {
		const template: IComponentTemplateData = {
			container: container,
			iconSpan: DOM.append(container, DOM.$('div')),
			image: DOM.append(container, DOM.$('div')),
			textSpan: DOM.append(container, DOM.$('span'))
		};
		addClass(template.iconSpan, 'iconSpan');
		addClass(template.image, 'component-icon');
		addClass(template.textSpan, 'component-label');
		addClass(container, 'component-item-container');
		return template;
	}
	/**
	 * 通过 `renderTemplate` 渲染的模板，在这个方法中将被塞入数据渲染成一个真正的项。
	 * 尽可能保证这个方法足够的轻量，因为他会被经常调用。
	 * @param tree 
	 * @param element 
	 * @param templateId 
	 * @param templateData 
	 */
	public renderElement(tree: ITree, stat: ComponentStat, templateId: string, templateData: IComponentTemplateData): void {

		templateData.image.className = 'component-icon';
		if (stat.isFolder) {
			addClass(templateData.image, 'componentPanelFolder');
		} else {
			addClass(templateData.image, 'componentPanelSpanItem');
			if (!stat.isCustom) {
				templateData.image.classList.add(stat.name);
			}
			else {
				templateData.image.classList.add('Custom');
			}
		}
		templateData.image.style.height = '16px';
		templateData.textSpan.style.marginLeft = '3px';
		templateData.textSpan.innerText = stat.name;
	}
	/**
	 * 释放一个模板
	 * @param tree 
	 * @param templateId 
	 * @param templateData 
	 */
	public disposeTemplate(tree: ITree, templateId: string, templateData: IComponentTemplateData): void {
		templateData.textSpan.innerText = '';
		templateData.image.style.backgroundImage = '';
		templateData.image.style.transform = `matrix(1,0,0,1,0,0)`;
	}
}


/**
 * 处理用户交互
 */
export class ComponentController extends DefaultController implements IController {
	constructor() {
		super({ clickBehavior: ClickBehavior.ON_MOUSE_UP, keyboardSupport: true, openMode: OpenMode.SINGLE_CLICK });
	}
	/**
	 * 左键点击的时候
	 * @param tree 
	 * @param stat 
	 * @param event 
	 * @param origin 
	 */
	public onLeftClick(tree: Tree, stat: ComponentStat, event: IMouseEvent, origin: string = 'mouse'): boolean {
		const payload = { origin: origin };
		const isDoubleClick = (origin === 'mouse' && event.detail === 2);
		// Expand / Collapse
		if (isDoubleClick || this.openOnSingleClick) {
			tree.toggleExpansion(stat);
		}

		tree.setFocus(stat, payload);

		if (isDoubleClick) {
			event.preventDefault(); // focus moves to editor, we need to prevent default
		}


		tree.setSelection([stat], payload);
		return true;
	}


	/**
	 * 请求菜单内容的时候
	 * @param tree 
	 * @param stat 
	 * @param event 
	 */
	public onContextMenu(tree: ITree, stat: ComponentStat, event: ContextMenuEvent): boolean {
		return true;
	}
}

/**
 * 组件的拖拽与释放
 */
export class ComponentDragAndDrop implements IDragAndDrop {

	constructor(
		@IClipboardService private clipboardservice: IClipboardService
	) {

	}
	/**
	 * 如果给定的元素可以接受拖出，则返回一个置顶元素的uri，否则返回null。
	 * @param tree 
	 * @param element 
	 */
	public getDragURI(tree: ITree, element: any): string {
		if (!element || element.isFolder === true) {
			return null;
		}
		else {
			return element.name;
		}
	}
	/**
	 * 当拖出一个元素的时候，返回这个元素需要显示的标签文本。
	 * @param tree 
	 * @param elements 
	 */
	public getDragLabel?(tree: ITree, elements: any[]): string {
		return null;
	}
	/**
	 * 当拖出操作开始的时候。
	 * @param tree 
	 * @param data 
	 * @param originalEvent 
	 */
	public onDragStart(tree: ITree, data: IDragAndDropData, originalEvent: DragMouseEvent): void {

		const nodeData = this.createNodeDataS(data.getData());
		if (nodeData) {
			const eleStringfyObj = JSON.stringify(nodeData);
			this.clipboardservice.writeText(eleStringfyObj, 'eui-node');
			originalEvent.dataTransfer.setDragImage(originalEvent.target['childNodes'][0].childNodes[1], 0, 0);
			originalEvent.dataTransfer.setData('text/plain', nodeData.id);
			originalEvent.dataTransfer.setData('eui-node', eleStringfyObj);
		}
	}

	private createNodeDataS(ds: Array<ComponentStat>): any {
		if (ds.length <= 0) { return; }
		const nodeData = this.getData(ds[0]);

		if (!nodeData) {
			return;
		}
		const otherDragData = [];
		for (let i: number = 1; i < ds.length; i++) {
			if (ds[i].target) {
				otherDragData.push(this.getData(ds[i]));
			}
		}
		nodeData.otherDragData = otherDragData;
		return nodeData;
	}

	private getData(value: ComponentStat): any {
		let nodeData;
		if (value.isCustom) {
			nodeData = { id: value.name, type: 'custom' };
		}
		else {
			nodeData = value.target;
			nodeData.type = 'default';
		}

		return nodeData;
	}

	/**
	 * 拖拽经过一个元素的时候，返回当前元素是否可以接受释放等信息。
	 * @param tree 
	 * @param data 
	 * @param targetElement 
	 * @param originalEvent 
	 */
	public onDragOver(tree: ITree, data: IDragAndDropData, targetElement: any, originalEvent: DragMouseEvent): IDragOverReaction {
		return targetElement;
	}
	/**
	 * 当将目标拖入到一个位置的时候。
	 * @param tree 
	 * @param data 
	 * @param targetElement 
	 * @param originalEvent 
	 */
	public drop(tree: ITree, data: IDragAndDropData, targetElement: any, originalEvent: DragMouseEvent): void {
	}
}


/**
 * 文件过滤器
 */
export class ComponentFilter implements IFilter {

	/**过滤文本 */
	public filterText = '';


	constructor() {
	}

	private search(tree: ITree, node: ComponentStat, key: string): boolean {
		const result = matchesFuzzy(key, node.name, true);
		if (result) {
			return true;
		}
		if (node.children && node.children.length > 0) {
			for (let i = 0; i < node.children.length; i++) {
				if (this.search(tree, node.children[i], key)) {
					tree.expand(node);
					return true;
				}
			}
		}
		return false;
	}
	/**
	 * 指定的元素是否显示
	 */
	public isVisible(tree: ITree, stat: ComponentStat): boolean {
		if (this.filterText === '') {
			return true;
		}
		return this.search(tree, stat, this.filterText);
	}
}

/**
 * 组件排序
 */
export class ComponentSorter implements ISorter {

	private folderIds: string[] = ['custom', 'component', 'container'];
	constructor(
	) {

	}
	/**
	 * 比较排序
	 * @param tree 
	 * @param statA 
	 * @param statB 
	 */
	public compare(tree: ITree, statA: ComponentStat, statB: ComponentStat): number {
		if (!statA) {
			return -1;
		}
		if (!statB) {
			return 1;
		}
		// 文件夹不排序，按添加先后顺序
		if (this.folderIds.includes(statA.id) ||
			this.folderIds.includes(statB.id)) {
			return 0;
		}

		const oneName = statA.name.toLowerCase();
		const otherName = statB.name.toLowerCase();

		if (oneName !== otherName) {
			return oneName < otherName ? -1 : 1;
		}

		return 0;
	}
}
