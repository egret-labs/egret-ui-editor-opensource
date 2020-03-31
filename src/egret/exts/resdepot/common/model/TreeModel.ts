/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import {ResInfoVO} from 'egret/exts/resdepot/common/model/ResInfoVO';

export class TreeModel {

}

/**数据源类型 */
export class TreeModelSourceType {
	/**resdepot 的数据源 */
	public static RESDEPOT: string = 'resdepot';
	/**资源库的数据源 */
	public static RESLIB: string = 'reslibrary';
}

export class TreeNodeType {
	public static SHEET: string = 'sheet';
	public static IMAGE: string = 'image';
	public static JSON: string = 'json';
}
/**树节点基类 */
export class TreeNodeBase extends egret.HashObject {
	public icon: string = '';
	public label: string = '';
	public isFolder: boolean = false;
	/**节点的类型，默认不设置。从TreeNodeType取值 */
	public type: string;
	public isSameName: boolean;
}
export class TreeLeafNode extends TreeNodeBase {
	public resname: string = '';// 叶节点有资源名，以便于从$treeDic找VO数据
	public resvo: ResInfoVO;
}
export class TreeParentNode extends TreeNodeBase {
	public children: Array<any>;// 父节点有子对象数组
	public fileErrorNum:number = 0;//子节点错误文件数量
}
egret.registerClass(TreeLeafNode, 'TreeLeafNode');
egret.registerClass(TreeNodeBase, 'TreeNodeBase');
egret.registerClass(TreeParentNode, 'TreeParentNode');
egret.registerClass(TreeNodeType, 'TreeNodeType');