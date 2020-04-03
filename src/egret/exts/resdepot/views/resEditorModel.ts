import { FileEditorModel } from 'egret/editor/common/model/editorModel';
import URI from 'egret/base/common/uri';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { IFileService } from 'egret/platform/files/common/files';
import { IFileModelService } from 'egret/workbench/services/editor/common/models';
import { INotificationService } from 'egret/platform/notification/common/notifications';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { ResModel } from '../common/model/ResModel';
import { ResFileHelper } from '../common/utils/ResFileHelper';


/**
 * Exml文件编辑器数据层
 */
export class ResFileEditorModel extends FileEditorModel {
	constructor(
		resource: URI,
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IFileService protected fileService: IFileService,
		@IEgretProjectService protected egretProjectService: IEgretProjectService,
		@IFileModelService protected fileModelService: IFileModelService,
		@INotificationService protected notificationService: INotificationService
	) {
		super(resource, fileService, fileModelService, notificationService);
	}

	private _resourceDir: string;
	public get resourceDir(): string {
		return this._resourceDir;
	}
	public set resourceDir(value: string) {
		this._resourceDir = value;
	}

	public changeDirty(value: boolean): void {
		this.setDirty(value);
	}

	public getValue(): string {
		const model = this.getModel() as ResModel;
		return ResFileHelper.exportJson(model.resList, model.groupList);
	}

	public updateValue(value: string): Promise<void> {
		return this.doUpdateModel(value, this.getModel() as ResModel).then(model => {
			this._model = model;
			this.setDirty(true);
			this.firDidStateChange();
		});
	}

	protected doUpdateModel(value: string, model: ResModel): Promise<ResModel> {
		return new Promise<ResModel>((c, e) => {
			model.loadResJson(this.getResource().fsPath, this.resourceDir, value).then(() => {
				c(model);
			}, (err) => {
				e(err);
			});
		});
	}

	protected doCreateModel(value: string): Promise<ResModel> {
		const resModel: ResModel = this.instantiationService.createInstance(ResModel);
		return new Promise<ResModel>((c, e) => {
			resModel.loadResJson(this.getResource().fsPath, this.resourceDir, value).then(() => {
				c(resModel);
			}, (err) => {
				e(err);
			});
		});
	}

	protected doCreateValueFromModel(model: ResModel): Promise<string> {
		const text = ResFileHelper.exportJson(model.resList, model.groupList);
		return Promise.resolve(text);
	}
}