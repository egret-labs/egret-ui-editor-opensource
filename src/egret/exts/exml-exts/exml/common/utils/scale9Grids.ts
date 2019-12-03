import { Rectangle } from '../exml/common';

/**
 * 返回字符串所对应的全局唯一Rectangle对象。此方法主要为了减少scale9Grid属性的实例个数。
 * 参数的相同的九宫格数据使用此方法可以全局共享同一个Rectangle对象。
 * @param value {string} 以字符串形式表示Rectangle构造函数的四个参数:x，y，width，height。例如："7,7,46,46"。
 * @returns {string} 字符串对应的Rectangle实例。
 */
export function getScale9Grid(value: string): Rectangle {
	return Scale9GridUtil.getScale9Grid(value);
}

/**
 * 九宫格工具类
 */
class Scale9GridUtil {
	//TODO 这里的Rectangle理论上应该用runtime里的
	static rectangleCache: any = {};
	/**
	 * 返回字符串所对应的全局唯一Rectangle对象。此方法主要为了减少scale9Grid属性的实例个数。
	 * 参数的相同的九宫格数据使用此方法可以全局共享同一个Rectangle对象。
	 * @param value {string} 以字符串形式表示Rectangle构造函数的四个参数:x，y，width，height。例如："7,7,46,46"。
	 * @returns {string} 字符串对应的Rectangle实例。
	 */
	public static getScale9Grid(value: string): Rectangle {
		if (Scale9GridUtil.rectangleCache[value]) {
			return Scale9GridUtil.rectangleCache[value];
		}
		if (!value) {
			return null;
		}
		const arr: string[] = value.split(',');
		const rect: Rectangle = new Rectangle(parseInt(arr[0]), parseInt(arr[1]), parseInt(arr[2]), parseInt(arr[3]));
		Scale9GridUtil.rectangleCache[value] = rect;
		return rect;
	}
}