import { IFileEditorModelManager, IModelLoadOrCreateOptions } from './models';
import URI from 'egret/base/common/uri';
import { ResourceMap } from 'egret/base/common/map';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { Emitter, Event, debounceEvent } from 'egret/base/common/event';
import { FileModelChangeEvent, IFileEditorModel, StateChange } from 'egret/editor/core/models';
import { FileModelRegistry } from 'egret/editor/modelRegistry';
import { IFileEditorInput } from 'egret/editor/core/inputs';
import { IFileService, FileChangeType, FileChangesEvent } from 'egret/platform/files/common/files';

/**
 * 文件编辑器数据模块管理器，管理者整个项目的所有文件的model
 */
export class FileEditorModelManager implements IFileEditorModelManager {
	private toUnbind: IDisposable[];


	private readonly _onModelDisposed: Emitter<URI>;
	private readonly _onModelContentChanged: Emitter<FileModelChangeEvent>;
	private readonly _onModelDirty: Emitter<FileModelChangeEvent>;
	private readonly _onModelSaveError: Emitter<FileModelChangeEvent>;
	private readonly _onModelSaved: Emitter<FileModelChangeEvent>;

	private _onModelsDirtyEvent: Event<FileModelChangeEvent[]>;
	private _onModelsSaveError: Event<FileModelChangeEvent[]>;
	private _onModelsSaved: Event<FileModelChangeEvent[]>;
	private _onModelsReverted: Event<FileModelChangeEvent[]>;

	private mapResourceToDisposeListener: ResourceMap<IDisposable>;
	private mapResourceToModel: ResourceMap<IFileEditorModel>;
	private mapResourceToStateChangeListener: ResourceMap<IDisposable>;
	private mapResourceToModelContentChangeListener: ResourceMap<IDisposable>;
	private mapResourceToPendingModelLoaders: ResourceMap<Promise<IFileEditorModel>>;

	// TODO 生命周期，在窗体关闭的时候结束掉
	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IFileService protected fileService: IFileService,
	) {
		this.toUnbind = [];

		this._onModelDisposed = new Emitter<URI>();
		this._onModelContentChanged = new Emitter<FileModelChangeEvent>();
		this._onModelDirty = new Emitter<FileModelChangeEvent>();
		this._onModelSaveError = new Emitter<FileModelChangeEvent>();
		this._onModelSaved = new Emitter<FileModelChangeEvent>();

		this.toUnbind.push(this._onModelDisposed);
		this.toUnbind.push(this._onModelContentChanged);
		this.toUnbind.push(this._onModelDirty);
		this.toUnbind.push(this._onModelSaveError);
		this.toUnbind.push(this._onModelSaved);

		this.mapResourceToModel = new ResourceMap<IFileEditorModel>();
		this.mapResourceToDisposeListener = new ResourceMap<IDisposable>();
		this.mapResourceToStateChangeListener = new ResourceMap<IDisposable>();
		this.mapResourceToModelContentChangeListener = new ResourceMap<IDisposable>();
		this.mapResourceToPendingModelLoaders = new ResourceMap<Promise<IFileEditorModel>>();

		this.registerListeners();
	}

	private registerListeners(): void {
		this.toUnbind.push(this.fileService.onFileChanges(e => this.onFileChanges(e)));
	}

	private onFileChanges(e: FileChangesEvent): void {
		this.mapResourceToModel.forEach((resource: URI, model: IFileEditorModel) => {
			const modelFileDeleted = e.contains(resource, FileChangeType.DELETED);
			const modelFileUpdate = e.contains(resource, FileChangeType.UPDATED);
			if(modelFileDeleted || modelFileUpdate){
				model.reload();
			}
		});
	}


	/**
	 * 模块释放事件
	 */
	public get onModelDisposed(): Event<URI> {
		return this._onModelDisposed.event;
	}
	/**
	 * 模块改变事件
	 */
	public get onModelContentChanged(): Event<FileModelChangeEvent> {
		return this._onModelContentChanged.event;
	}
	/**
	 * 模块脏事件
	 */
	public get onModelDirty(): Event<FileModelChangeEvent> {
		return this._onModelDirty.event;
	}
	/**
	 * 模块保存错误事件
	 */
	public get onModelSaveError(): Event<FileModelChangeEvent> {
		return this._onModelSaveError.event;
	}
	/**
	 * 模块被保存事件
	 */
	public get onModelSaved(): Event<FileModelChangeEvent> {
		return this._onModelSaved.event;
	}
	/**
	 * 多个模块脏的事件
	 */
	public get onModelsDirty(): Event<FileModelChangeEvent[]> {
		if (!this._onModelsDirtyEvent) {
			this._onModelsDirtyEvent = this.debounce(this.onModelDirty);
		}
		return this._onModelsDirtyEvent;
	}
	/**
	 * 多个模块保存错误事件
	 */
	public get onModelsSaveError(): Event<FileModelChangeEvent[]> {
		if (!this._onModelsSaveError) {
			this._onModelsSaveError = this.debounce(this.onModelSaveError);
		}
		return this._onModelsSaveError;
	}
	/**
	 * 多个模块被保存事件
	 */
	public get onModelsSaved(): Event<FileModelChangeEvent[]> {
		if (!this._onModelsSaved) {
			this._onModelsSaved = this.debounce(this.onModelSaved);
		}
		return this._onModelsSaved;
	}
	private debounce(event: Event<FileModelChangeEvent>): Event<FileModelChangeEvent[]> {
		return debounceEvent(event, (prev: FileModelChangeEvent[], cur: FileModelChangeEvent) => {
			if (!prev) {
				prev = [cur];
			} else {
				prev.push(cur);
			}
			return prev;
		}, this.debounceDelay());
	}

	protected debounceDelay(): number {
		return 250;
	}

	/**
	 * 根据URL得到指定的文件编辑器数据
	 * @param resource
	 */
	public get(resource: URI): IFileEditorModel {
		return this.mapResourceToModel.get(resource);
	}
	/**
	 * 加载或者重新创建一个编辑器数据层
	 * @param resource 资源
	 * @param options 加载配置
	 */
	public loadOrCreate(input: IFileEditorInput, options?: IModelLoadOrCreateOptions, instantiationService?: IInstantiationService): Promise<IFileEditorModel> {
		const pendingLoad = this.mapResourceToPendingModelLoaders.get(input.getResource());
		if (pendingLoad) {
			return pendingLoad;
		}
		if (options && options.reload) {
			this.remove(input.getResource());
		}
		let modelPromise: Promise<IFileEditorModel>;
		let model = this.get(input.getResource());
		if (model) { // 已经存在这个model
			modelPromise = Promise.resolve<IFileEditorModel>(model);
		} else { // 不存在这个model
			model = FileModelRegistry.getFileModel(input, options ? options.encoding : void 0, instantiationService ? instantiationService : this.instantiationService);
			modelPromise = model.load() as Promise<IFileEditorModel>;
			// 添加model个的事件监听，并在这里统一抛出
			this.mapResourceToStateChangeListener.set(input.getResource(), model.onDidStateChange(state => {
				const event = new FileModelChangeEvent(model, state);
				switch (state) {
					case StateChange.DIRTY:
						this._onModelDirty.fire(event);
						break;
					case StateChange.CONTENT_CHANGE:
						this._onModelContentChanged.fire(event);
						break;
					case StateChange.SAVE_ERROR:
						this._onModelSaveError.fire(event);
						break;
					case StateChange.SAVED:
						this._onModelSaved.fire(event);
						break;
				}
			}));
		}

		// 存储到加载列表里
		this.mapResourceToPendingModelLoaders.set(input.getResource(), modelPromise);

		return modelPromise.then(model => {
			this.add(input.getResource(), model);

			// 加载结束之后要判断一下这个model是否已经脏了，如果脏了这里统一派发事件
			if (model.isDirty()) {
				this._onModelDirty.fire(new FileModelChangeEvent(model, StateChange.DIRTY));
			}

			// 从正在加载的缓存列表中删除此model
			this.mapResourceToPendingModelLoaders.delete(input.getResource());
			return model;
		}, error => {
			model.dispose();
			// 从正在加载的缓存列表中删除此model
			this.mapResourceToPendingModelLoaders.delete(input.getResource());
			return Promise.reject(error);
		});
	}

	/**
	 * 得到全部
	 * @param resource 资源URI
	 * @param filter 过滤器
	 */
	public getAll(resource?: URI, filter?: (model: IFileEditorModel) => boolean): IFileEditorModel[] {
		if (resource) {
			const res = this.mapResourceToModel.get(resource);

			return res ? [res] : [];
		}
		const res: IFileEditorModel[] = [];
		this.mapResourceToModel.forEach(model => {
			if (!filter || filter(model)) {
				res.push(model);
			}
		});
		return res;
	}

	/**
	 * 添加一个文件编辑器model
	 * @param resource 资源URI
	 * @param model 编辑器数据模块
	 */
	public add(resource: URI, model: IFileEditorModel): void {
		const knownModel = this.mapResourceToModel.get(resource);
		if (knownModel === model) {
			return; // 已经存在这个model就不在添加了
		}

		// 释放掉已经存在的model的事件
		const disposeListener = this.mapResourceToDisposeListener.get(resource);
		if (disposeListener) {
			disposeListener.dispose();
		}

		// 添加model到map
		this.mapResourceToModel.set(resource, model);
		// 监听model的销毁事件，如果model销毁也从当前的管理器中清除此model
		this.mapResourceToDisposeListener.set(resource, model.onDispose(() => {
			this.remove(resource);
			this._onModelDisposed.fire(resource);
		}));
	}

	/**
	 * 根据URI移除掉对应的model
	 * @param resource 资源URI
	 */
	public remove(resource: URI): void {
		this.mapResourceToModel.delete(resource);

		// 释放 model的释放事件监听
		const disposeListener = this.mapResourceToDisposeListener.get(resource);
		if (disposeListener) {
			dispose(disposeListener);
			this.mapResourceToDisposeListener.delete(resource);
		}

		// 释放 model的状态改变事件监听
		const stateChangeListener = this.mapResourceToStateChangeListener.get(resource);
		if (stateChangeListener) {
			dispose(stateChangeListener);
			this.mapResourceToStateChangeListener.delete(resource);
		}

		// 释放 model的内容改变事件监听
		const modelContentChangeListener = this.mapResourceToModelContentChangeListener.get(resource);
		if (modelContentChangeListener) {
			dispose(modelContentChangeListener);
			this.mapResourceToModelContentChangeListener.delete(resource);
		}
	}

	/**
	 * 清理缓存
	 */
	public clear(): void {
		// 释放model缓存
		this.mapResourceToModel.clear();
		this.mapResourceToPendingModelLoaders.clear();

		// 释放销毁事件监听
		this.mapResourceToDisposeListener.forEach(l => l.dispose());
		this.mapResourceToDisposeListener.clear();

		// 释放状态改变事件监听
		this.mapResourceToStateChangeListener.forEach(l => l.dispose());
		this.mapResourceToStateChangeListener.clear();

		// 释放model数据改变事件监听
		this.mapResourceToModelContentChangeListener.forEach(l => l.dispose());
		this.mapResourceToModelContentChangeListener.clear();
	}
	/**
	 * 释放一个编辑器数据层
	 * @param model 文件编辑器数据模块
	 */
	public disposeModel(resource: URI): void;
	public disposeModel(model: IFileEditorModel): void;
	public disposeModel(arg: any): void {
		let model: IFileEditorModel;
		if (arg instanceof URI) {
			model = this.get(arg);
		} else {
			model = arg as IFileEditorModel;
		}
		if (!model) {
			return;
		}
		if (model.isDisposed()) {
			return; // 如果已经释放了
		}
		if (this.mapResourceToPendingModelLoaders.has(model.getResource())) {
			return; // 如果还没有被加载完成
		}
		// if (model.isDirty()) {
		// 	return; // 脏了未保存
		// }
		model.dispose();
	}

	/**
	 * 释放model管理器
	 */
	public dispose(): void {
		this.toUnbind = dispose(this.toUnbind);
	}
}