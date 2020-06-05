import * as types from 'egret/base/common/types';
import { ExmlModelConfig } from 'egret/exts/exml-exts/exml/common/exml/exmlModeConfig';
import { IDesignConfig } from 'egret/exts/exml-exts/exml/common/exml/designConfig';

/**
 * 数据绑定工具类
 */
export class DataBindingUtil {
	/**
	 * 判断是否为绑定类型，返回boolean类型
	 */
	public static isBinding(value: string) {
		if (DataBindingUtil.judgeIsBindingData(value)) {
			return true;
		}
		else {
			return false;
		}
	}

	/**
	 *判断是否为简单数据绑定
	  绑定格式:{data.key + number}
	 */
	public static judgeIsBindingData(value: string): { templates: string[], chainIndex: number[] } {
		const jsKeyWords: string[] = ['null', 'NaN', 'undefined', 'true', 'false'];
		if (!value) {
			return null;
		}
		if (!types.isString(value)) {
			return null;
		}
		value = value.trim();
		if (value.charAt(0) !== '{' || value.charAt(value.length - 1) !== '}') {
			return null;
		}
		value = value.substring(1, value.length - 1).trim();
		const templates = value.split('+');
		const chainIndex: number[] = [];
		let length = templates.length;
		for (let i = 0; i < length; i++) {
			let item = templates[i].trim();
			if (!item) {
				templates.splice(i, 1);
				i--;
				length--;
				continue;
			}
			const first = item.charAt(0);
			if (first === '\'' || first === '\"' || first >= '0' && first <= '9') {
				continue;
			}
			if (item.indexOf('.') === -1 && jsKeyWords.indexOf(item) !== -1) {
				continue;
			}
			if (item.indexOf('this.') === 0) {
				item = item.substring(5);
			}
			chainIndex.push(i);
		}
		if (templates) {
			for (let index = 0; index < templates.length; index++) {
				if (templates[index]) {
					templates[index] = templates[index].trim();
				}
			}
		}

		return { templates: templates, chainIndex: chainIndex };
	}

	public static getFinalValueAfterReplaceByBindingData(value, designConfig: IDesignConfig): { value: any, isReplacedByTestData: boolean } {
		if (!types.isString(value)) {
			return { value: value, isReplacedByTestData: false };
		}
		let globalTestData = designConfig.globalBindingDataTestObj;
		let selfTestData = designConfig.bindingDataTestObj;
		let bindingInfoObj = DataBindingUtil.judgeIsBindingData(value);
		if (!bindingInfoObj) {
			return { value: value, isReplacedByTestData: false };
		}

		let itemArr: string[] = [];
		let bIsFoundTestValue: boolean = false;
		//
		for (let index = 0; index < bindingInfoObj.templates.length; index++) {
			let isChain = bindingInfoObj.chainIndex.indexOf(index) !== -1;
			if (isChain) {
				let itemSum = '';
				let bindingValue = bindingInfoObj.templates[index];
				if (globalTestData) {
					for (let testKey = 0; testKey < globalTestData.length; testKey++) {
						if (bindingValue === globalTestData[testKey].key) {
							itemSum = globalTestData[testKey].value;
							bIsFoundTestValue = true;
						}
					}
				}
				if (selfTestData) {
					for (let testKey = 0; testKey < selfTestData.length; testKey++) {
						if (bindingValue === selfTestData[testKey].key) {
							itemSum = selfTestData[testKey].value;
							bIsFoundTestValue = true;
						}
					}
				}
				itemArr.push(itemSum);
			}
			else {
				let bindingValue = bindingInfoObj.templates[index];
				//to do 引号的处理不应该放在这里，应该放在解析中
				if ((bindingValue.charAt(0) === '\"' && bindingValue.charAt(bindingValue.length - 1) === '\"') || (bindingValue.charAt(0) === '\'' && bindingValue.charAt(bindingValue.length - 1) === '\'')) {
					bindingValue = bindingValue.substring(1, bindingValue.length - 1);
				}
				itemArr.push(bindingValue);
			}
		}
		//
		let sum = '';
		for (let index = 0; index < itemArr.length; index++) {
			sum += itemArr[index];
		}
		if (!bIsFoundTestValue) {
			return { value: value, isReplacedByTestData: false };
		}
		return { value: sum, isReplacedByTestData: true };
	}
}