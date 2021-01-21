import { Element, Group, SchemaNameChecker, ISchemaName } from '../core/Schema';
import { XMLDocument } from '../core/XMLDocument';
import { BaseSchemaStrategy } from '../schemas/BaseSchemaStrategy';
import { EUISchemaStrategy } from '../schemas/EUISchemaStrategy';
import { GUISchemaStrategy } from '../schemas/GUISchemaStrategy';
import { TextDocumentBase } from '../core/TextDocumentBase';
import { AbstractExmlConfig } from '../project/exmlConfigs';
import { SchemaModel } from '../schemas/SchemaModel';
import * as FileUtil from '../utils/files';
import { ImageSourceAssistUnit } from './ImageSourceAssistUnit';
import { QName } from '../sax/QName';
import { Namespace } from '../sax/Namespace';
import * as StringUtil from '../utils/strings';
import { LabelStyleAssistUnit } from './labelStyleAssistUnit';
import * as fs from 'fs';
import * as path from 'path';

// xml解析器
import * as xml from '../sax/xml-tagUtils';
import * as sax from '../sax/sax';
import { EXMLPos } from '../schemas/ISchemaContentAssist';
import * as XmlUtil from '../sax/xml-strUtils';
import { EgretProjectModel } from '../project/egretProject';

/**
 * exml代码提示解析器
 */
export class EXMLContentAssistProcessor {

	// 图像资源提示解析器
	private imageCompetion: ImageSourceAssistUnit = new ImageSourceAssistUnit();
	private labelStyle: LabelStyleAssistUnit = new LabelStyleAssistUnit();
	public constructor() {
	}

	private _exmlConfig: AbstractExmlConfig = null;
	public get exmlConfig(): AbstractExmlConfig {
		return this._exmlConfig;
	}

	private _projectModel: EgretProjectModel = null;
	public get projectModel(): EgretProjectModel {
		return this._projectModel;
	}

	public initedFunc: () => void;
	public inited: boolean = false;
	/**
     * 初始化内容提示器
     * @param rootPath 项目根路径
     */
	public async init(projectModel: EgretProjectModel, exmlConfig: AbstractExmlConfig): Promise<void> {
		this._projectModel = projectModel;
		this._exmlConfig = exmlConfig;
		await this.start();
		if (this.initedFunc) {
			this.initedFunc();
		}
		this.inited = true;
	}

	private schema: SchemaModel = null;
	/**
     * 启动代码提示助手，该方法可以重复调用，重复调用会彻底初始化内部配置
     */
	private async start(): Promise<void> {
		if(!this._projectModel){
			return;
		}
		let isEUI: boolean = false;
		let schemaStrategy: BaseSchemaStrategy = null;
		if (this._projectModel.UILibrary === 'eui') {
			isEUI = true;
			schemaStrategy = new EUISchemaStrategy();
		} else if (this._projectModel.UILibrary === 'gui') {
			schemaStrategy = new GUISchemaStrategy();
		}
		if (schemaStrategy) {
			this.schema = new SchemaModel();
			const engine = await this._projectModel.getEngineInfo();
			this.labelStyle.init(this.getthemePath(this._projectModel.wingPropertiesUri.fsPath));
			schemaStrategy.init(this._exmlConfig);
			let xsd: sax.Tag = null;
			if (isEUI) {
				xsd = await this.initXsd(engine.euiExmlXsdPath);
			} else {
				xsd = await this.initXsd(engine.guiExmlXsdPath);
			}
			this.schema.install(schemaStrategy, xsd);
		}
	}

	/**
	 * 当前项目的主题路径
	 */
	public getthemePath(wingPropertiesPath: string): string {
		if (wingPropertiesPath) {
			try {
				let wingPropertyStr: string = FileUtil.openAsString(wingPropertiesPath);
				const properties = JSON.parse(wingPropertyStr);
				if (properties['theme']) {
					return path.join(this._projectModel.project.fsPath, properties['theme']);
				}
			} catch (error) { }
		}
		return '';
	}

	private initXsd(xsdPath: string): Promise<sax.Tag> {
		return new Promise<sax.Tag>((c, e) => {
			fs.readFile(xsdPath, 'utf-8', (err, xsdStr) => {
				if (err) {
					console.log(err);
					c(null);
				} else {
					if (!xsdStr) {
						c(null);
					} else {
						let xsdXML: sax.Tag = null;
						try {
							xsdXML = xml.parse(xsdStr);
						} catch (error) { }
						c(xsdXML);
					}
				}
			});
		});
	}

	public getSchemaModel() {
		return this.schema;
	}

	private text: string = '';
	private document: TextDocumentBase = null;
	/**
     * 计算提示列表
     * @param text 全部文本
     * @param offset 位置
     * @return 提示列表
     */
	public computeCompletion(text: string, offset: number, document: TextDocumentBase): monaco.languages.CompletionItem[] {
		// 还没初始化完毕就直接返回
		if (!this.getSchemaModel()) {
			return [];
		}
		this.document = document;
		this.text = text;

		const posInfo = this.getSchemaModel().contentAssist.checkCursorPos(document as XMLDocument, offset);
		const tagName = posInfo.tag ? posInfo.tag.name : '';
		const attribute = posInfo.attribute || '';
		const attributeValue = posInfo.attributeValue || '';
		const range = posInfo.editRange
			? monaco.Range.fromPositions(document.positionAt(posInfo.editRange.start), document.positionAt(posInfo.editRange.end))
			: (void 0);

		let completions: monaco.languages.CompletionItem[] = [];

		if (EXMLPos.NodeStart === posInfo.pos) { // 节点名
			const tagPath: string[] = [];

			let curTag: sax.Tag | undefined = posInfo.tag;
			if (curTag) { while (curTag.parent) { curTag = curTag.parent; tagPath.push(curTag.name); } }

			tagPath.reverse();
			this.refreshCurrentNs();
			completions = this.createNodeStartCompletions(tagPath, text, range);
		} else if (EXMLPos.NodeEnd === posInfo.pos) { // 结束节点
			completions = completions.concat(this.createNodeEndCompletions(tagName, range));
		} else if (EXMLPos.AttributeName === posInfo.pos) {// 输入属性名
			const dotIndex = attribute.indexOf('.');
			if (dotIndex >= 0) {// 属性的状态
				completions = this.createAttributeStateCompletions(attribute.slice(dotIndex + 1), text, range);
			} else {
				this.refreshCurrentNs();
				completions = this.createAttributeCompetions(tagName, text, range, attributeValue);
			}
		} else if (EXMLPos.AttributeValue === posInfo.pos || EXMLPos.AttributeValueLeftQuote === posInfo.pos) { // 输入属性内的值
			this.refreshCurrentNs();
			if (attribute.indexOf('source') === 0 && tagName.indexOf(':Image') !== -1) {
				completions = this.imageCompetion.getKeyCompetions(range);
			} else if (attribute.indexOf('style') === 0 && tagName.indexOf(':Label') !== -1) {
				completions = this.labelStyle.getStyles(range);
			} else if (attribute.indexOf('skinName') === 0) {
				completions = this.createSkinNameCompletions(range);
			} else {
				const flag = EXMLPos.AttributeValueLeftQuote === posInfo.pos ? 1 : 0;
				completions = this.createAttributeValueCompletions(tagName, attribute, text, range, flag);
			}
		}
		return completions;
	}

	/**
     * 起始节点的自动补全
     * @param parentNodeName 父级的节点名
     * @param typeInNodeName 当前正在输入的节点名
     */
	private createNodeStartCompletions(nodePath: any[], fullText: string, range?: monaco.Range): monaco.languages.CompletionItem[] {
		let pathQNames: any = [];
		for (let i: number = 0; i < nodePath.length; i++) {
			pathQNames.push(this.getQNameWithNode(nodePath[i], fullText));
		}
		let elements: Element[] = this.getSchemaModel().contentAssist.getPossibleElement(pathQNames, this.getSchemaModel().schemaDecoder.schema);
		let completions: monaco.languages.CompletionItem[] = [];
		let nsList: Namespace[] = this.getNamespaces(this.text);
		for (let i = 0; i < elements.length; i++) {
			let prefix: string = this.getSchemaModel().contentAssist.getPrefix(elements[i].qName.uri);
			let classId: string = elements[i].qName.localName;
			let leftText: string = prefix ? prefix + ':' + classId : classId;
			let rightText: string = elements[i].qName.uri;
			rightText = rightText.replace('.*', '');
			rightText = rightText.replace('*', '默认包');
			// 如果是属性
			if (elements[i].parent && elements[i].parent.parent && elements[i].parent.parent instanceof Group && (<Group>elements[i].parent.parent).qName &&
				Group && (<Group>elements[i].parent.parent).qName.localName.indexOf('_attributeElement') !== -1
			) {
				rightText = (<Group>elements[i].parent.parent).qName.localName.slice(0, (<Group>elements[i].parent.parent).qName.localName.length - ('_attributeElement').length);
				if (elements[i].type && SchemaNameChecker.isTypeOf(elements[i].type)) {
					leftText += ' : ' + (<ISchemaName>elements[i].type).qName.localName;
				}
			}

			let uri: any = elements[i].qName.uri;

			let ns: Namespace = null;
			let needNs: boolean = false;
			if (uri !== this.getSchemaModel().getGuiNS().uri && uri !== this.getSchemaModel().getWorkNS().uri) {
				ns = this.getSchemaModel().createNamespace(uri, nsList);
				if (!this.getNamespaceByUri(ns.uri)) {
					needNs = true;
				}
			}
			let insertText: string = '';
			if (ns) {
				insertText = ns.prefix + ':' + classId;
			} else {
				insertText = this.getSchemaModel().contentAssist.getPrefix(uri) ? this.getSchemaModel().contentAssist.getPrefix(uri) + ':' + classId : classId;
			}
			const completion: monaco.languages.CompletionItem = {
				label: leftText,
				detail: rightText,
				kind: monaco.languages.CompletionItemKind.Property,
				range: range,
				insertText: insertText,
			};
			if (needNs) {
				const xmlnsObj = XmlUtil.addNamespace(fullText, ns);
				if (xmlnsObj && xmlnsObj.addedNS) {
					const arg = { offset: xmlnsObj.addedNS.offset, value: xmlnsObj.addedNS.content };
					completion.command = { id: 'editor.action.egretEXmlInsertNamespace', title: 'add namespace...', arguments: [arg] };
				}
			}
			completions.push(completion);
		}
		return completions;
	}

	private getNamespaceByUri(uri: String): Namespace {
		let nsList: Namespace[] = this.getNamespaces(this.text);
		for (let i = 0; i < nsList.length; i++) {
			let ns: Namespace = nsList[i];
			if (ns.uri === uri) {
				return ns;
			}
		}
		return null;
	}

	/**
     * 结束节点的自动补全
     * @param value
     * @param onComplete
     */
	private createNodeEndCompletions(value: string, range?: monaco.Range): monaco.languages.CompletionItem[] {
		let completions: monaco.languages.CompletionItem[] = [];
		let insertText: string = '/' + value;
		const completion: monaco.languages.CompletionItem = {
			label: insertText,
			detail: '',
			kind: monaco.languages.CompletionItemKind.Property,
			range: range,
			insertText: insertText,
			sortText: '!',
		};
		completions.push(completion);
		return completions;
	}

	/**
     * 显示节点属性的自动补全
     * @param currentNodeName 当前所在的节点名
     * @param typeInAttName 正在输入的属性名
     */
	private createAttributeCompetions(currentNodeName: string, fullText: string, range?: monaco.Range, value?: string): monaco.languages.CompletionItem[] {
		let completions: monaco.languages.CompletionItem[] = [];
		let qName: QName = this.getQNameWithNode(currentNodeName, fullText); // TODO:
		if (!qName) {
			return completions;
		}
		let attArr: any[] = this.getSchemaModel().contentAssist.getPossibleAttribute(qName, this.getSchemaModel().schemaDecoder.schema);
		value = value || '';

		for (let attr of attArr) {
			const completion: monaco.languages.CompletionItem = {
				label: attr['attribute'],
				detail: attr['className'],
				kind: monaco.languages.CompletionItemKind.Property,
				range: range,
				insertText: `${attr['attribute']}="${value}$0"`,
				insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
				command: { id: 'editor.action.triggerSuggest', title: 'move cursor back...' },
			};
			completions.push(completion);
		}
		return completions;
	}

	/**
     * 得到所有的皮肤名
     */
	private createSkinNameCompletions(range: monaco.Range): monaco.languages.CompletionItem[] {
		let completions: monaco.languages.CompletionItem[] = [];
		let skinNames = this.getSchemaModel().skinClassNames;
		for (let i: number = 0; i < skinNames.length; i++) {
			completions.push({
				label: skinNames[i],
				detail: '',
				kind: monaco.languages.CompletionItemKind.Value,
				range: range,
				insertText: skinNames[i]
			});
		}
		return completions;
	}

	/**
     * 得到属性的值
     * @param qNameStr
     * @param attribute
     * @param value
     * @return
     */
	private createAttributeValueCompletions(qNameStr: string, attribute: string, fullText: string, range?: monaco.Range, flag: number = 0): monaco.languages.CompletionItem[] {
		let completions: monaco.languages.CompletionItem[] = [];
		let qName: QName = this.getQNameWithNode(qNameStr, fullText);
		let attValuesArr: string[];
		// 这里对xml的state做一下特殊判断，如果输入的属性名为includeIn或excludeFrom则将可以输入的内容提示变为当前exml内状态数组
		if (attribute === 'includeIn' || attribute === 'excludeFrom') {
			attValuesArr = this.getStates(fullText);
		} else {
			attValuesArr = this.getSchemaModel().contentAssist.getPossibleAttributeValue(qName, attribute, this.getSchemaModel().schemaDecoder.schema);
		}
		for (let i: number = 0; i < attValuesArr.length; i++) {
			const completion: monaco.languages.CompletionItem = {
				label: attValuesArr[i],
				detail: '',
				kind: monaco.languages.CompletionItemKind.Value,
				range: range,
				insertText: (flag ? '"' : '') + attValuesArr[i] + '"'
			};
			completions.push(completion);
		}
		return completions;
	}

	/**
     * 得到属性的状态
     * @param child
     * @return
     */
	private createAttributeStateCompletions(child: String, fullText: string, range: monaco.Range): monaco.languages.CompletionItem[] {
		let completions: monaco.languages.CompletionItem[] = [];
		let stateArr: string[] = this.getStates(fullText);
		for (let i: number = 0; i < stateArr.length; i++) {
			completions.push({
				label: stateArr[i],
				detail: '',
				kind: monaco.languages.CompletionItemKind.Property,
				range: range,
				insertText: stateArr[i]
			});
		}
		return completions;
	}

	/**
     * 通过节点的字符串得到qName
     * @param nodeStr
     * @return
     *
     */
	private getQNameWithNode(nodeStr: string, fullText: string): QName {
		let nodeArr: string[] = (<string>nodeStr).split(':');
		let classId: string = nodeArr.length === 2 ? nodeArr[1] : nodeArr[0];
		let ns: Namespace = this.getNamespaceByPrefix(nodeArr[0], fullText);
		if (!ns) {
			return null;
		}
		let qName: QName = new QName(ns.uri, classId);
		return qName;
	}

	private getNamespaceByPrefix(prefix: string, fullText: string): Namespace {
		let nsList: any = this.getNamespaces(fullText);
		for (let i: number = 0; i < nsList.length; i++) {
			let ns: Namespace = nsList[i];
			if (ns.prefix === prefix) {
				return ns;
			}
		}
		return null;
	}

	/**
     * 以字符串的方式读取一个xml中的命名空间数组。
     * @param xmlStr
     * @return
     *
     */
	private getNamespaces(xmlStr: string): Namespace[] {
		let result: Namespace[] = [];
		let arr: any[] = xmlStr.match(/(xmlns.*?=(\"|\').*?(\"|\'))/g);
		if (!arr) { return []; }
		for (let i: number = 0; i < arr.length; i++) {
			let xmlns: string = arr[i];

			let prefixStart: number = -1;
			let prefixEnd: number = -1;
			let char: string = '';
			let uriStart: number = -1;
			let uriEnd: number = -1;
			for (let j: number = 0; j < xmlns.length; j++) {
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
				prefix = StringUtil.trim(xmlns.slice(prefixStart, prefixEnd));
			}
			let uri: string = '';
			if (uriStart > 0 && uriEnd > 0) {
				uri = StringUtil.trim(xmlns.slice(uriStart, uriEnd));
			}
			let ns: Namespace = new Namespace(prefix, uri);
			result.push(ns);
		}
		return result;
	}
	/**
     * 得到当前Exml文档的States
     * @return
     */
	private getStates(fullText: string): string[] {
		// 先读节点的，如果读不到节点的则从属性中读取
		let arr: string[] = this.getStatesByNode(fullText);
		if (!arr || arr.length === 0) {
			arr = this.getStatesByAttribute();
		}
		return arr;
	}

	/**
     * 从节点中读取states
     * @return
     */
	private getStatesByNode(fullText: string): string[] {
		let text: String = fullText;
		let arr: string[] = [];
		let statesStart: number = text.indexOf('<s:states');
		let statesEnd: number = -1;
		if (statesStart >= 0) {
			statesEnd = text.indexOf('</s:states');
			if (statesEnd >= 0) {
				for (let i: number = statesEnd; i < text.length; i++) {
					if (text.charAt(i) === '>') {
						statesEnd = i + 1;
						break;
					}
				}
			}
		}

		if (statesStart >= 0 && statesEnd >= 0) {
			let statesXmlStr: string = text.slice(statesStart, statesEnd);
			statesXmlStr = statesXmlStr.replace(/\<s\:/g, '<');
			statesXmlStr = statesXmlStr.replace(/<\/s\:/g, '</');
			let statesXml: sax.Tag;
			try {
				statesXml = xml.parse(statesXmlStr);
			} catch (error) {

			}
			if (statesXml) {
				let children: sax.Tag[] = statesXml.children;
				let stateXmlList: sax.Tag[] = [];
				for (let i: number = 0; i < children.length; i++) {
					if (children[i].localName === 'State') {
						stateXmlList.push(children[i]);
					}
				}
				for (let stateXml of stateXmlList) {
					arr.push(stateXml.attributes['name'].toString());
				}
			}
		}
		return arr;
	}

	/**
     * 从属性中读取states
     * @return
     */
	private getStatesByAttribute(): string[] {
		let reg: RegExp = /\<.*?\:Skin[\s\S]*?states[\s\S]*?\=[\s\S]*?[\'|\"](.*?)[\'|\"][\s\S]*?\>/;
		let arr: string[] = this.text.match(reg);
		if (arr) {
			let str: String = arr[1];
			let states: string[] = str.split(',');
			for (let i: number = 0; i < states.length; i++) {
				states[i] = StringUtil.trim(states[i]);
			}
			return states;
		}
		return [];
	}

	// 在要出现之前调用，刷新当前文档的所有命名空间
	private refreshCurrentNs(): void {
		let nss: Namespace[] = this.getNamespaces(this.text);
		this.getSchemaModel().contentAssist.clearCurrentNs();
		for (let i = 0; i < nss.length; i++) {
			let currentNs: Namespace = nss[i] as Namespace;
			this.getSchemaModel().contentAssist.registerCurrentNs(currentNs.uri, currentNs.prefix);
		}
	}
}