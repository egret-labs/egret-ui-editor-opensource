import * as sax from './sax';
import * as objects from 'egret/base/common/objects';
import { Namespace } from './Namespace';
import { trim } from 'egret/base/common/strings';

/**
 * 得到命名空间列表
 * @param xml 
 */
export function namespaceDeclarations(xml: sax.Tag): Namespace[] {
	const retArr: Namespace[] = [];
	const space: Namespace = new Namespace(xml.prefix, xml.namespace);
	retArr.push(space);
	return retArr;
}

const cachekeys = [];
const cacheMap = {};
function getCache(xmlStr: string): any {
	if (cacheMap[xmlStr]) {
		return deepClone(cacheMap[xmlStr]);
	}
	return null;
}

function setCache(xmlStr: string, tag: any): void {
	if (cacheMap[xmlStr]) {
		cacheMap[xmlStr] = deepClone(tag);
		return;
	}
	if (cachekeys.length >= 40) {
		const key = cachekeys.shift();
		delete cacheMap[key];
	}
	cachekeys.push(xmlStr);
	cacheMap[xmlStr] = deepClone(tag);
}

function deepClone(target: any): any {
	removeParent(target);
	const newtarget = objects.deepClone(target);
	addParent(target, null);
	addParent(newtarget, null);
	return newtarget;
}

function removeParent(target: any): void {
	if (target.parent) {
		delete target.parent;
	}
	if (target['attributeNodes']) {
		for (var i = 0; i < target['attributeNodes'].length; i++) {
			removeParent(target['attributeNodes'][i]);
		}
	}
	if (target['children']) {
		for (var i = 0; i < target['children'].length; i++) {
			removeParent(target['children'][i]);
		}
	}
}

function addParent(target: any, parent: any): void {
	if (parent) {
		target['parent'] = parent;
	}
	if (target['attributeNodes']) {
		for (var i = 0; i < target['attributeNodes'].length; i++) {
			addParent(target['attributeNodes'][i], target);
		}
	}
	if (target['children']) {
		for (var i = 0; i < target['children'].length; i++) {
			addParent(target['children'][i], target);
		}
	}
}
/**
 * 解析字符串为xml节点
 * @param xmlString xml字符串
 * @param throwError 是否抛出异常
 * @param messageWithPos 错误是否包含位置信息
 */
export function parse(xmlString, throwError = true, messageWithPos = true): sax.Tag {
	let strict = true; // set to false for html-mode
	let saxparser = sax.parser(strict, { position: true, messagePos: messageWithPos });
	let object: sax.Tag = null;
	let namespaces = {};
	let errors: sax.Error[] = [];
	let attribNodes: sax.Attribute[] = [];
	let comments: sax.Comment[] = [];
	let processingInstructions: sax.ProcessingInstruction[] = [];
	let roots: sax.Tag[] = [];

	saxparser.resume();
	saxparser.onerror = function (err) {
		let error: sax.Error = {
			start: saxparser.startAttribPosition || saxparser.startTagPosition,
			end: saxparser.position,
			line: saxparser.line,
			column: saxparser.column,
			name: err.message,
			message: err.message
		};
		errors.push(error);
	};
	saxparser.onopentag = function (node: sax.Tag) {
		let attribs = node.attributes;
		node.nodeType = sax.Type.Tag;
		node.attributeNodes = attribNodes.filter(a => a.start > saxparser.startTagPosition);
		node.attributeNodes.forEach(a => a.parent = node);
		node.start = saxparser.startTagPosition - 1;
		node.line = saxparser.line;
		node.column = saxparser.column;
		node.children = [];
		node.startTagEnd = saxparser.position + 1;

		for (let key in attribs) {
			let idx = key.indexOf('xmlns:');
			if (idx === 0) {
				let prefix: string = key.substring(6);
				let uri = attribs[key];
				namespaces[prefix] = uri;
			}
		}
		node.toString = function () { return this.text; };
		let name = node.name;
		let index = name.indexOf(':');
		if (index === -1) {
			node.namespace = '';
			node.prefix = '';
			node.localName = name;
		} else {
			let prefix: string = name.substring(0, index);
			node.prefix = prefix;
			node.namespace = namespaces[prefix];
			node.localName = name.substring(index + 1);
		}
		if (object) {
			let children = object.children;
			if (!children) {
				children = object.children = [];
				if (object.text) {
					object.text = '';
				}
			}
			children.push(node);
			node.parent = object;
			object = node;
		} else {
			roots.push(node);
			object = node;
		}
	};

	saxparser.onattribute = function (attr) {
		let attrNode: sax.Attribute = {
			start: saxparser.startAttribPosition - 1,
			end: saxparser.position,
			name: attr.name,
			value: attr.value,
			nodeType: sax.Type.Attribute
		};

		if (!attr.closed) { attrNode.end--; }
		attribNodes.push(attrNode);
	};

	saxparser.oncomment = function (comment) {
		let CommentNode: sax.Comment = {
			start: saxparser.startCommentPosition - 1,
			end: saxparser.position + 1,
			name: comment,
			nodeType: sax.Type.Comment
		};
		comments.push(CommentNode);
	};

	saxparser.onprocessinginstruction = function (procInst) {
		let processingInstruction: sax.ProcessingInstruction = {
			start: saxparser.startProcInstPosition - 1,
			end: saxparser.position + 1,
			name: procInst.name,
			body: procInst.body,
			nodeType: sax.Type.ProcessingInstruction
		};
		processingInstructions.push(processingInstruction);
	};

	saxparser.onclosetag = function (node) {
		if (object.isSelfClosing) {
			object.endTagStart = object.startTagEnd;
		} else {
			object.endTagStart = saxparser.endTagStart;
		}
		object = object.parent;
	};

	saxparser.oncdata = function (cdata) {
		if (!object) { return; }
		object.text = (object.text || '') + cdata;

		const textNode = {
			start: saxparser.startCDataPosition,
			end: saxparser.startCDataPosition + cdata.length + 12,
			name: cdata,
			nodeType: sax.Type.CData,
		};

		object.textNodes = object.textNodes || [];
		object.textNodes.push(textNode);
	};

	saxparser.ontext = function (text) {
		if (!object || !text) { return; }
		// 移除空行
		const currentText = text.trim();
		object.text = (object.text || '') + currentText;

		const textNode = {
			start: saxparser.startTextPosition,
			end: saxparser.startTextPosition + currentText.length,
			name: currentText,
			nodeType: sax.Type.Text,
		};
		object.textNodes = object.textNodes || [];
		object.textNodes.push(textNode);
	};
	if (throwError) {
		saxparser.write(xmlString).close();
	} else {
		try {
			saxparser.write(xmlString).end();
		} catch (e) {
			console.log(e);
		} // 如果解析中异常了, 尽可能保留已解析的结果
	}

	if (!object) {
		object = {
			attributes: {},
			name: '',
			start: -1,
			end: -1,
			startTagEnd: -1,
			endTagStart: -1,
			isSelfClosing: false,
			attributeNodes: [],
			text: '',
			namespace: '',
			localName: '',
			error: null,
			errors: []
		};
	}
	// 避免 xml 有节点没正常闭合导致 object 无法在 onclosetag 事件中回到根节点
	if (roots.length < 1) { return; }
	object = roots[0];

	object.comments = comments;
	object.errors = errors;
	object.processingInstructions = processingInstructions;
	object.roots = roots;
	return object;
}

/**
 * 得到指定位置的节点
 * @param node 
 * @param position 
 */
export function getNodeAtPosition(node: sax.Tag, position: number): sax.Node {
	if (!node) {
		return null;
	}
	if (position < node.start || position > node.end) {
		return null;
	}
	if (node.nodeType !== sax.Type.Tag) {
		return node;
	}

	for (var index = 0; index < node.children.length; index++) {
		const element = node.children[index];
		if (index === 0 && element.start > position) {
			break;
		}
		const target = getNodeAtPosition(element, position);
		if (target) {
			return target;
		}
	}

	for (var index = 0; index < node.attributeNodes.length; index++) {
		const attr = node.attributeNodes[index];
		if (attr.start <= position && attr.end >= position) {
			return attr;
		}
	}
	return node;
}


/**
 * xml节点序列化类。将节点序列化为字符转。
 * @param xml 
 */
export function stringify(xml: sax.Tag): string {
	return $stringify(xml);
}
/**
 * 将一个xml节点序列化为xml字符串
 */
function $stringify(xml: sax.Tag, indent: number = 0): string {
	let str: string = '';
	for (var i = 0; i < indent; i++) {
		str += '\t';
	}
	str += '<';
	str += xml.name;

	//判断如果序列化的并不是很节点，则需要将原有根节点中的命名空间添加到当前节点的根节点中
	if (indent === 0) {
		//查找根节点
		let root = xml;
		while (true) {
			const parent = root.parent;
			if (parent) {
				root = parent;
			} else {
				break;
			}
		}
		//如果传入的节点就是根节点，则证明其内部肯定有xmlns,直接序列化就好
		if (root === xml) {
			for (var i = 0; i < xml.attributeNodes.length; i++) {
				//根节点的命名空间
				if (xml.attributeNodes[i].name.toLocaleLowerCase().indexOf('xmlns:') === 0) {
					str += ' xmlns:' + xml.attributeNodes[i].name.slice(6) + '=' + '\"' + escape(xml.attributeNodes[i].value) + '\"';
					//根节点的属性
				} else {
					str += ' ' + xml.attributeNodes[i].name + '=' + '\"' + escape(xml.attributeNodes[i].value) + '\"';
				}
			}
		} else { //否则需要将根节点的xmlns添加到序列化进来
			//先序列化当前节点的属性
			for (var i = 0; i < xml.attributeNodes.length; i++) {
				str += ' ' + xml.attributeNodes[i].name + '=' + '\"' + escape(xml.attributeNodes[i].value) + '\"';
			}
			//在序列化根节点的命名空间
			for (var i = 0; i < root.attributeNodes.length; i++) {
				if (root.attributeNodes[i].name.toLocaleLowerCase().indexOf('xmlns:') === 0) {
					str += ' xmlns:' + root.attributeNodes[i].name.slice(6) + '=' + '\"' + escape(root.attributeNodes[i].value) + '\"';
				}
			}
		}
	} else {
		for (var i = 0; i < xml.attributeNodes.length; i++) {
			str += ' ' + xml.attributeNodes[i].name + '=' + '\"' + escape(xml.attributeNodes[i].value) + '\"';
		}
	}
	if (xml.children.length === 0 && !xml.text) {
		str += ' />';
	} else if (xml.text && xml.children.length === 0) {
		str += '>' + escape(xml.text) + '</' + xml.name + '>';
	} else if (xml.children.length !== 0 && !xml.text) {
		str += '>' + '\n';
		for (var i = 0; i < xml.children.length; i++) {
			str += $stringify(xml.children[i], indent + 1) + '\n';
		}
		for (var i = 0; i < indent; i++) {
			str += '\t';
		}
		str += '</' + xml.name + '>';
	} else {
		str += '>' + '\n';
		for (var i = 0; i < indent + 1; i++) {
			str += '\t';
		}
		str += xml.text + '\n';
		for (var i = 0; i < xml.children.length; i++) {
			str += $stringify(xml.children[i], indent + 1) + '\n';
		}
		for (var i = 0; i < indent; i++) {
			str += '\t';
		}
		str += '</' + xml.name + '>';
	}
	return str;
}

function escape(str: string): string {
	let currentStr: string = '';
	while (str.length > 0) {
		let index1 = str.indexOf('<');
		if (index1 === -1) { index1 = str.length; }
		let index2 = str.indexOf('&');
		if (index2 === -1) { index2 = str.length; }
		let index3 = str.indexOf('\"');
		if (index3 === -1) { index3 = str.length; }
		const index = Math.min(index1, index2, index3);
		currentStr += str.slice(0, index);
		str = str.slice(index);
		if (!str) { break; }
		if (str.charAt(0) === '&') {
			if (str.indexOf('&quot;') === 0) //'
			{
				currentStr += '&quot;';
				str = str.slice(6);
			} else if (str.indexOf('&amp;') === 0)//&
			{
				currentStr += '&amp;';
				str = str.slice(5);
			} else if (str.indexOf('&lt;') === 0)//<
			{
				currentStr += '&lt;';
				str = str.slice(4);
			} else if (str.indexOf('&gt;') === 0)//>
			{
				currentStr += '>';
				str = str.slice(4);
			} else if (str.indexOf('&nbsp;') === 0) { //non-breaking space
				currentStr += String.fromCharCode(65440);
				str = str.slice(6);
			} else {
				currentStr += '&amp;';
				str = str.slice(1);
			}
		} else if (str.charAt(0) === '<') {
			currentStr += '&lt;';
			str = str.slice(1);
		} else if (str.charAt(0) === '\"') {
			currentStr += '&quot;';
			str = str.slice(1);
		}
	}
	return currentStr;
}


/**
 * 设置节点属性
 * @param node 
 * @param name 
 */
export function deleteAttribute(node: sax.Tag, name: string): void {
	if (node.attributes.hasOwnProperty(name)) {
		for (let i = 0; i < node.attributeNodes.length; i++) {
			if (node.attributeNodes[i].name === name) {
				node.attributeNodes.splice(i, 1);
				break;
			}
		}
	}
	delete node.attributes[name];
}

/**
 * 设置节点属性
 * @param node 
 * @param name 
 * @param value 
 */
export function setAttribute(node: sax.Tag, name: string, value: string): void {
	if (node.attributes.hasOwnProperty(name)) {
		for (let i = 0; i < node.attributeNodes.length; i++) {
			if (node.attributeNodes[i].name === name) {
				node.attributeNodes[i].value = value;
				break;
			}
		}
	} else {
		const atttribute: sax.Attribute = {
			name: name,
			start: 0,
			end: 0,
			value: value
		};
		node.attributeNodes.push(atttribute);
	}
	node.attributes[name] = value;
}
/**
 * 添加节点子项
 * @param node 
 * @param child 
 * @param throwError 
 */
export function appendChild(node: sax.Tag, child: sax.Tag, throwError: boolean = true): void {
	const atts: sax.Attribute[] = [];
	//先复制一个
	var child = parse(stringify(child), throwError);
	for (let i = 0; i < child.attributeNodes.length; i++) {
		if (child.attributeNodes[i].name.indexOf('xmlns:') === 0) {
			const nsName: string = child.attributeNodes[i].name;
			//要添加进的节点开始向上递归寻找有没有定义这个命名空间
			let hasNs: boolean = false;
			let parentNode: sax.Tag = node;
			while (parentNode) {
				if (parentNode.attributes.hasOwnProperty(nsName)) {
					hasNs = true;
					break;
				}
				parentNode = parentNode.parent;
			}
			//如果要被添加的节点以及父级等用也存在这个命名空间，则删除被添加的命名空间
			if (hasNs) {
				delete child.attributes[child.attributeNodes[i].name];
			} else {
				atts.push(child.attributeNodes[i]);
			}
		} else {
			atts.push(child.attributeNodes[i]);
		}
	}
	child.attributeNodes = atts;
	node.children.push(child);
	child.parent = node;
}

/**
 * 得到所有子项
 * @param node 要查找的节点
 * @param localName 相当于QName的本地名
 * @param uri 相当于QName的uri
 */
export function child(node: sax.Tag, localName: string, uri: string = ''): sax.Tag[] {
	const result: sax.Tag[] = [];
	for (let i = 0; i < node.children.length; i++) {
		if (node.children[i].localName === localName) {
			if (!uri) {
				if (!node.children[i].namespace) {
					result.push(node.children[i]);
				}
			} else {
				if (node.children[i].namespace === uri) {
					result.push(node.children[i]);
				}
			}
		}
	}
	return result;
}
/**
 * 根据该 XML 对象的父项列出其命名空间。
 * @param node 
 */
export function inScopeNamespaces(node: sax.Tag): Namespace[] {
	const inScopeNamespaces: Namespace[] = [];
	for (let i: number = 0; i < node.attributeNodes.length; i++) {
		if (node.attributeNodes[i].name && node.attributeNodes[i].name.indexOf('xmlns') === 0) {
			if (node.attributeNodes[i].name === 'xmlns') {
				inScopeNamespaces.push(new Namespace('', node.attributeNodes[i].value));
			} else {
				inScopeNamespaces.push(new Namespace(node.attributeNodes[i].name.split(':')[1], node.attributeNodes[i].value));
			}
		}
	}
	return inScopeNamespaces;
}