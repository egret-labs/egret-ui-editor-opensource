import { ICoreServices, WorkbenchShell } from './shell';
import { ServiceCollection } from 'egret/platform/instantiation/common/serviceCollection';
import { IWindowConfiguration } from 'egret/platform/windows/common/window';
import { IStorageService } from 'egret/platform/storage/common/storage';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { ResdepotWorkbench } from './resdepotWorkbench';

export class ResdepotShell extends WorkbenchShell {
	/**
	 *
	 */
	constructor(container: HTMLElement, coreServices: ICoreServices, mainProcessServices: ServiceCollection, configuration: IWindowConfiguration, storageService: IStorageService) {
		super(container, coreServices, mainProcessServices, configuration, storageService);
		
	}
	
	protected createWorkbench(instantiationService: IInstantiationService, serviceCollection: ServiceCollection, parent: HTMLElement, configuration: IWindowConfiguration): any {
		const workbench = instantiationService.createInstance(ResdepotWorkbench, parent, serviceCollection, configuration);

		console.log('Resdepot workbench starting up...');
		workbench.startup();

		return workbench;
	}
}