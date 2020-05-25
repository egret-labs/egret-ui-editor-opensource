import { ServiceCollection } from 'egret/platform/instantiation/common/serviceCollection';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { FileModelService } from 'egret/workbench/services/editor/common/modelServices';
import { IFileModelService } from 'egret/workbench/services/editor/common/models';
import { SyncDescriptor } from '../../platform/instantiation/common/descriptors';
import { IFileService } from 'egret/platform/files/common/files';
import { FileService } from '../services/files/fileServices';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { ILifecycleService } from 'egret/platform/lifecycle/common/lifecycle';
import { IClipboardService } from 'egret/platform/clipboard/common/clipboardService';
import { ClipboardService } from 'egret/platform/clipboard/electron-browser/clipboardService';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import { remote, ipcRenderer } from 'electron';
import { IStorageService } from '../../platform/storage/common/storage';
import { IFocusablePart, FocusablePartCommandHelper } from '../../platform/operations/common/operations';
import { FileRootCommands } from '../parts/files/commands/fileRootCommands';
import { IOperationBrowserService } from '../../platform/operations/common/operations-browser';
import { SaveActiveOperation, SaveAllOperation } from '../parts/files/commands/fileRootOperations';
import { WorkbenchEditorService } from '../services/editor/common/editorService';
import { IWorkbenchEditorService } from '../services/editor/common/ediors';
import { ClosableTitleRenderFactory, DocumentPanelSerialize } from './boxlayoutRender';
import { Panel } from 'egret/parts/browser/panel';
import { initResEditorExts } from 'egret/exts/resdepot/resdepot.contribution';
import { DefaultResBoxLayoutTemplate } from './template';
import { IWindowConfiguration } from 'egret/platform/windows/common/window';
import URI from 'egret/base/common/uri';
import { initProject } from 'egret/exts/exml-exts/projectService';
import { ResEditorPart } from 'egret/editor/common/parts/resEditorPart';
import { IOutputService } from '../parts/output/common/output';
import { initResEventService } from 'egret/exts/resdepot/events/ResEventService';
import * as path from 'path';

class EmptyOutputService implements IOutputService {
	_serviceBrand: undefined;
	scrollLock: boolean;
	append(output: string): void {

	}
	init(impl: IOutputService): void {
		
	}
	clear(): void {

	}
}

/**
 * 工作台
 */
export class ResdepotWorkbench implements IFocusablePart {

	private editorPart: ResEditorPart;
	private parent: HTMLElement;
	private configuration: IWindowConfiguration;

	private fileService: IFileService;
	private editorService: WorkbenchEditorService;
	private serviceCollection: ServiceCollection;

	private toDispose: IDisposable[];

	private focusablePartCommandHelper: FocusablePartCommandHelper;
	constructor(
		parent: HTMLElement,
		serviceCollection: ServiceCollection,
		configuration: IWindowConfiguration,
		@IWorkspaceService private workspaceService: IWorkspaceService,
		@IInstantiationService private instantiationService: IInstantiationService,
		@ILifecycleService private lifecycleService: ILifecycleService,
		@IStorageService private storageService: IStorageService,
		@IOperationBrowserService private operationService: IOperationBrowserService
	) {
		this.parent = parent;
		this.parent.tabIndex = 0;

		this.serviceCollection = serviceCollection;
		this.configuration = configuration;

		this.toDispose = [];

		boxlayout.HtmlElementResizeHelper.UseNative = true;
		this.boxContainer = new boxlayout.BoxLayout();
		const titleRenderFactory = this.instantiationService.createInstance(ClosableTitleRenderFactory);
		this.boxContainer.init(this.parent,
			{
				useTabMenu: true,
				documentPanelSerialize: this.instantiationService.createInstance(DocumentPanelSerialize),
				documentTitleRenderFactory: titleRenderFactory
			});
		this.boxContainer.addEventListener(boxlayout.BoxLayoutEvent.PANEL_REMOVED, this.panelRemoved_handler, this);
		this.boxContainer.addEventListener(boxlayout.BoxLayoutEvent.PANEL_ADDED, this.panelAdded_handler, this);

		this.workspaceService.registerBoxlayout(this.boxContainer);

		this.focusablePartCommandHelper = this.instantiationService.createInstance(FocusablePartCommandHelper);
		this.initCommands();
		this.updateWindowTitle();
		ipcRenderer.on('egret:openResEditor', this.onOpenResEditorHandler);
	}

	private onOpenResEditorHandler = (event: Electron.IpcRendererEvent, data: any): void => {
		this.openResEditor(data);
	}

	/** 注册当前编辑器可以执行的命令 */
	private initCommands(): void {
		//文件根命令
		this.focusablePartCommandHelper.registerCommand(FileRootCommands.SAVE_ACTIVE, SaveActiveOperation);
		this.focusablePartCommandHelper.registerCommand(FileRootCommands.SAVE_ALL, SaveAllOperation);

		this.operationService.registerFocusablePart(this);
	}

	/**
	 * 得到这个部件对应的Dom节点
	 */
	public getRelativeELement(): HTMLElement {
		return document.body;
	}
	/**
	 * 运行一个命令
	 * @param command 要运行的命令
	 */
	public executeCommand<T>(command: string, ...args): Promise<T> {
		return this.focusablePartCommandHelper.executeOperation(command, args);
	}
	/**
	 * 是否可以运行指定命令
	 * @param command 需要判断的命令
	 */
	public hasCommand(command: string): boolean {
		return this.focusablePartCommandHelper.hasCommand(command);
	}

	private panelRemoved_handler(e: boxlayout.BoxLayoutEvent): void {
		const panel = e.data.panel as Panel;
		panel.setVisible(false);
	}

	private panelAdded_handler(e: boxlayout.BoxLayoutEvent): void {
		const panel = e.data.panel as Panel;
		panel.setVisible(true);
	}

	/**
	 * 安装
	 */
	public startup(): void {
		this.initServices();
		// checkUpdateFromLauncher();

		initProject(this.instantiationService);
		initResEditorExts();
		this.initParts();
		this.restoreLayout();
		this.registerListeners();

		if (this.configuration.file) {
			this.openResEditor(this.configuration.file);
		}
	}

	private openResEditor(file: string): void {
		if (!file) {
			return;
		}
		const resInstantiationService = initResEventService(this.instantiationService);
		this.editorService.openEditor({ resource: URI.file(file) }, false, resInstantiationService);
	}

	/**
	 * 初始化各个部件
	 */
	private initParts(): void {
		this.initBoxlayout();
	}
	private boxContainer: boxlayout.BoxLayout;
	private initBoxlayout(): void {
		this.boxContainer.applyLayoutConfig(DefaultResBoxLayoutTemplate);
		this.editorPart.initDocument(this.boxContainer.getDocumentElement().render as boxlayout.DocumentGroup);
	}
	/**
	 * 初始化workbench中的所有服务
	 */
	private initServices(): void {
		// 剪贴板服务
		this.serviceCollection.set(IClipboardService, new ClipboardService());
		// 文件服务
		this.fileService = this.instantiationService.createInstance(FileService, this.workspaceService.getWorkspace() ? this.workspaceService.getWorkspace().uri : null);
		this.serviceCollection.set(IFileService, this.fileService);
		// 文件数据模型服务
		this.serviceCollection.set(IFileModelService, new SyncDescriptor(FileModelService));
		// 编辑器部分
		this.editorPart = this.instantiationService.createInstance(ResEditorPart);
		this.editorService = this.instantiationService.createInstance(WorkbenchEditorService, this.editorPart);
		this.serviceCollection.set(IWorkbenchEditorService, this.editorService);
		// 输出
		this.serviceCollection.set(IOutputService, new EmptyOutputService());
	}

	private updateWindowTitle(): void {
		const window = remote.getCurrentWindow();
		let projectName = '';
		const workspace = this.workspaceService.getWorkspace();
		if (workspace && workspace.uri) {
			projectName = path.basename(workspace.uri.fsPath);
		}
		if (projectName) {
			window.setTitle(`${projectName} - Res Editor`);
		} else {
			window.setTitle(`Res Editor`);
		}
	}

	private onEditorChanged(): void {
		const window = remote.getCurrentWindow();
		const editor = this.editorPart.getActiveEditor();
		if (!editor) {
			window.close();
			return;
		}
	}

	private registerListeners(): void {
		this.toDispose.push(this.lifecycleService.onShutdown(reload => this.shutdown()));
		this.toDispose.push(this.editorPart.onEditorsChanged(this.onEditorChanged, this));
	}

	private shutdown(): void {
		// TODO
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.shutdown();
		this.toDispose = dispose(this.toDispose);
	}

	/**
	 * 恢复布局
	 */
	private restoreLayout(): void {
	}
}