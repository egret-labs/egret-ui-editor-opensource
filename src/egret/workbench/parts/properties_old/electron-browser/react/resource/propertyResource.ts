import './propertyResource.css';

/**
 * 属性资源
 */
export class PropertyResource {

	//quick_binding 快速绑定
	public static QUICK_BINDING: string = 'quick_binding';

	//解除绑定
	public static UNBINDING: string = 'unbinding';
	//大小&尺寸
	//对齐
	//删除
	public static DELETE: string = 'delete';

	// 左对齐
	public static ALIGN_LEFT: string = 'align_left';
	// 右对齐
	public static ALIGN_RIGHT: string = 'align_right';

	// 底对齐
	public static ALGIN_BOTTOM: string = 'align_bottom';

	/**
	 * 顶对齐
	 */
	public static ALIGN_TOP: string = 'algin_top';
	//水平居中
	public static ALIGN_HCENTER: string = 'align_hcenter';

	//垂直居中
	public static ALIGN_VCENTER: string = 'align_vcenter';
	//分布
	public static SPREAD_TOP: string = 'spread_top';

	//垂直分布
	public static SPREAD_VCENTER: string = 'spread_vcenter';

	//底部分布
	public static SPREAD_BOTTOM: string = 'spread_bottom';

	// 左分布
	public static SPREAD_LEFT: string = 'spread_left';

	// 水平 居中
	public static SPREAD_HCENTER: string = 'spread_hcenter';

	// 居右 分布
	public static SPREAD_RIGHT: string = 'spread_right';

	// 水平间隔
	public static SPREAD_SPACEH: string = 'spread_spaceh';

	// 垂直间隔
	public static SPREAD_SPACEV: string = 'spread_spacev';
	//排列
	public static FRONT_FRONT: string = 'front_front';
	// tslint:disable-next-line:check-comment
	public static FRONT_FORWARD: string = 'front_forward';
	// tslint:disable-next-line:check-comment
	public static FRONT_BACK: string = 'front_back';
	// tslint:disable-next-line:check-comment
	public static FRONT_BACKWARD: string = 'front_backward';
	//
	// tslint:disable-next-line:check-comment
	public static MY_HELP = 'myhelp';

	// tslint:disable-next-line:check-comment
	public static MY_KEY_CHANGE = 'mykeychange';
	//快捷约束
	public static LAYOUT_LEFT: string = 'layout_left';
	// tslint:disable-next-line:check-comment
	public static LAYOUT_HCENTER: string = 'layout_hcenter';
	// tslint:disable-next-line:check-comment
	public static LAYOUT_RIGHT: string = 'layout_right';
	// tslint:disable-next-line:check-comment
	public static LAYOUT_TOP: string = 'layout_top';
	// tslint:disable-next-line:check-comment
	public static LAYOUT_VCENTER: string = 'layout_vcenter';
	// tslint:disable-next-line:check-comment
	public static LAYOUT_BOTTOM: string = 'layout_bottom';
	// tslint:disable-next-line:check-comment
	public static LAYOUT_LEFTANDRIGHT: string = 'layout_leftandright';
	// tslint:disable-next-line:check-comment
	public static LAYOUT_TOPANDBOTTOM: string = 'layout_topandbottom';
	// tslint:disable-next-line:check-comment
	public static LAYOUT_ALL: string = 'layout_all';
	//字体
	public static FONT_BOLD: string = 'font_bold';
	// tslint:disable-next-line:check-comment
	public static FONT_ITALICS: string = 'font_italics';

	// tslint:disable-next-line:check-comment
	public static FONT_ALIGN_LEFT: string = 'font_align_left';
	// tslint:disable-next-line:check-comment
	public static FONT_ALIGN_RIGHT: string = 'font_align_right';
	// tslint:disable-next-line:check-comment
	public static FONT_ALIGN_CENTER: string = 'font_align_center';

	// tslint:disable-next-line:check-comment
	public static FONT_VALIGN_BOTTOM: string = 'font_valign_bottom';
	// tslint:disable-next-line:check-comment
	public static FONT_VALIGN_CENTER: string = 'font_valign_center';
	// tslint:disable-next-line:check-comment
	public static FONT_VALIGN_TOP: string = 'font_valign_top';
	// tslint:disable-next-line:check-comment
	public static FONT_VALIGN_JUSTIFY: string = 'font_valign_justify';
	//
	// tslint:disable-next-line:check-comment
	public static SCALE_NINE_GRID: string = 'scale_9_grid';

	// tslint:disable-next-line:check-comment
	public static PROPERTYMODE_NORMAL: string = 'propertymode_normal';
	// tslint:disable-next-line:check-comment
	public static PROPERTYMODE_ALL: string = 'propertymode_all';
	//
	// tslint:disable-next-line:check-comment
	public static ADD_LAYER: string = 'AddLayer';
	//
	// tslint:disable-next-line:check-comment
	public static BITMAPLABEL: string = 'BitmapLabel';
		// tslint:disable-next-line:check-comment
	public static BUTTON: string = 'Button';
		// tslint:disable-next-line:check-comment
	public static CHECKBOX: string = 'CheckBox';
		// tslint:disable-next-line:check-comment
	public static COMBOBOX: string = 'ComboBox';
		// tslint:disable-next-line:check-comment
	public static COMPONENT: string = 'Component';
		// tslint:disable-next-line:check-comment
	public static CUSTOM: string = 'Custom';
		// tslint:disable-next-line:check-comment
	public static DATAGROUP: string = 'DataGroup';
	// tslint:disable-next-line:check-comment
	public static DROPDOWNLIST: string = 'DropDownList';
	// tslint:disable-next-line:check-comment
	public static EDITABLETEXT: string = 'EditableText';
	// tslint:disable-next-line:check-comment
	public static GROUP: string = 'Group';
	// tslint:disable-next-line:check-comment
	public static HSCROLLBAR: string = 'HScrollBar';
	// tslint:disable-next-line:check-comment
	public static HSLIDER: string = 'HSlider';
	// tslint:disable-next-line:check-comment
	public static IMAGE: string = 'Image';
	// tslint:disable-next-line:check-comment
	public static LABEL: string = 'Label';
	// tslint:disable-next-line:check-comment
	public static LIST: string = 'List';
	// tslint:disable-next-line:check-comment
	public static PAGENAVIGATOR: string = 'PageNavigator';
	// tslint:disable-next-line:check-comment
	public static PANEL: string = 'Panel';
	// tslint:disable-next-line:check-comment
	public static POPUPANCHOR: string = 'PopUpAnchor';
	// tslint:disable-next-line:check-comment
	public static PROGRESSBAR: string = 'ProgressBar';
	// tslint:disable-next-line:check-comment
	public static RADIOBUTTON: string = 'RadioButton';
	// tslint:disable-next-line:check-comment
	public static RECT: string = 'Rect';
	// tslint:disable-next-line:check-comment
	public static RICHTEXT: string = 'RichText';
	// tslint:disable-next-line:check-comment
	public static SCROLLER: string = 'Scroller';
	// tslint:disable-next-line:check-comment
	public static SKINNABLECOMPONENT: string = 'Skin';
	// tslint:disable-next-line:check-comment
	public static SKINNABLECONTAINER: string = 'SkinnableContainer';
	// tslint:disable-next-line:check-comment
	public static SKINNABLEDATACONTAINER: string = 'SkinnableDataContainer';
	// tslint:disable-next-line:check-comment
	public static SPACER: string = 'Spacer';
	// tslint:disable-next-line:check-comment
	public static SPINNER: string = 'Spinner';
	// tslint:disable-next-line:check-comment
	public static TABBAR: string = 'TabBar';
	// tslint:disable-next-line:check-comment
	public static TABNAVIGATOR: string = 'TabNavigator';
	// tslint:disable-next-line:check-comment
	public static TEXTAREA: string = 'TextArea';
	// tslint:disable-next-line:check-comment
	public static TEXTINPUT: string = 'TextInput';
	// tslint:disable-next-line:check-comment
	public static TILEGROUP: string = 'TileGroup';
	// tslint:disable-next-line:check-comment
	public static TITLEWINDOW: string = 'TitleWindow';
	// tslint:disable-next-line:check-comment
	public static TOGGLEBUTTON: string = 'ToggleButton';
	// tslint:disable-next-line:check-comment
	public static TOGGLESWITCH: string = 'ToggleSwitch';
	// tslint:disable-next-line:check-comment
	public static TREE: string = 'Tree';
	// tslint:disable-next-line:check-comment
	public static UIASSET: string = 'UIAsset';
	// tslint:disable-next-line:check-comment
	public static VIEWSTACK: string = 'ViewStack';
	// tslint:disable-next-line:check-comment
	public static VSCROLLBAR: string = 'VScrollBar';
	// tslint:disable-next-line:check-comment
	public static VSLIDER: string = 'VSlider';
	// 缩小按钮
	public static ZOOM_DOWN: string = 'ZoomDown';
	// 放大按钮
	public static ZOOM_UP: string = 'ZoomUp';
	// 恢复按钮
	public static VIEW_MIN: string = 'ViewMin';

	constructor(){

	}
}