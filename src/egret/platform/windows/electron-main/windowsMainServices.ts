import { IWindowsMainService, IOpenBrowserWindowOptions, INativeOpenDialogOptions, MessageBoxOptions, IMessageBoxResult } from '../common/windows';
import { IInstantiationService } from '../../instantiation/common/instantiation';
import { IEnvironmentService } from '../../environment/common/environment';
import { ILifecycleService } from 'egret/platform/lifecycle/electron-main/lifecycleMain';
import { IBrowserWindowEx, IWindowConfiguration } from '../common/window';
import { mixin } from 'egret/base/common/objects';
import { BrowserWindowEx } from './browserWindowEx';
import { app, dialog, ipcMain as ipc } from 'electron';
import { isMacintosh } from 'egret/base/common/platform';
import { normalizeNFC } from 'egret/base/common/strings';

import * as fs from 'fs';
import { IStateService } from '../../state/common/state';
import { dirname } from '../../../base/common/paths';
import { localize } from '../../../base/localization/nls';
import { debug } from 'util';

const LAST_OPNED_FOLDER: string = 'lastOpenedFolder';

/**
 * 窗体管理器
 */
export class WindowsMainService implements IWindowsMainService {

	_serviceBrand: any;

	private dialogs: Dialogs;
	constructor(
		private readonly machineId: string,
		@IInstantiationService private instantiationService: IInstantiationService,
		@IEnvironmentService private environmentService: IEnvironmentService,
		@ILifecycleService private lifecycleService: ILifecycleService,
		@IStateService private stateService: IStateService
	) {
		this.dialogs = new Dialogs(environmentService, stateService, this);
		const lastOpenedFolder: string = this.stateService.getItem<string>(LAST_OPNED_FOLDER, '');
		let folder:string = environmentService.args['folder'];
		if(!folder){
			const arg_ = environmentService.args['_'];
			if(arg_ && arg_.length > 1){
				const first: string = arg_[0];
				const target: string = arg_[1];
				if(first === app.getPath('exe')){
					if(target === '.'){
						folder = process.cwd();
					} else {
						folder = target;
					}
				}
			}
		}
		if(folder){
			if(
				(folder.charAt(0) == '\'' || folder.charAt(0) == '"') && 
				(folder.charAt(folder.length-1) == '\'' || folder.charAt(folder.length-1) == '"') 
			){
				folder = folder.slice(1,folder.length-1);
			}
		}
		let targetToOpen:string = lastOpenedFolder;
		if(folder){
			targetToOpen = folder;
		}
		this.openInBrowserWindow({
			cli: this.environmentService.args,
			folderPath: targetToOpen
		});
		this.registerListeners();
	}
	private registerListeners(): void {
		ipc.on('egret:showMessageBox', (event, data: { options: MessageBoxOptions, replyChannel: string }) => {
			const window = this.getWindowById(data.options.windowId) || this.getFocusedWindow();
			this.showMessageBox(data.options).then(result => {
				window.send(data.replyChannel, result);
			});
		});
		ipc.on('egret:pickFolderAndOpen', (event, options: INativeOpenDialogOptions) => {
			this.pickFolderAndOpen(options);
		});
	}

	/**
	 * 打开
	 */
	public open(options: IOpenBrowserWindowOptions): void {
		let closedPromise = Promise.resolve(true);
		if (this.mainWindow) {
			closedPromise = this.lifecycleService.unload(this.mainWindow).then(veto => {
				return !veto;
			});
		}
		closedPromise.then(closed => {
			if (closed) {
				this.mainWindow.close();
				this.mainWindow = null;
				this.openInBrowserWindow(options);
			}
		});
	}
	/**
	 * 重新加载当前激活的窗体
	 */
	public reload():void{
		let refreshPromise = Promise.resolve(true);
		const focusedWindow = this.getFocusedWindow();
		if(focusedWindow){
			refreshPromise = this.lifecycleService.unload(this.mainWindow,true).then(veto => {
				return !veto;
			});
			refreshPromise.then(refresh => {
				if (refresh) {
					focusedWindow.reload();
				}
			});
		}
	}

	private mainWindow: IBrowserWindowEx;
	private openInBrowserWindow(options: IOpenBrowserWindowOptions): void {
		this.stateService.setItem(LAST_OPNED_FOLDER, options.folderPath ? options.folderPath : '');
		const configuration: IWindowConfiguration = mixin({}, options.cli);
		configuration.machineId = this.machineId;
		configuration.appRoot = this.environmentService.appRoot;
		configuration.execPath = process.execPath;
		configuration.folderPath = options.folderPath;

		this.mainWindow = this.instantiationService.createInstance(BrowserWindowEx);
		this.mainWindow.load(configuration);
		this.lifecycleService.registerWindow(this.mainWindow);
	}
	/**
	 * 退出
	 */
	public quit(): void {
		this.mainWindow.close();
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
				internalOptions.dialogOptions.title = localize('windowsMainService.doPickAndOpen.open','Open');
			} else if (pickFolders) {
				internalOptions.dialogOptions.title = localize('windowsMainService.doPickAndOpen.openFolder','Open Folder');
			} else {
				internalOptions.dialogOptions.title = localize('windowsMainService.doPickAndOpen.openFile','Open File');
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
	public getFocusedWindow(): IBrowserWindowEx {
		return this.mainWindow;
	}
	/**
	 * 根据ID得到窗体
	 */
	public getWindowById(id: number): IBrowserWindowEx {
		if (this.mainWindow.id == id) {
			return this.mainWindow;
		}
		return null;
	}
	/**
	 * 得到所有窗体
	 */
	public getAllWindows():IBrowserWindowEx[]{
		return [this.mainWindow];
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
				});
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
			dialog.showOpenDialog(window ? window.win : void 0, options, paths => {
				resolve(normalizePaths(paths));
			});
		});
	}

	public async showMessageBox(options: Electron.MessageBoxOptions, window: IBrowserWindowEx): Promise<IMessageBoxResult> {
		const result = await dialog.showMessageBox(window.win, options);
		return {button: result.response, checkboxChecked: result.checkboxChecked};
	}
}