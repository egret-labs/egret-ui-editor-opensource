import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { Tree } from 'vs/base/parts/tree/browser/treeImpl';
import { ITreeConfiguration } from 'vs/base/parts/tree/browser/tree';
import { ResLibData } from 'egret/workbench/parts/assets/material/common/ResLibData';
import { TreeNodeBase, TreeParentNode } from 'egret/workbench/parts/assets/material/common/TreeModel';
import { ResInfoVO } from 'egret/workbench/parts/assets/material/common/ResInfoVO';
import { ResType } from 'egret/workbench/parts/assets/material/common/ResType';
import { SheetSubVO, ISheet } from 'egret/workbench/parts/assets/material/common/SheetSubVO';
import { MatTreeModel } from 'egret/workbench/parts/assets/material/common/MatTreeModel';
import { MaterialDataSource, MaterialRenderer, MaterialController, MaterialDragAndDrop, MaterialFilter, MaterialSorter } from 'egret/workbench/parts/assets/material/materialViewer';
import { IModelRequirePart } from 'egret/exts/exml-exts/models';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { PanelContentDom } from 'egret/parts/browser/panelDom';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { TextInput } from 'egret/base/browser/ui/inputs';
import { IconButton } from 'egret/base/browser/ui/buttons';
import { IFocusablePart } from 'egret/platform/operations/common/operations';
import { voluationToStyle } from 'egret/base/common/dom';
import { localize } from 'egret/base/localization/nls';

import './media/assetsView.css';


/**对象层级面板 
 */
export class AssetsView extends PanelContentDom implements IModelRequirePart, IFocusablePart {

	// 资源树
	private assetsViewer: Tree;

	// resLibData 数据
	private resLibData: ResLibData;

	// 资源树容器
	private treeContainer: HTMLDivElement;
	private iconContainer: HTMLDivElement;

	// 拖动线
	private separatorLine: HTMLDivElement;

	// 图片展示区域容器
	private displayArea: HTMLDivElement;

	// 当前view 高度
	private totalHight: number;

	// 图片展示区 默认高度
	private areaHeight: number = 200;

	// 鼠标按下的初始点
	private startMouseP: IPoint = { x: 0, y: 0, h: 0 };

	// 树 model
	private matTreeModel: MatTreeModel;

	// 图片展示区域
	private displayContainer: HTMLDivElement;

	// 是否是sheet 数据格式
	private isSheet: boolean;
	private sheetData: ISheet;

	private searchContainer: HTMLDivElement;


	/**
	 * 初始化
	 * @param instantiationService 
	 */
	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IEgretProjectService private egretProjectService: IEgretProjectService
	) {

		super(instantiationService);
		this.resLibData = this.instantiationService.createInstance(ResLibData);
		this.separatorHandle.bind(this);
		this.egretProjectService.onProjectConfigChanged(e => this.refresh());
		this.egretProjectService.onResConfigChanged(e => this.refresh());
	}


	/**
	 * 尺寸改变
	 * @param width 
	 * @param height 
	 */
	public doResize(width: number, height: any): void {
		this.totalHight = height;
		this.resizeByContainer();
	}

	/**
	 * 渲染头部附加内容
	 * @param container 
	 */
	public renderHeaderExt(container: HTMLElement): void {
		//TODO 添加要渲染的头部扩展按钮
	}

	setModel(exmlModel: IExmlModel): void {
	}

	// 点击事件
	displayFun = (stat: TreeNodeBase) => {
		const resvo: ResInfoVO = stat['resvo'];

		if (!resvo) {
			return;
		}
		let ibg, psn = {};
		this.isSheet = false;
		this.sheetData = null;

		if (resvo.type === ResType.TYPE_SHEET) {
			//sheet 二级key 节点 //获取的图应该是sheet 截取的图
			const svo: SheetSubVO = stat['sheetVo'];
			if (svo) {
				psn = {
					'background-size': null,
					'background-position': `-${svo.sheetData.x}px -${svo.sheetData.y}px`,
					'width': `${svo.sheetData.sourceW}px`,
					'height': `${svo.sheetData.sourceH}px`,
					'flex-grow': '0',
					'flex-shrink': '0',
				};
				this.isSheet = true;
				this.sheetData = svo.sheetData;
			} else {
				psn = {
					'background-size': 'contain',
					'background-position': 'center',
					'width': '100%',
					'height': '100%',
					'transform': null,
					'flex-grow': null,
					'flex-shrink': null
				};
			}
			ibg = resvo.locolUrl.replace('.json', '.png');
		} else if (resvo.type === ResType.TYPE_IMAGE) {
			ibg = resvo.locolUrl;
			psn = {
				'background-size': 'contain',
				'background-position': 'center',
				'width': '100%',
				'height': '100%',
				'transform': null,
				'flex-grow': null,
				'flex-shrink': null
			};
		}
		else {
			return null;
		}

		if (!this.displayContainer) {
			this.displayContainer = document.createElement('div');
			this.displayArea.appendChild(this.displayContainer);
		}

		voluationToStyle(this.displayContainer.style, Object.assign({ 'background-image': `url("${ibg}")`, 'background-repeat': 'no-repeat', 'image-rendering': 'pixelated' }, psn));
		this.freshDisplayArea();
	}


	private treeFilter: MaterialFilter;
	/**
	 * 生成、初始化资源树
	 *
	 * @private
	 * @memberof AssetsView
	 */
	private handleTree() {

		this.matTreeModel = this.instantiationService.createInstance(MatTreeModel);
		const dataSource = this.instantiationService.createInstance(MaterialDataSource);
		const renderer = this.instantiationService.createInstance(MaterialRenderer);
		const controller = this.instantiationService.createInstance(MaterialController, this.displayFun);
		const dnd = this.instantiationService.createInstance(MaterialDragAndDrop);
		const sorter = this.instantiationService.createInstance(MaterialSorter);
		this.treeFilter = this.instantiationService.createInstance(MaterialFilter);
		const treeConfiguration: ITreeConfiguration = {
			dataSource: dataSource,
			renderer: renderer,
			controller,
			filter: this.treeFilter,
			sorter,
			dnd
		};

		this.assetsViewer = this.instantiationService.createInstance(Tree, this.treeContainer, treeConfiguration, {});
		this.assetsViewer.getHTMLElement().style.position = 'absolute';
		this.create();
		setTimeout(() => {
			if (this.assetsViewer) {
				this.assetsViewer.layout();
			}
		}, 1);
	}

	private create() {
		const targetsToExpand = [];
		//TODO 从持久化数据中读取需要打开的节点。
		return this.doRefresh(targetsToExpand);
	}

	/**
	 * 刷新数据显示
	 */
	public refresh(): Promise<any> {
		if (!this.assetsViewer || this.assetsViewer.getHighlight()) {
			return Promise.resolve(null);
		}
		//赋予焦点
		this.assetsViewer.DOMFocus();
		//TODO 选择激活的编辑器
		return this.doRefresh().then(() => {
			//TODO 选中激活的编辑器
			return Promise.resolve(null);
		});
	}


	private changeState(value) {
		if (value === '') {
			this.setIconDisplay(false);
		} else {
			this.setIconDisplay(true);
		}
		this.searchWithTree(value);
	}

	private setIconDisplay(b: boolean): void {
		this.iconContainer.style.visibility = (b ? 'visible' : 'hidden');
	}


	private searchWithTree(value: string): void {
		this.treeFilter.filterText = value;
		this.assetsViewer.refresh();
	}



	private doRefresh(targetsToExpand: TreeNodeBase[] = []): Promise<any> {
		return this.resLibData.loadRes().then(v => {
			this.matTreeModel.updateData(v);
			return this.resolveRoots(this.matTreeModel.treeDataProvider['children'], targetsToExpand);
		});
	}


	private resolveRoots(targetToResolves: TreeParentNode[], targetsToExpand: TreeNodeBase[]): Promise<any> {
		const toExpands: TreeNodeBase[] = this.assetsViewer.getExpandedElements().concat(targetsToExpand);
		let root: TreeParentNode = null;
		if (targetToResolves.length == 1) {
			root = targetToResolves[0];
		} else if (targetToResolves.length > 1) {
			root = new TreeParentNode();
			root.children = targetToResolves;
		} else {
			root = new TreeParentNode();
		}
		function findNode(currentNode: TreeNodeBase, target: TreeNodeBase): TreeNodeBase {
			if (
				currentNode.icon == target.icon &&
				currentNode.isFolder == target.isFolder &&
				currentNode.label == target.label &&
				currentNode.model == target.model &&
				currentNode.type == target.type
			) {
				return currentNode;
			}
			if (currentNode instanceof TreeParentNode) {
				const children = currentNode.children;
				for (let i = 0; i < children.length; i++) {
					const result = findNode(children[i], target);
					if (result) {
						return result;
					}
				}
			}
			return null;
		}

		const getToExpands = (_root: TreeParentNode): TreeNodeBase[] => {
			const _toExpands: TreeNodeBase[] = [];
			for (let i = 0; i < toExpands.length; i++) {
				const oldExpands: TreeNodeBase = toExpands[i];
				const newExpands: TreeNodeBase = findNode(_root, oldExpands);
				if (newExpands) {
					_toExpands.push(newExpands);
				}
			}
			return _toExpands;
		};

		return new Promise((resolve, reject) => {
			this.assetsViewer.setInput(root).then(() => {
				const currentToExpands = getToExpands(root);
				this.assetsViewer.expandAll(currentToExpands).then(result => {
					resolve(result);
				}, error => {
					reject(error);
				});
			}, error => {
				reject(error);
			});
		});
	}




	/**
	 * 分割线拖动事件
	 */
	separatorHandle = (e) => {
		switch (e.type) {
			case 'mouseenter':
				this.separatorLine.style.cursor = 'row-resize';
				break;
			case 'mouseleave':
				this.separatorLine.style.cursor = 'default';
				break;
			case 'mousedown':
				this.startMouseP.x = e.clientX;
				this.startMouseP.y = e.clientY;
				this.startMouseP.h = this.displayArea.offsetHeight;
				window.addEventListener('mouseup', this.separatorHandle, true);
				window.addEventListener('mousemove', this.separatorHandle, true);
				break;
			case 'mousemove':
				this.resizeByMouse(e);
				break;
			case 'mouseup':
				this.clearEvent(e);
				break;
		}
	}

	// 鼠标移动事件
	private resizeByMouse(e): void {
		e.stopPropagation();
		e.preventDefault();
		if (this.startMouseP.y !== 0) {
			let previewHeight = this.startMouseP.h + e.clientY - this.startMouseP.y;
			if (previewHeight > this.totalHight - 100) {
				previewHeight = this.totalHight - 100;
			}
			this.areaHeight = previewHeight;
			this.freshDisplayArea();
			setTimeout(() => {
				if (this.assetsViewer) {
					this.assetsViewer.layout();
				}
			}, 1);
		}
	}

	private resizeByContainer(): void {
		if (this.areaHeight > this.totalHight - 100) {
			this.areaHeight = this.totalHight - 100;
			this.freshDisplayArea();
		}
		setTimeout(() => {
			if (this.assetsViewer) {
				this.assetsViewer.layout();
			}
		}, 1);
	}



	private clearEvent(e): void {
		e.stopPropagation();
		e.preventDefault();
		this.startMouseP = { x: 0, y: 0, h: 0 };
		this.separatorLine.style.cursor = 'default';
		window.removeEventListener('mousemove', this.separatorHandle, true);
		window.removeEventListener('mouseup', this.separatorHandle, true);
	}


	render(container: HTMLElement) {
		this.doRender(container);
	}

	private doRender(container: HTMLElement): void {
		const top = document.createElement('div');
		voluationToStyle(top.style,
			{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' });
		container.appendChild(top);

		this.displayArea = document.createElement('div');
		top.appendChild(this.displayArea);


		this.separatorLine = document.createElement('div');
		this.separatorLine.className = 'assetsview separatorline';
		voluationToStyle(this.separatorLine.style,
			{ flexGrow: '0', flexShrink: '0' });
		top.appendChild(this.separatorLine);

		this.treeContainer = document.createElement('div');
		voluationToStyle(this.treeContainer.style,
			{ flexGrow: '1', flexShrink: '1', position: 'relative' });
		top.appendChild(this.treeContainer);

		// search
		this.searchContainer = document.createElement('div');
		voluationToStyle(this.searchContainer.style,
			{ display: 'flex', 'flex-direction': 'row', width: '100%', flexGrow: '0', flexShrink: '0' });
		top.appendChild(this.searchContainer);



		this.initEvent();
		this.freshDisplayArea();
		this.handleTree();

		this.handleSearch();
	}

	// 初始化事件
	private initEvent(): void {
		this.separatorLine.addEventListener('mouseenter', this.separatorHandle);
		this.separatorLine.addEventListener('mouseleave', this.separatorHandle);
		this.separatorLine.addEventListener('mousedown', this.separatorHandle);
		this.separatorLine.addEventListener('mousemove', this.separatorHandle);
		this.separatorLine.addEventListener('mouseup', this.separatorHandle);
	}


	private handleSearch(): void {
		const searchInput = new TextInput(this.searchContainer);
		searchInput.prompt = localize('assets.search.prompt', 'Search Assets');
		searchInput.getElement().style.width = '100%';
		searchInput.onValueChanging((v) => {
			this.changeState(v);
		});

		this.iconContainer = document.createElement('div');
		this.searchContainer.appendChild(this.iconContainer);

		const closeBtn = new IconButton(this.iconContainer);
		this.iconContainer.style.position = 'absolute';
		this.iconContainer.style.width = '100%';
		this.iconContainer.style.pointerEvents = 'none';
		this.iconContainer.style.visibility = 'hidden';
		closeBtn.iconClass = 'layerview closesearch';

		closeBtn.getElement().style.cssFloat = 'right';
		closeBtn.getElement().style.pointerEvents = 'bounding-box';

		closeBtn.onClick(v => {
			searchInput.text = '';
			this.changeState('');
		});
	}


	/**
	 * 面板关闭
	 */
	public shutdown(): void {
		//TODO 面板关闭，这里可能需要记录相关的状态
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		//TODO 释放当前组件中的引用和事件监听
		this.separatorLine.removeEventListener('mouseenter', this.separatorHandle);
		this.separatorLine.removeEventListener('mouseleave', this.separatorHandle);
		this.separatorLine.removeEventListener('mousedown', this.separatorHandle);
		this.separatorLine.removeEventListener('mousemove', this.separatorHandle);
		this.separatorLine.removeEventListener('mouseup', this.separatorHandle);
	}

	/**
	 * 刷新图片展示区 大小
	 *
	 * @private
	 * @memberof AssetsView
	 */
	private freshDisplayArea(): void {
		voluationToStyle(
			this.displayArea.style,
			this.isSheet ?
				{
					width: '100%',
					height: `${this.areaHeight}px`,
					alignItems: 'center',
					display: 'flex',
					justifyContent: 'center',
					flexShrink: '0',
					flexGrow: '0'
				} :
				{
					width: '100%',
					height: `${this.areaHeight}px`,
					display: 'grid',
					alignItems: null,
					justifyContent: null,
					flexShrink: '0',
					flexGrow: '0'
				});
		if (this.sheetData && this.displayContainer) {
			const scaleX = this.sheetData.sourceW / this.displayArea.clientWidth;
			const scaleY = this.sheetData.sourceH / this.displayArea.clientHeight;
			const maxScale = Math.max(scaleX, scaleY);
			this.displayContainer.style.transform = `scale(${1 / maxScale},${1 / maxScale})`;
		}
		setTimeout(() => {
			if (this.assetsViewer) {
				this.assetsViewer.layout();
			}
		}, 1);
	}

	getRelativeELement(): HTMLElement {
		// throw new Error("Method not implemented.");
		return null;
	}
	executeCommand<T>(command: string, ...args: any[]): Promise<T> {
		// throw new Error("Method not implemented.");
		return Promise.resolve(void 0);
	}
	hasCommand(command: string): boolean {
		// throw new Error("Method not implemented.");
		return false;
	}

}

export namespace AssetsView {
	export const ID: string = 'workbench.assets';
	export const TITLE: string = localize('assetsView.title', 'Assets');
}


interface IPoint {
	x: number;
	y: number;
	h: number;
}