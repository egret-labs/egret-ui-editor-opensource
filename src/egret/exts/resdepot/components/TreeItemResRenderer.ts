/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fsextra from 'fs-extra';

import {MaterialTreeResIcon} from 'egret/exts/resdepot/common/model/MaterialTreeResIcon';
import {TreeNodeType, TreeNodeBase, TreeParentNode, TreeLeafNode} from 'egret/exts/resdepot/common/model/TreeModel';
import {TreeItemEvent} from 'egret/exts/resdepot/events/TreeItemEvent';
// import {ResType} from 'wing/src/parts/resdepot/common/consts/ResType';
import {ResUtil} from 'egret/exts/resdepot/common/utils/ResUtil';
import { isMacintosh } from 'egret/base/common/platform';
/**
 * 资源库的ItemRender
 */
export class TreeItemResRenderer extends eui.TreeItemRenderer implements eui.ITreeItemRenderer {
	/**
	 * [SkinPart]图标
	 */
	protected iconDisplay: eui.Image;
	/**
	 * [SkinPart]文本
	 */
	protected labelDisplay: eui.Label;

	private editButton: eui.Button;

	//当前的主题
	public m_theme: string;
	public constructor() {
		super();
		//获取主题
		this.m_theme = document.body.classList[1];
		// this.touchChildren = false;
		this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.onTreeItemResRenderer_TouchTap, this, false, 100);
		egret.registerClass(TreeItemResRenderer, 'TreeItemResRenderer', ['eui.ITreeItemRenderer']);
		this.addEventListener(egret.Event.COMPLETE, this.onLoadComplete, this);
	}
	//当设置skinName为外部exml文件路径时，加载并完成EXML解析后调度。
	private onLoadComplete(event: egret.Event): void {
		this.removeEventListener(egret.Event.COMPLETE, this.onLoadComplete, this);
	}

	private onTreeItemResRenderer_TouchTap(event: egret.TouchEvent): void {
		if (event.target === this.disclosureButton) {
			event.stopImmediatePropagation();
		} else if (event.target === this.editButton) {
			return;
		}
		var e: TreeItemEvent = new TreeItemEvent(TreeItemEvent.TOUCH, true);
		e.data = this.data;
		this.dispatchEvent(e);
	}

	/**设置项的图标 */
	public updateDisPlayIcon(): void {
		// 根据打开状态设置图标
		var node: TreeNodeBase = <TreeNodeBase>this.data;
		if (!node) {
			return;
		}

		if (node.isFolder) {//判断是不是文件夹
			if (node['resvo'] && node['resvo'].fileError) {
				this.iconDisplay.source = null;
				return;
			}
			if (TreeNodeType.SHEET === node.type) {//sheet文件夹的图标打开时保持不变
				var sheetNode: TreeParentNode = <TreeParentNode>node;
				// 先显示sheet为默认的sheet图标，防止sheet的json或者图片被删除的情况下无法显示图片
				if (RES.hasRes(sheetNode.icon)) {
					node.icon = sheetNode.icon;
					this.iconDisplay.source = sheetNode.icon;
				}
				// 再显示sheet为大图，如果sheet的json或者图片不存在则继续显示默认sheet图标
				let url: string = sheetNode['resvo'].locolUrl;
				ResUtil.getSheetPicPath(url).then(retPath => {
					if (retPath && retPath.length) {
						let picfilePath: string = retPath;
						fsextra.pathExists(picfilePath).then(picfileExits => {
							if (picfileExits) {
								ResUtil.getResByUrl(picfilePath, (r: egret.Texture) => {
									this.iconDisplay.source = r;
								}, this, RES.ResourceItem.TYPE_IMAGE);
							}
						});
					}
				});
			} else if (TreeNodeType.JSON === node.type) {
				// resjson类型不改变图标
				this.iconDisplay.source = MaterialTreeResIcon.ICON_JSON;
			} else {
				if (this['_isOpen']) {
					if (RES.hasRes(MaterialTreeResIcon.ICON_FOLDER_Open) && RES.hasRes(MaterialTreeResIcon.ICON_FOLDER_Open_LIGHT)) {
						node.icon = MaterialTreeResIcon.ICON_FOLDER_Open;
						this.iconDisplay.source = MaterialTreeResIcon.ICON_FOLDER_Open;// 设置node.icon的方式有些情况下来不及更改图标，通过source来更新图标
					}
				} else {
					if (RES.hasRes(MaterialTreeResIcon.ICON_FOLDER) && RES.hasRes(MaterialTreeResIcon.ICON_FOLDER_LIGHT)) {
						node.icon = MaterialTreeResIcon.ICON_FOLDER;
						this.iconDisplay.source = MaterialTreeResIcon.ICON_FOLDER;
					}
				}
			}
			var parentNode: TreeParentNode = <TreeParentNode>node;// 是个叶节点/文件夹
			// 文件夹没有子项后不显示disclosureButton
			this.hasChildren = parentNode.children.length > 0;
		} else {
			let leaf: TreeLeafNode = <TreeLeafNode>node;

			if (leaf.resvo.type === TreeNodeType.IMAGE) {
				if (leaf.resvo.fileError) {//文件不存在就不读取图标了
					this.iconDisplay.source = null;
				} else {
					// this.iconDisplay.source = leaf.resvo.locolUrl;///不能直接取缓存里的图片，本地可能已经更新了
					ResUtil.getResByUrl(leaf.resvo.locolUrl+'?rand='+Math.random(), (r) => {
						this.iconDisplay.source = r;
					}, this, RES.ResourceItem.TYPE_IMAGE);
				}
			} else if (leaf.resvo.type === TreeNodeType.SHEET) {
				if (leaf.resvo.fileError) {
					this.iconDisplay.source = null;
					return;
				}
				let url: string = leaf.resvo.locolUrl;
				ResUtil.getSheetPicPath(url).then(retPath => {
					if (retPath && retPath.length) {
						let picfilePath: string = retPath;
						fsextra.pathExists(picfilePath).then(picfileExits => {
							if (picfileExits) {
								ResUtil.getResByUrl(url, (r: egret.SpriteSheet) => {
									if (r) {
										this.iconDisplay.source = r.getTexture(leaf.label);
									}
								}, this, RES.ResourceItem.TYPE_SHEET);
							}
						});
					}
				});

			}
		}
		//this.invalidateState();
	}

	protected dataChanged() {
		super.dataChanged();
		this.labelDisplay.fontFamily = isMacintosh ? 'PingFangSC-Regular' : 'Microsoft YaHei';
		// 设置样式文本
		if (this.data.textFlow && this.data.textFlow.length > 0) {
			this.labelDisplay.textFlow = this.data.textFlow;
			// this.labelDisplay.textColor = 0x000;
			// var a = 1;
			// a+=1;
		} else {
			this.labelDisplay.textFlow = null;// 文本无样式要置空
			this.labelDisplay.text = this.defaultLabelText();
			// var textColor = setThemeBindData(this.m_theme,0x767472,0xc2c2c2);
			// this.labelDisplay.textColor = 0x000;
		}
		this.updateDisPlayIcon();// 数据更改之后需要刷新文件夹图标
		this.showResEditButton();
	}

	/**显示为资源名 */
	protected defaultLabelText(): string {
		return ResUtil.getRenderLabel('material', this.data);
	}

	private showResEditButton() {
		var node: TreeNodeBase = this.data;
		if (!node) {
			return;
		}
		if (TreeNodeType.JSON === node.type) {
			if (!this.editButton) {
				this.editButton = new eui.Button();
				this.addChild(this.editButton);
				this.editButton.skinName = 'skins.IconButtonSkin';
				this.editButton.icon = 'edit_png';
				this.editButton.width = this.editButton.height = 23;
				this.editButton.right = 0;
				this.editButton.addEventListener(egret.MouseEvent.CLICK, this.onEditResJsonClick, this);
			}
		} else {
			if (this.editButton) {
				this.editButton.parent.removeChild(this.editButton);
				this.editButton.removeEventListener(egret.MouseEvent.CLICK, this.onEditResJsonClick, this);
				this.editButton = null;
			}
		}
	}

	// 打开res编辑器
	private onEditResJsonClick(event: MouseEvent): void {
		event.stopImmediatePropagation();
		var e: TreeItemEvent = new TreeItemEvent('open_resjson', true);
		e.data = this.data.label;
		this.dispatchEvent(e);
	}
}