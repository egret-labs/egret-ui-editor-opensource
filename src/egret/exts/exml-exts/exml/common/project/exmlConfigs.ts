import { IFileService } from 'egret/platform/files/common/files';
import URI from 'egret/base/common/uri';

import * as xmlTagUtil from '../sax/xml-tagUtils';
import * as sax from '../sax/sax';
import * as paths from 'path';
import * as fs from 'fs';

import { ClassNode, Prop } from './syntaxNodes';
import { Namespace } from '../sax/Namespace';
import { endWith } from '../utils/strings';
import { EgretProjectModel } from './egretProject';
import { EgretEngineInfo } from './egretSDK';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';

import { IParseCenter, createParseCenter, ClassChangedEvent, ClassChangedType } from './parsers/parser';
import { ExmlCoreParser, ExmlCoreParserEUI, ExmlCoreParserGUI, EUI } from './parsers/core/commons';
import { Emitter, Event } from 'egret/base/common/event';

/**
 * 抽象的项目级别Exml配置
 */
export abstract class AbstractExmlConfig {

	private _onCustomClassChanged: Emitter<ClassChangedType>;

	/**默认值字典，该字典由子类维护，该属性由当前类或当前类的子类进行维护*/
	public defaultValueDic: { [prop: string]: any } = {};

	protected coreParser: ExmlCoreParser;
	protected parseCenter: IParseCenter;
	constructor(
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IFileService protected fileService: IFileService
	) {
		this._onCustomClassChanged = new Emitter<ClassChangedType>();
		this.currentStamp = process.uptime();
		this.initConfig();
	}
	/**
	 * 类改变事件
	 */
	public get onCustomClassChanged(): Event<ClassChangedType> {
		return this._onCustomClassChanged.event;
	}

	protected abstract initConfig(): void;

	protected _egretLibUri: URI;
	protected get egretLibUri(): URI {
		return this._egretLibUri;
	}
	protected _manifestUri: URI;
	protected get manifestUri(): URI {
		return this._manifestUri;
	}
	protected _egretWebLibUri: URI;
	protected get egretWebLibUri(): URI {
		return this._egretWebLibUri;
	}
	protected _uiLibUri: URI;
	protected get uiLibUri(): URI {
		return this._uiLibUri;
	}
	protected _tweenUri: URI;
	protected get tweenUri() {
		return this._tweenUri;
	}
	protected _projectUri: URI;
	protected get projectUri(): URI {
		return this._projectUri;
	}

	private _projectModel: EgretProjectModel;
	/**
	 * 初始化 ExmlConfig
	 * @param projectModel
	 */
	public init(projectModel: EgretProjectModel): void {
		this._projectModel = projectModel;
	}

	protected manifest: sax.Tag = null;
	private idMap: { [id: string]: string } = {};
	protected doInit(): Promise<void> {
		let promise = this._projectModel.getEngineInfo().then(engineInfo => {
			this._projectUri = this._projectModel.project;
			this._manifestUri = this.getManifestUri(engineInfo);
			this._egretLibUri = URI.file(engineInfo.egretLibPath);
			this._egretWebLibUri = URI.file(engineInfo.egretWebLibPath);
			this._uiLibUri = this.getUILibUri(engineInfo);
			this._tweenUri = URI.file(engineInfo.tweenPath);
			this.initParser(engineInfo);
		});
		promise = promise.then(() => {
			return this.fileService.resolveContent(this.manifestUri).then(content => {
				const manifestStr: string = content.value;
				this.idMap = {};
				try {
					var manifest = xmlTagUtil.parse(manifestStr);
				} catch (error) { }
				if (manifest) {
					for (let i = 0; i < manifest.children.length; i++) {
						const item = manifest.children[i];
						const id = item.attributes['id'];
						const className = item.attributes['module'] + '.' + id;
						this.idMap[id] = className;
					}
				}
				this.manifest = manifest;
			});
		});
		return promise;
	}

	private loaded: boolean = false;
	private loadPromise: Promise<void> = null;
	/**
	 * 确保已经刷新过了
	 */
	public ensureLoaded(): Promise<void> {
		if (this.loaded) {
			return Promise.resolve(void 0);
		} else if (this.loadPromise) {
			return this.loadPromise;
		} else {
			this.loadPromise = this.doInit().then(config => {
				this.loadPromise = null;
				this.loaded = true;
				return config;
			});
			return this.loadPromise;
		}
	}

	/**
	 * 确保解析中心已经被加载过了
	 */
	public ensurePaserCenterInited(): Promise<void> {
		return this.ensureLoaded().then(() => {
			return this.parseCenter.init();
		});
	}

	protected abstract getManifestUri(engineInfo: EgretEngineInfo): URI;
	protected abstract getUILibUri(engineInfo: EgretEngineInfo): URI;
	protected abstract initParser(engineInfo: EgretEngineInfo): void;


	private _skinNames: string[] = [];
	private _classNames: string[] = [];
	private _skinToPathMap: { [className: string]: string } = {};
	private _classMap: { [fullName: string]: ClassNode } = {};
	private currentStamp: number = -1;
	/**
	 * 类改变事件的接受
	 * @param event 
	 */
	protected classChanged_handler(event: ClassChangedEvent): void {
		this._classMap = event.classMap;
		this._skinNames = event.skinNames;
		this._skinToPathMap = event.skinToPathMap;
		//解析类名列表
		this._classNames = [];
		for (const className in this._classMap) {
			if (!this._classMap[className].inEngine && !this._classMap[className].isInterface) {
				this._classNames.push(this._classMap[className].fullName);
			}
		}
		this.currentStamp = process.uptime();
		this._onCustomClassChanged.fire(event.type);
	}
	/**
	 * 根据类名得到一个类的节点
	 * @param className 
	 */
	public getClassNode(className: string): ClassNode {
		return this._classMap[className];
	}
	/**
	 * 得到自定义类名列表
	 */
	public getClassNames(): string[] {
		return this._classNames;
	}
	/**
	 * 通过tag得到类名
	 * @param node 
	 */
	public getClassName(node: sax.Tag): string;
	/**
	 * 通过类的短名和命名空间得到一个类的全名
	 * @param id 短名，如 com.test.classname 的短名为classname
	 * @param ns 类的命名空间
	 */
	public getClassName(id: string, ns: Namespace): string;
	public getClassName(arg1: any, arg2?: any): string {
		return this.coreParser.getClassName(arg1, arg2);
	}

	/**
	 * 得到基类的名字
	 * @param text 
	 */
	public getBaseClassName(text: string | sax.Tag): string {
		return this.coreParser.getBaseClassName(text);
	}

	public getClassNodeMap(): { [fullName: string]: ClassNode } {
		return this._classMap;
	}

	private getCustomStamp: number = -1;
	private customClasses: ClassNode[] = [];
	/**
	 * 得到自定义类列表
	 */
	public getCustomClasses(): ClassNode[] {
		if (this.currentStamp !== this.getCustomStamp) {
			this.customClasses = [];
			const classNodeMap = this._classMap;
			for (const className in classNodeMap) {
				if (!classNodeMap[className].inEngine && !classNodeMap[className].isInterface) {
					this.customClasses.push(classNodeMap[className]);
				}
			}
			this.getCustomStamp = this.currentStamp;
		}
		return this.customClasses;
	}

	// /**
	//  * 判断A是否继承或实现自了B
	//  * @param classNameA 
	//  * @param classNameB 
	//  */
	// public isInstanceOf(classNameA: string, classNameB: string): boolean {
	// 	if (classNameB === 'any' || classNameB === 'Class') {
	// 		return true;
	// 	}
	// 	if (classNameA === classNameB) {
	// 		return true;
	// 	}
	// 	const classNode = this.getClassNode(classNameA);
	// 	if (!classNode) {
	// 		return false;
	// 	}
	// 	const baseClassNode = classNode.baseClass;
	// 	if (baseClassNode) {
	// 		if (this.isInstanceOf(baseClassNode.fullName, classNameB)) {
	// 			return true;
	// 		}
	// 	}
	// 	const implementedNodes = classNode.implementeds;
	// 	for (let i = 0; i < implementedNodes.length; i++) {
	// 		if (this.isInstanceOf(implementedNodes[i].fullName, classNameB)) {
	// 			return true;
	// 		}
	// 	}
	// 	return false;
	// }

	private isInstanceOfClass(classA: string, classB: string): boolean {
		if (classB === 'any' || classB === 'Class') {
			return true;
		}
		if (classA === classB) {
			return true;
		}
		return false;
	}

	/**
	 * 判断A是否继承或实现自了B
	 * @param classNameA 
	 * @param classNameB 
	 */
	public isInstanceOf(classNameA: string, classNameB: string): boolean {
		if (this.isInstanceOfClass(classNameA, classNameB)) {
			return true;
		}
		const classNode = this.getClassNode(classNameA);
		if (!classNode) {
			return false;
		}
		let temp = classNode.baseClass;
		while (temp) {
			if (this.isInstanceOfClass(temp.fullName, classNameB)) {
				return true;
			}
			const implementedNodes = temp.implementeds;
			for (let i = 0; i < implementedNodes.length; i++) {
				const item = implementedNodes[i];
				if (this.isInstanceOfClass(item.fullName, classNameB)) {
					return true;
				}
			}
			temp = temp.baseClass;
		}
		return false;
	}

	/**
	 * 得到一个类的继承连
	 * @param className 
	 */
	public getExtendsChain(className: string): ClassNode[] {
		const arr: ClassNode[] = [];
		let currentClassNode = this.getClassNode(className);
		while (true) {
			if (!currentClassNode) {
				break;
			}
			arr.push(currentClassNode);
			currentClassNode = currentClassNode.baseClass;
		}
		return arr;
	}
	/**
	 * 得到类属性
	 * @param className 类名
	 * @param baseClassName 基类名
	 */
	public getProps(className: string, baseClassName: string = ''): Prop[] {
		const props: Prop[] = [];
		const propsMap: { [name: string]: Prop } = {};
		let currentClassNode = this.getClassNode(className);
		while (true) {
			if (!currentClassNode || currentClassNode.fullName === baseClassName) {
				break;
			}
			const currentProps = currentClassNode.props;
			for (let i = 0; i < currentProps.length; i++) {
				const currentProp = currentProps[i];
				if (!(currentProp.name in propsMap)) {
					propsMap[currentProp.name] = currentProp;
				}
			}
			currentClassNode = currentClassNode.baseClass;
		}
		for (const key in propsMap) {
			props.push(propsMap[key]);
		}
		return props;
	}


	/**
	 * 为指定的完整类名创建命名空间。
	 * @param className 类名
	 * @param nsList 要加入到的XML对象，用于检查前缀重复。
	 */
	public createNamespace(className: string, nsList: Namespace[]): Namespace {
		className = className.split('::').join('.');
		let id: string = className;
		let index: number = className.lastIndexOf('.');
		if (index !== -1) {
			id = className.substring(index + 1);
		}
		if (this.idMap[id] === className) {
			return this.coreParser.getUINs();
		}
		let uri: string = '*';
		if (index !== -1) {
			uri = className.substring(0, index + 1) + '*';
		}
		const prefixes: string[] = [];
		for (let i = 0; i < nsList.length; i++) {
			const ns = nsList[i];
			if (ns.uri === uri) {
				return ns;
			}
			prefixes.push(ns.prefix);
		}
		let prefix: string = '';
		let preStr: string = '';
		if (index === -1) {
			preStr = 'ns';
			prefix = 'ns1';
		}
		else {
			const subStr: string = className.substring(0, index);
			index = subStr.lastIndexOf('.');
			if (index === -1) {
				prefix = subStr;
			} else {
				prefix = subStr.substring(index + 1);
			}
			preStr = prefix;
		}
		index = 0;
		while (prefixes.indexOf(prefix) !== -1) {
			index++;
			prefix = preStr + index;
		}
		return new Namespace(prefix, uri);
	}

	/**
	 * 得到皮肤名列表
	 */
	public getSkinNames(): string[] {
		return this._skinNames;
	}

	/**
	 * 对自定义组件类名进行排序，按照从子类到父类的顺序排列。
	 * @param classNames
	 */
	public sortComponentClassNames(classNames: string[]): void {
		//对customClassNameList进行排序，按照从子类到父类的顺序排列
		const newClassNames: string[] = [];
		while (classNames.length > 0) {
			const className: string = classNames.pop();
			let isInsert: boolean = false;
			for (var i = 0; i < newClassNames.length - 1; i++) {
				const isCurrent: boolean = this.isInstanceOf(className, newClassNames[i]);
				const isNext: boolean = i + 1 < newClassNames.length ? this.isInstanceOf(className, newClassNames[i + 1]) : false;
				//插入到i的后面
				if (isCurrent && !isNext) {
					newClassNames.push(className);
					for (let j = newClassNames.length - 1; j > i; j--) {
						newClassNames[j] = newClassNames[j - 1];
					}
					newClassNames[i] = className;
					isInsert = true;
					break;
				}
			}
			if (!isInsert) {
				newClassNames.push(className);
			}
		}
		for (i = 0; i < newClassNames.length; i++) {
			classNames.unshift(newClassNames[i]);
		}
	}

	/**
	 * 判断是否是TS的自定义类。
	 */
	public isTsCustomClass(className: string): boolean {//TODO 这个方法最好被重命名一下
		const classNode = this.getClassNode(className);
		if (!classNode) {
			return false;
		}
		//TODO 这里最好搞一下，因为没有必要判断是不是exml
		const exmlPath = this.getExmlUri(className);
		if (exmlPath) {
			return false;
		}
		return !classNode.inEngine;
	}

	/**
	 * 得到一个皮肤的路径Uri
	 */
	public getExmlUri(className: string): URI {
		if (!className) {
			return null;
		}
		if (endWith(className.toLowerCase(), '.exml')) {
			return URI.file(paths.join(this.projectUri.fsPath, className));
		}
		const path = this._skinToPathMap[className];
		if (path) {
			return URI.file(path);
		}
		return null;
	}
}

/**
 * Eui的Config
 */
export class EUIExmlConfig extends AbstractExmlConfig {
	private runtimeUrl: string = null;
	protected initConfig(): void {
		this.coreParser = new ExmlCoreParserEUI();
	}
	protected initParser(engineInfo: EgretEngineInfo): void {
		this.parseCenter = createParseCenter(this.instantiationService, engineInfo.euiPropertiesPath, 'eui');
		this.parseCenter.onClassChanges(e => this.classChanged_handler(e));
	}
	protected doInit(): Promise<void> {
		const promise = super.doInit().then(() => {
			function format(path: string): string {
				if (path.charAt(0) === '/') {
					path = 'file://' + path;
				} else {
					path = 'file:///' + path;
				}
				return path;
			}
			let path: string = this.projectUri.fsPath;
			if (path.charAt(path.length - 1) == '/') {
				path = path.slice(0, path.length - 1);
			}
			path = format(path);

			const egretLibPath = fs.existsSync(this.egretLibUri.fsPath) ? format(this.egretLibUri.fsPath) : 'libs/modules/egret/egret.js';
			const egretWebLibPath = fs.existsSync(this.egretWebLibUri.fsPath) ? format(this.egretWebLibUri.fsPath) : 'libs/modules/egret/egret.web.js';
			const uiLibPath = fs.existsSync(this.uiLibUri.fsPath) ? format(this.uiLibUri.fsPath) : 'libs/modules/eui/eui.js';
			const tweenPath = fs.existsSync(this.tweenUri.fsPath) ? format(this.tweenUri.fsPath) : 'libs/modules/tween/tween.js';

			this.runtimeUrl = '../../../../../euiruntime/index.html?' +
				'project=' + path + '&' +
				'egretLibPath=' + egretLibPath + '&' +
				'egretWebLibPath=' + egretWebLibPath + '&' +
				'uiLibPath=' + uiLibPath + '&' +
				'tweenPath=' + tweenPath;
		});
		return promise.then(() => {
			//默认组件的初始化
			this._defaultComponents = [];
			this._defaultContainers = [];

			const components: sax.Tag[] = xmlTagUtil.child(this.manifest, 'component');
			if (components.length === 0) {
				return;
			}

			const containersKey: string[] = ['eui.Group', 'eui.Panel', 'eui.ViewStack', 'eui.Scroller'];
			for (let i = 0; i < components.length; i++) {
				const item: sax.Tag = components[i];
				if (item.attributes['show'] === 'true') {
					const component: any = { id: item.attributes['id'], ns: EUI };
					if (containersKey.indexOf('eui.' + item.attributes['id']) !== -1) {
						this._defaultContainers.push(component);
					} else {
						this._defaultComponents.push(component);
					}
				}
			}
			sortOn(<any[]>this._defaultComponents, 'id');
			sortOn(<any[]>this._defaultContainers, 'id');
		});
	}

	protected getManifestUri(engineInfo: EgretEngineInfo): URI {
		return URI.file(engineInfo.euiManifestPath);
	}
	protected getUILibUri(engineInfo: EgretEngineInfo): URI {
		return URI.file(engineInfo.euiLibPath);
	}



	private _hosts: IHost[] = [];
	/** 
	 * sdk的EUI主机组件列表 
	 */
	public getHosts(): Promise<IHost[]> {
		return this.initedHost().then(() => this._hosts);
	}

	private hostInited: boolean = false;
	private hostIntedPromise: Promise<void> = null;
	private initedHost(): Promise<void> {
		if (this.hostInited) {
			return Promise.resolve(void 0);
		}
		if (!this.hostIntedPromise) {
			this.hostIntedPromise = this.ensureLoaded().then(() => {
				return this.parseCenter.init().then(() => {
					this.hostInited = true;
					this._hosts = [];
					const components: sax.Tag[] = xmlTagUtil.child(this.manifest, 'component');
					if (components.length === 0) {
						return;
					}
					for (let i = 0; i < components.length; i++) {
						const item: sax.Tag = components[i];
						const module: string = item.attributes['module'];
						const id: string = item.attributes['id'];
						let className: string = '';
						const state: string = item.attributes['state'];
						if (module) {
							className = module + '.' + id;
						} else {
							className = id;
						}
						if (this.isInstanceOf(className, 'eui.Component')) {
							this._hosts.push({ 'id': id, 'className': className, 'module': module, 'state': state });
						}
					}
					sortOn(this._hosts, 'id');
				});
			});
		}
		return this.hostIntedPromise;
	}


	private _defaultComponents: IComponent[];
	/**
	 * 直接得到EUI默认组件，需要在调用了`ensureLoaded()` 之后再调用该方法。
	 */
	public getDefaultComponentsDirect(): IComponent[] {
		return this._defaultComponents;
	}
	/** 
	 * EUI默认组件 
	 */
	public getDefaultComponents(): Promise<IComponent[]> {
		return this.ensureLoaded().then(() => this._defaultComponents);
	}
	private _defaultContainers: IComponent[];
	/**
	 * 直接得到EUI默认容器，需要在调用了`ensureLoaded()` 之后再调用该方法。
	 */
	public getDefaultContainersDriect(): IComponent[] {
		return this._defaultContainers;
	}
	/** 
	 * EUI默认容器 
	 */
	public getDefaultContainers(): Promise<IComponent[]> {
		return this.ensureLoaded().then(() => this._defaultContainers);
	}
	/**
	 * 直接得到对应项目访问的URL，需要在调用了`ensureLoaded()` 之后再调用该方法。
	 */
	public getRuntimeUrlDirect(): string {
		return this.runtimeUrl;
	}
	/** 
	 * 对应项目访问的URL 
	 */
	public getRuntimeUrl(): Promise<string> {
		return this.ensureLoaded().then(() => this.runtimeUrl);
	}
}

/**
 * Gui的Config
 */
export class GUIExmlConfig extends AbstractExmlConfig {
	protected initConfig(): void {
		this.coreParser = new ExmlCoreParserGUI();
	}
	protected initParser(engineInfo: EgretEngineInfo): void {
		this.parseCenter = createParseCenter(this.instantiationService, engineInfo.guiPropertiesPath, 'gui');
		this.parseCenter.onClassChanges(e => this.classChanged_handler(e));
	}
	protected getManifestUri(engineInfo: EgretEngineInfo): URI {
		return URI.file(engineInfo.guiManifestPath);
	}
	protected getUILibUri(engineInfo: EgretEngineInfo): URI {
		return null;
	}
}

function sortOn<T>(array: T[], key: string) {
	function sortOnFunc(a: T, b: T) {
		const aValue = a[key];
		const bValue = b[key];

		if (aValue > bValue) {
			return 1;
		} else if (aValue < bValue) {
			return -1;
		} else {
			return 0;
		}
	}
	array.sort(sortOnFunc);
}

/**
 * Host数据接口
 */
export interface IHost {
	/**
	 * 短名
	 */
	id: string;
	/**
	 * 类名
	 */
	className: string;
	/**
	 * 模块名
	 */
	module: string;

	/**
	 * 状态
	 */
	state: string;

}

/**
 * 组件接口
 */
export interface IComponent {
	/**
	 * 短名
	 */
	id: string;
	/**
	 * 命名空间
	 */
	ns: Namespace;

	/**
	 * 控件类型
	 */
	type: string;
}