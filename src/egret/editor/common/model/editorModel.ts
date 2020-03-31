import URI from 'egret/base/common/uri';
import { Emitter, Event } from 'egret/base/common/event';
import { IDisposable, Disposable, dispose } from 'egret/base/common/lifecycle';
import { IEditorModel, IFileEditorModel, StateChange, IInnerModel } from '../../core/models';
import { IFileService, IFileStat, IContent } from 'egret/platform/files/common/files';
import { IFileModelService } from '../../../workbench/services/editor/common/models';
import { INotificationService } from 'egret/platform/notification/common/notifications';

/**
 * 编辑器数据层基类
 */
export abstract class EditorModel extends Disposable implements IEditorModel {
	private disposed: boolean;
	private readonly _onDispose: Emitter<void>;
	constructor() {
		super();
		this.disposed = false;
		this._onDispose = new Emitter<void>();
	}
	/**
	 * 当释放这个数据层的时候派发
	 */
	public get onDispose(): Event<void> {
		return this._onDispose.event;
	}
	/**
	 * 重新加载
	 */
	public reload(): Promise<IEditorModel> {
		return Promise.resolve(this);
	}

	/**
	 * 加载这个数据模块
	 */
	public load(): Promise<IEditorModel> {
		return Promise.resolve(this);
	}
	/**
	 * 返回这个数据model是否已经被加载过
	 */
	public abstract isResolved(): boolean;
	/**
	 * 是否已经释放
	 */
	public isDisposed(): boolean {
		return this.disposed;
	}
	/**
	 * 释放这个数据模块
	 */
	public dispose(): void {
		this.disposed = true;
		this._onDispose.fire();
		this._onDispose.dispose();
		super.dispose();
	}
}


//TODO 目前还没有考虑到直接新建一个空的model的处理
/**
 * 文件编辑器数据层
 */
export abstract class FileEditorModel extends EditorModel implements IFileEditorModel {

	private resource: URI;
	private toDispose: IDisposable[];

	private dirty: boolean;
	private mtime: number = -1;

	private readonly _onDidStateChange: Emitter<StateChange>;
	private readonly _onFileDiskUpdateDirty: Emitter<IFileStat>;
	private readonly _onFileRemoveDirty: Emitter<IFileStat>;
	private readonly _onFileDiskUpdate: Emitter<IFileEditorModel>;
	private readonly _onFileRemove: Emitter<IFileStat>;


	private resolved: boolean;

	constructor(
		resource: URI,
		@IFileService protected fileService: IFileService,
		@IFileModelService protected fileModelService: IFileModelService,
		@INotificationService protected notificationService:INotificationService
	) {
		super();

		this.resolved = false;

		this.resource = resource;
		this.toDispose = [];

		this._onDidStateChange = new Emitter<StateChange>();

		this._onFileDiskUpdate = new Emitter<IFileEditorModel>();
		this._onFileRemove = new Emitter<IFileStat>();

		this._onFileDiskUpdateDirty = new Emitter<IFileStat>();
		this._onFileRemoveDirty = new Emitter<IFileStat>();

		this.toDispose.push(this._onDidStateChange);
		this.toDispose.push(this._onFileDiskUpdate);
		this.toDispose.push(this._onFileRemove);

		this.registerListeners();
	}

	private registerListeners(): void {

	}

	/**
	 * 状态改变事件
	 */
	public get onDidStateChange(): Event<StateChange> {
		return this._onDidStateChange.event;
	}
	/**
	 * 文件被修改事件
	 */
	public get onFileDiskUpdate(): Event<IFileEditorModel> {
		return this._onFileDiskUpdate.event;
	}
	/**
	 * 文件删除事件
	 */
	public get onFileRemove(): Event<IFileStat> {
		return this._onFileRemove.event;
	}

	/**
	 * 文件被修改事件
	 */
	public get onFileDiskUpdateDirty(): Event<IFileStat> {
		return this._onFileDiskUpdateDirty.event;
	}
	/**
	 * 文件删除事件
	 */
	public get onFileRemoveDirty(): Event<IFileStat> {
		return this._onFileRemoveDirty.event;
	}

	/**
	 * 当前model对应的资源
	 */
	public getResource(): URI {
		return this.resource;
	}
	/**
	 * 重新加载
	 */
	public reload(): Promise<IEditorModel> {
		if (this.mtime == -1) {
			//如果为-1则表示从未加载过
			return;
		}
		//如果没有resource，则可能是通过新建的方式得来的，则返回
		if (!this.getResource()) {
			return;
		}
		let nextPromise = this.loadingPromise;
		if (!nextPromise) {
			nextPromise = Promise.resolve(this);
		}
		nextPromise.then(() => {
			this.fileService.existsFile(this.getResource()).then(exist => {
				if (exist) {
					this.fileService.resolveFile(this.getResource()).then(value => {
						if (this.mtime != value.mtime) {
							if (this.isDirty()) {
								this._onFileDiskUpdateDirty.fire(value);
							} else {
								this.load().then(result => {
									this._onFileDiskUpdate.fire(result);
								});
							}
						}
					});
				} else {
					if (this.isDirty()) {
						this._onFileRemoveDirty.fire();
					} else {
						this._onFileRemove.fire();
						this.fileModelService.disposeModel(this.resource);
					}
				}
			});
		});
	}
	protected _model: IInnerModel;
	/**
	 * 得到内部数据模块
	 */
	public getModel(): IInnerModel {
		return this._model;
	}

	private loadingPromise: Promise<IFileEditorModel> = null;
	/**
	 * 加载当前的数据模块
	 */
	public load(focus: boolean = false): Promise<IFileEditorModel> {
		if (!focus) {
			if (this.dirty) {
				return Promise.resolve(this);
			}
		}
		this.loadingPromise = this.loadFromFile();
		return this.loadingPromise.then(value => {
			this.loadingPromise = null;
			return value;
		});
	}

	private loadFromFile(): Promise<IFileEditorModel> {
		//TODO 派发内容改变事件
		return this.fileService.resolveFile(this.getResource()).then(fileStat => {
			if (this.mtime != fileStat.mtime) {
				return this.fileService.resolveContent(this.getResource())
					.then(content => this.loadWithContent(content))
					.then(value => {
						this.firDidStateChange();
						this.setDirty(false);
						this.mtime = fileStat.mtime;
						return value;
					});
			}
			return this;
		});
	}

	private loadWithContent(content: IContent): Promise<IFileEditorModel> {
		return this.doLoadWithContent(content).then(value => {
			this.resolved = true;
			return value;
		});
	}

	private doLoadWithContent(content: IContent): Promise<IFileEditorModel> {
		if (this.getModel()) {
			return this.doUpdateModel(content.value, this.getModel()).then(model => {
				this._model = model;
				return this;
			});
		}
		return this.doCreateModel(content.value).then(model => {
			this._model = model;
			return this;
		});
	}

	protected firDidStateChange(): void {
		this._onDidStateChange.fire(StateChange.CONTENT_CHANGE);
	}

	protected abstract doUpdateModel(value: string, model: IInnerModel): Promise<IInnerModel>;

	protected abstract doCreateModel(value: string): Promise<IInnerModel>;

	/**
	 * 保存当前数据模块
	 */
	public save(): Promise<void> {
		return this.doSave(this.resource).then(fileStat => {
			this.mtime = fileStat.mtime;
			this.setDirty(false);
		});
	}
	/**
	 * 另存为当前数据模块
	 */
	public saveAs(resource: URI): Promise<void> {
		return this.doSave(resource).then(fileStat => {
			this.resource = resource;
			this.mtime = fileStat.mtime;
			this.setDirty(false);
		});
	}

	protected doSave(resource: URI): Promise<IFileStat> {
		this._onDidStateChange.fire(StateChange.SAVING);
		return new Promise<IFileStat>((resolve, reject) => {
			this.doCreateValueFromModel(this.getModel()).then(text => {
				this.fileService.updateContent(resource, text).then(fileStat => {
					this._onDidStateChange.fire(StateChange.SAVED);
					resolve(fileStat);
				}, error => {
					this.notificationService.error({content:error,duration:3});
					this._onDidStateChange.fire(StateChange.SAVE_ERROR);
					reject(error);
				});
			}, error => {
				this.notificationService.error({content:error,duration:3});
				this._onDidStateChange.fire(StateChange.SAVE_ERROR);
				reject(error);
			});
		});
	}

	protected abstract doCreateValueFromModel(model: IInnerModel): Promise<string>;

	/**
	 * 当前模块是否脏了
	 */
	public isDirty(): boolean {
		return this.dirty;
	}
	/**
	 * 更新当前模块是否脏了
	 * @param dirty 
	 */
	protected setDirty(dirty: boolean): void {
		if (this.dirty == dirty) {
			return;
		}
		this.dirty = dirty;
		this._onDidStateChange.fire(StateChange.DIRTY);
	}
	
	/**
	 * 立即检查模块是否脏了
	 */
	public updateDirty(): void {
	}

	/**
	 * 这个数据model是否已经被加载过
	 */
	public isResolved(): boolean {
		return this.resolved;
	}
	/**
	 * 是否可以撤销
	 */
	public getCanUndo(): boolean {
		return false;
	}
	/**
	 * 撤销
	 */
	public undo(): void {
	}
	/**
	 * 是否可以重做
	 */
	public getCanRedo(): boolean {
		return false;
	}
	/**
	 * 重做
	 */
	public redo(): void {

	}
	/**
	 * 释放
	 */
	public dispose(): void {
		this.toDispose = dispose(this.toDispose);
		this.fileModelService = null;
		super.dispose();
	}
}