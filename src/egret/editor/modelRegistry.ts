import { IFileEditorModel } from './core/models';
import { EditorInput } from './common/input/editorInput';
import { SyncDescriptor } from '../platform/instantiation/common/descriptors';
import { IInstantiationService } from '../platform/instantiation/common/instantiation';
import { FileEditorModel } from './common/model/editorModel';
import { isArray } from '../base/common/types';
import { IEditorInput } from './core/inputs';

/**
 * 文件数据模块工厂
 */
export interface IFileModelRegistry {
	/**
	 * 设置默认的文件编辑器数据模块
	 * @param modelCls 
	 */
	setDefaultFileModel(modelCls: any): void;
	/**
	 * 注册文件编辑器数据模块描述
	 * @param modelCls 
	 * @param editorInputDescriptor 
	 */
	registerFileModel(modelCls: any, editorInputDescriptor: SyncDescriptor<EditorInput>): void;
	registerFileModel(modelCls: any, editorInputDescriptor: SyncDescriptor<EditorInput>[]): void;
	/**
	 * 创建一个文件编辑器模块
	 * @param input 输入流
	 * @param instantiationService 实例化服务
	 */
	getFileModel(input: IEditorInput, preferredEncoding: string, instantiationService: IInstantiationService): IFileEditorModel;
	/**
	 * 判断是否是文件编辑器数据模块
	 * @param obj 
	 */
	isFileModel(obj: any): obj is IFileEditorModel;
}


/**
 * 文件数据模块工厂
 */
export class FileModelRegistryImpl implements IFileModelRegistry {
	private defaultModel: any = null;
	private models: { input: SyncDescriptor<EditorInput>[], modelCls: any }[] = [];
	/**
	 * 设置默认的文件编辑器数据模块
	 * @param modelCls 
	 */
	public setDefaultFileModel(modelCls: any): void {
		this.defaultModel = modelCls;
	}
	/**
	 * 注册文件编辑器数据模块描述
	 * @param modelCls 
	 * @param editorInputDescriptor 
	 */
	public registerFileModel(modelCls: any, editorInputDescriptor: SyncDescriptor<EditorInput>): void;
	public registerFileModel(modelCls: any, editorInputDescriptor: SyncDescriptor<EditorInput>[]): void;
	public registerFileModel(modelCls: any, editorInputDescriptor: any): void {
		const modelDes = {
			input: [],
			modelCls: modelCls
		};
		if (!isArray(editorInputDescriptor)) {
			modelDes.input.push(editorInputDescriptor);
		} else {
			modelDes.input = editorInputDescriptor;
		}
		this.models.push(modelDes);
	}
	/**
	 * 创建一个文件编辑器模块
	 * @param input 输入流
	 * @param instantiationService 实例化服务
	 */
	public getFileModel(input: IEditorInput, preferredEncoding: string, instantiationService: IInstantiationService): IFileEditorModel {
		for (let i = 0; i < this.models.length; i++) {
			const modelDes = this.models[i];
			for (let j = 0; j < modelDes.input.length; j++) {
				const inputClass = modelDes.input[j].ctor;
				if (input instanceof inputClass) {
					const modelClass = modelDes.modelCls;
					return instantiationService.createInstance(modelClass, input.getResource());
				}
			}
		}
		return instantiationService.createInstance(this.defaultModel, input.getResource());
	}
	/**
	 * 判断是否是文件编辑器数据模块
	 * @param obj 
	 */
	public isFileModel(obj: any): obj is IFileEditorModel {
		return obj instanceof FileEditorModel;
	}
}

/**
 * 文件编辑器数据模块注册器
 */
export const FileModelRegistry = new FileModelRegistryImpl();