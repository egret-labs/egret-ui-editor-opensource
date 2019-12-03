import * as types from 'egret/base/common/types';

/**
 * 判断是否为绑定类型，返回boolean类型
 */
export function isBinding(value: string) {
	if (judgeIsBindingData(value)) {
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
export function judgeIsBindingData(value: string): { templates: string[], chainIndex: number[] } {
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