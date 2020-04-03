import { ResType } from 'egret/exts/resdepot/common/consts/ResType';
import { TestWorkspace } from './ServicesUtils';
import { StorageService } from 'egret/platform/storage/common/storageService';

/**
 * 程序本地信息存储
 *
 */
export class AppStorage extends egret.HashObject {
	// private static context: InMemoryLocalStorage = new InMemoryLocalStorage();
	// let s = new Storage(context, new InMemoryLocalStorage());
	public static storage = new StorageService(window.localStorage, window.localStorage, TestWorkspace.uid.toString());
	/**
	 * 清除所有不存在的最近打开
	*/
	public static cleanErrorRecentlyOpen() {
		var arr: Array<any> = AppStorage.recentlyOpen;
		var needToDelete: Array<any> = [];
		for (var i: number = (0); i < arr.length; i++) {
			var file: any;//flash.filesystem.File;
			try {
				//file = new File(arr[i]);
			}
			catch (error)
			{ }
			if (file) {
				if (<any>!file['exists']) {
					needToDelete.push(arr[i]);
				}
			}
			else {
				needToDelete.push(arr[i]);
			}
		}
		for (i = (0); i < needToDelete.length; i++) {
			AppStorage.deleteRecentlyOpen(needToDelete[i]);
		}
	}
	/**
	 * 添加一个最近打开的路径
	 * @param path
	 */
	public static addRecentlyOpen(path: string) {
		var arr: Array<any> = AppStorage.recentlyOpen;
		if (arr.indexOf(path) !== -1) {
			arr.splice(arr.indexOf(path), 1);
		}
		arr.push(path);
		while (arr.length > 20) {
			arr.shift();
		}
		AppStorage.storage.store('recentlyOpen', JSON.stringify(arr));

	}
	/**
	 * 得到最近打开
	 * @return
	 */
	public static get recentlyOpen(): Array<any> {
		var temp: string = AppStorage.storage.get('recentlyOpen') ? AppStorage.storage.get('recentlyOpen') : '';
		var arr: Array<any> = temp !== '' ? JSON.parse(temp) : [];
		if (<any>!arr) {
			arr = [];
		}
		return arr;
	}
	/**
	 * 清空最近打开的路径
	 */
	public static cleanRecentlyOpen() {
		// AppStorage.storage['set']('recentlyOpen',[]);
		AppStorage.storage.store('recentlyOpen', JSON.stringify([]));

	}
	/**
	 * 删除最近打开的路径
	 * @param path
	 */
	public static deleteRecentlyOpen(path: string) {
		var arr: Array<any> = AppStorage.recentlyOpen;
		if (arr.indexOf(path) !== -1) {
			arr.splice(arr.indexOf(path), 1);
		}
		AppStorage.storage.store('recentlyOpen', JSON.stringify(arr));
	}
	/**
	 * 添加一个打开的配置路径
	 * @param path
	 */
	public static addOpendConfigs(path: string) {
		if (<any>!path) {
			return;
		}
		var arr: Array<any> = AppStorage.opendConfigs;
		if (arr.indexOf(path) === -1) {
			arr.push(path);
		}
		AppStorage.storage.store('opendConfigs', JSON.stringify(arr));
	}
	/**
	 * 移除一个打开的配置路径
	 * @param path
	 */
	public static removeOpendConfigs(path: string) {
		if (<any>!path) {
			return;
		}
		var arr: Array<any> = AppStorage.opendConfigs;
		if (arr.indexOf(path) !== -1) {
			arr.splice(arr.indexOf(path), 1);
		}
		AppStorage.storage.store('opendConfigs', JSON.stringify(arr));
	}
	/**
	 * 打开的配置路径列表
	 */
	public static get opendConfigs(): Array<any> {
		var temp: string = AppStorage.storage.get('opendConfigs') ? AppStorage.storage.get('opendConfigs') : '';
		var arr: Array<any> = temp !== '' ? JSON.parse(temp) : [];
		return arr;
	}
	/**
	 * 当前打开的配置文件路径
	 */
	public static get currentConfig(): string {
		return AppStorage.storage.get('currentConfig') ? AppStorage.storage['get']('currentConfig') : '';
	}

	public static set currentConfig(value: string) {
		AppStorage.storage.store('currentConfig', value);
	}
	/**
	 * 预览窗宽度
	 */
	public static get previewWidth(): number {
		var temp: string = AppStorage.storage.get('previewWidth') ? <any>AppStorage.storage.get('previewWidth') : '';
		var value: number = temp !== '' ? parseInt(temp) : 155;
		return value;
	}
	public static set previewWidth(value: number) {
		AppStorage.storage.store('previewWidth', JSON.stringify(value));
	}

	/**
	 * 底部高度
	 */
	public static get bottomHeight(): number {
		var temp: string = AppStorage.storage.get('bottomHeight') ? <any>AppStorage.storage.get('bottomHeight') : '';
		var value: number = temp !== '' ? parseInt(temp) : 0;
		return value;
	}
	public static set bottomHeight(value: number) {
		AppStorage.storage.store('bottomHeight', value);
	}

	/**
	 * 是否预览
	 */
	public static get preview(): boolean {
		return AppStorage.storage.get('preview') ? <any>AppStorage.storage.get('preview') : <any>'true';
	}

	public static set preview(value: boolean) {
		AppStorage.storage.store('preview', value);
	}

	/**
	 * 忽视列表
	 */
	public static get ignoreList(): Array<any> {
		var temp: string = AppStorage.storage.get('ignoreList') ? <any>AppStorage.storage.get('ignoreList') : '';
		var arr: Array<any> = temp !== '' ? JSON.parse(temp) : [];

		return arr;
	}

	public static set ignoreList(value: Array<any>) {
		AppStorage.storage.store('ignoreList', value);
	}

	/**
	 * 通过配置文件的url得到一个根目录
	 * @param resourceUrl
	 *
	 */
	public static getRootPath(url: string): string {
		if (<any>!url) {
			return '';
		}
		var temp: string = AppStorage.storage.get('rootPaths') ? <any>AppStorage.storage.get('rootPaths') : '';
		var arr: Array<any> = temp !== '' ? JSON.parse(temp) : [];

		for (var i: number = (0); i < arr.length; i++) {
			if (url === arr[i]['url']) {
				return arr[i]['rootPath'];
			}
		}
		return '';
	}

	/**
	 * 将一个url和rootPath的对应存起来
	 * @param url
	 * @param rootPath
	 *
	 */
	public static setRootPath(url: string, rootPath) {
		if (<any>!url) {
			return;
		}
		var temp: string = AppStorage.storage.get('rootPaths') ? <any>AppStorage.storage.get('rootPaths') : '';
		var arr: Array<any> = temp !== '' ? JSON.parse(temp) : [];
		for (var i: number = (0); i < arr.length; i++) {
			if (arr[i]['url'] === url) {
				arr.splice(i, 1);
				break;
			}
		}
		var obj: any = { 'url': url, 'rootPath': rootPath };
		arr.push(obj);
		AppStorage.storage.store('rootPaths', JSON.stringify(arr));
	}

	/**
	 * 通过配置文件的url得到合图配置的路径
	 * @param resourceUrl
	 *
	 */
	public static getPackPath(url: string): string {
		if (<any>!url) {
			return '';
		}
		var temp = AppStorage.storage.get('packPaths') ? <any>AppStorage.storage.get('packPaths') : '';
		var arr: Array<any> = JSON.parse(temp);
		for (var i: number = (0); i < arr.length; i++) {
			if (url === arr[i]['url']) {
				return arr[i]['packPath'];
			}
		}
		return '';
	}

	/**
	 * 将一个url和packPath的对应存起来
	 * @param url
	 * @param packPath
	 *
	 */
	public static setPackPath(url: string, packPath: string) {
		if (<any>!url) {
			return;
		}
		var temp: string = AppStorage.storage.get('packPaths') ? <any>AppStorage.storage.get('packPaths') : '';
		var arr: Array<any> = temp !== '' ? JSON.parse(temp) : [];
		for (var i: number = (0); i < arr.length; i++) {
			if (arr[i]['url'] === url) {
				arr.splice(i, 1);
				break;
			}
		}
		var obj: any = { 'url': url, 'packPath': packPath };
		arr.push(obj);
		AppStorage.storage.store('packPaths', JSON.stringify(arr));
	}

	/**
	 * 命名规则，是否包含扩展名
	 */
	public static get containExtension(): boolean {
		var temp: string = AppStorage.storage.get('containExtension') ? <any>AppStorage.storage.get('containExtension') : '1';
		if (temp === '1') {
			return true;
		}
		return false;
	}
	public static set containExtension(value: boolean) {
		var bool = '1';
		if (!value) {
			bool = '0';
		}
		AppStorage.storage.store('containExtension', bool);
	}

	/**
	 * 资源名生成类型，0不改变大小写，1全变为小写，2全改为大写
	 */
	public static get resNameType(): number {
		var temp: string = AppStorage.storage.get('resNameType') ? <any>AppStorage.storage.get('resNameType') : '';
		var value: number = temp !== '' ? parseInt(temp) : 0;
		return value;
	}
	public static set resNameType(value: number) {
		AppStorage.storage.store('resNameType', value);
	}

	/**
	 * 包含文件扩展名
	 */
	public static get resType(): Array<any> {
		var temp: string = AppStorage.storage.get('resType') ? <any>AppStorage.storage.get('resType') : '';
		var arr: Array<any> = temp !== '' ? JSON.parse(temp) : ResType.DEFAULT_TYPE;

		return arr;
	}
	public static set resType(value: Array<any>) {
		AppStorage.storage.store('resType', JSON.stringify(value));
	}

	/**是否解析sheet的subkeys */
	public static get decodeSubkeys(): boolean {

		var temp: string = AppStorage.storage.get('decodeSubkeys') ? <any>AppStorage.storage.get('decodeSubkeys') : '1';
		if (temp === '1') {
			return true;
		}
		return false;
	}
	public static set decodeSubkeys(value: boolean) {
		var temp = '1';
		if (!value) {
			temp = '0';
		}
		AppStorage.storage.store('decodeSubkeys', temp);
	}
}