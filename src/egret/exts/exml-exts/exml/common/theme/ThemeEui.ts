import { ITheme } from './themes';
import { Event, Emitter } from 'egret/base/common/event';
import { EgretProjectModel } from '../project/egretProject';

import * as paths from 'path';
import * as fs from 'fs';
import { IFileService } from 'egret/platform/files/common/files';
import URI from 'egret/base/common/uri';
import { parseClassName } from '../utils/eui/exmls';
import { IOutputService } from 'egret/workbench/parts/output/common/output';
import { INotificationService } from 'egret/platform/notification/common/notifications';
import { localize } from 'egret/base/localization/nls';


/**
 * 项目主体配置
 */
export class ThemeEUI implements ITheme {

	private readonly _onConfigChanged: Emitter<ITheme>;

	private config: any = {};
	private skinFileCache: { [path: string]: { skinClassName: string, mTime: number } } = {};
	constructor(
		private project: EgretProjectModel,
		@IFileService private fileService: IFileService,
		@INotificationService private notificationService: INotificationService,
		@IOutputService private outputService:IOutputService
	) {
		this._onConfigChanged = new Emitter<ITheme>();
	}

	private themeConfitMtime: number = -1;
	/**
	 * 重新加载
	 */
	public reload(): void {
		if (this.project.project && this.project.theme) {
			const themeUri = URI.file(paths.join(this.project.project.fsPath, this.project.theme.fsPath));
			this.fileService.resolveFile(themeUri).then(stat => {
				if (this.themeConfitMtime != stat.mtime) {
					this.themeConfitMtime = stat.mtime;
					this.fileService.resolveContent(themeUri).then(content => {
						const value = content.value;
						try {
							const config = JSON.parse(value);
							this.config = config;
							this.skinFileCache = {};
							this._onConfigChanged.fire(this);
						} catch (error) {
							this.notificationService.error({ content: error, duration: 3 });
							console.error(error);
						}
					}, error => {
						this.notificationService.error({ content: error, duration: 3 });
						console.error(error);
					});
				}
			}, error => {
				this.notificationService.error({ content: error, duration: 3 });
				console.error(error);
			});
		} else if (!this.project.theme) {
			this.notificationService.error({ content: localize('themeEui.reload.notExistTheme','Project theme configuration not found'), duration: 3 });
			console.error('未找到项目主题配置');
		}
	}
	/**
	 * 主题配置变化的事件
	 */
	public get onConfigChanged(): Event<ITheme> {
		return this._onConfigChanged.event;
	}
	/**
	 * 根据主机组件实例获取默认主题的皮肤类名， 此方法不做递归处理。
	 */
	public getDefaultSkin(className: string): string {
		const skinMap: any = this.config ? this.config.skins : null;
		if (!skinMap) {
			return '';
		}
		const skinFileName: string = skinMap[className];
		if (skinFileName) {
			const path: string = paths.join(this.project.project.fsPath, skinFileName);
			let mtime = -1;
			try {
				mtime = fs.statSync(path).mtime.getTime();
			} catch (error) { }

			const cache = this.skinFileCache[path];
			let needReload: boolean = false;
			if (!cache) {
				needReload = true;
			} else {
				if (cache.mTime !== mtime) {
					needReload = true;
				}
			}
			let skinClassName: string = '';
			if (needReload) {
				var text: string = '';
				try {
					var text: string = fs.readFileSync(path, { encoding: 'utf8' });
				} catch (error) {}
				if(text){
					skinClassName = parseClassName(text);
					this.skinFileCache[path] = {
						skinClassName: skinClassName,
						mTime: mtime
					};
				}else{
					const message:string = '[Error]:'+localize('theme.error.noFile','No skin file {0} defined in theme',path);
					this.outputService.append(message);
				}
			} else {
				skinClassName = cache.skinClassName;
			}
			if (skinClassName) {
				return skinClassName;
			} else {
				return null;
			}
		}
		return null;
	}
	/**
	 * 得到指定的皮肤配置，用于注册到编辑器的runtime里，给引擎回调用
	 * @param style 
	 */
	public getStyleConfig(style: string): any {
		const styleMap: any = this.config ? this.config.styles : null;
		if (styleMap) {
			return styleMap[style];
		}
		return null;
	}
}