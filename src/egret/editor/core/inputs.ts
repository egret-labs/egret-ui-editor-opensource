import { Event } from 'egret/base/common/event';
import URI from 'egret/base/common/uri';
import { IDisposable } from 'egret/base/common/lifecycle';
import { IEditorModel } from './models';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';


/**
 * 基本资源输入流
 */
export interface IBaseResourceInput {
	title?: string;
	description?: string;
}

/**
 * 资源输入流
 */
export interface IResourceInput extends IBaseResourceInput {
	resource: URI;
	encoding?: string;
}



/**
 * 编辑器输入流，一般由资源输入流生成
 */
export interface IEditorInput extends IDisposable {
	/**
	 * 输入流释放的时候派发
	 */
	onDispose: Event<void>;
	/**
	 * 输入流的URI
	 */
	getResource(): URI;
	/**
	 * 输入流描述，显示在tips里
	 */
	getDescription(): string;
	/**
	 * 输入流的标题，显示在编辑器的标签里
	 */
	getTitle(): string;
	/**
	 * 从输入流获取对应的编辑器model
	 */
	resolve(refresh?: boolean, instantiationService?: IInstantiationService): Promise<IEditorModel>;
	/**
	 * 当前输入流是否脏了
	 */
	isDirty(): boolean;
	/**
	 * 当前输入流对应的icon
	 */
	getIcon(): string;
	/**
	 * 比较两个输入流是否相同
	 * @param other 
	 */
	matches(other: any): boolean;
}

/**
 * 文件编辑器输入流
 */
export interface IFileEditorInput extends IEditorInput {
	/**
	 * 设置首选编码
	 * @param encoding 
	 */
	setPreferredEncoding(encoding: string): void;
}