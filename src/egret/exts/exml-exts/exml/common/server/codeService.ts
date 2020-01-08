import { ICodeService } from './ICodeService';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { XMLDocument } from '../../common/core/XMLDocument';
import { EXMLContentAssistProcessor } from '../contentassist/EXMLContentAssistProcessor';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { dispose } from 'egret/base/common/lifecycle';

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
	_serviceBrand: any;

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
		});
	}

	private registerCompletionItemProvider(): void {
		monaco.languages.registerCompletionItemProvider('xml', {
			triggerCharacters: [':', '<', '\'', '\'', ' ', '.', '/'],
			provideCompletionItems: (model, position, context, token) => {
				if (!this.contentAssistProcessor.inited) {
					return {
						suggestions: []
					};
				}
				try {
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