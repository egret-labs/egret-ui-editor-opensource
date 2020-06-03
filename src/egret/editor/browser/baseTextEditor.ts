import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { StateChange } from 'egret/editor/core/models';
import { Event, Emitter } from 'egret/base/common/event';

/**
 */
export class BaseTextEditor implements IDisposable {

	private container: HTMLElement;
	protected _isActive: boolean;
	private monacoDisposables: monaco.IDisposable[] = [];
	protected editor: monaco.editor.IStandaloneCodeEditor;
	private _isDirty: boolean = false;
	protected _isContentChanged: boolean = false;
	private _alternativeVersionId: number = -1;
	protected _onDirtyStateChanged: Emitter<boolean> = new Emitter<boolean>();

	public get onDirtyStateChanged(): Event<boolean> {
		return this._onDirtyStateChanged.event;
	}
	/**
	 *
	 */
	constructor() {
	}
	/**
	 * 初始化
	 * @param container 
	 */
	public init(container: HTMLElement, language: string = 'xml'): void {
		this.onInit(container, language);
	}

	protected onInit(container: HTMLElement, language: string = 'xml'): void {
		this.container = container;
		this.editor = monaco.editor.create(container, {
			value: '',
			language: language,
			fontFamily: 'Consolas, "Courier New", monospace',
			contextmenu: true,
			minimap: { enabled: false },
			theme: 'vs-dark'
		});
		// DEBUG
		// const actions = (this.editor as any).getActions();
		// actions.forEach(element => {
		// 	console.log(element.id);
		// });
		// 禁用Command Palette快捷键
		// https://github.com/Microsoft/monaco-editor/issues/419
		this.editor.addCommand(monaco.KeyCode.F1, () => {
			// do nothing.
		});
		this.monacoDisposables.push(this.editor.onDidChangeModelContent((e) => this.didChangeModelContent_handler(e)));
	}

	private didChangeModelContent_handler(e: monaco.editor.IModelContentChangedEvent): void {
		this._isContentChanged = true;
		if (e.isFlush) {
			this.resetDirtyState();
		} else {
			this.upateDirtyState();
		}
	}

	/**
	 */
	public get isDirty(): boolean {
		return this._isDirty;
	}

	public get isContentChanged(): boolean {
		return this._isContentChanged;
	}


	public setActive(active: boolean): Promise<void> {
		this._isActive = active;
		return Promise.resolve();
	}

	public getText(): string {
		return this.editor.getValue();
	}

	/**
	 * 重置状态
	 */
	public resetState(): void {
		this._isContentChanged = false;
		this.resetDirtyState();
		this.upateDirtyState();
	}

	public layout(): void {
		this.editor.layout();
	}

	private resetDirtyState(): void {
		this._alternativeVersionId = this.editor.getModel().getAlternativeVersionId();
		const fire = this._isDirty;
		this._isDirty = false;
		if (fire) {
			this._onDirtyStateChanged.fire(false);
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
			this._onDirtyStateChanged.fire(dirty);
		}
		// console.log('CodeEditor, isDirty: ', this._isDirty);
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		dispose(this.monacoDisposables);
		this.editor.dispose();
	}
}