import { Namespace } from './Namespace';
import { trim, trimRight, trimLeft, checkInString } from '../utils/strings';
import * as sax from './sax';
import * as xmlTagUtil from './xml-tagUtils';

/**
 * 移除xml的头
 * @param xmlStr
 */
export function removeHead(xmlStr: string): string {
	let start = xmlStr.indexOf('<?');
	if (start != -1) {
		const end = xmlStr.indexOf('?>');
		if (end != -1) {
			start = xmlStr.indexOf('<', end);
			xmlStr = xmlStr.slice(start);
		}
	}
	return xmlStr;
}


/**
 * 以字符串的方式添加一个命名空间，重复将不再添加
 * @param xmlStr
 * @param ns
 *
 */
export function addNamespace(xmlStr: string, ns: Namespace): {
	newXml: string,
	addedNS: { offset: number; content: string; }
} {
	let has: boolean = false;
	const path = findRangeByPath(xmlStr, [0], null, []);
	if (path && path.length > 2 && path[0] !== -1 && path[1] !== -1) {
		const rootStr = xmlStr.slice(path[0], path[1]);
		var arr: string[] = rootStr.match(/(xmlns.*?=(\"|\').*?(\"|\'))/g);
	} else {
		var arr: string[] = xmlStr.match(/(xmlns.*?=(\"|\').*?(\"|\'))/g);
	}
	if (arr) {
		for (let i = 0; i < arr.length; i++) {
			const nsArr: string[] = arr[i].match(/xmlns:(.*?)=(\"|\')(.*?)(\"|\')/);
			if (nsArr && nsArr[1] && nsArr[1] === ns.prefix && nsArr[3] && nsArr[3] === ns.uri) {
				has = true;
				break;
			}
		}
	}
	let addedNS: { offset: number; content: string; } = undefined;
	if (has === false && arr) {
		let index: number;
		if (arr.length === 0) {
			if (xmlStr.lastIndexOf('/>') > 0) {
				index = xmlStr.lastIndexOf('/>');
			} else {
				index = xmlStr.lastIndexOf('>');
			}
		}
		else {
			index = xmlStr.indexOf(arr[arr.length - 1]) + arr[arr.length - 1].length;
		}

		const str1: string = xmlStr.slice(0, index);
		const str2: string = xmlStr.slice(index);
		const xmlnsInsertStr: string = ' xmlns:' + ns.prefix + '=\"' + ns.uri + '\"';
		xmlStr = str1 + xmlnsInsertStr + str2;
		addedNS = {
			offset: index,
			content: xmlnsInsertStr
		};
	}
	return {
		newXml: xmlStr,
		addedNS: addedNS
	};
}

/**
 * 以字符串的方式读取一个xml中的命名空间数组。
 * @param xmlStr
 * @return
 */
export function getNamespaces(xmlStr: string): Namespace[] {
	const result: Namespace[] = [];
	const path = findRangeByPath(xmlStr, [0], null, []);
	if (path && path.length > 2 && path[0] !== -1 && path[1] !== -1) {
		const rootStr = xmlStr.slice(path[0], path[1]);
		var arr: string[] = rootStr.match(/(xmlns.*?=(\"|\').*?(\"|\'))/g);
	} else {
		var arr: string[] = xmlStr.match(/(xmlns.*?=(\"|\').*?(\"|\'))/g);
	}
	if (!arr) {
		return [];
	}
	for (let i = 0; i < arr.length; i++) {
		const xmlns: string = arr[i];

		let prefixStart: number = -1;
		let prefixEnd: number = -1;
		let char: string = '';
		let uriStart: number = -1;
		let uriEnd: number = -1;
		for (let j = 0; j < xmlns.length; j++) {
			if (xmlns.charAt(j) === ':' && prefixStart === -1) {
				prefixStart = j + 1;
			}
			if (xmlns.charAt(j) === '=' && prefixEnd === -1) {
				prefixEnd = j;
			}
			if ((xmlns.charAt(j) === '\"' || xmlns.charAt(j) === '\'') && char === '') {
				char = xmlns.charAt(j);
			}
			if (xmlns.charAt(j) === char && xmlns.charAt(j - 1) !== '\\') {
				if (uriStart === -1) {
					uriStart = j + 1;
				} else if (uriEnd === -1) {
					uriEnd = j;
				}
			}
		}

		let prefix: string = '';
		if (prefixStart > 0 && prefixEnd > 0) {
			prefix = trim(xmlns.slice(prefixStart, prefixEnd));
		}
		let uri: string = '';
		if (uriStart > 0 && uriEnd > 0) {
			uri = trim(xmlns.slice(uriStart, uriEnd));
		}
		const ns: Namespace = new Namespace(prefix, uri);
		result.push(ns);
	}
	return result;
}

/**
 * 以字符串的方式清除无用的命名空间
 * @param xmlStr
 *
 */
export function cleanNamespace(xmlStr: string): string {
	const needToDeleteXmlns: string[] = [];
	const arr: string[] = xmlStr.match(/(xmlns.*?=(\"|\').*?(\"|\'))/g);
	if (arr) {
		for (var i = 0; i < arr.length; i++) {
			const nsArr: string[] = arr[i].match(/xmlns:(.*?)=(\"|\')(.*?)(\"|\')/);
			if (nsArr && nsArr[1]) {
				if (xmlStr.match(new RegExp('<\s?' + nsArr[1], 'g')).length === 0) //清除这个命名空间
				{
					needToDeleteXmlns.push(nsArr[1]);
				}
			}
		}
	}
	for (i = 0; i < needToDeleteXmlns.length; i++) {
		xmlStr = xmlStr.replace(new RegExp(' xmlns:' + needToDeleteXmlns[i] + '=(\"|\').*?(\"|\')', 'g'), '');
	}
	return xmlStr;
}

/**
 * 根据xml路径返回指定节点
 * @param xml 要遍历的xml
 * @param path 路径数组
 * @param currentState 当前的视图状态
 * @param states 视图状态列表
 */
export function findItemByPath(xml: sax.Tag, path: number[], currentState: string, states: string[]): sax.Tag {
	if (path.length === 1 || !xml) {
		return xml;
	}
	path.shift();
	let index: number;
	let length: number = xml.children.length;
	let item: sax.Tag;
	while (path.length > 0 && length > 0) {
		item = null;
		index = path.shift();
		for (let i = 0; i < length; i++) {
			item = xml.children[i];
			if (!isItemIncludeIn(item, currentState, states) || item.nodeType === sax.Type.Text) {
				index++;
			}
			if (index === i) {
				break;
			}
			else {
				item = null;
			}
		}
		if (item) {
			xml = item;
			length = xml.children.length;
		}
		else {
			break;
		}
	}
	return item;
}
/**
 * 检查某个节点是否只处于一个视图状态中。
 */
export function isSingleStateItem(item: sax.Tag, states: string[]): boolean {
	if (item.localName === 'Skin') {
		return false;
	}
	let stateNames: string[] = [];
	if (item.attributes.hasOwnProperty('includeIn')) {
		stateNames = trimRight(trimLeft(item.attributes['includeIn'])).split(',');
	}
	else if (item.attributes.hasOwnProperty('excludeFrom')) {
		const excludeNames: string[] = trimRight(trimLeft(item.attributes['excludeFrom'])).split(',');
		for (let i = 0; i < states.length; i++) {
			const state: string = states[i];
			if (excludeNames.indexOf(state) === -1) {
				stateNames.push(state);
			}
		}
	}
	return stateNames.length === 1;
}
/**
 * 根据xml路径返回指定节点在xmlStr中的起始结束索引
 * @param xmlStr xml的文本
 * @param path 路径数组
 * @param currentState 当前的视图状态
 * @param states 视图状态列表
 * @return 一个数组，[headStart(头结点起始索引),headEnd(头结点结束索引),
 * tailStart(尾结点起始索引),tailEnd(尾结点结束索引)]
 */
export function findRangeByPath(xmlStr: string, path: number[], currentState: string, states: string[]): number[] {
	let index: number;
	let subLength: number = 0;
	let closed: boolean = true;
	let nodeText: string = '';
	let openNum: number = 0;

	let headStart: number = -1;
	let headEnd: number = -1;
	let tailStart: number = -1;
	let tailEnd: number = -1;

	while (xmlStr.length > 0) {
		if (closed) {
			index = xmlStr.indexOf('<');
			if (index === -1) {
				break;
			}
			xmlStr = xmlStr.substring(index);
			subLength += index;
			closed = false;
		}
		else {
			let isNote: boolean = false;
			if (xmlStr.substr(0, 4) === '<!--') {
				index = xmlStr.indexOf('-->', 4) + 2;
				isNote = true;
			}
			else if (xmlStr.substr(0, 9) === '<![CDATA[') {
				index = xmlStr.indexOf(']]>') + 2;
				isNote = true;
			}
			else {
				index = xmlStr.indexOf('>');
				while (checkInString(xmlStr, index)) {
					index = xmlStr.indexOf('>', index + 1);
				}
			}
			nodeText = xmlStr.substring(0, index + 1);
			xmlStr = xmlStr.substring(index + 1);
			subLength += index + 1;
			closed = true;
			if (nodeText.charAt(1) === '?' || isNote) {
				continue;
			}
			const type: number = getNodeType(nodeText);
			if (path.length > 0 && openNum === 0 &&
				!isIncludeIn(nodeText, type, currentState, states)) {
				path[0]++;
			}
			switch (type) {
				case 1:
					if (path.length > 0 && openNum === 0) {
						path[0]--;
						if (path[0] === -1) {
							path.splice(0, 1);
						}
					}
					break;
				case 2:
					openNum++;
					if (path.length > 0 && path[0] === 0) {
						path.splice(0, 1);
						openNum = 0;
					}
					break;
				case 3:
					openNum--;
					if (path.length > 0 && openNum === 0) {
						path[0]--;
					}
					break;
			}
			if (path.length === 0) {
				if (headStart === -1) {
					headStart = subLength - nodeText.length;
					headEnd = subLength - 1;
					if (type === 1) {
						tailEnd = tailStart = subLength - 1;
						break;
					}
				}
				else if (openNum === -1) {
					tailStart = subLength - nodeText.length;
					tailEnd = subLength - 1;
					break;
				}
			}
		}
	}
	return [headStart, headEnd, tailStart, tailEnd];
}

/**
 * 返回一个节点的类型，1:完整节点,2:开启节点,3:闭合节点
 */
function getNodeType(node: string): number {
	if (node.charAt(node.length - 2) === '/') {
		return 1;
	}
	if (node.charAt(1) === '/') {
		return 3;
	}
	return 2;
}

/**
 * 检查某个节点文本是否存在于当前状态
 */
function isIncludeIn(nodeText: string, type: number, currentState: string, states: string[]): boolean {
	if (!currentState || type === 3 || (nodeText.indexOf('includeIn') === -1 &&
		nodeText.indexOf('excludeFrom') === -1 && nodeText.indexOf('.') === -1)) {
		return true;
	}
	const index: number = nodeText.indexOf(':');
	if (nodeText.substring(1, index) === 'w') {
		return true;
	}
	nodeText = '<' + nodeText.substr(index + 1);
	if (type === 2) {
		nodeText = nodeText.substring(0, nodeText.length - 1) + '/>';
	}
	try {
		var item: sax.Tag = xmlTagUtil.parse(nodeText);
	}
	catch (e) {
		return true;
	}
	return isItemIncludeIn(item, currentState, states);
}
/**
 * 检测指定xml节点是否存在于当前的状态
 */
function isItemIncludeIn(item: sax.Tag, currentState: string, states: string[]): boolean {
	if (!currentState) {
		return true;
	}
	const prop: string = item.localName;
	//皮肤节点本身就是不可显示节点，所以直接返回true
	if (prop === 'Skin') {
		return true;
	}
	const index: number = prop.indexOf('.');
	if (index !== -1) {
		var state: string = prop.substring(index + 1);
		return state === currentState;
	}
	let stateNames: string[] = [];
	if (item.attributes.hasOwnProperty('includeIn')) {
		stateNames = trimRight(trimLeft(item.attributes['includeIn'])).split(',');
	}
	else if (item.attributes.hasOwnProperty('excludeFrom')) {
		const excludeNames: string[] = trimRight(trimLeft(item.attributes['excludeFrom'])).split(',');
		for (let i = 0; i < states.length; i++) {
			var state: string = states[i];
			if (excludeNames.indexOf(state) === -1) {
				stateNames.push(state);
			}
		}
	}
	else {
		return true;
	}
	return stateNames.indexOf(currentState) !== -1;
}
function tryCatch(func, e: (error) => void) {
	try {
		func();
	} catch (error) { }
}
/**
 * 获取xml指定的字符串索引下对应的XML子节点索引路径
 * @param xmlStr 要匹配的父级xml字符串
 * @param pos 字符串索引
 * @param currentState 当前的视图状态
 * @param states 视图状态列表
 * @return 由int型数字组成的路径数组。
 */
export function findPathAtPos(xmlStr: string, pos: number, currentState: string, states: string[]): number[] {
	let err = false;
	tryCatch(() => {
		xmlTagUtil.parse(xmlStr);
	}, (e) => {
		err = true;
	});
	if (err) {
		return [];
	}


	const nodeList: string[] = [];
	let index: number;
	if (index < 0 || index > xmlStr.length - 1) {
		return [];
	}
	let subLength: number = 0;
	let closed: boolean = true;
	let nodeText: string = '';
	let isOver: boolean = false;
	while (xmlStr.length > 0) {
		if (closed) {
			index = xmlStr.indexOf('<');
			if (index === -1) {
				break;
			}
			if (!isOver && subLength + xmlStr.indexOf('\n') >= pos && subLength + xmlStr.indexOf('\r') >= pos) {
				break;
			}
			xmlStr = xmlStr.substring(index);
			subLength += index;
			closed = false;
			if (!isOver && subLength >= pos) {
				isOver = true;
			}
		}
		else {
			let isNote: boolean = false;
			if (xmlStr.substr(0, 4) === '<!--') {
				index = xmlStr.indexOf('-->', 4) + 2;
				isNote = true;
			}
			else if (xmlStr.substr(0, 9) === '<![CDATA[') {
				index = xmlStr.indexOf(']]>') + 2;
				isNote = true;
			}
			else {
				index = xmlStr.indexOf('>');
				if (index === -1) {
					break;
				}
			}
			nodeText = xmlStr.substring(0, index + 1);
			xmlStr = xmlStr.substring(index + 1);
			subLength += index + 1;
			closed = true;
			if (nodeText.charAt(1) === '?' || isNote) {
				continue;
			}
			nodeList.push(nodeText);
			if (isOver) {
				break;
			}
		}
	}
	if (nodeList.length === 0) {
		return [];
	}
	let node: string = nodeList[nodeList.length - 1];
	let type: number = getNodeType(node);
	if (!isIncludeIn(node, type, currentState, states)) {
		return [];
	}
	const path: number[] = [-1];
	if (type === 2) {
		path[0]++;
		nodeList.pop();
	}


	let openNum: number = 0;

	while (nodeList.length > 0) {
		node = nodeList.pop();
		type = getNodeType(node);
		if (!isIncludeIn(node, type, currentState, states)) {
			if (type === 2 && openNum > 0) {
				return [];
			}
			if (type === 1 && openNum === 0 || type === 2 && openNum === -1) {
				path[0]--;
			}
		}
		switch (type) {
			case 1:
				if (openNum === 0) {
					path[0]++;
				}
				break;
			case 2:
				openNum++;
				if (openNum === 0) {
					path[0]++;
				}
				else if (openNum > 0) {
					path.splice(0, 0, 0);
					openNum = 0;
				}
				break;
			case 3:
				openNum--;
				break;
		}
	}
	return path;
}

/**
 * 返回指定属性的值在xml节点文本中的索引范围
 * @param nodeText 节点文本
 * @param prop 属性名
 * @return 一个数组，[属性起始索引(包括),值起始索引(包括),值结束索引(不包括)]
 */
export function getValueIndex(nodeText: string, prop: string): number[] {
	const testStr1 = ' ' + prop + '=\"';
	const index1 = nodeText.indexOf(testStr1);
	const testStr2 = ' ' + prop + '=\'';
	const index2 = nodeText.indexOf(testStr2);
	if (index1 == -1 && index2 == -1) {
		return getValueIndexComplex(nodeText, prop);
	}
	let index = index1 != -1 ? index1 : index2;
	const testStr = index1 != -1 ? testStr1 : testStr2;
	let propStart: number = index;
	for (let i = propStart - 1; i >= 0; i--) {
		const char: string = nodeText.charAt(i);
		if (emptyStrs.indexOf(char) === -1) {
			break;
		}
		propStart--;
	}
	const valueStart: number = index + testStr.length;
	nodeText = nodeText.substring(valueStart);
	if (index1 != -1) {
		index = nodeText.indexOf('\"');
	} else {
		index = nodeText.indexOf('\'');
	}
	if (index === -1) {
		return null;
	}
	return [propStart, valueStart, valueStart + index];
}

var emptyStrs: string[] = ['\t', '\n', '\r', '\f'];
/**
 * 使用复杂查找模式获取值索引范围
 */
function getValueIndexComplex(nodeText: string, prop: string): number[] {
	for (var i = 0; i < emptyStrs.length; i++) {
		const str: string = emptyStrs[i];
		nodeText = nodeText.split(str).join(' ');
	}
	let testStr: string = ' ' + prop + '=';
	let index: number = nodeText.indexOf(testStr);
	let propStart: number = 0;
	if (index === -1) {
		testStr = ' ' + prop + ' ';
		index = nodeText.indexOf(testStr);
		if (index === -1) {
			return null;
		}
		propStart = index;
		const tail: string = nodeText.substring(index);
		var i: number = tail.indexOf('=');
		index += i;
	}
	else {
		propStart = index;
		index += testStr.length - 1;
	}
	for (i = propStart - 1; i >= 0; i--) {
		if (nodeText.charAt(i) !== '') {
			break;
		}
		propStart--;
	}
	const length: number = index + 1;
	nodeText = nodeText.substring(length);
	index = nodeText.indexOf('=');
	if (index !== -1) {
		nodeText = nodeText.substring(0, index);
	}
	const index1 = nodeText.indexOf('\"');
	const index2 = nodeText.indexOf('\'');
	index = index1 != -1 ? index1 : index2;
	const valueStart: number = length + index + 1;
	if (index1 != -1) {
		index = nodeText.lastIndexOf('\"');
	} else {
		index = nodeText.lastIndexOf('\'');
	}
	return [propStart, valueStart, length + index];
}
/**
 * 格式化xml字符串的缩进值
 * @param xmlStr 要格式话的字符串
 * @param startIndex 要格式化的起始索引
 * @param endIndex 要格式化的结束索引
 */
export function formatIndent(xmlStr: string, startIndex: number = 0, endIndex: number = Number.MAX_VALUE): string {
	let index: number;
	let subLength: number = 0;
	let closed: boolean = true;
	let nodeText: string = '';
	let indent: number = 0;
	let newStr: string = '';
	let containBreak: boolean = false;
	let indentList: number[] = [];
	while (xmlStr.length > 0) {
		if (closed) {
			index = xmlStr.indexOf('<');
			if (index === -1) {
				break;
			}
			subLength += index;
			if (subLength >= startIndex) {
				newStr += replaceIndent(xmlStr.substring(0, index), indent, true, true);
			} else {
				newStr += xmlStr.substring(0, index);
			}
			const lastChar: string = newStr.charAt(newStr.length - 1);
			containBreak = (lastChar === '\n' || lastChar === '\r');
			xmlStr = xmlStr.substring(index);
			closed = false;
		}
		else {
			let isNote: boolean = false;
			if (xmlStr.substr(0, 4) === '<!--') {
				index = xmlStr.indexOf('-->', 4) + 2;
				isNote = true;
			}
			else if (xmlStr.substr(0, 9) === '<![CDATA[') {
				index = xmlStr.indexOf(']]>') + 2;
				isNote = true;
			}
			else {
				index = xmlStr.indexOf('>');
			}
			nodeText = xmlStr.substring(0, index + 1);
			xmlStr = xmlStr.substring(index + 1);
			subLength += index + 1;
			closed = true;
			if (nodeText.charAt(1) === '?') {
				isNote = true;
			}
			const type: number = getNodeType(nodeText);

			if (subLength >= startIndex) {
				if (indentList) {
					if (indentList.length > 0) {
						index = indentList.pop();
						indent = getIndent(newStr, index) + 1;
					}
					indentList = null;
				}
				if (!isNote && type === 3) {
					indent--;
				}
				newStr += replaceIndent(nodeText, indent, !containBreak);
				if (!isNote && type === 2) {
					indent++;
				}
			}
			else {
				if (!isNote && type === 2) {
					indentList.push(subLength - nodeText.length);
				}
				if (!isNote && type === 3) {
					indentList.pop();
				}
				newStr += nodeText;
			}
		}
		if (subLength >= endIndex) {
			newStr += xmlStr;
			break;
		}
	}

	return newStr;
}
/**
 * 从字符串的指定索引处开始回退查找计算缩进值。返回缩进数量。
 * @param xmlStr 要查询的字符串
 * @param index 开始查找的索引(不包括)
 */
export function getIndent(xmlStr: string, index: number): number {
	let char: string;
	let emptyNum: number = 0;
	let indent: number = 0;
	index--;
	while (index >= 0) {
		char = xmlStr.charAt(index);
		if (char === '\t') {
			indent++;
		} else if (char === ' ') {
			emptyNum++;
		} else {
			break;
		}
		index--;
	}
	indent += Math.ceil(emptyNum * 0.5);
	return indent;
}
/**
 * 从字符串的指定索引处开始回退查找计算缩进值。返回缩进字符串
 * @param xmlStr 要查询的字符串
 * @param index 开始查找的索引(不包括)
 */
export function getIndentStr(xmlStr: string, index: number): string {
	let indent: number = getIndent(xmlStr, index);
	let indentStr: string = '';
	while (indent > 0) {
		indentStr += '\t';
		indent--;
	}
	return indentStr;
}

function replaceIndent(text: string, indent: number, skipFirst: boolean = false, skipLast: boolean = false): string {
	const lines: string[] = text.split('\r\n').join('\n').split('\r').join('\n').split('\n');
	const length: number = lines.length;
	let line: string;
	let indentStr: string = '';
	while (indent > 0) {
		indentStr += '\t';
		indent--;
	}
	for (let i: number = 0; i < length; i++) {
		if (i === 0 && skipFirst) {
			continue;
		}
		line = trimLeft(lines[i]);
		lines.splice(i, 1, indentStr + line);
	}
	if (length > 1 && skipLast) {
		line = lines.pop();
		lines.push(trimRight(line));
	}
	return lines.join('\n');
}

/**
 * 创建一个新的视图状态
 * @param xmlStr 要修改的XML文本
 * @param stateName 视图状态名称
 * @param copyFrom 要拷贝的视图状态,''表示'所有状态'，null表示空白状态。
 */
export function createNewState(xmlStr: string, states: string[], newState: string, copyFrom: string = null): string {
	if (copyFrom === null) {
		return createEmptyState(xmlStr, states, newState);
	}
	let index: number;
	let closed: boolean = true;
	let nodeText: string = '';
	let isNote: boolean;
	const isBisicState: boolean = !(copyFrom);
	let returnStr: string = '';
	while (xmlStr.length > 0) {
		if (closed) {
			index = xmlStr.indexOf('<');
			if (index === -1) {
				break;
			}
			returnStr += xmlStr.substring(0, index);
			xmlStr = xmlStr.substring(index);
			closed = false;
		}
		else {
			isNote = false;
			if (xmlStr.substr(0, 4) === '<!--') {
				index = xmlStr.indexOf('-->', 4) + 2;
				isNote = true;
			}
			else if (xmlStr.substr(0, 9) === '<![CDATA[') {
				index = xmlStr.indexOf(']]>') + 2;
				isNote = true;
			}
			else {
				index = xmlStr.indexOf('>');
			}
			nodeText = xmlStr.substring(0, index + 1);

			xmlStr = xmlStr.substring(index + 1);
			closed = true;
			if (nodeText.charAt(1) === '?' || isNote) {
				returnStr += nodeText;
				continue;
			}
			if (nodeText.indexOf('<w:Declarations') !== -1) {
				returnStr += nodeText;
				index = xmlStr.indexOf('</w:Declarations');
				if (index !== -1) {
					returnStr += xmlStr.substring(0, index + 17);
					xmlStr = xmlStr.substring(index + 17);
				}
				continue;
			}
			const type: number = getNodeType(nodeText);
			if (type === 3) {
				returnStr += nodeText;
				continue;
			}
			var valueRange: number[];
			var stateNames: string[];
			if (isBisicState) {
				valueRange = getValueIndex(nodeText, 'excludeFrom');
				if (valueRange) {
					stateNames = nodeText.substring(valueRange[1], valueRange[2]).split(',');
					if (stateNames.indexOf(newState) === -1) {
						stateNames.push(newState);
						nodeText = nodeText.substring(0, valueRange[1]) + stateNames.join(',') + nodeText.substring(valueRange[2]);
					}
				}
			}
			else {
				valueRange = getValueIndex(nodeText, 'excludeFrom');
				if (valueRange) {
					stateNames = nodeText.substring(valueRange[1], valueRange[2]).split(',');
					if (stateNames.indexOf(newState) === -1 && stateNames.indexOf(copyFrom) !== -1) {
						stateNames.push(newState);
						nodeText = nodeText.substring(0, valueRange[1]) + stateNames.join(',') + nodeText.substring(valueRange[2]);
					}
				}
				valueRange = getValueIndex(nodeText, 'includeIn');
				if (valueRange) {
					stateNames = nodeText.substring(valueRange[1], valueRange[2]).split(',');
					if (stateNames.indexOf(newState) === -1 && stateNames.indexOf(copyFrom) !== -1) {
						stateNames.push(newState);
						nodeText = nodeText.substring(0, valueRange[1]) + stateNames.join(',') + nodeText.substring(valueRange[2]);
					}
				}
				let str: string = nodeText.split('\t').join(' ');
				str = str.split('\r').join(' ');
				str = str.split('\n').join(' ');
				if (type === 1) {
					str = str.substring(0, str.length - 2) + ' />';
				} else {
					str = str.substring(0, str.length - 1) + ' >';
				}
				const props: string[] = str.split(' ');
				const oldKey: string = '.' + copyFrom;
				const newKey: string = '.' + newState;
				const newProps: string[] = [];
				var k: number;
				for (let i = 0; i < props.length; i++) {
					const prop = props[i];
					index = prop.indexOf('=');
					if (index === -1) {
						continue;
					}
					k = prop.indexOf(oldKey);
					const tmpProp = prop.substring(0, index).trim();
					let keyCross = false;
					if (tmpProp && tmpProp.length - oldKey.length > 0 && tmpProp.substr(tmpProp.length - oldKey.length) === oldKey) {
						keyCross = true;
					}
					if (keyCross && k !== -1 && k < index) {
						newProps.push(prop.replace(oldKey, newKey));
					}
				}
				if (newProps.length > 0) {
					if (type === 1) {
						nodeText = nodeText.substring(0, nodeText.length - 2) + ' ' + newProps.join(' ') + '/>';
					}
					else {
						nodeText = nodeText.substring(0, nodeText.length - 1) + ' ' + newProps.join(' ') + '>';
					}
				}
			}
			returnStr += nodeText;
		}
	}

	return addStateToDefine(returnStr, newState);
}
/**
 * 创建空白的状态
 */
function createEmptyState(xmlStr: string, states: string[], newState: string): string {
	let returnStr: string = '';
	let index: number;
	//节点闭合标志，
	//举个例子：<s:Group id='d'/> 遇到'<'时值为false，遇到'>'值为true,此时完成一个完整节点的搜索
	let closed: boolean = true; let nodeText: string = '';
	let depth: number = 0;
	//xml节点过滤式操作，滤过的节点合并到returnStr
	while (xmlStr.length > 0) {
		if (closed) {
			index = xmlStr.indexOf('<');
			if (index === -1) {
				break;
			}
			returnStr += xmlStr.substring(0, index);
			xmlStr = xmlStr.substring(index);
			closed = false;
		}
		else {
			let isNote: boolean = false;
			if (xmlStr.substr(0, 4) === '<!--') {
				index = xmlStr.indexOf('-->', 4) + 2;
				isNote = true;
			}
			else if (xmlStr.substr(0, 9) === '<![CDATA[') {
				index = xmlStr.indexOf(']]>') + 2;
				isNote = true;
			}
			else {
				index = xmlStr.indexOf('>');
			}
			nodeText = xmlStr.substring(0, index + 1);
			xmlStr = xmlStr.substring(index + 1);
			closed = true;
			if (nodeText.charAt(1) === '?' || isNote) {
				returnStr += nodeText;
				continue;
			}
			const type: number = getNodeType(nodeText);
			index = nodeText.indexOf(':');
			const ns: string = nodeText.substring(1, index);
			if (depth === 1 && (type === 1 || type === 2) && ns !== 'w') {
				index = nodeText.indexOf(':');
				if (index !== -1) {
					const char: string = nodeText.charAt(index + 1);
					if (char >= 'A' && char <= 'Z') {
						if (nodeText.indexOf('<s:Array') !== -1) {
							depth = 0;
						}
						else if (nodeText.indexOf('includeIn') === -1) {
							//检查排除列表，如果有，则将新状态加入到排除列表
							const valueRange: number[] = getValueIndex(nodeText, 'excludeFrom');
							if (valueRange) {
								const stateNames: string[] = nodeText.substring(valueRange[1], valueRange[2]).split(',');
								if (stateNames.indexOf(newState) === -1) {
									stateNames.push(newState);
									nodeText = nodeText.substring(0, valueRange[1]) + stateNames.join(',') + nodeText.substring(valueRange[2]);
								}
							}
							//如果没有排除列表且存在其他状态，则将该节点限定在所有其他状态中（加入到includein中）
							else if (states && states.length > 0) {
								if (type === 1) {
									nodeText = nodeText.substring(0, nodeText.length - 2) + ' includeIn=\"' + states.join(',') + '\"/>';
								} else {
									nodeText = nodeText.substring(0, nodeText.length - 1) + ' includeIn=\"' + states.join(',') + '\">';
								}
							}
						}
					}
					else if (nodeText.indexOf(':elementsContent') !== -1) {
						depth = 0;
					}
				}

			}
			switch (type) {
				case 2:
					depth++;
					break;
				case 3:
					depth--;
					break;
			}
			returnStr += nodeText;
			if (depth === 0) {
				returnStr += xmlStr;
				break;
			}
		}
	}
	return addStateToDefine(returnStr, newState);
}
/**
 * 移除一个视图状态
 * @param xmlStr xml文本
 * @param stateName 要移除的状态名称
 */
export function removeState(xmlStr: string, stateName: string, states: string[]): string {
	let index: number;
	let closed: boolean = true;
	let nodeText: string = '';
	let isNote: boolean;
	let returnStr: string = '';
	let stateRemoved: boolean = false;
	let delNext: number = 0;
	while (xmlStr.length > 0) {
		if (closed) {
			index = xmlStr.indexOf('<');
			if (index === -1) {
				break;
			}
			returnStr += xmlStr.substring(0, index);
			xmlStr = xmlStr.substring(index);
			closed = false;
		}
		else {
			isNote = false;
			if (xmlStr.substr(0, 4) === '<!--') {
				index = xmlStr.indexOf('-->', 4) + 2;
				isNote = true;
			}
			else if (xmlStr.substr(0, 9) === '<![CDATA[') {
				index = xmlStr.indexOf(']]>') + 2;
				isNote = true;
			}
			else {
				index = xmlStr.indexOf('>');
			}
			nodeText = xmlStr.substring(0, index + 1);

			xmlStr = xmlStr.substring(index + 1);
			closed = true;
			if (nodeText.charAt(1) === '?' || isNote) {
				returnStr += nodeText;
				continue;
			}
			if (nodeText.indexOf('<w:Declarations') !== -1) {
				returnStr += nodeText;
				index = xmlStr.indexOf('</w:Declarations');
				if (index !== -1) {
					returnStr += xmlStr.substring(0, index + 17);
					xmlStr = xmlStr.substring(index + 17);
				}
				continue;
			}
			if (delNext > 0) {
				delNext--;
				returnStr = trimRight(returnStr);
				continue;
			}
			const type: number = getNodeType(nodeText);
			if (type === 3) {
				returnStr += nodeText;
				continue;
			}
			if (!stateRemoved && nodeText.indexOf(':states') !== -1) {
				if (states.length === 1) {
					returnStr = trimRight(returnStr);
					continue;
				}
			}
			var valueRange: number[];
			if (!stateRemoved && nodeText.indexOf('<s:State') !== -1) {
				valueRange = getValueIndex(nodeText, 'name');
				if (valueRange) {
					if (nodeText.substring(valueRange[1], valueRange[2]) === stateName) {
						stateRemoved = true;
						returnStr = trimRight(returnStr);
						if (type === 2) {
							delNext = 1;
						}
						if (states.length === 1) {
							delNext++;
						}
						continue;
					}
				}
			}
			var stateNames: string[];
			valueRange = getValueIndex(nodeText, 'excludeFrom');
			if (valueRange) {
				const exStates: string[] = nodeText.substring(valueRange[1], valueRange[2]).split(',');
				index = exStates.indexOf(stateName);
				if (index !== -1) {
					if (exStates.length > 1) {
						exStates.splice(index, 1);
						nodeText = nodeText.substring(0, valueRange[1]) + exStates.join(',') + nodeText.substring(valueRange[2]);
					}
					else {
						nodeText = trimRight(nodeText.substring(0, valueRange[0])) + nodeText.substring(valueRange[2] + 1);
					}
				}
				else {
					stateNames = [];
					for (var i = 0; i < states.length; i++) {
						const s: string = states[i];
						if (exStates.indexOf(s) === -1) {
							stateNames.push(s);
						}
					}
					if (stateNames.length === 1) {
						returnStr = trimRight(returnStr);
						if (type === 2) {
							delNext = 1;
						}
						continue;
					}
				}
			}
			valueRange = getValueIndex(nodeText, 'includeIn');
			if (valueRange) {
				stateNames = nodeText.substring(valueRange[1], valueRange[2]).split(',');
				index = stateNames.indexOf(stateName);
				if (index !== -1) {
					if (stateNames.length > 1) {
						stateNames.splice(index, 1);
						nodeText = nodeText.substring(0, valueRange[1]) + stateNames.join(',') + nodeText.substring(valueRange[2]);
					}
					else {
						returnStr = trimRight(returnStr);
						if (type === 2) {
							delNext = 1;
						}
						continue;
					}
				}
			}
			let str: string = nodeText.split('\t').join(' ');
			str = str.split('\r').join(' ');
			str = str.split('\n').join(' ');
			var tail: string;
			if (type === 1) {
				tail = '/>';
				str = str.substring(0, str.length - 2);
			}
			else {
				tail = '>';
				str = str.substring(0, str.length - 1);
			}
			const props: string[] = str.split(' ');
			const oldKey: string = '.' + stateName;
			let change: boolean = false;
			var k: number;
			for (var i: number = props.length - 1; i > 0; i--) {
				const prop: string = props[i];
				index = prop.indexOf('=');
				if (index === -1) {
					continue;
				}
				k = prop.indexOf(oldKey);
				if (k !== -1 && k < index) {
					props.splice(i, 1);
					change = true;
				}
			}
			if (change) {
				nodeText = props.join(' ') + tail;
			}

			returnStr += nodeText;
		}
	}
	return removeStateFromeDefine(returnStr, stateName);
}
/**
 * 重命名状态
 * @param xmlStr xml字符串
 * @param oldName 要修改的状态名
 * @param newName 新的状态名
 */
export function changeStateName(xmlStr: string, oldName: string, newName: string): string {
	let index: number;
	let closed: boolean = true;
	let nodeText: string = '';
	let isNote: boolean;
	let returnStr: string = '';
	let stateChanged: boolean = false;
	while (xmlStr.length > 0) {
		if (closed) {
			index = xmlStr.indexOf('<');
			if (index === -1) {
				break;
			}
			returnStr += xmlStr.substring(0, index);
			xmlStr = xmlStr.substring(index);
			closed = false;
		}
		else {
			isNote = false;
			if (xmlStr.substr(0, 4) === '<!--') {
				index = xmlStr.indexOf('-->', 4) + 2;
				isNote = true;
			}
			else if (xmlStr.substr(0, 9) === '<![CDATA[') {
				index = xmlStr.indexOf(']]>') + 2;
				isNote = true;
			}
			else {
				index = xmlStr.indexOf('>');
			}
			nodeText = xmlStr.substring(0, index + 1);

			xmlStr = xmlStr.substring(index + 1);
			closed = true;
			if (nodeText.charAt(1) === '?' || isNote) {
				returnStr += nodeText;
				continue;
			}
			if (nodeText.indexOf('<w:Declarations') !== -1) {
				returnStr += nodeText;
				index = xmlStr.indexOf('</w:Declarations');
				if (index !== -1) {
					returnStr += xmlStr.substring(0, index + 17);
					xmlStr = xmlStr.substring(index + 17);
				}
				continue;
			}
			const type: number = getNodeType(nodeText);
			if (type === 3) {
				returnStr += nodeText;
				continue;
			}
			var valueRange: number[];
			var stateNames: string[];
			if (!stateChanged && nodeText.indexOf('<s:State') !== -1) {
				valueRange = getValueIndex(nodeText, 'name');
				if (valueRange) {
					if (nodeText.substring(valueRange[1], valueRange[2]) === oldName) {
						stateChanged = true;
						returnStr += nodeText.substring(0, valueRange[1]) + newName + nodeText.substring(valueRange[2]);
						continue;
					}
				}
			}
			if (nodeText.indexOf('currentState') !== -1) {
				valueRange = getValueIndex(nodeText, 'currentState');
				if (valueRange) {
					if (nodeText.substring(valueRange[1], valueRange[2]) === oldName) {
						nodeText = nodeText.substring(0, valueRange[1]) + newName + nodeText.substring(valueRange[2]);
					}
				}
			}
			if (nodeText.indexOf('includeIn') !== -1) {
				valueRange = getValueIndex(nodeText, 'includeIn');
				if (valueRange) {
					stateNames = nodeText.substring(valueRange[1], valueRange[2]).split(',');
					index = stateNames.indexOf(oldName);
					if (index !== -1) {
						stateNames.splice(index, 1, newName);
						nodeText = nodeText.substring(0, valueRange[1]) + stateNames.join(',') + nodeText.substring(valueRange[2]);
					}
				}
			}
			if (nodeText.indexOf('excludeFrom') !== -1) {
				valueRange = getValueIndex(nodeText, 'excludeFrom');
				if (valueRange) {
					stateNames = nodeText.substring(valueRange[1], valueRange[2]).split(',');
					index = stateNames.indexOf(oldName);
					if (index !== -1) {
						stateNames.splice(index, 1, newName);
						nodeText = nodeText.substring(0, valueRange[1]) + stateNames.join(',') + nodeText.substring(valueRange[2]);
					}
				}
			}
			let str: string = nodeText.split('\t').join(' ');
			str = str.split('\r').join(' ');
			str = str.split('\n').join(' ');
			if (type === 1) {
				str = str.substring(0, str.length - 2);
			} else {
				str = str.substring(0, str.length - 1);
			}
			const props: string[] = str.split(' ');
			const oldKey: string = '.' + oldName;
			const newKey: string = '.' + newName;
			var k: number;
			let found: boolean = false;
			for (let i: number = props.length - 1; i > 0; i--) {
				const prop: string = props[i];
				index = prop.indexOf('=');
				if (index === -1) {
					continue;
				}
				k = prop.indexOf(oldKey);
				if (k !== -1 && k < index) {
					found = true;
					props.splice(i, 1, prop.replace(oldKey, newKey));
				}
			}
			if (found) {
				if (type === 1) {
					nodeText = props.join(' ') + '/>';
				}
				else {
					nodeText = props.join(' ') + '>';
				}
			}
			returnStr += nodeText;
		}
	}
	return updateStateFromeDefine(returnStr, oldName, newName);
}
/**
 * 添加到状态声明位置,lark项目的状态声明位置在根节点上面states属性
 */
function addStateToDefine(xmlStr: string, stateName: string): string {
	const result: Object = getOneNode(xmlStr);
	if (!result['n']) {
		return xmlStr;
	}
	let node: string = result['n'].toString();
	const range: number[] = getValueIndex(node, 'states');
	if (!range) {
		const type: number = getNodeType(node);
		if (type === 3) {
			return xmlStr;
		}
		if (type === 1) {
			node = node.substring(0, node.length - 2) + ' states="' + stateName + '" />';
		}
		if (type === 2) {
			node = node.substring(0, node.length - 1) + ' states="' + stateName + '" >';
		}
	}
	else {
		let value: string = node.substring(range[1], range[2]);
		value += (',' + stateName);
		node = node.substring(0, range[1]) + value + node.substring(range[2]);
	}
	return result['f'] + node + result['b'];
}
/**
 *从状态声明位置移除状态 ,lark项目的状态声明位置在根节点上面states属性
 */
function removeStateFromeDefine(xmlStr: string, state: string): string {
	const result: Object = getOneNode(xmlStr);
	if (!result['n']) {
		return xmlStr;
	}
	let node: string = result['n'].toString();
	const range: number[] = getValueIndex(node, 'states');
	if (range) {
		let value: string = node.substring(range[1], range[2]);
		const states: string[] = value.split(',');
		const index: number = states.indexOf(state);
		if (index === -1) {
			return xmlStr;
		} else {
			states.splice(index, 1);
			if (states.length === 0) {
				node = node.substring(0, range[0]) + node.substring(range[2] + 1);
			} else {
				value = states.join(',');
				node = node.substring(0, range[1]) + value + node.substring(range[2]);
			}
		}
	} else {
		return xmlStr;
	}
	return result['f'] + node + result['b'];
}
/**
 *从状态声明位置更新状态 ,lark项目的状态声明位置在根节点上面states属性
 */
function updateStateFromeDefine(xmlStr: string, oldState: string, newState: string): string {
	const result: Object = getOneNode(xmlStr);
	if (!result['n']) {
		return xmlStr;
	}
	let node: string = result['n'].toString();
	const range: number[] = getValueIndex(node, 'states');
	if (range) {
		let value: string = node.substring(range[1], range[2]);
		const states: string[] = value.split(',');
		const index: number = states.indexOf(oldState);
		if (index === -1) {
			return xmlStr;
		} else {
			states[index] = newState;
			value = states.join(',');
			node = node.substring(0, range[1]) + value + node.substring(range[2]);
		}
	} else {
		return xmlStr;
	}
	return result['f'] + node + result['b'];
}

/**
 * 获取字符串中第一个常规节点 ,返回{f:*,n:*,b:*} f:被截断的前部分字符串，n：发现的节点字符串,b:节点后面的字符串
 * @param xmlStr xml字符文本
 * @return 查找结果
 */
function getOneNode(xmlStr: string): Object {
	let cutFStr: string = '';//前面被裁减的文本
	let nodeText: string;//发现的节点文本
	let cutBStr: string = '';//节点后面的文本
	let closed: boolean = true;

	let index: number = 0;
	while (xmlStr.length > 0) {
		if (closed) {
			index = xmlStr.indexOf('<');
			if (index === -1) {
				break;
			}
			cutFStr += xmlStr.substring(0, index);
			xmlStr = xmlStr.substring(index);
			closed = false;
		}
		else {
			if (xmlStr.substr(0, 4) === '<!--') {
				index = xmlStr.indexOf('-->', 4) + 2;
				cutFStr += xmlStr.substring(0, index + 1);
				xmlStr = xmlStr.substring(index + 1);
				closed = true;
				continue;
			}
			if (xmlStr.substr(0, 2) === '<?') {
				index = xmlStr.indexOf('?>') + 1;
				cutFStr += xmlStr.substring(0, index + 1);
				xmlStr = xmlStr.substring(index + 1);
				closed = true;
				continue;
			}
			if (xmlStr.substr(0, 9) === '<![CDATA[') {
				index = xmlStr.indexOf(']]>') + 2;
				cutFStr += xmlStr.substring(0, index + 1);
				xmlStr = xmlStr.substring(index + 1);
				closed = true;
				continue;
			}
			index = xmlStr.indexOf('>');
			nodeText = xmlStr.substring(0, index + 1);
			cutBStr = xmlStr.substring(index + 1);
			break;
		}
	}
	return { f: cutFStr, n: nodeText, b: cutBStr };
}