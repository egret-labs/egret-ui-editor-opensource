/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as paths from 'egret/base/common/paths';
import { TreeModel, TreeNodeType, TreeLeafNode, TreeParentNode } from 'egret/exts/resdepot/common/model/TreeModel';
import { ResType } from 'egret/exts/resdepot/common/consts/ResType';
import { ResInfoVO } from 'egret/exts/resdepot/common/model/ResInfoVO';
import { MaterialTreeResIcon } from 'egret/exts/resdepot/common/model/MaterialTreeResIcon';
import { SheetSubVO } from 'egret/exts/resdepot/common/model/SheetSubVO';

/**
 * 构造资源库的树
 */
export class MatTreeModel extends TreeModel {
	private $data: any[];
	public treeDataProvider: egret.HashObject = new egret.HashObject();// 用于显示的tree的数据

	/**
	 * 更新数据
	 */
	public updateData(data = null): void {
		this.$data = data;
		this.updateTreeData();
	}

	private treeDataArr: Array<any> = [];
	/**
	 * 更新tree的数据，数据修改后要及时更新
	 */
	public updateTreeData(): void {
		let pNode: TreeParentNode;
		let rootNodes = [];
		this.treeDataArr.length = 0;
		if (this.$data && this.$data.length > 0) {
			for (var listIndex: number = 0; listIndex < this.$data.length; listIndex++) {
				pNode = new TreeParentNode();
				pNode.label = this.$data[listIndex].file;
				pNode.isFolder = true;
				pNode.icon = 'json_svg';
				pNode.type = TreeNodeType.JSON;
				pNode.children = [];
				rootNodes.push(pNode);
				this.treeDataArr = pNode.children;
				this.addReses(this.$data[listIndex].res);

			}
		}
		this.sortT(rootNodes);
		this.treeDataProvider = new egret.HashObject();///创建新的对象，否则外层不知道数据产生改变
		this.treeDataProvider['children'] = rootNodes;
		this.filter(this.treeDataProvider);
	}

	public addReses(reses: ResInfoVO[]) {
		for (let i: number = 0; i < reses.length; i++) {
			this.addOneRes(reses[i]);
		}
	}
	/** 对数据源进行一次全面排序，从叶节点退至根节点排序 */
	public sort() {
		this.sortT(this.treeDataArr);
	}
	/** 嵌套排序 */
	private sortT(target: any) {
		if (target) {
			if (target.length) {
				for (let i: number = 0; i < target.length; i++) {
					this.sortT(target[i]);
				}
				target.sort(this.sortOnName);
			}
			if (target.children && target.children.length) {
				for (let i: number = 0; i < target.children.length; i++) {
					this.sortT(target.children[i]);
				}
				target.children.sort(this.sortOnName);
			}
		}
	}
	private filter(target: any): void {
		if (target.children) {
			for (var i = 0; i < target.children.length; i++) {
				if (target.children[i].children && target.children[i].children.length === 0) {
					target.children.splice(i, 1);
					i--;
				}
			}
			for (i = 0; i < target.children.length; i++) {
				this.filter(target.children[i]);
			}
		}
	}
	/**
	 * 向tree中添加数据，创建不存在的枝节点和叶节点。
	 * @param resvo 根据resvo的url来创建枝和叶
	 */
	private addOneRes(resvo: ResInfoVO) {
		let tempArr: Array<any> = this.treeDataArr;
		let normalizePath: string = paths.join(paths.dirname(paths.normalize(resvo.showUrl)), '');//join可以自动去掉多余的/
		let pathSplits: string[] = normalizePath.split('/');// tree显示的资源目录，是相对于rootPath的相对目录结构
		for (let i: number = 0; i < pathSplits.length; i++) {// folder
			let folderName: string = pathSplits[i];
			if ('' === folderName) {
				continue;
			}
			let pNode: TreeParentNode = <TreeParentNode>this.findFromArr(folderName, tempArr, 'label');
			if (!pNode) {
				pNode = new TreeParentNode();
				pNode.icon = MaterialTreeResIcon.ICON_FOLDER;
				pNode.label = folderName;
				pNode.isFolder = true;
				pNode.children = [];
				tempArr.push(pNode);
			}
			tempArr = pNode.children;
		}


		let lNode: TreeLeafNode;
		let nodeLabel: string = '';
		nodeLabel = resvo.name;
		lNode = this.findFromArr(nodeLabel, tempArr);/// 资源库不创建重名的资源。
		if (!lNode) {// file
			lNode = new TreeLeafNode();
			lNode.label = nodeLabel;
			lNode.resname = resvo.name;
			lNode.resvo = resvo;
			switch (resvo.type) {
				case ResType.TYPE_IMAGE:
					lNode.icon = MaterialTreeResIcon.ICON_UIASSET;
					tempArr.push(lNode);
					break;
				case ResType.TYPE_SOUND:
					lNode.icon = MaterialTreeResIcon.ICON_UIMOVIECLIP;
					break;
				case ResType.TYPE_SHEET:
					let pNode: TreeParentNode = new TreeParentNode();
					pNode.icon = MaterialTreeResIcon.ICON_SHEET;
					pNode.label = nodeLabel;
					pNode.isFolder = true;
					pNode.type = TreeNodeType.SHEET;// 设置类型，在文件夹打开时
					pNode.children = [];
					pNode['resvo'] = resvo;//sheet 类型的文件特殊处理下，把resvo信息保存进来

					if (resvo.subList && resvo.subList.length) {
						for (var sheetIndex: number = 0; sheetIndex < resvo.subList.length; sheetIndex++) {
							let lNode: TreeLeafNode = new TreeLeafNode();
							lNode.icon = MaterialTreeResIcon.ICON_UIASSET;
							let sheetvo: SheetSubVO = resvo.subList[sheetIndex];
							lNode.label = sheetvo.name;
							lNode.resname = resvo.name;
							lNode.resvo = resvo;
							pNode.children.push(lNode);
						}
						// pNode.children.sort(this.sortOnName);
					}
					tempArr.push(pNode);
					break;
				case ResType.TYPE_JSON:
					break;
				case ResType.TYPE_TEXT:
					break;
				case ResType.TYPE_FONT:
					break;
				default:
					lNode.isFolder = false;
					lNode.icon = '';// 默认不显示图片ts_png
					break;
			}
		}
	}
	/** 排序 */
	private sortOnName(a: any, b: any): number {
		if (a.label && b.label) {
			return a.label.localeCompare(b.label);
		}
		return 0;
	}

	/**
	 * 从数组里找对象
	 * @param value 要查询的值
	 * @param arr 查询数组
	 * @param field 查询的域名
	 * @return 返回值
	 */
	private findFromArr(value: string, arr: Array<any>, field: string = 'label'): any {
		for (var i: number = 0; i < arr.length; i++) {
			var item: any = arr[i];
			if (item[field] === value) {
				return arr[i];
			}
		}
		return null;
	}
}