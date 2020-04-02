
import * as fsextra from 'fs-extra';
import * as paths from 'egret/base/common/paths';
import { ResType } from 'egret/exts/resdepot/common/consts/ResType';
import { ResInfoVO } from 'egret/exts/resdepot/common/model/ResInfoVO';
import { ResUtil } from 'egret/exts/resdepot/common/utils/ResUtil';
import { ResFileHelper } from 'egret/exts/resdepot/common/utils/ResFileHelper';
import { Event, Emitter } from 'vs/base/common/event';
import * as encoding from 'egret/base/common/encoding';
import events = require('vs/base/common/events');
import { IFileService, FileChangesEvent, IFileChange, FileChangeType } from 'egret/platform/files/common/files';
import { EgretProjectModel } from 'egret/exts/exml-exts/exml/common/project/egretProject';

/**
 * 项目资源中心
 * 这里为某个项目的资源提取提供支持，比如资源面板。资源数据依据wingProjecties.json中的资源配置
 * 而res编辑器的资源数据是以resModel为基础，二者不互不干预。
 */
export class ProjectResCenter {
	private _refreshDispatcher: Emitter<ProjectResCenterEvent>;
	public constructor(
		@IFileService private fileService: IFileService) {
		this._refreshDispatcher = new Emitter<ProjectResCenterEvent>();
		this.fileService.onFileChanges((e) => this.onFileChanges(e));
	}
	private projectModel: EgretProjectModel;
	/**初始化 */
	public init(project: EgretProjectModel): void {
		this.projectModel = project;
	}
	//资源缓存
	private resCache: any;
	//文件列表改变了
	private onFileChanges(e: FileChangesEvent): void {
		if (!this.projectModel || this.projectModel.UILibrary !== 'eui') {
			return;
		}
		const configPaths = this.projectModel.resConfigs;
		for (let i: number = 0; i < e.changes.length; i++) {
			let change: IFileChange = e.changes[i];
			if (paths.extname(change.resource.fsPath).toLowerCase() !== '.json') {
				continue;
			}
			//项目配置有更新，重新读资源配置文件
			if (this.projectModel && (change.type === FileChangeType.UPDATED)) {
				//wingProperties.json的内容有变化
				if (paths.normalize(this.projectModel.wingPropertie.fsPath) === paths.normalize(change.resource.fsPath)) {
					this.update();
					return;
				}
				//配置的resource.json的文件内容有变化
				for (let k: number = 0; k < configPaths.length; k++) {
					if (paths.normalize(change.resource.fsPath) === paths.normalize(paths.join(this.projectModel.root.fsPath, configPaths[k].url))) {//资源库的文件有更新，则刷新
						this.update();
						return;
					}
				}
			}
		}
	}

	/**
	 * 更新资源
	 */
	public update(): Promise<void> {
		return new Promise<void>((complete: Function) => {
			this._update().then(() => {
				// TODO RES
				// this.projectModel.reloadAssets();
				complete();
			});
		});
	}
	private _update(): Promise<void> {
		return new Promise<void>((complete: Function) => {
			this.projectModel.useResourceManager.then(useResManager => {
				const configs = this.projectModel.resConfigs;
				this.resCache = {};
				ResUtil.clearAllRes();//刷新操作清理已加载的资源缓存
				//加载项目中所有的资源
				let tasks: Promise<void>[] = [];
				for (var i: number = 0; i < configs.length; i++) {
					var resconfig = configs[i];
					tasks.push(
						this.loadRes(
							useResManager,
							paths.join(this.projectModel.root.fsPath, resconfig.url),
							paths.join(this.projectModel.root.fsPath, resconfig.folder),
							this.projectModel.project.fsPath).then(
								(value: { res: ResInfoVO[], file: string }) => {
									//加载完毕的资源放入缓存
									this.resCache[value['file']] = value['res'];
								})
					);
				}
				Promise.all(tasks).then(() => {
					//资源更新完毕
					//触发事件同志更新
					this._refreshDispatcher.fire(new ProjectResCenterEvent());
					complete();
				});
			});
		});
	}

	// /**
	//  * 加载资源文件default.res.json
	//  */
	// private loadRes(resjson: string, resdir: string, projectPath: string): TPromise<{ res: ResInfoVO[], file: string }> {
	// 	return pfs.fileExists(resjson).then(isExists => {
	// 		if (isExists) {
	// 			// 不要用UTF-8的方式读文件，可能是UTF-8 BOM格式，这样读出来的字符串无法JSON.parse
	// 			return pfs.readFile(resjson).then(fileContent => {
	// 				let str = encoding.decode(fileContent, 'UTF-8');
	// 				let obj: any = ResFileHelper.importJson(str);
	// 				if (obj) {
	// 					let tasks: TPromise<any>[] = [];
	// 					for (let i: number = 0; i < obj.resList.length; i++) {
	// 						let resvo: ResInfoVO = obj.resList[i];
	// 						resvo.url = paths.join(resdir, resvo.showUrl);
	// 						//sheet subkeys从sheet文件中读
	// 						if (resvo.type === ResType.TYPE_SHEET) {
	// 							let task = ResUtil.loadSheetData([resvo]);
	// 							tasks.push(task);
	// 						}
	// 					}
	// 					return TPromise.join(tasks).then(() => {
	// 						return TPromise.as({ 'res': obj.resList, 'file': paths.relative(projectPath, resjson) });
	// 					});
	// 				}
	// 			});
	// 		}
	// 		else {
	// 			return TPromise.as(null);
	// 		}
	// 	});
	// }

	private loadRes(useResManager: boolean, configPath: string, folderPath: string, projectPath: string): Promise<{ res: ResInfoVO[], file: string }> {
		if (useResManager) {
			// configPath = paths.join(projectPath, folderPath, configPath);
			// folderPath = paths.join(projectPath, folderPath);
			return this.loaderResNew(configPath, folderPath, projectPath);
		} else {
			// configPath = paths.join(projectPath, configPath);
			// folderPath = paths.join(projectPath, folderPath);
			return this.loaderResOld(configPath, folderPath, projectPath);
		}
	}

	private loaderResOld(configPath: string, folderPath: string, projectPath: string): Promise<{ res: ResInfoVO[], file: string }> {
		return fsextra.pathExists(configPath).then(isExists => {
			if (isExists) {
				// 不要用UTF-8的方式读文件，可能是UTF-8 BOM格式，这样读出来的字符串无法JSON.parse
				return fsextra.readFile(configPath).then(fileContent => {
					let str = encoding.decode(fileContent, 'UTF-8');
					let obj: any = ResFileHelper.importJson(str);
					if (obj) {
						let tasks: Promise<any>[] = [];
						for (let i: number = 0; i < obj.resList.length; i++) {
							let resvo: ResInfoVO = obj.resList[i];
							resvo.url = paths.join(folderPath, resvo.showUrl);
							//sheet subkeys从sheet文件中读
							if (resvo.type === ResType.TYPE_SHEET) {
								let task = ResUtil.loadSheetData([resvo]);
								tasks.push(task);
							}
						}
						return Promise.all(tasks).then(() => {
							return { 'res': obj.resList, 'file': paths.relative(projectPath, folderPath) };
						});
					} else {
						return null;
					}
				});
			}
			else {
				return Promise.resolve(null);
			}
		});
	}

	private loaderResNew(configPath: string, folderPath: string, projectPath: string): Promise<{ res: ResInfoVO[], file: string }> {
		return fsextra.pathExists(configPath).then(isExists => {
			if (isExists) {
				// 不要用UTF-8的方式读文件，可能是UTF-8 BOM格式，这样读出来的字符串无法JSON.parse
				return fsextra.readFile(configPath).then(fileContent => {
					let str = encoding.decode(fileContent, 'UTF-8');
					let obj: any = ResFileHelper.importJsonNew(str);
					if (obj) {
						let tasks: Promise<any>[] = [];
						for (let i: number = 0; i < obj.resList.length; i++) {
							let resvo: ResInfoVO = obj.resList[i];
							resvo.url = paths.join(folderPath, resvo.showUrl);
							//sheet subkeys从sheet文件中读
							if (resvo.type === ResType.TYPE_SHEET) {
								let task = ResUtil.loadSheetData([resvo]);
								tasks.push(task);
							}
						}
						return Promise.all(tasks).then(() => {
							return { 'res': obj.resList, 'file': paths.relative(projectPath, folderPath) };
						});
					} else {
						return null;
					}
				});
			}
			else {
				return Promise.resolve(null);
			}
		});
	}


	/**
	 * 传入key或相对路径，返回资源
	 * @param key 优先判断顺序为全路径、相对路径、key值(资源名，包括sheet子项全名)
	 * @return egret.Texture
	 */
	public getRes(key: string): Promise<egret.Texture> {
		return new Promise<egret.Texture>(resolve => {
			var func = () => {
				for (var path in this.resCache) {
					let reslist: ResInfoVO[] = this.resCache[path];
					//
					for (let i: number = 0; i < reslist.length; i++) {
						let resvo: ResInfoVO = reslist[i];
						if (resvo.locolUrl === key || resvo.name === key || resvo.showUrl === key) {
							ResUtil.getResByUrl(resvo.locolUrl, (ret: egret.Texture) => {
								resolve(ret);
							}, this, RES.ResourceItem.TYPE_IMAGE);
							return;
						} else if (resvo.type === ResType.TYPE_SHEET && resvo.subList) {
							// 找以sheet的subkey作为资源名的 eg) 1_14
							///经测试引擎的读取顺序是json文件的先后顺序，保存先遇到的文件或者subkey。
							for (let k: number = 0; k < resvo.subList.length; k++) {
								if (resvo.subList[k].name === key) {
									ResUtil.getResByUrl(resvo.locolUrl, (ret: egret.SpriteSheet) => {
										resolve(ret.getTexture(key));
									}, this, RES.ResourceItem.TYPE_SHEET);//加载sheet
									return;
								}
							}
						}
					}
					// 如果没找到则查找sheet的subkey资源 eg: pic_json.1_14
					if (key.indexOf('.') !== -1) {
						let basename = paths.basename(key);//abc.png
						let extension = paths.extname(key);//.png
						let fName = basename.substr(0, basename.length - extension.length);// sheet file name

						let picname: string = extension.substr(1, extension.length - 1);
						for (let i: number = 0; i < reslist.length; i++) {
							let resvo: ResInfoVO = reslist[i];
							if (resvo.type === ResType.TYPE_SHEET) {
								if (resvo.name === fName) {
									ResUtil.getResByUrl(resvo.locolUrl, (ret: egret.SpriteSheet) => {
										resolve(ret.getTexture(picname));
									}, this, RES.ResourceItem.TYPE_SHEET);//加载sheet
									return;
								}
							}
						}
					}
				}
			};
			if (this.resCache) {
				func();
			}
			else {
				this._update().then(() => func());
			}
		});
	}
	public getBitmapFonts(): Promise<any[]> {
		return new Promise<any[]>((complete: Function) => {
			var func = () => {
				var fonts: Array<any> = new Array<any>();//ResModel.caches;
				for (var path in this.resCache) {
					let reslist: ResInfoVO[] = this.resCache[path];
					for (let i: number = 0; i < reslist.length; i++) {
						if (reslist[i].type === ResType.TYPE_FONT) {
							fonts.push(reslist[i].name);
						}
					}
				}
				complete(fonts);
			};
			if (this.resCache) {
				func();
			}
			else {
				this._update().then(() => func());
			}
		});
	}
	public getAllRes(): Promise<any> {
		return new Promise<any>((complete) => {
			var func = () => {
				let dic: any = {};
				for (var key in this.resCache) {
					dic[key] = this.resCache[key];
				}
				complete(dic);
			};
			if (this.resCache) {
				func();
			}
			else {
				this._update().then(() => func());
			}
		});
	}

	public get onRefresh(): Event<ProjectResCenterEvent> {
		return this._refreshDispatcher.event;
	}
}
export class ProjectResCenterEvent extends events.Event {
	public constructor() {
		super();
	}
}