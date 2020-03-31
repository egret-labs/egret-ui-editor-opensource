/**
 * 提供一些快捷键事件类型常量
 */
export class ShortcutType extends egret.HashObject {
	public static SAVE: string;
	public static SAVE_AS: string;
	public static SELECT_ALL: string;
	public static OPEN: string;
	public static NEW: string;
	/**
	 * 搜索
	 */
	public static SEARCH: string;
	/**
	 * 根路径
	 */
	public static ROOT: string;
	public static NEW_GROUP: string;
	public static EXIT: string;
	public static DELETE: string;

	public constructor() {
		super();
	}
}


ShortcutType.SAVE = 'save';
ShortcutType.SAVE_AS = 'saveAs';
ShortcutType.SELECT_ALL = 'selectAll';
ShortcutType.OPEN = 'open';
ShortcutType.NEW = 'new';
ShortcutType.SEARCH = 'search';
ShortcutType.ROOT = 'root';
ShortcutType.NEW_GROUP = 'newGroup';
ShortcutType.EXIT = 'exit';
ShortcutType.DELETE = 'delete';
