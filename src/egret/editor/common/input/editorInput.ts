import { Emitter, Event } from 'egret/base/common/event';
import URI from 'egret/base/common/uri';
import { dispose, IDisposable } from 'egret/base/common/lifecycle';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IFileModelService, ConfirmResult } from 'egret/workbench/services/editor/common/models';
import * as paths from 'egret/base/common/paths';
import { IEditorInput, IFileEditorInput } from '../../core/inputs';
import { IEditorModel, FileModelChangeEvent } from '../../core/models';





/**
 * 编辑器输入流抽象基类
 */
export abstract class EditorInput implements IEditorInput {
	private readonly _onDispose: Emitter<void>;
	protected _onDidChangeDirty: Emitter<void>;
	protected _onDidChangeLabel: Emitter<void>;

	private disposed: boolean;

	public constructor() {
		this._onDidChangeDirty = new Emitter<void>();
		this._onDidChangeLabel = new Emitter<void>();
		this._onDispose = new Emitter<void>();
		this.disposed = false;
	}

	/**
	 * 当输入流的脏状态改变的时候派发
	 */
	public get onDidChangeDirty(): Event<void> {
		return this._onDidChangeDirty.event;
	}

	/**
	 * 输入流的标签改变的时候派发
	 */
	public get onDidChangeLabel(): Event<void> {
		return this._onDidChangeLabel.event;
	}

	/**
	 * 输入流释放的时候派发
	 */
	public get onDispose(): Event<void> {
		return this._onDispose.event;
	}

	/**
	 * 当前输入流的URI
	 */
	public getResource(): URI {
		return null;
	}

	/**
	 * 输入流的描述
	 */
	public getDescription(): string {
		return null;
	}

	/**
	 * 输入流的标题
	 */
	public getTitle(): string {
		return null;
	}

	/**
	 * 输入流的图标
	 */
	public getIcon(): string {
		//TODO 用注册的形式注册文件图标
		return '';
	}

	/**
	 * 输入流是否脏了
	 */
	public isDirty(): boolean {
		//TODO 根据当前input的model决定
		return false;
	}

	/**
	 * 比较两个输入流是否相同
	 * @param otherInput 
	 */
	public matches(otherInput: any): boolean {
		return this === otherInput;
	}

	/**
	 * 从输入流获取对应的编辑器model
	 */
	public abstract resolve(refresh?: boolean, instantiationService?: IInstantiationService): Promise<IEditorModel>;
	/**
	 * 确认保存
	 */
	public confirmSave(): Promise<ConfirmResult> {
		return Promise.resolve(ConfirmResult.DONT_SAVE);
	}
	/**
	 * 保存
	 */
	public abstract save():Promise<boolean>;
	/**
	 * 关闭
	 */
	public close():void{
		this.dispose();
	}


	/**
	 * 得到首选的编辑器类型Id
	 * @param candidates 
	 */
	public getPreferredEditorId(candidates: string[]): string {
		if (candidates && candidates.length > 0) {
			return candidates[0];
		}
		return null;
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.disposed = true;
		this._onDispose.fire();
	}
}





/**
 * 文件编辑器输入流
 */
export class FileEditorInput extends EditorInput implements IFileEditorInput {

	private toUnbind: IDisposable[];

	constructor(
		private resource: URI,
		private preferredEncoding: string,
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IFileModelService protected fileModelService: IFileModelService,
	) {
		super();

		this.toUnbind = [];

		this.registerListeners();
	}

	private registerListeners(): void {
		this.toUnbind.push(this.fileModelService.modelManager.onModelDirty(e => this.onDirtyStateChange(e)));
		this.toUnbind.push(this.fileModelService.modelManager.onModelSaveError(e => this.onDirtyStateChange(e)));
		this.toUnbind.push(this.fileModelService.modelManager.onModelSaved(e => this.onDirtyStateChange(e)));
	}

	private onDirtyStateChange(e: FileModelChangeEvent): void {
		if (e.resource.toString() === this.resource.toString()) {
			this._onDidChangeDirty.fire();
			this._onDidChangeLabel.fire();
		}
	}
	/**
	 * 当前输入流的URI
	 */
	public getResource(): URI {
		return this.resource;
	}

	/**
	 * 设置首选的编码类型
	 * @param encoding 
	 */
	public setPreferredEncoding(encoding: string): void {
		this.preferredEncoding = encoding;
	}
	/**
	 * 得到编码类型
	 */
	public getEncoding(): string {
		//MODEL 编码支持
		// const textModel = this.fileModelService.models.get(this.resource);
		// if (textModel) {
		// 	return textModel.getEncoding();
		// }
		return this.preferredEncoding;
	}
	/**
	 * 得到首选编码类型
	 */
	public getPreferredEncoding(): string {
		return this.preferredEncoding;
	}

	/**
	 * 设置编码类型
	 * @param encoding 
	 */
	public setEncoding(encoding: string): void {
		this.preferredEncoding = encoding;
		//TODO 编码支持
		// const textModel = this.fileModelService.models.get(this.resource);
		// if (textModel) {
		// 	textModel.setEncoding(encoding);
		// }
	}
	/**
	 * 输入流的标题
	 */
	public getTitle(): string {
		return paths.basename(this.resource.fsPath);
	}
	/**
	 * 输入流的描述
	 */
	public getDescription(): string {
		return this.resource.fsPath;
	}
	/**
	 * 输入流是否脏了
	 */
	public isDirty(): boolean {
		const model = this.fileModelService.modelManager.get(this.resource);
		if (!model) {
			return false;
		}
		return model.isDirty();
	}

	/**
	 * 从输入流获取对应的编辑器model
	 */
	public resolve(refresh?: boolean, instantiationService?: IInstantiationService): Promise<IEditorModel> {
		return this.fileModelService.modelManager.loadOrCreate(this, { encoding: this.preferredEncoding, reload: refresh }, instantiationService).then(model => {
			return model;
		});
	}
	/**
	 * 确认保存
	 */
	public confirmSave(): Promise<ConfirmResult> {
		return this.fileModelService.confirmSave([this.resource]);
	}
	/**
	 * 保存
	 */
	public save():Promise<boolean>{
		return this.fileModelService.save(this.resource);
	}
	/**
	 * 关闭
	 */
	public close():void{
		this.dispose();
	}
	/**
	 * 已经被解析
	 */
	public isResolved(): boolean {
		return !!this.fileModelService.modelManager.get(this.resource);
	}
	/**
	 * 与另一个input是否匹配
	 * @param otherInput 
	 */
	public matches(otherInput: any): boolean {
		if (super.matches(otherInput) === true) {
			return true;
		}
		if (otherInput) {
			return otherInput instanceof FileEditorInput && otherInput.resource.toString() === this.resource.toString();
		}
		return false;
	}


	/**
	 * 释放
	 */
	public dispose(): void {
		this.fileModelService.disposeModel(this.resource);
		this.toUnbind = dispose(this.toUnbind);
		super.dispose();
	}
}