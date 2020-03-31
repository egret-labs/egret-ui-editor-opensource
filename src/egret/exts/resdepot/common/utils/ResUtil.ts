import { ResInfoVO } from 'egret/exts/resdepot/common/model/ResInfoVO';
import { GroupInfoVO } from 'egret/exts/resdepot/common/model/GroupInfoVO';
import { SheetSubVO } from 'egret/exts/resdepot/common/model/SheetSubVO';
import { ResType } from 'egret/exts/resdepot/common/consts/ResType';
import { PathUtil } from 'egret/exts/resdepot/common/utils/PathUtil';
import { AppStorage } from 'egret/exts/resdepot/common/storage/AppStorage';
import { FileUtil } from 'egret/exts/resdepot/common/utils/FileUtil';
/* tslint:disable */
// import * as encoding from 'vs/base/node/encoding';
import * as fsextra from 'fs-extra';
/* tslint:enable */
import * as paths from 'egret/base/common/paths';
import { localize } from 'egret/base/localization/nls';

export class ResUtil {
	// /**
	//  * 通过url地址列表，获得资源,此过程获得资源只有url,并且标示为创建的资源
	//  * @param urls
	//  * @param callback 获取到所有资源后回调
	//  * @return 立即返回资源列表，但因异步问题该返回值不会有内容
	//  */
	// public static getResByUrls(urls: Array<any>, callback: (reslist: Array<ResInfoVO>) => void = null): Array<ResInfoVO> {
	// 	var time: number = egret.getTimer();
	// 	var resList: Array<ResInfoVO> = new Array<ResInfoVO>();
	// 	for (var i: number = 0; i < urls.length; i++) {
	// 		this.loadDicector(urls[i], resList, callback);
	// 	}
	// 	console.log(localize('resLog1', 'Loading resources {0}, time consuming {1} milliseconds', resList.length, (egret.getTimer() - time)));
	// 	return resList;
	// }

	// private static loadDicector_count: number = 0;
	// private static getDirsInDir_count: number = 0;
	// private static getFilesInDir_count: number = 0;
	// //递归函数遍历目录内所有文件，将文件的路径推到一个vo里，将vo推到列表中
	// private static loadDicector(url: string, resList: Array<ResInfoVO>, callback: (reslist: Array<ResInfoVO>) => void): void {
	// 	this.loadDicector_count++;
	// 	var tmpUrl: string;
	// 	var resInfoVO: ResInfoVO;
	// 	this.isIgnore(url, (ignore: boolean) => {
	// 		if (ignore) {
	// 			return;
	// 		} else {
	// 			pfs.dirExists(url).then(isDir => {
	// 				if (!isDir) {
	// 					tmpUrl = FileUtil.escapePath(url);//file.fsPath
	// 					resInfoVO = new ResInfoVO();
	// 					resInfoVO.url = tmpUrl;
	// 					resInfoVO.isCreated = true;
	// 					resList.push(resInfoVO);
	// 					return callback(resList);
	// 				}
	// 				this.getDirsInDir_count++;
	// 				this.getFilesInDir_count++;
	// 				// 所有的子目录，遍历子目录
	// 				FileUtil.getDirsInDir(url, null, true).then(dirs => {
	// 					this.loadDicector_count--;
	// 					this.getDirsInDir_count--;
	// 					if (this.getDirsInDir_count === 0 && this.getFilesInDir_count === 0 && this.loadDicector_count === 0 && dirs.length === 0) {
	// 						return callback(resList);
	// 					} else {
	// 						for (var i: number = 0; i < dirs.length; i++) {
	// 							var dirPath: string = dirs[i];
	// 							this.loadDicector(dirPath, resList, callback);
	// 						}
	// 					}
	// 				});
	// 				// 文件存入数组
	// 				FileUtil.getFilesInDir(url, null, true).then(files => {
	// 					for (var i: number = 0; i < files.length; i++) {
	// 						var filePath: string = files[i];
	// 						var tmpUrl: string = paths.normalize(filePath);
	// 						resInfoVO = new ResInfoVO();
	// 						resInfoVO.url = tmpUrl;
	// 						resInfoVO.isCreated = true;
	// 						resList.push(resInfoVO);
	// 					}
	// 					this.getFilesInDir_count--;
	// 					if (this.getDirsInDir_count === 0 && this.getFilesInDir_count === 0 && this.loadDicector_count === 0) {
	// 						return callback(resList);
	// 					}
	// 				});
	// 			});
	// 		}
	// 	});
	// }
	// /**
	//  * 该文件或文件夹是否要被忽略掉
	//  */
	// private static isIgnore(path: string, callback: (ret: boolean) => void): void {
	// 	pfs.exists(path).then((ret: boolean) => {
	// 		if (!ret) {
	// 			return callback(true);
	// 		}
	// 		pfs.stat(path).then(stat => {
	// 			var extension: string = '';
	// 			if (!stat.isDirectory()) {
	// 				// 取扩展字段
	// 				var lastIndexOfDot: number = path.lastIndexOf('.');
	// 				if (-1 !== lastIndexOfDot) {
	// 					extension = path.substring(lastIndexOfDot);
	// 					extension = extension.trim();
	// 				}
	// 			}
	// 			var fileName: string = FileUtil.getFileName(path);
	// 			var needIgnore: boolean = false;
	// 			var temp: Array<any> = AppStorage.ignoreList;
	// 			for (var i: number = 0; i < temp.length; i++) {
	// 				var ignore: string = temp[i];
	// 				if (ignore.length > 2 && ignore.charAt(0) === '*' && ignore.charAt(1) === '.') {
	// 					var ext: string = ignore.slice(2);
	// 					if (extension === ext) {
	// 						needIgnore = true;
	// 						break;
	// 					}
	// 				} else if (temp[i] === fileName) {
	// 					needIgnore = true;
	// 					break;
	// 				}
	// 			}
	// 			if (fileName === '.DS_Store') {
	// 				needIgnore = true;
	// 			}
	// 			callback(needIgnore);
	// 		});
	// 	});
	// }

	/**
	 * 根据根目录修复url显示
	 * @param resList
	 * @param rootPath
	 * @param callback 执行完所有的文件后回调
	 */
	public static fixRootPath(resList: Array<ResInfoVO>, rootPath: string): Promise<void> {
		let promise = new Promise<void>((resolve, reject) => {
			var time: number = egret.getTimer();
			if (!rootPath) {
				rootPath = paths.normalize(rootPath);
				resolve();
				return;
			}
			var len: number = resList.length;
			if (!len) {
				resolve();
				return;
			}

			var count: number = 0;
			let func1 = (resInfoVO: ResInfoVO) => {
				if (resInfoVO.isCreated) {
					resInfoVO.showUrl = resInfoVO.url.replace(rootPath, '');
					count++;
					if (len === count) {
						console.log(localize('resLog2', 'Fixed URL display {0}, time consuming {1} milliseconds', resList.length, (egret.getTimer() - time)));
						resolve();
					}
				} else {
					let tmpPath: string = rootPath + resInfoVO.showUrl;
					fsextra.pathExists(tmpPath).then((isExist: boolean) => {
						count++;
						if (isExist) {
							resInfoVO.url = paths.normalize(tmpPath);
							resInfoVO.isCreated = true;
						} else {
							resInfoVO.url = resInfoVO.showUrl;
						}
						if (len === count) {
							console.log(localize('resLog2', 'Fixed URL display {0}, time consuming {1} milliseconds', resList.length, (egret.getTimer() - time)));
							resolve();
						}
					});
				}
			};

			for (let i: number = 0; i < resList.length; i++) {
				func1(resList[i]);
			}
		});
		return promise;
	}
	/**
	 * 根据资源的Url以及当前的命名规则，以及配置的格式。 修复resInfo中的name,type,是否文件错误
	 * @param resList
	 */
	public static fixDetailInfo(resList: Array<ResInfoVO>, autoType: boolean = true) {
		var time: number = egret.getTimer();
		var resTypeArr: Array<any> = AppStorage.resType;
		resTypeArr = resTypeArr.reverse();
		//得到自定义类型
		var customTypeArr: Array<any> = [];
		for (var i: number = 0; i < resTypeArr.length; i++) {
			if (resTypeArr[i].type === 'custom') {
				customTypeArr.push(resTypeArr[i]);
			}
		}
		//得到默认类型扩展名数组
		var fontExts: Array<any> = this.getExtsByKey(ResType.TYPE_FONT);
		var imgExts: Array<any> = this.getExtsByKey(ResType.TYPE_IMAGE);
		var soundExts: Array<any> = this.getExtsByKey(ResType.TYPE_SOUND);
		var textExts: Array<any> = this.getExtsByKey(ResType.TYPE_TEXT);
		var jsonType: Array<any> = this.getExtsByKey(ResType.TYPE_JSON);
		for (i = 0; i < resList.length; i++) {
			if (!resList[i].name) {
				if (AppStorage.containExtension) {
					resList[i].name = FileUtil.getFileName(resList[i].locolUrl) + '_' + FileUtil.getExtension(resList[i].locolUrl);
				} else {
					resList[i].name = FileUtil.getFileName(resList[i].locolUrl);
				}
				if (AppStorage.resNameType === 1) {
					resList[i].name = resList[i].name['toLocaleLowerCase']();
				}
				if (AppStorage.resNameType === 2) {
					resList[i].name = resList[i].name['toLocaleUpperCase']();
				}
			}
			var customTypeSuccess: boolean = false;
			var extension: string = FileUtil.getExtension(resList[i].locolUrl);
			for (var j: number = 0; j < customTypeArr.length; j++) {
				var exts: Array<any> = customTypeArr[j].exts;
				if (exts.indexOf(extension) > -1) {
					if (autoType) {
						resList[i].type = resTypeArr[j].key;
					}
					this.checkFileError(resList[i]);
					customTypeSuccess = true;
				}
			}
			if (!customTypeSuccess) {
				if (fontExts.indexOf(extension) > -1) {
					if (autoType) {
						resList[i].type = ResType.TYPE_FONT;
					}
					this.checkFileError(resList[i]);
				} else if (imgExts.indexOf(extension) > -1) {
					if (autoType) {
						resList[i].type = ResType.TYPE_IMAGE;
					}
					this.checkFileError(resList[i]);
				} else if (soundExts.indexOf(extension) > -1) {
					if (autoType) {
						resList[i].type = ResType.TYPE_SOUND;
					}
					this.checkFileError(resList[i]);
				} else if (textExts.indexOf(extension) > -1) {
					if (autoType) {
						resList[i].type = ResType.TYPE_TEXT;
					}
					this.checkFileError(resList[i]);
				} else if (jsonType.indexOf(extension) > -1) {
					// if (!ResUtil.checkFileError(resList[i])) {
					//     ResUtil.checkSheetType(resList[i], (ret: boolean) => {
					//         if (ret) {
					//             if (autoType)
					//                 resList[i].type = ResType.TYPE_SHEET;
					//         } else {
					//             if (autoType)
					//                 resList[i].type = ResType.TYPE_JSON;
					//         }
					//     });
					// } else {
					//     if (autoType)
					resList[i].type = ResType.TYPE_JSON;
					// }
				} else {
					if (autoType) {
						resList[i].type = ResType.TYPE_BIN;
					}
					this.checkFileError(resList[i]);
				}
			}
		}
		console.log(localize('resLog3', 'Fixed res details {0}, time consuming {1} milliseconds', resList.length, (egret.getTimer() - time)));
	}
	/**
	 * 检查是否是sheet格式 ,同时检测json文件是否正确，如果json文件格式错误的话，会将res的fillError设置为true
	 * @param url
	 * @return
	 */
	public static checkSheetType(res: ResInfoVO, callback: (ret: boolean) => void): void {
		const arr: Array<any> = ['file', 'frames'];
		/// 这里读二进制改为读文本，后续注意是否正确。
		fsextra.exists(res.locolUrl, exist => {
			if (exist) {
				fsextra.readFile(res.locolUrl, 'utf8', (err, content: string) => {
					const data: string = content;
					if (!data || '' === data) {
						res.fileError = true;
						return callback(false);
					}
					const jsonObj: any = JSON.parse(data);
					if (!jsonObj) {
						res.fileError = true;
						return callback(false);
					}
					const keyArr: Array<any> = [];
					for (const key in jsonObj) {
						keyArr.push(key);
					}
					if (keyArr.length !== arr.length) {
						return callback(false);
					}
					for (let i: number = 0; i < keyArr.length; i++) {
						let has: boolean = false;
						for (let j: number = 0; j < arr.length; j++) {
							if (keyArr[i] === arr[j]) {
								has = true;
								break;
							}
						}
						if (has === false) {
							return callback(false);
						}
					}
					return callback(true);
				});
			} else {
				callback(false);
			}
		});
	}
	/**
	 * 通过类型得到文件扩展名数组
	 * @param key
	 * @return
	 *
	 */
	private static getExtsByKey(key: string): Array<any> {
		var arr: Array<any>;
		var temp: Array<any> = AppStorage.resType;
		for (var i: number = 0; i < temp.length; i++) {
			if (temp[i].key === key) {
				arr = temp[i].exts;
				break;
			}
		}
		return arr;
	}
	/**
	 * 检查文件正确性
	 * @param url true错误，false正确
	 * @return
	 *
	 */
	private static checkFileError(res: ResInfoVO, callback: (ret: boolean) => void = null): void {
		if (null === res.url || '' === res.url) {
			console.log(JSON.stringify(res));
			// console.log('res:', res, 'url:', res.url, 'localurl:', res.locolUrl);
			// debugger;
		}

		if (res && res.showUrl && (res.showUrl.indexOf(' ') > -1 || res.showUrl.indexOf('　') > -1 || res.name.indexOf(' ') > -1 || res.name.indexOf('　') > -1)) {
			res.fileError = true;
			return callback && callback(true);
		}
		FileUtil.exists(res.locolUrl, (ret: boolean) => {
			if (!ret) {
				if (res) {
					res.fileError = true;
					return callback && callback(true);
				}
			}
			if (res) {
				res.fileError = false;
			}
			return callback && callback(false);
		});
	}
	/**
	 * 检查重名。其中会比对所有res的名字以及sheet的subkeys。
	 * subkey与resname重名也属于重名，引擎按照res.json的先后顺序读取资源项，并保留最先解析到的resname项。
	 */
	public static checkSame(resList: Array<ResInfoVO>) {
		// var time: number = egret.getTimer();
		let m: egret.Dictionary = new egret.Dictionary();
		for (let i: number = 0; i < resList.length; i++) {
			resList[i].isSameName = false;
			if (m.getItem(resList[i].name)) {
				m.getItem(resList[i].name).isSameName = true;
				resList[i].isSameName = true;
			} else {
				m.setItem(resList[i].name, resList[i]);
			}
			if (resList[i].subList) {
				for (let k: number = 0; k < resList[i].subList.length; k++) {
					resList[i].subList[k].isSameName = false;
					if (m.getItem(resList[i].subList[k].name)) {
						m.getItem(resList[i].subList[k].name).isSameName = true;
						resList[i].subList[k].isSameName = true;
					} else {
						m.setItem(resList[i].subList[k].name, resList[i].subList[k]);
					}
				}
			}
		}
		// console.log('检查资源重名' + resList.length + '个，二级Key重名' + subList.length + '个，耗时' + (egret.getTimer() - time) + '毫秒');
	}
	/**
	 * 检查附加项的错误，目前支持：图片九宫格、声音类型
	 * @param resList
	 */
	public static checkOtherError(resList: Array<ResInfoVO>) {
		// var time: number = egret.getTimer();
		// var reg: RegExp = /\[([0-9]*)\,([0-9]*)\,([0-9]*)\,([0-9]*)\]/;
		for (var i: number = 0; i < resList.length; i++) {
			resList[i].otherError = false;
			if (resList[i].type === ResType.TYPE_IMAGE && resList[i].other.length > 0) {
				var scaleArr: Array<any> = resList[i].other.split(',');
				if (scaleArr.length === 4) {
					var x: number = parseInt(scaleArr[0]);
					var y: number = parseInt(scaleArr[1]);
					var w: number = parseInt(scaleArr[2]);
					var h: number = parseInt(scaleArr[3]);
					resList[i].x = x;
					resList[i].y = y;
					resList[i].w = w;
					resList[i].h = h;
					resList[i].other = '' + x + ',' + y + ',' + w + ',' + h + '';
					resList[i].otherError = false;
				} else {
					resList[i].otherError = true;
				}
			} else if (resList[i].type === ResType.TYPE_SOUND) {
				var soundTypes: Array<any> = ResType.SOUND_TYPE;
				var isError: boolean = true;
				if (!resList[i].other) {
					isError = false;
				}
				else {
					for (var j: number = 0; j < soundTypes.length; j++) {
						if (soundTypes[j] === resList[i].other) {
							isError = false;
							break;
						}
					}
				}
				resList[i].otherError = isError;
			} else {
				resList[i].x = 0;
				resList[i].y = 0;
				resList[i].w = 0;
				resList[i].h = 0;
				resList[i].other = '';
			}
		}
		// console.log('检查附加项' + resList.length + '个，耗时' + (egret.getTimer() - time) + '毫秒');
	}
	/**
	 * 检查组的重名
	 * @param groupList
	 *
	 */
	public static checkGroupSameName(groupList: Array<GroupInfoVO>) {
		// var time: number = egret.getTimer();
		var mapForGroup: egret.Dictionary = new egret.Dictionary();
		for (var i: number = 0; i < groupList.length; i++) {
			groupList[i].isSameName = false;
			if (mapForGroup.getItem(groupList[i].groupName)) {
				(<GroupInfoVO>(mapForGroup.getItem(groupList[i].groupName))).isSameName = true;
				groupList[i].isSameName = true;
			} else {
				mapForGroup.setItem(groupList[i].groupName, groupList[i]);
			}
		}
		// console.log('检查组重名' + groupList.length + '个，耗时' + (egret.getTimer() - time) + '毫秒');
	}
	/**
	 * 检测资源是否存在
	 * @param reslist
	 */
	public static checkResExist(resList: ResInfoVO[]): Promise<void> {
		if (!resList.length) {
			return Promise.resolve(null);
		} else {
			let tasks: Promise<void>[] = [];
			for (let i: number = 0; i < resList.length; i++) {
				let vo = resList[i];
				let task = fsextra.pathExists(vo.locolUrl).then(result => {
					vo.fileError = !result;
					if (!vo.fileError) {
						if (vo.type === ResType.TYPE_SHEET && !vo.subList) {
							vo.fileError = true;//解析失败，subList
						}
					}
				});
				tasks.push(task);
			}
			return Promise.all(tasks).then(() => {
				return Promise.resolve(null);
			});
		}
	}
	/**
	 * 加载sheet的资源，作为resInfoVO的subkeys
	 * @param resList
	 *
	 */
	public static loadSheetData(resList: Array<ResInfoVO>): Promise<void> {
		var tasks: Promise<any>[] = [];//异步任务列表
		for (var i: number = 0; i < resList.length; i++) {
			if (!resList[i].fileError) {
				if (resList[i].type === ResType.TYPE_SHEET) {
					var task = this.loadSingleSheetData(resList[i], resList[i].locolUrl).then(result => {
						if (result.subvo) {
							result.res.subList = result.subvo;
						} else {
							result.res.fileError = true;
						}
					});
					tasks.push(task);
				} else {
					resList[i].subList = null;
				}
			}
		}
		return Promise.all(tasks).then(() => {
			return Promise.resolve(null);
		});
	}
	/**
	 * 加载单个sheet的subkeys
	 * 如果sheet文件格式错误，得到的subList为null。
	 * 如果sheet文件格式正确，subList为[]，可以是空数组
	 */
	private static loadSingleSheetData(res: ResInfoVO, url: string): Promise<{ res: ResInfoVO, subvo: SheetSubVO[] }> {
		var list: SheetSubVO[] = [];
		if (!AppStorage.decodeSubkeys) {
			return Promise.resolve({ res: res, subvo: list });
		} else {
			return this.getSheet(url).then(content => {
				if (content && content.frames) {
					var frames: Array<any> = [];
					for (var key in content.frames) {
						frames.push(key);
					}
					frames.sort();
					for (var i: number = 0; i < frames.length; i++) {
						var subVO: SheetSubVO = new SheetSubVO();
						subVO.name = frames[i];
						subVO.isSameName = false;
						list.push(subVO);
					}
					return { res: res, subvo: list };
				} else {
					return { res: res, subvo: null };
				}
			});
		}
	}
	/**
	 * 取sheet的内容
	 */
	private static getSheet(url: string): Promise<any> {
		return fsextra.pathExists(url).then(exist => {
			if (exist) {
				return fsextra.readFile(url, 'uft8').then(fileContent => {
					// let str = encoding.decode(fileContent, 'UTF-8');
					try {
						let content: any = JSON.parse(fileContent);
						if (content && content.file && content.frames) {
							return Promise.resolve(content);
						}
					} catch (err) {
						console.warn(url + localize('res.editor.jsonParseFailed', 'JSON parse failed, please check whether the file is JSON format'), err);
					}
					return null;
				});
			}
			return null;
		});
	}
	/**
	 * 是否是sheet
	 * @param url 传入sheet的json文件地址
	 */
	public static isSheet(url: string): Promise<boolean> {
		return this.getSheet(url).then(content => {
			return !!content;
		});
	}
	/**
	 * @return 返回sheet pic地址
	 */
	public static getSheetPicPath(url: string): Promise<string> {
		return this.getSheet(url).then(content => {
			if (content) {
				let picpath: string = paths.join(paths.dirname(url), content.file);
				return picpath;
			} else {
				return null;
			}
		});
	}
	/**
	 * 修复复合资源:font,sheet，把数据文件和对应的图片资源变成一个资源显示
	 * @param resList 要修复的资源列表
	 * @return 被删除的res们
	 *
	 */
	public static fixMultiRes(resList: Array<ResInfoVO>, groupList: Array<GroupInfoVO>): Array<ResInfoVO> {
		var time: number = egret.getTimer();
		var deletedList: Array<ResInfoVO>;
		deletedList = this.fixSheetHandler(resList, groupList, ResType.TYPE_SHEET);
		deletedList = deletedList.concat(this.fixSheetHandler(resList, groupList, ResType.TYPE_FONT));
		console.log(localize('resLog4', 'Repair complex resources {0}, time consuming {1} milliseconds', resList.length, (egret.getTimer() - time)));
		return deletedList;
	}

	private static fixSheetHandler(resList: Array<ResInfoVO>, groupList: Array<GroupInfoVO>, type: string): Array<ResInfoVO> {
		//检查如果是sheet格式文件，先缓存到数组里
		var needToCheckSheetList: Array<string> = new Array<string>();
		for (var i: number = 0; i < resList.length; i++) {
			if (resList[i].type === type) {
				needToCheckSheetList.push(PathUtil.removeExtFormStr(resList[i].locolUrl).toLocaleLowerCase());
			}
		}
		var needToDeleteList: Array<ResInfoVO> = new Array<ResInfoVO>();
		for (i = 0; i < resList.length; i++) {
			if (resList[i].type === ResType.TYPE_IMAGE) {
				var tmpUrl: string = PathUtil.removeExtFormStr(resList[i].locolUrl).toLocaleLowerCase();
				if (needToCheckSheetList.indexOf(tmpUrl) !== -1) {
					needToDeleteList.push(resList[i]);
				}
			}
		}
		this.deleteResInfo(resList, groupList, needToDeleteList);
		return needToDeleteList;
	}
	/**
	 * 删除资源
	 */
	public static deleteResInfo(fromResList: Array<ResInfoVO>, fromGroupList: Array<GroupInfoVO>, deletes: Array<ResInfoVO>) {
		for (var i: number = 0; i < deletes.length; i++) {
			//从资源列表中删除
			var index: number = fromResList.indexOf(deletes[i]);
			if (index !== -1) {
				fromResList.splice(index, 1);
			}
			//从组中删除
			for (var j: number = 0; j < fromGroupList.length; j++) {
				index = fromGroupList[j].childList['indexOf'](deletes[i]);
				if (index !== -1) {
					fromGroupList[j].childList['splice'](index, 1);
				}
			}
		}
	}

	/**
	 * 生成资源的类型ResType
	 */
	public static createResType(url: string): Promise<string> {
		let promise: Promise<string> = new Promise((c, e) => {
			let type: string;
			let extension: string = paths.extname(url);
			extension = extension.substring(1, extension.length);//去掉扩展名开头的.符号
			if (ResType.IMAGE_TYPE_EXTS.indexOf(extension) !== -1) {
				type = ResType.TYPE_IMAGE;
			} else if (ResType.SOUND_TYPE_EXTS.indexOf(extension) !== -1) {
				type = ResType.TYPE_SOUND;
			} else if (ResType.TEXT_TYPE_EXTS.indexOf(extension) !== -1) {
				type = ResType.TYPE_TEXT;
			} else if (ResType.FONT_TYPE_EXTS.indexOf(extension) !== -1) {
				type = ResType.TYPE_FONT;
			} else if (ResType.JSON_TYPE_EXTS.indexOf(extension) !== -1) {
				// check is sheet type
				let file_path: string = url;
				type = ResType.TYPE_JSON;
				this.isSheet(file_path).then(ret => {
					if (ret) {
						type = ResType.TYPE_SHEET;
					}
					c(type);
				});
				return;
			} else {
				type = ResType.TYPE_BIN;
				c(type);
			}
			if (type) {//普通的类型立刻返回
				c(type);
			}
		});
		return promise;
	}

















	/** 资源路径-随机值 映射*/
	private static urlLoadedMap: any = {};
	/**
	 * 清理内存中已经加载到的所有资源
	 */
	public static clearAllRes() {
		for (let url in this.urlLoadedMap) {
			RES.destroyRes(url + '?' + this.urlLoadedMap[url]);
			delete this.urlLoadedMap[url];
		}
	}
	public static clearRes(url: string) {
		if (this.urlLoadedMap[url]) {
			//console.log('clear ', url + '?' + ResUtil.urlLoadedMap[url]);
			RES.destroyRes(url + '?' + this.urlLoadedMap[url]);// tslint:disable-line
			delete this.urlLoadedMap[url];
		}
	}
	/**
	 * 更新一个资源文件，在内存中删除旧资源，加载新的本地文件
	 */
	private static updateRes(url: string, compFunc: Function, thisObject: any, type?: string) {
		this.clearRes(url);
		this.urlLoadedMap[url] = Math.round(Math.random() * 10000);
		//console.log('new url ', url + '?' + ResUtil.urlLoadedMap[url]);
		RES.getResByUrl(url + '?' + this.urlLoadedMap[url], compFunc, thisObject, type);
	}
	/**
	 * 重新封装RES.getResByUrl，因为RES的getResByUrl无法清理缓存，本地资源有变无法获取最新的资源。
	 * 本方法每次调用清理缓存内容，读取本地最新资源文件
	 */
	public static getResByUrl(url: string, compFunc: Function, thisObject: any, type?: string): void {
		//console.log('get url ', url + '?' + ResUtil.urlLoadedMap[url]);
		if (this.urlLoadedMap[url]) {
			RES.getResByUrl(url + '?' + this.urlLoadedMap[url], compFunc, thisObject, type);
		} else {
			this.updateRes(url, compFunc, thisObject, type);
		}
	}





	///////////////这是个奇葩方法，是为了编辑器面板获取显示的文本用的，姑且放在这里////////////
	public static getRenderLabel(type: string, node: any): string {
		return node.label;
	}
}


