import * as nls from 'egret/base/localization/nls';
import { ErrorPosShow } from 'egret/exts/resdepot/components/ErrorPosShow';
import { GroupInfoVO } from 'egret/exts/resdepot/common/model/GroupInfoVO';
import { ResInfoVO } from 'egret/exts/resdepot/common/model/ResInfoVO';
import { NativeDragBehavior } from 'egret/exts/resdepot/common/behaviors/NativeDragBehavior';
// import { GroupPanel } from 'egret/exts/resdepot/windows/GroupPanel';
import { ResModel } from 'egret/exts/resdepot/common/model/ResModel';
import { ResPanelUtil } from 'egret/exts/resdepot/common/utils/ResPanelUtil';
import { TreeLeafNode, TreeParentNode } from 'egret/exts/resdepot/common/model/TreeModel';
import { ResTreeModel } from 'egret/exts/resdepot/common/model/ResTreeModel';
import { ResGroupItemRender } from 'egret/exts/resdepot/components/ResGroupItemRender';
import { ResGroupResItemRender } from 'egret/exts/resdepot/components/ResGroupResItemRender';
import { ResStatusBar } from 'egret/exts/resdepot/components/error/ResStatusBar';
import { ResGroupErrorBar } from 'egret/exts/resdepot/components/error/ResGroupErrorBar';
import { DataGridEx } from 'egret/exts/resdepot/components/DataGridEx';
import { IResEventService } from 'egret/exts/resdepot/events/ResEventService';
import { ResGlobalEvents } from 'egret/exts/resdepot/events/ResGlobalEvents';
import { GroupWindow } from '../../windows/groupWindow';
import { isMacintosh } from 'egret/base/common/platform';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
// import { ReactServiceHost } from 'vs/workbench/browser/reactServiceHost';
// import {PopupOptions, PopupPosition} from 'vs/workbench/services/popup/common/popupService';
// import { PopupCallbacks } from 'vs/workbench/browser/popup';



/**
 * 资源组代理
 */
export class ResGroupArea {
	private stage: egret.Stage;
	private bottomGroup: eui.Group;
	private groupDragBehavior: NativeDragBehavior;

	/**资源组列表 */
	public groupGrid: DataGridEx = this.instantiationService.createInstance(DataGridEx);
	private groupErrorPosShow: ErrorPosShow = new ErrorPosShow();
	/**资源组的资源列表 */
	public groupResGrid: DataGridEx = this.instantiationService.createInstance(DataGridEx);
	/**资源错误提示bar */
	public resErrorBar: ResGroupErrorBar = new ResGroupErrorBar();
	public resGroup: eui.Group = new eui.Group();
	public statusBar: ResStatusBar = new ResStatusBar();

	private _resList: eui.ArrayCollection = new eui.ArrayCollection();
	public get resList(): eui.ArrayCollection {
		return this._resList;
	}
	private _groupList: eui.ArrayCollection = new eui.ArrayCollection();
	public get groupList(): eui.ArrayCollection {
		return this._groupList;
	}

	private _groupResList: eui.ArrayCollection = new eui.ArrayCollection();
	public get groupResList(): eui.ArrayCollection {
		return this._groupResList;
	}

	private resModel: ResModel;

	private modifyed: boolean = false;

	constructor(bottomGroup: eui.Group, 
		stage: egret.Stage, 
		resModel: ResModel,
		@IResEventService private resEventService: IResEventService,
		@IInstantiationService private instantiationService: IInstantiationService) {
		//获取主题
		this.m_theme = document.body.classList[1];
		//
		var textColor = 0xf0f0f0;
		this.stage = stage;
		this.bottomGroup = bottomGroup;
		this.bottomGroup.percentHeight = this.bottomGroup.percentWidth = 100;
		this.resModel = resModel;

		this.groupDragBehavior = new NativeDragBehavior();
		this.groupDragBehavior.onLoadUrl = this.onLoadUrlsToGroup_handler;

		var rect: eui.Rect = new eui.Rect();
		rect.fillColor = 0x3b3b3b;
		rect.strokeColor = 0x2b2b2b;
		rect.strokeAlpha = 1;
		rect.strokeWeight = 1;
		rect.top = 0;
		rect.left = 0;
		rect.right = rect.bottom = 0;
		this.bottomGroup.addChild(rect);

		var vGroup: eui.Group = new eui.Group();
		let vL: eui.VerticalLayout = new eui.VerticalLayout();
		vGroup.layout = vL;
		vGroup.top = vGroup.left = vGroup.bottom = vGroup.right = 5;
		this.bottomGroup.addChild(vGroup);

		let hGroup: eui.Group = new eui.Group();

		let hL: eui.HorizontalLayout = new eui.HorizontalLayout();
		hL.verticalAlign = egret.VerticalAlign.MIDDLE;
		hGroup.layout = hL;
		hGroup.percentWidth = 100;
		vGroup.addChild(hGroup);

		let label: eui.Label = new eui.Label();
		label.textColor = textColor;
		label.fontFamily = isMacintosh ? 'PingFangSC-Regular' : 'Microsoft YaHei';
		label.text = nls.localize('res.editor.resourceGroup', 'Resource Group：');
		label.size = 12;
		hGroup.addChild(label);
		var button: eui.Button = new eui.Button();
		button.skinName = 'skins.ResAddButton';
		(button.labelDisplay as any).fontFamily = isMacintosh ? 'PingFangSC-Regular' : 'Microsoft YaHei';
		button.label = nls.localize('res.editor.addGroup', 'Add Group');
		// button.toolTip = (egret.utils.tr('ResPanel.AddGroup.Tips'));
		button.addEventListener(egret.MouseEvent.CLICK, this.addGroupClickHandler, this);
		// Shortcut.addRegister(this, ShortcutType.NEW_GROUP, function() {
		//	 this.addGroupClickHandler(null);
		// });
		hGroup.addChild(button);

		hGroup = new eui.Group();
		hL = new eui.HorizontalLayout();
		hGroup.layout = hL;
		hGroup.percentHeight = hGroup.percentWidth = 100;
		// hGroup.top = hGroup.bottom = hGroup.right = hGroup.left = 0;
		vGroup.addChild(hGroup);

		var gridHGroup: eui.Group = new eui.Group();
		hL = new eui.HorizontalLayout();
		hL.gap = 2;
		gridHGroup.layout = hL;
		gridHGroup.percentWidth = 20;
		gridHGroup.percentHeight = 100;
		hGroup.addChild(gridHGroup);

		this.groupGrid.skinName = 'skins.DataGridSkin';
		// this.groupGrid.grid.itemRenderer = ResGroupGridItemRender;
		this.groupGrid.editable = true;
		this.groupGrid.scroller.enableMouseDrag = false;//此时scroller属性还没有创建
		this.groupGrid.selectionMode = eui.GridSelectionMode.MULTIPLE_ROWS;
		this.groupGrid.editOnMouseUp = false;
		this.groupGrid.selectedIndex = (-1);
		// this.groupGrid.itemEditor = TextInputGridItemEditor;
		this.groupGrid.percentWidth = 100;
		this.groupGrid.percentHeight = 100;
		this.groupGrid.dataProvider = this._groupList;
		this.groupGrid.addEventListener(eui.GridItemEditorEvent.GRID_ITEM_EDITOR_SESSION_SAVE, this.groupItemEditSaveHandler, this);
		this.groupGrid.addEventListener(eui.GridSelectionEvent.SELECTION_CHANGE, this.groupSelectChangeHandler, this);
		this.groupGrid.addEventListener(eui.UIEventEx.VALUE_COMMIT, this.groupSelectChangeHandler, this);
		this.groupGrid.itemRenderer = ResGroupItemRender;
		this.groupGrid.selectedIndex = 0;
		this.groupGrid.requireSelection = true;
		let columns: eui.ArrayCollection = new eui.ArrayCollection();
		let gridColumn: eui.GridColumn = new eui.GridColumn();
		gridColumn.dataField = 'groupName';
		gridColumn.headerText = nls.localize('res.editor.groupName', 'Group Name');
		columns.addItem(gridColumn);
		this.groupGrid.columns = columns;
		gridHGroup.addChild(this.groupGrid);
		// Shortcut.addRegister(this.groupGrid, ShortcutType.DELETE, this.deleteGroup_handler);

		var group: eui.Group = new eui.Group();
		group.percentHeight = 100;
		gridHGroup.addChild(group);
		this.groupErrorPosShow.top = 20;
		this.groupErrorPosShow.bottom = 0;
		this.groupErrorPosShow.onTurnTo = this.onGroupGridTurnToHandler;
		group.addChild(this.groupErrorPosShow);

		this.groupResGrid.skinName = 'skins.DataGridResSkin';
		this.groupResGrid.scroller.enableMouseDrag = false;
		this.groupResGrid.selectionMode = eui.GridSelectionMode.MULTIPLE_ROWS;
		// this.groupResGrid.editable = false;
		this.groupResGrid.percentWidth = 80;
		this.groupResGrid.percentHeight = 100;
		this.groupResGrid.dataProvider = this._groupResList;
		this.groupResGrid.itemRenderer = ResGroupResItemRender;

		// this.groupResGrid.addEventListener(egret.MouseEvent.CLICK, this.onGroupResGridClick, this);	//根本不需要这个监听。 点击之后在grid内部已经处理了点击事件和item的选择，然后发出的VALUE_COMMIT事件
		this.groupResGrid.addEventListener(eui.GridItemEditorEvent.GRID_ITEM_EDITOR_SESSION_SAVE, this.onGroupResGridEditSaveHandler, this);
		this.groupResGrid.addEventListener(eui.UIEventEx.VALUE_COMMIT, this.groupResSelectionChanged, this);

		this.groupDragBehavior.init(this.groupResGrid);
		this.groupResGrid.editable = true;
		this.groupResGrid.editOnMouseUp = false;
		this.groupResGrid.selectedByKeyboard = true;


		columns = new eui.ArrayCollection();
		gridColumn = new eui.GridColumn();
		gridColumn.dataField = 'itemName';
		gridColumn.editable = true;
		gridColumn.headerText = nls.localize('res.editor.itemName', 'Name');
		gridColumn.width = 290;
		columns.addItem(gridColumn);

		gridColumn = new eui.GridColumn();
		gridColumn.dataField = 'itemUrl';
		gridColumn.editable = false;
		gridColumn.headerText = nls.localize('res.editor.itemUrl', 'Url');
		// gridColumn.width = 250;
		columns.addItem(gridColumn);
		this.groupResGrid.columns = columns;
		// Shortcut.addRegister(this.groupResGrid, ShortcutType.SELECT_ALL, this.selectAll_handler)
		// Shortcut.addRegister(this.groupResGrid, ShortcutType.DELETE, this.deleteGroupRes_handler);
		hGroup.addChild(this.groupResGrid);
		this.resGroup.width = 15;
		this.resGroup.percentHeight = 100;
		hGroup.addChild(this.resGroup);

		this.resErrorBar.top = 26;
		this.resErrorBar.bottom = 0;
		this.resErrorBar.percentWidth = 100;
		this.resErrorBar.itemHeight = 25;
		this.resErrorBar.scrollCB = (per: number) => {
			this.groupResGrid.scroller.viewport.scrollV = per;
		};

		this.statusBar.percentWidth = 100;
		vGroup.addChild(this.statusBar);

		this.addDragEvents();
		this.addGlobEvents();
	}
	//当前的主题
	private m_theme: string;

	private addDragEvents() {
		this.groupResGrid.addEventListener(eui.DragEvent.DRAG_ENTER, this.onGroupResGridDragEnter, this);
		this.groupResGrid.addEventListener(eui.DragEvent.DRAG_EXIT, this.onGroupResGridDragExit, this);
		this.groupResGrid.addEventListener(eui.DragEvent.DRAG_DROP, this.onGroupResGridDragDrop, this);

		this.groupResGrid.addEventListener(egret.NativeDragEvent.NATIVE_DRAG_OVER, this.groupResGrid_NativeEnter, this);
		this.groupResGrid.addEventListener(egret.NativeDragEvent.NATIVE_DRAG_EXIT, this.groupResGrid_NativeExit, this);
		this.groupResGrid.addEventListener(egret.NativeDragEvent.NATIVE_DRAG_DROP, this.groupResGrid_NativeDrop, this);
	}
	private removeDragEvents() {
		this.groupResGrid.removeEventListener(eui.DragEvent.DRAG_ENTER, this.onGroupResGridDragEnter, this);
		this.groupResGrid.removeEventListener(eui.DragEvent.DRAG_EXIT, this.onGroupResGridDragExit, this);
		this.groupResGrid.removeEventListener(eui.DragEvent.DRAG_DROP, this.onGroupResGridDragDrop, this);

		this.groupResGrid.removeEventListener(egret.NativeDragEvent.NATIVE_DRAG_OVER, this.groupResGrid_NativeEnter, this);
		this.groupResGrid.removeEventListener(egret.NativeDragEvent.NATIVE_DRAG_EXIT, this.groupResGrid_NativeExit, this);
		this.groupResGrid.removeEventListener(egret.NativeDragEvent.NATIVE_DRAG_DROP, this.groupResGrid_NativeDrop, this);

	}
	private addGlobEvents() {
		this.resEventService.addListen(ResGlobalEvents.DELETE_RES_IN_GROUP_GRID, this.onGlobDelGridRes, this);
		this.resEventService.addListen(ResGlobalEvents.DELETE_GROUP, this.onGlobDelGroup, this);
		this.resEventService.addListen(ResGlobalEvents.GROUP_FRESH, this.onGlobGroupFresh, this);
		this.resEventService.addListen(ResGlobalEvents.GROUP_GRID_FRESH, this.onGlobGroupGridFresh, this);
		this.resEventService.addListen(ResGlobalEvents.TOUCH_TREE_ITEM, this.onTouchTreeItem, this);
		this.resEventService.addListen(ResGlobalEvents.ERROR_FRESH_GROUP_AREA, this.onGlobErrorFresh, this);
	}
	private removeGlobEvents() {
		this.resEventService.removeListen(ResGlobalEvents.DELETE_RES_IN_GROUP_GRID, this.onGlobDelGridRes, this);
		this.resEventService.removeListen(ResGlobalEvents.DELETE_GROUP, this.onGlobDelGroup, this);
		this.resEventService.removeListen(ResGlobalEvents.GROUP_FRESH, this.onGlobGroupFresh, this);
		this.resEventService.removeListen(ResGlobalEvents.GROUP_GRID_FRESH, this.onGlobGroupGridFresh, this);
		this.resEventService.removeListen(ResGlobalEvents.TOUCH_TREE_ITEM, this.onTouchTreeItem, this);
		this.resEventService.removeListen(ResGlobalEvents.ERROR_FRESH_GROUP_AREA, this.onGlobErrorFresh, this);
	}

	private groupBorder: eui.Rect;
	private groupResBorder: eui.Rect;
	/**
	 * 显示拖拽区
	 * @param target 目标显示区域对象
	 * @param show 是否显示
	 * @param showColorType 显示颜色类型，正常/警告/错误
	 */
	private showDragArea(target: any, show: boolean, showColorType?: string) {
		let colorValue: number = 0x6dff66;
		switch (showColorType) {
			case 'normal':
				colorValue = 0x6dff66;
				break;
			case 'warning':
				colorValue = 0xfff330;
				break;
			case 'error':
				colorValue = 0xff0000;
				break;
			case 'drag':
				colorValue = 0x396895;
				break;
			default:
				colorValue = 0x6dff66;
				break;
		}

		if (target === this.groupGrid) {
			if (!this.groupBorder) {
				this.groupBorder = new eui.Rect();
				this.groupBorder.touchEnabled = this.groupBorder.touchChildren = false;
				this.groupBorder.strokeAlpha = 0.8;
				this.groupBorder.strokeWeight = 3;
				this.groupBorder.fillAlpha = 0;
				this.groupBorder.top = this.groupBorder.bottom = this.groupBorder.left = this.groupBorder.right = 0;
				this.groupGrid.addChild(this.groupBorder);
			}
			this.groupBorder.strokeColor = colorValue;
			this.groupBorder.visible = show;
		} else if (target === this.groupResGrid) {
			if (!this.groupResBorder) {
				this.groupResBorder = new eui.Rect();
				this.groupResBorder.touchEnabled = this.groupResBorder.touchChildren = false;
				this.groupResBorder.strokeAlpha = 0.8;
				this.groupResBorder.strokeWeight = 3;
				this.groupResBorder.fillAlpha = 0;
				this.groupResBorder.top = this.groupResBorder.bottom = this.groupResBorder.left = this.groupResBorder.right = 0;
				this.groupResGrid.addChild(this.groupResBorder);
			}
			this.groupResBorder.strokeColor = colorValue;
			this.groupResBorder.visible = show;
		}
	}

	private onGroupResGridDragEnter(event: eui.DragEvent) {
		eui.DragManager.acceptDragDrop(this.groupResGrid);
		this.showDragArea(this.groupResGrid, true, 'drag');
	}
	private onGroupResGridDragExit(event: eui.DragEvent) {
		this.showDragArea(this.groupResGrid, false, 'drag');
	}
	/**从tree拖入的资源 */
	private onGroupResGridDragDrop(event: eui.DragEvent) {
		this.showDragArea(this.groupResGrid, false, 'drag');

		eui.DragManager.endDrag();
		var ds: eui.DragSource = event.dragSource;
		if (ds.hasFormat('drag_data')) {
			var dragData: any = ds.dataForFormat('drag_data');
			let drag_in_items: any[] = dragData;
			let vos: ResInfoVO[] = [];
			for (let i: number = 0; i < drag_in_items.length; i++) {
				let item: any = drag_in_items[i];
				if (item instanceof TreeLeafNode) {
					if (vos.indexOf(item.resvo) === -1) {
						vos.push(item.resvo);
					}
				} else if (item instanceof TreeParentNode) {
					let nodes: TreeLeafNode[] = ResTreeModel.getAllLeafChildren(item);
					for (let k: number = 0; k < nodes.length; k++) {
						if (vos.indexOf(nodes[k].resvo) === -1) {
							vos.push(nodes[k].resvo);
						}
					}
				}
			}

			if (vos.length) {
				var group: GroupInfoVO = null;
				if (this.groupGrid.selectedIndex !== -1) {
					var item: any = this._groupList.getItemAt(this.groupGrid.selectedIndex);
					group = item.info;
				}
				if (group) {
					let resvo: ResInfoVO;
					for (let i: number = 0; i < vos.length; i++) {
						resvo = vos[i];
						group.addResInfoVO(resvo);
					}
					this.curSelectResVO = vos;//先设置选择的项数据，已经变化了
					this.updateGroupRes();
					this.resEventService.sendEvent(ResGlobalEvents.Json_Modifyed);
				}
			}
		}
	}

	private groupResGrid_NativeEnter(event: egret.NativeDragEvent) {
		this.showDragArea(this.groupResGrid, true, 'drag');
		event.dropAction = egret.NativeDragActions.COPY;
		// console.log('groupResGrid_NativeEnter');
	}
	private groupResGrid_NativeExit(event: egret.NativeDragEvent) {
		this.showDragArea(this.groupResGrid, false, 'drag');
		// console.log('groupResGrid_NativeExit');
	}
	private groupResGrid_NativeDrop(event: egret.NativeDragEvent) {
		this.showDragArea(this.groupResGrid, false, 'drag');
		// console.log('groupResGrid_NativeDrop');
	}

	/** 删除组内的资源 */
	private onGlobDelGridRes(resvo: ResInfoVO) {
		// console.log(resvo);
		// console.log(this.groupResGrid.selectedItems);
		var group: GroupInfoVO = null;
		if (this.groupGrid.selectedIndex !== -1) {
			var item: any = this._groupList.getItemAt(this.groupGrid.selectedIndex);
			group = item.info;
		}
		if (group) {
			let delVOs: ResInfoVO[] = [];
			if (this.groupResGrid.selectedItems && this.groupResGrid.selectedItems.length) {
				for (let i: number = 0; i < this.groupResGrid.selectedItems.length; i++) {
					delVOs.push(this.groupResGrid.selectedItems[i]['info']);
				}
			}
			if (delVOs.indexOf(resvo) === -1) {
				delVOs.length = 0;
				delVOs.push(resvo);
			}

			for (let i: number = 0; i < delVOs.length; i++) {
				let index: number = group.childList.indexOf(delVOs[i]);
				if (index !== -1) {
					group.childList.splice(index, 1);
				}
			}
			this.updateGroupRes();
			this.updateGroupErrorStat();
			this.resEventService.sendEvent(ResGlobalEvents.Json_Modifyed, null);
		}
	}
	/** 更新组的错误信息*/
	private updateGroupErrorStat() {
		this.checkError();
	}

	/**
	 * 删除组
	 * @param toDelGVO 要删除的项，不一定是当前所选项。可以删除非选择项
	 */
	private onGlobDelGroup(toDelGVO: GroupInfoVO) {
		// console.log(this.groupGrid.selectedItems);
		let delGVOs: GroupInfoVO[] = [];
		if (this.groupGrid.selectedItems && this.groupGrid.selectedItems.length) {
			for (let i: number = 0; i < this.groupGrid.selectedItems.length; i++) {
				delGVOs.push(this.groupGrid.selectedItems[i]['info']);
			}
		}
		if (delGVOs.indexOf(toDelGVO) === -1) {//如果要删除的项不在当前所选的项中，则只删除该项
			delGVOs.length = 0;
			delGVOs.push(toDelGVO);
		}

		for (let i: number = 0; i < delGVOs.length; i++) {
			let index: number = this.resModel.groupList.indexOf(delGVOs[i]);
			if (index !== -1) {
				this.resModel.groupList.splice(index, 1);
				this.deleteGroup(delGVOs[i]);
			}
		}
		this.updateGroupErrorStat();
		this.resEventService.sendEvent(ResGlobalEvents.Json_Modifyed, null);
	}
	/** 刷新group */
	private onGlobGroupFresh() {

	}
	/** 刷新group grid */
	private onGlobGroupGridFresh(resvo: ResInfoVO) {
		this.updateList();
		this.updateGroupRes();
		this.updateGroupErrorStat();
	}
	private updateList() {
		this._resList.removeAll();
		for (let i: number = 0; i < this.resModel.resList.length; i++) {
			this._resList.addItem(this.resModel.resList[i]);
		}
	}

	public updateView() {
		this.updateList();
		this._groupList.removeAll();
		this.addGroups(this.resModel.groupList);// 组的数据
		this.checkError();
	}


	private addGroup_handler(v) {
		if (v) {
			var groupInfoVO: GroupInfoVO = new GroupInfoVO();
			groupInfoVO.groupName = v;
			for (let i: number = 0; i < this.resModel.groupList.length; i++) {
				if (this.resModel.groupList[i].groupName === v) {
					return;
				}
			}
			this.resModel.groupList.push(groupInfoVO);
			this.addGroups([groupInfoVO]);
			this.updateGroupErrorStat();
			this.resEventService.sendEvent(ResGlobalEvents.Json_Modifyed, null);
		}
	}


	private grouppanel: GroupWindow;
	protected addGroupClickHandler(event: egret.MouseEvent) {
		if (!this.grouppanel) {
			// TODO RES
			this.grouppanel = new GroupWindow((v) => { this.addGroup_handler(v); });
			// this.grouppanel = ReactServiceHost.instance.instanceService.createInstance(GroupPanelReact, (v) => { this.addGroup_handler(v); });
		}
		this.grouppanel.open('root', true);
		// var grouppanel:GroupPanelReact = ReactServiceHost.instance.instanceService.createInstance(GroupPanelReact,(v) => {this.addGroup_handler(v);});
		// grouppanel.open();
	}





	//通过拖拽的行为添加资源到组，同时将新的资源添加到资源列表。
	private onLoadUrlsToGroup_handler = (urls: Array<any>) => {
		var group: GroupInfoVO = null;
		if (this.groupGrid.selectedIndex !== -1) {
			var item: any = this._groupList.getItemAt(this.groupGrid.selectedIndex);
			group = item.info;
		}
		if (group) {
			this.resModel.filterDragInFiles(urls).then(ret => {
				if (!urls.length) {
					return;
				}

				//去除res.json数据中的sheet的图片，和组里的相关数据
				this.resModel.delSheetPic(ret).then(resolve2 => {
					let delVOs: ResInfoVO[] = resolve2;
					if (delVOs && delVOs.length) {

					}
					if (urls && urls.length) {
						this.resModel.addReses(urls).then(addedReses => {
							if (addedReses.length) {
								for (let i: number = 0; i < addedReses.length; i++) {
									if (group.childList.indexOf(addedReses[i]) === -1) {
										group.addResInfoVO(addedReses[i]);
									}
								}
								this.updateGroupRes();
								this.updateGroupErrorStat();
								this.resEventService.sendEvent(ResGlobalEvents.UPDATE_TREE_VIEW);
								egret.callLater(() => {//在下一帧设置状态
									this.setSelectItem(addedReses[addedReses.length - 1]);//拖入的资源设置为选中状态
									this.resEventService.sendEvent(ResGlobalEvents.UPDATE_PREVIEW, this.curSelectResVO);
									this.resEventService.sendEvent(ResGlobalEvents.UPDATE_INFO_AREA, this.curSelectResVO);
									this.resEventService.sendEvent(ResGlobalEvents.SHOW_ITEM_IN_TREE, addedReses);
									this.resEventService.sendEvent(ResGlobalEvents.GROUP_GRID_FRESH);
								}, this);
								this.resEventService.sendEvent(ResGlobalEvents.Json_Modifyed);
							}
						});
					}
				});
			});
		}
	}

	/**
	 * 添加多个资源组
	 * @param groupInfoVOs
	 *
	 */
	public addGroups(groupInfoVOs: Array<GroupInfoVO>) {
		for (var i: number = 0; i < groupInfoVOs.length; i++) {
			var obj: any = ResPanelUtil.createObjForGroupGrid(groupInfoVOs[i]);
			this._groupList.addItem(obj);
		}
		if (this.groupGrid && this.groupGrid.selectedIndex === -1) {
			this.groupGrid.selectedIndex = 0;
		}
		this.updateGroupRes();
	}

	/**
	 * 删除多个资源
	 */
	public deleteReses(resInfoVOs: Array<ResInfoVO>) {

	}
	/**
	 * 删除资源组显示
	 * @param groupInfoVO
	 */
	public deleteGroup(groupInfoVO: GroupInfoVO) {
		for (let i: number = 0; i < this._groupList.length; i++) {
			let item: any = this._groupList.getItemAt(i);
			if (item.info === groupInfoVO) {
				this._groupList.removeItemAt(i);
				i--;
			}
		}
		if (this._groupList.length === 0) {//当最后一个组删除需要刷新右侧的组内资源区
			this.updateGroupRes();
		}
	}
	//当资源组的选择项改变的时候
	private groupSelectChangeHandler(event: eui.GridSelectionEvent) {
		this.updateGroupRes();
	}
	/** 当前选择的资源/多项资源 */
	private curSelectResVO: ResInfoVO | ResInfoVO[];

	/**
	 * 更新组内资源的显示
	 * @param resvo 只更新这一项
	 */
	public updateGroupRes(resvo?: ResInfoVO) {
		if (resvo) {//刷新这一项
			if (this.groupGrid && this.groupGrid.selectedItem) {
				let index: number = this.groupGrid.selectedItem.info.childList.indexOf(resvo);
				if (index !== -1) {
					let obj: any = this._groupResList.getItemAt(index);
					ResPanelUtil.updateObjForResGrid(obj, resvo);
					this._groupResList.itemUpdated(obj);
					this.groupResGrid.setSelectedIndex(index, false);
				}
			}
		} else {//刷新整个组
			//重置状态
			for (let i: number = 0; i < this._groupResList.length; i++) {
				let vo: ResInfoVO = this._groupResList.getItemAt(i).info;
				vo.inCurrentGroup = false;
			}

			this._groupResList.removeAll();
			var item: any = this._groupList.getItemAt(this.groupGrid.selectedIndex);
			if (item) {
				var group: GroupInfoVO = item.info;
				for (let i: number = 0; i < group.childList.length; i++) {
					let obj: any = {};
					this._groupResList.addItem(obj);
					group.childList[i].inCurrentGroup = true;
					ResPanelUtil.updateObjForResGrid(obj, group.childList[i]);
				}
				this.setSelectItem(this.curSelectResVO);
			}
			this.resEventService.sendEvent(ResGlobalEvents.UPDATE_RENDER_INCURRENTGROUP);
		}
		if (this.tempTimeID > 0) {
			clearTimeout(this.tempTimeID);
		}
		this.tempTimeID = setTimeout(this.updateResGroupErrorBar.bind(this), 100) as any;
	}

	private tempTimeID: number = 0;
	private updateResGroupErrorBar(): void {
		var len: number = this._groupResList.length;
		this.resErrorBar.clear();
		this.resErrorBar.itemTotal = len;
		var has: boolean = false;
		for (var i: number = 0; i < len; i++) {
			let vo: ResInfoVO = this._groupResList.getItemAt(i).info;
			if (vo.fileError) {
				has = true;
				this.resErrorBar.pushItem({ color: 0xcccc00, index: i });
			}
		}
		if (has) {
			this.resGroup.addChild(this.resErrorBar);
		}
		else {
			this.resGroup.addChild(this.resErrorBar);
		}

		this.resErrorBar.render();
	}
	/**
	 * 设置组资源选择项，返回选择项的resvo
	 * 支持选择多项
	 */
	private setSelectItem(resInfoVOs: ResInfoVO | ResInfoVO[]) {
		let selected_vos: ResInfoVO[] = [];
		let vos: ResInfoVO[];
		let select_indexs: number[] = [];
		if (resInfoVOs) {//重新设置选择的项
			if (resInfoVOs instanceof ResInfoVO) {
				vos = [<ResInfoVO>resInfoVOs];
			} else {
				vos = resInfoVOs;
			}
			for (let i: number = 0; i < vos.length; i++) {
				let resvo: ResInfoVO = vos[i];
				for (let i: number = 0; i < this._groupResList.length; i++) {
					let item: any = this._groupResList.getItemAt(i);
					if (item.info === resvo) {
						select_indexs.push(i);
						selected_vos.push(resvo);
						break;
					}
				}
			}
		}
		if (!selected_vos.length) {//选择项为空
			this.groupResGrid.clearSelection(false);
		} else {
			this.groupResGrid.selectedIndices = select_indexs;
			this.groupResGrid.ensureIndexIsVisible(select_indexs[0]);
			// console.log('selected index:', select_indexs.join(','));
		}
		this.curSelectResVO = vos;
	}
	/** 与tree的点击联动 */
	private onTouchTreeItem(nodes: any[]) {
		if (nodes.length) {
			let vos: ResInfoVO[] = [];
			for (let i: number = 0; i < nodes.length; i++) {
				if (nodes[i].resvo && vos.indexOf(nodes[i].resvo) === -1) {
					vos.push(nodes[i].resvo);
				}
			}
			this.setSelectItem(vos);
		} else {
			this.setSelectItem(null);
		}
	}

	// private onGroupResGridClick(event: egret.Event) {
	// 	if (this.groupResGrid.selectedItems) {
	// 		let select_vos: ResInfoVO[] = [];
	// 		for (let i: number = 0; i < this.groupResGrid.selectedItems.length; i++) {
	// 			select_vos.push(this.groupResGrid.selectedItems[i]['info']);
	// 		}
	// 		this.curSelectResVO = select_vos;
	// 	} else {
	// 		this.curSelectResVO = null;
	// 	}

	// 	ResGlobalEventManager.sendEvent(ResGlobalEvents.UPDATE_PREVIEW, this.curSelectResVO);
	// 	ResGlobalEventManager.sendEvent(ResGlobalEvents.UPDATE_INFO_AREA, this.curSelectResVO);
	// 	ResGlobalEventManager.sendEvent(ResGlobalEvents.SHOW_ITEM_IN_TREE, this.curSelectResVO);
	// }

	private groupResSelectionChanged() {
		if (this.groupResGrid.selectedItems && this.groupGrid.selectedItems.length > 0) {
			let select_vos: ResInfoVO[] = [];
			for (let i: number = 0; i < this.groupResGrid.selectedItems.length; i++) {
				select_vos.push(this.groupResGrid.selectedItems[i]['info']);
			}
			this.curSelectResVO = select_vos;
		} else if (this.groupResGrid.selectedItem && this.groupResGrid.selectedItem['info']) {
			this.curSelectResVO = this.groupResGrid.selectedItem['info'];
		} else {
			this.curSelectResVO = null;
		}

		this.resEventService.sendEvent(ResGlobalEvents.UPDATE_PREVIEW, this.curSelectResVO);
		this.resEventService.sendEvent(ResGlobalEvents.UPDATE_INFO_AREA, this.curSelectResVO);
		this.resEventService.sendEvent(ResGlobalEvents.SHOW_ITEM_IN_TREE, this.curSelectResVO);


		// if (this.groupResGrid.selectedItem && this.groupResGrid.selectedItem['info']) {
		// 	this.curSelectResVO = this.groupResGrid.selectedItem['info'];
		// ResGlobalEventManager.sendEvent(ResGlobalEvents.UPDATE_PREVIEW, this.curSelectResVO);
		// ResGlobalEventManager.sendEvent(ResGlobalEvents.UPDATE_INFO_AREA, this.curSelectResVO);
		// ResGlobalEventManager.sendEvent(ResGlobalEvents.SHOW_ITEM_IN_TREE, this.curSelectResVO);
		// }
	}

	/** 修改组的名字*/
	protected groupItemEditSaveHandler(event: eui.GridItemEditorEvent) {
		var data: any = this._groupList.getItemAt(event.rowIndex);
		if (!data) {
			return;
		}
		var groupName: string = data.groupName;
		let g: GroupInfoVO = this.resModel.groupList[event.rowIndex];
		if (groupName === g.groupName) {
			return;
		}
		if (!groupName) {
			data.groupName = g.groupName;//组名不能为空
		} else {
			g.groupName = groupName;
			this.updateGroupErrorStat();
			this.resEventService.sendEvent(ResGlobalEvents.Json_Modifyed, null);
		}
	}
	/** 资源项的名字被改了 */
	private onGroupResGridEditSaveHandler(event: eui.GridItemEditorEvent) {
		let data: any = this._groupResList.getItemAt(event.rowIndex);
		if (!data) {
			return;
		}
		let resvo: ResInfoVO = data.info;
		if (resvo) {
			if (data.itemName === resvo.name) {
				return;
			}
			if (!data.itemName) {
				data.itemName = resvo.name;
			} else {
				resvo.name = data.itemName;
				this.updateGroupErrorStat();
				this.resEventService.sendEvent(ResGlobalEvents.Json_Modifyed, null);
				// ResGlobalEventManager.sendEvent(ResGlobalEvents.UPDATE_TREE_VIEW, resvo);


				this.resEventService.sendEvent(ResGlobalEvents.UPDATE_INFO_AREA, resvo);
			}
		}
	}
	/**转到组的行 */
	private onGroupGridTurnToHandler = (line: number) => {
		this.groupGrid.grid.dataGrid.scroller.viewport.scrollV = line * 25;
	}

	public clear() {
		this._groupList.removeAll();
		this._groupResList.removeAll();
	}

	private onGlobErrorFresh() {
		this.resModel.checkSameName().then(resolve => {
			this.checkError();
		});
	}
	public checkError() {
		var resErrorLines: Array<any> = [];
		var resWarningLines: Array<any> = [];
		// var groupErrorLines: Array<any> = [];
		var errorRes: number = 0;
		var errorGroup: number = 0;
		var otherError: number = 0;
		var fileError: number = 0;
		var subError: number = 0;//不影响资源发布
		var groupNum: number = this._groupList.length;
		for (var j: number = 0; j < groupNum; j++) {
			var groupItem: any = this._groupList.getItemAt(j);
			var groupInfoVO: GroupInfoVO = groupItem.info;
			var groupResLength: number = groupInfoVO.childList.length;
			var groupFileErrorNum: number = 0;
			for (var i: number = 0; i < groupResLength; i++) {
				var resInfoVO: ResInfoVO = groupInfoVO.childList[i];
				if (resInfoVO.isSameName) {
					errorRes++;
					resErrorLines.push(i);
				}
				if (resInfoVO.subError) {
					subError++;
					resWarningLines.push(i);
				}
				if (resInfoVO.otherError) {
					otherError++;
					resErrorLines.push(i);
				}
				if (resInfoVO.fileError) {
					fileError++;
					groupFileErrorNum++;
					resWarningLines.push(i);
				}
			}
			// if(groupInfoVO.fileErrorNum){
			groupItem.fileErrorNum = groupFileErrorNum;
			// }
			if (groupInfoVO.isSameName === true) {
				errorGroup++;
				// groupErrorLines.push(i);
			}
			this._groupList.itemUpdated(groupItem);
		}
		var textStr: string = '';
		if (errorGroup === 0 && errorRes === 0 && otherError === 0 && fileError === 0 && subError === 0) {
			textStr += '<font color=\'#fefefe\' size=\'12\'>' + (nls.localize('res.editor.ready', 'Ready')) + '</font>';
		} else {
			if (errorRes !== 0) {
				textStr += '<font color=\'#ff0000\' size=\'12\'>' + (nls.localize('res.editor.resNameError', 'Resource name error quantity：{0}', errorRes)) + '  </font>';
			}
			if (errorGroup !== 0) {
				textStr += '<font color=\'#ff0000\' size=\'12\'>' + (nls.localize('res.editor.resGroupError', 'Resource group error quantity：{0}', errorGroup)) + '  </font>';
			}
			if (otherError !== 0) {
				textStr += '<font color=\'#ff0000\' size=\'12\'>' + (nls.localize('res.editor.otherError', 'other error quantity：{0}', otherError)) + '  </font>';
			}
			if (fileError !== 0) {
				textStr += '<font color=\'#FF6600\' size=\'12\'>' + (nls.localize('res.editor.filePathError', 'File path error or file parse failed: {0}', fileError)) + '  </font>';
			}
			if (subError !== 0) {
				textStr += '<font color=\'#FF6600\' size=\'12\'>' + (nls.localize('res.editor.subError', 'Two level Key warning: {0}', subError)) + '  </font>';
			}
		}
		//将htmlText转为textFlow显示富文本
		let textFlow: egret.ITextElement[] = new egret.HtmlTextParser().parser(textStr);
		this.statusBar.status = textFlow;
	}

	public destory() {
		this.modifyed = false;
		this.removeDragEvents();
		this.removeGlobEvents();
	}
}