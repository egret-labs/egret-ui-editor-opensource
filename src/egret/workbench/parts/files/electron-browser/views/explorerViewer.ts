import { IDataSource, ITree, IRenderer, IController, IDragOverReaction, ContextMenuEvent, IFilter, ISorter, DragOverBubble, DragOverEffect } from 'vs/base/parts/tree/browser/tree';
import * as DOM from 'vs/base/browser/dom';
import { IFileService, isParent } from 'egret/platform/files/common/files';
import { FileStat, Model } from '../../common/explorerModel';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IDisposable } from 'vs/base/common/lifecycle';
import { DefaultController, DefaultDragAndDrop, ClickBehavior, OpenMode } from 'vs/base/parts/tree/browser/treeDefaults';
import { IMouseEvent, DragMouseEvent } from 'vs/base/browser/mouseEvent';
import { Tree } from 'vs/base/parts/tree/browser/treeImpl';
import * as path from 'path';
import * as paths from 'egret/base/common/paths';
import { MenuItemConstructorOptions, MenuItem, remote, Menu, ipcRenderer } from 'electron';
import { isMacintosh, isWindows, isLinux } from 'egret/base/common/platform';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import { IClipboardService } from 'egret/platform/clipboard/common/clipboardService';
import URI from 'egret/base/common/uri';
import { basenameOrAuthority, dirname, isEqualOrParent, distinctParents } from 'egret/base/common/resources';
import { DesktopDragAndDropData, ExternalElementsDragAndDropData } from 'vs/base/parts/tree/browser/treeDnd';
import { IWindowClientService } from 'egret/platform/windows/common/window';
import { MessageBoxOptions } from 'egret/platform/windows/common/windows';
import { getConfirmMessage } from 'egret/platform/dialogs/common/dialogs';
import { addClass } from 'egret/base/common/dom';
import { FileRootCommands } from '../../commands/fileRootCommands';
import { FileExplorerCommands } from '../../commands/fileExplorerCommands';
import { DuplicateFileOperation } from '../../commands/fileExplorerOperations';
import { INotificationService } from 'egret/platform/notification/common/notifications';
import { IOperationBrowserService } from 'egret/platform/operations/common/operations-browser';
import { localize } from 'egret/base/localization/nls';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { dispose } from 'egret/base/common/lifecycle';

import './media/explorer.css';
import { IWorkbenchEditorService } from 'egret/workbench/services/editor/common/ediors';
import { IFileModelService } from 'egret/workbench/services/editor/common/models';
import { IDragAndDropData } from 'vs/base/browser/dnd';
import { RootCommands } from 'egret/workbench/electron-browser/commands/rootCommands';

/**
 * 文件数据源
 */
export class FileDataSource implements IDataSource {

	constructor(
		@IFileService private fileService: IFileService,
		@INotificationService private notificationService: INotificationService
	) {
	}
	/**
	 * 得到给定元素的唯一id标识。
	 * @param tree 
	 * @param element 
	 */
	public getId(tree: ITree, stat: FileStat | Model): string {
		if (stat instanceof Model) {
			return 'model';
		}
		if (stat.root.resource) {
			return `${stat.root.resource.toString()}:${stat.getId()}`;
		}
		return stat.getId();
	}
	/**
	 * 返回此元素是否具有子项
	 * @param tree 
	 * @param element 
	 */
	public hasChildren(tree: ITree, stat: FileStat | Model): boolean {
		return stat instanceof Model || (stat instanceof FileStat && stat.isDirectory);
	}
	/**
	 * 异步返回元素的子项
	 * @param tree 
	 * @param element 
	 */
	public getChildren(tree: ITree, stat: FileStat | Model): Promise<FileStat[]> {
		if (stat instanceof Model) {
			return Promise.resolve([stat.root]);
		}
		if (stat.isDirectoryResolved) {
			return Promise.resolve(stat.children);
		} else {
			return new Promise<FileStat[]>((resolve, reject) => {
				this.fileService.resolveFile(stat.resource).then(
					dirStat => {
						const modelDirStat = FileStat.create(dirStat, stat.root);
						for (let i = 0; i < modelDirStat.children.length; i++) {
							stat.addChild(modelDirStat.children[i]);
						}
						stat.isDirectoryResolved = true;
						resolve(stat.children);
					}, error => {
						this.notificationService.error({ content: error, duration: 3 });
						resolve([]);
					});
			});

		}
	}
	/**
	 * 异步返回一个元素的父级
	 * @param tree 
	 * @param element 
	 */
	public getParent(tree: ITree, stat: FileStat | Model): Promise<FileStat> {
		if (!stat) {
			return Promise.resolve(null);
		}
		if (tree.getInput() === stat) {
			return Promise.resolve(null);
		}
		if (stat instanceof FileStat && stat.parent) {
			return Promise.resolve(stat.parent);
		}
		return Promise.resolve(null);
	}
}


/**
 * 文件模板数据接口
 */
export interface IFileTemplateData {
	/**
	 * 容器
	 */
	container: HTMLElement;
	/**
	 * 文本显示
	 */
	labelDisplay: HTMLSpanElement;
	/**
	 * 图标显示
	 */
	iconDisplay: HTMLElement;
}
/**
 * 文件项的渲染器
 */
export class FileRenderer implements IRenderer {

	private static readonly ITEM_HEIGHT = 22;
	private static readonly FILE_TEMPLATE_ID = 'file';
	constructor(
		@IInstantiationService private instantiationService: IInstantiationService
	) {
	}
	/**
	 * 返回一个元素在树中的高度，单位是像素
	 * @param tree 
	 * @param element 
	 */
	public getHeight(tree: ITree, element: any): number {
		return FileRenderer.ITEM_HEIGHT;
	}
	/**
	 * 返回给定元素的模板id。
	 * @param tree 
	 * @param element 
	 */
	public getTemplateId(tree: ITree, element: any): string {
		return FileRenderer.FILE_TEMPLATE_ID;
	}
	/**
	 * 在DOM节点中渲染一个模板。 这个方法需要渲染元素的所有DOM结构。返回的内容将在 `renderElement` 方法中进行数据填充。
	 * 需要再这个方法中构建高所有的DOM元素，这个方法仅被调用有限次数。
	 * @param tree 
	 * @param templateId 
	 * @param container 
	 */
	public renderTemplate(tree: ITree, templateId: string, container: HTMLElement): IFileTemplateData {
		const iconDisplay: HTMLElement = document.createElement('div');

		const iconSpan = DOM.append(container, DOM.$('span'));
		addClass(iconSpan, 'iconSpan');
		addClass(iconDisplay, 'file-icon');
		const labelDisplay: HTMLSpanElement = document.createElement('span');
		addClass(labelDisplay, 'file-label');
		container.appendChild(iconDisplay);
		container.appendChild(labelDisplay);
		addClass(container, 'explorer-item-container');


		const template: IFileTemplateData = {
			container: container,
			labelDisplay: labelDisplay,
			iconDisplay: iconDisplay
		};
		return template;
	}
	/**
	 * 通过 `renderTemplate` 渲染的模板，在这个方法中将被塞入数据渲染成一个真正的项。
	 * 尽可能保证这个方法足够的轻量，因为他会被经常调用。
	 * @param tree 
	 * @param element 
	 * @param templateId 
	 * @param templateData 
	 */
	public renderElement(tree: ITree, stat: FileStat, templateId: string, templateData: IFileTemplateData): void {
		if (!stat.resource) {
			// 空stat，表示当前没有打开任何项目
			return;
		}
		let ext = stat.resource.fsPath;
		ext = path.extname(ext);
		if (ext.charAt(0) == '.') {
			ext = ext.slice(1);
		}
		templateData.iconDisplay.className = 'file-icon';
		if (ext) {
			addClass(templateData.iconDisplay, ext);
		}
		templateData.labelDisplay.innerText = stat.name;
	}

	/**
	 * 释放一个模板
	 * @param tree 
	 * @param templateId 
	 * @param templateData 
	 */
	public disposeTemplate(tree: ITree, templateId: string, templateData: IFileTemplateData): void {
		templateData.labelDisplay.innerText = '';
	}
}

enum ContextMenuId {
	NEW_EXML = 'newExml',
	NEW_FOLDER = 'newFolder',
	REVEAL_IN_OS = 'revealInOs',
	COPY = 'copy',
	PASTE = 'paste',
	COPY_PATH = 'copyPath',
	RENAME = 'rename',
	DELETE = 'delete',
	SETTINGS = 'settings'
}

type FileStatSelectionInfo = {
	/**
	 * true: 选中项包含皮肤根目录的父节点 
	 */
	hasExmlRootParent: boolean;
	/**
	 * true: 选中项包含皮肤根目录的子节点
	 */
	hasExmlRootChild: boolean;
	/**
	 * true: 选中项包含皮肤根目录的同级节点
	 */
	hasExmlRootSibling: boolean;
	/**
	 * true: 选中项包含皮肤根目录
	 */
	hasExmlRoot: boolean;
	/***
	 * true: 选中项是单个文件夹 
	 */
	isSingleDirectory: boolean,
	/**
	 * true: 选中项是单个文件
	 */
	isSingleFile: boolean;
};

/**
 * 处理用户交互
 */
export class FileController extends DefaultController implements IController, IDisposable {
	private previousSelectionRangeStop: FileStat;

	constructor(
		@IWorkbenchEditorService private editorService: IWorkbenchEditorService,
		@IEgretProjectService private egretProjectService: IEgretProjectService,
		@IWorkspaceService private workspaceService: IWorkspaceService,
		@IClipboardService private clipboardService: IClipboardService,
		@IWindowClientService private windowService: IWindowClientService,
		@IOperationBrowserService private operationService: IOperationBrowserService
	) {
		super({ clickBehavior: ClickBehavior.ON_MOUSE_UP, keyboardSupport: true, openMode: OpenMode.SINGLE_CLICK });
		this.initContextMenuGeneral();
	}

	/**
	 * 添加一般的上下文菜单
	 */
	private initContextMenuGeneral(): void {
		this.addContextMenuItemGeneral({ label: localize('fileController.initContextMenuGeneral.createSkin', 'Create Skin'), id: ContextMenuId.NEW_EXML });
		this.addContextMenuItemGeneral({ label: localize('fileController.initContextMenuGeneral.createFolder', 'Create Folder'), id: ContextMenuId.NEW_FOLDER });
		if (isMacintosh) {
			this.addContextMenuItemGeneral({ label: localize('fileController.initContextMenuGeneral.openInFinder', 'Reveal in Finder'), id: ContextMenuId.REVEAL_IN_OS });
		} else {
			this.addContextMenuItemGeneral({ label: localize('fileController.initContextMenuGeneral.openInResourceManager', 'Reveal in System Explorer'), id: ContextMenuId.REVEAL_IN_OS });
		}
		this.addContextMenuSeparator();
		this.addContextMenuItemGeneral({ label: localize('fileController.initContextMenuGeneral.copy', 'Copy'), id: ContextMenuId.COPY, accelerator: 'CmdOrCtrl+C' });
		this.addContextMenuItemGeneral({ label: localize('fileController.initContextMenuGeneral.paste', 'Paste'), id: ContextMenuId.PASTE, accelerator: 'CmdOrCtrl+V' });
		this.addContextMenuItemGeneral({ label: localize('fileController.initContextMenuGeneral.copyPath', 'Copy Path'), id: ContextMenuId.COPY_PATH });
		this.addContextMenuSeparator();
		this.addContextMenuItemGeneral({ label: localize('fileController.initContextMenuGeneral.rename', 'Rename'), id: ContextMenuId.RENAME });
		this.addContextMenuItemGeneral({ label: localize('system.delete', 'Delete'), id: ContextMenuId.DELETE, accelerator: 'Delete' });
		this.addContextMenuSeparator();
		this.addContextMenuItemGeneral({ label: localize('fileController.initContextMenuGeneral.settings', 'EUI Project Setting'), id: ContextMenuId.SETTINGS });
	}

	private contextMenuItemsGeneral: { type: 'separator' | 'normal', option: MenuItemConstructorOptions, item: MenuItem }[] = [];
	/**
	 * 在上下文菜单中添加一个分割线
	 */
	private addContextMenuSeparator(): void {
		const option: MenuItemConstructorOptions = { type: 'separator' };
		const item = new remote.MenuItem(option);
		this.contextMenuItemsGeneral.push({ type: 'separator', option: option, item: item });
	}
	/**
	 * 在上下文菜单中添加一个项目
	 * @param option 
	 */
	private addContextMenuItemGeneral(option: MenuItemConstructorOptions): void {
		option.click = (item, win) => {
			this.contextMenuGeneralSelected_handler(option.id as ContextMenuId);
		};
		const item = new remote.MenuItem(option);
		this.contextMenuItemsGeneral.push({
			type: 'normal',
			option: option,
			item: item
		});
	}

	/**
	 * 设置上下文菜单的禁用与否
	 * @param enable 
	 * @param id 
	 */
	private setContextMenuEnable(enable: boolean, id: string = null): void {
		if (id) {
			for (var i = 0; i < this.contextMenuItemsGeneral.length; i++) {
				if (this.contextMenuItemsGeneral[i].option.id == id) {
					this.contextMenuItemsGeneral[i].item.enabled = enable;
					break;
				}
			}
		} else {
			for (var i = 0; i < this.contextMenuItemsGeneral.length; i++) {
				this.contextMenuItemsGeneral[i].item.enabled = enable;
			}
		}
	}

	/**
	 * 上下文菜单被选择
	 * @param itemId 
	 */
	private contextMenuGeneralSelected_handler(action: ContextMenuId): void {
		switch (action) {
			case ContextMenuId.NEW_EXML:
				this.operationService.executeCommand(FileRootCommands.NEW_EXML_FILE);
				break;
			case ContextMenuId.NEW_FOLDER:
				this.operationService.executeCommand(FileRootCommands.NEW_FOLDER);
				break;
			case ContextMenuId.REVEAL_IN_OS:
				this.operationService.executeCommand(FileRootCommands.REVEAL_FILE_IN_OS);
				break;
			case ContextMenuId.COPY:
				this.operationService.executeCommand(FileExplorerCommands.COPY);
				break;
			case ContextMenuId.PASTE:
				this.operationService.executeCommand(FileExplorerCommands.PASTE);
				break;
			case ContextMenuId.COPY_PATH:
				this.operationService.executeCommand(FileRootCommands.COPY_FILE_PATH);
				break;
			case ContextMenuId.RENAME:
				this.operationService.executeCommand(FileRootCommands.RENAME_FILE);
				break;
			case ContextMenuId.DELETE:
				this.operationService.executeCommand(FileRootCommands.DELETE_FILE);
				break;
			case ContextMenuId.SETTINGS:
				this.operationService.executeCommand(RootCommands.WING_PROPERTY);
				break;
			default:
				break;
		}
	}

	/**
	 * 创建上下文菜单
	 */
	private createContextMenu(): Menu {
		const menu = new remote.Menu();
		for (let i = 0; i < this.contextMenuItemsGeneral.length; i++) {
			menu.append(this.contextMenuItemsGeneral[i].item);
		}
		return menu;
	}

	/**
	 * 左键点击的时候
	 * @param tree 
	 * @param stat 
	 * @param event 
	 * @param origin 
	 */
	public onLeftClick(tree: Tree, stat: FileStat | Model, event: IMouseEvent, origin: string = 'mouse'): boolean {

		const payload = { origin: origin };
		const isDoubleClick = (origin === 'mouse' && event.detail === 2);



		// Handle Highlight Mode
		if (tree.getHighlight()) {
			// Cancel Event
			event.preventDefault();
			event.stopPropagation();
			tree.clearHighlight(payload);
			return false;
		}
		// Handle root
		if (stat instanceof Model) {
			tree.clearFocus(payload);
			tree.clearSelection(payload);
			return false;
		}

		// Cancel Event
		const isMouseDown = event && event.browserEvent && event.browserEvent.type === 'mousedown';
		if (!isMouseDown) {
			event.preventDefault(); // we cannot preventDefault onMouseDown because this would break DND otherwise
		}
		event.stopPropagation();

		// Set DOM focus
		tree.domFocus();

		// Allow to multiselect
		if ((event.altKey) || (event.ctrlKey || event.metaKey)) {
			const selection = tree.getSelection();
			this.previousSelectionRangeStop = undefined;
			if (selection.indexOf(stat) >= 0) {
				tree.setSelection(selection.filter(s => s !== stat));
			} else {
				tree.setSelection(selection.concat(stat));
				tree.setFocus(stat, payload);
			}
		}
		// Allow to unselect
		else if (event.shiftKey) {
			const focus = tree.getFocus();
			if (focus) {
				if (this.previousSelectionRangeStop) {
					tree.deselectRange(stat, this.previousSelectionRangeStop);
				}
				tree.selectRange(focus, stat, payload);
				this.previousSelectionRangeStop = stat;
			}
		}
		// Select, Focus and open files
		else {
			// Expand / Collapse
			if (isDoubleClick || this.openOnSingleClick) {
				tree.toggleExpansion(stat);
				this.previousSelectionRangeStop = undefined;
			}

			tree.setFocus(stat, payload);

			if (isDoubleClick) {
				event.preventDefault(); // focus moves to editor, we need to prevent default
			}

			tree.setSelection([stat], payload);

			if (!stat.isDirectory && (isDoubleClick || this.openOnSingleClick)) {
				this.openEditor(stat, !isDoubleClick);
			}
		}
		return true;
	}

	/**
	 * 打开编辑器
	 * @param stat 
	 * @param isPreview
	 */
	private openEditor(stat: FileStat, isPreview: boolean): Promise<any> {
		if (stat && !stat.isDirectory) {
			const extname = paths.extname(stat.resource.fsPath);
			if (extname === '.json') {
				return this.editorService.openResEditor(stat.resource);
			}
			return this.editorService.openEditor({ resource: stat.resource }, isPreview);
		}
	}

	/**
	 * 
	 * 
	 * @param selections 
	 * @returns
	 */
	private statSelections(selections: FileStat[]): FileStatSelectionInfo {
		let result: FileStatSelectionInfo = {
			hasExmlRootParent: false,
			hasExmlRootChild: false,
			hasExmlRootSibling: false,
			hasExmlRoot: false,
			isSingleDirectory: false,
			isSingleFile: false
		};
		if (selections.length === 0) {
			return result;
		}
		let exmlRoots: URI[] = [];
		if (this.egretProjectService.projectModel &&
			this.egretProjectService.projectModel.exmlRoot.length > 0
		) {
			exmlRoots = exmlRoots.concat(this.egretProjectService.projectModel.exmlRoot);
		}
		let workspaceRoot: string = null;
		if (exmlRoots.length > 0 &&
			this.workspaceService.getWorkspace() &&
			this.workspaceService.getWorkspace().uri
		) {
			workspaceRoot = this.workspaceService.getWorkspace().uri.fsPath;
		}
		if (workspaceRoot && selections.length > 0) {
			for (let i = 0; i < selections.length; i++) {
				const item = selections[i];
				let isSibling: boolean = true;
				for (let j = 0; j < exmlRoots.length; j++) {
					const curExmlRoot = paths.normalize(path.join(workspaceRoot, exmlRoots[j].fsPath));
					const isExmlRoot = paths.isEqual(curExmlRoot, paths.normalize(item.resource.fsPath));
					if (isExmlRoot) {
						result.hasExmlRoot = true;
						isSibling = false;
					}
					const value = paths.isEqualOrParent(paths.normalize(item.resource.fsPath), curExmlRoot);
					if (value && !isExmlRoot) {
						result.hasExmlRootChild = true;
						isSibling = false;
					}
					const value2 = paths.isEqualOrParent(curExmlRoot, paths.normalize(item.resource.fsPath));
					if (value2 && !isExmlRoot) {
						result.hasExmlRootParent = true;
						isSibling = false;
					}
				}
				if (isSibling) {
					result.hasExmlRootSibling = isSibling;
				}
			}
		}
		if (selections.length === 1) {
			if (selections[0].isDirectory) {
				result.isSingleDirectory = true;
			} else {
				result.isSingleFile = true;
			}
		}

		return result;
	}

	/**
	 * 请求菜单内容的时候
	 * @param tree 
	 * @param stat 
	 * @param event 
	 */
	public onContextMenu(tree: ITree, stat: FileStat | Model, event: ContextMenuEvent): boolean {
		tree.setFocus(stat);

		if (stat instanceof Model) {
			return;
		}
		if (!stat) {
			return;
		}
		let statSelections = tree.getSelection() as FileStat[];
		if (statSelections.length == 0 ||
			statSelections.length == 1 ||
			statSelections.indexOf(stat) == -1) {
			statSelections = [stat];
			tree.setSelection(statSelections);
		}
		this.setContextMenuEnable(true);
		const stats = this.statSelections(statSelections);
		if (stats.hasExmlRootParent) {
			this.setContextMenuEnable(false, ContextMenuId.NEW_EXML);
			this.setContextMenuEnable(false, ContextMenuId.NEW_FOLDER);
			this.setContextMenuEnable(false, ContextMenuId.COPY);
			this.setContextMenuEnable(false, ContextMenuId.PASTE);
			this.setContextMenuEnable(false, ContextMenuId.RENAME);
			this.setContextMenuEnable(false, ContextMenuId.DELETE);
		} else {
			if (stats.hasExmlRoot) {
				this.setContextMenuEnable(false, ContextMenuId.RENAME);
				this.setContextMenuEnable(false, ContextMenuId.COPY);
			}
			if (stats.hasExmlRootSibling) {
				this.setContextMenuEnable(false, ContextMenuId.NEW_EXML);
				this.setContextMenuEnable(false, ContextMenuId.NEW_FOLDER);
				this.setContextMenuEnable(false, ContextMenuId.PASTE);
				this.setContextMenuEnable(false, ContextMenuId.RENAME);
			}
			if (stats.hasExmlRootChild) {
				if (stats.isSingleDirectory) {
					if (!this.clipboardService.hasFiles()) {
						this.setContextMenuEnable(false, ContextMenuId.PASTE);
					}
				} else {
					this.setContextMenuEnable(false, ContextMenuId.PASTE);
					if(!stats.isSingleFile) {
						this.setContextMenuEnable(false, ContextMenuId.NEW_EXML);
						this.setContextMenuEnable(false, ContextMenuId.NEW_FOLDER);
					}
				}
			}
		}
		setTimeout(() => {
			this.createContextMenu().popup({
				window: remote.getCurrentWindow()
			});
		}, 10);
		return true;
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		this.editorService = null;
		this.operationService = null;
		this.clipboardService = null;
	}
}

const FileNameMatch = /^(.*?)(\.([^.]*))?$/;
/**
 * 文件排序
 */
export class FileSorter implements ISorter {
	private toDispose: IDisposable[];

	constructor(
	) {
		this.toDispose = [];
	}
	/**
	 * 比较排序
	 * @param tree 
	 * @param statA 
	 * @param statB 
	 */
	public compare(tree: ITree, statA: FileStat, statB: FileStat): number {
		// Do not sort roots
		if (statA.isRoot) {
			return -1;
		}
		if (statB.isRoot) {
			return 1;
		}

		if (statA.isDirectory && !statB.isDirectory) {
			return -1;
		}
		if (statB.isDirectory && !statA.isDirectory) {
			return 1;
		}
		return this.compareFileNames(statA.name, statB.name);
	}


	private compareFileNames(one: string, other: string, caseSensitive = false): number {
		if (!caseSensitive) {
			one = one && one.toLowerCase();
			other = other && other.toLowerCase();
		}

		const [oneName, oneExtension] = this.extractNameAndExtension(one);
		const [otherName, otherExtension] = this.extractNameAndExtension(other);

		if (oneName !== otherName) {
			return oneName < otherName ? -1 : 1;
		}

		if (oneExtension === otherExtension) {
			return 0;
		}

		return oneExtension < otherExtension ? -1 : 1;
	}

	private extractNameAndExtension(str?: string): [string, string] {
		const match = str ? FileNameMatch.exec(str) : [] as RegExpExecArray;

		return [(match && match[1]) || '', (match && match[3]) || ''];
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.toDispose = dispose(this.toDispose);
	}
}

/**
 * 文件过滤器
 */
export class FileFilter implements IFilter {
	constructor(
		@IEgretProjectService private egretProjectService: IEgretProjectService,
		@IWorkspaceService private workspaceService: IWorkspaceService) {
	}
	/**
	 * 指定的元素是否显示
	 */
	public isVisible(tree: ITree, stat: FileStat): boolean {
		if (stat.isRoot) {
			return true;
		}
		if (path.basename(stat.resource.fsPath).toLocaleLowerCase() == '.ds_store') {
			return false;
		}
		if (path.basename(stat.resource.fsPath).toLocaleLowerCase() == 'node_modules') {
			return false;
		}
		if (this.egretProjectService.projectModel &&
			this.egretProjectService.projectModel.project) {
			const configs = this.egretProjectService.projectModel.resConfigs;
			for (let i = 0; i < configs.length; i++) {
				const element = paths.normalize(paths.join(this.egretProjectService.projectModel.project.fsPath, configs[i].url));
				if (paths.isEqualOrParent(element, paths.normalize(stat.resource.fsPath))) {
					return true;
				}
			}
		}
		// if (path.basename(stat.resource.fsPath).toLocaleLowerCase() === 'default.res.json') {
		// 	return true;
		// }
		//有设置皮肤根路径
		let exmlRoots: URI[] = [];
		if (this.egretProjectService.projectModel &&
			this.egretProjectService.projectModel.exmlRoot.length > 0
		) {
			exmlRoots = exmlRoots.concat(this.egretProjectService.projectModel.exmlRoot);
		}
		if (stat.isDirectory &&
			exmlRoots.length > 0 &&
			this.workspaceService.getWorkspace() &&
			this.workspaceService.getWorkspace().uri
		) {
			for (let i = 0; i < exmlRoots.length; i++) {
				const curExmlRoot = paths.normalize(path.join(this.workspaceService.getWorkspace().uri.fsPath, exmlRoots[i].fsPath));
				const cur = paths.normalize(stat.resource.fsPath);
				// 当前目录为exmlRoot本身、父节点、子节点时均应该可见
				const result = (paths.isEqualOrParent(cur, curExmlRoot) || paths.isEqualOrParent(curExmlRoot, cur));
				if (result) {
					return true;
				}
			}
			return false;
		}
		if (stat.isDirectory) {
			return true;
		}
		if (path.extname(stat.resource.fsPath).toLocaleLowerCase() == '.exml') {
			return true;
		}
		return false;
	}
}

/**
 * 文件的拖拽与释放
 */
export class FileDragAndDrop2 extends DefaultDragAndDrop {

	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IWindowClientService private windowService: IWindowClientService,
		@IFileModelService private fileModelService: IFileModelService,
		@IWorkbenchEditorService private editorService: IWorkbenchEditorService,
		@IFileService private fileService: IFileService,
		@INotificationService private notificationService: INotificationService
	) {
		super();
	}

	private statToResource(stat: FileStat): URI {
		if (stat.isDirectory) {
			return URI.from({ scheme: 'folder', path: stat.resource.path }); // indicates that we are dragging a folder
		}
		return stat.resource;
	}

	/**
	 * 如果给定的元素可以接受拖出，则返回一个置顶元素的uri，否则返回null。
	 * @param tree 
	 * @param element 
	 */
	public getDragURI(tree: ITree, obj: any): string {
		const resource = this.statToResource(obj);
		if (resource) {
			return resource.toString();
		}
		return void 0;
	}

	/**
	 * 当拖出一个元素的时候，返回这个元素需要显示的标签文本。
	 * @param tree 
	 * @param elements 
	 */
	public getDragLabel(tree: ITree, elements: any[]): string {
		if (elements.length > 1) {
			return String(elements.length);
		}
		const resource = this.statToResource(elements[0]);
		if (resource) {
			return basenameOrAuthority(resource);
		}
		return void 0;
	}

	/**
	 * 当拖出操作开始的时候。
	 * @param tree 
	 * @param data 
	 * @param originalEvent 
	 */
	public onDragStart(tree: ITree, data: IDragAndDropData, originalEvent: DragMouseEvent): void {
		const sources: FileStat[] = data.getData();
		if (sources && sources.length) {
			sources.forEach(s => {
				if (s.isDirectory && tree.isExpanded(s)) {
					tree.collapse(s, false);
				}
			});
			const fileResources = sources.filter(s => !s.isDirectory && s.resource.scheme === 'file').map(r => r.resource.fsPath);
			if (fileResources.length) {
				originalEvent.dataTransfer.setData('CodeFiles', JSON.stringify(fileResources));
			}
		}
	}

	/**
	 * 拖拽经过一个元素的时候，返回当前元素是否可以接受释放等信息。
	 * @param tree 
	 * @param data 
	 * @param targetElement 
	 * @param originalEvent 
	 */
	public onDragOver(tree: ITree, data: IDragAndDropData, target: FileStat | Model, originalEvent: DragMouseEvent): IDragOverReaction {
		const isCopy = originalEvent && ((originalEvent.ctrlKey && !isMacintosh) || (originalEvent.altKey && isMacintosh));
		const fromDesktop = data instanceof DesktopDragAndDropData;

		// Desktop DND
		if (fromDesktop) {
			return { accept: false };
			// const types: string[] = originalEvent.dataTransfer.types;
			// const typesArray: string[] = [];
			// for (let i = 0; i < types.length; i++) {
			// 	typesArray.push(types[i].toLowerCase()); // somehow the types are lowercase
			// }
			// if (typesArray.indexOf('Files'.toLowerCase()) === -1 && typesArray.indexOf('CodeFiles'.toLowerCase()) === -1) {
			// 	return DRAG_OVER_REJECT;
			// }
		}
		// Other-Tree DND
		else if (data instanceof ExternalElementsDragAndDropData) {
			return { accept: false };
		}

		// In-Explorer DND
		else {
			const sources: FileStat[] = data.getData();
			if (target instanceof Model) {
				if (sources[0].isRoot) {
					return { accept: true, bubble: DragOverBubble.BUBBLE_DOWN, autoExpand: false };
				}
				return { accept: false };
			}

			if (!Array.isArray(sources)) {
				return { accept: false };
			}

			if (sources.some((source) => {
				if (source.isRoot && target instanceof FileStat && !target.isRoot) {
					return true; // Root folder can not be moved to a non root file stat.
				}
				if (source.resource.toString() === target.resource.toString()) {
					return true; // Can not move anything onto itself
				}

				if (!isCopy && dirname(source.resource).toString() === target.resource.toString()) {
					return true; // Can not move a file to the same parent unless we copy
				}

				if (isEqualOrParent(target.resource, source.resource)) {
					return true; // Can not move a parent folder into one of its children
				}
				return false;
			})) {
				return { accept: false };
			}
		}

		// All (target = model)
		if (!(target instanceof Model)) {
			if (target.isDirectory) {
				return fromDesktop || isCopy ? { accept: true, bubble: DragOverBubble.BUBBLE_DOWN, effect: DragOverEffect.COPY } : { accept: true, bubble: DragOverBubble.BUBBLE_DOWN, autoExpand: true };
			}
			return fromDesktop || isCopy ? { accept: true, bubble: DragOverBubble.BUBBLE_UP, effect: DragOverEffect.COPY } : { accept: true, bubble: DragOverBubble.BUBBLE_UP };
		}
		return { accept: false };
	}
	/**
	 * 当将目标拖入到一个位置的时候。
	 * @param tree 
	 * @param data 
	 * @param targetElement 
	 * @param originalEvent 
	 */
	public drop(tree: ITree, data: IDragAndDropData, target: FileStat | Model, originalEvent: DragMouseEvent): void {
		let promise: Promise<void> = Promise.resolve(null);
		// Desktop DND (Import file)
		if (data instanceof DesktopDragAndDropData) {
			promise = this.handleExternalDrop(tree, data, target, originalEvent);
		}
		// In-Explorer DND (Move/Copy file)
		else {
			promise = this.handleExplorerDrop(tree, data, target, originalEvent);
		}
		promise.then(() => { }, error => {
			this.notificationService.error({ content: error, duration: 3 });
			console.error(error);
		});
	}

	private handleExternalDrop(tree: ITree, data: DesktopDragAndDropData, target: FileStat | Model, originalEvent: DragMouseEvent): Promise<void> {
		return null;
	}

	private handleExplorerDrop(tree: ITree, data: IDragAndDropData, target: FileStat | Model, originalEvent: DragMouseEvent): Promise<void> {
		const sources: FileStat[] = distinctParents(data.getData(), s => s.resource);
		const isCopy = (originalEvent.ctrlKey && !isMacintosh) || (originalEvent.altKey && isMacintosh);
		let confirmPromise: Promise<boolean>;

		const confirmDragAndDrop = !isCopy;
		if (confirmDragAndDrop) {
			const confirmBtn = { label: localize('alert.button.confirm', 'Confirm'), result: 0 };
			const cancelBtn = { label: localize('alert.button.cancel', 'Cancel'), result: 1 };

			const buttons: { label: string; result: number; }[] = [];
			if (isWindows || isMacintosh) {
				buttons.push(confirmBtn, cancelBtn);
			} else {
				buttons.push(cancelBtn, confirmBtn);
			}

			const message = sources.length > 1 && sources.every(s => s.isRoot) ? localize('fileDragAndDrop2.handleExplorerDrop.confirmModifyMulitDir', 'Are you sure you want to modify the order of multiple root directories in your workspace?')
				: sources.length > 1 ? getConfirmMessage(localize('fileDragAndDrop2.handleExplorerDrop.confirmMoveSome', 'Are you sure you want to move the following {0} files?', sources.length), sources.map(s => s.resource))
					: sources[0].isRoot ? localize('fileDragAndDrop2.handleExplorerDrop.confirmMoveDir', 'Are you sure you want to move the following {0} directories and their contents？', sources[0].name)
						: localize('fileDragAndDrop2.handleExplorerDrop.confirmMoveFile', 'Are you sure you want to move the file {0} ？', sources[0].name);
			const opts: MessageBoxOptions = {
				message: message,
				type: 'question',
				buttons: buttons.map(b => b.label),
				noLink: true,
				cancelId: buttons.indexOf(cancelBtn)
			};
			if (isLinux) {
				opts.defaultId = 1;
			}
			confirmPromise = this.windowService.showMessageBox(opts).then(result => {
				const select = buttons[result.button].result;
				return select == 0;
			});
		} else {
			confirmPromise = Promise.resolve(true);
		}

		return confirmPromise.then(confirm => {
			if (confirm) {
				const distinctElements = distinctParents(sources, e => e.resource);
				const dirty = this.fileModelService.getDirty().filter(d =>
					distinctElements.some(e =>
						isEqualOrParent(d, e.resource)
					)
				);
				if (dirty.length) {
					let message: string;
					if (distinctElements.length > 1) {
						message = localize('fileDragAndDrop2.handleExplorerDrop.moveNotSaveAndContinue', 'You are moving files with unsaved changes. Do you want to continue?');
					} else if (distinctElements[0].isDirectory) {
						if (dirty.length === 1) {
							message = localize('fileDragAndDrop2.handleExplorerDrop.moveNotSave', 'You are moving a folder with unsaved changes in 1 file. Do you want to continue?');
						} else {
							message = localize('fileDragAndDrop2.handleExplorerDrop.moveHaveSomeFile', 'You are moving a folder with unsaved changes in {0} files. Do you want to continue?', dirty.length);
						}
					} else {
						message = localize('fileDragAndDrop2.handleExplorerDrop.confirmContinueMove', 'You are moving a file with unsaved changes. Do you want to continue?');
					}

					const confirmBtn = { label: localize('alert.button.continue', 'Continue'), result: 0 };
					const cancelBtn = { label: localize('alert.button.cancel', 'Cancel'), result: 1 };

					const buttons: { label: string; result: number; }[] = [];
					if (isWindows || isMacintosh) {
						buttons.push(confirmBtn, cancelBtn);
					} else {
						buttons.push(cancelBtn, confirmBtn);
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
					const confirmDirtyPromise = this.windowService.showMessageBox(opts).then(result => {
						const select = buttons[result.button].result;
						return select == 0;
					});
					return confirmDirtyPromise.then(confirm => {
						if (!confirm) {
							return void 0;
						}
						return Promise.all(sources.filter(source => this.doHandleExplorerDrop(tree, source, target, isCopy))).then(() => void 0);
					});
				} else {
					return Promise.all(sources.filter(source => this.doHandleExplorerDrop(tree, source, target, isCopy))).then(() => void 0);
				}
			}
			return Promise.resolve(void 0);
		});
	}

	private doHandleExplorerDrop(tree: ITree, source: FileStat, target: FileStat | Model, isCopy: boolean): Promise<void> {
		return new Promise((resolve, reject) => {
			const promise = tree.expand(target).then(() => {
				// Reuse duplicate action if user copies
				if (isCopy) {
					return this.instantiationService.createInstance(DuplicateFileOperation, source, target as FileStat).run();
				}

				if (!(target instanceof FileStat)) {
					return Promise.resolve(void 0);
				}

				return this.fileModelService.disposeModel(source.resource).then(() => {
					const closeEditors: any[] = [];
					const editors = this.editorService.getEditors(source.resource);
					editors.forEach(editor => {
						closeEditors.push(this.editorService.closeEditor(editor));
					});
					return Promise.all(closeEditors).then(() => {
						const targetResource = target.resource.with({ path: path.join(target.resource.path, source.name) });
						return this.fileService.moveFile(source.resource, targetResource, true).then(() => {
							if (editors.length > 0) {
								return this.editorService.openEditor({ resource: targetResource });
							} else {
								return void 0;
							}
						});
					});
				});
			});
			promise.then(() => {
				resolve();
			}, error => {
				this.notificationService.error({ content: error, duration: 3 });
				console.error(error);
				resolve();
			});
		});
	}
}





/**
 * 文件的拖拽与释放
 */
export class FileDragAndDrop extends DefaultDragAndDrop {
	/**
	 * 如果给定的元素可以接受拖出，则返回一个置顶元素的uri，否则返回null。
	 * @param tree 
	 * @param element 
	 */
	public getDragURI(tree: ITree, element: any): string {
		return null;
	}
	/**
	 * 当拖出一个元素的时候，返回这个元素需要显示的标签文本。
	 * @param tree 
	 * @param elements 
	 */
	public getDragLabel?(tree: ITree, elements: any[]): string {
		return null;
	}
	/**
	 * 当拖出操作开始的时候。
	 * @param tree 
	 * @param data 
	 * @param originalEvent 
	 */
	public onDragStart(tree: ITree, data: IDragAndDropData, originalEvent: DragMouseEvent): void {

		console.log(data);
	}
	/**
	 * 拖拽经过一个元素的时候，返回当前元素是否可以接受释放等信息。
	 * @param tree 
	 * @param data 
	 * @param targetElement 
	 * @param originalEvent 
	 */
	public onDragOver(tree: ITree, data: IDragAndDropData, targetElement: any, originalEvent: DragMouseEvent): IDragOverReaction {
		return null;
	}
	/**
	 * 当将目标拖入到一个位置的时候。
	 * @param tree 
	 * @param data 
	 * @param targetElement 
	 * @param originalEvent 
	 */
	public drop(tree: ITree, data: IDragAndDropData, targetElement: any, originalEvent: DragMouseEvent): void {
	}
}


