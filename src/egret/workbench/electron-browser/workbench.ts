import { ServiceCollection } from 'egret/platform/instantiation/common/serviceCollection';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
//TabPanels
import { ExplorerView } from 'egret/workbench/parts/files/electron-browser/views/explorerView';
import { AssetsView } from 'egret/workbench/parts/assets/electron-browser/views/assetsView';
import { ComponentView } from 'egret/workbench/parts/components/electron-browser/views/componentView';
import { LayerView } from 'egret/workbench/parts/layers/electron-browser/views/layerView';
import { WorkbenchEditorService } from 'egret/workbench/services/editor/common/editorService';
import { FileModelService } from 'egret/workbench/services/editor/common/modelServices';
import { IFileModelService } from 'egret/workbench/services/editor/common/models';
import { SyncDescriptor } from '../../platform/instantiation/common/descriptors';
import { IFileService } from 'egret/platform/files/common/files';
import { DefaultBoxLayoutTemplate } from './template';
import { IWorkbenchEditorService } from '../services/editor/common/ediors';
import { EditorPart } from 'egret/editor/common/parts/editorPart';
import { Panel } from 'egret/parts/browser/panel';
import { FileService } from '../services/files/fileServices';
import { initExtensions } from 'egret/exts/extsInits';
import { OutputView } from '../parts/output/browser/outputView';
import { AlignView } from '../parts/align/electron-browser/views/alignView';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { ILifecycleService } from 'egret/platform/lifecycle/common/lifecycle';
import { IClipboardService } from 'egret/platform/clipboard/common/clipboardService';
import { ClipboardService } from 'egret/platform/clipboard/electron-browser/clipboardService';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import { IStorageService } from '../../platform/storage/common/storage';
import { IFocusablePart, FocusablePartCommandHelper, KeybindingType } from '../../platform/operations/common/operations';
import { RootCommands } from './commands/rootCommands';
import { OpenFolderOperation, PromptAboutOperation, WingPropertyOperation, KeybindingSettingOperation, CheckUpdateOperation, FeedbackOperation, PrompQuickOpenOperation, CloseCurrentOperation, ReportIssueOperation } from './commands/rootOperations';
import { FileRootCommands } from '../parts/files/commands/fileRootCommands';
import { NewExmlOperation, RevealFileInOsOperation, DeleteFileOperation, NewFolderOperation, CopyFilePathOperation, RenameFileOperation, SaveActiveOperation, SaveAllOperation, InstallShellCommandOperation } from '../parts/files/commands/fileRootOperations';
import { IOperationBrowserService } from '../../platform/operations/common/operations-browser';
import { SystemCommands } from 'egret/platform/operations/commands/systemCommands';
import { PanelDom } from '../../parts/browser/panelDom';
import { localize } from '../../base/localization/nls';
// import { checkUpdateFromLauncher } from 'egret/platform/launcher/common/launchers';
import { PropertyView } from '../parts/properties/electron-browser/views/propertyView';
import { initCodeService } from 'egret/exts/exml-exts/exml/common/server/codeService';
import { AnimationView } from '../parts/animation/electron-browser/views/animationView';
import { IAnimationService } from 'egret/workbench/parts/animation/common/animation';
import { AnimationService } from 'egret/workbench/parts/animation/common/animationService';
import { ClosableTitleRenderFactory, DocumentPanelSerialize } from './boxlayoutRender';
import { ipcRenderer } from 'electron';
import { IWindowClientService } from 'egret/platform/windows/common/window';
import './media/workbench.css';
import { IExplorerService } from '../parts/files/common/explorer';
import URI from 'egret/base/common/uri';
import * as paths from 'egret/base/common/paths';

/**
 * 工作台
 */
export class Workbench implements IFocusablePart {

	private editorPart: EditorPart;
	private parent: HTMLElement;

	private fileService: IFileService;
	private serviceCollection: ServiceCollection;
	private editorService: WorkbenchEditorService;
	private animationService: AnimationService;

	private toDispose: IDisposable[];

	private focusablePartCommandHelper: FocusablePartCommandHelper;
	constructor(
		parent: HTMLElement,
		serviceCollection: ServiceCollection,
		@IWorkspaceService private workspaceService: IWorkspaceService,
		@IInstantiationService private instantiationService: IInstantiationService,
		@ILifecycleService private lifecycleService: ILifecycleService,
		@IStorageService private storageService: IStorageService,
		@IWindowClientService private windowService: IWindowClientService,
		@IOperationBrowserService private operationService: IOperationBrowserService
	) {
		this.parent = parent;
		this.parent.tabIndex = 0;

		this.serviceCollection = serviceCollection;

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
		ipcRenderer.on('egret:openFile', this.onOpenEditorHandler);
	}

	private onOpenEditorHandler = (event: Electron.IpcRendererEvent, data: any): void => {
		if (!data) {
			return;
		}
		if (!this.editorService) {
			return;
		}
		this.instantiationService.invokeFunction(async (accessor) => {
			const service = accessor.get(IExplorerService);
			if (service) {
				try {
					const target = URI.file(data);
					await service.select(target, true);
					const selections = service.getFileSelection();
					for (let i = 0; i < selections.length; i++) {
						const element = selections[i];
						if (paths.isEqual(element.resource.toString(), target.toString())) {
							const extname = paths.extname(target.fsPath);
							if (extname === '.json') {
								this.editorService.openResEditor(target);
							} else {
								this.editorService.openEditor({ resource: target }, false);
							}
							break;
						}
					}
				} catch (error) {
					console.log('open file error', error);
				}
			}
		});
	}

	/** 注册当前编辑器可以执行的命令 */
	private initCommands(): void {
		//普通根命令
		this.focusablePartCommandHelper.registerCommand(RootCommands.OPEN_FOLDER, OpenFolderOperation);
		this.focusablePartCommandHelper.registerCommand(RootCommands.PROMPT_ABOUT, PromptAboutOperation);
		this.focusablePartCommandHelper.registerCommand(RootCommands.REPORT, ReportIssueOperation);
		this.focusablePartCommandHelper.registerCommand(RootCommands.PROMPT_QUICK_OPEN, PrompQuickOpenOperation);
		this.focusablePartCommandHelper.registerCommand(RootCommands.CHECK_UPDATE, CheckUpdateOperation);
		this.focusablePartCommandHelper.registerCommand(RootCommands.FEEDBACK, FeedbackOperation);
		this.focusablePartCommandHelper.registerCommand(RootCommands.KEYBINDING_SETTING, KeybindingSettingOperation);
		this.focusablePartCommandHelper.registerCommand(RootCommands.WING_PROPERTY, WingPropertyOperation);//TODO 这个应该放在 Exml相关的初始化中

		this.focusablePartCommandHelper.registerCommand(RootCommands.CLOSE_CURRENT, CloseCurrentOperation);


		//文件根命令
		//TODO 这个新建Exml的命令不应该放在这里
		this.focusablePartCommandHelper.registerCommand(FileRootCommands.NEW_EXML_FILE, NewExmlOperation);
		this.focusablePartCommandHelper.registerCommand(FileRootCommands.REVEAL_FILE_IN_OS, RevealFileInOsOperation);
		this.focusablePartCommandHelper.registerCommand(FileRootCommands.DELETE_FILE, DeleteFileOperation);
		this.focusablePartCommandHelper.registerCommand(FileRootCommands.NEW_FOLDER, NewFolderOperation);
		this.focusablePartCommandHelper.registerCommand(FileRootCommands.COPY_FILE_PATH, CopyFilePathOperation);
		this.focusablePartCommandHelper.registerCommand(FileRootCommands.RENAME_FILE, RenameFileOperation);
		this.focusablePartCommandHelper.registerCommand(FileRootCommands.SAVE_ACTIVE, SaveActiveOperation);
		this.focusablePartCommandHelper.registerCommand(FileRootCommands.SAVE_ALL, SaveAllOperation);
		this.focusablePartCommandHelper.registerCommand(FileRootCommands.INSTALL_SHELL_COMMAND, InstallShellCommandOperation);

		this.operationService.registerFocusablePart(this);
		//系统根命令
		this.operationService.registerKeybingding(SystemCommands.DELETE, 'backspace mod+backspace del mod+del', KeybindingType.KEY_DOWN, localize('system.delete', 'Delete'), localize('workbench.initCommands.deleteSys', 'System delete command'));
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
		const panelMap: {} = {};
		panelMap[RootCommands.EXPLORER_PANEL] = [ExplorerView.ID];
		panelMap[RootCommands.LAYER_PANEL] = [LayerView.ID];
		panelMap[RootCommands.OUTPUT_PANEL] = [OutputView.ID];
		panelMap[RootCommands.ASSETS_PANEL] = [AssetsView.ID];
		panelMap[RootCommands.COMPONENT_PANEL] = [ComponentView.ID];
		panelMap[RootCommands.ALIGNMENT_PANEL] = [AlignView.ID];
		panelMap[RootCommands.PROPERTY_PANEL] = [PropertyView.ID];
		if (command in panelMap) {
			const panelId = panelMap[command];
			const panels = this.boxContainer.getAllOpenPanels();
			let existPanel: boxlayout.ITabPanel = null;
			for (let i = 0; i < panels.length; i++) {
				if (panels[i].getId() == panelId) {
					existPanel = panels[i];
					break;
				}
			}
			if (existPanel) {
				existPanel.focus();
			} else {
				this.boxContainer.openPanelById(panelMap[command], true);
			}
			return Promise.resolve(void 0);
		}
		return this.focusablePartCommandHelper.executeOperation(command, args);
	}
	/**
	 * 是否可以运行指定命令
	 * @param command 需要判断的命令
	 */
	public hasCommand(command: string): boolean {
		const panelCommands = [
			RootCommands.EXPLORER_PANEL,
			RootCommands.LAYER_PANEL,
			RootCommands.OUTPUT_PANEL,
			RootCommands.ASSETS_PANEL,
			RootCommands.COMPONENT_PANEL,
			RootCommands.ALIGNMENT_PANEL,
			RootCommands.PROPERTY_PANEL
		];
		if (panelCommands.indexOf(command as RootCommands) != -1) {
			return true;
		}
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

		initExtensions(this.instantiationService);
		initCodeService(this.instantiationService);
		this.initParts();
		this.restoreLayout();
		this.registerListeners();
		ipcRenderer.send('egret:workbenchReady', this.windowService.getCurrentWindowId());
	}

	/**
	 * 初始化各个部件
	 */
	private initParts(): void {
		this.initBoxlayout();
	}
	private boxContainer: boxlayout.BoxLayout;
	private initBoxlayout(): void {
		this.boxContainer.registPanel(this.instantiationService.createInstance(PanelDom, ExplorerView.ID, ExplorerView.TITLE, ExplorerView, './resources/icons/explorer.png'));
		this.boxContainer.registPanel(this.instantiationService.createInstance(PanelDom, PropertyView.ID, PropertyView.TITLE, PropertyView, './resources/icons/property.png'));
		this.boxContainer.registPanel(this.instantiationService.createInstance(PanelDom, AssetsView.ID, AssetsView.TITLE, AssetsView, './resources/icons/assets.png'));
		this.boxContainer.registPanel(this.instantiationService.createInstance(PanelDom, PropertyView.ID, PropertyView.TITLE, PropertyView, './resources/icons/property.png'));
		this.boxContainer.registPanel(this.instantiationService.createInstance(PanelDom, ComponentView.ID, ComponentView.TITLE, ComponentView, './resources/icons/components.png'));
		this.boxContainer.registPanel(this.instantiationService.createInstance(PanelDom, LayerView.ID, LayerView.TITLE, LayerView, './resources/icons/layer.png'));
		this.boxContainer.registPanel(this.instantiationService.createInstance(PanelDom, OutputView.ID, OutputView.TITLE, OutputView, './resources/icons/console.png'));
		this.boxContainer.registPanel(this.instantiationService.createInstance(PanelDom, AlignView.ID, AlignView.TITLE, AlignView, './resources/icons/alignment.svg'));
		this.boxContainer.registPanel(this.instantiationService.createInstance(PanelDom, AnimationView.ID, AnimationView.TITLE, AnimationView, './resources/icons/animation.svg'));
		this.boxContainer.applyLayoutConfig(DefaultBoxLayoutTemplate);
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
		this.editorPart = this.instantiationService.createInstance(EditorPart);
		this.editorService = this.instantiationService.createInstance(WorkbenchEditorService, this.editorPart);
		this.serviceCollection.set(IWorkbenchEditorService, this.editorService);
		//动画
		this.animationService = this.instantiationService.createInstance(AnimationService);
		this.serviceCollection.set(IAnimationService, this.animationService);
	}

	private registerListeners(): void {
		this.toDispose.push(this.lifecycleService.onShutdown(reload => this.shutdown()));
	}

	private shutdown(): void {
		this.shutdownPanels();
	}
	private storeLayoutState(): void {
		//TODO 存储布局状态，需要杨宁的支持
	}

	private shutdownPanels(): void {
		this.editorPart.shutdown();
		const panels = this.boxContainer.getAllOpenPanels();
		panels.forEach(panel => {
			if (panel instanceof Panel) {
				panel.shutdown();
			}
		});
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.shutdown();
		const panels = this.boxContainer.getAllOpenPanels();
		panels.forEach(panel => {
			if (panel instanceof Panel) {
				panel.dispose();
			}
		});
		this.toDispose = dispose(this.toDispose);
	}

	/**
	 * 恢复布局
	 */
	private restoreLayout(): void {
	}
}