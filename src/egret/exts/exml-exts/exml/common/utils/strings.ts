/**
* 检查指定的索引是否在字符串中
* @param text 全文
* @param index 指定索引
*/
export function checkInString(text: string, index: number): Boolean {
	if (index < 0 || index >= text.length) {
		return false;
	}
	let newStr: string = '';
	for (var i: number = index - 1; i >= 0; i--) {
		if (text.charAt(i) === '\r' || text.charAt(i) === '\n') {
			break;
		} else {
			newStr = text.charAt(i) + newStr;
		}
	}
	let flag1: Boolean = false;
	let flag2: Boolean = false;
	for (i = 0; i < newStr.length; i++) {
		if (newStr.charAt(i) === '\"' && (i === 0 || newStr.charAt(i - 1) !== '\\')) {
			if (!flag1 && !flag2) {
				flag1 = true;
			} else if (flag1) {
				flag1 = false;
			}
		}
		if (newStr.charAt(i) === '\'' && (i === 0 || newStr.charAt(i - 1) !== '\\')) {
			if (!flag1 && !flag2) {
				flag2 = true;
			} else if (flag2) {
				flag2 = false;
			}
		}
	}
	return (flag1 && text.charAt(i) !== '\"') || (flag2 && text.charAt(i) !== '\'');
}

/**
* 去掉字符串两端所有连续的不可见字符。
* 注意：若目标字符串为null或不含有任何可见字符,将输出空字符串""。
* @param str 要格式化的字符串
* @param needle 要去除的字符，null表示去除不可见字符
*/
export function trim(str: string, needle: string = null): string {
	return trimLeft(trimRight(str, needle), needle);
}
/**
 * 去除字符串左边所有连续的不可见字符。
 * @param str 要格式化的字符串
 * @param needle 要去除的字符，null表示不可见字符
 */
export function trimLeft(str: string, needle: string = null): string {
	if (!str) { return ''; }

	if (needle === null) {
		let char: string = str.charAt(0);
		while (str.length > 0 &&
			(char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '\f')) {
			str = str.substr(1);
			char = str.charAt(0);
		}
		return str;
	}
	else {
		const needleLen: number = needle.length;
		if (needleLen === 0 || str.length === 0) {
			return str;
		}

		let offset: number = 0;
		let idx: number = -1;

		while ((idx = str.indexOf(needle, offset)) === offset) {
			offset = offset + needleLen;
		}

		return str.substring(offset);
	}
}
/**
 * 去除字符串右边所有连续的不可见字符。
 * @param str 要格式化的字符串
 * @param needle 要去除的字符，null表示不可见字符
 */
export function trimRight(str: string, needle: string = null): string {
	if (!str) { return ''; }

	if (needle === null) {
		let char: string = str.charAt(str.length - 1);
		while (str.length > 0 &&
			(char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '\f')) {
			str = str.substr(0, str.length - 1);
			char = str.charAt(str.length - 1);
		}
		return str;
	}
	else {
		const needleLen: number = needle.length;
		const strLen: number = str.length;
		if (needleLen === 0 || strLen === 0) {
			return str;
		}

		let offset: number = strLen;
		let idx: number = -1;

		while (true) {
			idx = str.lastIndexOf(needle, offset - 1);
			if (idx === -1 || idx + needleLen !== offset) {
				break;
			}
			if (idx === 0) {
				return '';
			}
			offset = idx;
		}
		return str.substring(0, offset);
	}
}

const htmlEntities: (string[])[] = [['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;'], ['\"', '&quot;'], ['\'', '&apos;']];
/**
 * 转换为HTML实体字符
 */
export function escapeHTMLEntity(str: string, excludeApos: boolean = true): string {
	if (!str) { return ''; }
	const list: (string[])[] = htmlEntities;
	for (let i = 0; i < list.length; i++) {
		const arr: string[] = list[i];
		const key: string = arr[0];
		if (excludeApos && key === '\'') {
			continue;
		}
		const value: string = arr[1];
		str = str.split(key).join(value);
	}
	return str;
}

/**
 * 转换HTML实体字符为普通字符
 */
export function unescapeHTMLEntity(str: string): string {
	if (!str) {
		return '';
	}
	const list: (string[])[] = htmlEntities;
	for (let i = 0; i < list.length; i++) {
		const arr: string[] = list[i];
		const key: string = arr[0];
		const value: string = arr[1];
		str = str.split(value).join(key);
	}
	str = str.split('\\n').join('\n');
	str = str.split('\\r').join('\r');
	str = str.split('\\t').join('\t');
	return str;
}

/**
 * 是否以指定的字符串开始
 */
export function startWith(str: string, prefix: string): boolean {
	if (str === null || prefix === null) {
		return (str === null && prefix === null);
	}
	if (prefix.length > str.length) {
		return false;
	}
	if (str.indexOf(prefix) === 0) {
		return true;
	} else {
		return false;
	}
}

/**
 * 是否以指定的字符串结束
 */
export function endWith(str: string, suffix: string): boolean {
	if (str === null || suffix === null) {
		return (str === null && suffix === null);
	}
	if (suffix.length > str.length) {
		return false;
	}
	if (str.lastIndexOf(suffix) === (str.length - suffix.length)) {
		return true;
	} else {
		return false;
	}
}

/**
 * 将颜色数字代码转换为字符串。
 */
export function toColorString(color: number): string {
	let str = color.toString(16).toUpperCase();
	const num = 6 - str.length;
	for (let i = 0; i < num; i++) {
		str = '0' + str;
	}
	return '0x' + str;
}