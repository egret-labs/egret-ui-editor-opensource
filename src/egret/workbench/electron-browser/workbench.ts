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
import { BaseEditor } from 'egret/editor/browser/baseEditor';
import { AlignView } from '../parts/align/electron-browser/views/alignView';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { ILifecycleService } from 'egret/platform/lifecycle/common/lifecycle';
import { IClipboardService } from 'egret/platform/clipboard/common/clipboardService';
import { ClipboardService } from 'egret/platform/clipboard/electron-browser/clipboardService';

import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import URI from '../../base/common/uri';
import { remote } from 'electron';
import { IStorageService, StorageScope } from '../../platform/storage/common/storage';
import * as  electron from 'electron';
import { IFocusablePart, FocusablePartCommandHelper, KeybindingType } from '../../platform/operations/common/operations';
import { RootCommands } from './commands/rootCommands';
import { OpenFolderOperation, PromptAboutOperation, WingPropertyOperation, KeybindingSettingOperation, CheckUpdateOperation, FeedbackOperation, PrompQuickOpenOperation, CloseCurrentOperation } from './commands/rootOperations';

const WINDOW_STATES = 'windowStates';

import './media/workbench.css';
import { FileRootCommands } from '../parts/files/commands/fileRootCommands';
import { NewExmlOperation, RevealFileInOsOperation, DeleteFileOperation, NewFolderOperation, CopyFilePathOperation, RenameFileOperation, SaveActiveOperation, SaveAllOperation } from '../parts/files/commands/fileRootOperations';
import { IOperationBrowserService } from '../../platform/operations/common/operations-browser';
import { SystemCommands } from 'egret/platform/operations/commands/systemCommands';
import { PanelDom } from '../../parts/browser/panelDom';
import { localize } from '../../base/localization/nls';
import { checkUpdateFromLauncher } from 'egret/platform/launcher/common/launchers';
import { IEditor } from 'egret/editor/core/editors';
import { PropertyView } from '../parts/properties/electron-browser/views/propertyView';
import { addClass, removeClass } from 'egret/base/common/dom';
import { initCodeService } from 'egret/exts/exml-exts/exml/common/server/codeService';
import { AnimationView } from '../parts/animation/electron-browser/views/animationView';

class EditorCreater {
	constructor(
		@IWorkbenchEditorService private editorService: IWorkbenchEditorService
	) {
	}

	public createEditor(panelInfo: string): boxlayout.ITabPanel {
		return <any>this.editorService.createEditor({ resource: URI.file(panelInfo) }) as boxlayout.ITabPanel;
	}
}

class DocumentPanelSerialize implements boxlayout.IPanelSerialize {

	private _editorCreater: EditorCreater;
	public get editorCreater(): EditorCreater {
		if (!this._editorCreater) {
			this._editorCreater = this.instantiationService.createInstance(EditorCreater);
		}
		return this._editorCreater;
	}
	constructor(
		@IInstantiationService private instantiationService: IInstantiationService) {
	}
	public serialize(ownerLayout: boxlayout.BoxLayout, panel: boxlayout.ITabPanel): string {
		return panel.getId();
	}
	public unSerialize(ownerLayout: boxlayout.BoxLayout, panelInfo: string): boxlayout.ITabPanel {
		return this.editorCreater.createEditor(panelInfo);
	}
}

enum EditorMenuCommmands {
	close = 'close',
	closeOthers = 'closeOthers',
	closeRight = 'closeRight',
	closeAllSaved = 'closeAllSaved',
	closeAll = 'closeAll',
}

class ClosableTitleRender extends boxlayout.DefaultTitleRender {

	private menu: electron.Menu;
	constructor(
		@IWorkbenchEditorService private editorService: IWorkbenchEditorService
	) {
		super();
		this.mouseDown_handler = this.mouseDown_handler.bind(this);
		this.closeClick_handler = this.closeClick_handler.bind(this);
		this.rootClick_handler = this.rootClick_handler.bind(this);

		const closeBtn = document.createElement('div');
		closeBtn.className = 'close-btn';
		closeBtn.addEventListener('click', this.closeClick_handler);
		this.root.appendChild(closeBtn);
		this.initContextMenu();

	}

	private initContextMenu(): void {
		this.menu = new remote.Menu();
		this.addMenuItem(localize('editor.contextMenu.close', 'Close'), EditorMenuCommmands.close);
		this.addMenuItem(localize('editor.contextMenu.closeOthers', 'Close Others'), EditorMenuCommmands.closeOthers);
		this.addMenuItem(localize('editor.contextMenu.closeRight', 'Close to the Right'), EditorMenuCommmands.closeRight);
		this.addMenuItem(localize('editor.contextMenu.closeAllSaved', 'Close Saved'), EditorMenuCommmands.closeAllSaved);
		this.addMenuItem(localize('editor.contextMenu.closeAll', 'Close All'), EditorMenuCommmands.closeAll);

		this.root.addEventListener('mousedown', this.mouseDown_handler);
		this.root.addEventListener('mouseup', this.rootClick_handler);
	}
	private rootClick_handler(e: MouseEvent): void {
		if (e.which === 2) {
			this.closeSelf();
		}
		const isDoubleClick = (e.detail === 2);
		if (isDoubleClick) {
			const editor = this.panel as BaseEditor;
			if (editor instanceof BaseEditor) {
				editor.setPreview(false);
			}
			this.setPreivew(false);
		}
	}
	private mouseDown_handler(e: MouseEvent): void {
		if (e.button === 2) {
			e.preventDefault();
			e.stopImmediatePropagation();
			e.stopPropagation();
			this.displayContextMenu(e.pageX, e.pageY);
		}
	}

	public updateDisplay(): void {
		super.updateDisplay();
		const editor = this.panel as BaseEditor;
		if (editor instanceof BaseEditor) {
			this.setPreivew(editor.isPreview);
		}
	}

	private setPreivew(isPreview: boolean): void {
		const children = this.root.getElementsByClassName('tabbar-item-title');
		if (children.length > 0) {
			const target = children[0] as HTMLElement;
			if (isPreview) {
				addClass(target, 'preview');
			} else {
				removeClass(target, 'preview');
			}
		}
	}

	/**
	 * 显示上下文菜单
	 * @param displayX 
	 * @param displayY 
	 */
	private displayContextMenu(displayX: number, displayY: number): void {
		setTimeout(() => {
			this.menu.popup(remote.getCurrentWindow(), { x: displayX, y: displayY });
		}, 20);
	}

	private addMenuItem(label: string, id: string): void {
		const option: electron.MenuItemConstructorOptions = { label, id };
		const item = this.createItem(option);
		this.menu.append(item);
	}
	/**
	 * 在上下文菜单中添加一个分割线
	 */
	private addMenuSeparator(): void {
		const option: electron.MenuItemConstructorOptions = { type: 'separator' };
		const item = new remote.MenuItem(option);
		this.menu.append(item);
	}

	private createItem(option: electron.MenuItemConstructorOptions): electron.MenuItem {
		option.click = (item, win) => {
			this.menuItemClick_handler(option.id as EditorMenuCommmands);
		};
		const item = new remote.MenuItem(option);
		return item;
	}

	private menuItemClick_handler(id: EditorMenuCommmands): void {
		switch (id) {
			case EditorMenuCommmands.close:
				this.closeSelf();
				break;
			case EditorMenuCommmands.closeAll:
				this.closeAll();
				break;
			case EditorMenuCommmands.closeAllSaved:
				this.closeAllSaved();
				break;
			case EditorMenuCommmands.closeOthers:
				this.closeOthers();
				break;
			case EditorMenuCommmands.closeRight:
				this.closeRight();
				break;
			default:
				break;
		}
	}

	private closeClick_handler(e: MouseEvent): void {
		this.closeSelf();
	}

	private closeSelf(): void {
		const editor = this.panel as BaseEditor;
		if (editor instanceof BaseEditor) {
			this.editorService.closeEditor(editor);
		}
	}

	private closeAll(): void {
		let panels = this.panel.ownerGroup.panels;
		panels = panels.concat();
		this.closeEditors(<any>panels as IEditor[]);
	}
	private closeAllSaved(): void {
		const panels = this.panel.ownerGroup.panels;
		const editors: IEditor[] = [];
		for (let i = 0; i < panels.length; i++) {
			const editor = panels[i] as BaseEditor;
			if (!editor.input.isDirty()) {
				editors.push(editor);
			}
		}
		this.closeEditors(editors);
	}
	private closeOthers(): void {
		const panels = this.panel.ownerGroup.panels;
		const curPanel = this.panel;
		const editors: IEditor[] = [];
		for (let i = 0; i < panels.length; i++) {
			if (panels[i] != curPanel) {
				editors.push(panels[i] as BaseEditor);
			}
		}
		this.closeEditors(editors);
	}
	private closeRight(): void {
		const panels = this.panel.ownerGroup.panels;
		const curPanel = this.panel;
		const editors: IEditor[] = [];
		let started: boolean = false;
		for (let i = 0; i < panels.length; i++) {
			if (started) {
				editors.push(panels[i] as BaseEditor);
			}
			if (panels[i] == curPanel) {
				started = true;
			}
		}
		this.closeEditors(editors);
	}

	private closeEditors(inputs: IEditor[]): void {
		// var resources:URI[] = [];
		// for(var i = 0;i<inputs.length;i++){
		// 	resources.push(inputs[i].input.getResource());
		// }
		this.editorService.closeEditors(inputs);
		// this.fileModelService.confirmSave(resources).then(result=>{
		// 	if(result == ConfirmResult.SAVE){
		// 		this.fileModelService.saveAll(resources).then(results=>{
		// 			if (!results.some(r => !r.success)) {//没有保存失败的内容
		// 				this.editorService.closeEditors(inputs);
		// 			}else{
		// 				var fails:URI[] = [];
		// 				for(var i = 0;i<results.length;i++){
		// 					var result = results[i];
		// 					if(!result.success){
		// 						fails.push(result.source);
		// 					}
		// 				}
		// 				var message = '';
		// 				if (fails.length == 1) {
		// 					message = localize('editor.contextMenu.saveError','Save the changes made to file {0} fail.',paths.basename(fails[0].fsPath));
		// 				} else {
		// 					message = getConfirmMessage(localize('editor.contextMenu.saveErrors','Save the changes made to the following {0} files fail.',fails.length), fails);
		// 				}
		// 				this.notificationService.error({content:message});
		// 			}
		// 		});
		// 	}else if(result == ConfirmResult.DONT_SAVE){
		// 		this.editorService.closeEditors(inputs);
		// 	}
		// });
	}
}


class ClosableTitleRenderFactory implements boxlayout.ITitleRenderFactory {
	constructor(@IInstantiationService private instantiationService: IInstantiationService) {
	}

	public createTitleRender(): boxlayout.ITitleRender {
		return this.instantiationService.createInstance(ClosableTitleRender);
	}
}

/**
 * 工作台
 */
export class Workbench implements IFocusablePart {

	private editorPart: EditorPart;
	private parent: HTMLElement;

	private fileService: IFileService;
	private serviceCollection: ServiceCollection;
	private editorService: WorkbenchEditorService;

	private toDispose: IDisposable[];

	private focusablePartCommandHelper: FocusablePartCommandHelper;
	constructor(
		parent: HTMLElement,
		serviceCollection: ServiceCollection,
		@IWorkspaceService private workspaceService: IWorkspaceService,
		@IInstantiationService private instantiationService: IInstantiationService,
		@ILifecycleService private lifecycleService: ILifecycleService,
		@IStorageService private storageService: IStorageService,
		@IOperationBrowserService private operationService: IOperationBrowserService
	) {
		this.parent = parent;
		this.parent.tabIndex = 0;

		this.serviceCollection = serviceCollection;

		this.toDispose = [];

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
		this.restoreWindowState();
		this.initCommands();
	}
	/** 注册当前编辑器可以执行的命令 */
	private initCommands(): void {
		//普通根命令
		this.focusablePartCommandHelper.registerCommand(RootCommands.OPEN_FOLDER, OpenFolderOperation);
		this.focusablePartCommandHelper.registerCommand(RootCommands.PROMPT_ABOUT, PromptAboutOperation);
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
		checkUpdateFromLauncher();

		initExtensions(this.instantiationService);
		initCodeService(this.instantiationService);
		this.initParts();
		this.restoreLayout();
		this.registerListeners();
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
	}

	private registerListeners(): void {
		this.toDispose.push(this.lifecycleService.onShutdown(reload => this.shutdown()));
	}

	private shutdown(): void {
		this.storeWindowState();
		this.shutdownPanels();
	}
	private storeLayoutState(): void {
		//TODO 存储布局状态，需要杨宁的支持
	}
	private storeWindowState(): void {
		const window = remote.getCurrentWindow();
		const bounds = window.getBounds();
		const isMaximized = window.isMaximized;
		const config = { bounds, isMaximized };
		const configStr = JSON.stringify(config);
		this.storageService.store(WINDOW_STATES, configStr, StorageScope.WORKSPACE);
	}
	private restoreWindowState(): void {
		const displays = electron.screen.getAllDisplays();
		const layoutConfigStr = this.storageService.get(WINDOW_STATES, StorageScope.WORKSPACE);
		let layoutConfig = null;
		if (layoutConfigStr) {
			layoutConfig = JSON.parse(layoutConfigStr);
		}
		if (!layoutConfig) {
			return;
		}
		let boundsState = layoutConfig.bounds;
		const isMaximized = layoutConfig.isMaximized;

		let isInScreen = false;
		const offsetW: number = 40;
		const offsetH: number = 40;
		for (let i = 0; i < displays.length; i++) {
			var curDisplay = displays[i].bounds;
			if (
				boundsState.x + boundsState.width - offsetW >= curDisplay.x &&
				boundsState.y + boundsState.height - offsetH >= curDisplay.y &&
				boundsState.x + offsetW <= curDisplay.x + curDisplay.width &&
				boundsState.y + offsetH <= curDisplay.y + curDisplay.height
			) {
				isInScreen = true;
				break;
			}
		}
		if (!isInScreen) {
			curDisplay = displays[0].bounds;
			boundsState = {
				x: curDisplay.x + 20,
				y: curDisplay.y + 20,
				width: curDisplay.x + curDisplay.width - 40,
				height: curDisplay.y + curDisplay.height - 40
			};
		}
		const window = remote.getCurrentWindow();
		window.setBounds(boundsState, true);
		if (isMaximized) {
			window.maximize();
		}
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