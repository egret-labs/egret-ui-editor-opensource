/**
 * 资源面板事件
 */
export class ResGlobalEvents {
	/** 资源配置文件有改变 */
	public static Json_Modifyed: string = 'Json_Modifyed';
	/** 资源配置文件有错误 */
	public static Json_FormatError: string = 'Json_FormatError';
	/** 显示tree里资源名重名 */
	public static TREE_SAME_NAME: string = 'tree_same_name';
	/** 刷新resinfovo改变变更的重复 */
	public static FRESH_RESVO_SAME_NAME: string = 'fresh_resvo_samename';
	/** 刷新二级key */
	public static TO_FRESH_SUBKEY: string = 'to_fresh_subkey';
	/** 更新当前信息区subkey的显示 */
	public static FRESH_SHOW_SUBKEY: string = 'fresh_subkey_info';
	/** 更新render的选择状态，显示在当前组里的项 */
	public static UPDATE_RENDER_INCURRENTGROUP: string = 'update_render_incurrentGroup';

	/**resinfovo更新了 */
	public static ON_UPDATE_RESINFOVO: string = 'on_update_resinfovo';
}
