import { ICodeService } from './ICodeService';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { XMLDocument } from '../../common/core/XMLDocument';
import { EXMLContentAssistProcessor } from '../contentassist/EXMLContentAssistProcessor';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { dispose } from 'egret/base/common/lifecycle';
import { XMLFormatUtil } from '../contentassist/XMLFormat';
import { parser, typeInit } from '@egret/eui-compiler';

export function initCodeService(instantiationService: IInstantiationService): void {
	const codeServiceImpl = instantiationService.createInstance(CodeService);
	instantiationService.addService(ICodeService, codeServiceImpl);
	codeServiceImpl.init();
}

type CodeEditorInstance = {
	editorId: string;
	modelUri: monaco.Uri;
	editor: monaco.editor.IStandaloneCodeEditor;
	doc: XMLDocument;
	monacoDisposables: monaco.IDisposable[];
};

export class CodeService implements ICodeService {
	_serviceBrand: undefined;

	private instanceMap: { [editorId: string]: CodeEditorInstance } = {};
	private contentAssistProcessor: EXMLContentAssistProcessor;
	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IEgretProjectService protected egretProjectService: IEgretProjectService) {
		this.contentAssistProcessor = this.instantiationService.createInstance(EXMLContentAssistProcessor);
	}
	public init(): void {
		this.egretProjectService.ensureLoaded().then(() => {
			this.contentAssistProcessor.init(this.egretProjectService.projectModel, this.egretProjectService.exmlConfig);
			this.registerCompletionItemProvider();
			this.registerFormattingProvider();
		});
	}

	private async errorCheck(uri: monaco.Uri) {
		let model = monaco.editor.getModel(uri);

		const text = model.getValue();
		
		typeInit();
		const skinNode = parser.generateAST(text, '');
		const errorInfo = skinNode.errors.shift();

		if (errorInfo) {
			monaco.editor.setModelMarkers(model, "owner", [
				{
					startLineNumber: errorInfo.startLine,
					startColumn: errorInfo.startColumn,
					endLineNumber: errorInfo.endLine,
					endColumn: errorInfo.endColumn,
					message: errorInfo.message.split('\n')[0],
					severity: monaco.MarkerSeverity.Error
				}
			]);
		}
		else {
			monaco.editor.setModelMarkers(model, "owner", [
			]);
		}
	}

	private registerCompletionItemProvider(): void {
		monaco.languages.registerCompletionItemProvider('xml', {
			triggerCharacters: [':', '<', '\'', '\"', ' ', '.', '/'],
			provideCompletionItems: (model, position, context, token) => {
				if (!this.contentAssistProcessor.inited) {
					return {
						suggestions: []
					};
				}
				try {
					this.errorCheck(model.uri);
					const xmlDoc = this.getInstance(model.uri).doc;
					let text: string = xmlDoc.getText();
					let offset: number = xmlDoc.offsetAt(position);
					const result = this.contentAssistProcessor.computeCompletion(text, offset, xmlDoc);
					return {
						suggestions: result
					};
				} catch (e) {
					return {
						suggestions: []
					};
				}
			}
		});
	}

	private registerFormattingProvider(): void {
		monaco.languages.registerDocumentFormattingEditProvider('xml', {
			provideDocumentFormattingEdits: (model, options, token) => {
				try {
					this.errorCheck(model.uri);
					const xmlDoc = this.getInstance(model.uri).doc;
					return this.format(xmlDoc, options);
				} catch (e) {
					return [];
				}
			}
		});
		monaco.languages.registerDocumentRangeFormattingEditProvider('xml', {
			provideDocumentRangeFormattingEdits: (model, rang, options, token) => {
				try {
					this.errorCheck(model.uri);
					const xmlDoc = this.getInstance(model.uri).doc;
					return this.format(xmlDoc, options, rang);
				} catch (e) {
					return [];
				}
			}
		});
	}

	private format(xmlDocument: XMLDocument, options: monaco.languages.FormattingOptions, range?: monaco.Range): monaco.languages.TextEdit[] {
		const tabSize = options.tabSize;
		const insertSpaces = options.insertSpaces;
		const text: string = xmlDocument.getText();

		let start = 0;
		let end = text.length;
		if (range) {
			start = xmlDocument.offsetAt(range.getStartPosition());
			end = xmlDocument.offsetAt(range.getEndPosition());
		}

		let lineBreak: string = '\n';
		if (text.indexOf('\r\n') !== -1) {
			lineBreak = '\r\n';
		} else if (text.indexOf('\n') !== -1) {
			lineBreak = '\n';
		} else if (text.indexOf('\r') !== -1) {
			lineBreak = '\n';
		}
		const result = XMLFormatUtil.format(text, start, end, !insertSpaces, insertSpaces ? tabSize : 1, 120, false, true, lineBreak);
		const formatedStart: number = result.formatedStart;
		const formatedEnd: number = result.formatedEnd;
		const textEdit: monaco.languages.TextEdit = {
			text: result.formatedText,
			range: monaco.Range.fromPositions(xmlDocument.positionAt(formatedStart), xmlDocument.positionAt(formatedEnd))
		};
		return [textEdit];
	}

	private registerCommand(editor: monaco.editor.IStandaloneCodeEditor): void {
		// see https://github.com/microsoft/monaco-editor/issues/900
		(editor as any)._commandService.addCommand({
			id: 'editor.action.moveCursorLeftAndTriggerSuggest',
			handler: (_: any, ...args: any[]) => {
				// 把光标前移一格
				const newSelection: monaco.Selection[] = [];
				for (const sel of editor.getSelections()) {
					newSelection.push(new monaco.Selection(sel.selectionStartLineNumber, sel.selectionStartColumn - 1, sel.positionLineNumber, sel.positionColumn - 1));
				}
				editor.setSelections(newSelection);
				// 连续操作两次editor会无效，需要添加延迟
				setTimeout(() => {
					editor.trigger('', 'editor.action.triggerSuggest', null);
				}, 0);
			},
		});

		(editor as any)._commandService.addCommand({
			id: 'editor.action.egretEXmlInsertNamespace',
			handler: (_: any, ...args: any[]) => {
				console.log('-----------', args);
				if (!args || !args[0]) { return; }
				const instance = this.instanceMap[editor.getId()];
				if (instance) {
					const start = instance.doc.positionAt(args[0].offset);
					editor.executeEdits('InsertNamespace', [{
						range: monaco.Range.fromPositions(start, start),
						text: args[0].value
					}]);
				}
			},
		});
	}

	private getInstance(modelUri: monaco.Uri): CodeEditorInstance {
		for (const key in this.instanceMap) {
			const instance = this.instanceMap[key];
			if (instance.modelUri === modelUri) {
				return instance;
			}
		}
		return null;
	}

	public attachEditor(editor: monaco.editor.IStandaloneCodeEditor): void {
		const instance = this.instanceMap[editor.getId()];
		if (instance) {
			return;
		}
		this.registerCommand(editor);
		const disposables: monaco.IDisposable[] = [];

		disposables.push(editor.onDidChangeModel((e) => this.didChangeModel_handler(editor, e)));
		disposables.push(editor.onDidChangeModelContent((e) => this.didChangeModelContent_handler(editor, e)));
		const model = editor.getModel();
		const doc = new XMLDocument(model.uri.toString(), model.getValue());
		this.instanceMap[editor.getId()] = {
			editorId: editor.getId(),
			modelUri: model.uri,
			editor: editor,
			doc: doc,
			monacoDisposables: disposables
		};
	}

	private didChangeModel_handler(editor: monaco.editor.IStandaloneCodeEditor, e: monaco.editor.IModelChangedEvent): void {
		const instance = this.instanceMap[editor.getId()];
		if (!instance) {
			return;
		}
		instance.modelUri = e.newModelUrl;
		instance.doc = new XMLDocument(e.newModelUrl.toString(), editor.getModel().getValue());
		this.errorCheck(instance.modelUri);
	}

	private didChangeModelContent_handler(editor: monaco.editor.IStandaloneCodeEditor, e: monaco.editor.IModelContentChangedEvent): void {
		const instance = this.instanceMap[editor.getId()];
		if (!instance) {
			return;
		}
		if (e.isFlush) {
			instance.doc = new XMLDocument(editor.getModel().uri.toString(), editor.getModel().getValue());
		} else {
			instance.doc.update(e);
		}
		this.errorCheck(instance.modelUri);
	}

	public detachEditor(editor: monaco.editor.IStandaloneCodeEditor): void {
		const instance = this.instanceMap[editor.getId()];
		if (!instance) {
			return;
		}
		dispose(instance.monacoDisposables);
		delete this.instanceMap[editor.getId()];
	}
}