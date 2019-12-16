import { ISchemaStrategy } from './ISchemaStrategy';
import { Namespace } from '../sax/Namespace';
import { AbstractExmlConfig } from '../project/exmlConfigs';
import { ClassNode } from '../project/syntaxNodes';

/**
 * exml规范策略
 */
export class BaseSchemaStrategy implements ISchemaStrategy {

	private exmlConfig: AbstractExmlConfig;
	public init(exmlConfig: AbstractExmlConfig): void {
		this.exmlConfig = exmlConfig;
		if (this.exmlConfig) {
			this.exmlConfig.onCustomClassChanged(this.customChangedHandler, this);
		}
	}

	protected customChangedHandlers: any[] = [];
    /**
     * 添加自定义类改变的回调
     */
	public addCustomChangedHandler(callBack: () => void, thisArg: any): void {
		this.customChangedHandlers.push({
			'func': callBack,
			'thisArg': thisArg
		});
	}
    /**
     * 移除自定义类改变的回调
     */
	public removeCustomChangedHandler(callBack: () => void, thisArg: any): void {
		for (var i = 0; i < this.customChangedHandlers.length; i++) {
			if (this.customChangedHandlers[i]['func'] === callBack && this.customChangedHandlers[i]['thisArg'] === thisArg) {
				for (var j = i; j < this.customChangedHandlers.length - 1; j++) {
					this.customChangedHandlers[j] = this.customChangedHandlers[j + 1];
				}
				break;
			}
		}
	}

    /**
     * 项目自定义类清单发生改变,然后派发更新自定义组件的事件。
     * @param event
     */
	private customChangedHandler(): void {
		for (var i = 0; i < this.customChangedHandlers.length; i++) {
			var func: Function = this.customChangedHandlers[i]['func'];
			var thisArg: any = this.customChangedHandlers[i]['thisArg'];
			func.call(thisArg);
		}
	}

    /**
     * 对自定义组件类名进行排序，按照从子类到父类的顺序排列。
     * @param classNames
     */
	public sortComponentClassNames(classNames: string[]): void {
		this.exmlConfig.sortComponentClassNames(classNames);
	}
    /**
     * 通过类名得到实现的接口列表。
     * @param className 类名
     * @return 指定类实现的接口列表
     */
	public getAllInterface(className: string): string[] {
		var result: ClassNode[] = [];
		var doGet: (classNode: ClassNode) => void = (classNode: ClassNode) => {
			var implementeds = classNode.implementeds;
			for (var i = 0; i < implementeds.length; i++) {
				var implementedArr = this.exmlConfig.getExtendsChain(implementeds[i].fullName);
				result = result.concat(implementedArr);
			}
			var baseClass = classNode.baseClass;
			if (baseClass) {
				doGet(baseClass);
			}
		};
		var classNode = this.exmlConfig.getClassNode(className);
		if (classNode) {
			doGet(classNode);
		}
		var newResult = [];
		for (var i = 0; i < result.length; i++) {
			if (newResult.indexOf(result[i].fullName) === -1 && result[i].isInterface) {
				newResult.push(result[i].fullName);
			}
		}
		return newResult;
	}
    /**
     * 得到一个类的继承链。
     * @param className 类名
     * @return 继承联列表
     */
	public getExtendsChain(className: string): string[] {
		var classNodes = this.exmlConfig.getExtendsChain(className);
		var result: string[] = [];
		for (var i = 0; i < classNodes.length; i++) {
			result.push(classNodes[i].fullName);
		}
		return result;
	}
    /**
     * 得到父类的类名。
     * @param className 类名
     * @return 父类的类名
     */
	public getPropertyAfterBase(className: string, superClassName: string): any {
		if (this.exmlConfig) {
			return this.exmlConfig.getProps(className, superClassName);
		}
		return {};
	}
    /**
     * 得到当前类相对于指定父类的所有属性字典，key:属性名,value:属性类型。
     * @param className 类名
     * @param superClassName 父类名
     * @return 属性字典，key:属性名,value:属性类型。
     */
	public getSuperClassName(className: string): string {
		return this.exmlConfig.getProps(className)['super'];
	}
    /**
     * 工作的命名空间，具体子类重写
     */
	public get guiNS(): Namespace {
		return null;
	}
    /**
     * GUI的命名空间，具体子类重写
     */
	public get workNS(): Namespace {
		return null;
	}
    /**
     * 为指定的完整类名创建命名空间。
     * @param className 类名
     * @param xml 要加入到的XML对象，用于检查前缀重复。
     */
	public createNamespace(className: string, nsList: Namespace[]): Namespace {
		return this.exmlConfig.createNamespace(className, nsList);
	}
    /**
     * 组件类名列表
     */
	public get componentClassNames(): string[] {
		if (this.exmlConfig) {
			var arr: string[] = [];
			for (var i = 0; i < this.codePromptClassNameList.length; i++) {
				arr.push(this.codePromptClassNameList[i]);
			}
			return arr;
		}
		return [];
	}
	
	private currentStamp: number = -1;
	private getCodePromptStamp: number = -1;
	private codePromptclassNames: string[] = [];
	/**
	 * 自定义类名列表
	 */
	private get codePromptClassNameList(): string[] {
		if (this.currentStamp !== this.getCodePromptStamp) {
			this.codePromptclassNames = [];
			var classNodeMap = this.exmlConfig.getClassNodeMap();
			for (var className in classNodeMap) {
				if (!classNodeMap[className].isInterface && (
					!classNodeMap[className].inEngine || classNodeMap[className].inPrompt
				)) {
					this.codePromptclassNames.push(classNodeMap[className].fullName);
				}
			}
			this.getCodePromptStamp = this.currentStamp;
		}
		return this.codePromptclassNames;
	}
	
    /**
     * 皮肤类名列表
     */
	public get skinClassNames(): string[] {
		if (!this.exmlConfig) {
			return [];
		}
		// TODO 实现该方法
		// return this.exmlConfig.getAllSkinClassName();
	}
}
