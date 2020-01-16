import './../../media/euiLayer.css';
import { Tree } from 'vs/base/parts/tree/browser/treeImpl';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { DomLayerTreeDataSource } from '../../components/LayerTreeDataSource';
import { LayerTreeRenderer } from '../../components/LayerTreeRenderer';
import { DomLayerTreeController } from '../../components/LayerTreeController';
import { DomLayerTreeSorter } from '../../components/LayerTreeSorter';
import { DomLayerTreeDragAndDrop } from '../../components/LayerTreeDragAndDrop';
import { DomLayerTreeFilter } from '../../components/LayerTreeFilter';
import { IModelRequirePart, IExmlModelServices } from 'egret/exts/exml-exts/models';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { LayerPanelUtil } from '../../components/LayerPanelUtil';
import { INode, isInstanceof } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { clipboard } from 'electron';
import { ExmlModelHelper } from 'egret/exts/exml-exts/exml/common/exml/helpers';
import { IDisposable } from 'vs/base/common/lifecycle';
import { IconButton } from 'egret/base/browser/ui/buttons';
import { SystemCommands } from 'egret/platform/operations/commands/systemCommands';
import { voluationToStyle } from 'egret/base/common/dom';
import { IWorkbenchEditorService } from 'egret/workbench/services/editor/common/ediors';
import { ExmlFileEditor } from 'egret/exts/exml-exts/exml/browser/exmlFileEditor';
import { PanelContentDom } from 'egret/parts/browser/panelDom';
import { IFocusablePart } from 'egret/platform/operations/common/operations';
import { IPanel } from 'egret/parts/common/panel';
import { IOperationBrowserService } from 'egret/platform/operations/common/operations-browser';
import { EuiCommands } from 'egret/exts/exml-exts/exml/commands/euiCommands';
import { TextInput } from 'egret/base/browser/ui/inputs';
import { localize } from 'egret/base/localization/nls';

export interface LayerViewRef {
	test: HTMLDivElement;
}


/**对象层级面板 
*/
export class LayerView extends PanelContentDom implements IModelRequirePart, IFocusablePart {

	private tree: Tree;
	private layerTreeDnd: DomLayerTreeDragAndDrop;
	private treeFilter: DomLayerTreeFilter;

	private deleteIcon: IconButton;
	private tsCopyIcon: IconButton;
	private makeGroupIcon: IconButton;
	private makeUngroupIcon: IconButton;
	private exmlModelHelper: ExmlModelHelper;
	private treeContainer: HTMLDivElement;
	private iconContainer: HTMLDivElement;

	private searchContainer: HTMLDivElement;

	private exmlModel: IExmlModel;

	private _dispose: Array<IDisposable>;

	private _disposeIcon: Array<IDisposable>;

	private owner: IPanel;

	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IExmlModelServices private exmlModeService: IExmlModelServices,
		@IOperationBrowserService private operationService: IOperationBrowserService,
		@IWorkbenchEditorService private workbenchEditorService:IWorkbenchEditorService
		) {

		super(instantiationService);
		this.keyboard_handler = this.keyboard_handler.bind(this);
		this.operationService = operationService;
		this.exmlModeService.registerPart(this);
		this.exmlModelHelper = new ExmlModelHelper();

		this._dispose = [];
		this._disposeIcon = [];
	}

	/**
	 * 初始化所有者
	 */
	public initOwner(owner: IPanel): void {
		this.owner = owner;
		this.initCommands();
	}

	/** 注册当前编辑器可以执行的命令 */
	private initCommands(): void {
		this.operationService.registerFocusablePart(this);
	}

	/**
	 * 得到这个部件对应的Dom节点
	 */
	public getRelativeELement(): HTMLElement {
		return this.owner.getRoot();
	}

	/**
	 * 运行一个命令
	 * @param command 要运行的命令
	 */
	public executeCommand<T>(command: string, ...args): Promise<any> {
		if (!this.exmlModel) {
			return Promise.resolve(void 0);
		}
		switch (command) {
			case SystemCommands.COPY:
				this.exmlModelHelper.copyNodesToClipboard();
				break;
			case SystemCommands.CUT:
				this.exmlModelHelper.cutNodesToClipboard();
				break;
			case SystemCommands.PASTE:
				this.exmlModelHelper.pasteNodesFromClipboard();
				break;
			case SystemCommands.DELETE:
				this.exmlModelHelper.removeSelectedNodes();
				break;
			case SystemCommands.SELECT_ALL:
				this.exmlModelHelper.selectAll();
				break;
			case EuiCommands.GROUP:
				this.exmlModelHelper.groupNodes();
				break;
			case EuiCommands.UNGROUP:
				this.exmlModelHelper.unGroupNodes();
				break;
			case SystemCommands.UNDO:
				this.exmlModelHelper.getModel() && this.exmlModelHelper.getModel().undo();
				break;
			case SystemCommands.REDO:
				this.exmlModelHelper.getModel() && this.exmlModelHelper.getModel().redo();
				break;
			default:
				break;
		}
		return Promise.resolve(void 0);
	}

	/**
	 * 是否可以运行指定命令
	 * @param command 需要判断的命令
	 */
	public hasCommand(command: string): boolean {
		return [
			SystemCommands.COPY,
			SystemCommands.CUT,
			SystemCommands.PASTE,
			SystemCommands.DELETE,
			SystemCommands.SELECT_ALL,
			EuiCommands.GROUP,
			EuiCommands.UNGROUP,
			SystemCommands.UNDO,
			SystemCommands.REDO,
			SystemCommands.DELETE,
		].indexOf(command as EuiCommands) != -1;
	}


	/**
	 * 渲染头部附加内容
	 * @param container 
	 */
	public renderHeaderExt(container: HTMLElement): void {
		//TODO 添加要渲染的头部扩展按钮
	}



	setModel(exmlModel: IExmlModel): void {
		if (this.exmlModel === exmlModel) {
			return;
		}
		if (this.exmlModel) {
			this._dispose.forEach(v => v.dispose());
			this._dispose = [];
		}
		this.exmlModel = exmlModel;
		if (this.exmlModel) {
			this._dispose.push(this.exmlModel.onNodeAdded(e=>this.onLayerChanged(false)));
			this._dispose.push(this.exmlModel.onNodeRemoved(e=>this.onLayerChanged(false)));
			this._dispose.push(this.exmlModel.onRootChanged(e=>this.onLayerChanged(true)));
			this._dispose.push(this.exmlModel.onTreeChanged(e=>this.onTreeChanged(e)));
			this._dispose.push(this.exmlModel.onSelectedListChanged(this.onSelectedNodesChange));
			this.exmlModelHelper.setModel(exmlModel);
			this.layerTreeDnd.setModel(exmlModel);
		}
		this.updateTree(true,true);
	}

	private onSelectedNodesChange = (event: any): void => {
		this.selectNodes();
	}

	private selectNodes(): void {
		let parents: INode[] = [];
		const selections: INode[] = [];
		//展开select node父级所有节点
		this.exmlModel.getSelectedNodes().forEach((each) => {
			let current = each;
			while (current.getParent()) {
				current = current.getParent();
				if (current) {
					parents.push(current);
				}
			}
			selections.push(each);
		});
		parents = parents.reverse();
		this.tree.expandAll(parents).then(() => {
			setTimeout(() => {
				this.tree.setSelection(selections);
				if (selections.length > 0) {
					this.tree.reveal(selections[selections.length - 1]);
				}
				this.updateHeaderActionStates();
				this.saveExpandedPathsToEditConfig();
			}, 1);
		});
	}



	private onTreeChanged = (event: any): void => {
		if (event.property === 'id' || isInstanceof(event.dValue, 'eui.INode')) {
			this.onLayerChanged(false);
		}
	}

	private layerChangeFlag = false;
	private layerChangedStamp = null;
	private onLayerChanged = (refreshed:boolean): void => {
		if(refreshed){
			if(this.layerChangedStamp){
				clearTimeout(this.layerChangedStamp);
			}
			this.layerChangedStamp = null;
			this.doLayerChanged(true);
		}else{
			if (!this.layerChangeFlag) {
				this.layerChangeFlag = true;
				this.layerChangedStamp = setTimeout(() => {
					this.layerChangeFlag = false;
					this.doLayerChanged(false);
				}, 40);
			}
		}
	}

	private doLayerChanged(refreshed:boolean): void {
		this.updateTree(false,refreshed);
	}

	private changeState(value) {
		if (value === '') {
			this.setIconDisplay(false);
		} else {
			this.setIconDisplay(true);
		}
		this.searchWithTree(value);
	}

	/**
	 * 搜索树
	 * @param value 
	 */
	private searchWithTree(value: string) {
		this.treeFilter.filterText = value;
		this.tree.refresh();
	}



	/**
	* 制作定义文本
	*/
	private makeDefStr(node: INode, defStrSum: { sum: string }): void {
		if (!node) { return; }

		const moduleAndPathName = this.exmlModel.getExmlConfig().getClassNameById(node.getName(), node.getNs());
		if (node.getId()) {
			defStrSum.sum += 'public ' + node.getId() + ':' + moduleAndPathName + ';\n';
		}
		if (LayerPanelUtil.isContainer(node)) {
			const count: number = node.getNumChildren();
			for (let i: number = 0; i < count; i++) {
				const childNode: INode = node.getNodeAt(i);
				this.makeDefStr(childNode, defStrSum);
			}
		}
	}

	private updateHeaderActionStates(): void {
		this.updateGroupActionState();
		this.updateUngroupActionState();
		this.updateDeleteActionState();
	}

	private updateGroupActionState(): void {
		const selection: INode[] = this.tree.getSelection();
		if (selection.length >= 2) {
			let sameDepth: boolean = true;
			const firstSelectItem = selection[0];
			const firstSelectNestLevel = firstSelectItem.getNestLevel();
			selection.forEach(each => {
				if (each.getNestLevel() !== firstSelectNestLevel) {
					sameDepth = false;
				}
			});
			if (sameDepth) {
				this.makeGroupIcon.enable();
				this.makeGroupIcon.style.opacity = '1';
			}
			else {
				this.makeGroupIcon.disable();
				this.makeGroupIcon.style.opacity = '0.4';
			}
		}
		else {
			this.makeGroupIcon.disable();
			this.makeGroupIcon.style.opacity = '0.4';
		}
	}

	private updateUngroupActionState(): void {
		const selection: INode[] = this.tree.getSelection();
		if (selection.length > 1) {
			this.makeUngroupIcon.disable();
			this.makeUngroupIcon.style.opacity = '0.4';
		}
		else {
			if (LayerPanelUtil.isContainer(selection[0])) {
				this.makeUngroupIcon.enable();
				this.makeUngroupIcon.style.opacity = '1';
			}
			else {
				this.makeUngroupIcon.disable();
				this.makeUngroupIcon.style.opacity = '0.4';
			}
		}
	}


	private updateDeleteActionState(): void {
		const selection: INode[] = this.tree.getSelection();
		if (selection.length === 0) {
			this.deleteIcon.disable();
			this.deleteIcon.style.opacity = '0.4';
		}
		else {
			this.deleteIcon.enable();
			this.deleteIcon.style.opacity = '1';
		}
	}



	private updateTree(recoverSelection: boolean,refreshed:boolean): void {
		if (!this.exmlModel) {
			this.tree.setInput(null).then(() => {
				this.tree.layout();
			});
		} else {
			// //记录展开项
			// let expandedElements = this.tree.getExpandedElements();
			// //记录滚动条位置
			// let scrollPos = this.tree.getScrollPosition();
			// this.tree.setInput(this.exmlModel.getRootNode()).then(() => {
			// 	this.tree.refresh(this.exmlModel.getRootNode());
			// 	//还原展开项
			// 	let treeElementArray = LayerPanelUtil.getNodeListByANode(this.exmlModel.getRootNode());
			// 	let newExpandedElements: INode[] = [];
			// 	for (let index = 0; index < treeElementArray.length; index++) {
			// 		let item = treeElementArray[index];
			// 		for (let innerIndex = 0; innerIndex < expandedElements.length; innerIndex++) {
			// 			let expandedElement = expandedElements[innerIndex];
			// 			if (item === expandedElement && newExpandedElements.indexOf(item) === -1) {
			// 				newExpandedElements.push(item);
			// 			}
			// 		}
			// 	}
			// 	this.tree.expandAll(newExpandedElements);
			// 	//还原滚动位置
			// 	this.tree.setScrollPosition(scrollPos);
			// 	//展开所有selection
			// 	this.tree.expandAll(this.tree.getSelection());
			// 	if (this.tree.getInput()) {
			// 		//还原记忆展开项
			// 		let configExpandedElementPaths = this.exmlModel.temporaryData.expandList;
			// 		let configExpandedElements = [];
			// 		configExpandedElementPaths.forEach((path) => {
			// 			let node = LayerPanelUtil.getNodeByPath(this.exmlModel.getRootNode(), path);
			// 			if (node && LayerPanelUtil.isContainer(node)) {
			// 				configExpandedElements.push(node);
			// 			}
			// 		});
			// 		this.tree.expandAll(configExpandedElements);
			// 		//记忆展开项到edit config
			// 		this.saveExpandedPathsToEditConfig();
			// 	}
			// 	this.tree.layout();
			// });


			const existExpaneds = this.tree.getExpandedElements();
			const existPos = this.tree.getScrollPosition();


			const existExpanedsPath:number[][] = [];
			this.tree.getExpandedElements().forEach((each) => {
				existExpanedsPath.push(LayerPanelUtil.getPathByNode(each));
			});
			const existSelectionsPath:number[][] = [];
			this.tree.getSelection().forEach((each) => {
				existSelectionsPath.push(LayerPanelUtil.getPathByNode(each));
			});


			this.tree.setInput(this.exmlModel.getRootNode()).then(() => {
				let toExpands: INode[] = [];
				const toSelections:INode[] = [];
				let layerScrollPosCache = 0;
				if (recoverSelection) {
					const layerExpandListPathCache = this.exmlModel.temporaryData.layerExpandList;
					layerScrollPosCache = this.exmlModel.temporaryData.layerScrollPos;
					layerExpandListPathCache.forEach((path) => {
						const node = LayerPanelUtil.getNodeByPath(this.exmlModel.getRootNode(), path);
						if (node && LayerPanelUtil.isContainer(node)) {
							toExpands.push(node);
						}
					});
				} else {
					layerScrollPosCache = existPos;
					if(refreshed){
						existExpanedsPath.forEach((path) => {
							const node = LayerPanelUtil.getNodeByPath(this.exmlModel.getRootNode(), path);
							if (node && LayerPanelUtil.isContainer(node)) {
								toExpands.push(node);
							}
						});
						existSelectionsPath.forEach((path) => {
							const node = LayerPanelUtil.getNodeByPath(this.exmlModel.getRootNode(), path);
							if (node) {
								toSelections.push(node);
							}
						});
					}else{
						toExpands = existExpaneds.concat();
					}
				}

				const parents: INode[] = [];
				//展开select node父级所有节点
				this.exmlModel.getSelectedNodes().forEach((each) => {
					let current = each;
					while (current.getParent()) {
						current = current.getParent();
						if (current) {
							parents.push(current);
						}
					}
					toSelections.push(each);
				});
				parents.forEach(node => {
					if (toExpands.indexOf(node) == -1) {
						toExpands.push(node);
					}
				});
				this.tree.expandAll(toExpands).then(() => {
					setTimeout(() => {
						this.tree.setSelection(toSelections);
						this.tree.setScrollPosition(layerScrollPosCache);
						this.updateHeaderActionStates();
						this.saveExpandedPathsToEditConfig();
					}, 1);
				});
			});
		}

	}

	private saveExpandedPathsToEditConfig() {
		//记忆展开项到edit config
		const pathList: number[][] = [];
		this.tree.getExpandedElements().forEach((each) => {
			pathList.push(LayerPanelUtil.getPathByNode(each));
		});
		this.exmlModel.temporaryData.layerExpandList = pathList;
		this.exmlModel.temporaryData.layerScrollPos = this.tree.getScrollPosition();
	}


	/**
	 * 尺寸改变
	 * @param width 
	 * @param height 
	 */
	public doResize(width: number, height: any): void {
		this.tree && this.tree.layout();
	}

	private handleTree() {
		const dataSource = this.instantiationService.createInstance(DomLayerTreeDataSource);
		const renderer = this.instantiationService.createInstance(LayerTreeRenderer);
		const controller = this.instantiationService.createInstance(DomLayerTreeController);
		controller.copySelectDefCallback = (elements) => {
			clipboard.clear();
			const defObj = { sum: '' };
			elements.forEach((element) => {
				this.makeDefStr(element, defObj);
			});
			clipboard.writeText(defObj.sum);
		};
		const sorter = this.instantiationService.createInstance(DomLayerTreeSorter);
		this.layerTreeDnd = this.instantiationService.createInstance(DomLayerTreeDragAndDrop);
		this.treeFilter = this.instantiationService.createInstance(DomLayerTreeFilter);
		this.tree = this.instantiationService.createInstance(Tree, this.treeContainer,
			{
				dataSource: dataSource,
				renderer: renderer,
				controller: controller,
				sorter: sorter,
				filter: this.treeFilter,
				dnd: this.layerTreeDnd
			},
			{
				twistiePixels: 23,
			});
		this.tree.getHTMLElement().addEventListener('keydown',this.keyboard_handler);
		this.tree.getHTMLElement().addEventListener('keyup',this.keyboard_handler);
	}
	private keyboard_handler(e:KeyboardEvent):void{
		const editor = this.workbenchEditorService.getActiveEditor();
		if(editor instanceof ExmlFileEditor){
			editor.notifyKeyboardEvent(e);
		}
	}


	private handleSearch() {
		const searchInput = new TextInput(this.searchContainer);
		searchInput.prompt = localize('layerView.handleOperation.searchNodes', 'Search layers');
		searchInput.getElement().style.width = '100%';
		this._disposeIcon.push(searchInput.onValueChanging((v) => {
			this.changeState(v);
		}));

		this.iconContainer = document.createElement('div');
		this.searchContainer.appendChild(this.iconContainer);

		const closeBtn = new IconButton(this.iconContainer);
		this.iconContainer.style.position = 'absolute';
		this.iconContainer.style.width = '100%';
		this.iconContainer.style.pointerEvents = 'none';
		this.iconContainer.style.visibility = 'hidden';
		this.iconContainer.style.marginTop = '2px';
		this.iconContainer.style.paddingRight = '2px';
		closeBtn.iconClass = 'layerview closesearch';

		closeBtn.getElement().style.cssFloat = 'right';
		closeBtn.getElement().style.pointerEvents = 'bounding-box';

		this._disposeIcon.push(closeBtn.onClick(v => {
			searchInput.text = '';
			this.changeState('');
		}));
	}

	/**
	 * 初始化各种用到的operation
	 */
	private handleOperation(barContainer: HTMLElement): void {

		this.deleteIcon = new IconButton(barContainer);
		this.deleteIcon.iconClass = 'deleteAction';
		this.deleteIcon.toolTip = localize('layerView.handleOperation.removeSelectedNodes', 'Delete Layer');
		this._disposeIcon.push(this.deleteIcon.onClick(e => {
			if (this.exmlModel) {
				this.exmlModel.removeSelectedNodes();
			}
		}));

		this.tsCopyIcon = new IconButton(barContainer);
		this.tsCopyIcon.iconClass = 'tsCopyAction';
		this.tsCopyIcon.toolTip = localize('layerView.handleOperation.tsCopyAction', 'Copy definition');
		this._disposeIcon.push(this.tsCopyIcon.onClick(e => {
			if (this.exmlModel) {
				clipboard.clear();
				const allDefObj = { sum: '' };
				this.makeDefStr(this.exmlModel.getRootNode(), allDefObj);
				clipboard.writeText(allDefObj.sum);
			}
		}));

		this.makeGroupIcon = new IconButton(barContainer);
		this.makeGroupIcon.iconClass = 'makeGroupAction';
		this.makeGroupIcon.toolTip = localize('layerView.handleOperation.groupNodes', 'Group');
		this._disposeIcon.push(this.makeGroupIcon.onClick(e => {
			this.exmlModel && this.exmlModelHelper.groupNodes();
		}));

		this.makeUngroupIcon = new IconButton(barContainer);
		this.makeUngroupIcon.iconClass = 'makeUngroupAction';
		this.makeUngroupIcon.toolTip = localize('layerView.handleOperation.unGroupNodes', 'Ungroup');
		this._disposeIcon.push(this.makeUngroupIcon.onClick(e => {
			if (this.exmlModel) {
				this.exmlModel && this.exmlModelHelper.unGroupNodes();
			}
		}));
	}

	private setIconDisplay(b: boolean): void {
		this.iconContainer.style.visibility = (b ? 'visible' : 'hidden');
	}


	render(container: HTMLDivElement) {
		this.doRender(container);
	}

	/**
	 * 渲染到container
	 *
	 * @private
	 * @param {*} container
	 * @memberof LayerView
	 */
	private doRender(container): void {

		const root = document.createElement('div');
		const topStyle = { width: '100%', height: '100%', display: 'flex', 'flex-direction': 'column' };
		voluationToStyle(root.style, topStyle);
		container.appendChild(root);

		// bar
		const barContainer = document.createElement('div');

		const barStyle = { display: 'flex', 'flex-direction': 'row', 'align-items': 'center', width: '100%', 'justify-content': 'center', margin: 'margin:0 20px' };
		voluationToStyle(barContainer.style, barStyle);
		barContainer.className = 'barContainer layerPanelHeaderActionBar';

		this.handleOperation(barContainer);
		root.appendChild(barContainer);

		// tree
		this.treeContainer = document.createElement('div');
		const treeStyle = { width: '100%', height: 'calc(100% - 50px)', display: 'flex', position: 'relative', 'margin-top': '2px' };
		voluationToStyle(this.treeContainer.style, treeStyle);
		root.appendChild(this.treeContainer);
		this.handleTree();


		// search
		this.searchContainer = document.createElement('div');
		const searchStyle = { display: 'flex', 'flex-direction': 'row', width: '100%' };
		voluationToStyle(this.searchContainer.style, searchStyle);
		root.appendChild(this.searchContainer);

		this.handleSearch();
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
		this._dispose.forEach(v => v.dispose());
		this._disposeIcon.forEach(v => v.dispose());
		this._disposeIcon = null;
		this._dispose = null;
	}
}

export namespace LayerView {
	export const ID: string = 'workbench.layer';
	export const TITLE: string = localize('layerView.title', 'Layer');
}