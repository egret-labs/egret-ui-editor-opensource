import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { ServiceCollection } from 'egret/platform/instantiation/common/serviceCollection';
import { IWindowsMainService } from 'egret/platform/windows/common/windows';
import { WindowsMainService } from 'egret/platform/windows/electron-main/windowsMainServices';
import { ILifecycleService } from 'egret/platform/lifecycle/electron-main/lifecycleMain';
import { IOperationMainService } from 'egret/platform/operations/common/operations-main';
import { AppMenu } from './menus';
import { OperationMainService } from '../../platform/operations/electron-main/operationMain';
import { IStateService } from '../../platform/state/common/state';
/**
 * 应用程序主线程
 */
export class CodeApplication {

	private windowsMainService: IWindowsMainService;
	private operationService: IOperationMainService;
	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@ILifecycleService private lifecycleService: ILifecycleService,
		@IStateService private stateService:IStateService
	) {
		this.lifecycleService.ready();
	}

	/**
	 * 启动应用程序
	 */
	public startup(): void {
		console.log('Starting EUI Editor');
		const appInstantiationService = this.initServices();
		appInstantiationService.invokeFunction(accessor => {
			const appInstantiationService = accessor.get(IInstantiationService);
			appInstantiationService.createInstance(AppMenu);
		});
	}

	private initServices(machineId: string = ''): IInstantiationService {
		const services = new ServiceCollection();
		if (process.platform === 'win32') {
		} else if (process.platform === 'linux') {
		} else if (process.platform === 'darwin') {
		}

		this.windowsMainService = this.instantiationService.createInstance(WindowsMainService, machineId);
		services.set(IWindowsMainService, this.windowsMainService);

		this.operationService = new OperationMainService(this.stateService,this.windowsMainService);
		services.set(IOperationMainService, this.operationService);
		
		return this.instantiationService.createChild(services);
	}
}