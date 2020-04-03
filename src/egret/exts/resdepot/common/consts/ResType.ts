/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

export const RES_EDITOR_ID = 'workbench.editors.res.resEditor';
export const RES_EDITOR_INPUT_ID = 'workbench.editors.res.resEditorInput';

/**
 * 资源的类型
 *
 */
export class ResType extends egret.HashObject {
	//资源类型
	public static TYPE_BIN: string;
	public static TYPE_IMAGE: string;
	public static TYPE_TEXT: string;
	public static TYPE_JSON: string;
	public static TYPE_SHEET: string;
	public static TYPE_FONT: string;
	public static TYPE_SOUND: string;
	//资源扩展
	public static IMAGE_TYPE_EXTS: Array<string>;
	public static SOUND_TYPE_EXTS: Array<string>;
	public static TEXT_TYPE_EXTS: Array<string>;
	public static FONT_TYPE_EXTS: Array<string>;
	public static JSON_TYPE_EXTS: Array<string>;
	//附加参数类型
	public static SOUND_TYPE: Array<string>;
	public static DEFAULT_TYPE: Array<any>;
}


ResType.TYPE_BIN = 'bin';
ResType.TYPE_IMAGE = 'image';
ResType.TYPE_TEXT = 'text';
ResType.TYPE_JSON = 'json';
ResType.TYPE_SHEET = 'sheet';
ResType.TYPE_FONT = 'font';
ResType.TYPE_SOUND = 'sound';

ResType.IMAGE_TYPE_EXTS = ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'svg'];
ResType.SOUND_TYPE_EXTS = ['mp3', 'wav', 'm4a'];
ResType.TEXT_TYPE_EXTS = ['txt'];
ResType.FONT_TYPE_EXTS = ['fnt'];
ResType.JSON_TYPE_EXTS = ['json'];

ResType.SOUND_TYPE = ['music', 'effect'];

ResType.DEFAULT_TYPE = [
	{ 'name': '二进制', 'key': 'bin', 'isShow': false, 'type': 'default', 'exts': [] },
	{ 'name': '图片', 'key': 'image', 'isShow': true, 'type': 'default', 'exts': ResType.IMAGE_TYPE_EXTS },
	{ 'name': '声音', 'key': 'sound', 'isShow': true, 'type': 'default', 'exts': ResType.SOUND_TYPE_EXTS },
	{ 'name': '文本', 'key': 'text', 'isShow': true, 'type': 'default', 'exts': ResType.TEXT_TYPE_EXTS },
	{ 'name': '字体', 'key': 'font', 'isShow': true, 'type': 'default', 'exts': ResType.FONT_TYPE_EXTS },
	{ 'name': 'Sheet', 'key': 'sheet', 'isShow': false, 'type': 'default', 'exts': ResType.JSON_TYPE_EXTS },
	{ 'name': 'Json', 'key': 'json', 'isShow': true, 'type': 'default', 'exts': ResType.JSON_TYPE_EXTS }
];
