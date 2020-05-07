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
import { promisify } from 'util';
import * as cp from 'child_process';
import * as fsextra from 'fs-extra';
import { INotificationService } from 'egret/platform/notification/common/notifications';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { localize } from 'egret/base/localization/nls';
import { EUIExmlConfig } from 'egret/exts/exml-exts/exml/common/project/exmlConfigs';
import { IClipboardService } from 'egret/platform/clipboard/common/clipboardService';
import { innerWindowManager } from 'egret/platform/innerwindow/common/innerWindowManager';
import { rtrim } from 'vs/base/common/strings';
import { sep, normalize } from 'egret/base/common/paths';
import { IMultiPageEditor } from 'egret/editor/core/editors';


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
			if (innerWindowManager.tryActive(NewExmlPanel)) {
				return Promise.resolve(void 0);
			}
			this.projectService.ensureLoaded().then(() => {
				const euiExmlConfig: EUIExmlConfig = this.projectService.exmlConfig as EUIExmlConfig;
				if (euiExmlConfig) {
					euiExmlConfig.getHosts().then(hosts => {
						const newExmlPanel = this.instantiationService.createInstance(NewExmlPanel, hosts);
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
			if (innerWindowManager.tryActive(NewFolderPanel)) {
				return Promise.resolve(void 0);
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
			if (dirty.length == 1) {
				message = localize('rename.dirtyMessageFileRename', 'You need to save the file {0} before renaming.', paths.basename(dirty[0].fsPath));
			} else {
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
			}).then(value => {
				if (!value) {
					return value;
				}
				return this.fileModelService.saveAll(dirty).then(e => {
					//TODO 有可能不成功，暂时先不做处理
					return true;
				});
			});
		}
		return confirmDirtyPromise.then(confirmed => {
			if (confirmed) {
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
	public async run(): Promise<any> {
		const currentEditor = this.editorService.getActiveEditor();
		if (currentEditor && currentEditor.input) {
			if('syncModelData' in currentEditor){
				await (currentEditor as IMultiPageEditor).syncModelData();
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
	public async run(): Promise<any> {
		const editors = this.editorService.getOpenEditors();
		for (let i = 0; i < editors.length; i++) {
			const editor = editors[i];
			if('syncModelData' in editor){
				await (editor as IMultiPageEditor).syncModelData();
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

/**
 * MACOS下安装shell命令
 */
export class InstallShellCommandOperation implements IOperation {

	constructor(
		@IWindowClientService private windowService: IWindowClientService,
		@INotificationService private notificationService: INotificationService) {
	}

	private ignore<T>(code: string, value: T): (err: any) => Promise<T> {
		return err => err.code === code ? Promise.resolve<T>(value) : Promise.reject<T>(err);
	}

	private _source: string | null = null;
	private getSource(): string {
		if (!this._source) {
			this._source = paths.resolve(process.resourcesPath, 'app', 'bin', 'eui');
		}
		return this._source;
	}

	private isAvailable(): Promise<boolean> {
		return fsextra.pathExists(this.getSource());
	}
	private get target(): string {
		return `/usr/local/bin/eui`;
	}

	private normalizePath(path: string): string {
		return rtrim(normalize(path), sep);
	}

	private async realpath(path: string): Promise<string> {
		try {
			return await fsextra.realpath(path);
		} catch (error) {

			// We hit an error calling fs.realpath(). Since fs.realpath() is doing some path normalization
			// we now do a similar normalization and then try again if we can access the path with read
			// permissions at least. If that succeeds, we return that path.
			// fs.realpath() is resolving symlinks and that can fail in certain cases. The workaround is
			// to not resolve links but to simply see if the path is read accessible or not.
			const normalizedPath = this.normalizePath(path);

			await fsextra.access(normalizedPath, fsextra.constants.R_OK);

			return normalizedPath;
		}
	}

	run(): Promise<void> {
		return this.isAvailable().then(isAvailable => {
			if (!isAvailable) {
				const message = localize('installShellCommandOperation.notAvailable', 'This command is not available');
				this.notificationService.info({ content: message, duration: 3 });
				return undefined;
			}

			return this.isInstalled()
				.then(isInstalled => {
					if (!isAvailable || isInstalled) {
						return Promise.resolve(null);
					} else {
						return fsextra.unlink(this.target)
							.then(undefined, this.ignore('ENOENT', null))
							.then(() => fsextra.symlink(this.getSource(), this.target))
							.then(undefined, err => {
								if (err.code === 'EACCES' || err.code === 'ENOENT') {
									return this.createBinFolderAndSymlinkAsAdmin();
								}

								return Promise.reject(err);
							});
					}
				})
				.then(() => {
					this.notificationService.info({ content: localize('installShellCommandOperation.successIn', 'Shell command \'eui\' successfully installed in PATH.'), duration: 3 });
				});
		});
	}

	private isInstalled(): Promise<boolean> {
		return fsextra.lstat(this.target)
			.then(stat => stat.isSymbolicLink())
			.then(() => this.realpath(this.target))
			.then(link => link === this.getSource())
			.then(undefined, this.ignore('ENOENT', false));
	}

	private createBinFolderAndSymlinkAsAdmin(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const buttons = [localize('alert.button.confirm', 'OK'), localize('alert.button.cancel', 'Cancel')];
			const message = localize('installShellCommandOperation.warnEscalation', `EUI Editor will now prompt with 'osascript' for Administrator privileges to install the shell command.`);
			const opts: MessageBoxOptions = {
				message: message,
				type: 'warning',
				buttons: buttons,
				cancelId: 1
			};
			this.windowService.showMessageBox(opts).then((result)=> {
				switch (result.button) {
					case 0 /* OK */:
						const command = 'osascript -e "do shell script \\"mkdir -p /usr/local/bin && ln -sf \'' + this.getSource() + '\' \'' + this.target + '\'\\" with administrator privileges"';

						promisify(cp.exec)(command, {})
							.then(undefined, _ => Promise.reject(new Error(localize('installShellCommandOperation.cantCreateBinFolder', `Unable to create '/usr/local/bin'.`))))
							.then(() => resolve(), reject);
						break;
					case 1 /* Cancel */:
						reject(new Error(localize('installShellCommandOperation.aborted', 'Aborted')));
						break;
				}
			});
		});
	}
	/**
	 * 释放
	 */
	public dispose(): void {

	}
}