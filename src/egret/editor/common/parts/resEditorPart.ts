import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IStorageService } from 'egret/platform/storage/common/storage';
import { IOperationBrowserService } from '../../../platform/operations/common/operations-browser';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import { EditorPart } from './editorPart';

/**
 * 编辑器部件，相当于一个管理器，管理多个编辑器。
 */
export class ResEditorPart extends EditorPart {

	constructor(
		@IInstantiationService instantiationService: IInstantiationService,
		@IStorageService storageService: IStorageService,
		@IOperationBrowserService operationService: IOperationBrowserService,
		@IWorkspaceService workspaceService: IWorkspaceService,
	) {
		super(instantiationService, storageService, operationService, workspaceService);
	}

	protected restoreDocumentGroupLayout(): void {
		//
	}
	
	/**
	 * 关闭
	 */
	public shutdown(): void {
		// do nothing
	}
}