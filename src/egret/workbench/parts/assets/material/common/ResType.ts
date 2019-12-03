import { localize } from "egret/base/localization/nls";

/**
 * 资源的类型
 */
export class ResType {
	//资源类型
	public static TYPE_BIN: string;

	//DB文件
	public static TYPE_DBBIN: string;
	//图片
	public static TYPE_IMAGE: string;
	//文本
	public static TYPE_TEXT: string;

	//Json 文件
	public static TYPE_JSON: string;

	//sheet 类型
	public static TYPE_SHEET: string;

	//字体
	public static TYPE_FONT: string;

	//声音
	public static TYPE_SOUND: string;
	//资源扩展

	public static DBBIN_TYPE_EXTS: Array<string>;

	//图片扩展
	public static IMAGE_TYPE_EXTS: Array<string>;
	//声音扩展
	public static SOUND_TYPE_EXTS: Array<string>;

	//文本扩展
	public static TEXT_TYPE_EXTS: Array<string>;

	//字体扩展
	public static FONT_TYPE_EXTS: Array<string>;

	//json 扩展
	public static JSON_TYPE_EXTS: Array<string>;
	//附加参数类型
	public static SOUND_TYPE: Array<string>;

	//默认
	public static DEFAULT_TYPE: Array<any>;
}


ResType.TYPE_BIN = 'bin';
ResType.TYPE_DBBIN = 'dbbin';
ResType.TYPE_IMAGE = 'image';
ResType.TYPE_TEXT = 'text';
ResType.TYPE_JSON = 'json';
ResType.TYPE_SHEET = 'sheet';
ResType.TYPE_FONT = 'font';
ResType.TYPE_SOUND = 'sound';

ResType.DBBIN_TYPE_EXTS = ['dbbin'];
ResType.IMAGE_TYPE_EXTS = ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'svg'];
ResType.SOUND_TYPE_EXTS = ['mp3', 'wav', 'm4a'];
ResType.TEXT_TYPE_EXTS = ['txt'];
ResType.FONT_TYPE_EXTS = ['fnt'];
ResType.JSON_TYPE_EXTS = ['json'];

ResType.SOUND_TYPE = ['music', 'effect'];

ResType.DEFAULT_TYPE = [
	{ 'name': localize('resType.bin','Bin'), 'key': 'bin', 'isShow': false, 'type': 'default', 'exts': [] },
	{ 'name': localize('resType.dbbin','Dragon bones bin'), 'key': 'dbbin', 'isShow': false, 'type': 'default', 'exts': [ResType.DBBIN_TYPE_EXTS] },
	{ 'name': localize('resType.image','Image'), 'key': 'image', 'isShow': true, 'type': 'default', 'exts': ResType.IMAGE_TYPE_EXTS },
	{ 'name': localize('resType.sound','Sound'), 'key': 'sound', 'isShow': true, 'type': 'default', 'exts': ResType.SOUND_TYPE_EXTS },
	{ 'name': localize('resType.text','Text'), 'key': 'text', 'isShow': true, 'type': 'default', 'exts': ResType.TEXT_TYPE_EXTS },
	{ 'name': localize('resType.font','Font'), 'key': 'font', 'isShow': true, 'type': 'default', 'exts': ResType.FONT_TYPE_EXTS },
	{ 'name': 'Sheet', 'key': 'sheet', 'isShow': false, 'type': 'default', 'exts': ResType.JSON_TYPE_EXTS },
	{ 'name': 'Json', 'key': 'json', 'isShow': true, 'type': 'default', 'exts': ResType.JSON_TYPE_EXTS }
];