import { IWindowsMainService, IOpenBrowserWindowOptions, INativeOpenDialogOptions, MessageBoxOptions, IMessageBoxResult } from '../common/windows';
import { IInstantiationService } from '../../instantiation/common/instantiation';
import { IEnvironmentService } from '../../environment/common/environment';
import { ILifecycleService } from 'egret/platform/lifecycle/electron-main/lifecycleMain';
import { IBrowserWindowEx, IWindowConfiguration } from '../common/window';
import { mixin } from 'egret/base/common/objects';
import { BrowserWindowEx } from './browserWindowEx';
import { dialog, ipcMain as ipc } from 'electron';
import { isMacintosh } from 'egret/base/common/platform';
import { normalizeNFC } from 'egret/base/common/strings';
import * as fs from 'fs';
import { IStateService } from '../../state/common/state';
import { dirname, normalize, isEqual } from '../../../base/common/paths';
import { localize } from '../../../base/localization/nls';
import { ResdepotWindow } from './resdepotWindow';
import URI from 'egret/base/common/uri';

export const LAST_OPNED_FOLDER: string = 'lastOpenedFolder';

class WindowInstance {
	public openedFolderUri: URI | null;
	public resWindow?: IBrowserWindowEx;
	/**
	 *
	 */
	constructor(public mainWindow: IBrowserWindowEx,
		openedFolderUri: URI | null,
		@IInstantiationService private instantiationService: IInstantiationService,
		@ILifecycleService private lifecycleService: ILifecycleService, ) {
		this.openedFolderUri = openedFolderUri;
	}

	public getWindow(id: number): IBrowserWindowEx | null {
		if (this.mainWindow.id === id) {
			return this.mainWindow;
		}
		if (this.resWindow && this.resWindow.id === id) {
			return this.resWindow;
		}
		return null;
	}

	public openResWindow(configuration: IWindowConfiguration): void {
		if (this.resWindow) {
			this.resWindow.send('egret:openResEditor', configuration.file);
			this.resWindow.focus();
			return;
		}
		this.resWindow = this.instantiationService.createInstance(ResdepotWindow, 'res', false);
		this.resWindow.load(configuration);
		this.lifecycleService.registerWindow(this.resWindow);
	}

	public async closeRes(): Promise<boolean> {
		if (this.resWindow) {
			const closed = await this.closeWindow(this.resWindow);
			if (closed) {
				this.resWindow = null;
			}
			return closed;
		}
		return Promise.resolve(true);
	}

	private closeWindow(window: IBrowserWindowEx): Promise<boolean> {
		return this.lifecycleService.unload(window, false).then(veto => {
			if (!veto) {
				window.close();
			}
			return !veto;
		});
	}

	public async close(): Promise<boolean> {
		await this.closeRes();
		return await this.closeWindow(this.mainWindow);
	}
}

/**
 * 窗体管理器
 */
export class WindowsMainService implements IWindowsMainService {

	_serviceBrand: undefined;

	private dialogs: Dialogs;
	private openedWindows: WindowInstance[] = [];
	constructor(
		private readonly machineId: string,
		@IInstantiationService private instantiationService: IInstantiationService,
		@IEnvironmentService private environmentService: IEnvironmentService,
		@ILifecycleService private lifecycleService: ILifecycleService,
		@IStateService private stateService: IStateService
	) {
		this.dialogs = new Dialogs(environmentService, stateService, this);
		this.registerListeners();
	}
	private registerListeners(): void {
		// React to workbench ready events from windows
		ipc.on('egret:workbenchReady', (event: Event, windowId: number) => {
			const win = this.getWindowById(windowId);
			if (win) {
				win.setReady();
				// console.log('window workbech ready', win.isReady, windowId);
			}
		});
		this.lifecycleService.onWindowClosed(this.onWindowClosed, this);
		ipc.on('egret:showMessageBox', (event, data: { options: MessageBoxOptions, replyChannel: string }) => {
			const window = this.getWindowById(data.options.windowId) || this.getFocusedWindow();
			this.showMessageBox(data.options).then(result => {
				window.send(data.replyChannel, result);
			});
		});
		ipc.on('egret:pickFolderAndOpen', (event, options: INativeOpenDialogOptions) => {
			this.pickFolderAndOpen(options);
		});
		ipc.on('egret:openResWindow', (event, data: { windowId: number, folderPath: string, file: string }) => {
			const options: IOpenBrowserWindowOptions = {
				cli: this.environmentService.args,
				folderPath: data.folderPath,
				file: data.file
			};
			this.openResWindow(data.windowId, options);
		});
	}

	/**
	 * 打开
	 */
	public open(options: IOpenBrowserWindowOptions, fromMainWindowId?: number): void {
		if (!options.folderPath) {
			// folderPath 为null说明是通过不带参数的eui命令或鼠标点击打开的，此时应该打开一个空实例
			const emptyInstance = this.getEmptyWindowInstance();
			if (emptyInstance) {
				emptyInstance.mainWindow.focus();
			} else {
				this.openMainWindow(options);
			}
		} else {
			const useExistInstance = this.getWindowInstance(URI.file(options.folderPath));
			if (useExistInstance) {
				if (options.file) {
					console.log('open file', useExistInstance.mainWindow.isReady, options.file);
					useExistInstance.mainWindow.sendWhenReady('egret:openFile', options.file);
				}
				useExistInstance.mainWindow.focus();
			} else {
				let targetIntance: WindowInstance | null = null;
				if (typeof fromMainWindowId === 'number') {
					targetIntance = this.getWindowInstance(fromMainWindowId);
				} else {
					targetIntance = this.getEmptyWindowInstance();
				}
				if (targetIntance) {
					let closedPromise = this.lifecycleService.unload(targetIntance.mainWindow).then(veto => {
						return !veto;
					});
					closedPromise.then(unloaded => {
						if (unloaded) {
							this.stateService.setItem(LAST_OPNED_FOLDER, options.folderPath);
							const configuration: IWindowConfiguration = this.getConfiguration(options);
							targetIntance.closeRes();
							targetIntance.mainWindow.load(configuration);
							targetIntance.openedFolderUri = URI.file(options.folderPath);
						}
					});
				} else {
					this.openMainWindow(options);
				}
			}
		}
	}

	public openNewWindow(): void {
		this.openMainWindow({
			cli: this.environmentService.args
		}, true);
	}

	/**
	 * 重新加载当前激活的窗体
	 */
	public reload(): void {
		let refreshPromise = Promise.resolve(true);
		const focusedWindow = this.getFocusedWindow();
		if (focusedWindow) {
			refreshPromise = this.lifecycleService.unload(focusedWindow, true).then(veto => {
				return !veto;
			});
			refreshPromise.then(unloaded => {
				if (unloaded) {
					const targetIntance = this.getWindowInstance(focusedWindow.id);
					if (targetIntance) {
						if (targetIntance.resWindow &&
							targetIntance.resWindow.id !== focusedWindow.id) {
							targetIntance.closeRes();
						}
					}
					focusedWindow.reload();
				}
			});
		}
	}

	private openMainWindow(options: IOpenBrowserWindowOptions, newWindow: boolean = false): void {
		this.stateService.setItem(LAST_OPNED_FOLDER, options.folderPath ? options.folderPath : '');
		const configuration: IWindowConfiguration = this.getConfiguration(options);

		const mainWindow = this.instantiationService.createInstance(BrowserWindowEx, 'main', newWindow);
		mainWindow.load(configuration);
		mainWindow.focus();
		this.lifecycleService.registerWindow(mainWindow);
		this.openedWindows.push(this.instantiationService.createInstance(WindowInstance, mainWindow, options.folderPath ? URI.file(options.folderPath) : null));
		console.log('window instance, total: ', this.openedWindows.length);
	}

	private openResWindow(mainWindowId: number, options: IOpenBrowserWindowOptions): void {
		const configuration: IWindowConfiguration = this.getConfiguration(options);
		const instance = this.getWindowInstance(mainWindowId);
		if (instance) {
			instance.openResWindow(configuration);
		}
	}

	private getConfiguration(options: IOpenBrowserWindowOptions): IWindowConfiguration {
		const configuration: IWindowConfiguration = mixin({}, options.cli);
		configuration.machineId = this.machineId;
		configuration.appRoot = this.environmentService.appRoot;
		configuration.execPath = process.execPath;
		configuration.folderPath = options.folderPath;
		configuration.file = options.file;

		return configuration;
	}

	private onWindowClosed(window: IBrowserWindowEx): void {
		for (let i = 0; i < this.openedWindows.length; i++) {
			const instance = this.openedWindows[i];
			if (instance.resWindow === window) {
				instance.resWindow = null;
				break;
			}
			if (instance.mainWindow === window) {
				instance.closeRes();
				this.openedWindows.splice(i, 1);
				break;
			}
		}
		console.log('window instance, total: ', this.openedWindows.length);
	}

	/**
	 * 退出
	 */
	public async quit(): Promise<void> {
		for (let i = 0; i < this.openedWindows.length; i++) {
			const instance = this.openedWindows[i];
			await instance.close();
		}
		this.openedWindows = [];
	}
	/**
	 * 选择文件打开
	 */
	public pickFolderAndOpen(options: INativeOpenDialogOptions): void {
		this.doPickAndOpen(options, true /* pick folders */, false /* pick files */);
	}

	private doPickAndOpen(options: INativeOpenDialogOptions, pickFolders: boolean, pickFiles: boolean): void {
		const internalOptions = options;

		internalOptions.pickFolders = pickFolders;
		internalOptions.pickFiles = pickFiles;

		if (!internalOptions.dialogOptions) {
			internalOptions.dialogOptions = Object.create(null);
		}

		if (!internalOptions.dialogOptions.title) {
			if (pickFolders && pickFiles) {
				internalOptions.dialogOptions.title = localize('windowsMainService.doPickAndOpen.open', 'Open');
			} else if (pickFolders) {
				internalOptions.dialogOptions.title = localize('windowsMainService.doPickAndOpen.openFolder', 'Open Folder');
			} else {
				internalOptions.dialogOptions.title = localize('windowsMainService.doPickAndOpen.openFile', 'Open File');
			}
		}
		this.dialogs.pickAndOpen(internalOptions);
	}
	/**
	 * 弹出消息盒子
	 * @param options 
	 */
	public showMessageBox(options: MessageBoxOptions): Promise<IMessageBoxResult> {
		const focusedWindow = this.getWindowById(options.windowId) || this.getFocusedWindow();
		return this.dialogs.showMessageBox(options, focusedWindow);
	}
	/**
	 * 发送消息
	 * @param channel
	 * @param args
	 */
	public sendToFocused(channel: string, ...args: any[]): void {
		const focusedWindow = this.getFocusedWindow();
		if (focusedWindow) {
			focusedWindow.send(channel, ...args);
		}
	}
	/**
	 * 获得当前window
	 */
	public getFocusedWindow(): IBrowserWindowEx | null {
		for (let i = 0; i < this.openedWindows.length; i++) {
			const instance = this.openedWindows[i];
			if (instance.mainWindow.isFocus()) {
				return instance.mainWindow;
			}
			if (instance.resWindow && instance.resWindow.isFocus()) {
				return instance.resWindow;
			}
		}
		return null;
	}
	/**
	 * 根据ID得到窗体
	 */
	public getWindowById(id: number): IBrowserWindowEx | null {
		for (let i = 0; i < this.openedWindows.length; i++) {
			const instance = this.openedWindows[i];
			if (instance.mainWindow.id === id) {
				return instance.mainWindow;
			}
			if (instance.resWindow && instance.resWindow.id === id) {
				return instance.resWindow;
			}
		}
		return null;
	}
	/**
	 * 得到所有窗体
	 */
	public getAllWindows(): IBrowserWindowEx[] {
		let all: IBrowserWindowEx[] = [];
		for (let i = 0; i < this.openedWindows.length; i++) {
			const instance = this.openedWindows[i];
			all.push(instance.mainWindow);
			if (instance.resWindow) {
				all.push(instance.resWindow);
			}
		}
		return all;
	}

	private getEmptyWindowInstance(): WindowInstance | null {
		for (let i = 0; i < this.openedWindows.length; i++) {
			const instance = this.openedWindows[i];
			if (!instance.openedFolderUri) {
				return instance;
			}
		}
		return null;
	}

	private getWindowInstance(openedFolderUri: URI): WindowInstance | null;
	private getWindowInstance(mainWindowId: number): WindowInstance | null;
	private getWindowInstance(value: any): WindowInstance | null {
		for (let i = 0; i < this.openedWindows.length; i++) {
			const instance = this.openedWindows[i];
			if (typeof value === 'number') {
				if (instance.mainWindow.id === value) {
					return instance;
				}
			} else if (value instanceof URI) {
				if (instance.openedFolderUri) {
					// https://github.com/egret-labs/egret-ui-editor-opensource/issues/75
					// 只有当完全相等的时候才算匹配成功
					if (isEqual(normalize(value.fsPath), normalize(instance.openedFolderUri.fsPath))) {
						return instance;
					}
				}
			}
		}
		return null;
	}
}


//TODO 这种弹窗应该改为队列操作
/**
 * 对话框
 */
class Dialogs {
	private static readonly workingDirPickerStorageKey = 'pickerWorkingDir';

	constructor(
		private environmentService: IEnvironmentService,
		private stateService: IStateService,
		private windowsMainService: IWindowsMainService) {

	}

	public pickAndOpen(options: INativeOpenDialogOptions): void {
		this.getFileOrFolderPaths(options).then(paths => {
			let folderPath: string = null;
			if (paths) {
				for (let i = 0; i < paths.length; i++) {
					let stat: fs.Stats = null;
					try {
						stat = fs.statSync(paths[i]);
					} catch (error) { }
					if (stat.isDirectory()) {
						folderPath = paths[i];
						break;
					}
				}
			}
			// Open
			if (folderPath) {
				this.windowsMainService.open({
					cli: this.environmentService.args,
					folderPath: folderPath
				}, options.windowId);
			}
		});
	}

	private getFileOrFolderPaths(options: INativeOpenDialogOptions): Promise<string[]> {
		if (!options.dialogOptions) {
			options.dialogOptions = Object.create(null);
		}
		//TODO 得到上一次的路径，目前先改为得到存储路径
		if (!options.dialogOptions.defaultPath) {
			options.dialogOptions.defaultPath = this.stateService.getItem<string>(Dialogs.workingDirPickerStorageKey);
		}

		if (typeof options.pickFiles === 'boolean' || typeof options.pickFolders === 'boolean') {
			options.dialogOptions.properties = void 0; // let it override based on the booleans

			if (options.pickFiles && options.pickFolders) {
				options.dialogOptions.properties = ['multiSelections', 'openDirectory', 'openFile', 'createDirectory'];
			}
		}

		if (!options.dialogOptions.properties) {
			options.dialogOptions.properties = ['multiSelections', options.pickFolders ? 'openDirectory' : 'openFile', 'createDirectory'];
		}

		if (isMacintosh) {
			options.dialogOptions.properties.push('treatPackageAsDirectory'); // always drill into .app files
		}
		// Show Dialog
		const focusedWindow = this.windowsMainService.getWindowById(options.windowId) || this.windowsMainService.getFocusedWindow();

		return this.showOpenDialog(options.dialogOptions, focusedWindow).then(paths => {
			if (paths && paths.length > 0) {
				this.stateService.setItem(Dialogs.workingDirPickerStorageKey, dirname(paths[0]));
				return paths;
			}
			return void 0;
		});
	}

	public showOpenDialog(options: Electron.OpenDialogOptions, window?: IBrowserWindowEx): Promise<string[]> {
		function normalizePaths(paths: string[]): string[] {
			if (paths && paths.length > 0 && isMacintosh) {
				paths = paths.map(path => normalizeNFC(path)); // normalize paths returned from the OS
			}
			return paths;
		}
		return new Promise((resolve, reject) => {
			dialog.showOpenDialog(window ? window.win : void 0, options).then((value)=> {
				resolve(normalizePaths(value.filePaths));
			});
		});
	}

	public async showMessageBox(options: Electron.MessageBoxOptions, window: IBrowserWindowEx): Promise<IMessageBoxResult> {
		const result = await dialog.showMessageBox(window.win, options);
		return { button: result.response, checkboxChecked: result.checkboxChecked };
	}
}