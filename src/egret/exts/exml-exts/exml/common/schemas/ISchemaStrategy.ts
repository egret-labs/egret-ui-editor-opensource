import { Namespace } from './../sax/Namespace';
import { ClassChangedType } from '../project/parsers/parser';
/**
 * xml规范策略，用于给规范数据层提供基本方法用的。 而规范数据层是用于提供EXML代码提示用的。
 */
export interface ISchemaStrategy {
	/**
     * 添加自定义类改变的回调
     */
	addCustomChangedHandler(callBack: (e: ClassChangedType) => void, thisArg: any): void;
	/**
     * 移除自定义类改变的回调
     */
	removeCustomChangedHandler(callBack: (e: ClassChangedType) => void, thisArg: any): void;

	/**
     * 对自定义组件类名进行排序，按照从子类到父类的顺序排列。
     * @param classNames
     */
	sortComponentClassNames(classNames: string[]): void;
	/**
     * 通过类名得到实现的接口列表。
     * @param className 类名
     * @return 指定类实现的接口列表
     */
	getAllInterface(className: string): any[];
	/**
     * 得到一个类的继承链。 
     * @param className 类名
     * @return 继承联列表
     */
	getExtendsChain(className: string): any[];
	/**
     * 得到父类的类名。
     * @param className 类名
     * @return 父类的类名
     */
	getSuperClassName(className: string): string;
	/**
     * 得到当前类相对于指定父类的所有属性字典，key:属性名,value:属性类型。
     * @param className 类名
     * @param superClassName 父类名
     * @return 属性字典，key:属性名,value:属性类型。
     */
	getPropertyAfterBase(className: string, superClassName: string): any;
	/**
     * 工作的命名空间，具体子类重写 
     */
	workNS: any;
	/**
     * GUI的命名空间，具体子类重写 
     */
	guiNS: any;
	/**
     * 为指定的完整类名创建命名空间。
     * @param className 类名
     * @param xml 要加入到的XML对象，用于检查前缀重复。
     */
	createNamespace(className: string, nsList: any[]): Namespace;
	/**
     * 组件类名列表 
     */
	componentClassNames: string[];
	/**
     * 皮肤类名列表 
     */
	skinClassNames: string[];
}