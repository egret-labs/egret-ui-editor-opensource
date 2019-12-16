import { Schema, Element } from '../core/Schema';
import { Tag } from '../sax/sax';
import { XMLDocument } from '../core/XMLDocument';

import { QName } from './../sax/QName';

export enum EXMLPos {
	Undefined = 'Undefined', // 未定义的, 不支持自动完成的部分
	NodeStart = 'NodeStart', // 元素开始部分, 一般是元素名字
	RootNodeStart = 'RootNodeStart', // 根元素开始部分
	NodeEnd = 'NodeEnd', // 元素结束部分
	AttributeName = 'AttributeName', // 属性名
	AttributeValue = 'AttributeValue', // 属性值
	AttributeValueLeftQuote = 'AttributeValueLeftQuote', // 属性的左引号
	AttributeValueRightQuote = 'AttributeValueRightQuote', // 属性的右引号
	AttributeValueBeforeQuote = 'AttributeValueBeforeQuote', // 属性值引号未开始的区域
	Text = 'Text', // 文本节点
	CDATA = 'CDATA', // CDATA
	Comment = 'Comment', // 注释
	ProcessingInstruction = 'ProcessingInstruction', // 处理指令
}

export interface EXMLPosCheckResult {
	pos: EXMLPos;
	tag: Tag | undefined;
	attribute?: string;
	attributeValue?: string;
	editRange?: { start: number, end: number };
}

/**
 * xml规则助手接口
 */
export interface ISchemaContentAssist {
	/* ------------------------------ 命名空间相关 ------------------------------*/
    /**
     * 注册一个默认的命名空间，该命名空间为已经确定的空间的命名空间。如果当前文件中的临时的命名空间则通过
     * <code>registerCurrentNs</code>方法去注册。
     * @param uri 命名空间地址
     * @param prefix 命名空间短命
     */
	registerDefaultNs(uri: string, prefix: string): void;
    /**
     * 清除所有默认的命名空间
     */
	clearDefaultNs(): void;
    /**
     * 注册一个当前文档的中的命名空间。
     * @param uri
     * @param prefix
     */
	registerCurrentNs(uri: string, prefix: string): void;
    /**
     * 清除当前文档的所有命名空间
     */
	clearCurrentNs(): void;
    /**
     * 通过uri得到注册过的命名空间的短名，查找优先级：当前的>默认的
     * @param uri
     * @return
     */
	getPrefix(uri: string): string;
    /**
     * 通过短名得到注册过的命名空间的uri， 查找优先级：当前的>默认的
     * @param prefix
     * @return
     */
	getUri(prefix: string): string;

	/* ------------------------------ 节点检查相关 ------------------------------*/
    /**
     *
     * @param text
     * @param index
     */
	checkCursorPos(xml: XMLDocument, index: number): EXMLPosCheckResult;

	/* ------------------------------ 得到可能键入节点相关 ------------------------------*/
    /**
     * 得到可以输入的子节点
     * @param parent 父级节点
     * @return 名字列表
     */
	getPossibleElement(path: any[], schema: Schema): Element[];
    /**
     * 得到可以输入的属性名
     * @param parent 父级节点
     * @return 名字列表每一项为{attribute:attribute,className:className}
     */
	getPossibleAttribute(parent: QName, schema: Schema): any[];
    /**
     * 得到可以输入的属性值
     * @param parent
     * @param arrtibute
     * @return
     */
	getPossibleAttributeValue(parent: QName, arrtibute: string, schema: Schema): any[];
    /**
     * 得到类名的QName，给Element用
     * @param className
     * @return
     */
	getClassQNameForElement(className: string): QName;
}