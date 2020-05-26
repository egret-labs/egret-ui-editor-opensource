import * as path from 'path';
import * as fs from 'fs';

import { EgretEngineInfo, engineInfo } from './egretSDK';
import URI from 'egret/base/common/uri';
import { INotificationService } from 'egret/platform/notification/common/notifications';
import { isEqual } from 'egret/base/common/resources';

/**
 * 项目数据层模块
 */
export class EgretProjectModel {
	constructor(private _project: URI,
		@INotificationService private notificationService: INotificationService,
	) {
		this.projectValidate();
	}

	private projectValidate(): void {

	}
	/**
	 * 根路径
	 */
	public get root(): URI {
		return this._project;
	}
	/**
	 * 获取wingproperties路径
	 */
	public get wingPropertiesUri(): URI {
		const fsPath = path.join(this.project.fsPath, 'wingProperties.json');
		return URI.file(fsPath);
	}
	private get egretPropertiesUri(): URI {
		const fsPath = path.join(this.project.fsPath, 'egretProperties.json');
		return URI.file(fsPath);
	}
	private get indexUri(): URI {
		const fsPath = path.join(this.project.fsPath, 'index.html');
		return URI.file(fsPath);
	}
	private get exmlPropertiesUri(): URI {
		const fsPath = path.join(this.project.fsPath, '.wing', 'exml.json');
		return URI.file(fsPath);
	}
	private wingProperties: any = null;
	private wingPropertiesParserd: boolean = false;

	/**
	 * 获得wingProperty 
	 */
	public getWingProperties(): any {
		if (!this.wingPropertiesParserd) {
			this.wingPropertiesParserd = true;
			try {
				const wingPropertyStr: string = fs.readFileSync(this.wingPropertiesUri.fsPath, { encoding: 'utf8' });
				this.wingProperties = JSON.parse(wingPropertyStr);
			} catch (error) { }
		}
		return this.wingProperties;
	}
	private egretProperties: any = null;
	private egretPropertiesParserd: boolean = false;
	private getEgretProperties(): any {
		if (!this.egretPropertiesParserd) {
			this.egretPropertiesParserd = true;
			try {
				const egretPropertyStr: string = fs.readFileSync(this.egretPropertiesUri.fsPath, { encoding: 'utf8' });
				this.egretProperties = JSON.parse(egretPropertyStr);
				const exmlRoot = this.exmlRoot;
				if (exmlRoot.length === 0) {
					// 没有配置exmlRoot，写入默认值
					this._exmlRoots.push(URI.file('resource/eui_skins'));
					this.saveEgretProperties();
				}
			} catch (error) { }
		}
		return this.egretProperties;
	}

	/**
	 * 保存wingProperty
	 * @param wingProperies 
	 */
	public saveWingProperties() {
		fs.writeFileSync(this.wingPropertiesUri.fsPath, JSON.stringify(this.getWingProperties(), null, 2));
	}

	public saveEgretProperties() {
		if (!this.egretProperties.eui) {
			this.egretProperties.eui = {};
		}
		let formatedExmlRoots: string[] = [];
		for (let i = 0; i < this._exmlRoots.length; i++) {
			const item = this._exmlRoots[i];
			let skin = item.fsPath.replace(/\\/g, '/');
			if (skin.startsWith('/')) {
				skin = skin.slice(1);
			}
			if (skin.endsWith('/')) {
				skin = skin.slice(0, skin.length - 1);
			}
			formatedExmlRoots.push(skin);
		}
		this.egretProperties.eui.exmlRoot = formatedExmlRoots;
		fs.writeFileSync(this.egretPropertiesUri.fsPath, JSON.stringify(this.egretProperties, null, 2));
	}

	private exmlProperties: any = null;
	private exmlPropertiesParserd: boolean = false;
	private getExmlProperties(): any {
		if (!this.exmlPropertiesParserd) {
			this.exmlPropertiesParserd = true;
			try {
				const exmlPropertyStr: string = fs.readFileSync(this.exmlPropertiesUri.fsPath, { encoding: 'utf8' });
				this.exmlProperties = JSON.parse(exmlPropertyStr);
			} catch (error) { }
			if (!this.exmlProperties) {
				this.exmlProperties = {};
			}
		}
		return this.exmlProperties;
	}



	private egretStageInfo: { scaleMode: string, contentWidth: number, contentHeight: number } = null;
	private egretStageInfoParsed: boolean = false;
	/**
	 * 舞台模式
	 */
	public getStageInfo(): { scaleMode: string, contentWidth: number, contentHeight: number } {
		if (!this.egretStageInfoParsed) {
			this.egretStageInfoParsed = true;
			let scaleMode = 'noScale';
			let contentWidth = 480;
			let contentHeight = 800;
			try {
				const indexStr: string = fs.readFileSync(this.indexUri.fsPath, { encoding: 'utf8' });
				const scaleModelArr = indexStr.match(/data-scale-mode=(["'])(.*?)\1/);
				if (scaleModelArr && scaleModelArr.length >= 3) {
					scaleMode = scaleModelArr[2];
				}
				const contentWidthArr = indexStr.match(/data-content-width=(["'])(.*?)\1/);
				if (contentWidthArr && contentWidthArr.length >= 3) {
					contentWidth = parseFloat(contentWidthArr[2]);
				}
				const contentHeightArr = indexStr.match(/data-content-height=(["'])(.*?)\1/);
				if (contentHeightArr && contentHeightArr.length >= 3) {
					contentHeight = parseFloat(contentHeightArr[2]);
				}
			} catch (error) { }
			this.egretStageInfo = { scaleMode, contentWidth, contentHeight };
		}
		return this.egretStageInfo;
	}

	/**
     * 目标工程的路径
     */
	public get project(): URI {
		return this._project;
	}
	/**
	 * 得到目标工程的src路径
	 */
	public get src(): URI {
		const fsPath = path.join(this.project.fsPath, 'src');
		return URI.file(fsPath);
	}
	/**
	 * 项目指定的引擎版本
	 */
	public get engineVersion(): string {
		const egretProperties = this.getEgretProperties();
		if (egretProperties) {
			let version = egretProperties['egret_version'];
			if (!version) {
				version = egretProperties['engineVersion'];
			}
			return version;
		}
		return '';
	}
	/**
	 * 得到当前项目的资源配置列表
	 */
	public get resConfigs(): IResourceConfigItem[] {
		const wingProperies = this.getWingProperties();
		if (wingProperies) {
			if (wingProperies['resourcePlugin'] && wingProperies['resourcePlugin']['configs']) {
				const configs: any[] = wingProperies['resourcePlugin']['configs'];
				const resConfigs: IResourceConfigItem[] = [];
				for (let i = 0; i < configs.length; i++) {
					let url: string = configs[i]['configPath'];
					let folder: string = configs[i]['relativePath'];
					url = url.replace(/\\/g, '/');
					folder = folder.replace(/\\/g, '/');
					let exist: boolean = false;
					for (let j = 0; j < resConfigs.length; j++) {
						if (resConfigs[j].folder == folder && resConfigs[j].url == url) {
							exist = true;
							break;
						}
					}
					if (!exist) {
						resConfigs.push({
							url: url,
							folder: folder
						});
					}
				}
				return resConfigs;
			}
		}
		return [];
	}

	private _exmlRoots: URI[] = null;
	/**
	 * 当前项目的EXML根路径，有可能获得的长度为0
	 */
	public get exmlRoot(): URI[] {
		if (!this._exmlRoots) {
			this._exmlRoots = [];
			const egretProperties = this.getEgretProperties();
			if (egretProperties) {
				const euiData = egretProperties['eui'];
				if (euiData) {
					const exmlRoot: string[] = euiData['exmlRoot'];
					if (exmlRoot && Array.isArray(exmlRoot) && exmlRoot.length > 0) {
						for (let i = 0; i < exmlRoot.length; i++) {
							const fsPath = exmlRoot[i];
							this._exmlRoots.push(URI.file(fsPath));
						}
					}
				}
			}
		}
		return this._exmlRoots;
	}

	/**
	 * 当前项目的主题路径
	 */
	public get theme(): URI {
		const wingProperies = this.getWingProperties();
		if (wingProperies) {
			if (wingProperies['theme']) {
				var fsPath: string = wingProperies['theme'];
				return URI.file(fsPath);
			}
		}
		const egretProperties = this.getEgretProperties();
		if (egretProperties) {
			const euiData = egretProperties['eui'];
			if (euiData) {
				const themes: string[] = euiData['themes'];
				if (themes && Array.isArray(themes) && themes.length > 0) {
					var fsPath = themes[0];
					return URI.file(fsPath);
				}
			}
		}
		return null;
	}
	/**
	 * 得到配置的字体列表
	 */
	public get fonts(): string[] {
		const property = this.getWingProperties();
		if (property && property['fonts']) {
			return property['fonts'];
		}
		return null;
	}

	/**
	 * 得通过属性id到Exml配置信息
	 * @param id 属性id
	 */
	public getExmlConfig(id: string): any {
		const properties = this.getExmlProperties();
		if (!(id in properties)) {
			properties[id] = {};
		}
		return properties[id];
	}
	/**
	 * 设置Exml配置信息
	 * @param id 属性id
	 * @param config 配置
	 */
	public setExmlConfig(id: string, config: any): void {
		const properties = this.getExmlProperties();
		properties[id] = config;
		this.saveExmlProperties();
	}
	private exmlPropertiesSaving: boolean = false;
	private saveExmlProperties(): void {
		if (this.exmlPropertiesSaving) {
			return;
		}
		this.exmlPropertiesSaving = true;
		setTimeout(() => {
			this.exmlPropertiesSaving = false;
			const properties = this.getExmlProperties();
			// 清理空数据
			for (const key in properties) {
				if (properties.hasOwnProperty(key)) {
					const element = properties[key];
					if(Object.keys(element).length === 0) {
						delete properties[key];
					}
				}
			}
			fs.mkdirSync(path.dirname(this.exmlPropertiesUri.fsPath), { recursive: true});
			fs.writeFileSync(this.exmlPropertiesUri.fsPath, JSON.stringify(properties, null, 2));
		}, 100);
	}

	/**
	 * 得到当前使用的ui库
	 */
	public get UILibrary(): string {
		const modules: string[] = [];
		const egretProperties = this.getEgretProperties();
		if (egretProperties && egretProperties['modules'] && egretProperties['modules'].length) {
			for (let i = 0; i < egretProperties['modules'].length; i++) {
				const name: string = egretProperties['modules'][i]['name'];
				if (name) {
					modules.push(name);
				}
			}
		}
		if (modules.indexOf('eui') !== -1) {
			return 'eui';
		} else if (modules.indexOf('gui') !== -1) {
			return 'gui';
		}
		return '';
	}
	/**
	 * 得到项目当前使用的版本信息
	 */
	public getEngineInfo(): Promise<EgretEngineInfo> {
		return engineInfo(this.engineVersion, true).then(result => {
			return result;
		}, error => {
			this.notificationService.error({ content: error, duration: 6 });
			return null;
		});
	}

	/**
	 * TODO 这个方法感觉很奇怪
	 * 检查是否需要刷新项目数据层，只有当改变的文件是egretProperties文件的时候，才需要刷新数据层
	 * @param filePath 文件地址
	 * @param type 类型 0:Added 1:Changed 2:Deleted
	 */
	public needRefreshProject(filePath: string): boolean {
		//检查到如果是egretProperties文件发生了变化，则将已解析的标识设置为false
		const fileUri = URI.file(filePath);
		if(isEqual(fileUri, this.egretPropertiesUri)) {
			this.egretPropertiesParserd = false;
			this._exmlRoots = null;
			return true;
		}
		if(isEqual(fileUri, this.wingPropertiesUri)) {
			this.wingPropertiesParserd = false;
			return true;
		}
		return false;
	}

	/**
	 * TODO 这个方法感觉很奇怪
	 * 检查是否需要刷新主题配置，只有当改变的文件是主题或者资源文件才会返回true
	 * @param filePath 文件地址
	 * @param type 类型 0:Added 1:Changed 2:Deleted
	 */
	public needRefreshTheme(filePath: string): boolean {
		if (path.extname(filePath).toLowerCase() !== '.json') {
			return false;
		}
		const fileUri = URI.file(filePath);
		const themeUri = URI.file(path.join(this._project.fsPath, this.theme.fsPath));
		if(isEqual(fileUri, themeUri)) {
			return true;
		}
		return false;
	}
	/**
	 * TODO 这个方法感觉很奇怪
	 * 检查是否需要刷新项资源配置文件
	 * @param filePath 
	 */
	public needRefreshAssets(filePath: string): boolean {
		if (path.extname(filePath).toLowerCase() !== '.json') {
			return false;
		}
		const fileUri = URI.file(filePath);
		for (let i = 0; i < this.resConfigs.length; i++) {
			const configUri = URI.file(path.join(this._project.fsPath, this.resConfigs[i].url));
			if(isEqual(fileUri, configUri)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * If use the new res manager
	 */
	public get useResourceManager(): Promise<boolean> {
		return new Promise<boolean>((c, e) => {
			if (this.getEgretProperties()) {
				var modules: any[] = this.getEgretProperties()['modules'];
				if (modules && modules.length) {
					for (var i = 0; i < modules.length; i++) {
						if (modules[i]['name'] === 'resourcemanager') {
							c(true);
						}
					}
				}
			}
			return c(false);
		});
	}
}


/**
 * 资源配置文件信息接口
 */
export interface IResourceConfigItem {
	/**
	 * 配置文件路径,相对于项目的相对路径。
	 */
	url: string;
	/**
	 * 加载项的路径前缀。可将加载项url中重复的部分提取出来作为folder属性。相对于项目的相对路径。
	 */
	folder: string;
}