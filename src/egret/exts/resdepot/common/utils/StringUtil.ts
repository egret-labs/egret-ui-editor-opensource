
export class StringUtil extends egret.HashObject {

	public static trim(str: string): string {
		return StringUtil.trimLeft(StringUtil.trimRight(str));
	}

	public static trimLeft(str: string): string {
		if (!str) {
			return '';
		}
		var char: string = str.charAt(0);
		while (str.length > 0 && (char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '\f')) {
			str = str.substr(1);
			char = str.charAt(0);
		}
		return str;
	}

	public static trimRight(str: string): string {
		if (!str) {
			return '';
		}
		var char: string = str.charAt(str.length - 1);
		while (str.length > 0 && (char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '\f')) {
			str = str.substr(0, str.length - 1);
			char = str.charAt(str.length - 1);
		}
		return str;
	}

	public static startWith(str: string, prefix: string): boolean {
		if (!str || !prefix) {
			return (!str && !prefix);
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

	public static endWith(str: string, suffix: string): boolean {
		if (!str || !suffix) {
			return (!str && !suffix);
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

	public static replaceStr(targetStr: string, p: string, rep: string): string {
		if (!targetStr) {
			return '';
		}
		var arr: Array<any> = targetStr.split(p);
		return arr.join(rep);
	}

	public static toColorString(color: number): string {

		var str: string = color.toString(16).toUpperCase();
		var num: number = 6 - str.length;
		for (var i: number = 0; i < num; i++) {
			str = '0' + str;
		}
		return '0x' + str;
	}

	public static toSizeString(length: number, fractionDigits: number = -1): string {
		var sizeStr: string = '';
		if (fractionDigits === -1) {
			if (length > 1073741824) {
				sizeStr += (length / 1073741824).toString() + 'GB';
				length = length % 1073741824;
			}
			if (length > 1048576) {
				if (sizeStr) {
					sizeStr += ',';
				}
				sizeStr += (length / 1048576).toString() + 'MB';
				length = length % 1048576;
			}
			if (length > 1204) {
				if (sizeStr) {
					sizeStr += ',';
				}
				sizeStr += (length / 1204).toString() + 'KB';
				length = length % 1204;
			}
			if (length > 0) {
				if (sizeStr) {
					sizeStr += ',';
				}
				sizeStr += length.toString() + 'B';
			}
		}
		else {
			if (length > 1073741824) {
				sizeStr = (length / 1073741824).toFixed(fractionDigits) + 'GB';
			}
			else if (length > 1048576) {
				sizeStr = (length / 1048576).toFixed(fractionDigits) + 'MB';
			}
			else if (length > 1204) {
				sizeStr = (length / 1204).toFixed(fractionDigits) + 'KB';
			}
			else {
				sizeStr = length.toString() + 'B';
			}
		}
		return sizeStr;
	}

	public static htmlEntities: Array<any>;
	public static escapeHTMLEntity(str: string, excludeApos: boolean = true): string {
		if (!str) {
			return '';
		}
		var list: Array<any> = StringUtil.htmlEntities;
		for (var arr_key_a in list) {
			var arr: Array<any> = list[arr_key_a];
			var key: string = arr[0];
			if (excludeApos && key === '\'') {
				continue;
			}
			var value: string = arr[1];
			str = str.split(key).join(value);
		}
		return str;
	}

	public static unescapeHTMLEntity(str: string): string {
		if (!str) {
			return '';
		}
		var list: Array<any> = StringUtil.htmlEntities;
		for (var arr_key_a in list) {
			var arr: Array<any> = list[arr_key_a];
			var key: string = arr[0];
			var value: string = arr[1];
			str = str.split(value).join(key);
		}
		return str;
	}

	public static checkInString(text: string, index: number): boolean {

		if (index < 0 || index >= text.length) {
			return false;
		}
		var newStr: string = '';
		for (var i: number = index - 1; i >= 0; i--) {
			if (text.charAt(i) === '\r' || text.charAt(i) === '\n') {
				break;
			} else {
				newStr = text.charAt(i) + newStr;
			}
		}
		var flag1: boolean = false;
		var flag2: boolean = false;
		for (i = 0; i < newStr.length; i++) {
			if (newStr.charAt(i) === '\'' && (i === 0 || newStr.charAt(i - 1) !== '\\')) {
				if (!flag1 && !flag2) {
					flag1 = true;
				}
				else if (flag1) {
					flag1 = false;
				}
			}
			if (newStr.charAt(i) === '\'' && (i === 0 || newStr.charAt(i - 1) !== '\\')) {
				if (!flag1 && !flag2) {
					flag2 = true;
				}
				else if (flag2) {
					flag2 = false;
				}
			}
		}
		return (flag1 && text.charAt(i) !== '\'') || (flag2 && text.charAt(i) !== '\'');
	}

	public static getPosByLine(text: string, lineIndex: number, columnIndex: number): number {

		var lineList: Array<string> = new Array<string>();
		var lineBreaks: Array<string> = new Array<string>();
		// var index: number = 0;
		// var t: number = egret.getTimer();
		var rnLines: Array<any> = text.split('\r\n');
		for (var rnLine_key_a in rnLines) {
			var rnLine: string = rnLines[rnLine_key_a];
			var rLines: Array<any> = rnLine.split('\r');
			for (var rLine_key_a in rLines) {
				var rLine: string = rLines[rLine_key_a];
				var nLines: Array<any> = rLine.split('\n');
				for (var line_key_a in nLines) {
					var line: string = nLines[line_key_a];
					lineList.push(line);
					lineBreaks.push('\n');
				}
				lineBreaks[lineBreaks.length - 1] = '\r';
			}
			lineBreaks[lineBreaks.length - 1] = '\r\n';
		}
		if (lineBreaks.length > 0) {
			lineBreaks[lineBreaks.length - 1] = '';
		}
		var result: number = -1;
		var l: number = 0;
		for (var i: number = 0; i < lineList.length; i++) {
			if (lineIndex === i) {
				if (columnIndex === -1) {
					for (var j: number = l; j < text.length; j++) {
						if (text.charAt(j) !== ' ' && text.charAt(j) !== '\t' && text.charAt(j) !== '\r' && text.charAt(j) !== '\n') {
							l = j;
							result = l;
							break;
						}
					}
				}
				else {
					result = l + columnIndex;
				}
				break;
			}
			l += lineList[i].length;
			if (i < lineBreaks.length) {
				l += lineBreaks[i].length;
			}
		}
		return result;
	}

	public static getLineByPos(text: string, position: number): any {
		var lineList: Array<string> = new Array<string>();
		var lineBreaks: Array<string> = new Array<string>();
		// var index: number = 0;
		// var t: number = egret.getTimer();
		var rnLines: Array<any> = text.split('\r\n');
		for (var rnLine_key_a in rnLines) {
			var rnLine: string = rnLines[rnLine_key_a];
			var rLines: Array<any> = rnLine.split('\r');
			for (var rLine_key_a in rLines) {
				var rLine: string = rLines[rLine_key_a];
				var nLines: Array<any> = rLine.split('\n');
				for (var line_key_a in nLines) {
					var line: string = nLines[line_key_a];
					lineList.push(line);
					lineBreaks.push('\n');
				}
				lineBreaks[lineBreaks.length - 1] = '\r';
			}
			lineBreaks[lineBreaks.length - 1] = '\r\n';
		}
		if (lineBreaks.length > 0) {
			lineBreaks[lineBreaks.length - 1] = '';
		}
		var result: any = { 'line': -1, 'column': -1 };
		var l: number = 0;
		var positionCache: number = 0;
		for (var i: number = 0; i < lineList.length; i++) {
			l += (lineList[i].length);
			if (i < lineBreaks.length) {
				l += (lineBreaks[i].length);
			}
			if (position <= l && position >= positionCache) {
				result['line'] = i;
				result['column'] = position - positionCache;
				break;
			}
			positionCache = l;
		}
		return result;
	}
}
StringUtil.htmlEntities = [['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;'], ['\'', '&quot;'], ['\'', '& apos;']];