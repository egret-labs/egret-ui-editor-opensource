import { IEditor } from 'egret/editor/core/editors';
import { Panel } from '../../parts/browser/panel';
import { EditorInput } from '../common/input/editorInput';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IFileEditorModel, StateChange } from '../core/models';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { IFileStat } from '../../platform/files/common/files';
import { IWorkbenchEditorService } from '../../workbench/services/editor/common/ediors';
import { Emitter, Event } from 'egret/base/common/event';
import { localize } from 'egret/base/localization/nls';


/**
 * 编辑器底层抽象类
 */
export abstract class BaseEditor extends Panel implements IEditor {
	protected _input: EditorInput;
	protected _IsPreview: boolean;
	protected _onViewChanged: Emitter<void>;
	constructor(
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IWorkbenchEditorService protected editorService: IWorkbenchEditorService
	) {
		super('', '', null, '', instantiationService);
		this._onViewChanged = new Emitter<void>();
	}

	public get onViewChanged(): Event<void> {
		return this._onViewChanged.event;
	}
	/**
	 * 窗体关闭
	 */
	public doClose():void{

	}
	/**
	 * 焦点进入
	 */
	public doFocusIn():void{

	}
	/**
	 * 焦点移出
	 */
	public doFocusOut():void{

	}


	/**
	 * 编辑器的输入流
	 */
	public get input(): EditorInput {
		return this._input;
	}

	/**
	 * 这个编辑器类型的标识
	 */
	public getEditorId(): string {
		return '';
	}

	/**
	 * 设置当前编辑器的input
	 */
	public setInput(input: EditorInput): Promise<void> {
		this._input = input;
		//编辑器的id就是文件路径
		this.setId(this._input.getResource().fsPath);
		return Promise.resolve(null);
	}

	/**
	 * 当前编辑器是否为预览状态
	 */
	public get isPreview(): boolean {
		return this._IsPreview;
	}

	/**
	 * 设置编辑器状态
	 * @param isPreview 
	 */
	public setPreview(isPreview: boolean): void {
		this._IsPreview = isPreview;
	}

	private modelUnbind: IDisposable[] = [];
	/**
	 * 更新当前编辑器的数据模块
	 * @param model 
	 */
	protected updateModel(model: IFileEditorModel): void {
		dispose(this.modelUnbind);
		this.modelUnbind.push(model.onFileDiskUpdate(e => this.fileDiskUpdate_handler(e)));
		this.modelUnbind.push(model.onFileDiskUpdateDirty(e => this.fileDiskUpdateDirty_handler(e)));
		this.modelUnbind.push(model.onFileRemove(e => this.fileRemoved_handler()));
		this.modelUnbind.push(model.onFileRemoveDirty(e => this.fileRemovedDirty_handler()));
		this.modelUnbind.push(model.onDidStateChange(e => this.modelStateChanged_handler(e)));
		this.updateTitle();
	}

	protected fileDiskUpdate_handler(model: IFileEditorModel): void {
		this.updateModel(model);
	}

	protected fileDiskUpdateDirty_handler(fileStat: IFileStat): void {
		//TODO 目前还没想好怎么处理
	}

	protected fileRemoved_handler(): void {
		this.editorService.closeEditor(this);
	}

	private fileRemoved: boolean = false;
	protected fileRemovedDirty_handler(): void {
		this.fileRemoved = true;
		this.updateTitle();
	}

	protected modelStateChanged_handler(e: StateChange): void {
		if (e == StateChange.DIRTY) {
			this.updateTitle();
		}
	}

	protected updateTitle(): void {
		let title = this.input.getTitle();
		this.isDirty().then((dirty)=> {
			if (dirty) {
				title = '*' + title;
				this.setPreview(false);
			}
			if (this.fileRemoved) {
				title += `(${localize('exml.editor.deleted', 'deleted')})`;
			}
			this.setTitle(title);
			this.refresh();
		});
	}

	protected async isDirty(): Promise<boolean> {
		return this.getModel().then(model => {
			return model.isDirty();
		});
	}

	/**
	 * 清除当前编辑器的input
	 */
	public clearInput(): void {
		this._input = null;
	}

	/**
	 * 当前编辑器的数据模块
	 */
	public getModel(): Promise<IFileEditorModel> {
		return null;
	}

	/**
	 * 渲染内容
	 * @param container 
	 */
	public renderContent(container: HTMLElement): void {
		container.tabIndex = 0;
	}
	
	/**
	 * 释放
	 */
	public dispose(): void {
		this._input = null;
		this.editorService = null;
		this.modelUnbind = dispose(this.modelUnbind);
		super.dispose();
	}

}