import { ICoreServices, WorkbenchShell } from './shell';
import { ServiceCollection } from 'egret/platform/instantiation/common/serviceCollection';
import { IWindowConfiguration } from 'egret/platform/windows/common/window';
import { IStorageService } from 'egret/platform/storage/common/storage';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { Workbench } from './workbench';

export class MainShell extends WorkbenchShell {
	/**
	 *
	 */
	constructor(container: HTMLElement, coreServices: ICoreServices, mainProcessServices: ServiceCollection, configuration: IWindowConfiguration, storageService: IStorageService) {
		super(container, coreServices, mainProcessServices, configuration, storageService);
		
	}
	
	protected createWorkbench(instantiationService: IInstantiationService, serviceCollection: ServiceCollection, parent: HTMLElement): any {
		const workbench = instantiationService.createInstance(Workbench, parent, serviceCollection);

		console.log('Workbench starting up...');
		workbench.startup();

		//TODO 测试Window
		//  createBtn(instantiationService);
		return workbench;
	}
}