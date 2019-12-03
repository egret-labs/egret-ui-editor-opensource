import { isArray, isString, isNumber } from 'egret/base/common/types';
import { isInstanceof, IObject } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { judgeIsBindingData, isBinding } from './dataBindings';
import { judgePercent } from './formats';
import { EUI } from 'egret/exts/exml-exts/exml/common/project/parsers/core/commons';

export type UserValue = string | number | boolean | string[];
export type DefaultValue = string | number | boolean;

/**
 * 得到不同节点中相同的属性列表
 */
export function getSameKeyValue(keyvalues: { [type: string]: { user: UserValue, default: DefaultValue } }[]): { [type: string]: { user: UserValue, default: DefaultValue } } {
	const targetKeyValue: { [type: string]: { user: UserValue, default: DefaultValue } } = {};
	const tmpMap: { [type: string]: { user: UserValue, default: DefaultValue }[] } = {};

	for (let i = 0; i < keyvalues.length; i++) {
		const curKeyValue = keyvalues[i];
		for (const type in curKeyValue) {
			//用第一个节点作为初始
			if (i == 0) {
				tmpMap[type] = [curKeyValue[type]];
			} else {
				if (type in tmpMap) {
					tmpMap[type].push(curKeyValue[type]);
				} else {
					//如果不存在则证明不是共有的类型，直接删掉
					delete tmpMap[type];
				}
			}
		}
	}
	//再清除一遍多余的type类型
	let maxLength = 0;
	for (const type in tmpMap) {
		const length = tmpMap[type].length;
		if (length > maxLength) {
			maxLength = length;
		}
	}
	const needDeleteTypes: string[] = [];
	for (const type in tmpMap) {
		const length = tmpMap[type].length;
		if (length < maxLength) {
			needDeleteTypes.push(type);
		}
	}
	for (let i = 0; i < needDeleteTypes.length; i++) {
		delete tmpMap[needDeleteTypes[i]];
	}

	function getValue(value: (string | number | boolean | string[])): number | string | boolean {
		if (isArray(value)) {
			return value.join(',');
		}
		return value;
	}

	//得到最终的keyvalue键值对
	for (const type in tmpMap) {
		const values = tmpMap[type];
		const mutilValue = {
			user: null,
			default: null
		};
		for (let i = 0; i < values.length; i++) {
			if (i == 0) {
				mutilValue.user = values[i].user;
				mutilValue.default = values[i].default;
			} else {
				const curUserValue = getValue(values[i].user);
				const mutilUserValue = getValue(mutilValue.user);
				if (curUserValue != mutilUserValue) {
					mutilValue.default = null;
					mutilValue.user = null;
					break;
				}
			}
		}
		if (values.length > 0) {
			targetKeyValue[type] = mutilValue;
			for (const key in values[0]) {
				if (key != 'user' && key != 'default') {
					mutilValue[key] = values[0][key];
				}
			}
		}
	}
	return targetKeyValue;
}

/**
 * 将颜色转换为字符串形式
 * @param color 颜色值
 * @param prefix 使用的前缀
 */
export function toHexString(color: number | string, prefix: string): string {
	if (typeof color == 'string') {
		if (color.charAt(0) == '#') {
			color = prefix + color.slice(1);
			return color as string;
		} else if (color.indexOf('0x') == 0) {
			color = prefix + color.slice(2);
			return color as string;
		}
		color = Number.parseInt(color);
	}
	let colorStr = color.toString(16);
	while (colorStr.length < 6) {
		colorStr = '0' + colorStr;
	}
	return prefix + colorStr;
}

/**
 * 将颜色转化为数字
 * @param color 
 */
export function toHexNumber(color: string | number): number {
	if (typeof color == 'number') {
		return color as number;
	}
	if (!color) {
		return 0;
	}
	if (color.charAt(0) == '#') {
		color = '0x' + color.slice(1);
	}
	return Number.parseInt(color, 16);
}


/**
 * 得到节点的属性值，便于显示
 * @param node 
 * @param property 
 */
export function getProperty(node: IObject, property: string, model: IExmlModel = null): { user: UserValue, default: string } {
	const valueUser = node.getProperty(property);
	let value = null;
	if (valueUser) {
		if (isInstanceof(valueUser, 'eui.ILink')) {
			value = valueUser.toString();
		} else {
			value = valueUser.getInstance();
			if (model && model.getExmlConfig()) {
				if (value && model.getExmlConfig().isInstance(value, 'eui.LayoutBase')) {
					value = model.getExmlConfig().getQualifiedClassName(value);
				}
			}
		}
	}
	let valueDefault = node.getInstance()[property];
	if (model && model.getExmlConfig()) {
		if (valueDefault && model.getExmlConfig().isInstance(valueDefault, 'eui.LayoutBase')) {
			valueDefault = model.getExmlConfig().getQualifiedClassName(valueDefault);
		}
	}
	return { user: value, default: valueDefault };
}


/**
 * 设置字符串属性
 * @param node 节点 
 * @param key 属性名 
 * @param value 
 */
export function setPropertyStr(node: IObject, key: string, value: string): void {
	if (!value) {
		node.setProperty(key, null);
	} else {
		node.setString(key, value);
	}
}

/**
 * 设置字符串属性
 * @param node 节点 
 * @param key 属性名 
 * @param value 
 */
export function setPropertyNum(node: IObject, key: string, value: number): void {
	if (value == null || isNaN(value)) {
		node.setProperty(key, null);
	} else {
		node.setNumber(key, value);
	}
}


const regexp = new RegExp('^[\\+\\-]?[0-9]+$|^[\\+\\-]?[0-9]+\\.[0-9]+$');
/**
 * 设置可能带有百分比的数值
 * @param nodes 要设置的节点列表
 * @param prop 要设置的属性名
 * @param value 值
 * @param model 模块
 * @param supportPercent 是否支持百分比 
 */
export function setPropertyNumPro(nodes: IObject[], prop: string, value: string | number, model: IExmlModel, supportPercent: boolean) {
	let sum = null;
	let isNum = false;
	if (isString(value) && judgeIsBindingData(value)) {
		sum = value;
	} else if (isString(value) && judgePercent(value) && supportPercent) {
		sum = value;
	} else if (isNumber(value)) {
		sum = (value as Number).toString();
		isNum = true;
	} else if (regexp.test(value)) {
		sum = value;
		isNum = true;
	}
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		if (!sum) {
			node.setProperty(prop, null);
			continue;
		}
		let curValue = node.getProperty(prop);
		if (!curValue || (curValue && isInstanceof(curValue, 'eui.ILink'))) {
			curValue = model.createIValue('string', EUI, sum);
		} else if (isString(value) && isBinding(value) && isInstanceof(curValue, 'eui.ISize')) {
			curValue = model.createILink(value.slice(1, value.length - 1));
		} else if (isString(value) && isBinding(value) && isInstanceof(curValue, 'eui.IValue')) {
			curValue = model.createILink(value.slice(1, value.length - 1));
		}
		curValue.setInstance(sum);
		node.setProperty(prop, curValue);
		if (isNum) {
			if (prop === 'width') {
				if (node.getInstance()['percentWidth'] !== NaN) {
					node.setProperty('percentWidth', null);
				}
			} else if (prop === 'height') {
				if (node.getInstance()['percentHeight'] !== NaN) {
					node.setProperty('percentHeight', null);
				}
			}
		}
	}
}

/**
 * 设置布尔属性
 * @param node 节点 
 * @param key 属性名 
 * @param value 
 */
export function setPropertyBool(node: IObject, key: string, value: boolean): void {
	if (value == null) {
		node.setProperty(key, null);
	} else {
		node.setBoolean(key, value);
	}
}