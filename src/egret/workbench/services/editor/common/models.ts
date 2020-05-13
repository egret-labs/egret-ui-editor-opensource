import { IDisposable } from 'egret/base/common/lifecycle';
import URI from 'egret/base/common/uri';
import { Event } from 'egret/base/common/event';
import { createDecorator, IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { FileModelChangeEvent, IFileEditorModel } from 'egret/editor/core/models';
import { IFileEditorInput } from 'egret/editor/core/inputs';

/**
 * 保存确认结果操作
 */
export enum ConfirmResult {
	SAVE,
	DONT_SAVE,
	CANCEL
}

/**
 * 保存结果
 */
export interface IResult {
	/**
	 * 保存的源文件
	 */
	source: URI;
	/**
	 * 保存成的目标文件
	 */
	target?: URI;
	/**
	 * 是否保存成功
	 */
	success?: boolean;
}

/**
 * 模块创建配置
 */
export interface IModelLoadOrCreateOptions {
	/**
	 * 编码，默认为utf-8
	 */
	encoding?: string;
	/**
	 * 是否重新加载
	 */
	reload?: boolean;
}

/**
 * 文件编辑器数据模块管理器，管理者整个项目的所有文件的model
 */
export interface IFileEditorModelManager {

	/**
	 * 模块释放事件
	 */
	onModelDisposed: Event<URI>;
	/**
	 * 模块改变事件
	 */
	onModelContentChanged: Event<FileModelChangeEvent>;

	/**
	 * 模块脏事件
	 */
	onModelDirty: Event<FileModelChangeEvent>;
	/**
	 * 模块保存错误事件
	 */
	onModelSaveError: Event<FileModelChangeEvent>;
	/**
	 * 模块被保存事件
	 */
	onModelSaved: Event<FileModelChangeEvent>;
	/**
	 * 多个模块脏的事件
	 */
	onModelsDirty: Event<FileModelChangeEvent[]>;
	/**
	 * 多个模块保存错误事件
	 */
	onModelsSaveError: Event<FileModelChangeEvent[]>;
	/**
	 * 多个模块被保存事件
	 */
	onModelsSaved: Event<FileModelChangeEvent[]>;

	/**
	 * 根据URL得到指定的文件编辑器数据
	 * @param resource 
	 */
	get(resource: URI): IFileEditorModel;

	/**
	 * 得到全部数据层
	 * @param resource 
	 */
	getAll(resource?: URI): IFileEditorModel[];
	/**
	 * 加载或者重新创建一个编辑器数据层
	 * @param resource 资源
	 * @param options 加载配置
	 */
	loadOrCreate(input: IFileEditorInput, options?: IModelLoadOrCreateOptions, instantiationService?: IInstantiationService): Promise<IFileEditorModel>;
	/**
	 * 释放一个编辑器数据层
	 * @param model 
	 */
	disposeModel(model: IFileEditorModel): void;
	/**
	 * 释放一个编辑器数据层
	 * @param model 
	 */
	disposeModel(resource: URI): void;
}


export const FILE_MODEL_SERVICE_ID = 'fileModelService';
export const IFileModelService = createDecorator<IFileModelService>(FILE_MODEL_SERVICE_ID);

/**
 * 文件数据服务
 */
export interface IFileModelService extends IDisposable {
	_serviceBrand: undefined;
	/**
	 * 模块管理器
	 */
	modelManager: IFileEditorModelManager;
	/**
	 * 判断指定的URI是否脏了，如果没有指定URI则会判断所有URI是否脏了
	 * @param resource 
	 */
	isDirty(resource?: URI): boolean;
	/**
	 * 根据指定的资源列表得到已经脏了的资源，如果没有指定则得到全部脏了的资源
	 * @param resources 
	 */
	getDirty(resources?: URI[]): URI[];
	/**
	 * 保存指定的文件
	 * @param resource 
	 */
	save(resource: URI): Promise<boolean>;
	/**
	 * 另存为指定的文件
	 * @param resource 目标文件
	 * @param targetResource 要另存到的位置
	 */
	saveAs(resource: URI, targetResource?: URI): Promise<URI>;
	/**
	 * 保存全部
	 * @param resources? 要保存的所有目标文件
	 */
	saveAll(resources?: URI[]): Promise<IResult[]>;
	/**
	 * 释放所有数据
	 * @param resources 
	 */
	disposeModelAll(resources?:URI[]):Promise<void>;
	/**
	 * 释放一个数据
	 * @param resource 要被释放的目标文件
	 */
	disposeModel(resource: URI): Promise<void>;
	/**
	 * 确认保存，弹出保存框用户决定是否保存
	 * @param resources 
	 */
	confirmSave(resources?: URI[]): Promise<ConfirmResult>;
}