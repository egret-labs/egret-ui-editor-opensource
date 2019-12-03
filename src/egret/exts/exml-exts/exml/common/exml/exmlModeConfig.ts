import { EUIExmlConfig } from '../project/exmlConfigs';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { Emitter, Event } from 'egret/base/common/event';

import { EgretRuntimeDelegate, IRuntimeAPI } from '../../runtime/runtime';
import { IEgretProjectService } from '../../../project';
import { Namespace } from '../sax/Namespace';
import { endWith } from '../utils/strings';
import { W_EUI } from '../project/parsers/core/commons';

import * as xmlTagUtil from '../sax/xml-tagUtils';
import * as xmlStrUtil from '../sax/xml-strUtils';

import * as sax from '../sax/sax';
import * as fs from 'fs';
import { parseClassName } from '../utils/eui/exmls';
import { ClassNode } from '../project/syntaxNodes';
import { IAssetsAdapter } from '../assets/adapters';

/**
 * ExmlModel的配置，原项目中的EUISingleConfig
 */
export class ExmlModelConfig {

	private exmlCompiler: ExmlCompiler;
	constructor(
		private projectConfig: EUIExmlConfig,
		private onCompileWarning: Emitter<string>,
		private onCompileError: Emitter<string>,
		@IEgretProjectService private projectService: IEgretProjectService,
		@IInstantiationService private instantiationService: IInstantiationService
	) {
		this.exmlCompiler = this.instantiationService.createInstance(ExmlCompiler,
			this, this.onCompileWarning, this.onCompileError
		);
		this.assetAdapter = this.projectService.createAssetsAdapter();
	}

	/**
	 * 项目的Exml配置
	 */
	public getProjectConfig(): EUIExmlConfig {
		return this.projectConfig;
	}

	private _runtime: EgretRuntimeDelegate = null;
	/** 运行时 */
	public get runtime(): EgretRuntimeDelegate {
		return this._runtime;
	}
	runtimeApi: IRuntimeAPI;
	private exmlConfigInRuntime: any;
	private assetAdapter: IAssetsAdapter;
	/**
	 * 设置运行时
	 */
	public setRuntime(runtime: EgretRuntimeDelegate, refreshRes = true): void {
		this.loaded = false;
		this._runtime = runtime;
		this._runtime.getRuntime().then(runtime => {
			this.runtimeApi = runtime;
			this.exmlConfigInRuntime = new this.runtimeApi.eui.sys.EXMLConfig();
			this.runtimeApi.registerTheme((hostComponent) => {
				return this.getDefaultSkinName(hostComponent);
			}, (style) => {
				return this.getStyleConfig(style);
			});
			if (refreshRes) {
				if (this.assetAdapter) {
					this.assetAdapter.setRuntime(this._runtime);
				}
			}
			if (this.assetAdapter) {
				this.assetAdapter.ensureLoaded().then(() => {
					this.projectConfig.ensurePaserCenterInited().then(() => {
						this.loaded = true;
						if (this.ensureLoadedPromiseReslove) {
							this.ensureLoadedPromiseReslove(void 0);
						}
						this.ensureLoadedPromise = null;
						this.ensureLoadedPromiseReslove = null;
					});
				});
			}
		});
	}

	private loaded: boolean = false;
	private ensureLoadedPromise: Promise<void> = null;
	private ensureLoadedPromiseReslove: (value?: void | PromiseLike<void>) => void = null;
	/**
	 * 确保已经加载完成
	 */
	public ensureLoaded(): Promise<void> {
		// if (!this._runtime) {
		// 	//TODO 这里没有考虑好应该怎么设计，觉得目前这样直接返回一个永远不可能被继续执行下去的Promise会比较安全一些
		// 	return new Promise<void>((resolve, reject) => { });
		// }
		if (this.loaded) {
			return Promise.resolve(void 0);
		}
		if (this.ensureLoadedPromise) {
			return this.ensureLoadedPromise;
		}
		this.ensureLoadedPromise = new Promise<void>((reslove, reject) => {
			this.ensureLoadedPromiseReslove = reslove;
		});
		return this.ensureLoadedPromise;
	}
	/**
	 * 刷新资源配置
	 */
	public refreshResConfig(): void {
		if (this.runtime) {
			this.setRuntime(this.runtime);
		}
	}
	/**
	 * 根据ID获取对应的默认属性
	 * @param id 类的短名ID
     * @param ns 命名空间
	 * @return 默认属性名
	 */
	public getDefaultPropById(id: string, ns: Namespace): string {
		return this.exmlConfigInRuntime.getDefaultPropById(id, ns.uri);
	}
	/**
	 * 此方法和ExmlProjectConfig中的方法不同，如果该类是自定义类没有被注入到window中，则返回null
	 */
	public getClassNameById(id: string, ns: Namespace): string {
		return this.exmlConfigInRuntime ? this.exmlConfigInRuntime.getClassNameById(id, ns.uri) : null;
	}
	/**
	 * 返回 name 参数指定的类的类对象引用。
	 */
	public getClassByName(className: string): any {
		if (!this.runtimeApi) {
			return null;
		}
		return this.runtimeApi.egret.getDefinitionByName(className);
	}
	/**
	 * 返回对象的完全限定类名。
	 */
	public getQualifiedClassName(value: any): string {
		if (!this.runtimeApi) {
			return null;
		}
		return this.runtimeApi.egret.getQualifiedClassName(value);
	}
	/**
	 * 获取一个类实例， 如果该类没有被编译则自动执行编译
	 */
	public getInstanceByName(className: string): any {
		const clazz: any = this.compileIfNeed(className);
		if (!clazz) {
			return null;
		}
		let instance: any;
		try {
			instance = new clazz();
		}
		catch (e) { }
		return instance;
	}
	/**
	 * 获取默认的皮肤类
	 */
	private getDefaultSkinName(hostComponet: any): string {
		if (!this.projectService.theme) {
			return null;
		}
		const className: string = this.getQualifiedClassName(hostComponet);
		return this.getDefaultSkinNameByClassName(className);
	}

	/**
	 * 获取默认皮肤
	 */
	public getDefaultSkinNameByClassName(className: string): string {
		if (!this.runtimeApi) {
			return null;
		}
		if (!this.projectService.theme) {
			return null;
		}
		while (className) {
			const skinClassName: string = this.projectService.theme.getDefaultSkin(className);
			if (skinClassName) {
				const skinClazz: any = this.compileIfNeed(skinClassName);
				if (skinClazz) {
					return skinClassName;
				}
				else {
					return null;
				}
			}
			className = this.runtimeApi.egret.getQualifiedSuperclassName(this.getClassByName(className));
		}
		return null;
	}

	private getStyleConfig(style: string): any {
		if (!this.projectService.theme) {
			return null;
		}
		return this.projectService.theme.getStyleConfig(style);
	}
	/**
	 * 获取实例
	 */
	public getInstanceById(id: string, ns: Namespace): any {
		const className: string = this.projectConfig.getClassName(id, ns); // 此时用ProjectConfig的这个方法，因为该节点可能没有被编译
		return this.getInstanceByName(className);
	}

	private basicTypes: string[] = ['Array', 'boolean', 'string', 'number', 'any'];
	/**
	 * 命名空间为w的属性名列表
	 */
	public wingKeys: { [id: string]: string } = {
		'id': 'string',
		'class': 'string',
		'locked': 'boolean',
		'includeIn': 'string',
		'excludeFrom': 'string'
	};
	/**
	 * 判断某一个节点是否是属性节点
	 */
	public isProperty(node: sax.Tag): boolean {
		let prop: string = node.localName;
		prop = prop.split('.')[0];//去掉状态
		const parent: sax.Tag = node.parent;
		let parentClassName: string = null;
		if (parent) {
			parentClassName = this.getClassNameById(parent.localName, new Namespace(parent.prefix, parent.namespace));
		}
		if (!parentClassName) {
			return false;
		}
		if (this.basicTypes.indexOf(prop) !== -1) {
			return false;
		}
		if (this.getPropertyType(prop, parentClassName) || this.wingKeys.hasOwnProperty(prop)) {
			return true;
		}
		else {
			return false;
		}
	}
	isDeclarations(node: sax.Tag): boolean {
		if (node.localName === 'Declarations' && node.namespace === W_EUI.uri) {
			return true;
		}
		return false;
	}
	/**
	 * 获取指定属性的类型,返回基本数据类型：'boolean','string','number','any'。
	 * @param property 属性名
	 * @param className 要查询的完整类名
	 */
	public getPropertyType(property: string, className: string): string {
		if (!className) {
			return '';
		}
		let type: string = this.exmlConfigInRuntime.getPropertyType(property, className);
		if (type && type.indexOf('[]') > 0) {   //将States[]等类型转换成数组类型
			type = 'Array';
		}
		return type;
	}
	/**
	 * 得到属性的默认值，具体内容子类重写。
	 * @param id 类名id
	 * @param prop 属性名
	 * @param 所在命名空间
	 */
	public getDefaultValueById(id: string, prop: string, ns: Namespace): any {
		const className: string = this.getClassNameById(id, ns);
		if (this.projectConfig.defaultValueDic.hasOwnProperty(className + ':' + prop)) {
			return this.projectConfig.defaultValueDic[className + ':' + prop];
		}
		let value: any = null;
		const clazz: any = this.getClassByName(className);
		try {
			const instance: any = new clazz();
			value = instance[prop];
			this.projectConfig.defaultValueDic[className + ':' + prop] = value;
		} catch (error) {
		}
		return value;
	}
	/**
	 * 检查指定对象是否为 框架内指定接口或类或其子类的实例。
	 */
	public isInstance(instance: any, typeName: string): boolean {
		if (!instance) {
			return false;
		}
		if (!this.runtimeApi) {
			return false;
		}
		return this.runtimeApi.egret.is(instance, typeName);
	}

	/**
	 * 编译一个exml或者ts自定义类
	 * @param className 要编译的exml的类名或者路径，如果text不存在则自动寻找对应的exml，如果text存在则此参数无效。
	 * @param text 对应的exml的文本
	 * @return 编译完成的class对象
	 */
	public compile(className: string, text: string = null, tag: sax.Tag = null): any {
		return this.exmlCompiler.compile(className, text, tag);
	}
	/**
	 * 编译一个类或者exml路径如果需要，并返回类定义
	 */
	public compileIfNeed(className: string): any {
		if (!this.isEgretClass(className)) {
			return this.compile(className);
		}
		else {
			const clazz: any = this.getClassByName(className);
			return clazz;
		}
	}
	//TODO 感觉这个类比较耗时，似乎不应该这么判断
	/**
	 * 是否是egret的系统类
	 */
	public isEgretClass(className: string): boolean {
		if (this.getClassByName(className)) {
			if (!endWith(className.toLowerCase(), '.exml')) {
				const customClasses = this.projectConfig.getCustomClasses();
				let has = false;
				for (let i = 0; i < customClasses.length; i++) {
					if (customClasses[i].fullName == className) {
						has = true;
						break;
					}
				}
				if (!has) {
					return true;
				}
			}
		}
		return false;
	}
}





/**
 * Exml编译器
 */
class ExmlCompiler {

	private static cacheMap: { [path: string]: { tag: sax.Tag, content: string, mTime: number } } = {};
	public static getTag(path: string): { tag: sax.Tag, content: string } {
		if (!path) {
			return null;
		}
		let mTime: number = -1;
		try {
			mTime = fs.statSync(path).mtime.getTime();
		} catch (error) { }

		const cache = ExmlCompiler.cacheMap[path];
		let needReload: boolean = false;
		if (!cache) {
			needReload = true;
		} else {
			if (mTime !== cache.mTime) {
				needReload = true;
			}
		}
		let contentTag: sax.Tag = null;
		var content: string = '';
		if (needReload) {
			var content: string = path ? fs.readFileSync(path, { encoding: 'utf8' }) : '';
			try {
				contentTag = xmlTagUtil.parse(content);
			} catch (error) { }
			if (contentTag) {
				ExmlCompiler.cacheMap[path] = {
					tag: contentTag,
					mTime: mTime,
					content: content
				};
			}
		} else {
			contentTag = cache.tag;
			content = cache.content;
		}
		return { tag: contentTag, content: content };
	}


	constructor(
		private modelConfig: ExmlModelConfig,
		private onCompileWarning: Emitter<string>,
		private onCompileError: Emitter<string>,
		@IEgretProjectService private projectService: IEgretProjectService
	) { }

	/**
	 * 已编译过的exml , key为路径 ， value为上次编译的时间戳
	 */
	private compileDic: { [path: string]: number } = {};
	/**
	 * 
	/**
	 * 编译一个exml或者ts自定义类
	 * @param className 
	 * @param text 
	 * @param tag 
	 */
	public compile(className: string, text: string, tag: sax.Tag = null): any {
		if (!this.modelConfig.runtimeApi) {
			return null;
		}
		this.tempCompiled = {};
		this.tempCompiling = {};
		let path: string;
		if (!text && className) {
			//如果是ts自定义类
			if (this.modelConfig.getProjectConfig().isTsCustomClass(className)) {
				this.addJSClass(className);
				return this.modelConfig.getClassByName(className);
			}
			const pathUri = this.modelConfig.getProjectConfig().getExmlUri(className);
			path = pathUri ? pathUri.fsPath : '';
			let content: string = '';
			this.tryCatch(() => {
				content = fs.readFileSync(path, { encoding: 'utf8' });
			});
			if (!content) {
				this.onCompileError.fire('Compile failed, can not find the class "' + className + '"');
				return null;
			}
			else {
				text = content;
				this.tryCatch(() => {
					tag = xmlTagUtil.parse(text);
				});
			}
		}
		const clazz: any = this.startCompile(text, path, tag);
		return clazz;
	}


	private tryCatch(func) {
		try {
			func();
		} catch (error) { }
	}

	private pathTokey(path: string, className: string): string {
		return path + '-' + className;
	}

	/**
	 * 检查指定路径的exml或者exml,ts类是否需要编译。此方法不递归检查
	 */
	private checkNeedCompile(className: string): boolean {
		if (!this.modelConfig.getClassByName(className)) {
			return true;
		}
		if (this.modelConfig.isEgretClass(className)) {
			return false;
		}
		const pathUri = this.modelConfig.getProjectConfig().getExmlUri(className);
		const path: string = pathUri ? pathUri.fsPath : '';
		if (path) {
			const modStamp: number = this.getModStamp(path);
			const pathKey: string = this.pathTokey(path, className);
			if (!this.compileDic[path] || (!this.tempCompiled.hasOwnProperty(pathKey) && this.compileDic[path] !== modStamp)) {
				return true;
			}
			else {
				return false;
			}
		}
		return true;
	}

	private getModStamp(path: string): number {
		let mTime: number = 0;
		try {
			mTime = fs.statSync(path).mtime.getTime();
		} catch (error) { }
		return mTime;
	}

	/**
	 * 当前循环中已经编译的类
	 */
	private tempCompiled: { [path: string]: boolean } = {};

	/**
	 * 当前循环中正要编译的类
	 */
	private tempCompiling: { [path: string]: boolean } = {};

	/**
	 * 获取已经编译的数量
	 */
	private getCompiledCount(): number {
		let result: number = 0;
		for (const key in this.tempCompiled) {
			if (this.tempCompiled[key]) {
				result++;
			}
		}
		return result;
	}

	/**
	 * 开始编译一个exml
	 */
	private startCompile(text: string, classPath: string = null, tag: sax.Tag = null): any {
		const className: string = parseClassName(tag ? tag : text);
		const classKey: string = this.pathTokey(classPath, className);
		const compiledCount: number = this.getCompiledCount();

		if (classPath) {
			if (this.tempCompiling.hasOwnProperty(classKey)) {
				this.deleteJSClass(className);
				this.onCompileError.fire('Compile failed, to compile the class "' + className + '" in the existence of mutual dependency reference relationship!');
				return null;
			}
			this.tempCompiling[classKey] = true;
		}

		const relyOnList: string[] = [];
		this.analyze(text, relyOnList, tag);

		let needComplied: boolean = false;
		for (let i = 0; i < relyOnList.length; i++) {
			const relyClassName = relyOnList[i];
			const pathUri = this.modelConfig.getProjectConfig().getExmlUri(relyClassName);
			const path: string = pathUri ? pathUri.fsPath : '';
			const pathKey: string = this.pathTokey(path, relyClassName);
			if (this.tempCompiled.hasOwnProperty(pathKey)) {
				if (this.tempCompiled[pathKey]) {
					needComplied = true;
				}
				continue;
			}
			//编译自定义的ts类
			if (this.modelConfig.getProjectConfig().isTsCustomClass(relyClassName)) {
				//如果是ts自定义类
				this.addJSClass(relyClassName);
				continue;
			}
			const contentObj = ExmlCompiler.getTag(path);
			if (contentObj) {
				var content: string = contentObj.content;
				var contentTag: sax.Tag = contentObj.tag;
			}
			if (content && contentTag) {
				const relyClazz: any = this.startCompile(content, path, contentTag);
				if (!relyClazz) {
					return null;
				}
			}
		}

		if (!className || needComplied || compiledCount !== this.getCompiledCount() || this.checkNeedCompile(className)) {
			this.deleteJSClass(className);
			const tmpText = xmlStrUtil.removeHead(text);
			const clazz: any = this.modelConfig.runtimeApi.parse(tmpText);
			if (classPath) {
				this.compileDic[classPath] = this.getModStamp(classPath);
				this.tempCompiled[classKey] = true;
				if (this.tempCompiling.hasOwnProperty(classKey)) {
					delete this.tempCompiling[classKey];
				}
			}

			if (typeof clazz === 'string') {
				this.onCompileError.fire(clazz);
				return null;
			}
			return clazz;
		}
		else {
			this.tempCompiled[classKey] = false;
			if (this.tempCompiling.hasOwnProperty(classKey)) {
				delete this.tempCompiling[classKey];
			}
			return this.modelConfig.getClassByName(className);
		}
	}

	private deleteJSClass(className: string): void {
		if (!this.modelConfig.runtimeApi) {
			return;
		}
		if (className && this.modelConfig.getClassByName(className)) {

			this.modelConfig.runtimeApi.eval('delete ' + className);
			this.modelConfig.runtimeApi.egret.cleanCache();
		}
	}



	/**
	 * 添加js类到容器中
	 */
	private addJSClass(className: string): void {
		const pathUri = this.modelConfig.getProjectConfig().getExmlUri(className);
		const path: string = pathUri ? pathUri.fsPath : '';
		const pathKey: string = this.pathTokey(path, className);
		if (this.tempCompiled.hasOwnProperty(pathKey)) {
			return;
		}
		const customList = this.modelConfig.getProjectConfig().getCustomClasses();
		const classes = this.modelConfig.getProjectConfig().getExtendsChain(className);
		if (classes.length < 1) {
			return;
		}
		let superClassName: ClassNode = null;
		const compiledCount: number = this.getCompiledCount();
		if (classes.length > 1) {
			superClassName = classes[1];
			if (customList.indexOf(superClassName) >= 0) {
				this.addJSClass(superClassName.fullName);
			}
		}
		if (compiledCount === this.getCompiledCount() && !this.checkNeedCompile(className)) {
			return;
		}
		const prop = {};
		const classNode = this.modelConfig.getProjectConfig().getClassNode(className);
		if (classNode) {
			const implementsArr: string[] = [];
			for (var i = 0; i < classNode.implementeds.length; i++) {
				implementsArr.push(classNode.implementeds[i].fullName);
			}
			prop['implements'] = implementsArr;
			if (classNode.baseClass) {
				prop['super'] = classNode.baseClass.fullName;
			}
			for (var i = 0; i < classNode.props.length; i++) {
				prop[classNode.props[i].name] = classNode.props[i].type;
			}
		}
		const propsMap = {};
		for (var i = 0; i < classNode.props.length; i++) {
			const propNode = classNode.props[i];
			propsMap[propNode.name] = propNode.value;
		}
		for (const key in prop) {
			if (key !== 'super' && key !== 'implements' && !propsMap.hasOwnProperty(key)) {
				delete prop[key];
			}
		}
		//这里的classdata 的super没有模块名!!!!  todo fuck
		this.modelConfig.runtimeApi.registerClass(className, prop, propsMap);
		this.compileDic[path] = this.getModStamp(path);
		this.tempCompiled[pathKey] = true;
		if (this.tempCompiling.hasOwnProperty(pathKey)) {
			delete this.tempCompiling[pathKey];
		}
	}

	/**
	 * 分析一个EXML文件引用的其他的类名称或exml路径的字典
	 * @param exml
	 */
	private analyze(text: string, list: string[], tag: sax.Tag = null): void {
		let exml: sax.Tag;
		if (tag) {
			exml = tag;
		} else {
			this.tryCatch(() => {
				exml = xmlTagUtil.parse(text);
			});
		}
		if (!exml) {
			return;
		}
		this.parseNode(exml, list);
	}

	private parseNode(node: sax.Tag, list: string[]): void {
		if (this.modelConfig.isDeclarations(node)) {
			for (var i = 0; i < node.children.length; i++) {
				var childNode: sax.Tag = node.children[i];
				this.parseNode(childNode, list);
			}
		} else if (!this.modelConfig.isProperty(node)) {
			let className: string = this.modelConfig.getProjectConfig().getBaseClassName(node);
			if (!className) {
				return;
			}

			if (list.indexOf(className) === -1 && !this.modelConfig.isEgretClass(className)) {
				list.push(className);
			}

			//编译属性节点 ， 目前暂时在解析属性的时候进行编译
			for (var i = 0; i < node.attributeNodes.length; i++) {
				const item: sax.Attribute = node.attributeNodes[i];
				let key: string = item.name;
				const index: number = key.lastIndexOf('.');
				if (index !== -1) {
					key = key.substring(index);
				}
				const value: string = item.value;
				const type: string = this.modelConfig.getPropertyType(key, className);
				if (type !== 'Class') {
					continue;
				}
				if (value && list.indexOf(value) === -1 && !this.modelConfig.isEgretClass(value)) {
					list.push(value);
				}
			}
			const skinNameAtt: string = node.attributes['skinName'];
			const uri: string = node.namespace;
			const skinNameChild: sax.Tag[] = xmlTagUtil.child(node, 'skinName', uri);
			let skinChild: sax.Tag;
			if (skinNameChild && skinNameChild.length > 0) {
				const skinNameNode: sax.Tag = skinNameChild[0];
				var skinChildList: sax.Tag[] = xmlTagUtil.child(skinNameNode, 'Skin', uri);
				if (skinChildList && skinChildList.length > 0) {
					skinChild = skinChildList[0];
				}
			}
			if (!skinChild) {
				skinChildList = xmlTagUtil.child(node, 'Skin', uri);
				if (skinChildList && skinChildList.length > 0) {
					skinChild = skinChildList[0];
				}
			}

			if (!skinNameAtt && !skinChild) {
				className = this.modelConfig.getProjectConfig().getClassName(node.localName, new Namespace(node.prefix, node.namespace));
				let defaultSkinName = '';
				if (this.modelConfig.getProjectConfig() && this.projectService.theme) {
					while (className) {
						defaultSkinName = this.projectService.theme.getDefaultSkin(className);
						if (defaultSkinName) {
							break;
						}
						const classNode = this.modelConfig.getProjectConfig().getClassNode(className);
						if (classNode && classNode.baseClass) {
							className = classNode.baseClass.fullName;
						} else {
							className = null;
						}
					}
				}
				if (defaultSkinName && list.indexOf(defaultSkinName) === -1) {
					list.push(defaultSkinName);
				}
			}

		}
		for (var i = 0; i < node.children.length; i++) {
			var childNode: sax.Tag = node.children[i];
			this.parseNode(childNode, list);
		}
	}


}