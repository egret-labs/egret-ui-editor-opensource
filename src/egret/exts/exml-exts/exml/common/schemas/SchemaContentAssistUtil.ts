import {
	Schema, Element, ISchemaNode, SchemaNodeType, ISchemaContainer, SchemaContainerChecker,
	SchemaRefChecker, ISchemaRef, SchemaAnyChecker, Attribute, ISchemaAny, AttributeGroup, SchemaContainer
} from '../core/Schema';
import { XMLDocument } from '../core/XMLDocument';
import { QName } from './../sax/QName';
import * as sax from '../sax/sax';
import { EXMLPos, EXMLPosCheckResult } from './ISchemaContentAssist';
import { IOutputService } from 'egret/workbench/parts/output/common/output';

export class SchemaContentAssistUtil {
	//  ⚠️ 因为 sax 会解析出各种节点的相对于整个 xml 字符串起点的位置
	//     所以这里的位置相关的变量如果没特别说明都是基于全局(整个 xml)的

	/**
	 * 检查光标所在位置是 xml 的哪个部分, 并提供自动完成所需的信息
	 *
	 * @param xml
	 * @param index
	 *
	 */
	public static checkCursorPos(xml: XMLDocument, index: number): EXMLPosCheckResult {
		let ret: EXMLPosCheckResult = { tag: (void 0), attribute: '', pos: EXMLPos.Undefined };

		// 非法文档
		if (!xml) { return ret; }

		const text = xml.getText();
		if (!text) { return ret; }

		if (!xml.xmlRoot) { return ret; }
		// 即使 xml 的根节点都无效, sax 也会生成一个 root 节点, 其 start/end 属性都为 -1
		if (xml.xmlRoot.start === -1) {
			ret.pos = EXMLPos.Text;
			return ret;
		}

		// 如果在注释部分, 比如 <!-- 对话框 -->
		const comment = this.getCommentAt(xml.xmlRoot, index);
		if (comment) {
			ret.pos = EXMLPos.Comment;
			return ret;
		}

		// 如果在处理指令部分, 比如 <?xml version="1.0" encoding="utf-8"?>
		const inst = this.getProcessingInstruction(xml.xmlRoot, index);
		if (inst) {
			ret.pos = EXMLPos.ProcessingInstruction;
			return ret;
		}

		const roots = xml.xmlRoot.roots || [xml.xmlRoot];
		for (const root of roots) {
			if (!this.xmlNodeContains(root, index)) { continue; }
			ret = this.checkCursorPosWithRoot(root, text, index);
			return ret;
		}
		return ret;
	}

	private static checkCursorPosWithRoot(root: sax.Tag, text: string, index: number): EXMLPosCheckResult {
		let ret: EXMLPosCheckResult = { tag: (void 0), attribute: '', pos: EXMLPos.Undefined };

		// 查找包含光标位置的节点
		const curTag = this.getTagAt(root, index);
		if (!curTag) { return ret; }

		// 如果在文本节点(包括 CData)部分
		const textNode = this.getTextNodeAt(curTag, index);
		if (textNode) {
			ret.tag = curTag;
			ret.pos = textNode.nodeType === sax.Type.CData ? EXMLPos.CDATA : EXMLPos.Text;
			return ret;
		}

		// 检查节点内部
		ret = this.checkWithinTag(curTag, index, text);
		return ret;
	}

	// 获取光标位置的注释, 比如 <!-- 对话框 -->
	private static getCommentAt(root: sax.Tag, index: number): sax.Comment | undefined {
		if (!root || !root.comments) { return (void 0); }
		for (const comment of root.comments) {
			if (this.xmlNodeContains(comment, index)) {
				return comment;
			}
		}
		return (void 0);
	}

	/**
	 * 获取光标位置的处理指令, 比如 <?xml version="1.0" encoding="utf-8"?>
	 *
	 * @param root xml 根节点(因为目前的 xml 解析类会把 Processing Instructions 存在根节点)
	 * @param index 光标位置
	 */
	private static getProcessingInstruction(root: sax.Tag, index: number): sax.ProcessingInstruction | undefined {
		if (!root || !root.processingInstructions) { return (void 0); }
		for (const procInst of root.processingInstructions) {
			if (this.xmlNodeContains(procInst, index)) {
				return procInst;
			}
		}
		return (void 0);
	}

	/**
	 * 在一个节点内搜索光标位置的文本节点(包括 CData)
	 *
	 * @param curTag 指定的节点
	 * @param index 光标位置
	 *
	 *
	 */
	private static getTextNodeAt(curTag: sax.Tag, index: number): sax.TextNode | undefined {
		if (curTag.textNodes) {
			for (const textNode of curTag.textNodes) {
				if (this.xmlNodeContains(textNode, index)) {
					return textNode;
				}
			}
		}
		return (void 0);
	}

	/**
	 * 递归查找包含光标位置的节点
	 *
	 * @param tag 查找的开始节点
	 * @param index 光标位置
	 */
	private static getTagAt(tag: sax.Tag, index: number): sax.Tag | undefined {
		if (!this.xmlNodeContains(tag, index)) { return (void 0); }
		for (const child of tag.children) {
			const found = this.getTagAt(child, index);
			if (found) { return found; }
		}
		return tag;
	}

	/**
	 * 判断光标位置处于指定的 xml 节点的哪个部分
	 *
	 * 因为 sax 会解析出各种节点的相对于整个 xml 字符串起点的位置, 所以这里的位置相关的变量如果没特别说明都是基于全局(整个 xml)的
	 *
	 * @param curTag 用于判断的节点
	 * @param index 光标位置
	 * @param wholeXmlText 所在 xml 的完整字符串(不仅仅是指定的节点)
	 */
	private static checkWithinTag(curTag: sax.Tag, index: number, wholeXmlText: string): EXMLPosCheckResult {
		const ret: EXMLPosCheckResult = { tag: (void 0), attribute: '', pos: EXMLPos.Undefined };

		// 如果节点名为空, 那么应该也没有属性, 因为属性名会被 sax 认做节点名
		if (!curTag.name) {
			ret.tag = curTag;
			ret.pos = EXMLPos.NodeStart;
			const start = wholeXmlText.indexOf('<', curTag.start) + 1;
			ret.editRange = { start: start, end: start };
			return ret;
		}

		const nameStartPos = wholeXmlText.indexOf(curTag.name, curTag.start);
		let start = nameStartPos + curTag.name.length + 1;
		let end = curTag.end;
		if (curTag.closed) {
			end = curTag.isSelfClosing
				? wholeXmlText.lastIndexOf('/', curTag.startTagEnd - 1) + 1 // '/'
				: curTag.startTagEnd; // '>'
		}

		if (start === -1 || end === -1) { return ret; } // unexpected

		ret.tag = curTag;

		if (index < start) { // 节点名部分
			ret.pos = EXMLPos.NodeStart;
			ret.editRange = { start: nameStartPos, end: nameStartPos + curTag.name.length };
		} else if (index < end && index >= start) { // 属性区域
			// 如果没内容, 默认为属性名
			// edit.editRange 默认为光标位置, 不需要设定
			ret.pos = EXMLPos.AttributeName;

			// 没有正确标识的都认为是属性名
			for (const attr of curTag.attributeNodes) {
				if (this.xmlNodeContains(attr, index)) {
					ret.attribute = attr.name;
					const attrStr = wholeXmlText.slice(attr.start, attr.end);
					const equalPos = attrStr.indexOf('=');

					if (equalPos < 0) { // 如果没有等号
						ret.pos = EXMLPos.AttributeName;
						ret.editRange = { start: attr.start, end: attr.end - 1 };
					} else { // 如果有等号
						// 获取属性值 {{
						let quoteChar = '';
						let quotePosLeft = -1;
						for (let i = equalPos + 1; i <= attr.end - attr.start; i++) {
							const c = attrStr[i];
							if (!quoteChar) {
								if (c === '"' || c === '\'') {
									quoteChar = c;
									quotePosLeft = i;
								}
							} else {
								if (c === quoteChar) {
									quoteChar = '';
									ret.attributeValue = attrStr.slice(quotePosLeft + 1, i);
								}
							}
						}
						// 引号未关闭的情况
						if (quoteChar) {
							ret.attributeValue = attrStr.slice(quotePosLeft + 1);
						}
						// 获取属性值 }}

						if (index > equalPos + attr.start) { // 光标在等号右边
							if (index <= quotePosLeft + attr.start) {
								ret.pos = EXMLPos.AttributeValueLeftQuote;
								ret.editRange = { start: attr.start + equalPos + 1, end: attr.end };
							} else {
								ret.pos = EXMLPos.AttributeValue;
								ret.editRange = { start: attr.start + quotePosLeft + 1, end: attr.end };
							}
						} else { // 光标在等号左边
							ret.pos = EXMLPos.AttributeName;
							ret.editRange = { start: attr.start, end: attr.end };
						}
					}
					break;
				}
			}
		} else if (index > curTag.startTagEnd) { // 结束区域
			if (index === curTag.endTagStart) { // 左边 <
				ret.pos = EXMLPos.Text;
			} else {
				ret.pos = EXMLPos.NodeEnd;
				ret.editRange = { start: curTag.endTagStart + 1, end: curTag.end - 1 };
			}
		}
		return ret;
	}

	// 判断光标位置是否被 xml 节点的 (start, end] 区间
	private static xmlNodeContains(node: sax.Node, index: number): boolean {
		return index > node.start && index <= node.end;
	}

	private static retString(ret: EXMLPosCheckResult): string {
		const debugRet = {
			tagName: ret.tag ? ret.tag.name : '',
			...ret,
		};
		delete debugRet.tag;
		return JSON.stringify(debugRet);
	}
	/**
	 * 得到可以输入的子节点
	 * @param parent 父级节点
	 * @return 名字列表
	 */
	public static getPossibleElement(path: any[], schema: Schema): Element[] {
		let result: Element[] = [];
		if (!path || path.length === 0) return result;
		let targetElement: Element = SchemaContentAssistUtil.getElementByPath(path, schema);
		if (targetElement) {
			let elements: Element[] = [];
			SchemaContentAssistUtil.getElements(elements, targetElement);
			result = elements;
		}
		if (!result)
			result = [];
		return result;
	}
	/**
	 * 遍历target得到所有的element的名字，放到nameList里
	 * @param nameList
	 * @param target
	 *
	 */
	private static getElements(nameList: Element[], target: ISchemaNode): void {
		if (target instanceof Element && (<Element>target).type) {
			SchemaContentAssistUtil.getElements(nameList, (<Element>target).type);
		} else if (SchemaContainerChecker.isTypeOf(target)) {
			let currentContainer: ISchemaContainer = target as ISchemaContainer;
			if (SchemaRefChecker.isTypeOf(currentContainer))
				currentContainer = (<ISchemaRef><any>currentContainer).resolveForRef as ISchemaContainer;

			for (let i: number = 0; i < currentContainer.numChildren; i++) {
				let currentNode: ISchemaNode = currentContainer.getNodeAt(i);

				if (currentNode instanceof Element) {
					let element: Element = currentNode as Element;
					element = element.resolveForRef as Element;
					if (nameList.indexOf(element) === -1)
						nameList.push(element);
				} else if (SchemaContainerChecker.isTypeOf(currentNode) || SchemaAnyChecker.isTypeOf(currentNode)) {
					SchemaContentAssistUtil.getElements(nameList, currentNode);
				}
			}
		} else if (SchemaAnyChecker.isTypeOf(target)) {
			let currentAny: ISchemaAny = target as ISchemaAny;
			currentAny.refresh();
			for (let i = 0; i < currentAny.numNode; i++) {
				let element = currentAny.getNodeAt(i) as Element;
				element = element.resolveForRef as Element;
				if (nameList.indexOf(element) === -1)
					nameList.push(element);
			}
		}
	}
	/**
	 * 得到可以输入的属性名
	 * @param parent 父级节点
	 * @return 名字列表每一项为{attribute:attribute,className:className}
	 *
	 */
	public static getPossibleAttribute(parent: QName, schema: Schema): any[] {
		let result: any[] = [];
		if (!parent) return result;
		let targetElements: ISchemaNode[] = schema.getNodes(parent, SchemaNodeType.ELEMENT, true);
		let targetElement: Element = targetElements.length > 0 ? targetElements[0] as Element : null;
		if (targetElement)
			SchemaContentAssistUtil.getAttribute(result, targetElement);
		return result;
	}
	/**
	 * 得到目标节点获得对应的属性列表
	 * @param nameList 属性文本列表
	 * @param target 目标节点
	 *
	 */
	private static getAttribute(resultList: any[], target: ISchemaNode): void {
		if (SchemaContainerChecker.isTypeOf(target)) {
			let currentContainer: ISchemaContainer = target as ISchemaContainer;
			if (SchemaRefChecker.isTypeOf(currentContainer))
				currentContainer = (<ISchemaRef><any>currentContainer).resolveForRef as ISchemaContainer;
			for (let i: number = 0; i < currentContainer.numChildren; i++) {
				let currentNode: ISchemaNode = currentContainer.getNodeAt(i);
				if (currentNode instanceof Attribute) {
					let attribute: Attribute = currentNode as Attribute;
					let className: string = '';
					attribute = attribute.resolveForRef as Attribute;
					if (attribute.parent instanceof AttributeGroup) {
						className = (<AttributeGroup>attribute.parent).qName ? (<AttributeGroup>attribute.parent).qName.localName : '';
					}
					resultList.push({ 'attribute': attribute.qName.localName, 'className': className });
				} else if (SchemaContainerChecker.isTypeOf(currentNode) && !(currentNode instanceof Element)) {
					SchemaContentAssistUtil.getAttribute(resultList, currentContainer.getNodeAt(i));
				}
			}
		}
	}
	/**
	 * 得到可以输入的属性值
	 * @param parent
	 * @param arrtibute
	 * @return
	 *
	 */
	public static getPossibleAttributeValue(parent: QName, arrtibute: string, schema: Schema): any[] {
		let result: any[] = [];
		if (!parent) return result;
		let targetElements: ISchemaNode[] = schema.getNodes(parent, SchemaNodeType.ELEMENT, true);
		let targetElement: Element = targetElements.length > 0 ? targetElements[0] as Element : null;
		if (targetElement) {
			let attribute: Attribute = SchemaContentAssistUtil.getSingleAttribute(arrtibute, targetElement);
			if (attribute) {
				result = attribute.values.concat();
			}
		}
		result.sort();
		return result;
	}
	/**
	 * 得到目标节点获得对应的属性列表
	 * @param nameList 属性文本列表
	 * @param target 目标节点
	 *
	 */
	private static getSingleAttribute(attribute: string, target: ISchemaNode): Attribute {
		if (SchemaContainerChecker.isTypeOf(target)) {
			let currentContainer: ISchemaContainer = target as ISchemaContainer;
			if (SchemaRefChecker.isTypeOf(currentContainer))
				currentContainer = (<ISchemaRef><any>currentContainer).resolveForRef as ISchemaContainer;
			for (let i: number = 0; i < currentContainer.numChildren; i++) {
				let currentNode: ISchemaNode = currentContainer.getNodeAt(i);
				if (currentNode instanceof Attribute) {
					let childAttribute: Attribute = currentNode as Attribute;
					childAttribute = childAttribute.resolveForRef as Attribute;
					if (childAttribute.name === attribute) {
						return childAttribute;
					}
				} else if (SchemaContainerChecker.isTypeOf(currentNode) && !(currentNode instanceof Element)) {
					let result: Attribute = SchemaContentAssistUtil.getSingleAttribute(attribute, currentNode);
					if (result) {
						return result;
					}
				}
			}
		}
		return null;
	}
	/**
	 * 通过一个路径得到一个节点
	 * @param qNames
	 * @param schema
	 * @return
	 *
	 */
	private static getElementByPath(qNames: any[], schema: Schema): Element {
		let targetElement: SchemaContainer = schema;
		for (let i: number = 0; i < qNames.length; i++) {
			let qName: QName = qNames[i];
			targetElement = SchemaContentAssistUtil.getElement(targetElement, qName);
			if (!targetElement) {
				break;
			}
		}
		return targetElement as Element;
	}
	/**
	 * 从当前节点向内部开始遍历，得到指定的元素。会处理ref和type
	 * @return
	 */
	private static getElement(target: ISchemaNode, qName: QName): Element {
		if (!qName) return null;
		if (target instanceof Element && (<Element>target).type) {
			return SchemaContentAssistUtil.getElement((<Element>target).type, qName);
		} else if (SchemaContainerChecker.isTypeOf(target)) {
			let currentContainer: ISchemaContainer = target as ISchemaContainer;
			for (let i: number = 0; i < currentContainer.numChildren; i++) {
				let currentNode: ISchemaNode = currentContainer.getNodeAt(i);
				if (SchemaRefChecker.isTypeOf(currentNode))
					currentNode = (<ISchemaRef>currentNode).resolveForRef;
				if (currentNode instanceof Element) {
					if ((<Element>currentNode).qName != null) {
						if ((<Element>currentNode).qName.localName === qName.localName && (<Element>currentNode).qName.uri === qName.uri) {
							return currentNode as Element;
						}
					}
					if ((<Element>currentNode).type != null) {
						let resuleElement: Element = SchemaContentAssistUtil.getElement(currentNode, qName);
						if (resuleElement) {
							return resuleElement;
						}
					}
				} else if (SchemaContainerChecker.isTypeOf(currentNode) || SchemaAnyChecker.isTypeOf(currentNode)) {
					const resuleElement = SchemaContentAssistUtil.getElement(currentNode, qName);
					if (resuleElement) {
						return resuleElement;
					}
				}
			}
		} else if (SchemaAnyChecker.isTypeOf(target)) {
			let currentAny: ISchemaAny = target as ISchemaAny;
			currentAny.refresh();
			for (let i = 0; i < currentAny.numNode; i++) {
				const currentNode = currentAny.getNodeAt(i);
				if (currentNode instanceof Element && (<Element>currentNode).qName.localName === qName.localName && (<Element>currentNode).qName.uri === qName.uri) {
					return currentNode as Element;
				}
			}
		}
		return null;
	}
	/**
	 * 得到类名的QName，给Element用
	 * @param className
	 * @return
	 */
	public static getClassQNameForElement(className: string): QName {
		let uri: string = '*';
		let prefix: string = className;
		let classNameArr: any[] = className.split('.');
		if (classNameArr.length > 1) {
			prefix = classNameArr[classNameArr.length - 1];
			let tempClassNameArr: any[] = classNameArr.splice(0, classNameArr.length - 1);
			uri = tempClassNameArr.join('.');
			uri += '.*';
		}
		// todo 自定义类的目前还未实现
		// if (IExmlModel(Context.getInstance().commonData.currentExml).exmlConfig.customClassNameList.indexOf(className) == -1) {
		//     uri = "http://ns.egret-labs.org/egret";
		// }
		if (!uri)
			uri = 'http://ns.egret-labs.org/egret';
		return new QName(uri, prefix);
	}
}