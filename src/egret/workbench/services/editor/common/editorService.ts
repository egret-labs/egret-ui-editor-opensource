import { createDecorator, ServiceIdentifier, IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import URI from 'egret/base/common/uri';
import { ResourceMap } from 'egret/base/common/map';
import { IEditorInput, IResourceInput } from 'egret/editor/core/inputs';
import { IWorkbenchEditorService } from './ediors';
import { IEditor, IEditorPart } from 'egret/editor/core/editors';
import { EditorInput } from 'egret/editor/common/input/editorInput';
import { basename } from 'egret/base/common/paths';
import { FileInputRegistry } from 'egret/editor/inputRegistry';
import { once, Emitter, Event } from 'egret/base/common/event';
import { ipcRenderer } from 'electron';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import { IWindowClientService } from 'egret/platform/windows/common/window';


/**
 * 工作空间编辑器服务
 */
export class WorkbenchEditorService implements IWorkbenchEditorService {
	public _serviceBrand: undefined;

	private static CACHE: ResourceMap<IEditorInput> = new ResourceMap<IEditorInput>();

	private editorPart: IEditorPart;

	private _onActiveEditorChanged: Emitter<IEditor>;
	public constructor(
		editorPart: IEditorPart,
		@IWorkspaceService private workspaceService: IWorkspaceService,
		@IWindowClientService private windowService: IWindowClientService,
		@IInstantiationService private instantiationService: IInstantiationService
	) {
		this.editorPart = editorPart;
		this.editorPart.onEditorsChanged(() => this.editorsChanged_handler());
		this._onActiveEditorChanged = new Emitter<IEditor>();
	}
	private editorsChanged_handler(): void {
		this._onActiveEditorChanged.fire(this.editorPart.getActiveEditor());
	}
	/**
	 * 当前编辑改变事件
	 */
	public get onActiveEditorChanged(): Event<IEditor> {
		return this._onActiveEditorChanged.event;
	}
	/**
	 * 得到当前激活的编辑器
	 */
	public getActiveEditor(): IEditor {
		return this.editorPart.getActiveEditor();
	}
	/**
	 * 得到编辑器
	 * @param uri 
	 */
	public getEditors(uri: URI): IEditor[] {
		return this.editorPart.getEditors(uri);
	}


	/**
	 * 得到当前激活编辑器的输入流
	 */
	public getActiveEditorInput(): IEditorInput {
		return this.editorPart.getActiveEditorInput();
	}

	/**
	 * 得到当前打开的所有编辑器
	 */
	public getOpenEditors(): IEditor[] {
		return this.editorPart.getOpenEditors();
	}
	/**
	 * 打开res编辑器
	 * @param file 
	 */
	public openResEditor(file: URI): Promise<void> {
		ipcRenderer.send('egret:openResWindow', {
			windowId: this.windowService.getCurrentWindowId(),
			folderPath: this.workspaceService.getWorkspace().uri.fsPath,
			file: file.fsPath
		});
		return Promise.resolve();
	}
	/**
	 * 通过输入流打开一个编辑器，如果已经打开了这个编辑器则激活
	 * @param input 输入流
	 * @param isPreview
	 */
	public openEditor(input: IEditorInput | IResourceInput, isPreview: boolean = false, instantiationService?: IInstantiationService): Promise<IEditor> {
		if (!input) {
			return Promise.resolve(null);
		}

		const editorInput = this.createInput(input, instantiationService);
		if (editorInput) {
			return this.doOpenEditor(editorInput, isPreview, instantiationService);
		}
		return Promise.resolve(null);
	}
	/**
	 * 打开编辑器
	 * @param input 
	 */
	public createEditor(input: IEditorInput | IResourceInput, isPreview: boolean = false, instantiationService?: IInstantiationService): IEditor {
		if (!input) {
			return null;
		}
		const editorInput = this.createInput(input, instantiationService);
		if(!editorInput){
			return null;
		}
		const editor = this.editorPart.createEditor(editorInput, false, instantiationService);
		if (editor) {
			this._onActiveEditorChanged.fire(editor);
		}
		return editor;
	}

	protected doOpenEditor(input: IEditorInput, isPreview: boolean = false, instantiationService?: IInstantiationService): Promise<IEditor> {
		return this.editorPart.openEditor(input, isPreview, instantiationService).then(editor => {
			this._onActiveEditorChanged.fire(editor);
			return editor;
		});
	}

	/**
	 * 打开一组编辑器，如果已打开则忽略
	 * @param inputs 输入流数组
	 */
	public openEditors(inputs: (IEditorInput | IResourceInput)[]): Promise<IEditor[]> {
		//TODO
		return null;
	}



	/**
	 * 关闭一个编辑器
	 * @param editor 指定要关闭的编辑器
	 */
	public closeEditor(editor: IEditor): Promise<void> {
		return this.editorPart.closeEditor(editor);
	}



	/**
	 * 通过多个编辑器
	 * @param editors 指定要关闭的编辑器列表
	 */
	public closeEditors(editors: IEditor[]): Promise<void> {
		return this.editorPart.closeEditors(editors);
	}

	/**
	 * 创建一个输入流
	 * @param input 
	 */
	public createInput(input: any, instantiationService?: IInstantiationService): IEditorInput {
		if (!input) {
			return null;
		}
		if (input instanceof EditorInput) {
			return input;
		}
		const resourceInput = <IResourceInput>input;
		if (resourceInput.resource instanceof URI) {
			let title = resourceInput.title;
			if (!title) {
				title = basename(resourceInput.resource.fsPath);
			}
			return this.createOrGet(resourceInput.resource, title, resourceInput.description, resourceInput.encoding, instantiationService);
		}
		return null;
	}


	private createOrGet(resource: URI, title: string, description: string, encoding?: string, instantiationService?: IInstantiationService): IEditorInput {
		if (WorkbenchEditorService.CACHE.has(resource)) {
			const input = WorkbenchEditorService.CACHE.get(resource);
			return input;
		}
		var encoding: string = encoding ? encoding : 'utf8';
		const editorInput: IEditorInput = FileInputRegistry.getFileInput(resource, encoding, instantiationService ?? this.instantiationService);
		if(!editorInput){
			return null;
		}
		WorkbenchEditorService.CACHE.set(editorInput.getResource(), editorInput);
		once(editorInput.onDispose)(() => {
			WorkbenchEditorService.CACHE.delete(resource);
		});
		return editorInput;
	}
}