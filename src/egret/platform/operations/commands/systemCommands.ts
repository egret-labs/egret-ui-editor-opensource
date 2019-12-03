/**
 * 系统命令
 */
export const systemRols = ['cut', 'copy', 'paste', 'delete', 'selectAll', 'undo', 'redo'];
/**
 * 系统命令
 */
export enum SystemCommands {
	/** 撤销 */
	UNDO = 'undo',
	/** 恢复 */
	REDO = 'redo',
	/** 复制 */
	COPY = 'copy',
	/** 剪切 */
	CUT = 'cut',
	/** 粘贴 */
	PASTE = 'paste',
	/** 全选 */
	SELECT_ALL = 'selectAll',
	/** 删除 */
	DELETE = 'delete'
}