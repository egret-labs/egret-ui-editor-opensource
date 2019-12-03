/**
 * 属性
 */
export class Prop {
	/**
	 * 属性名
	 */
	public name: string = '';
	/**
	 * 属性类型
	 */
	public type: string = '';
	/**
	 * 属性的值
	 */
	public value: string = '';
	/**
	 * 可用的属性值
	 */
	public available: string[] = [];
}
/**
 * 类节点
 */
export class ClassNode {
	/**
	 * 引擎中的类
	 */
	public inEngine: boolean = false;
	/**
	 * 库中可以提示的类
	 */
	public inPrompt: boolean = false;
	/**
	 * 全部类名
	 */
	public fullName: string = '';
	/**
	 * 基类名
	 */
	public baseClass: ClassNode;
	/**
	 * 实现的接口列表
	 */
	public implementeds: ClassNode[] = [];
	/**
	 * 属性列表
	 */
	public props: Prop[] = [];
	/**
	 * 是否是接口
	 */
	public isInterface: boolean = false;
}