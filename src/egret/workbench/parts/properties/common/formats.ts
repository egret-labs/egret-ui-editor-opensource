const checkNumber = new RegExp('^[0-9]+$|^[0-9]+.[0-9]+$');
const checkIsSimpleExp = new RegExp('^[0-9\\/\\+\\-\\*\\.\\(\\)]+$');
/**
 * 判断是否是百分数
 * @param str 
 */
export function judgePercent(str: any): boolean {
	if (!str) {
		return false;
	}
	str = str.toString();
	if (str === '' || !str) {
		return false;
	}
	if (isNaN(Number(str.slice(0, str.length - 1)))) {
		return false;
	}
	return (str.indexOf('%') === str.length - 1);
}