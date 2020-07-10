import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { StateChange } from 'egret/editor/core/models';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { BaseTextEditor } from 'egret/editor/browser/baseTextEditor';
import { ResFileEditorModel } from './resEditorModel';
import { ResModel } from '../common/model/ResModel';

/**
 */
export class ResCodeEditor extends BaseTextEditor {

	private resFileModel: ResFileEditorModel;
	/**
	 *
	 */
	constructor(
		@IEgretProjectService protected egretProjectService: IEgretProjectService
	) {
		super();
	}

	public setup(editorModel: ResFileEditorModel): void {
		this.resFileModel = editorModel;
		this.detachEventListener();
		this.attachEventListener();
		if (!editorModel) {
			this.clear();
		} else {
			this.setText(editorModel.getValue());
			this.resetState();
		}
	}

	public async setActive(active: boolean): Promise<void> {
		await super.setActive(active);
		if (!active) {
			await this.syncText();
		} else {
			if (this._isActive && this.textChanged()) {
				this.executeEdits(this.resFileModel.getValue());
			}
			this.editor.focus();
		}
	}

	/**
	 * 设置编辑器文本内容
	 * @param text 
	 */
	private setText(text: string): void {
		this.editor.setValue(text);
	}

	public syncText(): Promise<void> {
		if (this.textChanged() && this.resFileModel) {
			return this.resFileModel.updateValue(this.getText()).catch((err)=> {
				console.log(err);
			});
			// this.resetState();
		}
		return Promise.resolve();
	}

	/**
	 * 清空
	 */
	private clear(): void {
		this.editor.setValue('');
	}

	private modelDisposables: IDisposable[] = [];
	private attachEventListener(): void {
		if (this.resFileModel) {
			this.modelDisposables.push(this.resFileModel.onDidStateChange(e => this.resFileModeStateChanged_handler(e)));
		}
	}
	private detachEventListener(): void {
		dispose(this.modelDisposables);
		this.modelDisposables = [];
	}

	private resFileModeStateChanged_handler(e: StateChange): void {
		if (e === StateChange.SAVED) {
			this.resetState();
		}
		if (e === StateChange.CONTENT_CHANGE) {
			if (this._isActive && this.textChanged()) {
				this.executeEdits(this.resFileModel.getValue());
			}
		}
	}

	private textChanged(): boolean {
		if (!this.resFileModel) {
			return false;
		}
		const text = this.resFileModel.getValue();
		const current = this.editor.getValue();
		return text !== current;
	}

	public executeEdits(value: string): void {
		this.editor.executeEdits('edit res code', [{
			range: this.editor.getModel().getFullModelRange(),
			text: value,
			forceMoveMarkers: true
		}]);
	}

	public pushUndoStop(): boolean {
		return this.editor.pushUndoStop();
	}
}