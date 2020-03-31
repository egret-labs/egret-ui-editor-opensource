// import * as paths from 'vs/base/common/paths';

import {TreeItemResRenderer} from 'egret/exts/resdepot/components/TreeItemResRenderer';
import {TreeNodeBase, TreeLeafNode, TreeParentNode} from 'egret/exts/resdepot/common/model/TreeModel';
import {ResType} from 'egret/exts/resdepot/common/consts/ResType';
import {ResUtil} from 'egret/exts/resdepot/common/utils/ResUtil';
import {ResInfoVO} from 'egret/exts/resdepot/common/model/ResInfoVO';
import {SheetSubVO} from 'egret/exts/resdepot/common/model/SheetSubVO';
import {ResRightMenu} from 'egret/exts/resdepot/components/ResRightMenu';

import {IResEventService} from 'egret/exts/resdepot/events/ResEventService';
import {ResGlobalEvents} from 'egret/exts/resdepot/events/ResGlobalEvents';

/**
 * resdepot的树
 */
export class TreeItemResdepotRenderer extends TreeItemResRenderer {
	private rightKeyMenu: ResRightMenu = new ResRightMenu();

	constructor() {
		super();
		this.addEventListener(egret.MouseEvent.RIGHT_MOUSE_DOWN, this.onRightMouseDown, this);
		this.addEventListener(egret.Event.ADDED_TO_STAGE, this.addToStage, this);
		this.addEventListener(egret.Event.REMOVED_FROM_STAGE, this.removeToStage, this);
	}

	private _resEventService:IResEventService;
	private get resEventService(): IResEventService {
		if(!this._resEventService){
			this._resEventService = this.parent['resEventService'];
		}
		return this._resEventService;
	}

	private addToStage(): void {
		this.resEventService.addListen(ResGlobalEvents.FRESH_RESVO_SAME_NAME, this.onGlobFreshResSameName, this);
		this.resEventService.addListen(ResGlobalEvents.UPDATE_RENDER_INCURRENTGROUP, this.onGlobUpdateInCurrentGroup, this);
	}

	private removeToStage(): void {
		this.resEventService.removeListen(ResGlobalEvents.FRESH_RESVO_SAME_NAME, this.onGlobFreshResSameName, this);
		this.resEventService.removeListen(ResGlobalEvents.UPDATE_RENDER_INCURRENTGROUP, this.onGlobUpdateInCurrentGroup, this);
	}

	/** 背景条，选择状态 */
	private bgSelect: eui.Rect;
	private showBGSelect(show?: boolean) {
		if (!this.bgSelect) {
			this.bgSelect = new eui.Rect();
			this.bgSelect.fillAlpha = 0.1;
			this.bgSelect.fillColor = 0x000000;
			this.bgSelect.strokeAlpha = 0.2;
			this.bgSelect.strokeColor = 0xaaaaaa;
			this.bgSelect.strokeWeight = 1;
			this.bgSelect.left = this.bgSelect.top = 1;
			this.bgSelect.right = this.bgSelect.bottom = 1;
			this.bgSelect.touchEnabled = this.bgSelect.touchChildren = false;
			// this.addChildAt(this.bgSelect, 0);
			this.addChild(this.bgSelect);
		}
		// console.log(this.data && this.data.label, this.hashCode, this.bgSelect.hashCode, this.bgSelect.visible, show);
		this.bgSelect.visible = show;
	}

	private onRightMouseDown(event: egret.MouseEvent): void {
		// this.clearCursor();
		// 添加右键菜单
		this.rightKeyMenu.setResEventService(this.resEventService);
		if (this.data instanceof TreeLeafNode) {
			let leaf: TreeLeafNode = this.data;
			if (leaf.resvo.type === ResType.TYPE_SHEET) {//叶节点类型为sheet则为subkey节点
				//subkey不弹右键删除的菜单
				return;
			} else {
				if (leaf.resvo.type === ResType.TYPE_IMAGE) {
					this.rightKeyMenu.showMenu([ResRightMenu.LABELS.SCALE9_GRID, ResRightMenu.LABELS.DELETE_RES, ResRightMenu.LABELS.OPEN_IN_FOLDER],
						[ResRightMenu.IDS.SCALE9_GRID, ResRightMenu.IDS.DELETE_RES, ResRightMenu.IDS.OPEN_IN_FOLDER]);
				} else {
					this.rightKeyMenu.showMenu([ResRightMenu.LABELS.DELETE_RES, ResRightMenu.LABELS.OPEN_IN_FOLDER],
						[ResRightMenu.IDS.DELETE_RES, ResRightMenu.IDS.OPEN_IN_FOLDER]);
				}
			}
		} else {
			if (this.data.resvo && this.data.resvo.type === ResType.TYPE_SHEET) {
				this.rightKeyMenu.showMenu([ResRightMenu.LABELS.FRESH_SHEET, ResRightMenu.LABELS.DELETE_RES, ResRightMenu.LABELS.OPEN_IN_FOLDER],
					[ResRightMenu.IDS.FRESH_SHEET, ResRightMenu.IDS.DELETE_RES, ResRightMenu.IDS.OPEN_IN_FOLDER]);
			} else {
				this.rightKeyMenu.showMenu([ResRightMenu.LABELS.DELETE_RES, ResRightMenu.LABELS.OPEN_IN_FOLDER],
					[ResRightMenu.IDS.DELETE_RES, ResRightMenu.IDS.OPEN_IN_FOLDER]);
			}
		}

		this.rightKeyMenu.data = this.data;
		this.rightKeyMenu.rightMenu.display(this.stage, this.stage.mouseX, this.stage.mouseY);
	}

	protected dataChanged() {
		super.dataChanged();
		this.onGlobFreshResSameName();
		this.onGlobUpdateInCurrentGroup();
	}

	/**显示为目录结构，文件名 */
	protected defaultLabelText(): string {
		return ResUtil.getRenderLabel('resdepot', this.data);
	}

	private onGlobFreshResSameName() {
		let errorType: number = 0;
		let node: TreeNodeBase = this.data;
		if (node['resvo']) {
			let resvo: ResInfoVO = node['resvo'];
			if (resvo.fileError) {
				errorType = 2;
			}
		}
		if (node.isSameName) {
			errorType = 1;
		}
		if (node instanceof TreeLeafNode) {
			if (node.resvo.type === ResType.TYPE_SHEET && node.resvo.subList) {
				for (let i: number = 0; i < node.resvo.subList.length; i++) {
					let subvo: SheetSubVO = node.resvo.subList[i];
					if (subvo.name === node.label) {
						if (subvo.isSameName) {
							errorType = 2;
						} else {
							errorType = 0;
						}
					}
				}
			}
		} else if (node instanceof TreeParentNode) {
			if(node.fileErrorNum>0){
				errorType = 2;
			}
			if (node.type === ResType.TYPE_SHEET) {
				let resvo: ResInfoVO = node['resvo'];
				if (resvo.subError && errorType !== 1) {
					errorType = 2;
				}
			}
		}

		switch (errorType) {
			case 0:
				this.labelDisplay.textColor = 0xFFFFFF;
				break;
			case 1:
				this.labelDisplay.textColor = 0xFF8247;
				break;
			case 2:
				this.labelDisplay.textColor = 0xfff330;
				break;
		}

	}
	/** 切换了组 */
	private onGlobUpdateInCurrentGroup() {
		if (this.data && this.data.resvo && this.data.resvo.inCurrentGroup) {
			this.showBGSelect(true);
		} else {
			this.showBGSelect(false);
		}
	}
}