import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IFileService, FileOperationEvent, FileChangesEvent, FileOperation } from 'egret/platform/files/common/files';
import { Tree } from 'vs/base/parts/tree/browser/treeImpl';
import { FileDataSource, FileRenderer, FileController, FileFilter, FileDragAndDrop2, FileSorter } from './explorerViewer';
import { FileStat, Model } from '../../common/explorerModel';
import URI from 'egret/base/common/uri';
import { dirname } from 'egret/base/common/resources';
import * as paths from 'egret/base/common/paths';
import { IDisposable } from 'egret/base/common/lifecycle';
import { IModelRequirePart } from 'egret/exts/exml-exts/models';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { IExplorerService } from '../../common/explorer';
import { FileExplorerCommands } from '../../commands/fileExplorerCommands';
import { CopyFileOperation, PasteFileOperation } from '../../commands/fileExplorerOperations';
import { INotificationService } from 'egret/platform/notification/common/notifications';
import { PanelContentDom } from 'egret/parts/browser/panelDom';
import { IFocusablePart, FocusablePartCommandHelper } from 'egret/platform/operations/common/operations';
import { IOperationBrowserService } from 'egret/platform/operations/common/operations-browser';
import { IPanel } from 'egret/parts/common/panel';
import { localize } from 'egret/base/localization/nls';
import { voluationToStyle } from 'egret/base/common/dom';
import { IWorkbenchEditorService } from 'egret/workbench/services/editor/common/ediors';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import { SystemCommands } from 'egret/platform/operations/commands/systemCommands';
import { FileRootCommands } from '../../commands/fileRootCommands';


/**
 * 资源管理器面板
 */
export class ExplorerView extends PanelContentDom implements IModelRequirePart, IExplorerService, IFocusablePart {
	_serviceBrand: undefined;

	/** 控制是否在打开文件的时候自动选中资源管理器中的资源 */
	private autoReveal: boolean;

	private explorerViewer: Tree;
	private filter: FileFilter;

	protected disposables: IDisposable[] = [];
	private focusablePartCommandHelper: FocusablePartCommandHelper;
	/**
	 * 初始化
	 * @param instantiationService
	 */
	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IFileService private fileService: IFileService,
		@IWorkspaceService private workspaceService: IWorkspaceService,
		@IWorkbenchEditorService private editorService: IWorkbenchEditorService,
		@INotificationService private notificationService: INotificationService,
		@IOperationBrowserService private operationService: IOperationBrowserService,
		@IExplorerService private explorerService: IExplorerService
	) {
		super(instantiationService);
		this.explorerService.init(this);
		this.autoReveal = true;

		this.focusablePartCommandHelper = this.instantiationService.createInstance(FocusablePartCommandHelper);
	}
	init(impl: IExplorerService): void {
		throw new Error('not supported');
	}

	private owner: IPanel;
	/**
	 * 初始化所有者
	 */
	public initOwner(owner: IPanel): void {
		this.owner = owner;
		this.initCommands();
	}

	/** 注册当前编辑器可以执行的命令 */
	private initCommands(): void {
		this.focusablePartCommandHelper.registerCommand(FileExplorerCommands.COPY, CopyFileOperation);
		this.focusablePartCommandHelper.registerCommand(FileExplorerCommands.PASTE, PasteFileOperation);
		this.operationService.registerFocusablePart(this);
	}
	/**
	 * 得到这个部件对应的Dom节点
	 */
	public getRelativeELement(): HTMLElement {
		return this.owner.getRoot();
	}
	/**
	 * 运行一个命令
	 * @param command 要运行的命令
	 */
	public executeCommand<T>(command: string, ...args): Promise<any> {
		if(command === SystemCommands.DELETE) {
			return this.operationService.executeCommand(FileRootCommands.DELETE_FILE);
		}
		return this.focusablePartCommandHelper.executeOperation(command, args);
	}

	/**
	 * 是否可以运行指定命令
	 * @param command 需要判断的命令
	 */
	public hasCommand(command: string): boolean {
		if(command === SystemCommands.DELETE) {
			return true;
		}
		return this.focusablePartCommandHelper.hasCommand(command);
	}

	/**
	 * 得到当前选择的文件列表
	 */
	public getFileSelection(): FileStat[] {
		if (!this.explorerViewer) {
			return [];
		}
		return this.explorerViewer.getSelection() as FileStat[];
	}

	/**
	 * 获取根文件夹
	 */
	public getRoot(): URI {
		return this.model.root.resource;
	}

	/**
	 * 得到首个被选中的文件夹
	 */
	public getFirstSelectedFolder(): URI {
		let firstFileStat: FileStat = null;
		if (this.getFileSelection().length > 0) {
			firstFileStat = this.getFileSelection()[0];
			if (!firstFileStat.isDirectory) {
				firstFileStat = firstFileStat.parent;
			}
		}
		let result: URI = null;
		if (firstFileStat && firstFileStat.isDirectory) {
			result = firstFileStat.resource;
		}
		return result;
	}


	// /**
	//  * 得到首个被选中的文件
	//  */
	// public getFirstSelectedFile():URI{
	// 	var firstFileStat:FileStat = null;
	// 	if(this.getFileSelection().length > 0){
	// 		firstFileStat = this.getFileSelection()[0];
	// 		if(!firstFileStat.isDirectory){
	// 			firstFileStat = firstFileStat.parent; 
	// 		}
	// 	}
	// 	var result:URI = null;
	// 	if(firstFileStat && firstFileStat.isDirectory){
	// 		result = firstFileStat.resource;
	// 	}
	// 	return result;
	// }

	/**
	 * 渲染头部附加内容
	 * @param container
	 */
	public renderHeaderExt(container: HTMLElement): void {
		//TODO 添加头部的，是否自动关联文件的按钮		
		const icons = document.createElement('div');
		icons.style.display = 'flex';
		icons.style.flexDirection = 'row';
		container.appendChild(icons);

		const collapseDiv = document.createElement('div');
		collapseDiv.title = localize('explorerView.collapseAll', 'Collapse All');
		collapseDiv.style.marginRight = '10px';
		collapseDiv.style.cursor = 'pointer';
		collapseDiv.className = 'explorer-action collapse-all';
		collapseDiv.addEventListener('click', () => {
			this.collapseAll();
		});
		icons.appendChild(collapseDiv);
	}


	setModel(exmlModel: IExmlModel): void {

	}

	/**
	 * 设置是否隐藏
	 * @param visible 
	 */
	public setVisible(visible: boolean): Promise<void> {
		return super.setVisible(visible).then(() => {
			if (visible) {
				let refreshPromise = Promise.resolve(void 0);
				if (this.shouldRefresh) {
					refreshPromise = this.doRefresh();
					this.shouldRefresh = false;
				}
				if (!this.autoReveal) {
					return refreshPromise; // 如果 autoReveal === false 则不再继续选中对应的文件
				}
				setTimeout(() => {
					const activeFile = this.getActiveFile();
					if (activeFile) {
						return refreshPromise.then(() => {
							return this.select(activeFile);
						});
					}
				}, 50);

				//最否如果还没有，就恢复到最后一个操作的文件
				return refreshPromise.then(() => {
					this.openFocusedElement();
				});

			}
			return void 0;
		});
	}

	private collapseAll(): Promise<void> {
		if (!this.isCreated) {
			return Promise.resolve();
		}
		return this.explorerViewer.collapseAll();
	}

	private openFocusedElement(): void {
		const stat: FileStat = this.explorerViewer.getFocus();
		if (stat && !stat.isDirectory) {
			this.editorService.openEditor({ resource: stat.resource });
		}
	}

	private getActiveFile(): URI {
		const input = this.editorService.getActiveEditorInput();
		if (input) {
			return input.getResource();
		}
		return null;
	}

	private get isCreated(): boolean {
		return !!(this.explorerViewer && this.explorerViewer.getInput());
	}

	private _model: Model;
	private get model(): Model {
		if (!this._model) {
			this._model = this.instantiationService.createInstance(Model);
		}
		return this._model;
	}

	private createViewer(container: HTMLElement): void {
		const dataSource = this.instantiationService.createInstance(FileDataSource);
		const renderer = this.instantiationService.createInstance(FileRenderer);
		const controller = this.instantiationService.createInstance(FileController);
		this.disposables.push(controller);
		const sorter = this.instantiationService.createInstance(FileSorter);
		this.filter = this.instantiationService.createInstance(FileFilter);
		const dnd = this.instantiationService.createInstance(FileDragAndDrop2);

		this.disposables.push(this.fileService.onAfterOperation(e => this.fileOperation_handler(e)));
		this.disposables.push(this.fileService.onFileChanges(e => this.fileChanges_handler(e)));

		this.explorerViewer = this.instantiationService.createInstance(Tree, container,
			{
				dataSource: dataSource,
				renderer: renderer,
				controller: controller,
				dnd: dnd,
				sorter: sorter,
				filter: this.filter
			}, {
			autoExpandSingleChildren: true,
			keyboardSupport: true,
			ariaLabel: localize('explorerView.createViewer.fileResourceManager', 'File Explorer')
		});
	}

	private fileOperation_handler(e: FileOperationEvent): void {
		if (!this.isCreated) {
			return; // 没创建树就返回
		}
		if (e.operation == FileOperation.CREATE || e.operation == FileOperation.COPY) { // 添加
			const addedElement = e.target;
			const parentResource = dirname(addedElement.resource);
			const parent = this.model.find(parentResource);
			if (parent) {
				// We have to check if the parent is resolved #29177
				(parent.isDirectoryResolved ? Promise.resolve(null) : this.fileService.resolveFile(parent.resource)).then(stat => {
					if (stat) {
						const modelStat = FileStat.create(stat, parent.root);
						FileStat.mergeLocalWithDisk(modelStat, parent);
					}
					const childElement = FileStat.create(addedElement, parent.root);
					parent.removeChild(childElement); // make sure to remove any previous version of the file if any
					parent.addChild(childElement);
					// Refresh the Parent (View)
					this.explorerViewer.refresh(parent).then(() => {
						return this.reveal(childElement, 0.5).then(() => {
							// Focus new element
							this.explorerViewer.setFocus(childElement);
						});
					}).then(result => {
						return result;
					}, error => {
						this.notificationService.error({ content: error, duration: 3 });
						console.log(error);
					});
				});
			}
		} else if (e.operation == FileOperation.MOVE) { // 移动和重命名
			const oldResource = e.resource;
			const newElement = e.target;

			const oldParentResource = dirname(oldResource);
			const newParentResource = dirname(newElement.resource);
			// Only update focus if renamed/moved element is selected
			let restoreFocus = false;
			const focus: FileStat = this.explorerViewer.getFocus();
			if (focus && focus.resource && focus.resource.toString() === oldResource.toString()) {
				restoreFocus = true;
			}
			let isExpanded = false;
			// Handle Rename
			if (oldParentResource && newParentResource && oldParentResource.toString() === newParentResource.toString()) {
				const modelElement = this.model.find(oldResource);
				if (modelElement) {
					//Check if element is expanded
					isExpanded = this.explorerViewer.isExpanded(modelElement);
					// Rename File (Model)
					modelElement.rename(newElement);
					// Update Parent (View)
					this.explorerViewer.refresh(modelElement.parent).then(() => {
						// Select in Viewer if set
						if (restoreFocus) {
							this.explorerViewer.setFocus(modelElement);
						}
						//Expand the element again
						if (isExpanded) {
							this.explorerViewer.expand(modelElement);
						}
					}).then(result => {
						return result;
					}, error => {
						this.notificationService.error({ content: error, duration: 3 });
						console.log(error);
					});
				}
			}
			// Handle Move
			else if (oldParentResource && newParentResource) {
				const newParent = this.model.find(newParentResource);
				const modelElement = this.model.find(oldResource);

				if (newParent && modelElement) {
					// Move in Model
					const oldParent = modelElement.parent;
					modelElement.move(newParent, (callback: () => void) => {
						// Update old parent
						this.explorerViewer.refresh(oldParent).then(callback, error => {
							this.notificationService.error({ content: error, duration: 3 });
							console.log(error);
						});
					}, () => {
						// Update new parent
						this.explorerViewer.refresh(newParent, true).then(() => this.explorerViewer.expand(newParent), error => {
							this.notificationService.error({ content: error, duration: 3 });
							console.log(error);
						});
					});
				}
			}
		} else if (e.operation === FileOperation.DELETE) { //删除
			const element = this.model.find(e.resource);
			if (element && element.parent) {
				const parent = element.parent;
				// Remove Element from Parent (Model)
				parent.removeChild(element);

				// Refresh Parent (View)
				const restoreFocus = this.explorerViewer.isDOMFocused();
				this.explorerViewer.refresh(parent).then(() => {

					// Ensure viewer has keyboard focus if event originates from viewer
					if (restoreFocus) {
						this.explorerViewer.domFocus();
					}
				}, error => {
					this.notificationService.error({ content: error, duration: 3 });
					console.log(error);
				});
			}
		}
	}

	private fileChanges_handler(e: FileChangesEvent): void {
		setTimeout(() => {
			if (!this.shouldRefresh && this.shouldRefreshFromEvent(e)) {
				this.refreshFromEvent();
			}
		}, 100);
	}

	/**
	 * 判断通过watch监听到的事件，是否需要刷新文件资源树
	 * @param e 
	 */
	private shouldRefreshFromEvent(e: FileChangesEvent): boolean {
		if (!this.isCreated) {
			return false;
		}
		return true;
	}

	private shouldRefresh: boolean = false;
	private refreshFromEventFlag: boolean = false;
	private refreshFromEvent(): void {
		if (this.isVisible()) {
			if (this.refreshFromEventFlag) {
				return;
			}
			this.refreshFromEventFlag = true;
			setTimeout(() => {
				this.refreshFromEventFlag = false;
				this.doRefresh().finally(() => {
					this.refreshFromEventFlag = false;
				});
			}, 100);
		} else {
			this.shouldRefresh = true;
		}
	}

	/**
	 * 尺寸改变
	 * @param width
	 * @param height
	 */
	public doResize(width: number, height: any): void {
		this.explorerViewer.layout();
	}

	/**
	 * 创建
	 */
	public create(): Promise<void> {
		const targetsToExpand = [];
		//TODO 从持久化数据中读取需要打开的节点。
		return this.doRefresh(targetsToExpand).then(() => {
			this.disposables.push(this.editorService.onActiveEditorChanged(() => this.revealActiveFile()));
			this.revealActiveFile();
			return this.openDefaultFile();
		});
	}

	/**
	 * 打开默认文件，该文件由eui命令行指定
	 */
	private openDefaultFile(): Promise<void> {
		const workspace = this.workspaceService.getWorkspace();
		if (!workspace) {
			return Promise.resolve();
		}
		const file = workspace.file;
		if (!file) {
			return Promise.resolve();
		}
		return this.select(file, true).then(() => {
			if (this.hasSingleSelection(file)) {
				const extname = paths.extname(file.fsPath);
				if (extname === '.json') {
					this.editorService.openResEditor(file);
				} else {
					this.editorService.openEditor({ resource: file }, false);
				}
			}
		});
	}

	/**
	 * 滚动到选择文件
	 */
	private revealActiveFile(): void {
		if (!this.autoReveal) {
			return; // 如果 autoReveal === false 则不继续选择并滚动
		}

		let clearSelection = true;
		let clearFocus = false;

		// 当前激活的文件
		const activeFile = this.getActiveFile();
		if (activeFile) {
			//TODO 记录最后一次激活的文件
			if (this.isVisible()) {
				const selection = this.hasSingleSelection(activeFile);
				if (!selection) {
					this.select(activeFile);
				}
				clearSelection = false;
			}
		} else {
			//TODO 清空最后一次激活文件的记录
			clearFocus = true;
		}

		if (clearSelection) {
			this.explorerViewer.clearSelection();
		}
		if (clearFocus) {
			this.explorerViewer.clearFocus();
		}
	}
	/**
	 * 刷新数据显示
	 */
	public refresh(): Promise<any> {
		if (!this.explorerViewer || this.explorerViewer.getHighlight()) {
			return Promise.resolve(null);
		}
		//赋予焦点
		this.explorerViewer.domFocus();
		//TODO 选择激活的编辑器
		return this.doRefresh().then(() => {
			//TODO 选中激活的编辑器
			return Promise.resolve(null);
		});
	}

	private doRefresh(targetsToExpand: URI[] = []): Promise<any> {
		const targetToResolve = { root: this.model.root, resource: this.model.root.resource, resolveTo: [] };
		if (!this.isCreated) {
			//TODO
		} else {
			this.getResolvedDirectories(targetToResolve.root, targetToResolve.resolveTo);
		}
		targetsToExpand.forEach(toExpand => {
			let has = false;
			for (let i = 0; i < targetToResolve.resolveTo.length; i++) {
				if ((targetToResolve.resolveTo[i] as URI).toString() == toExpand.toString()) {
					has = true;
					break;
				}
			}
			if (!has) {
				targetToResolve.resolveTo.push(toExpand);
			}
		});
		const promise = this.resolveRoots(targetToResolve, targetsToExpand);
		return promise;
	}

	private resolveRoots(targetToResolve: { root: FileStat, resource: URI, resolveTo: URI[] }, targetsToExpand: URI[]): Promise<any> {
		const input = this.model.root;

		const setInputAndExpand = (input: FileStat | Model, statsToExpand: FileStat[]) => {
			if (input === this.model && statsToExpand.every(fs => fs && !fs.isRoot)) {
				statsToExpand = [this.model.root].concat(statsToExpand);
			}
			return this.explorerViewer.setInput(input).then(() => this.explorerViewer.expandAll(statsToExpand));
		};
		if (!targetToResolve.resource) {
			const promise = this.explorerViewer.setInput(this.model);
			this.explorerViewer.layout();
			this.treeContainer.style.display = 'none';
			return new Promise<any>((resolve, reject) => {
				promise.then(() => {
					resolve(void 0);
				}, error => {
					reject(error);
				});
			});
		} else {
			this.treeContainer.style.display = '';
			return this.fileService.resolveFile(targetToResolve.resource, targetToResolve.resolveTo).then(result => {

				const fileStat = FileStat.create(result, targetToResolve.root, targetToResolve.resolveTo);
				FileStat.mergeLocalWithDisk(fileStat, this.model.root);

				const statsToExpand: FileStat[] = this.explorerViewer.getExpandedElements().concat(targetsToExpand.map(expand => this.model.find(expand)));
				if (input == this.explorerViewer.getInput()) {
					return this.explorerViewer.refresh().then(() => {
						return this.explorerViewer.expandAll(statsToExpand);
					});
				}
				const promise = setInputAndExpand(input, statsToExpand);
				this.explorerViewer.layout();
				return new Promise<any>((resolve, reject) => {
					promise.then(() => {
						resolve(void 0);
					}, error => {
						reject(error);
					});
				});
			});
		}
	}

	private getResolvedDirectories(stat: FileStat, resolvedDirectories: URI[]): void {
		if (stat.isDirectoryResolved) {
			if (!stat.isRoot) {
				for (let i = resolvedDirectories.length - 1; i >= 0; i--) {
					const resource = resolvedDirectories[i];
					if (paths.isEqualOrParent(paths.normalize(stat.resource.fsPath), paths.normalize(resource.fsPath))) {
						resolvedDirectories.splice(i);
					}
				}
				resolvedDirectories.push(stat.resource);
			}
			for (let i = 0; i < stat.children.length; i++) {
				const child = stat.children[i];
				this.getResolvedDirectories(child, resolvedDirectories);
			}
		}
	}
	/**
	 * 根据指定的文件，选中并且使该项目可见。
	 */
	public select(resource: URI, reveal: boolean = this.autoReveal): Promise<void> {
		if (!resource) {
			return Promise.resolve(void 0);
		}
		//如果已经包含了选中，则调整一下可见位置，直接返回
		const selection = this.hasSingleSelection(resource);
		if (selection) {
			return reveal ? this.reveal(selection, 0.5) : Promise.resolve(void 0);
		}
		//还没创建完成
		if (!this.isCreated) {
			return Promise.resolve(void 0);
		}

		const fileStat = this.model.find(resource);
		if (fileStat) {
			return this.doSelect(fileStat, reveal);
		}

		return this.fileService.resolveFile(this.model.root.resource, [resource]).then(stat => {
			const modelStat = FileStat.create(stat, this.model.root, [resource]);
			FileStat.mergeLocalWithDisk(modelStat, this.model.root);
			return this.explorerViewer.refresh(this.model.root).then(() => this.doSelect(this.model.root.find(resource), reveal));
		}, e => {
			this.notificationService.error({ content: e, duration: 3 });
		});
	}
	/**
	 * 是否已包含选中
	 * @param resource 
	 */
	private hasSingleSelection(resource: URI): FileStat {
		const currentSelection: FileStat[] = this.explorerViewer.getSelection();
		return currentSelection.length === 1 && currentSelection[0].resource.toString() === resource.toString()
			? currentSelection[0]
			: undefined;
	}

	private doSelect(fileStat: FileStat, reveal: boolean): Promise<void> {
		if (!fileStat) {
			return Promise.resolve(void 0);
		}
		if (!this.filter.isVisible(this.explorerViewer, fileStat)) {
			fileStat = fileStat.parent;
			if (!fileStat) {
				return Promise.resolve(void 0);
			}
		}
		//调整视角到选中项
		let revealPromise: Promise<void>;
		if (reveal) {
			revealPromise = this.reveal(fileStat, 0.5);
		} else {
			revealPromise = Promise.resolve(void 0);
		}

		return revealPromise.then(() => {
			if (!fileStat.isDirectory) {
				this.explorerViewer.setSelection([fileStat]); // 选中文件
			}
			this.explorerViewer.setFocus(fileStat);
		});
	}
	/**
	 * 调整可视角位置到指定项
	 */
	private reveal(element: any, relativeTop?: number): Promise<void> {
		if (!this.explorerViewer) {
			return Promise.resolve();
		}
		return new Promise<void>((resolve, reject) => {
			this.explorerViewer.reveal(element, relativeTop).then(result => {
				resolve();
			}, error => {
				reject(error);
			});
		});
	}

	/**
	 * 面板关闭
	 */
	public shutdown(): void {
		//TODO 面板关闭，这里可能需要记录相关的状态
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		//TODO 释放当前组件中的引用和事件监听
	}

	private treeContainer: HTMLDivElement;
	render(container: HTMLElement) {
		this.doRender(container);
	}

	private doRender(container: HTMLElement): void {
		this.treeContainer = document.createElement('div');
		voluationToStyle(this.treeContainer.style, { width: '100%', height: '100%' });
		container.appendChild(this.treeContainer);
		//创建资源管理器的树
		this.createViewer(this.treeContainer);
		this.create();
		this.explorerViewer.layout();

	}
}
export namespace ExplorerView {
	export const ID: string = 'workbench.explorer';
	export const TITLE: string = localize('explorerView.resourceManager', 'Explorer');
}