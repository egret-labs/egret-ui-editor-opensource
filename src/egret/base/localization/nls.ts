import { app } from 'electron';
import { remote } from 'electron';

import * as paths from 'path';
import * as fs from 'fs';

let initLocalizationed:boolean = false;
//当前的系统语言
let nlsFileName = '';
//多语言目录
let nlsDir = '';
/**
 * 初始化本地化工具
 * @param debug debug模式下会在本地生成多语言配置文件
 */
function initLocalization(): void {
	if(initLocalizationed){
		return;
	}
	initLocalizationed = true;
	let currentLocalName = '';
	if (app) {
		currentLocalName = app.getLocale();
		nlsDir = paths.join(app.getAppPath(), 'nls');
	} else if (remote) {
		currentLocalName = remote.app.getLocale();
		nlsDir = paths.join(remote.app.getAppPath(), 'nls');
	}
	currentLocalName = currentLocalName.replace(/-/g, '_');
	nlsFileName = 'nls.metadata.' + currentLocalName + '.json';
	doInitLocalization(paths.join(nlsDir, nlsFileName));
}

let nlsData;
function doInitLocalization(nlsPath: string): void {
	nlsData = null;
	if (fs.existsSync(nlsPath)) {
		const nlsDataStr = fs.readFileSync(nlsPath, 'utf8');
		try {
			nlsData = JSON.parse(nlsDataStr);
		} catch (error) { }
	}
	if (!nlsData) {
		nlsData = {};
	}
}

/**
 * 本地化
 * @param key 多语言的key
 * @param message 默认的翻译文本
 * @param args 文本参数
 */
export function localize(key: string, message: string, ...args: (string | number | boolean | undefined | null)[]): string {
	initLocalization();
	let result = message;
	if (key in nlsData && 't' in nlsData[key]) {
		result = nlsData[key]['t'];
	}
	if (args && args.length > 0) {
		for (let i = 0; i < args.length; i++) {
			result = result.replace('{' + i + '}', args[i].toString());
		}
	}
	return result;
}