/**
 * 格式化工具
 */
export class FormatUtil {
	static checkNumber = new RegExp('^[0-9]+$|^[0-9]+.[0-9]+$');
	static checkIsSimpleExp = new RegExp('^[0-9\\/\\+\\-\\*\\.\\(\\)]+$');
	static judgePercent(str: string) {
		if (!str){
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
}