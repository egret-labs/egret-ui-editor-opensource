import { IDataSource, ITree, IRenderer, IController, IDragAndDrop, IDragOverReaction, ContextMenuEvent, IFilter, ISorter } from 'vs/base/parts/tree/browser/tree';
import { IDragAndDropData } from 'vs/base/browser/dnd';
import * as DOM from 'vs/base/browser/dom';
import { DefaultController } from 'vs/base/parts/tree/browser/treeDefaults';
import { IMouseEvent, DragMouseEvent } from 'vs/base/browser/mouseEvent';
import { Tree } from 'vs/base/parts/tree/browser/treeImpl';
import { IFileService } from 'egret/platform/files/common/files';
import { FileStat, Model } from 'egret/workbench/parts/files/common/explorerModel';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IWorkbenchEditorService } from 'egret/workbench/services/editor/common/ediors';
import { ResType } from './common/ResType';
import { ISheet } from './common/SheetSubVO';
import 'vs/base/parts/tree/browser/tree.less';
import { TreeNodeBase, TreeLeafNode, TreeParentNode, TreeNodeType } from 'egret/workbench/parts/assets/material/common/TreeModel';
import { ResInfoVO } from 'egret/workbench/parts/assets/material/common/ResInfoVO';
import { EUI } from 'egret/exts/exml-exts/exml/common/project/parsers/core/commons';
import { IClipboardService } from 'egret/platform/clipboard/common/clipboardService';
import { IDisposable } from 'vs/base/common/lifecycle';
import { dispose } from 'egret/base/common/lifecycle';
import { matchesFuzzy } from 'egret/base/common/filters';

/**
 * 资源面板数据源
 */
export class MaterialDataSource implements IDataSource {

	constructor(@IFileService private fileService: IFileService) {
	}
	/**
	 * 得到给定元素的唯一id标识。
	 * @param tree 
	 * @param element 
	 */
	public getId(tree: ITree, stat: any): string {

		if (stat instanceof TreeNodeBase) {
			return 'model' + stat.model + stat.label;
		}
		else if (stat instanceof TreeLeafNode) {
			return 'leaf' + stat.model + stat.label;
		}
		else if (stat instanceof TreeParentNode) {
			return 'parent' + stat.model + stat.label;
		}

	}
	/**
	 * 返回此元素是否具有子项
	 * @param tree 
	 * @param element 
	 */
	public hasChildren(tree: ITree, stat: TreeNodeBase): boolean {
		return stat instanceof TreeParentNode;
	}
	/**
	 * 异步返回元素的子项
	 * @param tree 
	 * @param element 
	 */
	public getChildren(tree: ITree, stat: TreeNodeBase): Promise<TreeNodeBase[]> {
		if (stat instanceof TreeParentNode) {
			return Promise.resolve(stat.children ?? []);
		}
	}
	/**
	 * 异步返回一个元素的父级
	 * @param tree 
	 * @param element 
	 */
	public getParent(tree: ITree, stat: TreeNodeBase): Promise<FileStat> {
		if (!stat) {
			return Promise.resolve(null);
		}
		if (tree.getInput() === stat) {
			return Promise.resolve(null);
		}
		if (stat instanceof FileStat && stat.parent) {
			return Promise.resolve(stat.parent);
		}
		return Promise.resolve(null);
	}
}



const FileNameMatch = /^(.*?)(\.([^.]*))?$/;
/**
 * 文件排序
 */
export class MaterialSorter implements ISorter {
	private toDispose: IDisposable[];

	constructor(
	) {
		this.toDispose = [];
	}

	private isFolder(stat: TreeNodeBase): boolean {
		if (stat.isFolder && stat.type != TreeNodeType.SHEET) {
			return true;
		}
		return false;
	}

	private isSheet(stat: TreeNodeBase): boolean {
		if (stat.type == TreeNodeType.SHEET) {
			return true;
		}
		return false;
	}

	/**
	 * 比较排序
	 * @param tree 
	 * @param statA 
	 * @param statB 
	 */
	public compare(tree: ITree, statA: TreeNodeBase, statB: TreeNodeBase): number {
		// Do not sort roots
		if (this.isFolder(statA) && !this.isFolder(statB)) {
			return -1;
		}
		if (this.isFolder(statB) && !this.isFolder(statA)) {
			return 1;
		}
		if (this.isSheet(statA) && !this.isSheet(statB)) {
			return -1;
		}
		if (this.isSheet(statB) && !this.isSheet(statA)) {
			return 1;
		}


		return this.compareFileNames(statA.label, statB.label);
	}


	private compareFileNames(one: string, other: string, caseSensitive = false): number {
		if (!caseSensitive) {
			one = one && one.toLowerCase();
			other = other && other.toLowerCase();
		}

		const [oneName, oneExtension] = this.extractNameAndExtension(one);
		const [otherName, otherExtension] = this.extractNameAndExtension(other);

		if (oneName !== otherName) {
			return oneName < otherName ? -1 : 1;
		}

		if (oneExtension === otherExtension) {
			return 0;
		}

		return oneExtension < otherExtension ? -1 : 1;
	}

	private extractNameAndExtension(str?: string): [string, string] {
		const match = str ? FileNameMatch.exec(str) : [] as RegExpExecArray;

		return [(match && match[1]) || '', (match && match[3]) || ''];
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.toDispose = dispose(this.toDispose);
	}
}

/**
 * 文件模板数据接口
 */
export interface IFileTemplateData {
	/**
	 * 容器
	 */
	container: HTMLElement;
	/**
	 * 图片容器
	 */
	imageDiv: HTMLElement;

	/**
	 * 图片
	 */
	image: HTMLElement;

	/**
	 * 图标
	 */
	iconSpan: HTMLElement;

	/**
	 * 文本显示
	 */
	textSpan: HTMLElement;
}
/**
 * 文件项的渲染器
 */
export class MaterialRenderer implements IRenderer {

	private static readonly ITEM_HEIGHT = 22;
	private static readonly FILE_TEMPLATE_ID = 'material';
	constructor(
		@IInstantiationService private instantiationService: IInstantiationService
	) {
	}
	/**
	 * 返回一个元素在树中的高度，单位是像素
	 * @param tree 
	 * @param element 
	 */
	public getHeight(tree: ITree, element: any): number {
		return MaterialRenderer.ITEM_HEIGHT;
	}
	/**
	 * 返回给定元素的模板id。
	 * @param tree 
	 * @param element 
	 */
	public getTemplateId(tree: ITree, element: any): string {
		return MaterialRenderer.FILE_TEMPLATE_ID;
	}
	/**
	 * 在DOM节点中渲染一个模板。 这个方法需要渲染元素的所有DOM结构。返回的内容将在 `renderElement` 方法中进行数据填充。
	 * 需要再这个方法中构建高所有的DOM元素，这个方法仅被调用有点次数。
	 * @param tree 
	 * @param templateId 
	 * @param container 
	 */
	public renderTemplate(tree: ITree, templateId: string, container: HTMLElement): IFileTemplateData {
		const template: IFileTemplateData = {
			container: container,
			iconSpan: DOM.append(container, DOM.$('span')),
			imageDiv: DOM.append(container, DOM.$('div')),
			image: DOM.append(container, DOM.$('div')),
			textSpan: DOM.append(container, DOM.$('span'))
		};

		// (new Builder(container)).draggable(true);

		container.style.display = 'flex';
		container.style.flexDirection = 'row';
		container.style.alignItems = 'center';
		template.iconSpan.className = 'iconSpan';
		template.imageDiv.appendChild(template.image);
		template.image.id = 'image';
		template.imageDiv.id = 'imageDiv';
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
	public renderElement(tree: ITree, stat: TreeNodeBase, templateId: string, templateData: IFileTemplateData): void {
		templateData.image.setAttribute('style', '');
		templateData.image.style.height = '20px';
		templateData.image.style.width = '20px';
		templateData.image.id = 'dragImage';
		templateData.image.style.transform = `matrix(1,0,0,1,0,0)`;

		const resvo: ResInfoVO = stat['resvo'];
		if (resvo) {
			templateData.image.className = '';
			templateData.imageDiv.style.width = '20px';
			templateData.imageDiv.style.height = '20px';
			let ibg = resvo.locolUrl;
			if (resvo.type === ResType.TYPE_SHEET) {
				if (stat['sheetVo']) {
					const sd = stat['sheetVo'].sheetData as ISheet;
					templateData.image.style.backgroundPositionX = `-${sd.x}px`;
					templateData.image.style.backgroundPositionY = `-${sd.y}px`;
					templateData.image.style.width = `${sd.sourceW}px`;
					templateData.image.style.height = `${sd.sourceH}px`;
					templateData.image.style.position = 'absolute';
					const scale = Math.min(20 / sd.sourceW, 20 / sd.sourceH, 1);
					templateData.image.style.transform = `matrix(${scale},0,0,${scale},${(20 - sd.sourceW) / 2},${(20 - sd.sourceH) / 2})`;
				}
				else {
					templateData.image.style.backgroundSize = '20px 20px';
				}
				ibg = resvo.locolUrl.replace('.json', '.png');

			}
			else {
				templateData.image.style.backgroundSize = '20px 20px';
			}
			// templateData.imageDiv.style.backgroundSize = 'cover';
			templateData.image.style.backgroundImage = `url('${ibg}')`;
		}
		else {
			templateData.image.style.backgroundImage = ``;
			templateData.imageDiv.style.width = '20px';
			templateData.imageDiv.style.height = '20px';
			templateData.image.className = 'componentPanelFolder';
		}

		templateData.textSpan.style.marginLeft = '3px';
		templateData.textSpan.innerText = stat.label;
	}



	/**
	 * 释放一个模板
	 * @param tree 
	 * @param templateId 
	 * @param templateData 
	 */
	public disposeTemplate(tree: ITree, templateId: string, templateData: IFileTemplateData): void {
		templateData.textSpan.innerText = '';
		templateData.image.style.backgroundImage = '';
		templateData.image.style.transform = `matrix(1,0,0,1,0,0)`;
	}

	private getSheetAtt(stat: TreeNodeBase) {
		const resvo: ResInfoVO = stat['resvo'];
		if (resvo && resvo.type === ResType.TYPE_SHEET) {
			if (stat['resname']) {
				const pinfos = resvo.subList.filter(item => { return item.name === stat.label; });
				if (pinfos.length !== 0) {
					return pinfos[0];
				}
				return null;
			}
			else {
				return resvo;
			}
		}
	}
}




/**
 * 处理用户交互
 */
export class MaterialController extends DefaultController implements IController {
	private previousSelectionRangeStop: FileStat;

	/**
	 * 单击预览
	 */
	public displayFun: Function;

	constructor(_dispalyFun: Function, @IWorkbenchEditorService private editorService: IWorkbenchEditorService) {
		super();
		this.displayFun = _dispalyFun;
	}

	/**
	 * 左键点击的时候
	 * @param tree 
	 * @param stat 
	 * @param event 
	 * @param origin 
	 */
	protected onLeftClick(tree: Tree, stat: FileStat | Model, event: IMouseEvent, origin: string = 'mouse'): boolean {
		const payload = { origin: origin };
		const isDoubleClick = (origin === 'mouse' && event.detail === 2);
		// Handle Highlight Mode
		if (tree.getHighlight()) {
			// Cancel Event
			event.preventDefault();
			event.stopPropagation();
			tree.clearHighlight(payload);
			return false;
		}
		// Handle root
		if (stat instanceof Model) {
			tree.clearFocus(payload);
			tree.clearSelection(payload);
			return false;
		}

		// Cancel Event
		const isMouseDown = event && event.browserEvent && event.browserEvent.type === 'mousedown';
		if (!isMouseDown) {
			event.preventDefault(); // we cannot preventDefault onMouseDown because this would break DND otherwise
		}
		event.stopPropagation();

		// Set DOM focus
		tree.domFocus();

		// Allow to multiselect
		if ((event.altKey) || (event.ctrlKey || event.metaKey)) {
			const selection = tree.getSelection();
			this.previousSelectionRangeStop = undefined;
			if (selection.indexOf(stat) >= 0) {
				tree.setSelection(selection.filter(s => s !== stat));
			} else {
				tree.setSelection(selection.concat(stat));
				tree.setFocus(stat, payload);
			}
		}
		// Allow to unselect
		else if (event.shiftKey) {
			const focus = tree.getFocus();
			if (focus) {
				if (this.previousSelectionRangeStop) {
					tree.deselectRange(stat, this.previousSelectionRangeStop);
				}
				tree.selectRange(focus, stat, payload);
				this.previousSelectionRangeStop = stat;
			}
		}
		// Select, Focus and open files
		else {
			// Expand / Collapse
			if (isDoubleClick || this.openOnSingleClick) {
				tree.toggleExpansion(stat);
				this.previousSelectionRangeStop = undefined;
			}

			const preserveFocus = !isDoubleClick;
			tree.setFocus(stat, payload);

			if (isDoubleClick) {
				event.preventDefault(); // focus moves to editor, we need to prevent default
			}


			tree.setSelection([stat], payload);

			// if (!stat.isDirectory && (isDoubleClick || this.openOnSingleClick)) {
			// 	this.openEditor(stat);
			// }

			this.displayFun && this.displayFun(stat);
		}
		return true;
	}

	/**
	 * 打开编辑器
	 * @param stat 
	 */
	public openEditor(stat: FileStat): void {
		if (stat && !stat.isDirectory) {
			this.editorService.openEditor({ resource: stat.resource });
		}
	}


	/**
	 * 请求菜单内容的时候
	 * @param tree 
	 * @param stat 
	 * @param event 
	 */
	public onContextMenu(tree: ITree, stat: FileStat | Model, event: ContextMenuEvent): boolean {
		return true;
	}
}

/**
 * 文件过滤器
 */
export class MaterialFilter implements IFilter {

	/**过滤文本 */
	public filterText = '';


	constructor() {
	}

	private search(tree: ITree, node: TreeParentNode, key: string): boolean {
		const result = matchesFuzzy(key, node.label, true);
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
	public isVisible(tree: ITree, stat: TreeParentNode): boolean {
		if (this.filterText === '') {
			return true;
		}
		return this.search(tree, stat, this.filterText);
	}
}

/**
 * 文件的拖拽与释放
 */
export class MaterialDragAndDrop implements IDragAndDrop {


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

		if (element.sheetVo) {
			return element.sheetVo.name;
		} else if (element.resvo) {
			return element.resvo.locolUrl;
		}

		return null;
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
			originalEvent.dataTransfer.setData('text/plain', nodeData.data.source);
			originalEvent.dataTransfer.setData('eui-node', eleStringfyObj);
		}
	}


	private createNodeDataS(ds: Array<TreeLeafNode>): any {
		if (ds.length <= 0) { return; }
		const nodeData = this.createNodeData(ds[0]);
		if (!nodeData) {
			return;
		}
		const otherDragData = [];
		for (let i: number = 1; i < ds.length; i++) {
			const tempData = this.createNodeData(ds[i]);
			if (tempData) {
				otherDragData.push(tempData);
			}
		}
		nodeData.otherDragData = otherDragData;
		return nodeData;
	}

	private createNodeData(dragData: TreeLeafNode): any {
		let source: string = dragData.label;
		if (!dragData.isFolder) {
			if (dragData instanceof TreeLeafNode) {
				const leaf: TreeLeafNode = <TreeLeafNode>dragData;
				if (leaf.resvo.type === TreeNodeType.SHEET) {
					source = leaf.resvo.name + '.' + leaf.label;
				}
			}
		} else {
			return null;
		}
		let scale9gridData: string = '';
		if (dragData.resvo && (0 !== dragData.resvo.x || 0 !== dragData.resvo.y || 0 !== dragData.resvo.w || 0 !== dragData.resvo.h)) {
			scale9gridData = dragData.resvo.x + ',' + dragData.resvo.y + ',' + dragData.resvo.w + ',' + dragData.resvo.h;
		}
		return {
			type: 'default',
			id: 'Image',
			ns: {
				prefix: EUI.prefix,
				uri: EUI.uri
			},
			data: {
				source: source,
				scale9gridData: scale9gridData
			}
		};
	}

	/**
	 * 拖拽经过一个元素的时候，返回当前元素是否可以接受释放等信息。
	 * @param tree 
	 * @param data 
	 * @param targetElement 
	 * @param originalEvent 
	 */
	public onDragOver(tree: ITree, data: IDragAndDropData, targetElement: any, originalEvent: DragMouseEvent): IDragOverReaction {

		return null;
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