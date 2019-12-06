import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { EventDispatcher, Event } from "../exmleditor/EventDispatcher";
import { IExmlFileEditorModel, RootChangedEvent, TextChangedEvent } from "../../common/exml/models";
import * as xmlStrUtil from '../../common/sax/xml-strUtils';
import { isInstanceof, INode } from '../../common/exml/treeNodes';
import { StateChange } from 'egret/editor/core/models';

/**
 */
export class CodeEditor extends EventDispatcher implements IDisposable {

	private container: HTMLElement;
	private _isActive: boolean;
	private exmlFileModel: IExmlFileEditorModel;
	private editor: monaco.editor.IStandaloneCodeEditor;
	private _isDirty: boolean = false;
	private _alternativeVersionId: number = -1;

	/**
	 * 初始化
	 * @param container 
	 */
	public init(container: HTMLElement): void {
		this.container = container;
		this.editor = monaco.editor.create(container, {
			value: '',
			language: 'xml',
			contextmenu: true,
			minimap: { enabled: false },
			theme: 'vs-dark'
		});
		this.editor.onContextMenu((e) => {
			console.log('context menu');
		});
		this.editor.onDidChangeModelContent((e) => {
			if (e.isFlush) {
				this.resetDirtyState();
			} else {
				this.upateDirtyState();
			}
		});
	}

	public setup(exmlModel: IExmlFileEditorModel): void {
		this.exmlFileModel = exmlModel;
		this.detachEventListener();
		this.attachEventListener();
		if (!exmlModel) {
			this.clear();
		}
	}

	/**
	 */
	public get isDirty(): boolean {
		return this._isDirty;
	}

	public setActive(active: boolean): void {
		this._isActive = active;
		if (!active) {
			this.syncText();
			this.updateSelectedNodeBySelection();
		} else {
			this.updateSelectionBySelectedNode();
		}
	}

	/**
	 * 设置编辑器文本内容
	 * @param text 
	 */
	private setText(text: string): void {
		this.editor.setValue(text);
		this.resetState();
	}

	public syncText(): void {
		if (this.isDirty && this.exmlFileModel) {
			const model = this.exmlFileModel.getModel();
			if (model) {
				model.insertText(this.getText(), 0, 2147483647, true, false);
				this.resetState();
			}
		}
	}

	public getText(): string {
		return this.editor.getValue();
	}

	/**
	 * 清空
	 */
	private clear(): void {
		this.editor.setValue('');
	}

	/**
	 * 重置状态
	 */
	public resetState(): void {
		this.resetDirtyState();
		this.upateDirtyState();
	}

	public layout(): void {
		this.editor.layout();
	}

	private modelDisposables: IDisposable[] = [];
	private attachEventListener(): void {
		if (this.exmlFileModel) {
			const model = this.exmlFileModel.getModel();
			this.modelDisposables.push(model.onRootChanged(e => this.rootChanged_handler(e)));
			this.modelDisposables.push(model.onTextChanged(e => this.textChanged_handler(e)));
			this.modelDisposables.push(this.exmlFileModel.onDidStateChange(e => this.exmlFileModeStateChanged_handler(e)));
		}
	}
	private detachEventListener(): void {
		dispose(this.modelDisposables);
		this.modelDisposables = [];
	}

	private rootChanged_handler(e: RootChangedEvent): void {
		if (this.textChanged()) {
			this.setText(e.target.getText());
		}
	}

	private textChanged_handler(e: TextChangedEvent): void {
		if (this.textChanged()) {
			this.editor.executeEdits('edit exml code', [{
				range: this.editor.getModel().getFullModelRange(),
				text: e.target.getText(),
				forceMoveMarkers: true
			}]);
		}
	}

	private textChanged(): boolean {
		if (!this.exmlFileModel) {
			return false;
		}
		const text = this.exmlFileModel.getModel().getText();
		const current = this.editor.getValue();
		return text !== current;
	}

	private exmlFileModeStateChanged_handler(e: StateChange): void {
		if (e === StateChange.DIRTY && !this.exmlFileModel.isDirty()) {
			this.resetState();
		}
		if (e === StateChange.SAVED) {
			this.resetState();
		}
	}

	private resetDirtyState(): void {
		this._alternativeVersionId = this.editor.getModel().getAlternativeVersionId();
		const fire = this._isDirty;
		this._isDirty = false;
		if (fire) {
			this.dispatchEvent(new Event('onDirtyStateChanged', false))
		}
	}

	private upateDirtyState(): void {
		const id = this.editor.getModel().getAlternativeVersionId();
		if (this._alternativeVersionId === -1) {
			this._alternativeVersionId = id;
		}
		const dirty = !(id === this._alternativeVersionId);
		if (this._isDirty !== dirty) {
			this._isDirty = dirty;
			this.dispatchEvent(new Event('onDirtyStateChanged', dirty))
		}
		console.log('CodeEditor, isDirty: ', this._isDirty);
	}

	private updateSelectionBySelectedNode(): void {
		if (!this.exmlFileModel) {
			return;
		}
		const exmlModel = this.exmlFileModel.getModel();
		const textModel = this.editor.getModel();
		if (exmlModel && textModel && !textModel.isDisposed() && exmlModel.getSelectedNodes().length > 0) {
			const text = textModel.getValue(monaco.editor.EndOfLinePreference.TextDefined, true);
			const selections = exmlModel.getSelectedNodes();
			const codeRanges: monaco.Range[] = [];
			for (var i = 0; i < selections.length; i++) {
				const ranges = xmlStrUtil.findRangeByPath(text, selections[i].getXmlPath(),
					exmlModel.getCurrentState(), exmlModel.getStates());
				let start = ranges[0];
				let end = ranges[1] + 1;
				const lines = textModel.getLinesContent();

				let startLine: number = -1;
				let startChar: number = -1;
				let endLine: number = -1;
				let endChar: number = -1;
				for (let j = 0; j < lines.length; j++) {
					const currentLineLen = lines[j].length + textModel.getEOL().length;
					if (start >= currentLineLen) {
						start -= currentLineLen;
					} else if (startLine === -1) {
						startLine = j;
						startChar = start;
					}
					if (end >= currentLineLen) {
						end -= currentLineLen;
					} else if (endLine === -1) {
						endLine = j;
						endChar = end;
					}
					if (startLine !== -1 && endLine !== -1) {
						break;
					}
				}
				if (startLine !== -1 && endLine !== -1) {
					codeRanges.push(new monaco.Range(startLine + 1, startChar + 1, endLine + 1, endChar + 1));
				}
			}
			const codeEditor = this.editor;
			if (codeEditor && codeRanges.length >= 1) {
				const codeSelections: monaco.ISelection[] = [];
				for (var i = 0; i < codeRanges.length; i++) {
					codeSelections.push({
						selectionStartLineNumber: codeRanges[i].startLineNumber,
						selectionStartColumn: codeRanges[i].startColumn,
						positionLineNumber: codeRanges[i].endLineNumber,
						positionColumn: codeRanges[i].endColumn
					});
				}
				codeEditor.setSelections(codeSelections);
				codeEditor.revealLinesInCenter(codeSelections[0].selectionStartLineNumber, codeSelections[codeSelections.length - 1].positionLineNumber);
			}
		}
	}

	private updateSelectedNodeBySelection(): void {
		if (!this.exmlFileModel) {
			return;
		}
		if (this.editor) {
			const selections = this.editor.getSelections();
			if (!selections || selections.length === 0) {
				return;
			}
			const exmlModel = this.exmlFileModel.getModel();
			const textModel = this.editor.getModel();
			if (exmlModel && textModel && !textModel.isDisposed()) {
				const text = textModel.getValue(monaco.editor.EndOfLinePreference.TextDefined, true);
				const lines = textModel.getLinesContent();
				const nodes: INode[] = [];
				for (var i = 0; i < selections.length; i++) {
					let pos = 0;
					for (let j = 0; j < selections[i].startLineNumber - 1; j++) {
						pos += lines[j].length + textModel.getEOL().length;
					}
					pos += selections[i].startColumn;
					const path = xmlStrUtil.findPathAtPos(text, pos, exmlModel.getCurrentState(), exmlModel.getStates());
					var node = exmlModel.getNodeByXmlPath(path);
					if (node && isInstanceof(node, 'eui.INode')) {
						nodes.push(node);
					}
				}
				for (var i = 0; i < exmlModel.getSelectedNodes().length; i++) {
					var node = exmlModel.getSelectedNodes()[i];
					node.setSelected(false);
				}
				for (var i = 0; i < nodes.length; i++) {
					nodes[i].setSelected(true);
				}
			}
		}
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.editor.dispose();
	}
}