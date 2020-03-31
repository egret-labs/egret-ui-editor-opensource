import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { InstantiationService } from 'egret/platform/instantiation/common/instantiationService';
import { ServiceCollection } from 'egret/platform/instantiation/common/serviceCollection';
import { IEnvironmentService } from 'egret/platform/environment/common/environment';
import { innerWindowManager } from 'egret/platform/innerwindow/common/innerWindowManager';
import { ILifecycleService } from 'egret/platform/lifecycle/common/lifecycle';
import { LifecycleService } from 'egret/platform/lifecycle/electron-browser/lifecycleService';
import { IStorageService } from 'egret/platform/storage/common/storage';
import { IWindowClientService, IWindowConfiguration } from 'egret/platform/windows/common/window';
import { WindowClientService } from 'egret/platform/windows/electron-browser/windowClientServices';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import { IOperationBrowserService } from 'egret/platform/operations/common/operations-browser';
import { OperationBrowserService } from 'egret/platform/operations/electron-browser/operationService';
import { BrowserWindow } from 'electron';
import { INotificationService } from 'egret/platform/notification/common/notifications';
import { SimpleNotificationService } from '../services/notification/common/notification';
import { NotImplementedError } from 'vs/base/common/errors';


/**
 * 工作台入口需要的核心服务
 */
export interface ICoreServices {
	/**
	 * 工作空间服务
	 */
	workspaceService: IWorkspaceService;
	/**
	 * 环境变量服务
	 */
	environmentService: IEnvironmentService;
}


/**
 * 主进程发送到渲染进程的命令
 */
export interface IRunActionInWindowRequest {
	// 请求id
	id: string;

	// 请求来源
	from: 'menu' | 'touchbar' | 'mouse';

	//当前window
	activeWindow: BrowserWindow;
}


/**
 * 工作台入口
 */
export class WorkbenchShell {

	private workspaceService: IWorkspaceService;
	private environmentService: IEnvironmentService;
	private mainProcessServices: ServiceCollection;
	private notificationService: INotificationService;
	private storageService: IStorageService;


	private container: HTMLElement;
	private content: HTMLElement;

	private configuration: IWindowConfiguration;

	constructor(container: HTMLElement, coreServices: ICoreServices, mainProcessServices: ServiceCollection, configuration: IWindowConfiguration, storageService: IStorageService) {
		this.workspaceService = coreServices.workspaceService;
		this.environmentService = coreServices.environmentService;
		this.storageService = storageService;
		this.mainProcessServices = mainProcessServices;

		this.container = container;
		this.configuration = configuration;

		// 初始化弹出框
		this.content = document.createElement('div');
		this.content.className = 'shell-content';
		this.content.style.width = '100%';
		this.content.style.height = '100%';
		this.container.appendChild(this.content);
		// this.createContents(this.content);
		// 初始化内置窗体管理器
		const innerWindowContainer = document.createElement('div');
		innerWindowContainer.style.position = 'absolute';
		innerWindowContainer.style.pointerEvents = 'none';
		innerWindowContainer.style.width = '100%';
		innerWindowContainer.style.height = '100%';
		innerWindowContainer.style.top = '0';
		innerWindowContainer.style.left = '0';
		innerWindowContainer.style.zIndex = '1';
		this.content.appendChild(innerWindowContainer);
		innerWindowManager.init(innerWindowContainer);

	}

	private createContents(): void {
		// 初始化服务
		const [instantiationService, serviceCollection] = this.initServiceCollection();
		this.createWorkbench(instantiationService, serviceCollection, this.content, this.configuration);
	}

	/**
	 * 创建工作空间
	 * @param instantiationService 实例化服务
	 * @param serviceCollection 服务集合
	 * @param parent 父级容器
	 */
	protected createWorkbench(instantiationService: IInstantiationService, serviceCollection: ServiceCollection, parent: HTMLElement, configuration: IWindowConfiguration): any {
		throw new NotImplementedError();
	}


	/**
	 * 初始化服务集合
	 */
	private initServiceCollection(): [IInstantiationService, ServiceCollection] {
		const serviceCollection = new ServiceCollection();
		serviceCollection.set(IWorkspaceService, this.workspaceService);
		serviceCollection.set(IEnvironmentService, this.environmentService);

		//TODO 添加渲染进程更多服务

		this.mainProcessServices.forEach((serviceIdentifier, serviceInstance) => {
			serviceCollection.set(serviceIdentifier, serviceInstance);
		});

		const instantiationService: IInstantiationService = new InstantiationService(serviceCollection, true);


		this.notificationService = instantiationService.createInstance(SimpleNotificationService);
		serviceCollection.set(INotificationService, this.notificationService);
		serviceCollection.set(IStorageService, this.storageService);

		const windowClientService = new WindowClientService(this.configuration.windowId, this.configuration);
		serviceCollection.set(IWindowClientService, windowClientService);

		const lifecycleService = instantiationService.createInstance(LifecycleService);

		serviceCollection.set(IOperationBrowserService, new OperationBrowserService(windowClientService));

		//TODO 添加释放
		serviceCollection.set(ILifecycleService, lifecycleService);

		return [instantiationService, serviceCollection];
	}

	/**
	 * 启动工作台入口
	 */
	public open(): void {
		this.createContents();
	}
}