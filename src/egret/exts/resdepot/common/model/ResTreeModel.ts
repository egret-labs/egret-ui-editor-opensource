/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as paths from 'egret/base/common/paths';
import { TreeModel, TreeNodeType, TreeModelSourceType, TreeNodeBase, TreeLeafNode, TreeParentNode } from 'egret/exts/resdepot/common/model/TreeModel';
import { ResType } from 'egret/exts/resdepot/common/consts/ResType';
import { ResInfoVO } from 'egret/exts/resdepot/common/model/ResInfoVO';
import { MaterialTreeResIcon } from 'egret/exts/resdepot/common/model/MaterialTreeResIcon';
import { SheetSubVO } from 'egret/exts/resdepot/common/model/SheetSubVO';

import { IResEventService } from 'egret/exts/resdepot/events/ResEventService';
import { ResGlobalEvents } from 'egret/exts/resdepot/events/ResGlobalEvents';

/**
 * 构造resjson的树
 */
export class ResTreeModel extends TreeModel {
	private _sourceResLists: Array<any>;// 外部传入的原始数据 - 多个资源列表
	public treeDataProvider: egret.HashObject = new egret.HashObject();// 用于显示的tree的数据

	private sourceType: TreeModelSourceType;

	public constructor(_resLists: Array<any> = null, 
		_sourceType: TreeModelSourceType = TreeModelSourceType.RESLIB,
		@IResEventService private resEventService: IResEventService) {
		super();
		this.sourceType = _sourceType;
		this.updateData(_resLists);
		this.resEventService.addListen(ResGlobalEvents.TREE_SAME_NAME, this.onRefreshReses, this);
	}

	public getSourceResList(): Array<any> {
		return this._sourceResLists;
	}
	/**
	 * 更新数据
	 */
	public updateData(_resLists: Array<any> = null): void {
		this._sourceResLists = _resLists;
		this.updateTreeData();
	}

	private treeDataArr: Array<any> = [];
	/**
	 * 更新tree的数据，数据修改后要及时更新
	 */
	public updateTreeData(): void {
		this.treeDataArr.length = 0;///必须置空，否则外部修改了res.json再刷新时会有老数据残留
		if (this._sourceResLists && this._sourceResLists.length > 0) {
			for (var listIndex: number = 0; listIndex < this._sourceResLists.length; listIndex++) {
				this.addReses(this._sourceResLists[listIndex]);//res.json中的重复资源项数据要创建多个叶节点
				// this.treeDataArr[0].children.sort(this.sortOnName);
			}
			// this.treeDataArr.sort(this.sortOnName);
			this.sort();
		}

		this.treeDataProvider = new egret.HashObject();///创建新的对象，否则外层不知道数据产生改变
		this.treeDataProvider['children'] = this.treeDataArr;
		this.onRefreshReses();
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


	private updateFileErrorNum(): void {
		let tempArr: Array<any> = this.treeDataArr;
		tempArr.forEach(item => {
			if (item instanceof TreeParentNode) {
				this.calculChildErrorNum(item);
			}
		});
	}

	private calculChildErrorNum(parent: TreeParentNode): void {
		var num: number = 0;
		parent.children.forEach((item: TreeNodeBase) => {
			if (item instanceof TreeParentNode) {
				this.calculChildErrorNum(item);
				num += (item as TreeParentNode).fileErrorNum;
			}
			else if (item instanceof TreeLeafNode) {
				if (item.resvo.fileError) {
					num++;
				}
			}
		});
		parent.fileErrorNum = num;
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

		/// 关于创建重复的叶。资源库中不要创建重复的叶节点，在resdepot的restree中数据重复的项创建多个叶节点，否则无法区分项。往restree拖入已经存在的资源不要创建重复的项
		let lNode: TreeLeafNode;
		let nodeLabel: string = '';
		if (this.sourceType === TreeModelSourceType.RESDEPOT) {//resdepot中显示文件路径，按照路径来构建树
			nodeLabel = paths.basename(resvo.showUrl);
			lNode = <TreeLeafNode>this.findNodeByResvo(resvo, tempArr);//resdepot可以创建重名的资源
		} else if (this.sourceType === TreeModelSourceType.RESLIB) {//资源库中按照资源名来构建树
			nodeLabel = resvo.name;
			lNode = this.findFromArr(nodeLabel, tempArr);/// 资源库不创建重名的资源。
		}

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
					if (this.sourceType === TreeModelSourceType.RESDEPOT) {
						tempArr.push(lNode);
					}
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
					if (this.sourceType === TreeModelSourceType.RESDEPOT) {
						lNode.icon = MaterialTreeResIcon.ICON_JSON;
						tempArr.push(lNode);
					}
					break;
				case ResType.TYPE_TEXT:
					if (this.sourceType === TreeModelSourceType.RESDEPOT) {
						lNode.icon = MaterialTreeResIcon.ICON_Default;
						tempArr.push(lNode);
					}
					break;
				case ResType.TYPE_FONT:
					if (this.sourceType === TreeModelSourceType.RESDEPOT) {
						lNode.icon = MaterialTreeResIcon.ICON_Default;
						tempArr.push(lNode);
					}
					break;
				default:
					lNode.isFolder = false;
					lNode.icon = '';// 默认不显示图片ts_png
					tempArr.push(lNode);
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
	/** 更新一个资源 */
	public updateOneRes(resvo: ResInfoVO) {
		let tempArr: Array<any> = this.treeDataArr;
		let normalizePath: string = paths.join(paths.dirname(paths.normalize(resvo.showUrl)), '');//join可以自动去掉多余的/
		let pathSplits: string[] = normalizePath.split('/');// tree显示的资源目录，是相对于rootPath的相对目录结构
		for (let i: number = 0; i < pathSplits.length; i++) {// folder
			let folderName: string = pathSplits[i];
			if ('' === folderName) {
				continue;
			}
			let pNode: TreeParentNode = <TreeParentNode>this.findFromArr(folderName, tempArr, 'label');
			if (pNode) {
				tempArr = pNode.children;
			} else {
				return;
			}
		}

		let nodeLabel: string = '';
		if (this.sourceType === TreeModelSourceType.RESDEPOT) {//resdepot中显示文件路径，按照路径来构建树
			nodeLabel = paths.basename(resvo.showUrl);
		} else if (this.sourceType === TreeModelSourceType.RESLIB) {//资源库中按照资源名来构建树
			nodeLabel = resvo.name;
		}
		let node = this.findNodeByResvo(resvo, tempArr);
		if (node instanceof TreeParentNode) {
			if ((<any>node).resvo === resvo && resvo.type === ResType.TYPE_SHEET) {
				node.children = [];
				if (resvo.subList && resvo.subList.length) {
					for (var sheetIndex: number = 0; sheetIndex < resvo.subList.length; sheetIndex++) {
						let lNode: TreeLeafNode = new TreeLeafNode();
						lNode.icon = MaterialTreeResIcon.ICON_UIASSET;
						let sheetvo: SheetSubVO = resvo.subList[sheetIndex];
						lNode.label = sheetvo.name;
						lNode.resname = resvo.name;
						lNode.resvo = resvo;
						node.children.push(lNode);
					}
				}
			}
		}
	}

	public delReses(reses: ResInfoVO[]) {
		for (let i: number = 0; i < reses.length; i++) {
			this.delOneRes(reses[i]);
		}
	}
	/** 删除一个资源 */
	public delOneRes(resvo: ResInfoVO) {
		let delnodes: TreeNodeBase[] = [];

		let tempArr: Array<any> = this.treeDataArr;
		let pathSplits: string[] = paths.join(paths.dirname(resvo.showUrl), '').split('/');// tree显示的资源目录，是相对于rootPath的相对目录结构
		for (let i: number = 0; i < pathSplits.length; i++) {// folder
			let folderName: string = pathSplits[i];
			if ('' === folderName) {
				// console.error('empty foldername');
				break;
			}
			let pNode: TreeParentNode = <TreeParentNode>this.findFromArr(folderName, tempArr, 'label');
			if (!pNode) {
				break;
			} else {
				delnodes.push(pNode);
				tempArr = pNode.children;
			}
		}

		//file
		let nodeLabel: string = '';
		if (this.sourceType === TreeModelSourceType.RESDEPOT) {//resdepot中显示文件路径，按照路径来构建树
			nodeLabel = paths.basename(resvo.showUrl);
		} else if (this.sourceType === TreeModelSourceType.RESLIB) {//资源库中按照资源名来构建树
			nodeLabel = resvo.name;
		}
		let node: TreeNodeBase = <TreeLeafNode>this.findNodeByResvo(resvo, tempArr);
		delnodes.push(node);
		if (node instanceof TreeParentNode) {
			if (node.type === ResType.TYPE_SHEET) {//sheet文件需要删除所有的子叶节点
				for (let i: number = 0; i < node.children.length; i++) {
					delnodes.push(node.children[i]);
				}
			}
		}

		let del = (node: any, nodeArr: any[]) => {
			if (node) {
				let node2 = nodeArr.pop();
				if (node2) {
					//删除所有的sheet叶
					while ((node instanceof TreeLeafNode) && node.resvo.type === ResType.TYPE_SHEET) {
						if (node2 && (node2 instanceof TreeLeafNode) && (node2.resvo.type === ResType.TYPE_SHEET)) {
							node = node2;
							node2 = nodeArr.pop();
						} else if (node2 && (node2 instanceof TreeParentNode)) {
							node2.children.length = 0;
							del(node2, nodeArr);
							return;
						}
					}
					if (node2.children) {
						let i: number = node2.children.indexOf(node);
						if (i !== -1) {
							if (node instanceof TreeLeafNode) {
								node2.children.splice(i, 1);
							} else if (node instanceof TreeParentNode) {
								if (node.children.length === 0) {
									node2.children.splice(i, 1);
								} else {//遇到子项不空的枝节点不能删除，后续的父节点也不可删除，循环到此截至
									return;
								}
							}
						}
						del(node2, nodeArr);
					}
				} else {
					if (node && node.children && node.children.length === 0) {
						//删除根节点
						// console.log(node, tempArr, this.treeDataArr);
						if (this.treeDataArr.indexOf(node) !== -1) {
							this.treeDataArr.splice(this.treeDataArr.indexOf(node), 1);
						}
					} else {

					}
				}
			}
		};

		del(delnodes.pop(), delnodes);
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
	/**
	 * 找数据为resvo的node对象
	 */
	private findNodeByResvo(resvo: ResInfoVO, arr: any[]): any {
		for (let i: number = 0; i < arr.length; i++) {
			let item = arr[i];
			if (item.resvo === resvo) {
				return item;
			}
		}
		return null;
	}
	/**取叶节点的所有子代leafNode */
	public static getAllLeafChildren(n: TreeNodeBase): Array<TreeLeafNode> {
		let nodes: Array<TreeLeafNode> = [];
		if (n instanceof TreeLeafNode) {
			nodes.push(n);
		} else if (n instanceof TreeParentNode) {
			if (n.children && n.children.length) {
				for (let i: number = 0; i < n.children.length; i++) {
					let c2 = n.children[i];
					if (c2 instanceof TreeLeafNode) {
						nodes.push(c2);
					} else if (c2 instanceof TreeParentNode) {
						nodes = nodes.concat(ResTreeModel.getAllLeafChildren(c2));
					}
				}
			}
		}
		return nodes;
	}

	/** 重新计算树的数据是否重复 */
	public onRefreshReses() {
		let rootChildren: any[] = this.treeDataProvider['children'];
		if (rootChildren && rootChildren.length) {
			for (let i: number = 0; i < rootChildren.length; i++) {
				this.resetSameName(rootChildren[i]);
			}
			this.updateFileErrorNum();
			this.resEventService.sendEvent(ResGlobalEvents.FRESH_RESVO_SAME_NAME);//通知render刷新状态
		}
	}
	/**从根节点开始，刷新整个树的节点，检查是否处于冲突状态 */
	private resetSameName(node: TreeNodeBase): boolean {
		let ret: boolean = false;
		if (node instanceof TreeLeafNode) {
			let leaf: TreeLeafNode = node;
			if (leaf.resvo.isSameName) {
				leaf.isSameName = true;
				ret = true;
			} else {
				leaf.isSameName = false;
			}
		} else if (node instanceof TreeParentNode) {
			let pnode: TreeParentNode = node;
			pnode.isSameName = false;
			for (let i: number = 0; i < pnode.children.length; i++) {
				if (this.resetSameName(pnode.children[i])) {
					pnode.isSameName = true;
					ret = true;
				}
			}
		}
		return ret;
	}
}