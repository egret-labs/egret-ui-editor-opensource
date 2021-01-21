import { IDisposable } from 'egret/base/common/lifecycle';

function getIframeContainer(): HTMLElement {
	let target = document.getElementById('root_runtime_container');
	if (!target) {
		target = document.createElement('div');
		target.id = 'root_runtime_container';
		target.style.visibility = 'false';
		target.style.display = 'none';
		document.body.appendChild(target);
	}
	return target;
}

/**
 * 给编辑器用的Egret运行时代理
 */
export class EgretRuntimeDelegate implements IDisposable {
	/** 引擎内部抛出Log */
	public onLog: (message: any) => void;
	/** 引擎内部抛出Warn */
	public onWarn: (message: any) => void;
	/** 引擎内部抛出Error */
	public onError: (message: any) => void;

	private iframe: HTMLIFrameElement;
	private runtimeCore: IRuntimeAPI;

	private runtimeId: string = '';
	constructor(private container: HTMLElement) {
		this.runtimeId = new Date().getTime().toString(16);
		//接收到iframe发送的加载完成消息，判断是否是当前的。
		window.addEventListener('message', (e) => {
			const msg: string = e.data;
			if (msg.indexOf('egret_loaded:') == 0) {
				const targetRuntimeId = msg.split(':')[1];
				if (targetRuntimeId == this.runtimeId) {
					if (!this.iframe.contentWindow || !this.iframe.contentWindow['egret']) {
						return;
					}
					this.runtimeLoaded_handler();
				}
			}
		});
		this.iframe = document.createElement('iframe');
		this.iframe['border'] = '0';
		this.iframe.style.border = 'none';
		//这个容器是一个隐藏容器，仅仅用于渲染iframe用，等iframe里面的引擎都加载完了，便可以把iframe里面的节点拿出来放到外面。
		const iframeContainer = getIframeContainer();
		if (iframeContainer.childNodes.length == 0) {
			iframeContainer.appendChild(this.iframe);
		} else {
			iframeContainer.insertBefore(this.iframe, iframeContainer.childNodes[0]);
		}
	}

	private runtimeLoaded_handler(): void {
		const window: any = this.iframe.contentWindow;
		window.console = {};
		window.console.log = (message: any) => {
			if (this.onLog) { this.onLog(message); }
		};
		window.console.warn = (message: any) => {
			if (this.onWarn) { this.onWarn(message); }
		};
		window.console.error = (message: any) => {
			if (this.onError) { this.onError(message); }
		};
		this.runtimeCore = {
			document: this.iframe.contentDocument,
			egret: window['egret'],
			eui: window['eui'],
			RES: window['RES'],
			registerTheme: window['registerTheme'],
			validate: window['validate'],
			parse: window['parse'],
			eval: window['eval'],
			registerClass: window['registerTSClass'],
			pauseGlobal: window['pauseGlobal'],
			resumeGlobal: window['resumeGlobal'],
			resumeOnceGlobal: window['resumeOnceGlobal'],
			runtimeRootContainer: window.egret_stages[0].getChildAt(0),
			egretPlayer: this.iframe.contentDocument.body.childNodes[1] as HTMLElement
		};
		// fixes https://github.com/egret-labs/egret-ui-editor-opensource/issues/122
		const inputArea = this.iframe.contentDocument.getElementById('egretTextarea') as HTMLTextAreaElement;
		if (inputArea) {
			inputArea.scrollIntoView = () => void {};
		}
		const input = this.iframe.contentDocument.getElementById('egretInput') as HTMLInputElement;
		if (input) {
			input.scrollIntoView = () => void {};
		}
		//TODO 未来还是要移除这个事件的
		// this.runtimeCore.runtimeRootContainer.addEventListener('resize', () => {
		// 	this.containerInRuntimeReize_handler();
		// }, this);
		this.container.appendChild(this.runtimeCore.egretPlayer);

		//init的异步回调
		this.runtimeLoaded = true;
		if (this.initRuntimePromiseResolve) {
			this.initRuntimePromiseResolve(void 0);
		}
		this.initRuntimePromise = null;
		this.initRuntimePromiseResolve = null;

		//getRuntime的异步回调
		if (this.getRuntimePromiseResolve) {
			this.getRuntimePromiseResolve(this.runtimeCore);
		}
		this.getRuntimePromise = null;
		this.getRuntimePromiseResolve = null;
	}

	private _url: string = '';
	/** 当前运行时的渲染地址 */
	public get url(): string {
		return this._url;
	}

	private runtimeLoaded: boolean = false;
	private initRuntimePromise: Promise<void> = null;
	private initRuntimePromiseResolve: (value?: void | PromiseLike<void>) => void = null;
	/**
	 * 初始化运行时
	 * @param url
	 */
	public initRuntime(url: string): Promise<void> {
		url += '&id=' + this.runtimeId;
		if (this._url != url) {
			this.runtimeLoaded = false;
			this._url = url;
			this.iframe.src = url;
		}
		if (this.runtimeLoaded) {
			return Promise.resolve(void 0);
		}
		if (this.initRuntimePromise) {
			return this.initRuntimePromise;
		}
		this.initRuntimePromise = new Promise<void>((resolve, reject) => {
			this.initRuntimePromiseResolve = resolve;
		});
		return this.initRuntimePromise;
	}


	private getRuntimePromise: Promise<IRuntimeAPI> = null;
	private getRuntimePromiseResolve: (value?: IRuntimeAPI | PromiseLike<IRuntimeAPI>) => void = null;
	/**
	 * Runtime的核心接口
	 */
	public getRuntime(): Promise<IRuntimeAPI> {
		if (this.runtimeLoaded) {
			return Promise.resolve(this.runtimeCore);
		}
		if (this.getRuntimePromise) {
			return this.getRuntimePromise;
		}
		this.getRuntimePromise = new Promise<IRuntimeAPI>((resolve, reject) => {
			this.getRuntimePromiseResolve = resolve;
		});
		return this.getRuntimePromise;
	}

	/**
	 * 释放运行时
	 */
	public dispose(): void {
		if (this.runtimeCore) {
			this.runtimeCore.pauseGlobal();
		}
		if (this.iframe) {
			this.iframe.contentWindow.document.body.innerHTML = '';
		}
		this.iframe.remove();
		this.iframe = null;
	}
}

/**
 * The runtime for egret res
 */
export class EgretAssetsRuntime implements IEgretAssetsRuntime {
	public onLog: (message: any) => void;
	public onWarn: (message: any) => void;
	public onError: (message: any) => void;
	private onLoaded: () => void;
	private iframe: HTMLIFrameElement;
	constructor() {
		this.iframe = document.createElement('iframe');
		this.iframe.style.borderWidth = '0';
		this.iframe.style.border = 'none';
		this.iframe.addEventListener('load', () => {
			this.runtime_loadedHandler();
		});
		var container = this.getIframeContainer();
		if (container.childNodes.length === 0) {
			container.appendChild(this.iframe);
		} else {
			container.insertBefore(this.iframe, container.childNodes[0]);
		}
	}

	private _loaded: boolean = false;
	public get loaded(): boolean {
		return this._loaded;
	}

	private runtime_loadedHandler(): void {
		if (!this.iframe.contentWindow || !this.iframe.contentWindow['RES']) {
			return;
		}
		this._loaded = true;
		var window: any = this.iframe.contentWindow;
		window.console = {};
		window.console.log = (message: any) => {
			if (this.onLog) {
				this.onLog(message);
			}
		};
		window.console.warn = (message: any) => {
			if (this.onWarn) {
				this.onWarn(message);
			}
		};
		window.console.error = (message: any) => {
			if (this.onError) {
				this.onError(message);
			}
		};
		this._runtimeEgret = window['egret'];
		this._runtimeRES = window['RES'];
		if (this.onLoaded) {
			this.onLoaded();
		}
	}

	private _runtimeRES: any;
	public get runtimeRES(): any {
		return this._runtimeRES;
	}

	private getIframeContainer(): HTMLElement {
		var target = document.getElementById('root_runtime_container');
		if (!target) {
			target = document.createElement('div');
			target.id = 'root_runtime_container';
			target.style.visibility = 'false';
			document.body.appendChild(target);
		}
		return target;
	}

	private _url: string = '';
	public get url(): string {
		return this._url;
	}
	private _runtimeEgret: any;

	public initRuntime(url: string): Promise<void> {
		return new Promise<void>((c, e) => {
			this.onLoaded = () => {
				c(null);
			};
			this.iframe.src = url;
			this._url = url;
		});
	}
	public dispose(): void {
		this.iframe.remove();
	}
}

/** 
 * 运行时接口
 */
export class IRuntimeAPI {
	/**
	 * 编辑器runtime内部引擎舞台上的最外层容器
	 */
	readonly runtimeRootContainer: any;
	/**
	 * egret节点容器
	 */
	readonly egretPlayer: HTMLElement;
	/**
	 * runtime中的Document
	 */
	readonly document: Document;
	/**
	 * Runtime中的Egret
	 */
	readonly egret: any;
	/**
	 * Runtime中的Eui
	 */
	readonly eui: any;
	/**
	 * Runtime中的RES
	 */
	readonly RES: any;
	/**
	 * 注册一个主题
	 */
	readonly registerTheme: (getSkinName: (hostComponent: any) => string, getStyleConfig: (style: string) => any) => void;
	/**
	 * 注册一个类
	 */
	readonly registerClass: (className: string, classData: any, propertyData: any) => void;
	/**
	 * 判断一个exml是否有效
	 */
	readonly validate: (exml: string) => string;
	/**
	 * 解析一个exml文件
	 */
	readonly parse: (exml: string) => any;
	/**
	 * 注入代码
	 */
	readonly eval: (str: string) => void;
	/**
	 * 全局暂停
	 */
	readonly pauseGlobal: () => void;
	/**
	 * 全局继续
	 */
	readonly resumeGlobal: () => void;
	/**
	 * 全局继续一次
	 */
	readonly resumeOnceGlobal: () => void;

}

/**
 * The interface of runtime for egret RES
 */
export interface IEgretAssetsRuntime {
	onLog: (message: any) => void;
	onWarn: (message: any) => void;
	onError: (message: any) => void;
	readonly runtimeRES: any;
	readonly url: string;
	initRuntime(url: string): Promise<void>;
	readonly loaded: boolean;
}

