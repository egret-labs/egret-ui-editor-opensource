import { IOperation } from 'egret/platform/operations/common/operations';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { NewExmlPanel } from '../../exml/newExmlPanel';
import { IExplorerService } from '../common/explorer';
import { IFileService } from 'egret/platform/files/common/files';
import { IFileModelService } from '../../../services/editor/common/models';
import { IWindowClientService } from 'egret/platform/windows/common/window';
import { distinctParents, isEqualOrParent } from 'egret/base/common/resources';
import { isWindows, isMacintosh, isLinux } from 'egret/base/common/platform';
import { MessageBoxOptions } from 'egret/platform/windows/common/windows';
import { getConfirmMessage } from 'egret/platform/dialogs/common/dialogs';
import { shell } from 'electron';
import { NewFolderPanel } from '../electron-browser/views/newFolderPanel';
import { RenamePanel } from '../electron-browser/views/renamePanel';
import { IWorkbenchEditorService } from '../../../services/editor/common/ediors';
import * as paths from 'path';
import { INotificationService } from 'egret/platform/notification/common/notifications';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { localize } from 'egret/base/localization/nls';
import { EUIExmlConfig } from 'egret/exts/exml-exts/exml/common/project/exmlConfigs';
import { IClipboardService } from 'egret/platform/clipboard/common/clipboardService';
import { ExmlFileEditor } from 'egret/exts/exml-exts/exml/browser/exmlFileEditor';


//TODO 这个新建exml的和框架层无关，未来不应该放在这里
/**
 * 新建Exml皮肤的操作
 */
export class NewExmlOperation implements IOperation {
	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IEgretProjectService private projectService: IEgretProjectService,
		@IWorkspaceService private workspaceService: IWorkspaceService
	) { }

	/**
	 * 运行
	 */
	public run(): Promise<any> {
		//TODO 这里如果创建的话，应该返回一个创建过程完整的promise
		return new Promise((resolve, reject) => {
			if (!this.workspaceService.getWorkspace()) {
				reject(localize('newExmlOperation.run.notProject', 'No items are currently open, and Exml skin cannot be created'));
			}
			this.projectService.ensureLoaded().then(() => {
				const euiExmlConfig: EUIExmlConfig = this.projectService.exmlConfig as EUIExmlConfig;
				if (euiExmlConfig) {
					euiExmlConfig.getHosts().then(hosts => {
						const projectProperties = this.projectService.projectModel.getWingProperties();
						const newExmlPanel = this.instantiationService.createInstance(NewExmlPanel, hosts, projectProperties);
						newExmlPanel.open('root', true);
						newExmlPanel.onClosing(e => {
							e.relativeWindow.dispose();
							resolve(void 0);
						});
					});
				} else {
					reject(localize('newExmlOperation.run.notEuiProject', 'Currently is not an Egret EUI project, you can\'t create Exml skin'));
				}
			});
		});

	}
	/**
	 * 释放
	 */
	public dispose(): void {
		this.instantiationService = null;
		this.projectService = null;
		this.workspaceService = null;
	}
}


/**
 * 删除文件操作
 */
export class DeleteFileOperation implements IOperation {
	constructor(
		@IExplorerService private explorerService: IExplorerService,
		@IFileService private fileService: IFileService,
		@IFileModelService private fileModelService: IFileModelService,
		@IWindowClientService private windowService: IWindowClientService
	) {
	}

	/**
	 * 运行
	 */
	public run(): Promise<any> {
		const elements = this.explorerService ? this.explorerService.getFileSelection() : [];

		const distinctElements = distinctParents(elements, e => e.resource);

		let confirmDirtyPromise: Promise<boolean> = Promise.resolve(true);
		const dirty = this.fileModelService.getDirty().filter(d =>
			distinctElements.some(e =>
				isEqualOrParent(d, e.resource)
			)
		);
		if (dirty.length) {
			let message: string;
			if (distinctElements.length > 1) {
				message = localize('deleteFileOperation.run.haveNotSave', 'You are deleting files with unsaved changes. Do you want to continue?');
			} else if (distinctElements[0].isDirectory) {
				if (dirty.length === 1) {
					message = localize('deleteFileOperation.run.haveOneNotSave', 'You are deleting a folder with unsaved changes in 1 file. Do you want to continue?');
				} else {
					message = localize('deleteFileOperation.run.haveSomeNotSave', 'You are deleting a folder with unsaved changes in {0} files. Do you want to continue?', dirty.length);
				}
			} else {
				message = localize('deleteFileOperation.run.notSave', 'You are deleting a file with unsaved changes. Do you want to continue?');
			}

			const deleteBtn = { label: localize('system.delete', 'Delete'), result: 0 };
			const cancelBtn = { label: localize('alert.button.cancel', 'Cancel'), result: 1 };

			const buttons: { label: string; result: number; }[] = [];
			if (isWindows || isMacintosh) {
				buttons.push(deleteBtn, cancelBtn);
			} else {
				buttons.push(cancelBtn, deleteBtn);
			}
			const opts: MessageBoxOptions = {
				message: message,
				type: 'warning',
				detail: localize('changes.will.lost', 'Your changes will be lost if you don\'t save them.'),
				buttons: buttons.map(b => b.label),
				noLink: true,
				cancelId: buttons.indexOf(cancelBtn)
			};
			if (isLinux) {
				opts.defaultId = 1;
			}
			confirmDirtyPromise = this.windowService.showMessageBox(opts).then(result => {
				const select = buttons[result.button].result;
				return select == 0;
			});
		}

		return confirmDirtyPromise.then(confirmed => {
			if (!confirmed) {
				return null;
			}
			let confirmDeletePromise: Promise<boolean>;

			const confirmBtn = { label: localize('alert.button.confirm', 'Confirm'), result: 0 };
			const cancelBtn = { label: localize('alert.button.cancel', 'Cancel'), result: 1 };

			const buttons: { label: string; result: number; }[] = [];
			if (isWindows || isMacintosh) {
				buttons.push(confirmBtn, cancelBtn);
			} else {
				buttons.push(cancelBtn, confirmBtn);
			}
			const message = distinctElements.length > 1 ? getConfirmMessage(localize('deleteFileOperation.run.confirmDelete', 'Are you sure you want to delete the following {0} files/directories and their contents?', distinctElements.length), distinctElements.map(e => e.resource))
				: distinctElements[0].isDirectory ? localize('deleteFileOperation.run.confirmDeleteAndContent', 'Are you sure you want to delete the following {0} directories and their contents?', distinctElements[0].name)
					: localize('deleteFileOperation.run.confirmDeleteAndName', 'Are you sure you want to delete the following {0} files?', distinctElements[0].name);

			const opts: MessageBoxOptions = {
				message: message,
				type: 'question',
				detail: localize('deleteFileOperation.run.canResetThem', 'You can restore from the Trash.'),
				buttons: buttons.map(b => b.label),
				noLink: true,
				cancelId: buttons.indexOf(cancelBtn)
			};
			if (isLinux) {
				opts.defaultId = 1;
			}
			confirmDeletePromise = this.windowService.showMessageBox(opts).then(result => {
				const select = buttons[result.button].result;
				return select == 0;
			});

			return confirmDeletePromise.then(confirmed => {
				if (!confirmed) {
					return;
				}
				return Promise.all(distinctElements.map(e => this.fileService.del(e.resource, true))).then(() => {
					return;
				}, () => {
					const confirmBtn = { label: localize('deleteFileOperation.run.know', 'I know'), result: 0 };

					const buttons: { label: string; result: number; }[] = [];
					buttons.push(confirmBtn);
					const message = localize('deleteFileOperation.run.noPromise', 'Failed to delete the file, you may not have permission to operate the directory currently.');
					const opts: MessageBoxOptions = {
						message: message,
						type: 'warning',
						buttons: buttons.map(b => b.label),
						noLink: true,
						cancelId: buttons.indexOf(cancelBtn)
					};
					if (isLinux) {
						opts.defaultId = 1;
					}
					return this.windowService.showMessageBox(opts).then(result => {
						return;
					});
				});
			});
		});
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		this.explorerService = null;
		this.fileService = null;
		this.fileModelService = null;
		this.windowService = null;
	}
}

/**
 * 在系统资源管理器中查看文件
 */
export class RevealFileInOsOperation implements IOperation {
	constructor(
		@IExplorerService private explorerService: IExplorerService,
		@INotificationService private notificationService: INotificationService
	) {
	}

	/**
	 * 运行
	 */
	public run(): Promise<any> {
		const elements = this.explorerService.getFileSelection();
		if (elements.length) {
			elements.forEach(stat => {
				const path: string = stat.resource.fsPath;
				shell.showItemInFolder(path);
			});
		} else {
			this.notificationService.warn({ content: localize('revealFileInOsOperation.run.notSelectFile', 'There are currently no selected files and cannot be displayed in the System Explorer'), duration: 3 });
		}
		return Promise.resolve(void 0);
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		this.notificationService = null;
		this.explorerService = null;
	}
}

//TODO 这里的默认路径 应该交由内部的窗体自己去判断和显示
/**
 * 在系统资源管理器中查看文件
 */
export class NewFolderOperation implements IOperation {

	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IExplorerService private explorerService: IExplorerService,
		@IWorkspaceService private workspaceService: IWorkspaceService,
	) {
	}

	/**
	 * 运行
	 */
	public run(): Promise<any> {
		return new Promise((resolve, reject) => {
			if (!this.workspaceService.getWorkspace()) {
				reject(localize('newFolderOperation.run.notOpenProject', 'No project are currently open, can\'t create folder'));
			}
			const defaultFolder = this.explorerService ? this.explorerService.getFirstSelectedFolder() : null;
			if (defaultFolder) {
				const newFolder = this.instantiationService.createInstance(NewFolderPanel);
				newFolder.open(null, true);
				newFolder.onClosing(e => {
					e.relativeWindow.dispose();
					resolve(void 0);
				});
			} else {
				reject(localize('newFolderOperation.run.notExistParentFolder', 'There is no parent folder and cannot create a folder'));
			}
		});


	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.instantiationService = null;
		this.explorerService = null;
		this.workspaceService = null;
	}
}


/**
 * 复制文件路径操作
 */
export class CopyFilePathOperation implements IOperation {
	constructor(
		@IExplorerService private explorerService: IExplorerService,
		@IClipboardService private clipboardService: IClipboardService
	) {
	}
	/**
	 * 运行
	 */
	public run(): Promise<any> {
		const elements = this.explorerService ? this.explorerService.getFileSelection() : [];
		const lineDelimiter = isWindows ? '\r\n' : '\n';
		const text = elements.map(element => element.resource.fsPath).join(lineDelimiter);
		this.clipboardService.writeText(text);
		return Promise.resolve(void 0);
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		this.explorerService = null;
		this.clipboardService = null;
	}
}


/**
 * 重命名文件操作
 */
export class RenameFileOperation implements IOperation {
	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IExplorerService private explorerService: IExplorerService,
		@IFileModelService private fileModelService: IFileModelService,
		@IWindowClientService private windowService: IWindowClientService
	) {
	}
	/**
	 * 运行
	 */
	public run(): Promise<any> {
		//TODO 这里如果创建的话，应该返回一个创建过程完整的promise
		const elements = this.explorerService ? this.explorerService.getFileSelection() : [];
		if (elements.length == 0) {
			return Promise.resolve(void 0);
		}
		const fileStat = elements[0];

		const distinctElements = distinctParents(elements, e => e.resource);
		let confirmDirtyPromise: Promise<boolean> = Promise.resolve(true);
		const dirty = this.fileModelService.getDirty().filter(d =>
			distinctElements.some(e =>
				isEqualOrParent(d, e.resource)
			)
		);
		if (dirty.length) {
			let message: string;
			if(dirty.length  == 1){
				message = localize('rename.dirtyMessageFileRename','You need to save the file {0} before renaming.',paths.basename(dirty[0].fsPath));
			}else{
				message = getConfirmMessage(localize('rename.dirtyMessageFilesRename', 'You need to save the following {0} files before renaming.', dirty.length), dirty);
				
			}
			const continueBtn = { label: localize('alert.button.saveAndContinue', 'Save And Continue'), result: 0 };
			const cancelBtn = { label: localize('alert.button.cancel', 'Cancel'), result: 1 };

			const buttons: { label: string; result: number; }[] = [];
			if (isWindows || isMacintosh) {
				buttons.push(continueBtn, cancelBtn);
			} else {
				buttons.push(cancelBtn, continueBtn);
			}

			const opts: MessageBoxOptions = {
				message: message,
				type: 'warning',
				detail: localize('rename.dirtyWarning', 'You need save the dirty files before renaming'),
				buttons: buttons.map(b => b.label),
				noLink: true,
				cancelId: buttons.indexOf(cancelBtn)
			};
			if (isLinux) {
				opts.defaultId = 1;
			}
			confirmDirtyPromise = this.windowService.showMessageBox(opts).then(result => {
				const select = buttons[result.button].result;
				return select == 0;
			}).then(value=>{
				if(!value){
					return value;
				}
				return this.fileModelService.saveAll(dirty).then(e=>{
					//TODO 有可能不成功，暂时先不做处理
					return true;
				});
			});
		}
		return confirmDirtyPromise.then(confirmed=>{
			if(confirmed){
				const renamePanel = this.instantiationService.createInstance(RenamePanel, fileStat);
				renamePanel.open(null, true);
				//弹出一个 重命名的窗口
				return Promise.resolve(void 0);
			}
		});
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		this.instantiationService = null;
		this.explorerService = null;
	}
}


/**
 * 保存当前文件
 */
export class SaveActiveOperation implements IOperation {
	constructor(
		@IFileModelService private fileModelService: IFileModelService,
		@IWorkbenchEditorService private editorService: IWorkbenchEditorService
	) {
	}
	/**
	 * 运行
	 */
	public run(): Promise<any> {
		const currentEditor = this.editorService.getActiveEditor();
		if (currentEditor && currentEditor.input) {
			if(currentEditor instanceof ExmlFileEditor){
				(currentEditor as ExmlFileEditor).syncModelData();
			}
			return this.fileModelService.save(currentEditor.input.getResource());
		}
		return Promise.resolve(void 0);
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		this.fileModelService = null;
		this.editorService = null;
	}
}


/**
 * 保存所有文件
 */
export class SaveAllOperation implements IOperation {

	constructor(
		@IFileModelService private fileModelService: IFileModelService,
		@IWorkbenchEditorService private editorService: IWorkbenchEditorService
	) {
	}
	/**
	 * 运行
	 */
	public run(): Promise<any> {
		const editors = this.editorService.getOpenEditors();
		for (let i = 0; i < editors.length; i++) {
			const editor = editors[i];
			if(editor instanceof ExmlFileEditor){
				(editor as ExmlFileEditor).syncModelData();
			}
		}
		return this.fileModelService.saveAll();
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		this.fileModelService = null;
	}
}