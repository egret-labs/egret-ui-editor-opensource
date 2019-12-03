import { exec } from 'egret/base/common/cmd';
import { ltrim } from 'egret/base/common/strings';
import * as pathUtil from 'path';
import { trim, trimLeft } from '../utils/strings';
import { localize } from 'egret/base/localization/nls';

/**
 * 引擎版本信息
 */
export interface VersionInfo {
	/**
	 * 版本
	 */
	version: string;
	/**
	 * 路径
	 */
	path: string;
}

/**
 * 引擎信息
 */
export class EgretEngineInfo implements VersionInfo {
	/**
	 * 引擎版本
	 */
	public get version(): string {
		return this._version;
	}
	/**
	 * 引擎路径
	 */
	public get path(): string {
		return this._path;
	}

	constructor(private _version: string, private _path: string) {
		this._path = trimLeft(_path);
		this._version = trim(_version);
	}

	/**
     * 得到gui框架属性表文件路径
     */
	public get guiPropertiesPath(): string {
		return pathUtil.join(this.path, 'tools/lib/exml/properties.json');
	}

	/**
     * 得到gui框架清单文件路径
     */
	public get guiManifestPath(): string {
		return pathUtil.join(this.path, 'tools/lib/exml/egret-manifest.xml');
	}

	/**
     * 得到gui框架清单文件路径
     */
	public get guiExmlXsdPath(): string {
		return pathUtil.join(this.path, 'tools/lib/exml/exml.xsd');
	}

	/**
     * 得到eui框架属性表文件路径
     */
	public get euiPropertiesPath(): string {
		return pathUtil.join(this.path, 'tools/lib/eui/properties.json');
	}

	/**
	 * 得到eui框架清单文件路径
	 */
	public get euiManifestPath(): string {
		return pathUtil.join(this.path, 'tools/lib/eui/manifest.xml');

	}

	/**
     * 得到eui框架清单文件路径
     */
	public get euiExmlXsdPath(): string {
		return pathUtil.join(this.path, 'tools/lib/eui/exml.xsd');
	}

	/**
     * 得到eui框架清单文件路径
     */
	public get egretLibPath(): string {
		return pathUtil.join(this.path, 'build/egret/egret.js');
	}

	/**
     * 得到eui框架清单文件路径
     */
	public get egretWebLibPath(): string {
		return pathUtil.join(this.path, 'build/egret/egret.web.js');
	}

	/**
     * 得到eui框架清单文件路径
     */
	public get euiLibPath(): string {
		return pathUtil.join(this.path, 'build/eui/eui.js');
	}

	/**
     * 得到tween库
     */
	public get tweenPath(): string {
		return pathUtil.join(this.path, 'build/tween/tween.js');
	}
}

let versionCaches: VersionInfo[] = null;
let versionsPromise: Promise<VersionInfo[]> = null;
/**
 * 当前已经安装的引擎版本信息
 * @param reload 重新加载默认为false
 */
export function versions(reload: boolean = false): Promise<VersionInfo[]> {
	if (!reload && versionCaches) {
		return Promise.resolve(versionCaches);
	}
	versionCaches = null;
	if (!versionsPromise) {
		versionsPromise = new Promise<VersionInfo[]>((resolve, reject) => {
			exec('egret versions').then(data => {
				const versionInfos: VersionInfo[] = [];
				if (data) {
					const versions: string[] = data.split('\n');
					for (let i = 0; i < versions.length; i++) {
						const versionStr: string = versions[i];
						const tempArr: string[] = versionStr.split(' ');
						//前2位为Egret Engine 并不需要
						tempArr.splice(0, 2);
						const version: string = tempArr.shift();
						//后续为地址数组, 不直接取后一位 为避免地址中存在空格
						const versionPath: string = tempArr.join(' ');
						let path: string = ltrim(versionPath);
						path = path.split('\\').join('/');
						if (path.charAt(path.length - 1) != '/') {
							path += '/';
						}
						versionInfos.push({ version: version, path: path });
					}
				}
				if (versionInfos.length > 0) {
					versionCaches = versionInfos;
					resolve(versionInfos);
				} else {
					reject(localize('egretSDK.versions.envError','Failed to get the engine list, try to restore the engine environment variable to ensure that the \'egret verions\' command can be executed normally.'));
					versionsPromise = null;
				}
			}, error => {
				reject(localize('egretSDK.versions.envError','Failed to get the engine list, try to restore the engine environment variable to ensure that the \'egret verions\' command can be executed normally.'));
				versionsPromise = null;
			});
		});
	}
	return versionsPromise;
}

let engineInfosCaches: EgretEngineInfo[] = null;
let engineInfosPromise: Promise<EgretEngineInfo[]> = null;
/**
 * 当前引擎的信息列表
 * @param reload 是否重新加载
 */
export function engineInfos(reload: boolean = false): Promise<EgretEngineInfo[]> {
	if (!reload && engineInfosCaches) {
		return Promise.resolve(engineInfosCaches);
	}
	engineInfosCaches = null;
	if (!engineInfosPromise) {
		engineInfosPromise = versions(reload).then(versions => {
			engineInfosCaches = [];
			for (let i = 0; i < versions.length; i++) {
				engineInfosCaches.push(new EgretEngineInfo(versions[i].version, versions[i].path));
			}
			engineInfosPromise = null;
			return engineInfosCaches;
		});
	}
	return engineInfosPromise;
}



/**
 * 通过版本号得到一个引擎信息
 * @param version 版本号
 * @param reload 重新加载默认为false
 */
export function engineInfo(version: string, reload: boolean = false): Promise<EgretEngineInfo> {
	return new Promise<EgretEngineInfo>((resolve, reject) => {
		engineInfos(reload).then(infos => {
			let targetInfo: EgretEngineInfo = null;
			for (let i = 0; i < infos.length; i++) {
				if (infos[i].version == version) {
					targetInfo = infos[i];
				}
			}
			if (targetInfo) {
				resolve(targetInfo);
			} else {
				reject(localize('engineInfo.error','Unable to find the {0} version of the Egret engine. Please re-do this after installing or modifying the project engine version.',version));
			}
		}, error => {
			reject(error);
		});
	});
}
