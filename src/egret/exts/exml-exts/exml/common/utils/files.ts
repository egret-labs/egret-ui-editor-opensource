import fs = require('fs');

/**
 * 格式化路径
 * @param path 
 */
export function escapePath(path: string): string {
	if (!path) {
		return '';
	}
	path = decodeURIComponent(path);
	if (path.indexOf('file:///') == 0) {
		path = path.slice(7);
		if (path.charAt(2) == ':') {
			path = path.slice(1);
		}
	}
	path = path.split('\\').join('/');
	return path;
}

/**
 * 扫描文件夹
 * @param dir {string} 目录路径
 * @param exts {array} 目标文件扩展名
 * @param onSelected {function} 遍历到一个文件的时候 function(path){}
 * @param target {object} 目标
 */
export function select(dir: string, exts: string[], onSelected: Function, target: any): void {
	if (dir.charAt(dir.length - 1) == '/') {
		dir = dir.slice(0, dir.length - 1);
	}
	var stat: fs.Stats = null;
	try {
		stat = fs.statSync(dir);
	} catch (e) { }

	if (stat && stat.isFile()) {
		if (matchExt(dir, exts)) {
			dir = escapePath(dir);
			onSelected.call(target, dir);
		}
		return;
	}

	let items: string[];
	try {
		items = fs.readdirSync(dir);
	} catch (e) { }
	if (!items) {
		return;
	}

	const dirList: string[] = [];
	for (var i: number = 0; i < items.length; i++) {
		const item: string = items[i];
		var stat: fs.Stats = fs.statSync(dir + '/' + item);
		if (stat.isDirectory()) {
			if (['.svg', '.git'].indexOf(item) < 0) {
				dirList.push(dir + '/' + item);
			}
		} else {
			select(dir + '/' + item, exts, onSelected, target);
		}
	}
	for (var i: number = 0; i < dirList.length; i++) {
		select(dirList[i], exts, onSelected, target);
	}
}
/**
 * 从提供的文件列表中进行扫描
 * @param files {array} 提供的文件列表
 * @param dir {string} 目录路径
 * @param exts {array} 目标文件扩展名
 * @param onSelected {function} 遍历到一个文件的时候 function(path){}
 * @param target {object} 目标
 */
export function selectIn(files: string[], dir: string, exts: string[], onSelected: Function, target: any): void {
	for (let i: number = 0; i < files.length; i++) {
		const path: string = files[i];
		if (path.toLowerCase().indexOf(dir.toLowerCase()) == 0) {
			if (matchExt(path, exts)) {
				onSelected.call(target, path);
			}
		}
	}
}
/**
 * 打开文本文件的简便方法,返回打开文本的内容，若失败，返回"".
 * @param path 要打开的文件路径
 * @param charSet 编码格式，默认为"",表示对文件内容自动去BOM并使用utf-8编码。
 */
export function openAsString(path: string, charSet: string = null): string {
	if (!charSet) {
		charSet = 'utf8';
	}
	let str: string = null;
	try {
		str = fs.readFileSync(path, charSet);
	} catch (e) { }
	return str;
}
/**
 * 获得路径的扩展名
 * @param path 要打开的文件路径
 */
export function getExtension(path: string): string {
	if (path.lastIndexOf('.') != -1) {
		let ext: string = path.split('.').pop();
		ext = ext.toLowerCase();
		return ext;
	}
	return '';
}
function matchExt(path: string, exts: string[]): boolean {
	path = path.toLowerCase();
	for (let i: number = 0; i < exts.length; i++) {
		if (
			(path.lastIndexOf('.' + exts[i]) == path.length - (exts[i].length + 1)) &&
			(path.indexOf('.' + exts[i]) != -1)
		) {
			return true;
		}
	}
	return false;
}
/**
 * 获取路径的文件名(不含扩展名)或文件夹名
 * @param path 要获取的文件路径
 * @return 文件名
 */
export function getFileName(path: string): string {
	if (!path) {
		return '';
	}
	let startIndex: number = path.lastIndexOf('/');
	let endIndex: number = 0;
	if (startIndex > 0 && startIndex == path.length - 1) {
		path = path.substring(0, path.length - 1);
		startIndex = path.lastIndexOf('/');
		endIndex = path.length;
		return path.substring(endIndex, startIndex + 1);
	}
	endIndex = path.lastIndexOf('.');
	if (endIndex <= startIndex) {
		endIndex = path.length;
	}
	return path.substring(endIndex, startIndex + 1);
}
/**
 * 得到指定路径的目录，如果指定路径是文件则返回文件所在的路径，如果指定路径是目录，则返回自己。
 * @param path 指定的路径
 * @return 路径所在的目录
 */
export function getDirectory(path: string): string {
	if (!path) {
		return '';
	}
	let stat: fs.Stats = null;
	try {
		stat = fs.statSync(path);
	} catch (e) { }
	if (stat && stat.isDirectory()) {
		if (path.lastIndexOf('/') == path.length - 1) {
			return path;
		}
		return path + '/';
	}
	const index: number = path.lastIndexOf('/');
	if (index != -1) {
		return path.slice(0, index + 1);
	}
	return path;
}