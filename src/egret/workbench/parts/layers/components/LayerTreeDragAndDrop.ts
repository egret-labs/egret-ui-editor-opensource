import { ITree, IDragAndDrop, IDragOverReaction } from 'vs/base/parts/tree/browser/tree';
import { ExternalElementsDragAndDropData, DesktopDragAndDropData } from 'vs/base/parts/tree/browser/treeDnd';
import * as DOM from 'vs/base/browser/dom';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { LayerPanelUtil } from 'egret/workbench/parts/layers/components/LayerPanelUtil';
import { IClipboardService } from 'egret/platform/clipboard/common/clipboardService';
import { IDragAndDropData } from 'vs/base/browser/dnd';

/**
 * 层拖拽
 */
export class LayerDragAndDropData implements IDragAndDropData {

	private elements: INode[];

	constructor(elements: INode[]) {
		this.elements = elements;
	}

	/**
	 * 更新
	 * @param event 
	 */
	public update(dataTransfer: DataTransfer): void {
		// no-op
	}

	/**
	 * 获得数据
	 */
	public getData(): INode[] {
		return this.elements;
	}
}

/**
 * 层拖拽
 */
export class DomLayerTreeDragAndDrop implements IDragAndDrop {
	private borderedElements: HTMLElement[] = [];
	private exmlModel: IExmlModel = null;
	private lastCorrectData: LayerDragAndDropData = null;
	private isStartFromLayerTree: boolean = false;
	constructor(@IClipboardService private clipboardService: IClipboardService) {
	}

	getDragURI(tree: ITree, element: INode): string {
		if (element.getLocked()) {
			return null;
		}
		if (element.getIsRoot()) {
			return null;
		}
		return element.hashCode.toString();
	}

	onDragEnd(e){
		
	}

	onDragStart(tree: ITree, data: LayerDragAndDropData, originalEvent: any): void {
		if (data.getData().length === 1) {
			originalEvent.dataTransfer.setDragImage(originalEvent.target.childNodes[0].childNodes[1], 0, 0);
		}
		this.lastCorrectData = data;
		this.isStartFromLayerTree = true;
		document.addEventListener('dragend', (e) => { this.handleDragEnd(e); }, false);
	}

	handleDragEnd(e) {
		this.isStartFromLayerTree = false;
		this.borderedElements.forEach((each) => { this.clearElementBorder(each); });
		this.borderedElements = [];
		document.removeEventListener('dragend', (e) => { this.handleDragEnd(e); }, false);
	}

	onDragOver(tree: ITree, data: LayerDragAndDropData, targetElement: INode, originalEvent: any): IDragOverReaction {
		const clipStr = this.clipboardService.readText('eui-node');
		
		if (!this.isStartFromLayerTree) {
			return { accept: false };
		}
		//
		if (data instanceof ExternalElementsDragAndDropData) {
			data = this.lastCorrectData;
		}
		if (data instanceof DesktopDragAndDropData) {
			data = this.lastCorrectData;
		}
		//
		const items = data.getData();
		let shouldReturn = false;
		if (items.forEach) {
			items.forEach(element => {
				if (element.getParent() && element.getParent().getName() === 'Scroller') {
					shouldReturn = true;
					return;
				}
			});
		} else {
			return;
		}
		if (shouldReturn) {
			return;
		}
		//console.log(originalEvent);
		let aimHTMLElement = originalEvent.target;
		if (DOM.hasClass(originalEvent.target, 'layerPanelSpanItem')) {
			aimHTMLElement = originalEvent.target.parentElement.parentElement;
		}

		if (this.borderedElements.indexOf(aimHTMLElement) === -1) {
			this.borderedElements.push(aimHTMLElement);
		}

		//aimHTMLElement.style.border = '1px solid red';
		if (!DOM.hasClass(aimHTMLElement, 'monaco-tree-row')) {
			this.borderedElements.forEach((item) => { this.clearElementBorder(item); });
			return { accept: true };
		}
		//范围检查
		if (originalEvent.pageX < tree.getHTMLElement().getBoundingClientRect().left || originalEvent.pageX > tree.getHTMLElement().getBoundingClientRect().right) {
			this.borderedElements.forEach((item) => { this.clearElementBorder(item); });
			return { accept: true };
		}

		////////////////////////////////////////////////////////////////////////////////////////////////////
		let elementCache = null;
		if (LayerPanelUtil.isContainer(targetElement) && targetElement.getName() !== 'Scroller') {
			if (this.judgeTop(aimHTMLElement, { x: originalEvent.pageX, y: originalEvent.pageY })) {
				if (aimHTMLElement.style.border === '1px solid red') {
					aimHTMLElement.style.border = '';
				}
				if (aimHTMLElement.style.borderTop !== '1px solid red') {
					aimHTMLElement.style.borderTop = '1px solid red';
				}
				elementCache = aimHTMLElement;
			}
			else if (this.judgeMiddle(aimHTMLElement, { x: originalEvent.pageX, y: originalEvent.pageY })) {
				if (aimHTMLElement.style.border !== '1px solid red') {
					aimHTMLElement.style.border = '1px solid red';
				}
				elementCache = aimHTMLElement;
			}
			else if (this.judgeBottom(aimHTMLElement, { x: originalEvent.pageX, y: originalEvent.pageY })) {
				if (aimHTMLElement.style.border === '1px solid red') {
					aimHTMLElement.style.border = '';
				}
				if (aimHTMLElement.style.borderBottom !== '1px solid red') {
					aimHTMLElement.style.borderBottom = '1px solid red';
				}
				elementCache = aimHTMLElement;
			}
		}
		else {
			if (this.judgeTop(aimHTMLElement, { x: originalEvent.pageX, y: originalEvent.pageY })) {
				if (aimHTMLElement.style.border === '1px solid red') {
					aimHTMLElement.style.border = '';
				}
				if (aimHTMLElement.style.borderTop !== '1px solid red') {
					aimHTMLElement.style.borderTop = '1px solid red';
				}
				elementCache = aimHTMLElement;
			}
			else if (this.judgeMiddle(aimHTMLElement, { x: originalEvent.pageX, y: originalEvent.pageY })) {
				if (aimHTMLElement.style.border !== '1px solid red') {
					aimHTMLElement.style.border = '1px solid red';
				}
				elementCache = aimHTMLElement;
			}
			else if (this.judgeBottom(aimHTMLElement, { x: originalEvent.pageX, y: originalEvent.pageY })) {
				if (aimHTMLElement.style.border === '1px solid red') {
					aimHTMLElement.style.border = '';
				}
				if (aimHTMLElement.style.borderBottom !== '1px solid red') {
					aimHTMLElement.style.borderBottom = '1px solid red';
				}
				elementCache = aimHTMLElement;
			}
		}
		this.borderedElements.forEach((item) => {
			if (elementCache !== item) {
				this.clearElementBorder(item);
			}
		});

		return { accept: true };
	}

	drop(tree: ITree, data: LayerDragAndDropData, targetElement: INode, originalEvent: any): void {

		const clipStr = this.clipboardService.readText('eui-node');
		console.log('drop----clipStr--', clipStr);
		this.clipboardService.clear('eui-node');

		data = this.lastCorrectData;
		//要先对拖拽元素进行排序
		const dropElements = data.getData().sort((a, b) => { return LayerPanelUtil.compare(tree, a, b); });
		this.isStartFromLayerTree = false;
		this.borderedElements.forEach((item) => { item.style.border = ''; });
		const aimHTMLElement = originalEvent.target;
		if (LayerPanelUtil.isContainer(targetElement) && targetElement.getName() !== 'Scroller') {
			if (this.judgeTop(aimHTMLElement, { x: originalEvent.pageX, y: originalEvent.pageY })) {
				dropElements.forEach((element) => {
					LayerPanelUtil.moveNodeForwardOtherNode(element, targetElement, this.exmlModel);
				});
			}
			else if (this.judgeMiddle(aimHTMLElement, { x: originalEvent.pageX, y: originalEvent.pageY })) {
				dropElements.forEach((element) => {
					LayerPanelUtil.moveNodeIntoOtherNode(element, targetElement, this.exmlModel);
				});
			}
			else if (this.judgeBottom(aimHTMLElement, { x: originalEvent.pageX, y: originalEvent.pageY }, targetElement.getIsRoot())) {
				//加到节点后需要反过来遍历
				for (let index = dropElements.length - 1; index >= 0; index--) {
					const element = dropElements[index];
					LayerPanelUtil.moveNodeBehindOtherNode(element, targetElement, this.exmlModel);
				}
			}
		}
		else {
			if (this.judgeTop(aimHTMLElement, { x: originalEvent.pageX, y: originalEvent.pageY })) {
				dropElements.forEach((element) => {
					LayerPanelUtil.moveNodeForwardOtherNode(element, targetElement, this.exmlModel);
				});
			}
			else if (this.judgeMiddle(aimHTMLElement, { x: originalEvent.pageX, y: originalEvent.pageY })) {
				dropElements.forEach((element) => {
					LayerPanelUtil.moveNodeIntoOtherNode(element, targetElement, this.exmlModel);
				});
			}
			else if (this.judgeBottom(aimHTMLElement, { x: originalEvent.pageX, y: originalEvent.pageY }, targetElement.getIsRoot())) {
				for (let index = dropElements.length - 1; index >= 0; index--) {
					const element = dropElements[index];
					LayerPanelUtil.moveNodeBehindOtherNode(element, targetElement, this.exmlModel);
				}
			}
		}
	}

	private judgeTop(aimElement: HTMLElement, position: { x: number, y: number }): boolean {
		const rect = aimElement.getBoundingClientRect();
		if (position.y >= rect.top && position.y <= rect.top + 8) {
			return true;
		}
		return false;
	}

	private judgeMiddle(aimElement: HTMLElement, position: { x: number, y: number }): boolean {
		const rect = aimElement.getBoundingClientRect();
		if (position.y > rect.top + 8 && position.y <= rect.top + 14) {
			return true;
		}
		return false;
	}

	private judgeBottom(aimElement: HTMLElement, position: { x: number, y: number }, isSkin: boolean = false): boolean {
		const rect = aimElement.getBoundingClientRect();
		if (position.y > rect.top + 14 && (position.y <= rect.top + 22 || isSkin)) {
			return true;
		}
		return false;
	}

	private clearElementBorder(element: HTMLElement): void {
		if (element.style.border !== '') {
			element.style.border = '';
		}
		if (element.style.borderTop !== '') {
			element.style.borderTop = '';
		}
		if (element.style.borderBottom !== '') {
			element.style.borderBottom = '';
		}
		if (element.style.borderLeft !== '') {
			element.style.borderLeft = '';
		}
		if (element.style.borderRight !== '') {
			element.style.borderRight = '';
		}
	}

	setModel(v: IExmlModel): void {
		this.exmlModel = v;
	}
}