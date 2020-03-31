
export class ResGlobalEvents {
	/** 资源配置文件有改变 */
	public static Json_Modifyed: string = 'Json_Modifyed';
	/** 资源配置文件恢复正常 */
	public static Json_FormatOk: string = 'Json_FormatOk';
	/** 资源配置文件有错误 */
	public static Json_FormatError: string = 'Json_FormatError';

	/** 打开9切编辑界面 */
	public static OPEN_SCALE9_VIEW:string = 'open_scale9_view';
	/** 更新9切的数据显示 */
	public static UPDATE_SCALE9: string = 'update_scale9';
	/** 更新预览区显示 */
	public static UPDATE_PREVIEW: string = 'update_preview';
	/** 预览资源选项点击 */
	public static PREVIEW_CHANGE_CLICK: string = 'preview_change_click';
	/** 点选了树的条目 */
	public static TOUCH_TREE_ITEM: string = 'touch_tree_item';
	/** 更新信息区 */
	public static UPDATE_INFO_AREA: string = 'update_info_area';
	/** 刷新tree */
	public static UPDATE_TREE_VIEW: string = 'update_tree_view';
	/** 更新tree的选择项 */
	public static SHOW_ITEM_IN_TREE: string = 'show_item_in_tree';
	/** 删除树里的资源 */
	public static DELETE_RES_IN_TREE: string = 'delete_res_in_tree';
	/** 删除组里的资源 */
	public static DELETE_RES_IN_GROUP_GRID: string = 'delete_res_in_group_grid';
	/** 删除组 */
	public static DELETE_GROUP: string = 'delete_group';
	/** 刷新组内条目的显示 */
	public static GROUP_GRID_FRESH: string = 'group_grid_fresh';
	/** 刷新组的显示*/
	public static GROUP_FRESH: string = 'group_fresh';
	/** 刷新资源组下面的错误提示信息，这个事件在资源数据发生变化后如果没有重新更新组的内容，刷新是无效的，可以使用刷新组的事件GROUP_GRID_FRESH来替代 */
	public static ERROR_FRESH_GROUP_AREA:string = 'error_fresh_group_area';
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
	public static ON_UPDATE_RESINFOVO:string = 'on_update_resinfovo';
}