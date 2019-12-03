/**
 * UI基类
 */
export interface IUIBase {
	/**
	 * 核心dom对象
	 */
	getElement(): HTMLElement;
	/**
	 * 创建
	 */
	create(container: HTMLElement | IUIBase): void;
}

/**
 * 得到对应的html对象
 */
export function getTargetElement(target: HTMLElement | IUIBase): HTMLElement {
	if (target instanceof HTMLElement) {
		return target;
	}
	return target.getElement();
}