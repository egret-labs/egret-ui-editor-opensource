import { createDecorator } from 'egret/platform/instantiation/common/instantiation';
import { IResourceInput, IEditorInput } from 'egret/editor/core/inputs';
import { IEditorService, IEditor } from 'egret/editor/core/editors';
import { Event } from 'egret/base/common/event';
import URI from 'egret/base/common/uri';

export const IWorkbenchEditorService = createDecorator<IWorkbenchEditorService>('editorService');
/**
 * 工作台编辑器服务，负责打开关闭激活编辑器等。
 */
export interface IWorkbenchEditorService extends IEditorService {
	_serviceBrand: undefined;
	/**
	 * 当前编辑改变事件
	 */
	readonly onActiveEditorChanged: Event<IEditor>;
	/**
	 * 得到当前激活的编辑器
	 */
	getActiveEditor(): IEditor;
	/**
	 * 得到编辑器
	 * @param uri 
	 */
	getEditors(uri: URI): IEditor[];
	/**
	 * 得到当前激活编辑器的输入流
	 */
	getActiveEditorInput(): IEditorInput;
	/**
	 * 得到当前打开的所有编辑器
	 */
	getOpenEditors(): IEditor[];
	/**
	 * 通过输入流打开一个编辑器，如果已经打开了这个编辑器则激活
	 * @param input 输入流
	 * @param isPreview
	 */
	openEditor(input: IEditorInput | IResourceInput, isPreview?: boolean): Promise<IEditor>;
	/**
	 * 打开编辑器
	 * @param input 
	 */
	createEditor(input: IEditorInput | IResourceInput): IEditor ;
	/**
	 * 打开一组编辑器，如果已打开则忽略
	 * @param inputs 输入流数组
	 */
	openEditors(inputs: (IEditorInput | IResourceInput)[]): Promise<IEditor[]>;
	/**
	 * 关闭一个编辑器
	 * @param input 指定要关闭的输入流
	 */
	closeEditor(input: IEditor): Promise<void>;
	/**
	 * 通过多个编辑器
	 * @param inputs 输入流数组
	 */
	closeEditors(inputs: IEditor[]): Promise<void>;
	/**
	 * 创建一个编辑器输入流
	 * @param input 不知道是什么类型的输入流
	 */
	createInput(input: IEditorInput | IResourceInput): IEditorInput;
}

