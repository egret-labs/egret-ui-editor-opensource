/**
 * 文件根命令
 */
export enum FileRootCommands {
	/** 在当前选择文件夹新建exml文件 */
	NEW_EXML_FILE = 'newExmlFile',
	/** 在系统资源管理器中打开 */
	REVEAL_FILE_IN_OS = 'revealFileInOs',
	/** 删除文件命令 */
	DELETE_FILE = 'deleteFile',
	/** 在指定的路径创建文件夹 */
	NEW_FOLDER = 'newFolder',
	/**  复制文件路径操作，需要一个 FileStat[] 类型的参数 */
	COPY_FILE_PATH = 'copyFilePath',
	/**  重命名选择文件操作 */
	RENAME_FILE = 'renameFile',
	/**  保存当前文件 */
	SAVE_ACTIVE = 'saveActive',
	/** 保存所有文件 */
	SAVE_ALL = 'saveAll',
	/** 重新加载 */
	RELOAD = 'reload',
	/** 重新加载 */
	INSTALL_SHELL_COMMAND = 'installShellCommand'
}