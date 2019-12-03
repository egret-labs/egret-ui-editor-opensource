import * as paths from 'egret/base/common/paths';

import * as fsextra from 'fs-extra';
import { SheetSubVO } from '../common/SheetSubVO';
import { ResInfoVO } from '../common/ResInfoVO';

/**
 * 资源util
 */
export class ResUtil {
	/**
	 * 取sheet的subkeys
	 * 如果sheet文件格式错误，得到的subList为null。
	 * 如果sheet文件格式正确，subList为[]，可以是空数组
	 */
	public static loadSheetData(url: string): Promise<any> {
		const list: SheetSubVO[] = [];
		return ResUtil.getSheet(url).then(content => {
			if (content && content.frames) {
				const frames: Array<any> = [];
				for (const key in content.frames) {
					frames.push(key);
				}
				frames.sort();
				for (let i: number = 0; i < frames.length; i++) {
					const subVO: SheetSubVO = new SheetSubVO();
					subVO.name = frames[i];
					subVO.sheetData = content.frames[subVO.name];
					subVO.isSameName = false;

					list.push(subVO);
				}
				return Promise.all(list);
			}
		});
	}

	/**
	 * 通过类型得到文件扩展名数组
	 * @param key
	 * @return
	 *
	 */
	public static getExtsByKey(key: string): Array<any> {
		const arr: Array<any> = [];
		// var temp: Array<any> = AppStorage.resType;
		// for (var i: number = 0; i < temp.length; i++) {
		// 	if (temp[i].key === key) {
		// 		arr = temp[i].exts;
		// 		break;
		// 	}
		// }
		return arr;
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
	 * 检查文件正确性
	 * @param url true错误，false正确
	 * @return
	 *
	 */
	public static checkFileError(res: ResInfoVO, callback: (ret: boolean) => void = null): void {
		if (null === res.url || '' === res.url) {
			console.log(JSON.stringify(res));
			// console.log('res:', res, 'url:', res.url, 'localurl:', res.locolUrl);
			// debugger;
		}

		if (res && res.showUrl && (res.showUrl.indexOf(' ') > -1 || res.showUrl.indexOf('　') > -1 || res.name.indexOf(' ') > -1 || res.name.indexOf('　') > -1)) {
			res.fileError = true;
			return callback && callback(true);
		}

		fsextra.exists(res.locolUrl, (ret: boolean) => {
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
	 * 检查文件是否存在，增加了？参数的形式可能
	 */
	public static fileExists(url: string, callback: (ret: boolean) => void): void {
		return fsextra.exists(url, callback);
	}

	/**
	 * 取sheet的内容
	 */
	private static getSheet(url: string): Promise<any> {

		return new Promise((resolve, reject) => {
			fsextra.exists(url, exist => {
				if (exist) {
					fsextra.readJson(url, (err, data) => {
						resolve(data);
					});
				}else{
					resolve(null);
				}
			});
		});


	}
	/**
	 * 是否是sheet
	 * @param url 传入sheet的json文件地址
	 */
	public static isSheet(url: string): Promise<boolean> {
		return ResUtil.getSheet(url).then(content => {
			if (content) {
				return Promise.resolve(true);
			}
		});
	}
	/**
	 * @return 返回sheet pic地址
	 */
	public static getSheetPicPath = (url: string): Promise<string> => {
		return ResUtil.getSheet(url).then(content => {
			if (content) {
				const picpath: string = paths.join(paths.dirname(url), content.file);
				return Promise.resolve(picpath);
			}
		});
	}
	/**
	 * tree的渲染器的label
	 * @param type resdepot/material
	 */
	public static getRenderLabel(type: string, node: any): string {
		// let label: string = '';
		// if ('resdepot' === type) {
		//	 if (node instanceof TreeLeafNode) {
		//		 var leaf: TreeLeafNode = node;
		//		 if (leaf.resvo.type === ResType.TYPE_SHEET) {
		//			 return node.label;// subvo显示为资源名
		//		 } else {
		//			 return paths.basename(leaf.resvo.locolUrl);
		//		 }
		//	 } else {
		//		 return node.label;
		//	 }
		// } else if ('material' === type) {
		//	 if (node instanceof TreeLeafNode) {
		//		 var leaf: TreeLeafNode = node;
		//		 if (leaf.resvo.type === ResType.TYPE_SHEET) {
		//			 return node.label;// subvo显示为资源名
		//		 } else {
		//			 return leaf.resvo.name;
		//			 // return paths.basename(leaf.resvo.name);//这种方式有bug，如果文件名为 1/2/3只会显示3
		//		 }
		//	 } else {
		//		 return node.label;
		//	 }
		// }
		// return label;
		return node.label;
	}

	/** 资源路径-随机值 映射*/
	private static urlLoadedMap: any = {};
	/**
	 * 清理内存中已经加载到的所有资源
	 */
	public static clearAllRes() {
		for (const url in ResUtil.urlLoadedMap) {
			// RES.destroyRes(url + '?' + ResUtil.urlLoadedMap[url]);
			delete ResUtil.urlLoadedMap[url];
		}
	}

	/**
	 * 清除资源
	 * @param url 
	 */
	public static clearRes(url: string) {
		if (ResUtil.urlLoadedMap[url]) {
			//console.log('clear ', url + '?' + ResUtil.urlLoadedMap[url]);
			// RES.destroyRes(url + '?' + ResUtil.urlLoadedMap[url]);// tslint:disable-line
			delete ResUtil.urlLoadedMap[url];
		}
	}
	/**
	 * 更新一个资源文件，在内存中删除旧资源，加载新的本地文件
	 */
	private static updateRes(url: string, compFunc: Function, thisObject: any, type?: string) {
		ResUtil.clearRes(url);
		ResUtil.urlLoadedMap[url] = Math.round(Math.random() * 10000);
		//console.log('new url ', url + '?' + ResUtil.urlLoadedMap[url]);
		// RES.getResByUrl(url + '?' + ResUtil.urlLoadedMap[url], compFunc, thisObject, type);
	}
	/**
	 * 重新封装RES.getResByUrl，因为RES的getResByUrl无法清理缓存，本地资源有变无法获取最新的资源。
	 * 本方法每次调用清理缓存内容，读取本地最新资源文件
	 */
	public static getResByUrl(url: string, compFunc: Function, thisObject: any, type?: string): void {
		// RES.getResByUrl(url, compFunc, thisObject, type);
		// return;
		//console.log('get url ', url + '?' + ResUtil.urlLoadedMap[url]);
		if (ResUtil.urlLoadedMap[url]) {
			// RES.getResByUrl(url + '?' + ResUtil.urlLoadedMap[url], compFunc, thisObject, type);
		} else {
			ResUtil.updateRes(url, compFunc, thisObject, type);
		}
	}
}