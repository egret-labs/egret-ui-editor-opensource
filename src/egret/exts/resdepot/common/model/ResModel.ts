/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

/* tslint:disable */
import * as fsextra from 'fs-extra';
import * as paths from 'egret/base/common/paths';
import * as fs from 'fs';
import { IDisposable } from 'vs/base/common/lifecycle';
import { IFileService, FileChangesEvent, IFileChange, FileChangeType } from 'egret/platform/files/common/files';
import { ResUtil } from '../utils/ResUtil';
import { FileUtil } from '../utils/FileUtil';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { ResInfoVO } from './ResInfoVO';
import { GroupInfoVO } from './GroupInfoVO';
import { ResFileHelper } from '../utils/ResFileHelper';
import { IResEventService } from '../../events/ResEventService';
import { ResGlobalEvents } from '../../events/ResGlobalEvents';
import { ResType } from '../consts/ResType';
/**
 * 资源库的数据模型。
 */
export class ResModel extends egret.EventDispatcher {
	private fileChangeListener: IDisposable;
	public constructor(
		@IResEventService private resEventService: IResEventService,
		@IEgretProjectService private egretProjectService: IEgretProjectService,
		@IFileService private fileService: IFileService
	) {
		super();
		if (this.fileService) {
			this.fileChangeListener = this.fileService.onFileChanges(e => this.onFileChanges(e));
		}
	}

	/**项目根路径 */
	public prjRoot: string = '';

	private $resRoot: string = '';
	/**资源根路径 */
	public get resRoot(): string {
		return this.$resRoot;
	}
	public set resRoot(value: string) {
		/// 去除路径中多余的斜杠，在末尾需要有路径斜杆，否则拼出来的url可能不正确
		value = paths.normalize(value);
		value = paths.join(value, '/');
		this.$resRoot = value;
		for (let i: number = 0; i < this.resList.length; i++) {
			let vo: ResInfoVO = this.resList[i];
			vo.url = paths.join(value, vo.showUrl);
		}
	}
	private _resourcePath: string;
	/**加载的资源文件的路径 */
	public get resourcePath(): string {
		return this._resourcePath;
	}
	private _resList: Array<ResInfoVO> = new Array<ResInfoVO>();
	public get resList(): Array<ResInfoVO> {
		return this._resList;
	}
	public set resList(value: ResInfoVO[]) {
		this._resList = value;
	}


	private _groupList: Array<GroupInfoVO> = new Array<GroupInfoVO>();
	public get groupList(): Array<GroupInfoVO> {
		return this._groupList;
	}
	public set groupList(value: GroupInfoVO[]) {
		this._groupList = value;
	}

	/**
	 * 读取资源文件default.res.json
	 * @param resjson 资源文件位置
	 * @param resdir 所要读取资源文件的根目录，用于拼url
	 */
	public loadResJson(resjson: string = '', resdir: string = '', content?: string): Promise<any> {
		// console.log("@@##", resjson, resdir, content);
		this._resourcePath = resjson;
		this.resRoot = resdir;
		let promise: Promise<any> = new Promise<any>((resolve, reject) => {
			let contentHandler = json => {
				let obj: any = ResFileHelper.importJson(json);
				if (!obj) {
					this.resList = [];
					this.groupList = [];
					this.resEventService.sendEvent(ResGlobalEvents.Json_FormatError);
					reject(ResGlobalEvents.Json_FormatError);
					return;
				} else {
					this.resEventService.sendEvent(ResGlobalEvents.Json_FormatOk);
					///设置url
					let tasks: Promise<any>[] = [];
					this.resList = obj.resList;
					for (let i: number = 0; i < this.resList.length; i++) {
						let resvo: ResInfoVO = this.resList[i];
						resvo.url = paths.join(resdir, resvo.showUrl);
						//sheet subkeys从sheet文件中读
						if (resvo.type === ResType.TYPE_SHEET) {
							let task = this.updateSheetSubkey([resvo]);
							tasks.push(task);
						}
					}

					this.groupList = obj.groupList;
					if (obj.groupDuplicate) {///如果有组内重复key值，打开res.json文件时检测并且修改文件内容
						this.resEventService.sendEvent(ResGlobalEvents.Json_Modifyed);
					}

					Promise.all(tasks).then(() => {
						resolve({ 'res': obj.resList, 'file': paths.relative(resdir, resjson) });
					});
				}
			};


			if (content || content === '') {//空字符串说明文件是无内容的
				contentHandler(content);
			} else {
				fsextra.pathExists(resjson).then(isExists => {
					if (!isExists) {
						this.resList = [];
						this.groupList = [];
						reject(new Error(resjson + ' not exits!!!'));
					} else {
						// 不要用UTF-8的方式读文件，可能是UTF-8 BOM格式，这样读出来的字符串无法JSON.parse
						fsextra.readFile(resjson, 'utf8').then(fileContent => {
							// let str = encoding.decode(fileContent, 'UTF-8');
							contentHandler(fileContent);
						});
					}
				});
				// console.error('null content!!!');
			}
		});
		return promise;
	}

	//文件列表改变了
	private onFileChanges(e: FileChangesEvent): void {
		for (let i: number = 0; i < e.changes.length; i++) {
			let change: IFileChange = e.changes[i];

			if (FileChangeType.UPDATED === change.type) {// 只处理update的
				for (let k: number = 0; k < this.resList.length; k++) {
					let resvo: ResInfoVO = this.resList[k];
					if (paths.normalize(change.resource.fsPath.toLowerCase()) === paths.normalize(resvo.url.toLowerCase())) {
						ResUtil.clearRes(resvo.url);
						this.dispatchEvent(new egret.Event('update_res_file', false, false, resvo));
						if (resvo.type === ResType.TYPE_SHEET) {//检查sheet文件的改变
							this.dispatchEvent(new egret.Event('update_sheet', false, false, resvo));
						} else if (resvo.type === ResType.TYPE_FONT) {//检查字体文件的改变
							this.dispatchEvent(new egret.Event('update_font', false, false, resvo));
						}
					}
				}
			}
		}
	}

	/**
	 * 添加sheet json文件，删除res.json中的sheet pic
	 * @param urls： sheet的pic
	 * @return 返回删除的vo
	 */
	public delSheetPic(urls: string[]): Promise<ResInfoVO[]> {
		let delVOs: ResInfoVO[] = [];
		for (let i: number = 0; i < urls.length; i++) {
			let sheetFilePicPath: string = urls[i];
			let dels: ResInfoVO[] = this.delResByResUrl(sheetFilePicPath);
			delVOs = delVOs.concat(dels);
		}
		return Promise.resolve(delVOs);
	};
	/**
	 * 创建一个resvo
	 * @param getFromExit  是否从现有的资源列表中查找，true则返回现有资源里的resvo
	 */
	public createResInfo(respath: string, getFromExit: boolean = true): Promise<ResInfoVO> {
		let promise: Promise<ResInfoVO> = new Promise<ResInfoVO>((resolve) => {
			if (getFromExit) {
				for (let i: number = 0; i < this.resList.length; i++) {
					if (this.compPaths(respath, this.resList[i].url)) {
						resolve(this.resList[i]);
						return;
					}
				}
			}
			let resvo: ResInfoVO = new ResInfoVO();
			resvo.name = this.createResName(respath, this.resList);
			resvo.url = respath;
			respath = paths.normalize(respath);
			resvo.showUrl = respath.substr(this.resRoot.length, respath.length - this.resRoot.length);
			// resvo.showUrl = paths.relative(this.resRoot, respath);
			ResUtil.createResType(respath).then((type: string) => {
				resvo.type = type;
				if (ResType.TYPE_SHEET === resvo.type) {
					this.updateSheetSubkey([resvo]).then(ret => {
						// console.log(resvo);
						resolve(resvo);
					});
				} else {
					resolve(resvo);
				}
			});
		});
		return promise;
	}
	/**
	 * 传入资源路径，添加资源到res.json中
	 */
	public addReses(urls: string[]): Promise<ResInfoVO[]> {
		let promise: Promise<ResInfoVO[]> = new Promise<ResInfoVO[]>(resolve => {
			let addedReses: ResInfoVO[] = [];//包含此前已经存在的资源
			let tasks: Promise<void>[] = [];
			// let startTime: number = egret.getTimer();
			for (let i: number = 0; i < urls.length; i++) {
				let task = this.createResInfo(urls[i], true).then(resvo => {
					if (this.resList.indexOf(resvo) === -1) {
						this.resList.push(resvo);
					}
					addedReses.push(resvo);
				});
				tasks.push(task);
			}
			Promise.all(tasks).then(() => {
				this.checkSameName().then(ret => {
					resolve(addedReses);
				});

			});

		});
		return promise;
	}

	/**
	 * 生成默认的资源key，不能与现有的key重名。如果遇到重名则在末尾递增数字 ***0 ***1 ***2
	 */
	private createResName(url: string, reses: any): string {
		//eg: we\abc.png
		let basename = paths.basename(url);//abc.png
		let extension = paths.extname(url);//.png
		let fName = basename.substr(0, basename.length - extension.length);
		extension = extension.substring(1, extension.length);//去掉扩展名开头的.符号
		fName += '_' + extension;
		let tempName: string = fName;
		return tempName;
	};

	/**
	 * 更新sheet的subkeys
	 */
	public updateSheetSubkey(resList: ResInfoVO[]): Promise<void> {
		return ResUtil.loadSheetData(resList);
		// let tasks: TPromise<any>[] = [];
		// for (var i: number = 0; i < resList.length; i++) {
		// 	let resvo = resList[i];
		// 	if (resvo.type === ResType.TYPE_SHEET) {
		// 		let task = ResUtil.loadSheetData(resvo.locolUrl).then(subList => {
		// 			resvo.subList = subList;//subList可能为null
		// 			if (!subList) {
		// 				resvo.fileError = true;//这里设置没有用，会在错误检测时重新赋值
		// 			}
		// 		});
		// 		tasks.push(task);
		// 	}
		// }
		// return TPromise.join(tasks).then(() => {
		// 	return TPromise.as(null);
		// });
	}

	////拖入资源的处理
	private outerDragInFileCopy: boolean = true;///拖入的外部资源是否copy到当前项目的资源目录里
	private filterOneFile(urls: string[], i: number): Promise<void> {
		let promise: Promise<void> = new Promise<void>(resolve => {
			if (i < urls.length) {
				let url: string = urls[i];
				if (!this.compPathInRoot(url)) {//比较结果是外部的文件
					if (!this.outerDragInFileCopy) {//不copy过来则舍弃掉
						urls.splice(i, 1);
						i--;
						this.filterOneFile(urls, i + 1).then(resolve2 => {
							resolve(void 0);
						});
					} else {//从外部拖入的文件会放到assets下，并且会替换原有的同名文件
						let assetsDir: string = paths.join(this.resRoot, 'assets');
						if (!fs.existsSync(assetsDir)) {
							fs.mkdirSync(assetsDir);
						}
						let basename: string = paths.basename(url);
						let target: string = paths.join(this.resRoot, 'assets', basename);
						urls.splice(i, 1, target);
						fsextra.copy(url, target, (error) => {
							this.filterOneFile(urls, i + 1).then(resolve2 => {
								resolve(void 0);
							});
						});
					}
				} else {//内部的文件，保留，继续检查下一项
					this.filterOneFile(urls, i + 1).then(resolve2 => {
						resolve(void 0);
					});
				}
			} else {
				resolve(void 0);
			}
		});
		return promise;
	}

	/**检查拖入的资源是否合法，非当前项目的资源都放到assets下*/
	private filterDragInFileLegal(urls: string[]): Promise<string[]> {
		let promise: Promise<string[]> = new Promise<string[]>(resolve => {
			let doFilterFile = (arr: string[]) => {
				urls.length = 0;
				// 检测拖入的是否是支持的资源文件类型
				for (let i: number = 0; i < arr.length; i++) {
					let file_ext: string = paths.extname(arr[i]);
					if (file_ext && file_ext.length) {
						file_ext = file_ext.substr(1, file_ext.length);
						for (let k: number = 0; k < ResType.DEFAULT_TYPE.length; k++) {
							// if (ResType.DEFAULT_TYPE[k].exts.indexOf(file_ext) !== -1) {
							//支持任意格式
							urls.push(arr[i]);
							break;
							// }
						}
					}
				}

				this.filterOneFile(urls, 0).then(() => {
					resolve(urls);
				});
			};
			let allDragInFileUrls: string[] = [];//拖入的文件与文件夹的文件子项
			if (urls.length) {
				// 处理拖入文件夹的情况
				let excuteUrls: number = 0;//已经检查的url数量
				for (let i: number = 0; i < urls.length; i++) {
					excuteUrls++;
					fsextra.pathExists(urls[i]).then(isFile => {
						if (isFile) {
							excuteUrls--;
							allDragInFileUrls.push(urls[i]);
							if (excuteUrls === 0) {
								doFilterFile(allDragInFileUrls);
							}
						} else {
							FileUtil.getAllFilesInDir(urls[i]).then(ret_files => {
								excuteUrls--;
								allDragInFileUrls = allDragInFileUrls.concat(ret_files);
								if (0 === excuteUrls) {
									doFilterFile(allDragInFileUrls);
								}
							});
						}
					});
				}
			} else {
				allDragInFileUrls = urls;
				doFilterFile(allDragInFileUrls);
			}
		});
		return promise;
	}

	/**
	 * 过滤拖拽进入的资源，sheet的图片文件排除，文件夹的处理等
	 * @return 返回sheet文件
	 */
	public filterDragInFiles(urls: string[]): Promise<string[]> {
		let promise: Promise<string[]> = new Promise<string[]>(resolve => {
			if (!urls || !urls.length) {
				resolve(urls);
			}
			this.filterDragInFileLegal(urls).then(newUrls => {
				urls = newUrls;
				if (!urls || !urls.length) {
					resolve(urls);
				}
				//添加sheet，图片与json一起拖入时，排除sheet的图片项，保留json项（通过同名路径来排除）
				let jsons: string[] = [];//sheet格式的文件
				let dragInSheetPics: string[] = [];//拖入的sheet
				let tasks: Promise<void>[] = [];
				for (let i: number = 0; i < urls.length; i++) {
					let url: string = urls[i];
					let ext: string = paths.extname(url);
					if (ext && ext.length) {
						ext = ext.substr(1, ext.length);
						if (ResType.JSON_TYPE_EXTS.indexOf(ext) !== -1) {
							if (dragInSheetPics.indexOf(url) === -1) {
								let task = ResUtil.getSheetPicPath(url).then(ret => {
									if (ret) {
										dragInSheetPics.push(ret);
										jsons.push(url);
									}
								});
								tasks.push(task);
							}
						}
					}
				}

				Promise.all(tasks).then(() => {
					let resjsonJsons: string[] = [];//从res.json数据中取已经添加进来的sheet
					//从res.json数据中取已经添加进来的sheet
					for (let i: number = 0; i < this.resList.length; i++) {
						let resvo: ResInfoVO = this.resList[i];
						if (ResType.TYPE_SHEET === resvo.type) {
							let locolUrl: string = paths.normalize(resvo.locolUrl.toLowerCase());
							if (jsons.indexOf(locolUrl) === -1) {
								jsons.push(locolUrl);
								resjsonJsons.push(locolUrl);
							}
						}
					}
					let dragInSheetPic_to_Json: string[] = [];//拖入的sheet pic如果已经在res.json中是存在的则转换为json文件（为了在tree中定位该文件）
					//排除拖入的sheet的图片
					for (let i: number = 0; i < jsons.length; i++) {
						let url: string = jsons[i];
						let ext: string = paths.extname(url);
						ext = ext.substr(1, ext.length);
						let filepath: string = url.substr(0, url.length - ext.length);
						for (let k: number = 0; k < urls.length; k++) {
							let temp_ext: string = paths.extname(urls[k]);
							temp_ext = temp_ext.substr(1, temp_ext.length);
							if (ResType.IMAGE_TYPE_EXTS.indexOf(temp_ext) !== -1) {
								let temp_filepath: string = urls[k].substr(0, urls[k].length - temp_ext.length);
								if (this.compPaths(filepath, temp_filepath)) {
									if (resjsonJsons.indexOf(url) !== -1) {
										dragInSheetPic_to_Json.push(url);
									}
									urls.splice(k, 1);
									break;
								}
							}
						}
					}

					if (dragInSheetPic_to_Json.length) {
						for (let i: number = 0; i < dragInSheetPic_to_Json.length; i++) {
							urls.push(dragInSheetPic_to_Json[i]);
						}
					}
					resolve(dragInSheetPics);
				});
			});
		});
		return promise;
	}

	/**
	 * 从res.json中删除resvo相关的组数据
	 */
	private delResInGroup(resvo: ResInfoVO): number {
		let delNumInGroup: number = 0;
		for (let i: number = 0; i < this.groupList.length; i++) {
			let gvo: GroupInfoVO = this.groupList[i];
			let indexInGroup: number = gvo.childList.indexOf(resvo);
			if (indexInGroup !== -1) {
				gvo.childList.splice(indexInGroup, 1);
				delNumInGroup++;
			}
		}
		return delNumInGroup;
	}
	private delOneRes(resvo: ResInfoVO): boolean {
		let index: number = this.resList.indexOf(resvo);
		if (index !== -1) {
			this.resList.splice(index, 1);
			this.delResInGroup(resvo);
			return true;
		}
		return false;
	}
	public delReses(reses: ResInfoVO[]): Promise<number> {
		let promise: Promise<number> = new Promise<number>(resolve => {
			let delnum: number = 0;
			for (let i: number = 0; i < reses.length; i++) {
				if (this.delOneRes(reses[i])) {
					delnum++;
				}
			}
			this.checkSameName().then(() => {
				resolve(delnum);
			});
		});
		return promise;
	}
	// /**
	//  * 从res.json中删除资源名为resname的资源，删除组中相关的资源
	//  */
	// public delResByResName(resname: string): boolean {
	// 	let delNumInList: number = 0;
	// 	for (let i: number = 0; i < this.resList.length; i++) {
	// 		let resvo: ResInfoVO = this.resList[0];
	// 		if (resname === resvo.name) {
	// 			this.resList.splice(i, 1);
	// 			this.checkSameName();
	// 			delNumInList++;
	// 			this.delResInGroup(resvo);
	// 			i--;
	// 		}
	// 	}
	// 	return delNumInList > 0;
	// }
	/**
	 * 从res.json中删除资源路径为locolUrl的资源，删除组中相关的资源
	 * @return 返回删除的项
	 */
	public delResByResUrl(locolUrl: string): ResInfoVO[] {
		let delVOs: ResInfoVO[] = [];
		for (let i: number = 0; i < this.resList.length; i++) {
			let resvo: ResInfoVO = this.resList[i];
			if (this.compPaths(resvo.locolUrl, locolUrl)) {
				this.resList.splice(i, 1);
				delVOs.push(resvo);
				this.delResInGroup(resvo);
				i--;
				//break;//break则只清理一个数据，不break则清理所有数据
			}
		}
		return delVOs;
	}
	/** 比较两个路径是否相等，忽略大小写 */
	private compPaths(path1: string, path2: string): boolean {
		let normalize_path1: string = paths.normalize(path1).toLowerCase();
		let normalize_path2: string = paths.normalize(path2).toLowerCase();
		return normalize_path1 === normalize_path2;
	}
	/** 比较路径是否存在于资源根路径中 */
	private compPathInRoot(path: string): boolean {
		let resRoot2: string = paths.normalize(this.resRoot).toLowerCase();
		let path2: string = paths.normalize(path).toLowerCase();
		if (path2.indexOf(resRoot2) !== -1) {
			return true;
		}
		return false;
	}
	/**检查资源名重复的数据 */
	public checkSameName(): Promise<void> {
		let promise: Promise<void> = new Promise<void>(resolve => {
			ResUtil.checkSame(this.resList);
			ResUtil.checkGroupSameName(this.groupList);
			ResUtil.checkOtherError(this.resList);
			ResUtil.checkResExist(this.resList).then(ret => {
				resolve(null);
				this.resEventService.sendEvent(ResGlobalEvents.TREE_SAME_NAME);
			});
		});
		return promise;
	}
	public clear() {
		this.resList.length = 0;
		this.groupList.length = 0;
	}

}
