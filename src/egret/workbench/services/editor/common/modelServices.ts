import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import URI from 'egret/base/common/uri';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IFileEditorModel } from 'egret/editor/core/models';
import { IFileModelService, IResult, ConfirmResult, IFileEditorModelManager } from './models';
import { FileEditorModelManager } from './modelManager';
import { isWindows, isLinux } from 'egret/base/common/platform';
import { ResourceMap } from 'egret/base/common/map';
import { ILifecycleService } from 'egret/platform/lifecycle/common/lifecycle';
import * as paths from 'path';
import { IWindowClientService } from 'egret/platform/windows/common/window';
import { localize } from 'egret/base/localization/nls';
import { getConfirmMessage } from 'egret/platform/dialogs/common/dialogs';
import { MessageBoxOptions } from 'egret/platform/windows/common/windows';
//TODO 这个类还很不完善

/**
 * model服务，服务于当前项目，内只一个model管理器
 */
export class FileModelService implements IFileModelService {
	public _serviceBrand: undefined;

	private toUnbind: IDisposable[];
	private _modelManager: FileEditorModelManager;

	//TODO 生命周期，在窗体关闭的时候结束掉
	constructor(
		@ILifecycleService private lifecycleService: ILifecycleService,
		@IInstantiationService private instantiationService: IInstantiationService,
		@IWindowClientService private windowService: IWindowClientService
	) {
		this._modelManager = this.instantiationService.createInstance(FileEditorModelManager);
		this.registerListeners();
	}

	private registerListeners(): void {
		this.lifecycleService.onWillShutdown(event => event.veto(this.beforeShutdown(event.reload)));
		this.lifecycleService.onShutdown(this.dispose, this);
	}

	private beforeShutdown(reload: boolean): boolean | Promise<boolean> {
		//关闭软件之前要检查脏，如果有脏就阻止关闭
		const dirty = this.getDirty();
		if (dirty.length) {
			return this.confirmBeforeShutdown();
		}
		return this.disposeModelAll().then(() => false);
	}

	private confirmBeforeShutdown(): boolean | Promise<boolean> {
		return this.confirmSave().then(confirm => {
			if (confirm == ConfirmResult.SAVE) {
				return this.saveAll().then(results => {
					if (results.some(r => !r.success)) {
						return true; // 有保存失败，拒绝关闭
					}
					return false;
				});
			} else if (confirm == ConfirmResult.DONT_SAVE) {
				return this.disposeModelAll().then(() => false);
			} else if (confirm == ConfirmResult.CANCEL) {
				return true;
			}
			return false;
		});
	}

	/**
	 * 模块管理器
	 */
	public get modelManager(): IFileEditorModelManager {
		return this._modelManager;
	}
	/**
	 * 根据指定的资源列表得到已经脏了的资源，如果没有指定则得到全部脏了的资源
	 * @param resources 
	 */
	public getDirty(resources?: URI[]): URI[] {
		const dirty = this.getDirtyFileModels(resources).map(m => m.getResource());
		return dirty;
	}

	/**
	 * 判断指定的URI是否脏了，如果没有指定URI则会判断所有URI是否脏了
	 * @param resource 
	 */
	public isDirty(resource?: URI): boolean {
		if (this._modelManager.getAll(resource).some(model => model.isDirty())) {
			return true;
		}
		return false;
	}

	/**
	 * 保存指定的文件
	 * @param resource 
	 */
	public save(resource: URI): Promise<boolean> {
		return this.saveAll([resource]).then(results => results.length === 1 && results[0].success);
	}
	/**
	 * 另存为指定的文件
	 * @param resource 目标文件
	 * @param targetResource 要另存到的位置
	 */
	public saveAs(resource: URI, targetResource?: URI): Promise<URI> {
		//TODO
		console.log('saveAs');
		return null;
	}
	/**
	 * 保存全部
	 * @param resources 要保存的所有目标文件
	 */
	public saveAll(resources?: URI[]): Promise<IResult[]> {
		const toSave: URI[] = this.getDirty(resources);
		return this.doSaveAll(toSave);
	}

	private doSaveAll(fileResources: URI[]): Promise<IResult[]> {
		const dirtyFileModels = this.getDirtyFileModels(Array.isArray(fileResources) ? fileResources : void 0);
		const mapResourceToResult = new ResourceMap<IResult>();
		dirtyFileModels.forEach(m => {
			mapResourceToResult.set(m.getResource(), {
				source: m.getResource()
			});
		});

		return Promise.all(dirtyFileModels.map(model => {
			return model.save().then(() => {
				if (!model.isDirty()) {
					mapResourceToResult.get(model.getResource()).success = true;
				} else {
					mapResourceToResult.get(model.getResource()).success = false;
				}
			});
		})).then(r => {
			return mapResourceToResult.values();
		});
	}

	/**
	 * 释放所有数据
	 * @param resources 
	 */
	public disposeModelAll(resources?: URI[]): Promise<void> {
		const models = this.getFileModels(resources);
		for (let i = 0; i < models.length; i++) {
			this.modelManager.disposeModel(models[i]);
		}
		return Promise.resolve(void 0);
	}

	/**
	 * 释放一个数据
	 * @param resource 要被释放的目标文件
	 */
	public disposeModel(resource: URI): Promise<void> {
		this.modelManager.disposeModel(resource);
		return Promise.resolve(void 0);
	}

	private getFileModels(resources?: URI[]): IFileEditorModel[];
	private getFileModels(resource?: URI): IFileEditorModel[];
	private getFileModels(arg1?: any): IFileEditorModel[] {
		if (Array.isArray(arg1)) {
			const models: IFileEditorModel[] = [];
			(<URI[]>arg1).forEach(resource => {
				models.push(...this.getFileModels(resource));
			});

			return models;
		}
		return this._modelManager.getAll(<URI>arg1);
	}

	private getDirtyFileModels(resources?: URI[]): IFileEditorModel[];
	private getDirtyFileModels(resource?: URI): IFileEditorModel[];
	private getDirtyFileModels(arg1?: any): IFileEditorModel[] {
		return this.getFileModels(arg1).filter(model => model.isDirty());
	}

	/**
	 * 确认保存，弹出保存框用户决定是否保存
	 * @param resources 
	 */
	public confirmSave(resources?: URI[]): Promise<ConfirmResult> {
		const resourcesToConfirm = this.getDirty(resources);
		if (resourcesToConfirm.length == 0) {
			return Promise.resolve(ConfirmResult.DONT_SAVE);
		}
		let message = '';
		if (resourcesToConfirm.length == 1) {
			message = localize('modelServices.confirmSave.confirmModify', 'Need to save the changes made to file {0}?', paths.basename(resourcesToConfirm[0].fsPath));
		} else {

			message = getConfirmMessage(localize('modelServices.confirmSave.confirmModifyMessage', 'Need to save the changes made to the following {0} files?', resourcesToConfirm.length), resourcesToConfirm);
		}

		const save = { label: resourcesToConfirm.length > 1 ? localize('alert.button.saveAll', 'Save All') : localize('modelServices.confirmSave.save', 'Save'), result: ConfirmResult.SAVE };
		const dontSave = { label: localize('alert.button.doNotSave', 'Don\'t Save'), result: ConfirmResult.DONT_SAVE };
		const cancel = { label: localize('alert.button.cancel', 'Cancel'), result: ConfirmResult.CANCEL };


		const buttons: { label: string; result: ConfirmResult; }[] = [];
		if (isWindows) {
			buttons.push(save, dontSave, cancel);
		} else if (isLinux) {
			buttons.push(dontSave, cancel, save);
		} else {
			buttons.push(save, cancel, dontSave);
		}

		const opts: MessageBoxOptions = {
			title: localize('modelServices.confirmSave.saveTips', 'Save Tips'),
			message: message,
			type: 'warning',
			detail: localize('modelServices.confirmSave.warning', 'If you don\'t save, all the changes you made will be lost.'),
			buttons: buttons.map(b => b.label),
			noLink: true,
			cancelId: buttons.indexOf(cancel)
		};
		if (isLinux) {
			opts.defaultId = 2;
		}

		return this.windowService.showMessageBox(opts).then(result => {
			return buttons[result.button].result;
		});
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.toUnbind = dispose(this.toUnbind);
		this._modelManager.clear();
	}
}