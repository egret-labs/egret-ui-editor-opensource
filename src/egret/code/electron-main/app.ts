import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { app, dialog } from 'electron';
import { IWindowsMainService, IOpenBrowserWindowOptions } from 'egret/platform/windows/common/windows';
import { WindowsMainService, LAST_OPNED_FOLDER } from 'egret/platform/windows/electron-main/windowsMainServices';
import { ILifecycleService } from 'egret/platform/lifecycle/electron-main/lifecycleMain';
import { IOperationMainService } from 'egret/platform/operations/common/operations-main';
import { AppMenu } from './menus';
import { OperationMainService } from '../../platform/operations/electron-main/operationMain';
import { IStateService } from '../../platform/state/common/state';
import { MainIPCServer, EUIPorject } from './mainIPC';
import { IEnvironmentService } from 'egret/platform/environment/common/environment';
import { getEUIProject } from 'egret/platform/environment/node/environmentService';
/**
 * 应用程序主线程
 */
export class CodeApplication {

	private windowsMainService: IWindowsMainService;
	private operationService: IOperationMainService;
	constructor(
		private mainIPCServer: MainIPCServer,
		@IInstantiationService private instantiationService: IInstantiationService,
		@ILifecycleService private lifecycleService: ILifecycleService,
		@IEnvironmentService private environmentService: IEnvironmentService,
		@IStateService private stateService: IStateService
	) {
		this.registerListeners();
		this.mainIPCServer.onOpenInstance(this.openInstance);
		this.lifecycleService.ready();
	}

	/**
	 * 启动应用程序
	 */
	public startup(): void {
		console.log('Starting EUI Editor');
		this.initServices();
		this.instantiationService.createInstance(AppMenu);
		if ((<any>global).macOpenFile) {
			const euiProject = getEUIProject((<any>global).macOpenFile);
			this.windowsMainService.open({
				cli: this.environmentService.args,
				folderPath: euiProject.folderPath,
				file: euiProject.file
			});
		} else {
			this.windowsMainService.open(this.getFistOpenWindowOptions());
		}
	}

	private initServices(machineId: string = ''): void {
		if (process.platform === 'win32') {
		} else if (process.platform === 'linux') {
		} else if (process.platform === 'darwin') {
		}

		this.windowsMainService = this.instantiationService.createInstance(WindowsMainService, machineId);
		this.instantiationService.addService(IWindowsMainService, this.windowsMainService);

		this.operationService = new OperationMainService(this.stateService, this.windowsMainService);
		this.instantiationService.addService(IOperationMainService, this.operationService);

	}

	private getFistOpenWindowOptions(): IOpenBrowserWindowOptions {
		const lastOpenedFolder: string = this.stateService.getItem<string>(LAST_OPNED_FOLDER, '');
		const euiProject = getEUIProject(this.environmentService.args);
		if (!euiProject.folderPath) {
			euiProject.folderPath = lastOpenedFolder;
		}
		return {
			cli: this.environmentService.args,
			folderPath: euiProject.folderPath,
			file: euiProject.file
		};
	}

	private openInstance = (project: EUIPorject): void => {
		console.log('open instance', project);
		this.windowsMainService.open({
			cli: this.environmentService.args,
			folderPath: project ? project.folderPath : null,
			file: project ? project.file : null
		});
	}

	private registerListeners(): void {
		app.on('open-file', (event: Event, path: string) => {
			event.preventDefault();
			const project = getEUIProject(path);
			if (this.windowsMainService) {
				this.windowsMainService.open({
					cli: this.environmentService.args,
					folderPath: project.folderPath,
					file: project.file
				});
			}
		});
	}

	// /**
	//  * 启动应用程序
	//  */
	// public startup(): void {
	// 	console.log('Starting EUI Editor');
	// 	const appInstantiationService = this.initServices();
	// 	appInstantiationService.invokeFunction(accessor => {
	// 		const appInstantiationService = accessor.get(IInstantiationService);
	// 		appInstantiationService.createInstance(AppMenu);
	// 	});
	// }

	// private initServices(machineId: string = ''): IInstantiationService {
	// 	const services = new ServiceCollection();
	// 	if (process.platform === 'win32') {
	// 	} else if (process.platform === 'linux') {
	// 	} else if (process.platform === 'darwin') {
	// 	}

	// 	this.windowsMainService = this.instantiationService.createInstance(WindowsMainService, machineId);
	// 	services.set(IWindowsMainService, this.windowsMainService);

	// 	this.operationService = new OperationMainService(this.stateService,this.windowsMainService);
	// 	services.set(IOperationMainService, this.operationService);

	// 	return this.instantiationService.createChild(services);
	// }
}