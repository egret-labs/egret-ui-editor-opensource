import { ISelectedStat } from 'egret/platform/files/common/files';
import URI from 'egret/base/common/uri';
import * as paths from 'path';
import * as fs from 'fs';
import { isMacintosh } from 'egret/base/common/platform';
import { normalizeNFC } from 'egret/base/common/strings';

/**
 * 选择文件，这个方法是递归的
 * @param resource 开始查找的文件
 * @param exts 要查找的扩展名，如['.bmp','.txt']
 * @param onSelected 每查到一个目标文件的时候调用
 */
export function select(resource: URI, exts: string[], onSelected?: (stat: ISelectedStat) => void, ignores?: string[]): Promise<ISelectedStat[]> {
	const newExts: string[] = [];
	for (let i = 0; i < exts.length; i++) {
		newExts.push(exts[i].toLocaleLowerCase());
	}
	return new Promise<ISelectedStat[]>((resolve, reject) => {
		const selectedStats: ISelectedStat[] = [];
		const onCompelte = () => {
			resolve(selectedStats);
		};
		doSelect(resource.fsPath, newExts, onSelected, selectedStats, onCompelte, null, ignores);
	});
}

function doSelect(path: string, exts: string[], onSelected: (stat: ISelectedStat) => void, fileStats: ISelectedStat[], onComplete: () => void, selectedMap?: { [path: string]: boolean }, ignores?: string[]): void {
	if (!selectedMap) {
		selectedMap = Object.create(null);
	}

	const baseName = paths.basename(path);
	if (ignores.indexOf(baseName) != -1) {
		onComplete();
		return;
	}
	fs.stat(path, (error, stat) => {
		if (error) {
			onComplete();
			return;
		}
		if (!stat.isDirectory()) {
			let ext = paths.extname(path);
			if (!ext) {
				ext = '';
			}
			ext = ext.toLocaleLowerCase();
			if (exts.length > 0) {
				if (exts.indexOf(ext) != -1) {
					var selectedStat: ISelectedStat = {
						resource: URI.file(path),
						name: paths.basename(path),
						mtime: stat.mtime.getTime(),
						ext: ext
					};
					fileStats.push(selectedStat);
					if (onSelected) {
						onSelected(selectedStat);
					}
				}
			} else {
				var selectedStat: ISelectedStat = {
					resource: URI.file(path),
					name: paths.basename(path),
					mtime: stat.mtime.getTime(),
					ext: ext
				};
				fileStats.push(selectedStat);
				if (onSelected) {
					onSelected(selectedStat);
				}
			}
			onComplete();
			return;
		}
		if (selectedMap[path]) {
			onComplete();
			return;
		}
		selectedMap[path] = true;
		readdir(path, (err, files) => {
			if (files) {
				const numSum = files.length;
				let numFinish = 0;
				const checkComplete = () => {
					if (numFinish == numSum) {
						onComplete();
					}
				};
				const clb = () => {
					numFinish++;
					checkComplete();
				};
				for (let i = 0; i < files.length; i++) {
					const file = files[i];
					doSelect(paths.join(path, file), exts, onSelected, fileStats, clb, selectedMap, ignores);
				}
				checkComplete();
			} else {
				onComplete();
			}
		});
	});
}

export function readdir(path: string, callback: (error: Error, files: string[]) => void): void {
	if (isMacintosh) {
		return fs.readdir(path, (error, children) => {
			if (error) {
				return callback(error, null);
			}
			return callback(null, children.map(c => normalizeNFC(c)));
		});
	}
	return fs.readdir(path, callback);
}