export const NON_FIND_CLASS = -1;
/**
 * 组件名字数组
 */
export class ComponentClassNameArray {
	constructor() {
		this.classNameData = [];
		this.classNameState = [];
	}

	/**创建类名字 */
	public buildClassName() {
		let sum = '';
		for (let i = 0; i < this.classNameState.length; i++) {
			if (this.classNameState[i]) {
				sum += ' ' + this.classNameData[i];
			}
		}
		return sum;
	}
	/**
	 * 存在类名字
	 * @param className 
	 */
	public hasClassName(className: string) {
		for (let i = 0; i < this.classNameData.length; i++) {
			if (this.classNameData[i] === className) {
				return i;
			}
		}
		return NON_FIND_CLASS;
	}

	/**
	 * 添加类名字
	 * @param className 
	 * @param defaultActiveState 
	 */
	public addClassName(className: string, defaultActiveState: boolean = true) {
		const hasValue = this.hasClassName(className);
		if (hasValue === NON_FIND_CLASS) {
			this.classNameData.push(className);
			this.classNameState.push(defaultActiveState);
		}
	}

	/**
	 * 激活类名字
	 */
	public activeClassName(className: string) {
		const hasValue = this.hasClassName(className);
		if (hasValue !== NON_FIND_CLASS) {
			this.classNameState[hasValue] = true;
		}
	}

	/**
	 * 不激活累名字
	 * @param className 
	 */
	public deactiveClassName(className: string) {
		const hasValue = this.hasClassName(className);
		if (hasValue !== NON_FIND_CLASS) {
			this.classNameState[hasValue] = false;
		}
	}

	//暂时没发现removeClassName的需求
	public removeClassName(className: string) {

	}

	//打开数组中指定的classname，关闭其他的
	public chooseClassNameFromGroupArray(groupArray:Array<string>, chosenClassName:string){
		for(let index = 0; index < groupArray.length; index ++){
			this.deactiveClassName(groupArray[index]);
			if(groupArray[index] === chosenClassName){
				this.activeClassName(chosenClassName);
			}
		}
	}

	private classNameData: Array<String>;
	private classNameState: Array<Boolean>;
}
