import * as sax from '../../sax/sax';
import * as xmlTagUtil from '../../sax/xml-tagUtils';

/**
 * 解析EXML文本的class名
 * @param text exml文本
 * @return 如果exml不是xml格式或者有错误则返回null，如果没有对应的class属性则返回空字符串，否则返回对应的类名。
 */
export function parseClassName(exml: sax.Tag | string): string {
	if (!exml) {
		return '';
	}
	try {
		return doParseClassName(exml);
	} catch (error) { }
	return null;
}
function doParseClassName(exml: sax.Tag | string): string {
	let xmlTag: sax.Tag = null;
	if (typeof exml === 'string') {
		xmlTag = xmlTagUtil.parse(exml);
	} else {
		xmlTag = <sax.Tag>exml;
	}
	if (!xmlTag) {
		return '';
	}
	const className: string = xmlTag.attributes['class'];
	if (className) {
		return className;
	}
	return '';
}