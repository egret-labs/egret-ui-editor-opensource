import { IExmlFileEditorModel, IExmlModel, TextChangedEvent } from './exml/models';
import { HistoryInfo } from './exml/exmlModel';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import URI from 'egret/base/common/uri';
import { FileEditorModel } from 'egret/editor/common/model/editorModel';
import { IFileService } from 'egret/platform/files/common/files';
import { IEgretProjectService } from '../../project';
import { IFileModelService } from 'egret/workbench/services/editor/common/models';
import { INotificationService } from 'egret/platform/notification/common/notifications';

/**
 * Exml文件编辑器数据层
 */
export class ExmlFileEditorModel extends FileEditorModel implements IExmlFileEditorModel {
	
	constructor(
		resource: URI,
		@IFileService protected instantiationService: IInstantiationService,
		@IFileService protected fileService: IFileService,
		@IEgretProjectService protected egretProjectService: IEgretProjectService,
		@IFileModelService protected fileModelService: IFileModelService,
		@INotificationService protected notificationService: INotificationService
	) {
		super(resource, fileService, fileModelService, notificationService);
	}

	protected doUpdateModel(value: string, model: IExmlModel): Promise<IExmlModel> {
		model.setText(value);
		return Promise.resolve(model);
	}

	protected doCreateModel(value: string): Promise<IExmlModel> {
		return this.egretProjectService.createExmlModel(value).then(model => {
			if (model) {
				model.onTextChanged(e => this.textChanged_handler(e));
			}
			return model;
		});
	}

	private dirtyUpdating = false;
	private textChanged_handler(e: TextChangedEvent): void {
		if (this.dirtyUpdating) {
			return;
		}
		this.dirtyUpdating = true;
		setTimeout(() => {
			this.dirtyUpdating = false;
			this.updateDirty();
		}, 100);
	}

	private historyCache: HistoryInfo = null;
	/**
	 * 立即检查模块是否脏了
	 */
	public updateDirty(): void {
		if(this.getModel()){
			const currentHistory = this.getModel().peekUndo();
			if (!currentHistory && !this.historyCache) {
				this.setDirty(false);
				return;
			}
			if (currentHistory != this.historyCache) {
				this.setDirty(true);
			} else {
				this.setDirty(false);
			}
		}
	}

	/**
	 * 更新当前模块是否脏了
	 * @param dirty 
	 */
	protected setDirty(dirty: boolean): void {
		super.setDirty(dirty);
		if (!dirty) {
			if(this.getModel()){
				this.historyCache = this.getModel().peekUndo();
			}
		}
	}

	protected doCreateValueFromModel(model: IExmlModel): Promise<string> {
		const text = model.getText();
		return Promise.resolve(text);
	}
	/**
	 * exml数据模块 
	 */
	public getModel(): IExmlModel {
		return super.getModel() as IExmlModel;
	}

	/**
	 * 是否可以撤销
	 */
	public getCanUndo(): boolean {
		if(!this.getModel()){
			return false;
		}
		return this.getModel().getCanUndo();
	}
	/**
	 * 撤销
	 */
	public undo(): void {
		if(this.getModel()){
			this.getModel().undo();
		}
	}
	/**
	 * 是否可以重做
	 */
	public getCanRedo(): boolean {
		if(!this.getModel()){
			return false;
		}
		return this.getModel().getCanRedo();
	}
	/**
	 * 重做
	 */
	public redo(): void {
		if(this.getModel()){
			this.getModel().redo();
		}
	}
}