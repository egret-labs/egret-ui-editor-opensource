
import { Schema, Element } from '../core/Schema';
import { XMLDocument } from '../core/XMLDocument';
import { ISchemaContentAssist, EXMLPos, EXMLPosCheckResult } from './ISchemaContentAssist';
import { SchemaContentAssistUtil } from './SchemaContentAssistUtil';
import { QName } from './../sax/QName';

/**
 * xml规则内容助手
 */
export class SchemaContentAssist implements ISchemaContentAssist {
	public constructor() {
	}

	/* ------------------------------ 命名空间相关 ------------------------------*/
	private defaultNss: any[] = [];
    /**
     * 注册一个默认的命名空间
     * @param uri 命名空间地址
     * @param prefix 命名空间短命
     */
	public registerDefaultNs(uri: string, prefix: string): void {
		for (let i: number = 0; i < this.defaultNss.length; i++) {
			if (this.defaultNss[i]['uri'] === uri) {
				this.defaultNss.splice(i, 1);
				break;
			}
		}
		this.defaultNss.push({ 'uri': uri, 'prefix': prefix });
	}
    /**
     * 清除默认的命名空间
     */
	public clearDefaultNs(): void {
		this.defaultNss.length = 0;
	}
	private currentNss: any[] = [];
    /**
     * 注册一个当前文档的命名空间
     * @param uri
     * @param prefix
     */
	public registerCurrentNs(uri: string, prefix: string): void {
		for (let i: number = 0; i < this.currentNss.length; i++) {
			if (this.currentNss[i]['uri'] === uri) {
				this.currentNss.splice(i, 1);
				break;
			}
		}
		this.currentNss.push({ 'uri': uri, 'prefix': prefix });
	}
    /**
     * 清除当前文档的命名空间
     */
	public clearCurrentNs(): void {
		this.currentNss.length = 0;
	}
    /**
     * 通过uri得到注册过的命名空间的短名，查找优先级：当前的>默认的
     * @param uri
     * @return
     */
	public getPrefix(uri: string): string {
		for (let i: number = 0; i < this.currentNss.length; i++) {
			if (this.currentNss[i]['uri'] === uri)
				return this.currentNss[i]['prefix'];
		}
		for (let defaultNs of this.defaultNss) {
			if (defaultNs['uri'] === uri)
				return defaultNs['prefix'];
		}
		return '';
	}
    /**
     * 通过短名得到注册过的命名空间的uri， 查找优先级：当前的>默认的
     * @param prefix
     * @return
     */
	public getUri(prefix: string): string {
		for (let i: number = 0; i < this.currentNss.length; i++) {
			if (this.currentNss[i]['prefix'] === prefix)
				return this.currentNss[i]['uri'];
		}
		for (let defaultNs of this.defaultNss) {
			if (defaultNs['prefix'] === prefix)
				return defaultNs['uri'];
		}
		return '';
	}

	/* ------------------------------ 节点检查相关 ------------------------------*/
    /**
     *
     * @param text
     * @param pos
     */
	public checkCursorPos(xml: XMLDocument, index: number): EXMLPosCheckResult {
		return SchemaContentAssistUtil.checkCursorPos(xml, index);
	}
	/* ------------------------------ 得到可能键入节点相关 ------------------------------*/

    /**
     * 得到可以输入的子节点
     * @param parent 父级节点
     * @return 名字列表
     */
	public getPossibleElement(path: any[], schema: Schema): Element[] {
		return SchemaContentAssistUtil.getPossibleElement(path, schema);
	}
    /**
     * 得到可以输入的属性名
     * @param parent 父级节点
     * @return 名字列表每一项为{attribute:attribute,className:className}
     */
	public getPossibleAttribute(parent: QName, schema: Schema): any[] {
		return SchemaContentAssistUtil.getPossibleAttribute(parent, schema);
	}
    /**
     * 得到可以输入的属性值
     * @param parent
     * @param arrtibute
     * @return
     */
	public getPossibleAttributeValue(parent: QName, arrtibute: string, schema: Schema): any[] {
		return SchemaContentAssistUtil.getPossibleAttributeValue(parent, arrtibute, schema);
	}
    /**
     * 得到类名的QName，给Element用
     * @param className
     * @return
     */
	public getClassQNameForElement(className: string): QName {
		return SchemaContentAssistUtil.getClassQNameForElement(className);
	}
}