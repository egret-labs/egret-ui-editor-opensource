import * as paths from 'egret/base/common/paths';
import * as events from 'events';
import * as fsextra from 'fs-extra';
import * as path from 'path';
/* tslint:enable */
import { IDisposable } from 'vs/base/common/lifecycle';
import { ResType } from './ResType';
import { ResInfoVO } from './ResInfoVO';
import { FileChangeType, FileChangesEvent, IFileChange, IFileService } from 'egret/platform/files/common/files';
import { GroupInfoVO } from './GroupInfoVO';
import { ResUtil } from '../utils/ResUtil';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { ResFileHelper } from 'egret/workbench/parts/assets/material/utils/ResFileHelper';
import { ResGlobalEventManager } from 'egret/workbench/parts/assets/material/event/ResGlobalEventManager';
import { ResGlobalEvents } from 'egret/workbench/parts/assets/material/event/ResGlobalEvents';
import URI from 'egret/base/common/uri';
import { ResConfig } from 'egret/workbench/parts/assets/material/common/ResConfig';
/**
 * 资源库的数据
 */
export class ResLibData {

	/**
	 * load 资源 
	 */
	public loadRes = async (): Promise<any> => {

		if (this.egretProjectService && this.egretProjectService.projectModel) {
			await this.egretProjectService.ensureLoaded();
			const tasks = [];
			const loadOneRes = (resconfig) => {

				tasks.push(this.loadResJson(path.join(this.egretProjectService.projectModel.project.fsPath, resconfig.url), path.join(this.egretProjectService.projectModel.project.fsPath, resconfig.folder)));
			};
			for (let i: number = 0; i < this.egretProjectService.projectModel.resConfigs.length; i++) {
				const resconfig: any = this.egretProjectService.projectModel.resConfigs[i];
				loadOneRes(resconfig);
			}
			return Promise.all(tasks);
		} else {
			return Promise.resolve(null);
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
			const vo: ResInfoVO = this.resList[i];
			vo.url = paths.join(value, vo.showUrl);
		}
	}
	/** 已经加载过的资源缓存 */
	public static caches: { [url: string]: Array<ResInfoVO> } = {};
	/** 底层数据发生变化后，向上层抛出事件 */
	public eventDispater: events.EventEmitter = new events.EventEmitter();

	private _resList: Array<ResInfoVO> = new Array<ResInfoVO>();
	/**
	 * 获取resList
	 */
	public get resList(): Array<ResInfoVO> {
		return this._resList;
	}
	public set resList(value: ResInfoVO[]) {
		this._resList = value;
	}

	/** 资源组的缓存 */
	private static group_caches: any = {};

	private _groupList: Array<GroupInfoVO> = new Array<GroupInfoVO>();

	/**
	 * 获取资源组
	 */
	public get groupList(): Array<GroupInfoVO> {
		return this._groupList;
	}
	public set groupList(value: GroupInfoVO[]) {
		this._groupList = value;
	}

	private fileChangeListener: IDisposable;



	public constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IEgretProjectService private egretProjectService: IEgretProjectService,
		@IFileService private fileService: IFileService
	) {
		if (this.fileService) {
			this.fileChangeListener = this.fileService.onFileChanges(e => this.onFileChanges(e));
		}
	}
	//文件列表改变了
	private onFileChanges(e: FileChangesEvent): void {
		for (let i: number = 0; i < e.changes.length; i++) {
			const change: IFileChange = e.changes[i];

			if (FileChangeType.UPDATED === change.type) {// 只处理update的
				for (const i in ResLibData.caches) {
					const list = ResLibData.caches[i];
					for (let k: number = 0; k < list.length; k++) {
						const resvo: ResInfoVO = list[k];
						if (paths.normalize(change.resource.fsPath.toLowerCase()) === paths.normalize(resvo.url.toLowerCase())) {
							ResUtil.clearRes(resvo.url);

							//TODO 文件更新处理


							// this.eventDispater.dispatchEvent(new egret.Event('update_res_file', false, false, resvo));
							// if (resvo.type === ResType.TYPE_SHEET) {//检查sheet文件的改变
							// 	this.eventDispater.dispatchEvent(new egret.Event('update_sheet', false, false, resvo));
							// } else if (resvo.type === ResType.TYPE_FONT) {//检查字体文件的改变
							// 	this.eventDispater.dispatchEvent(new egret.Event('update_font', false, false, resvo));
							// }
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
	public delSheetPic = (urls: string[]): Promise<ResInfoVO[]> => {
		let delVOs: ResInfoVO[] = [];
		for (let i: number = 0; i < urls.length; i++) {
			const sheetFilePicPath: string = urls[i];
			const dels: ResInfoVO[] = this.delResByResUrl(sheetFilePicPath);
			delVOs = delVOs.concat(dels);
		}
		return Promise.resolve(delVOs);
	}

	/**
	 * 创建一个resvo
	 * @param getFromExit  是否从现有的资源列表中查找，true则返回现有资源里的resvo
	 */
	public createResInfo(respath: string, getFromExit: boolean = true): Promise<ResInfoVO> {
		const promise: Promise<ResInfoVO> = new Promise<ResInfoVO>((resolve) => {
			if (getFromExit) {
				for (let i: number = 0; i < this.resList.length; i++) {
					if (this.compPaths(respath, this.resList[i].url)) {
						resolve(this.resList[i]);
						return;
					}
				}
			}
			const resvo: ResInfoVO = new ResInfoVO();
			resvo.name = this.createResName(respath, this.resList);
			resvo.url = respath;
			respath = paths.normalize(respath);
			resvo.showUrl = respath.substr(this.resRoot.length, respath.length - this.resRoot.length);
			// resvo.showUrl = paths.relative(this.resRoot, respath);
			ResLibData.createResType(respath).then((type: string) => {
				resvo.type = type;
				if (ResType.TYPE_SHEET === resvo.type) {
					this.updateSheetSubkey([resvo]).then(ret => {
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
		const promise: Promise<ResInfoVO[]> = new Promise<ResInfoVO[]>(resolve => {
			const addedReses: ResInfoVO[] = [];//包含此前已经存在的资源
			const tasks: Promise<void>[] = [];
			// let startTime: number = egret.getTimer();
			for (let i: number = 0; i < urls.length; i++) {
				const task = this.createResInfo(urls[i], true).then(resvo => {
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
	private createResName = (url: string, reses: any): string => {
		//eg: we\abc.png
		const basename = paths.basename(url);//abc.png
		let extension = paths.extname(url);//.png
		let fName = basename.substr(0, basename.length - extension.length);
		extension = extension.substring(1, extension.length);//去掉扩展名开头的.符号
		fName += '_' + extension;
		return fName;
	}
	/**
	 * 生成资源的类型ResType
	 */
	public static createResType = (url: string): Promise<string> => {
		const promise: Promise<string> = new Promise((resolve) => {
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
				const file_path: string = url;
				type = ResType.TYPE_JSON;
				ResUtil.isSheet(file_path).then(ret => {
					if (ret) {
						type = ResType.TYPE_SHEET;
					}
					resolve(type);
				});
				return promise;
			} else {
				type = ResType.TYPE_BIN;
				resolve(type);
			}
			if (type) {//普通的类型立刻返回
				resolve(type);
			}
		});
		return promise;
	}
	/**
	 * 读取资源文件default.res.json
	 * @param resjson 资源文件位置
	 * @param resdir 所要读取资源文件的根目录，用于拼url
	 */
	public loadResJson = (resjson: string = '', resdir: string = '', content?: string): Promise<any> => {
		this.resRoot = resdir;
		resdir = this.resRoot;
		const promise: Promise<any> = new Promise<any>((resolve, reject) => {
			const contentHandler = json => {
				const obj: { resList: Array<ResInfoVO>, groupList: Array<GroupInfoVO>, groupDuplicate: boolean } = ResFileHelper.importJson(json);
				if (!obj) {
					this.resList = [];
					this.groupList = [];
					ResGlobalEventManager.sendEvent(ResGlobalEvents.Json_FormatError);
					reject(ResGlobalEvents.Json_FormatError);
					return;
				} else {
					///设置url
					const tasks: Promise<any>[] = [];
					this.resList = obj.resList;
					for (let i: number = 0; i < this.resList.length; i++) {
						const resvo: ResInfoVO = this.resList[i];
						resvo.url = paths.join(resdir, resvo.showUrl);

						//sheet subkeys从sheet文件中读
						if (resvo.type === ResType.TYPE_SHEET) {
							const task = this.updateSheetSubkey([resvo]);
							tasks.push(task);
						}
					}

					this.groupList = obj.groupList;
					if (obj.groupDuplicate) {///如果有组内重复key值，打开res.json文件时检测并且修改文件内容
						ResGlobalEventManager.sendEvent(ResGlobalEvents.Json_Modifyed);
					}

					//加载的所有文件保存到cache中，对于资源库加载多个文件有用
					ResLibData.caches[resjson] = this.resList;
					ResLibData.group_caches[resjson] = this.groupList;


					Promise.all(tasks).then(() => {
						resolve({ 'res': obj.resList, 'file': paths.relative(resdir, resjson) });
					});
				}
			};
			if (content || content === '') {//空字符串说明文件是无内容的
				contentHandler(content);
			} else {
				fsextra.exists(resjson, exists => {
					if (!exists) {
						this.resList = [];
						this.groupList = [];
						reject(new Error(resjson + ' not exits!!!'));
					} else {
						fsextra.readFile(resjson, (err, fileContent) => {
							contentHandler(fileContent);
						});
					}
				});
			}
		});
		return promise;
	}

	/**
	 * 更新sheet的subkeys
	 */
	public updateSheetSubkey(resList: ResInfoVO[]): Promise<any[]> {
		const tasks: Promise<any>[] = [];
		for (let i: number = 0; i < resList.length; i++) {
			const resvo = resList[i];
			if (resvo.type === ResType.TYPE_SHEET) {
				const task = ResUtil.loadSheetData(resvo.locolUrl).then(subList => {
					resvo.subList = subList;//subList可能为null
					if (!subList) {
						resvo.fileError = true;//这里设置没有用，会在错误检测时重新赋值
					}
				});
				tasks.push(task);
			}
		}
		return Promise.all(tasks);
	}

	////拖入资源的处理
	private outerDragInFileCopy: boolean = true;///拖入的外部资源是否copy到当前项目的资源目录里
	private filterOneFile(urls: string[], i: number): Promise<void> {
		const promise: Promise<void> = new Promise<void>(resolve => {
			if (i < urls.length) {
				const url: string = urls[i];
				if (!this.compPathInRoot(url)) {//比较结果是外部的文件
					if (!this.outerDragInFileCopy) {//不copy过来则舍弃掉
						urls.splice(i, 1);
						i--;
						this.filterOneFile(urls, i + 1).then(resolve2 => {
							resolve(void 0);
						});
					} else {//从外部拖入的文件会放到assets下，并且会替换原有的同名文件
						const assetsDir: string = paths.join(this.resRoot, 'assets');
						if (!fsextra.existsSync(assetsDir)) {
							fsextra.mkdirSync(assetsDir);
						}
						const basename: string = paths.basename(url);
						const target: string = paths.join(this.resRoot, 'assets', basename);
						urls.splice(i, 1, target);
						this.fileService.copyFile(URI.file(url), URI.file(target)).then(() => {
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
		const promise: Promise<string[]> = new Promise<string[]>(resolve => {
			const doFilterFile = (arr: string[]) => {
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
					fsextra.exists(urls[i], isFile => {
						if (isFile) {
							excuteUrls--;
							allDragInFileUrls.push(urls[i]);
							if (excuteUrls === 0) {
								doFilterFile(allDragInFileUrls);
							}
						} else {
							// FileUtil.getAllFilesInDir(urls[i]).then(ret_files => {
							// 	excuteUrls--;
							// 	allDragInFileUrls = allDragInFileUrls.concat(ret_files);
							// 	if (0 === excuteUrls) {
							// 		doFilterFile(allDragInFileUrls);
							// 	}
							// });
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
		const promise: Promise<string[]> = new Promise<string[]>(resolve => {
			if (!urls || !urls.length) {
				resolve(urls);
			}
			this.filterDragInFileLegal(urls).then(newUrls => {
				urls = newUrls;
				if (!urls || !urls.length) {
					resolve(urls);
				}
				//添加sheet，图片与json一起拖入时，排除sheet的图片项，保留json项（通过同名路径来排除）
				const jsons: string[] = [];//sheet格式的文件
				const dragInSheetPics: string[] = [];//拖入的sheet
				const tasks: Promise<void>[] = [];
				for (let i: number = 0; i < urls.length; i++) {
					const url: string = urls[i];
					let ext: string = paths.extname(url);
					if (ext && ext.length) {
						ext = ext.substr(1, ext.length);
						if (ResType.JSON_TYPE_EXTS.indexOf(ext) !== -1) {
							if (dragInSheetPics.indexOf(url) === -1) {
								const task = ResUtil.getSheetPicPath(url).then(ret => {
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
					const resjsonJsons: string[] = [];//从res.json数据中取已经添加进来的sheet
					//从res.json数据中取已经添加进来的sheet
					for (let i: number = 0; i < this.resList.length; i++) {
						const resvo: ResInfoVO = this.resList[i];
						if (ResType.TYPE_SHEET === resvo.type) {
							const locolUrl: string = paths.normalize(resvo.locolUrl.toLowerCase());
							if (jsons.indexOf(locolUrl) === -1) {
								jsons.push(locolUrl);
								resjsonJsons.push(locolUrl);
							}
						}
					}
					const dragInSheetPic_to_Json: string[] = [];//拖入的sheet pic如果已经在res.json中是存在的则转换为json文件（为了在tree中定位该文件）
					//排除拖入的sheet的图片
					for (let i: number = 0; i < jsons.length; i++) {
						const url: string = jsons[i];
						let ext: string = paths.extname(url);
						ext = ext.substr(1, ext.length);
						const filepath: string = url.substr(0, url.length - ext.length);
						for (let k: number = 0; k < urls.length; k++) {
							let temp_ext: string = paths.extname(urls[k]);
							temp_ext = temp_ext.substr(1, temp_ext.length);
							if (ResType.IMAGE_TYPE_EXTS.indexOf(temp_ext) !== -1) {
								const temp_filepath: string = urls[k].substr(0, urls[k].length - temp_ext.length);
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
			const gvo: GroupInfoVO = this.groupList[i];
			const indexInGroup: number = gvo.childList.indexOf(resvo);
			if (indexInGroup !== -1) {
				gvo.childList.splice(indexInGroup, 1);
				delNumInGroup++;
			}
		}
		return delNumInGroup;
	}
	private delOneRes(resvo: ResInfoVO): boolean {
		const index: number = this.resList.indexOf(resvo);
		if (index !== -1) {
			this.resList.splice(index, 1);
			this.delResInGroup(resvo);
			return true;
		}
		return false;
	}

	/**
	 * 删除资源
	 * @param reses 
	 */
	public delReses(reses: ResInfoVO[]): Promise<number> {
		const promise: Promise<number> = new Promise<number>(resolve => {
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

	/**
	 * 从res.json中删除资源路径为locolUrl的资源，删除组中相关的资源
	 * @return 返回删除的项
	 */
	public delResByResUrl(locolUrl: string): ResInfoVO[] {
		const delVOs: ResInfoVO[] = [];
		for (let i: number = 0; i < this.resList.length; i++) {
			const resvo: ResInfoVO = this.resList[i];
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
		const normalize_path1: string = paths.normalize(path1).toLowerCase();
		const normalize_path2: string = paths.normalize(path2).toLowerCase();
		return normalize_path1 === normalize_path2;
	}
	/** 比较路径是否存在于资源根路径中 */
	private compPathInRoot(path: string): boolean {
		const resRoot2: string = paths.normalize(this.resRoot).toLowerCase();
		const path2: string = paths.normalize(path).toLowerCase();
		if (path2.indexOf(resRoot2) !== -1) {
			return true;
		}
		return false;
	}
	/**
	 * 清除
	 */
	public clear() {
		this.resList.length = 0;
		this.groupList.length = 0;
	}
	/**检查资源名重复的数据 */
	public checkSameName(): Promise<void> {
		const promise: Promise<void> = new Promise<void>(resolve => {
			///调用ResConfig之前写的方法
			ResConfig.instance.checkSame(this.resList);
			ResConfig.instance.checkGroupSameName(this.groupList);
			ResConfig.instance.checkOtherError(this.resList);
			ResConfig.instance.checkResExist(this.resList).then(ret => {
				resolve(null);
				ResGlobalEventManager.sendEvent(ResGlobalEvents.TREE_SAME_NAME);
			});
		});
		return promise;
	}

	/**
	 * bitmapFonts 字体
	 */
	public static getBitmapFonts(): string[] {
		const fonts: string[] = [];//ResLibData.caches;
		const resInfos = ResLibData.caches;
		let obj: any;
		for (obj in resInfos) {
			const foss: Array<any> = <any>resInfos[obj];
			for (let i: number = 0; i < foss.length; i++) {
				if (foss[i]['type'] === ResType.TYPE_FONT) {
					fonts.push(foss[i]['name']);
				}
			}
		}
		return fonts;
	}
}