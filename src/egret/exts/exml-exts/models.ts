import { createDecorator, IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IExmlModel } from './exml/common/exml/models';
import { Event, Emitter } from 'egret/base/common/event';
import { IWorkbenchEditorService } from 'egret/workbench/services/editor/common/ediors';

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
	constructor(
		@IWorkbenchEditorService private workbenchEditorService: IWorkbenchEditorService
	) {
		this._onCurrentModelChanged = new Emitter<IExmlModel>();
		this.workbenchEditorService.onActiveEditorChanged(() => this.activeEditorChanged_handler());
	}

	private modelChangedFlag = false;
	private activeEditorChanged_handler(): void {
		if (this.modelChangedFlag) {
			return;
		}
		this.modelChangedFlag = true;
		setTimeout(() => {
			this.modelChangedFlag = false;
			this.currentModelChanged();
		}, 50);
	}


	private currentModelChanged(): void {

		const currentEditor = this.workbenchEditorService.getActiveEditor();
		if (currentEditor) {
			currentEditor.getModel().then(model => {
				if (model && model.getModel()) {
					this.doCurrentModelChanged(model.getModel() as IExmlModel);
				} else {
					this.doCurrentModelChanged(null);
				}
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