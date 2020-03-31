import { ResInfoVO } from './ResInfoVO';
import { ISheet, SheetSubVO } from './SheetSubVO';

/**
 * treeModel 树Model
 */
export class TreeModel {

}

/**
 * 数据源类型 
 */
export class TreeModelSourceType {
	/**资源库的数据源 */
	public static RESLIB: string = 'reslibrary';
}

/**
 * 节点类型
 */
export class TreeNodeType {

	//类型 sheet
	public static SHEET: string = 'sheet';
	//类型 image
	public static IMAGE: string = 'image';
	//类型 json
	public static JSON: string = 'json';
}
/**
 * 树节点基类 
 */
export class TreeNodeBase {

	// 资源所在的*.res.json文件名称
	public resFile: string;
	//图标
	public icon: string = '';

	//显示文本
	public label: string = '';

	//是否是文件夹
	public isFolder: boolean = false;
	/**节点的类型，默认不设置。从TreeNodeType取值 */
	public type: string;

	//是否重名
	public isSameName: boolean;

	//是否解析过
	public isDirectoryResolved:boolean;

	//树中使用
	public model:string;
}

/**
 * TreeLeafNode 节点
 */
export class TreeLeafNode extends TreeNodeBase {

	/**
	 * 叶节点有资源名，以便于从$treeDic找VO数据
	 */
	public resname: string = '';// 

	/**
	 * 节点数据
	 */
	public resvo: ResInfoVO;

	/**
	 * sheet数据
	 */
	public sheetVo:SheetSubVO;
}

/**
 * 父节点
 */
export class TreeParentNode extends TreeNodeBase {
	/**
	 * 父节点有子对象数组
	 */
	public children: Array<any>;



	/**
	 * 子节点错误文件数量
	 */
	public fileErrorNum: number = 0;
}