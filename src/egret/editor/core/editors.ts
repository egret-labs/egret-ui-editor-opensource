import { createDecorator, IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IResourceInput, IEditorInput } from './inputs';
import { Event } from 'egret/base/common/event';
import URI from '../../base/common/uri';
import { IFileEditorModel } from './models';


export const IEditorService = createDecorator<IEditorService>('editorService');

/**
 * 编辑器打开之前事件接口
 */
export interface IEditorOpeningEvent {
	/**
	 * 输入流
	 */
	input: IEditorInput;
	/**
	 * 可以通过此方法阻止打开一个编辑器
	 * @param callback 
	 */
	prevent(callback: () => Promise<IEditor>): void;
}

/**
 * 编辑器打开前事件
 */
export class EditorOpeningEvent implements IEditorOpeningEvent {
	private override: () => Promise<IEditor>;
	/**
	 * 编辑器输入流
	 */
	public get input(): IEditorInput {
		return this._input;
	}
	constructor(private _input: IEditorInput) {
	}
	/**
	 * 阻止打开
	 * @param callback 
	 */
	public prevent(callback: () => Promise<IEditor>): void {
		this.override = callback;
	}
	/**
	 * 是否已阻止
	 */
	public isPrevented(): () => Promise<IEditor> {
		return this.override;
	}
}



/**
 * 编辑器的基础服务
 */
export interface IEditorService {
	_serviceBrand: undefined;
	/**
	 * 打开一个编辑器
	 * @param input 
	 * @param isPreview
	 */
	openEditor(input: IResourceInput, isPreview?: boolean): Promise<IEditor>;
	/**
	 * 打开res编辑器
	 * @param file 
	 */
	openResEditor(file: URI): Promise<void>;
}

export interface IMultiPageEditor {
	/**
	 * 同步各个子编辑器的数据
	 */
	syncModelData(): Promise<void>;
	readonly EditMode: string;
}

/**
 * 编辑器接口
 */
export interface IEditor {
	readonly onViewChanged: Event<void>;
	/**
	 * 编辑器的输入流
	 */
	input: IEditorInput;
	/**
	 * 编辑器的id
	 */
	getId(): string;
	/**
	* 编辑器类型的标识
	*/
	getEditorId(): string;
	/**
	 * 给编辑器赋予焦点
	 */
	focus(): void;
	/**
	 * 这个面板是否可见中
	 */
	isVisible(): boolean;
	/**
	 * 当前编辑器的数据模块
	 */
	getModel(): Promise<IFileEditorModel>;
	/**
	 * 窗体关闭
	 */
	doClose():void;
	/**
	 * 焦点进入
	 */
	doFocusIn():void;
	/**
	 * 焦点移出
	 */
	doFocusOut():void;
}

/**
 * 编辑器部件，相当于一个管理器，管理多个编辑器。
 */
export interface IEditorPart {
	/**
	 * 编辑器改变事件
	 */
	onEditorsChanged: Event<void>;
	/**
	 * 编辑器打开事件
	 */
	onEditorOpening: Event<IEditorOpeningEvent>;
	/**
	 * 得到编辑器
	 * @param uri 
	 */
	getEditors(uri: URI): IEditor[];

	/**
	 * 得到当前激活的编辑器
	 */
	getActiveEditor(): IEditor;
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
	 */
	openEditor(input: IEditorInput, isPreview?: boolean, instantiationService?: IInstantiationService): Promise<IEditor>;
	/**
	 * 打开编辑器
	 * @param input 
	 */
	createEditor(input: IEditorInput, isPreview?: boolean, instantiationService?: IInstantiationService): IEditor;
	/**
	 * 打开一组编辑器，如果已打开则忽略
	 * @param inputs 输入流数组
	 */
	openEditors(inputs: IEditorInput[], instantiationService?: IInstantiationService): Promise<IEditor[]>;
	/**
	 * 关闭一个编辑器
	 * @param editor 指定要关闭的编辑器
	 */
	closeEditor(editor: IEditor): Promise<void>;
	/**
	 * 关闭多个编辑器
	 * @param editors 指定要关闭的编辑器列表
	 */
	closeEditors(editors: IEditor[]): Promise<void>;
}