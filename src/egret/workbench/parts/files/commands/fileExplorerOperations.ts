import { IExplorerService } from '../common/explorer';
import { IWorkbenchEditorService } from '../../../services/editor/common/ediors';
import { FileStat } from '../common/explorerModel';
import * as paths from 'path';
import { INotificationService } from 'egret/platform/notification/common/notifications';
import { IOperation } from 'egret/platform/operations/common/operations';
import { IFileService } from 'egret/platform/files/common/files';
import { IClipboardService } from 'egret/platform/clipboard/common/clipboardService';
import { localize } from 'egret/base/localization/nls';
import { distinctParents, basenameOrAuthority } from 'egret/base/common/resources';
import URI from 'egret/base/common/uri';
import { format } from 'vs/base/common/strings';

/**
 * 复制文件操作
 */
export class CopyFileOperation implements IOperation {
	constructor(
		@IExplorerService private explorerService:IExplorerService,
		@IClipboardService private clipboardService: IClipboardService
	) {
	}
	/**
	 * 运行
	 */
	public run(): Promise<any> {
		this.clipboardService.writeFiles(this.explorerService.getFileSelection().map(e => e.resource));
		return Promise.resolve(void 0);
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		this.clipboardService = null;
	}
}


/**
 * 粘贴文件操作
 */
export class PasteFileOperation implements IOperation {
	constructor(
		@IExplorerService private explorerService:IExplorerService,
		@IFileService private fileService: IFileService,
		@IClipboardService private clipboardService: IClipboardService,
		@IWorkbenchEditorService private editorService: IWorkbenchEditorService,
		@INotificationService private notificationService: INotificationService
	) {
	}
	/**
	 * 运行
	 */
	public run(): Promise<any> {
		const element = this.explorerService ? this.explorerService.getFileSelection()[0] : null;
		if(!element){
			return Promise.resolve(void 0);
		}

		return Promise.all(distinctParents(this.clipboardService.readFiles(), r => r).map(fileToPaste => {
			return this.fileService.resolveFile(fileToPaste).then(fileToPasteStat => {

				// Find target
				let target: FileStat;
				if (element.resource.toString() === fileToPaste.toString()) {
					target = element.parent;
				} else {
					target = element.isDirectory ? element : element.parent;
				}

				const targetFile = findValidPasteFileTarget(target, { resource: fileToPaste, isDirectory: fileToPasteStat.isDirectory });

				return this.fileService.copyFile(fileToPaste, targetFile).then(stat => {
					if (!stat.isDirectory) {
						return new Promise((resolve)=>{
							setTimeout(() => {
								this.editorService.openEditor({ resource: stat.resource }).then(()=>{
									resolve(void 0);
								});
							}, 1);
						});
					}
					return void 0;
				}, error => {

					this.notificationService.error({ content: localize('pasteFileOperation.run.copyError','Paste file failed: {0}', error), duration: 3 });
				});
			}, error => {
				this.notificationService.error({ content: localize('pasteFileOperation.run.copyError','Paste file failed: {0}', error), duration: 3 });
			});
		}));
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		this.clipboardService = null;
	}
}



/**
 * 复制文件操作
 */
export class DuplicateFileOperation {

	private element: FileStat;
	private target: FileStat;
	constructor(
		fileToDuplicate: FileStat,
		target: FileStat,
		@IFileService private fileService: IFileService,
		@IWorkbenchEditorService private editorService: IWorkbenchEditorService,
		@INotificationService private notificationService: INotificationService
	) {
		this.element = fileToDuplicate;
		this.target = (target && target.isDirectory) ? target : fileToDuplicate.parent;
	}
	/**
	 * 运行
	 */
	public run(): Promise<any> {
		const result = this.fileService.copyFile(this.element.resource, findValidPasteFileTarget(this.target, { resource: this.element.resource, isDirectory: this.element.isDirectory })).then(stat => {
			if (!stat.isDirectory) {
				return this.editorService.openEditor({ resource: stat.resource });
			}

			return void 0;
		}, error => {
			this.notificationService.error({ content: error, duration: 3 });
			console.error(error);
		});

		return result;
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		this.fileService = null;
		this.editorService = null;
	}
}


function findValidPasteFileTarget(targetFolder: FileStat, fileToPaste: { resource: URI, isDirectory?: boolean }): URI {
	let name = basenameOrAuthority(fileToPaste.resource);

	let candidate = targetFolder.resource.with({ path: paths.join(targetFolder.resource.path, name) });
	while (true) {
		if (!targetFolder.root.find(candidate)) {
			break;
		}

		name = incrementFileName(name, fileToPaste.isDirectory);
		candidate = targetFolder.resource.with({ path: paths.join(targetFolder.resource.path, name) });
	}

	return candidate;
}


function incrementFileName(name: string, isFolder: boolean): string {
	// file.1.txt=>file.2.txt
	if (!isFolder && name.match(/(.*\.)(\d+)(\..*)$/)) {
		return name.replace(/(.*\.)(\d+)(\..*)$/, (match, g1?, g2?, g3?) => { return g1 + (parseInt(g2) + 1) + g3; });
	}
	// file.txt=>file.1.txt
	const lastIndexOfDot = name.lastIndexOf('.');
	if (!isFolder && lastIndexOfDot >= 0) {
		return format('{0}.1{1}', name.substr(0, lastIndexOfDot), name.substr(lastIndexOfDot));
	}
	// folder.1=>folder.2
	if (isFolder && name.match(/(\d+)$/)) {
		return name.replace(/(\d+)$/, (match: string, ...groups: any[]) => { return String(parseInt(groups[0]) + 1); });
	}
	// file/folder=>file.1/folder.1
	return format('{0}.1', name);
}