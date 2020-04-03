/**
 * 资源库里的树，资源图标
 */
export class MaterialTreeResIcon {
	public static ICON_UIASSET: string = 'UIAsset_png';
	public static ICON_UIMOVIECLIP: string = 'UIMovieClip_png';
	public static ICON_FOLDER: string = 'folder_png';
	public static ICON_FOLDER_LIGHT: string = 'folder_light_svg';
	public static ICON_FOLDER_Open: string = 'folder_open_png';
	public static ICON_FOLDER_Open_LIGHT: string = 'folder_open_light_svg';
	public static ICON_SHEET: string = 'sheet_png';
	public static ICON_JSON: string = 'json_svg';
	public static ICON_JSON_LIGHT:string = 'json_light_svg';

	public static ICON_Default: string = 'text_png';

	public static iconList: Array<string>;
	public constructor() {
		MaterialTreeResIcon.iconList = [
			MaterialTreeResIcon.ICON_UIASSET,
			MaterialTreeResIcon.ICON_UIMOVIECLIP,
			MaterialTreeResIcon.ICON_FOLDER,
			MaterialTreeResIcon.ICON_FOLDER_LIGHT,
			MaterialTreeResIcon.ICON_FOLDER_Open,
			MaterialTreeResIcon.ICON_FOLDER_Open_LIGHT,
			MaterialTreeResIcon.ICON_SHEET
		];
	}
}