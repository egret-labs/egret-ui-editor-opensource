import { ICodeView, ICodeViewContainer } from './editors';
import { CodeEditor } from './codeeditor/CodeEditor';
import { IExmlFileEditorModel } from '../common/exml/models';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IEgretProjectService } from '../../project';
import { Emitter, Event } from 'egret/base/common/event';

export class CodeView implements ICodeView {
	private codeEditor: CodeEditor;
	private _onDirtyStateChanged: Emitter<boolean>;

	constructor(
		protected rootContainer: ICodeViewContainer,
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IEgretProjectService protected egretProjectService: IEgretProjectService,
	) {
		this._onDirtyStateChanged = new Emitter<boolean>();
		this.codeEditor = this.instantiationService.createInstance(CodeEditor);
		this.initView();
	}

	/**
	 * 脏状态变化
	 */
	public get onDirtyStateChanged(): Event<boolean> {
		return this._onDirtyStateChanged.event;
	}

	private _container: HTMLElement;
	/**
	 * 得到核心容器
	 */
	public get container(): HTMLElement {
		return this._container;
	}

	protected initView(): void {
		this._container = document.createElement('div');
		this._container.setAttribute('className', 'codeview-container');
		this._container.style.width = '100%';
		this._container.style.height = '100%';
		this._container.style.position = 'absolute';
		this._container.style.top = '0';
		this._container.style.left = '0';
		this._container.style.zIndex = '0';

		this.rootContainer.addCodeView(this);

		this.codeEditor.init(this._container);
		this.enableCodeEditorInteractive();
	}

	protected modelDisposables: IDisposable[] = [];
	protected _model: IExmlFileEditorModel;
	/**
	 * 当前视图的exml数据层
	 */
	public getModel(): IExmlFileEditorModel {
		return this._model;
	}
	/**
	 * 当前视图的exml数据层
	 */
	public setModel(value: IExmlFileEditorModel): void {
		if (this._model == value) {
			return;
		}
		this.codeEditor.setup(value);
	}

	private codeDisposables: IDisposable[] = [];
	private disableCodeEditorInteractive(): void {
		this.codeDisposables = dispose(this.codeDisposables);
	}

	private enableCodeEditorInteractive(): void {
		this.disableCodeEditorInteractive();
		this.codeDisposables.push(this.codeEditor.onDirtyStateChanged(this.onCodeEditorDirtyStateChanged, this));
	}

	private onCodeEditorDirtyStateChanged(e: boolean): void {
		// console.log('dirty state', e.data);
		this._onDirtyStateChanged.fire(e);
	}

	public setActive(active: boolean): void {
		this.codeEditor.setActive(active);
	}

	public syncModelData(): void {
		this.codeEditor.syncText();
	}

	/**
	 * 刷新布局
	 */
	public doResize(): void {
		this.codeEditor.layout();
	}


	private disposed: boolean = false;
	/* -------------------------------- 生命周期结束 -------------------------------- */
	/**
	 * 释放
	 */
	public dispose() {
		if (this.disposed) {
			return;
		}
		this.disposed = true;
		this.disableCodeEditorInteractive();
		dispose(this.codeEditor);
		if (this.rootContainer) {
			this.rootContainer.removeCodeView(this);
		}
		this.rootContainer = null;
	}
}