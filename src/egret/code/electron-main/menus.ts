import { Menu, MenuItem } from 'electron';
import { isMacintosh, isWindows } from '../../base/common/platform';
import { IWindowsMainService } from '../../platform/windows/common/windows';
import { ILifecycleService } from '../../platform/lifecycle/electron-main/lifecycleMain';
import { IOperationMainService } from '../../platform/operations/common/operations-main';
import { RootCommands } from '../../workbench/electron-browser/commands/rootCommands';
import { FileRootCommands } from '../../workbench/parts/files/commands/fileRootCommands';
import { SystemCommands } from '../../platform/operations/commands/systemCommands';
import { localize } from '../../base/localization/nls';
import { APPLICATION_NAME } from 'egret/consts/consts';


interface IMenuItemClickHandler {
	inDevTools: (contents: Electron.WebContents) => void;
	inNoWindow: () => void;
}

function mnemonicMenuLabel(label: string): string {
	if (isMacintosh) {
		return label.replace(/\(&&\w\)|&&/g, '');
	}
	return label.replace(/&&/g, '&');
}

/**
 * 系统菜单
 */
export class AppMenu {

	private appMenuInstalled: boolean = false;
	constructor(
		@IWindowsMainService private windowsMainService: IWindowsMainService,
		@ILifecycleService private lifecycleService: ILifecycleService,
		@IOperationMainService private operationService: IOperationMainService
	) {
		this.install();
		this.operationService.onKeybindingUpdate(() => this.keybingdingUpdate_handler());
	}

	private updateKeybindingFlag = false;
	private keybingdingUpdate_handler(): void {
		if (this.updateKeybindingFlag) {
			return;
		}
		this.updateKeybindingFlag = true;
		setTimeout(() => {
			this.updateKeybindingFlag = false;
			this.doUpdateKeybinding();
		}, 200);
	}

	private doUpdateKeybinding(): void {
		//快捷键改变了以后重新安装
		this.install();
	}

	private install(): void {
		// Menus
		const menubar = new Menu();

		// Mac: 应用程序菜单
		let macApplicationMenuItem: Electron.MenuItem;
		if (isMacintosh) {
			const applicationMenu = new Menu();
			macApplicationMenuItem = new MenuItem({ label: APPLICATION_NAME, submenu: applicationMenu });
			this.setMacApplicationMenu(applicationMenu);
		}

		// 文件菜单
		const fileMenu = new Menu();
		const fileMenuItem = new MenuItem({ label: mnemonicMenuLabel(localize('menus.install.fileMenu', 'File(&&F)')), submenu: fileMenu });
		this.setFileMenu(fileMenu);

		// 编辑菜单
		const editMenu = new Menu();
		const editMenuItem = new MenuItem({ label: mnemonicMenuLabel(localize('menus.install.editMenu', 'Edit(&&E)')), submenu: editMenu });
		this.setEditMenu(editMenu);

		// 查看菜单
		const viewMenu = new Menu();
		const viewMenuItem = new MenuItem({ label: mnemonicMenuLabel('查看(&&V)'), submenu: viewMenu });
		this.setViewMenu(viewMenu);

		// 窗口
		const windowMenu = new Menu();
		const windowMenuItem = new MenuItem({ label: mnemonicMenuLabel(localize('menus.install.windowMenu', 'Window(&&W)')), role: 'windowMenu', submenu: windowMenu });
		this.setWindowsMenu(windowMenu);

		// 帮助菜单
		const helpMenu = new Menu();
		const helpMenuItem = new MenuItem({ label: mnemonicMenuLabel(localize('menus.install.help', 'Help(&&H)')), submenu: helpMenu, role: 'help' });
		this.setHelpMenu(helpMenu);

		// Mac: 应用程序菜单
		if (macApplicationMenuItem) {
			menubar.append(macApplicationMenuItem);
		}
		menubar.append(fileMenuItem);
		menubar.append(editMenuItem);
		menubar.append(viewMenuItem);
		menubar.append(windowMenuItem);
		menubar.append(helpMenuItem);

		Menu.setApplicationMenu(menubar);

		//TODO Dock 菜单   
		if (isMacintosh && !this.appMenuInstalled) {
			this.appMenuInstalled = true;
			//TODO 需要完善
		}
	}

	/**
	 * Mac 应用程序菜单
	 */
	private setMacApplicationMenu(macApplicationMenu: Electron.Menu): void {
		const about = this.createMenuItem(localize('system.about', 'About {0}', APPLICATION_NAME), '', RootCommands.PROMPT_ABOUT, '', '');
		const checkUpdate = this.createMenuItem(localize('system.checkUpdate', 'Check Update...'), '', RootCommands.CHECK_UPDATE, '', '');
		const preferences = this.getPreferencesMenu();
		const servicesMenu = new Menu();
		const services = new MenuItem({ label: localize('menus.setMacApplicationMenu.services', 'Services'), role: 'services', submenu: servicesMenu });

		const hide = new MenuItem({ label: localize('menus.setMacApplicationMenu.hide', 'Hide {0}', APPLICATION_NAME), role: 'hide', accelerator: 'Command+H' });
		const hideOthers = new MenuItem({ label: localize('menus.setMacApplicationMenu.hideothers', 'Hide Other'), role: 'hideothers', accelerator: 'Command+Alt+H' });
		const showAll = new MenuItem({ label: localize('menus.setMacApplicationMenu.unhide', 'Show All'), role: 'unhide' });
		const quit = new MenuItem({
			label: localize('menus.setMacApplicationMenu.quit', 'Quit {0}', APPLICATION_NAME), accelerator: 'CmdOrCtrl+Q',
			click: () => this.lifecycleService.quit()
		});
		const memus = [about];
		memus.push(
			checkUpdate,
			__separator__(),
			preferences,
			__separator__(),
			services,
			__separator__(),
			hide,
			hideOthers,
			showAll,
			__separator__(),
			quit);
		memus.forEach(item => macApplicationMenu.append(item));
	}

	/**
	 * 文件菜单
	 */
	private setFileMenu(fileMenu: Electron.Menu): void {
		const open = this.createMenuItem(mnemonicMenuLabel(localize('menus.setFileMenu.openFolder', 'Open Folder(&&P)')), 'CmdOrCtrl+O', RootCommands.OPEN_FOLDER, localize('menus.setFileMenu.openFolderTxt', 'Open Folder'), localize('menus.setFileMenu.openFolderOpt', 'Open folder (project) operation'));
		const createFolder = this.createMenuItem(mnemonicMenuLabel(localize('menus.setFileMenu.newFolder', 'Create Folder(&&F)')), 'Shift+CmdOrCtrl+N', FileRootCommands.NEW_FOLDER, localize('menus.setFileMenu.newFolderTxt', 'Create Folder'), localize('menus.setFileMenu.newFolderOpt', 'Create a folder in the currently selected directory'));
		const createExml = this.createMenuItem(mnemonicMenuLabel(localize('menus.setFileMenu.newExml', 'Create EXML Skin(&&N)')), 'CmdOrCtrl+N', FileRootCommands.NEW_EXML_FILE, localize('menus.setFileMenu.newExmlTxt', 'Create EXML Skin'), localize('menus.setFileMenu.newExmlOpt', 'Create a new Exml skin in the currently selected directory'));

		const save = this.createMenuItem(mnemonicMenuLabel(localize('menus.setFileMenu.save', 'Save(&&S)')), 'CmdOrCtrl+S', FileRootCommands.SAVE_ACTIVE, localize('menus.setFileMenu.saveTxt', 'Save'), localize('menus.setFileMenu.saveOpt', 'Save the current editor'));
		const saveAll = this.createMenuItem(mnemonicMenuLabel(localize('menus.setFileMenu.allSave', 'Save All(&&L)')), 'Alt+CmdOrCtrl+S', FileRootCommands.SAVE_ALL, localize('menus.setFileMenu.allSaveTxt', 'Save All'), localize('menus.setFileMenu.allSaveOpt', 'Save all open editors'));

		const closeCurrent = this.createMenuItem(mnemonicMenuLabel(localize('menus.setFileMenu.closeEditor', 'Close Editor(&&C)')), 'CmdOrCtrl+W', RootCommands.CLOSE_CURRENT, localize('menus.setFileMenu.closeEditorTxt', 'Close Editor'), localize('menus.setFileMenu.closeEditorOpt', 'Close the current editor'));

		const reload = this.createMenuItem(mnemonicMenuLabel(localize('menus.setFileMenu.reload', 'Reload(&&R)')), '', FileRootCommands.RELOAD, null, null);
		const memus = [open, __separator__(), createFolder, createExml, __separator__(), save, saveAll,__separator__(),closeCurrent,__separator__(),reload];

		
		if (isWindows) {
			const preferences = this.getPreferencesMenu();
			memus.push(__separator__(), preferences);

			const exit = new MenuItem({ label: mnemonicMenuLabel(localize('menus.setFileMenu.quit', 'Quit(&&X)')), accelerator: 'CmdOrCtrl+Q', click: () => this.lifecycleService.quit() });
			memus.push(__separator__(), exit);
		}


		memus.forEach(item => fileMenu.append(item));
	}
	/**
	 * 首选项菜单
	 */
	private getPreferencesMenu(): Electron.MenuItem {
		const menus = new Menu();
		const keybingding = this.createMenuItem(mnemonicMenuLabel(localize('menus.getPreferencesMenu.shortcut', 'Shortcut key settings(&&K)')), '', RootCommands.KEYBINDING_SETTING, '', '');
		menus.append(keybingding);
		menus.append(__separator__());

		const wingProperty = this.createMenuItem(mnemonicMenuLabel(localize('menus.getPreferencesMenu.euiConfigure', 'EUI Project Setting(&&P)')), '', RootCommands.WING_PROPERTY, '', '');
		menus.append(wingProperty);
		return new MenuItem({ label: mnemonicMenuLabel(localize('menus.getPreferencesMenu.preference', 'Preference(&&P)')), submenu: menus });
	}
	/**
	 * 编辑菜单
	 */
	private setEditMenu(winLinuxEditMenu: Electron.Menu): void {
		let undo: Electron.MenuItem;
		let redo: Electron.MenuItem;
		let cut: Electron.MenuItem;
		let copy: Electron.MenuItem;
		let paste: Electron.MenuItem;
		let selectAll: Electron.MenuItem;
		if (isMacintosh) {
			undo = this.createMenuItem(mnemonicMenuLabel(localize('menus.setEditMenu.undo', 'Undo(&&U)')), 'CmdOrCtrl+Z', SystemCommands.UNDO, localize('menus.setEditMenu.undoTxt', 'Undo'), localize('menus.setEditMenu.undoOpt', 'Undo operation'), {
				inDevTools: devTools => devTools.undo(),
				inNoWindow: () => Menu.sendActionToFirstResponder('undo:')
			});
			redo = this.createMenuItem(mnemonicMenuLabel(localize('menus.setEditMenu.redo', 'Redo(&&R)')), 'Shift+CmdOrCtrl+Z', SystemCommands.REDO, localize('menus.setEditMenu.redoTxt', 'Redo'), localize('menus.setEditMenu.redoOpt', 'Redo operation'), {
				inDevTools: devTools => devTools.redo(),
				inNoWindow: () => Menu.sendActionToFirstResponder('redo:')
			});
			cut = this.createMenuItem(mnemonicMenuLabel(localize('menus.setEditMenu.cut', 'Cut(&&T)')), 'CmdOrCtrl+X', SystemCommands.CUT, localize('menus.setEditMenu.cutTxt', 'Cut'), localize('menus.setEditMenu.cutOpt', 'Cut operation'), {
				inDevTools: devTools => devTools.cut(),
				inNoWindow: () => Menu.sendActionToFirstResponder('cut:')
			});
			copy = this.createMenuItem(mnemonicMenuLabel(localize('menus.setEditMenu.copy', 'Copy(&&C)')), 'CmdOrCtrl+C', SystemCommands.COPY, localize('menus.setEditMenu.copyTxt', 'Copy'), localize('menus.setEditMenu.copyOpt', 'Copy operation'), {
				inDevTools: devTools => devTools.copy(),
				inNoWindow: () => Menu.sendActionToFirstResponder('copy:')
			});
			paste = this.createMenuItem(mnemonicMenuLabel(localize('menus.setEditMenu.paste', 'Paste(&&P)')), 'CmdOrCtrl+V', SystemCommands.PASTE, localize('menus.setEditMenu.pasteTxt', 'Paste'), localize('menus.setEditMenu.pasteOpt', 'Paste operation'), {
				inDevTools: devTools => devTools.paste(),
				inNoWindow: () => Menu.sendActionToFirstResponder('paste:')
			});
			selectAll = this.createMenuItem(mnemonicMenuLabel(localize('menus.setEditMenu.allSelect', 'Select All(&&A)')), 'CmdOrCtrl+A', SystemCommands.SELECT_ALL, localize('menus.setEditMenu.allSelectTxt', 'Select All'), localize('menus.setEditMenu.allSelectOpt', 'Select all operation'), {
				inDevTools: devTools => devTools.selectAll(),
				inNoWindow: () => Menu.sendActionToFirstResponder('selectAll:')
			});
		} else {
			undo = this.createMenuItem(mnemonicMenuLabel(localize('menus.setEditMenu.undo', 'Undo(&&U)')), 'CmdOrCtrl+Z', SystemCommands.UNDO, localize('menus.setEditMenu.undoTxt', 'Undo'), localize('menus.setEditMenu.undoOpt', 'Undo operation'));
			redo = this.createMenuItem(mnemonicMenuLabel(localize('menus.setEditMenu.redo', 'Redo(&&R)')), 'CmdOrCtrl+Y', SystemCommands.REDO, localize('menus.setEditMenu.redoTxt', 'Redo'), localize('menus.setEditMenu.redoOpt', 'Redo operation'));
			cut = this.createMenuItem(mnemonicMenuLabel(localize('menus.setEditMenu.cut', 'Cut(&&T)')), 'CmdOrCtrl+X', SystemCommands.CUT, localize('menus.setEditMenu.cutTxt', 'Cut'), localize('menus.setEditMenu.cutOpt', 'Cut operation'));
			copy = this.createMenuItem(mnemonicMenuLabel(localize('menus.setEditMenu.copy', 'Copy(&&C)')), 'CmdOrCtrl+C', SystemCommands.COPY, localize('menus.setEditMenu.copyTxt', 'Copy'), localize('menus.setEditMenu.copyOpt', 'Copy operation'));
			paste = this.createMenuItem(mnemonicMenuLabel(localize('menus.setEditMenu.paste', 'Paste(&&P)')), 'CmdOrCtrl+V', SystemCommands.PASTE, localize('menus.setEditMenu.pasteTxt', 'Paste'), localize('menus.setEditMenu.pasteOpt', 'Paste operation'));
			selectAll = this.createMenuItem(mnemonicMenuLabel(localize('menus.setEditMenu.allSelect', 'Select All(&&A)')), 'CmdOrCtrl+A', SystemCommands.SELECT_ALL, localize('menus.setEditMenu.allSelectTxt', 'Select All'), localize('menus.setEditMenu.allSelectOpt', 'Select all operation'));
		}

		const memus = [
			undo,
			redo,
			__separator__(),
			cut,
			copy,
			paste,
			__separator__(),
			selectAll
		];
		memus.forEach(item => winLinuxEditMenu.append(item));
	}



	private toggleDevTools(): void {
		const w = this.windowsMainService.getFocusedWindow();
		if (w && w.win) {
			const contents = w.win.webContents;
			if (isMacintosh && !w.win.isFullScreen() && !contents.isDevToolsOpened()) {
				contents.openDevTools({ mode: 'undocked' }); // due to https://github.com/electron/electron/issues/3647
			} else {
				contents.toggleDevTools();
			}
		}
	}

	/**
	 * 文件菜单
	 */
	private setViewMenu(viewMenu: Electron.Menu): void {
		
		
		const explorer = this.createMenuItem(mnemonicMenuLabel(localize('menus.viewMenu.explorer', 'Explorer(&&U)')), '', RootCommands.EXPLORER_PANEL, '', '');
		const layer = this.createMenuItem(mnemonicMenuLabel(localize('menus.viewMenu.layer', 'Layer(&&L)')), '', RootCommands.LAYER_PANEL, '', '');
		const output = this.createMenuItem(mnemonicMenuLabel(localize('menus.viewMenu.output', 'Output(&&O)')), '', RootCommands.OUTPUT_PANEL, '', '');
		const assets = this.createMenuItem(mnemonicMenuLabel(localize('menus.viewMenu.resource', 'Resource(&&R)')), '', RootCommands.ASSETS_PANEL, '', '');
		const component = this.createMenuItem(mnemonicMenuLabel(localize('menus.viewMenu.component', 'Component(&&C)')), '', RootCommands.COMPONENT_PANEL, '', '');
		const alignment = this.createMenuItem(mnemonicMenuLabel(localize('menus.viewMenu.align', 'Align(&&A)')), '', RootCommands.ALIGNMENT_PANEL, '', '');
		const property = this.createMenuItem(mnemonicMenuLabel(localize('menus.viewMenu.property', 'Property(&&P)')), '', RootCommands.PROPERTY_PANEL, '', '');

		const quickOpen = this.createMenuItem(mnemonicMenuLabel(localize('menus.viewMenu.quickOpen', 'Quick Open(&&Q)')), 'CmdOrCtrl+Shift+R', RootCommands.PROMPT_QUICK_OPEN, localize('menus.viewMenu.quickOpenLabel', 'Quick Open'), localize('menus.viewMenu.quickOpenDes', 'Quick Open EXML file operation'));


		const memus = [explorer, layer, output, assets, component, alignment, property,__separator__(),quickOpen];
		memus.forEach(item => viewMenu.append(item));
	}


	/**
	 * 窗口菜单
	 */
	private setWindowsMenu(windowMenu: Electron.Menu): void {
		const minimize = this.createRoleMenuItem(mnemonicMenuLabel(localize('menus.setWindowsMenu.minimize', 'Minimize(&&M)')), 'minimize');
		const togglefullscreen = this.createRoleMenuItem(mnemonicMenuLabel(localize('menus.setWindowsMenu.togglefullscreen', 'Toggle Full Screen')), 'togglefullscreen');
		const menus = [minimize, togglefullscreen];
		menus.forEach(item => windowMenu.append(item));
	}

	/**
	 * 帮助菜单
	 */
	private setHelpMenu(helpMenu: Electron.Menu): void {
		const toggleDevToolsItem = new MenuItem({
			label: mnemonicMenuLabel(localize('menus.setHelpMenu.toggleDev', 'Toggle Dev(&&T)')),
			click: () => this.toggleDevTools(),
			enabled: true
		});
		const about = this.createMenuItem(localize('system.about', 'About {0}', APPLICATION_NAME) , '', RootCommands.PROMPT_ABOUT, '', '');
		const checkUpdate = this.createMenuItem(localize('system.checkUpdate', 'Check Update...'), '', RootCommands.CHECK_UPDATE, '', '');
		// const feedback = this.createMenuItem(localize('system.feedback', 'Send Feedback...'), '', RootCommands.FEEDBACK, '', '');
		const menus = [toggleDevToolsItem/*, feedback*/];
		if (isWindows) {
			menus.push(about, checkUpdate);
		}
		menus.forEach(item => helpMenu.append(item));
	}

	private createMenuItem(label: string, key: string, command: string, name: string, description: string, clickHandler: IMenuItemClickHandler = null): Electron.MenuItem {
		//TODO 需要先将enable设置为false，等渲染继承加载完成之后再设置为true
		const options: Electron.MenuItemConstructorOptions = {
			label,
			accelerator: this.operationService.getKeybinding(command, key, name, description),
			click: () => {
				if (clickHandler) {
					const activeWindow = this.windowsMainService.getFocusedWindow();
					if (!activeWindow) {
						return clickHandler.inNoWindow();
					}
					if (activeWindow.win.webContents.isDevToolsFocused()) {
						return clickHandler.inDevTools(activeWindow.win.webContents.devToolsWebContents);
					}
				}
				this.runActionInRenderer(command);
			},
			enabled: true
		};
		return new MenuItem(options);
	}

	private createRoleMenuItem(label: string, role: string): Electron.MenuItem {
		//TODO 需要先将enable设置为false，等渲染继承加载完成之后再设置为true
		const options: Electron.MenuItemConstructorOptions = {
			label: label,
			role,
			enabled: true
		};
		return new MenuItem(options);
	}

	/**
	 * 在渲染进程中执行命令
	 */
	private runActionInRenderer(command: string): void {
		if(command == FileRootCommands.RELOAD){
			this.windowsMainService.reload();
			return;
		}
		this.operationService.executeOperation(command);
	}
}

function __separator__(): Electron.MenuItem {
	return new MenuItem({ type: 'separator' });
}