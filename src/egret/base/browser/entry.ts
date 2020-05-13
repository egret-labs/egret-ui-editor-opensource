import * as paths from 'egret/base/common/paths';

const resourceFolder: string = paths.join(__dirname, 'resources/');
export class EntryBase extends eui.Application {
	/**
	 * 加载进度界面
	 */
	private loadingView: LoadingUI;
	private assetAdapter: AssetAdapter;
	protected createChildren(): void {
		super.createChildren();

		//注入自定义的素材解析器
		var assetAdapter = new AssetAdapter();
		assetAdapter.devicePixelRatio = window.devicePixelRatio;
		this.stage.registerImplementation('eui.IAssetAdapter', assetAdapter);
		this.stage.registerImplementation('eui.IThemeAdapter', new ThemeAdapter());
		//设置加载进度界面
		this.loadingView = new LoadingUI();
		this.loadingView.visible = false;
		this.stage.addChild(this.loadingView);
		//初始化Resource资源加载库
		ResHelper.instance.addEventListener(ResHelpEvent.COMPLETE, this.onResourceLoadComplete, this);
		ResHelper.instance.addEventListener(ResHelpEvent.PROGRESS, this.onResourceProgress, this);
		this.onResourceLoadComplete(null);
		//加载皮肤主题配置文件,可以手动修改这个文件。替换默认皮肤。
		const theme = new eui.Theme(resourceFolder + 'dark.thm.json', this.stage);
		EXML.prefixURL = resourceFolder;
		theme.addEventListener(eui.UIEvent.COMPLETE, this.onThemeLoadComplete, this);
		this.assetAdapter = assetAdapter;
		this.stage.addEventListener(egret.Event.RESIZE, this.onPixelRatioChanged, this);
	}

	private onResourceLoadComplete(event: RES.ResourceEvent): void {
		if (ResHelper.instance.resComplete) {
			this.stage.removeChild(this.loadingView);
			this.createScene();
		}
	}
	private onResourceProgress(event: RES.ResourceEvent): void {
		this.loadingView.setProgress(event.itemsLoaded, event.itemsTotal);
	}


	private isThemeLoadEnd: boolean = false;
	/**
	 * 主题文件加载完成,开始预加载
	 */
	private onThemeLoadComplete(): void {
		this.isThemeLoadEnd = true;
		this.createScene();
	}

	private createScene() {
		if (this.isThemeLoadEnd && ResHelper.instance.resComplete) {
			setTimeout(() => this.dispatchEventWith('loaded', true), 16);
			this.startCreateScene();
		}
	}

	/**
	 * 创建场景界面
	 */
	protected startCreateScene(): void {

	}

	private onPixelRatioChanged(event: egret.Event) {
		var stage = <egret.Stage>event.currentTarget;
		this.assetAdapter.devicePixelRatio = stage.$displayList.$pixelRatio;
	}
}

export class BlankSprite extends egret.Sprite {
	setModel(model: any) {

	}
	destory(): void {

	}
}

export class AssetAdapter implements eui.IAssetAdapter {
	/**
	 * @language zh_CN
	 * 解析素材
	 * @param source 待解析的新素材标识符
	 * @param compFunc 解析完成回调函数，示例：callBack(content:any,source:string):void;
	 * @param thisObject callBack的 this 引用
	 */
	public getAsset(source: string, compFunc: Function, thisObject: any): void {
		var realsource = source;
		function onGetRes(data: any): void {
			compFunc.call(thisObject, data, source);
		}
		if (RES.hasRes(source)) {
			if (this.devicePixelRatio !== 1) {
				realsource = this.getScaleSource(source);
			}
			var data = RES.getRes(realsource);
			if (data) {
				onGetRes(data);
			}
			else {
				RES.getResAsync(realsource, onGetRes, this);
			}
		}
		else {
			if (this.devicePixelRatio !== 1 && (source && source.indexOf('assets') === 0)) {
				var retinaUrl = this.getScaleUrl(source);
				var retinaComplete = function (data: any): void {
					if (!data) {
						RES.getResByUrl(source, onGetRes, this, RES.ResourceItem.TYPE_IMAGE);
					} else {
						compFunc.call(thisObject, data, source);
					}
				};
				RES.getResByUrl(retinaUrl, retinaComplete, this, RES.ResourceItem.TYPE_IMAGE);
			} else {
				RES.getResByUrl(source, onGetRes, this, RES.ResourceItem.TYPE_IMAGE);
			}
		}
	}

	private getScaleUrl(source: string): string {
		var match = /(.svg)$/.exec(source);
		if (match) {
			return source;
		}
		var index = source.lastIndexOf('.');
		var retinaUrl: string = source.substring(0, index) + '_r' + source.substring(index);
		return retinaUrl;
	}

	public devicePixelRatio: number = 1;

	private getScaleSource(source: string) {
		var name = source, ext = '';
		var match = /(_png|_jpg)$/.exec(source);
		if (match) {
			name = source.substr(0, source.length - 4);
			ext = match[0];
		}

		var source_r = name + '_r' + ext;
		var source_scale = name + '_' + this.devicePixelRatio + 'x' + ext;

		if (RES.hasRes(source_scale)) { return source_scale; }
		if (RES.hasRes(source_r)) { return source_r; }
		return source;
	}
}


egret.registerClass(AssetAdapter, '\'ui/AssetAdapter\'.AssetAdapter', ['eui.IAssetAdapter']);


export class LoadingUI extends egret.Sprite {

	public constructor() {
		super();
		this.createView();
	}

	private textField: egret.TextField;

	private createView(): void {
		this.textField = new egret.TextField();
		this.addChild(this.textField);
		this.textField.y = 300;
		this.textField.width = 480;
		this.textField.height = 100;
		this.textField.textAlign = 'center';
	}

	public setProgress(current, total): void {
		this.textField.text = 'Loading...' + current + '/' + total;
	}
}



export class ThemeAdapter implements eui.IThemeAdapter {

	/**
	 * 解析主题
	 * @param url 待解析的主题url
	 * @param compFunc 解析完成回调函数，示例：compFunc(e:egret.Event):void;
	 * @param errorFunc 解析失败回调函数，示例：errorFunc():void;
	 * @param thisObject 回调的this引用
	 */
	public getTheme(url: string, compFunc: Function, errorFunc: Function, thisObject: any): void {
		function onGetRes(e: string): void {
			compFunc.call(thisObject, e);
		}
		function onError(e: RES.ResourceEvent): void {
			if (e.resItem.url === url) {
				RES.removeEventListener(RES.ResourceEvent.ITEM_LOAD_ERROR, onError, null);
				errorFunc.call(thisObject);
			}
		}
		RES.addEventListener(RES.ResourceEvent.ITEM_LOAD_ERROR, onError, null);
		RES.getResByUrl(url, onGetRes, this, RES.ResourceItem.TYPE_TEXT);
	}
}


egret.registerClass(ThemeAdapter, '\'ui/ThemeAdapter\'.IThemeAdapter', ['eui.IThemeAdapter']);

export class ResHelper extends egret.EventDispatcher {
	private static _instance: ResHelper;
	public static get instance(): ResHelper {
		if (!this._instance) {
			this._instance = new ResHelper();
		}
		return this._instance;
	}

	constructor() {
		super();
		//初始化Resource资源加载库
		RES.addEventListener(RES.ResourceEvent.CONFIG_COMPLETE, this.onConfigComplete_handler, this);
		RES.loadConfig(resourceFolder + 'default.res.json', resourceFolder);
	}
	/**
	 * 配置文件加载完成,开始预加载皮肤主题资源和preload资源组。
	 */
	private onConfigComplete_handler(event: any): void {
		RES.removeEventListener(RES.ResourceEvent.CONFIG_COMPLETE, this.onConfigComplete_handler, this);
		RES.addEventListener(RES.ResourceEvent.GROUP_COMPLETE, this.onResourceLoadComplete, this);
		RES.addEventListener(RES.ResourceEvent.GROUP_LOAD_ERROR, this.onResourceLoadError, this);
		RES.addEventListener(RES.ResourceEvent.GROUP_PROGRESS, this.onResourceProgress, this);
		RES.addEventListener(RES.ResourceEvent.ITEM_LOAD_ERROR, this.onItemLoadError, this);
		RES.loadGroup('preload');
	}

	private _resComplete: boolean = false;
	public get resComplete(): boolean {
		return this._resComplete;
	}
	/**
	 * preload资源组加载完成
	 */
	private onResourceLoadComplete(event: RES.ResourceEvent): void {
		if (event.groupName === 'preload') {
			this._resComplete = true;
			RES.removeEventListener(RES.ResourceEvent.GROUP_COMPLETE, this.onResourceLoadComplete, this);
			RES.removeEventListener(RES.ResourceEvent.GROUP_LOAD_ERROR, this.onResourceLoadError, this);
			RES.removeEventListener(RES.ResourceEvent.GROUP_PROGRESS, this.onResourceProgress, this);
			RES.removeEventListener(RES.ResourceEvent.ITEM_LOAD_ERROR, this.onItemLoadError, this);
			this.dispatchEvent(new ResHelpEvent(ResHelpEvent.COMPLETE));
		}
	}
	/**
	 * 资源组加载出错
	 */
	private onResourceLoadError(event: RES.ResourceEvent): void {
		console.warn('Group:' + event.groupName + ' has failed to load');
		//忽略加载失败的项目
		this.onResourceLoadComplete(event);
	}

	/**
	 * preload资源组加载进度
	 */
	private onResourceProgress(event: RES.ResourceEvent): void {
		if (event.groupName === 'preload') {
			var resEvent: ResHelpEvent = new ResHelpEvent(ResHelpEvent.PROGRESS);
			resEvent.itemsLoaded = event.itemsLoaded;
			resEvent.itemsTotal = event.itemsTotal;
			this.dispatchEvent(resEvent);
		}
	}
	/**
	 * 资源组加载出错
	 */
	private onItemLoadError(event: RES.ResourceEvent): void {
		console.warn('Url:' + event.resItem.url + ' has failed to load');
	}

}

export class ResHelpEvent extends egret.Event {
	public static COMPLETE = 'resComplete';
	public static PROGRESS = 'resProgress';
	constructor(type: string) {
		super(type);
	}
	public itemsLoaded: number = 0;
	public itemsTotal: number = 0;
}