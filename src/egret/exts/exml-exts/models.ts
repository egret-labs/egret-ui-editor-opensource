import { createDecorator, IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IExmlModel } from './exml/common/exml/models';
import { Event, Emitter } from 'egret/base/common/event';
import { IWorkbenchEditorService } from 'egret/workbench/services/editor/common/ediors';
import { ExmlFileEditor } from './exml/browser/exmlFileEditor';
import { IEditor } from 'egret/editor/core/editors';
import { IDisposable } from 'egret/base/common/lifecycle';

/**
 * 初始化ExmlModel服务实例
 * @param instantiationService 
 */
export function initExmlModel(instantiationService: IInstantiationService): void {
	const modelServics = instantiationService.createInstance(ExmlModelServices);
	instantiationService.addService(IExmlModelServices, modelServics);
}

/**
 * 需要ExmlModel的部件
 */
export interface IModelRequirePart {
	/**
	 * 设置一个ExmlModel
	 * @param exmlModel 
	 */
	setModel(exmlModel: IExmlModel): void;
}



export const IExmlModelServices = createDecorator<IExmlModelServices>('exmlModelServices');
/**
 * ExmlModel服务
 */
export interface IExmlModelServices {
	_serviceBrand: any;
	/**
	 * 当前ExmlModel变化的时候派发事件
	 */
	onCurrentModelChanged: Event<IExmlModel>;
	/**
	 * 得到当前的ExmlModel
	 */
	getCurrentModel(): IExmlModel;
	/**
	 * 注册一个需要ExmlModel的部件
	 * @param part 
	 */
	registerPart(part: IModelRequirePart): void;
	/**
	 * 取消一个需要ExmlModel的部件
	 * @param part 
	 */
	unregisterPart(part: IModelRequirePart): void;
}

/**
 * Egret项目模块服务实现
 */
export class ExmlModelServices implements IExmlModelServices {
	_serviceBrand: any;
	private currrentEditor: IEditor;
	constructor(
		@IWorkbenchEditorService private workbenchEditorService: IWorkbenchEditorService
	) {
		this._onCurrentModelChanged = new Emitter<IExmlModel>();
		this.workbenchEditorService.onActiveEditorChanged(() => this.activeEditorChanged_handler());
	}

	private modelChangedFlag = false;
	private eventDisabledList: IDisposable[] = [];
	private activeEditorChanged_handler(): void {
		const editor = this.workbenchEditorService.getActiveEditor();
		this.currrentEditor = editor;
		while (this.eventDisabledList.length > 0) {
			this.eventDisabledList.pop().dispose();
		}
		if (this.currrentEditor) {
			this.eventDisabledList.push(this.currrentEditor.onViewChanged(() => this.onViewChanged()));
		}
		if (this.modelChangedFlag) {
			return;
		}
		this.modelChangedFlag = true;
		setTimeout(() => {
			this.modelChangedFlag = false;
			this.currentModelChanged();
		}, 50);
	}

	private onViewChanged(): void {
		this.currentModelChanged();
	}


	private currentModelChanged(): void {
		const currentEditor = this.workbenchEditorService.getActiveEditor();
		if (currentEditor && currentEditor.getEditorId() !== ExmlFileEditor.ID) {
			this.doCurrentModelChanged(null);
			return;
		}
		if (currentEditor) {
			currentEditor.getModel().then(model => {
				let currentModel: IExmlModel = null;
				if (currentEditor instanceof ExmlFileEditor) {
					currentModel = currentEditor.getActiveExmlModel();
				} else if (model) {
					currentModel = model.getModel() as IExmlModel;
				}
				this.doCurrentModelChanged(currentModel);
			});
		} else {
			this.doCurrentModelChanged(null);
		}
	}

	private doCurrentModelChanged(model: IExmlModel): void {
		this._currentExmlModel = model;
		this._onCurrentModelChanged.fire(model);
		for (let i = 0; i < this._modelRequireParts.length; i++) {
			this._modelRequireParts[i].setModel(model);
		}
	}

	private _onCurrentModelChanged: Emitter<IExmlModel>;
	/**
	 * 当前ExmlModel变化的时候派发事件
	 */
	public get onCurrentModelChanged(): Event<IExmlModel> {
		return this._onCurrentModelChanged.event;
	}
	private _currentExmlModel: IExmlModel;
	/**
	 * 得到当前的ExmlModel
	 */
	public getCurrentModel(): IExmlModel {
		return this._currentExmlModel;
	}

	private _modelRequireParts: IModelRequirePart[] = [];
	/**
	 * 注册一个需要ExmlModel的部件
	 * @param part 
	 */
	public registerPart(part: IModelRequirePart): void {
		if (this._modelRequireParts.indexOf(part) == -1) {
			this._modelRequireParts.push(part);
			if (this._currentExmlModel) {
				part.setModel(this._currentExmlModel);
			}
		}
	}
	/**
	 * 取消一个需要ExmlModel的部件
	 * @param part 
	 */
	public unregisterPart(part: IModelRequirePart): void {
		const index = this._modelRequireParts.indexOf(part);
		this._modelRequireParts.splice(index, 1);
	}
}