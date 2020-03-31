// import * as paths from 'vs/base/common/paths';
// import * as pfs from 'vs/base/node/pfs';

import { ResTree } from 'egret/exts/resdepot/components/ResTree';
// import {AppStorage} from 'wing/src/parts/resdepot/common/storage/AppStorage';
// import {TreeItemEvent} from 'wing/src/parts/resdepot/events/TreeItemEvent';
import { ErrorPosShow } from 'egret/exts/resdepot/components/ErrorPosShow';
// import {TreeLeafNode, TreeParentNode} from 'wing/src/parts/resdepot/common/model/TreeModel';

import { IResEventService } from 'egret/exts/resdepot/events/ResEventService';
import { ResGlobalEvents } from 'egret/exts/resdepot/events/ResGlobalEvents';
import { ResModel } from 'egret/exts/resdepot/common/model/ResModel';
import { TreeSearchHelper } from 'egret/exts/resdepot/common/utils/TreeSearchHelper';
import { localize } from 'egret/base/localization/nls';
import { isMacintosh } from 'egret/base/common/platform';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
/**
 * 资源树区域代理
 */
export class ResTreeArea {
	private resModel: ResModel;
	public treePro: ResTree = this.instantiationService.createInstance(ResTree);

	private treeGroup: eui.Group;
	// private previewCheckBox: eui.CheckBox;
	private resErrorPosShow: ErrorPosShow = new ErrorPosShow();

	public searchInput: eui.TextInput = new eui.TextInput();
	private expandBtn: eui.Button;
	private emptyTips: eui.Image;//资源树为空时的提示图片
	//当前的主题
	private m_theme: string;
	constructor(_treeGroup: eui.Group, _reslib: ResModel,
		@IResEventService private resEventService: IResEventService,
		@IInstantiationService private instantiationService: IInstantiationService) {
		//获取主题
		this.m_theme = document.body.classList[1];
		this.treeGroup = _treeGroup;
		this.resModel = _reslib;

		let rect: eui.Rect = new eui.Rect();/// 资源区背景纯色
		rect.fillColor = 0x3b3b3b;
		rect.strokeColor = 0x2b2b2b;
		rect.strokeAlpha = 1;
		rect.strokeWeight = 1;
		rect.top = 0;
		rect.left = 0;
		rect.right = rect.bottom = 0;
		this.treeGroup.addChild(rect);

		var vGroup: eui.Group = new eui.Group();
		var vL: eui.VerticalLayout = new eui.VerticalLayout();
		vGroup.layout = vL;
		vGroup.top = vGroup.left = vGroup.right = vGroup.bottom = 5;
		this.treeGroup.addChild(vGroup);

		this.searchInput.skinName = 'skins.MaterialPanelTextInputSkin';// 用默认皮肤，必须先设置皮肤，否则没有promptDisplay，textDisplay
		this.searchInput.textDisplay.fontFamily = isMacintosh ? 'PingFangSC-Regular' : 'Microsoft YaHei';
		this.searchInput.prompt = localize('res.editor.materialSearchPrompt', '/Start with matching folders');
		if (this.searchInput.promptDisplay) {///需要先设置皮肤才会有promptDisplay组件
			this.searchInput.promptDisplay.fontFamily = isMacintosh ? 'PingFangSC-Regular' : 'Microsoft YaHei';
			this.searchInput.promptDisplay.multiline = false;
			this.searchInput.promptDisplay.wordWrap = false;
			this.searchInput.promptDisplay.maxHeight = 15;//设置提示文本框的最大高度，否则宽度过小会自动换行
			this.searchInput.promptDisplay.percentWidth = 100;
		}
		this.searchInput.percentWidth = 100;///设置为变长的输入文本会导致文本内容过长时自动换行，文本高度自动变大
		// this.searchInput.width = 3000;///设置为定长文本不会有换行问题
		this.searchInput.maxChars = 60;
		this.searchInput.cursor = egret.MouseCursor.IBEAM;//文本框的光标
		this.searchInput.textDisplay.type = egret.TextFieldType.INPUT;
		this.searchInput.textDisplay.multiline = false;
		this.searchInput.textDisplay.maxHeight = 23;
		this.searchInput.textDisplay.size = 12;
		// vGroup.addChild(this.searchInput);

		let searchHelper: TreeSearchHelper = new TreeSearchHelper();
		searchHelper.treePro = this.treePro;
		searchHelper.treeDp = this.treePro.treeDp;
		searchHelper.searchInput = this.searchInput;
		searchHelper.enabel_tree_search = true;
		searchHelper.searchType = 'resdepot';
		searchHelper.init();
		searchHelper.addEventListener(TreeSearchHelper.EVENT_SELECT_ITEM, this.onSelectTreeItem, this);


		var hGroup: eui.Group = new eui.Group();
		var hL: eui.HorizontalLayout = new eui.HorizontalLayout();
		hL.verticalAlign = egret.VerticalAlign.MIDDLE;
		hGroup.layout = hL;
		hGroup.percentWidth = 100;
		vGroup.addChild(hGroup);

		this.expandBtn = new eui.Button();
		this.expandBtn.skinName = 'skins.TreeExpandButtonSkin';
		this.expandBtn.icon = 'expand_shallow_png';// expand_shallow_png/collapse_shallow_png
		this.expandBtn.addEventListener(egret.MouseEvent.CLICK, this.onClickExpandButton, this);
		hGroup.addChild(this.expandBtn);
		hGroup.addChild(this.searchInput);


		var gridHGroup: eui.Group = new eui.Group();
		hL = new eui.HorizontalLayout();
		hL.gap = 2;
		gridHGroup.layout = hL;
		vGroup.addChild(gridHGroup);
		gridHGroup.percentHeight = gridHGroup.percentWidth = 100;
		/// 资源树
		this.treePro.resModel = this.resModel;
		// this.treePro.addEventListener(TreeItemEvent.TOUCH, this.treeItemTouched, this);
		this.treePro.addEventListener(egret.Event.CHANGE, this.onTreeChange, this);

		// 给treePro添加滚动条
		var treeScroll: eui.Scroller = new eui.Scroller();
		treeScroll.skinName = 'skins.ScrollerSkin';
		treeScroll.percentWidth = 100;
		treeScroll.percentHeight = 100;
		treeScroll.minHeight = 0;
		treeScroll.minWidth = 0;
		treeScroll.top = 30;
		treeScroll.bottom = 0;
		treeScroll.left = treeScroll.right = 0;
		treeScroll.viewport = this.treePro;

		treeScroll.autoHideScrollBar = true;
		treeScroll.bounces = false;
		treeScroll.enableMouseDrag = false;
		this.treePro.selectedByKeyboard = true;
		this.treePro.keyboardUpAndDownLoop = true;
		treeScroll.scrollPolicyV = eui.ScrollPolicy.AUTO;
		gridHGroup.addChild(treeScroll);

		let errGroup: eui.Group = new eui.Group();
		errGroup.percentHeight = 100;
		gridHGroup.addChild(errGroup);
		this.resErrorPosShow.top = 20;
		this.resErrorPosShow.bottom = 0;
		this.resErrorPosShow.onTurnTo = this.onResGridTurnToHandler;
		errGroup.addChild(this.resErrorPosShow);

		this.emptyTips = new eui.Image();
		this.emptyTips.source = 'drophere_svg';
		this.emptyTips.horizontalCenter = 0;
		// this.emptyTips.verticalCenter = 0;
		// this.emptyTips.includeInLayout = false;
		this.emptyTips.touchEnabled = false;
		this.emptyTips.bottom = 50;
		this.treeGroup.addChild(this.emptyTips);

		this.addGlobalEvents();
		this.addDragEvents();
	}

	private addGlobalEvents() {
		this.resEventService.addListen(ResGlobalEvents.UPDATE_TREE_VIEW, this.updateView, this);
	}
	private removeGlobalEvents() {
		this.resEventService.removeListen(ResGlobalEvents.UPDATE_TREE_VIEW, this.updateView, this);
	}

	private addDragEvents() {
		this.treePro.addEventListener(egret.NativeDragEvent.NATIVE_DRAG_ENTER, this.treePro_NativeEnter, this);
		this.treePro.addEventListener(egret.NativeDragEvent.NATIVE_DRAG_EXIT, this.treePro_NativeExit, this);
		this.treePro.addEventListener(egret.NativeDragEvent.NATIVE_DRAG_DROP, this.treePro_NativeDrop, this);
		this.treePro.addEventListener(egret.NativeDragEvent.NATIVE_DRAG_COMPLETE, this.treePro_NativeComplete, this);
		this.treePro.addEventListener(egret.NativeDragEvent.NATIVE_DRAG_OVER, this.treePro_NativeOVer, this);
	}
	private removeDragEvents() {
		this.treePro.removeEventListener(egret.NativeDragEvent.NATIVE_DRAG_ENTER, this.treePro_NativeEnter, this);
		this.treePro.removeEventListener(egret.NativeDragEvent.NATIVE_DRAG_EXIT, this.treePro_NativeExit, this);
		this.treePro.removeEventListener(egret.NativeDragEvent.NATIVE_DRAG_DROP, this.treePro_NativeDrop, this);
		this.treePro.removeEventListener(egret.NativeDragEvent.NATIVE_DRAG_COMPLETE, this.treePro_NativeComplete, this);
		this.treePro.removeEventListener(egret.NativeDragEvent.NATIVE_DRAG_OVER, this.treePro_NativeOVer, this);
	}
	private treePro_NativeEnter(event: egret.NativeDragEvent) {
		event.dropAction = egret.NativeDragActions.COPY;
		// console.log('treePro_NativeEnter');
		this.showDragArea(this.treePro, true, 'drag');
	}
	private treePro_NativeExit(event) {
		// console.log('treePro_NativeExit');
		this.showDragArea(this.treePro, false, 'drag');
	}
	private treePro_NativeDrop(event) {
		//  console.log('treePro_NativeDrop');
		this.showDragArea(this.treePro, false, 'drag');
	}

	private treePro_NativeComplete(event) {
		// console.log('treePro_NativeComplete');
		this.showDragArea(this.treePro, true, 'drag');
	}

	private treePro_NativeOVer(event) {
		event.dropAction = egret.NativeDragActions.COPY;
		// console.log('treePro_NativeOVer');
		this.showDragArea(this.treePro, true, 'drag');
	}

	public updateView() {
		this.treePro.resourcePath = this.resModel.resRoot;
		this.treePro.treeModel.updateData([this.resModel.resList]);
		this.treePro.updateTreeView();
	}

	public clear() {

	}

	private onClickExpandButton(event: egret.MouseEvent) {
		if (this.expandBtn.icon === 'collapse_shallow_png') {//折叠
			this.expandBtn.icon = 'expand_shallow_png';
			for (let i: number = 0; i < this.treePro.treeDp.length; i++) {
				let element = this.treePro.treeDp.getItemAt(i);
				if (this.treePro.treeDp.isItemOpen(element)) {
					this.treePro.treeDp.expandItem(element, false);
				}
			}
		} else {//展开
			this.expandBtn.icon = 'collapse_shallow_png';
			for (let i: number = 0; i < this.treePro.treeDp.length; i++) {
				let element = this.treePro.treeDp.getItemAt(i);
				if (!this.treePro.treeDp.isItemOpen(element)) {
					this.treePro.treeDp.expandItem(element, true);
				}
			}
		}
	}
	private treeBorder: eui.Rect;
	/**
	 * 显示拖拽区
	 * @param target 目标显示区域对象
	 * @param show 是否显示
	 * @param showColorType 显示颜色类型，正常/警告/错误
	 */
	private showDragArea(target: any, show: boolean, showColorType?: string) {
		if (target === this.treePro) {
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
			if (!this.treeBorder) {
				this.treeBorder = new eui.Rect();
				this.treeBorder.strokeAlpha = 0.8;
				this.treeBorder.strokeWeight = 3;
				this.treeBorder.fillAlpha = 0;
				this.treeBorder.touchEnabled = this.treeBorder.touchChildren = false;
				this.treeBorder.top = this.treeBorder.bottom = this.treeBorder.left = this.treeBorder.right = 0;
				this.treeGroup.addChild(this.treeBorder);

			}
			this.treeBorder.strokeColor = colorValue;
			this.treeBorder.visible = show;
		}
	}


	/**转到资源列表的错误行 */
	private onResGridTurnToHandler = (line: number) => {

	}
	// protected previewChangedHandler(event: egret.Event) {
	// 	AppStorage.preview = this.previewCheckBox.selected;
	// 	ResGlobalEventManager.sendEvent(ResGlobalEvents.PREVIEW_CHANGE_CLICK, this.previewCheckBox.selected);
	// }

	// /** 点击了item后更新预览区和9切信息，TOUCH后也会触发CHANGE事件 */
	// private treeItemTouched(event: TreeItemEvent): void {
	// 	var node = event.data;//TreeNodeBase
	// 	ResGlobalEventManager.sendEvent(ResGlobalEvents.TOUCH_TREE_ITEM, node);
	// }
	/** 通过键盘上下选择item后要更新预览区 */
	private onTreeChange(event: egret.Event) {
		let tree: ResTree = event.currentTarget;
		this.resEventService.sendEvent(ResGlobalEvents.TOUCH_TREE_ITEM, tree.selectedItems);
	}
	/**
	 * 搜索时通过up/down移动选择tree项，不会触发CHANGE事件
	 */
	private onSelectTreeItem(event: egret.Event) {
		this.resEventService.sendEvent(ResGlobalEvents.TOUCH_TREE_ITEM, this.treePro.selectedItems);//event.data
	}

	public destory(): void {
		// this.previewCheckBox.removeEventListener(egret.Event.CHANGE, this.previewChangedHandler, this);
		// this.treePro.removeEventListener(TreeItemEvent.TOUCH, this.treeItemTouched, this);
		this.treePro.removeEventListener(egret.Event.CHANGE, this.onTreeChange, this);

		this.treePro.destory();
		this.treePro = null;
		this.removeGlobalEvents();
		this.removeDragEvents();
	}
}