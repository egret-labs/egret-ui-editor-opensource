/**
 * 根命令
 */
export enum RootCommands {
	/** 打开一个文件夹的命令 */
	OPEN_FOLDER = 'openFolder',
	/**  弹出关于面板 */
	PROMPT_ABOUT = 'promptAbout',
	/** 检查更新 */
	CHECK_UPDATE = 'checkUpdate',
	/** 反馈问题 */
	REPORT = 'reportIssue',
	/** 发送反馈 */
	FEEDBACK = 'feedback',
	/** 项目属性配置 */
	WING_PROPERTY = 'wingProperty',
	/** 快捷键设置 */
	KEYBINDING_SETTING = 'keybindingSetting',
	/** 关闭当前编辑器 */
	CLOSE_CURRENT = 'closeCurrent',


	/**  弹出快速打开面板 */
	PROMPT_QUICK_OPEN = 'promptQuickOpen',


	/** 资源管理器面板 */
	EXPLORER_PANEL = 'explorerPanel',
	/** 图层面板 */
	LAYER_PANEL = 'layerPanel',
	/** 输出面板 */
	OUTPUT_PANEL = 'outputPanel',
	/** 资源库面板 */
	ASSETS_PANEL = 'assetsPanel',
	/** 组件面板 */
	COMPONENT_PANEL = 'componentPanel',
	/** 对齐面板 */
	ALIGNMENT_PANEL = 'alignmentPanel',
	/** 属性面板 */
	PROPERTY_PANEL = 'propertyPanel',
}