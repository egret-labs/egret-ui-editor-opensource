// import * as nls from 'vs/nls';
// import * as pfs from 'vs/base/node/pfs';
// import * as paths from 'vs/base/common/paths';

import { TreeItemResdepotRenderer } from 'egret/exts/resdepot/components/TreeItemResdepotRenderer';
import { ResModel } from 'egret/exts/resdepot/common/model/ResModel';
import { TreeModelSourceType, TreeLeafNode, TreeParentNode } from 'egret/exts/resdepot/common/model/TreeModel';
import { ResTreeModel } from 'egret/exts/resdepot/common/model/ResTreeModel';
import { NativeDragBehavior } from 'egret/exts/resdepot/common/behaviors/NativeDragBehavior';
import { ResInfoVO } from 'egret/exts/resdepot/common/model/ResInfoVO';
import { ResType } from 'egret/exts/resdepot/common/consts/ResType';
import { IResEventService } from 'egret/exts/resdepot/events/ResEventService';
import { ResGlobalEvents } from 'egret/exts/resdepot/events/ResGlobalEvents';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';

/**
 * 资源区 树结构
 */
export class ResTree extends eui.TreePro {
	public resModel: ResModel;
	private nDrag: NativeDragBehavior = new NativeDragBehavior();
	public resourcePath: string;

	public treeDp: eui.ObjectCollection = new eui.ObjectCollection();
	public treeModel: ResTreeModel;

	public constructor(
		@IResEventService private resEventService: IResEventService,
		@IInstantiationService private instantiationService: IInstantiationService) {
		super();
		this.treeModel = this.instantiationService.createInstance(ResTreeModel, null, TreeModelSourceType.RESDEPOT);
		this.allowMultipleSelection = true;
		this.dragable = false;
		this.orderable = true;
		this.doubleClickExpand = true;
		this.requireSelection = false;//不要求必须有选中项
		this.itemRenderer = TreeItemResdepotRenderer;
		// this.itemRendererFunction = (item: any) => {
		// 	this.instantiationService.createInstance(TreeItemResdepotRenderer);
		// }
		//this.itemRendererSkinName = 'skins.TreeItemRendererSkin';
		this.left = this.right = this.bottom = 0;

		this.treeDp.source = this.treeModel.treeDataProvider;
		this.treeDp.filterFunction = (item: any, target: eui.ObjectCollection) => {
			if (item && item.hideOnSearch) {
				return false;
			} else {
				return true;
			}
		};
		this.dataProvider = this.treeDp;

		this.nDrag.init(this);
		this.nDrag.onLoadUrl = this.onLoadUrl;

		this.addGlobalEvents();
	}

	private addGlobalEvents() {
		this.resEventService.addListen(ResGlobalEvents.DELETE_RES_IN_TREE, this.onGlobDelRes, this);
		this.resEventService.addListen(ResGlobalEvents.SHOW_ITEM_IN_TREE, this.onGlobShowItemInTree, this);
	}
	private removeGlobalEvents() {
		this.resEventService.removeListen(ResGlobalEvents.DELETE_RES_IN_TREE, this.onGlobDelRes, this);
		this.resEventService.removeListen(ResGlobalEvents.SHOW_ITEM_IN_TREE, this.onGlobShowItemInTree, this);
	}

	public updateTreeView(): void {
		if (this.treeModel) {
			this.treeDp.refresh();
			eui.ObjectCollection.assignParent(this.treeModel.treeDataProvider);//让树的层级有缩进，必须在有数据之后设置才能生效
			this.treeModel.onRefreshReses();
		}
	}

	/**从本地拖拽进来的文件 */
	private onLoadUrl(urlList: Array<string>) {
		this.resModel.filterDragInFiles(urlList).then(ret => {
			if (!urlList.length) {
				return;
			}
			this.resModel.delSheetPic(ret).then(delVOs => {
				if (delVOs && delVOs.length) {
					// 删除tree里被删掉的pic
					this.treeModel.delReses(delVOs);// 修复：先拖入sheet的pic再拖入json，pic还在
				}
				let urls: string[] = urlList;
				if (urls && urls.length) {
					this.resModel.addReses(urls).then(addedReses => {
						if (addedReses && addedReses.length) {
							this.treeModel.addReses(addedReses);
							this.treeModel.sort();
							this.updateTreeView();
							egret.callLater(() => {
								this.onGlobShowItemInTree(addedReses);
								this.resEventService.sendEvent(ResGlobalEvents.GROUP_GRID_FRESH);
							}, this);
							this.resEventService.sendEvent(ResGlobalEvents.Json_Modifyed);
						}
					});
				}
			});
		});
	}

	/**
	 * 删除资源 删除数据源的ResInfoVO数据
	 * @param node TreeParentNode|TreeLeafNode
	 */
	public onGlobDelRes(node: any | TreeParentNode | TreeLeafNode) {
		let dels: any[] = [];
		if (this.selectedItems && this.selectedItems.length) {
			for (let i: number = 0; i < this.selectedItems.length; i++) {
				if (this.selectedItems[i]) {//多选项可能为空，多次删除多选
					dels.push(this.selectedItems[i]);
				}
			}
		}
		if (dels.indexOf(node) === -1) {
			dels.length = 0;
			dels.push(node);
		}

		let delVOs: ResInfoVO[] = [];
		// for (let i: number = 0; i < dels.length; i++) {
		// 	/// 点击folder节点删除，需要找到所有的子leaf节点
		// 	let delNodes: Array<TreeLeafNode> = TreeModel.getAllLeafChildren(dels[i]);
		// 	for (let i: number = 0; i < delNodes.length; i++) {
		// 		// // 找到所有重复的资源项（同名同url的）
		// 		// for (let k: number = 0; k < this.resModel.resList.length; k++) {
		// 		// 	if (delNodes[i].resvo.name === this.resModel.resList[k].name && delNodes[i].resvo.url === this.resModel.resList[k].url) {
		// 		// 		if (delVOs.indexOf(this.resModel.resList[k]) === -1) {
		// 		// 			delVOs.push(this.resModel.resList[k]);
		// 		// 		}
		// 		// 	}
		// 		// }

		// 		/// 现在允许res.json文件中存在重复项，删除时只删除选择的项，不再自动删除所有重复项
		// 		if (delVOs.indexOf(delNodes[i].resvo) === -1) {
		// 			delVOs.push(delNodes[i].resvo);
		// 		}
		// 	}
		// }
		/** 所有的子节点 */
		let getAllChildren = (n): any[] => {
			let allNodes = [];
			allNodes.push(n);
			if (n.children && n.children.length) {
				for (let i: number = 0; i < n.children.length; i++) {
					allNodes.push(n.children[i]);
					allNodes = allNodes.concat(getAllChildren(n.children[i]));
				}
			}
			return allNodes;
		};
		let allNodes = [];
		for (let i: number = 0; i < dels.length; i++) {
			let tempNodes = getAllChildren(dels[i]);
			for (let k: number = 0; k < tempNodes.length; k++) {
				if (allNodes.indexOf(tempNodes[k]) === -1) {
					allNodes.push(tempNodes[k]);
				}
			}
		}
		for (let i: number = 0; i < allNodes.length; i++) {
			if (allNodes[i].resvo && delVOs.indexOf(allNodes[i].resvo) === -1) {
				delVOs.push(allNodes[i].resvo);
			}
		}
		this.resModel.delReses(delVOs).then(delNum => {
			if (delNum > 0) {
				this.treeModel.delReses(delVOs);
				this.updateTreeView();
				this.resEventService.sendEvent(ResGlobalEvents.UPDATE_PREVIEW, null);
				this.resEventService.sendEvent(ResGlobalEvents.UPDATE_INFO_AREA, null);
				this.resEventService.sendEvent(ResGlobalEvents.GROUP_GRID_FRESH, null);
				this.resEventService.sendEvent(ResGlobalEvents.Json_Modifyed, null);
			}
		});
	}

	/** 展开tree到resvo，并选中该项 */
	private onGlobShowItemInTree(items: ResInfoVO | ResInfoVO[]) {
		var getShowingIndex = (resvo: ResInfoVO): number => {
			// if (this.selectedItem && this.selectedItem.resvo && this.selectedItem.resvo === resvo) {
			// 	return;
			// }
			if (resvo) {
				let list = this.getShowingList(resvo);
				do {
					if (list.length) {
						let element = list.pop();
						if (this.treeDp.hasChildren(element)) {
							if (element.type !== ResType.TYPE_SHEET) {
								this.treeDp.expandItem(element, true);
							}
						}
						if (list.length === 0) {
							return this.treeDp.getItemIndex(element);
						}
					}
				} while (list.length);
			}
			return -1;
		};

		let select_indexs: number[] = [];
		let index: number = -1;

		let vo: ResInfoVO;
		if (items instanceof ResInfoVO) {
			vo = items;
			index = getShowingIndex(vo);
			if (-1 !== index) {
				select_indexs.push(index);
			}
		} else if (items instanceof Array) {
			for (let i: number = 0; i < items.length; i++) {
				vo = items[i];
				index = getShowingIndex(vo);
				if (-1 !== index) {
					select_indexs.push(index);
				}
			}
		}
		if (select_indexs.length) {
			this.setSelectedIndices(select_indexs, false);
			// console.log(select_indexs.length, '---', select_indexs.join(','));
			this.ensureIndexIsVisible(select_indexs[0]);
		} else {
			this.setSelectedIndex(-1);
		}
	}
	/** 根据resvo数据，返回该叶节点路径上的所有节点 */
	private getShowingList(resvo: ResInfoVO): any[] {
		let getNodeByVO = (vo, target): any => {
			if (target && target.resvo && vo === target.resvo) {
				return target;
			} else {
				if (target.children && target.children.length) {
					for (let i: number = 0; i < target.children.length; i++) {
						let ret: any = getNodeByVO(vo, target.children[i]);
						if (ret) {
							return ret;
						}
					}
				}
			}
			return null;
		};

		let list: any[] = [];
		for (let i: number = 0; i < this.treeDp.length; i++) {
			let element = this.treeDp.getItemAt(i);
			let ret = getNodeByVO(resvo, element);
			if (ret) {
				list.push(ret);
				while (ret.parent) {
					ret = ret.parent;
					list.push(ret);
				}
				break;
			}
		}
		return list;
	}

	protected rendererAdded(renderer: eui.IItemRenderer, index: number, item: any): void {
		super.rendererAdded(renderer, index, item);
		if (renderer) {
			renderer.addEventListener(egret.MouseEvent.MOUSE_DOWN, this.dragStartHandler, this);//在down事件中开始拖拽会立刻显示拖拽到图片
			renderer.addEventListener(egret.MouseEvent.MOUSE_MOVE, this.dragMoveHandler, this);
		}
	}

	protected rendererRemoved(renderer: eui.IItemRenderer, index: number, item: any): void {
		super.rendererRemoved(renderer, index, item);
		if (renderer) {
			renderer.removeEventListener(egret.MouseEvent.MOUSE_DOWN, this.dragStartHandler, this);
			renderer.removeEventListener(egret.MouseEvent.MOUSE_MOVE, this.dragMoveHandler, this);
		}
	}

	private $curDownRender: eui.IItemRenderer;
	protected dragStartHandler(event: egret.MouseEvent): void {
		// if (event.currentTarget.data instanceof TreeLeafNode) {
		// 	let leaf: TreeLeafNode = event.currentTarget.data;
		// 	if (leaf.resvo.type === ResType.TYPE_SHEET) {//subkey不可拖动，拖动subkey视为拖动sheet
		// 		return;
		// 	}
		// }
		this.$curDownRender = event.currentTarget;
	}

	protected dragMoveHandler(event: egret.MouseEvent): void {
		if (eui.DragManager.getIsDragging(this)) {
			return;
		}
		if (!this.$curDownRender || this.$curDownRender !== event.currentTarget || !event.buttonDown) {
			return;
		}
		if (event.isDefaultPrevented()) {
			return;
		}
		// 注意：此时拖拽对象与this.selectedItem不一定是同一目标
		// var dragData: any = event.currentTarget.data;
		var dragData: any = this.selectedItems;///拖动的是多个对象
		if (dragData) {
			// console.log('drag move1')
			var dragSource: eui.DragSource = new eui.DragSource();
			dragSource.addData(dragData, 'drag_data');
			eui.DragManager.doDrag(this,
				dragSource,
				this.createDragIndicator(dragData),
				event.stageX,
				event.stageY,
				// -this.mouseX,
				// -this.mouseY,
				0.5);
		}
	}

	private shape: egret.Shape = new egret.Shape();
	/**
	 * @param dragData 拖拽目标的数据，类型为TreeParentNode/TreeLeafNode
	 */
	protected createDragIndicator(dragData: any): egret.DisplayObject {
		egret.Mouse.cursor = egret.MouseCursor.MOVE;
		return this.shape;
	}

	/** 从tree型数据中查找节点 */
	private getNodeByKeyInTree = (key: string, target: any): any => {
		if (target.label === key) {
			// todo 处理sheet
			return target;
		}
		if (target.children) {
			for (var i: number = 0; i < target.children.length; i++) {
				this.getNodeByKeyInTree(key, target.children[i]);
			}
		}
		return null;
	}

	/**
	 * 面板销毁时
	 */
	public destory(): void {
		this.removeGlobalEvents();
		this.treeModel = null;
	}
}