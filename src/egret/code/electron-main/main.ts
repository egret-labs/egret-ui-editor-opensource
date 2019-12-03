import { ServicesAccessor, IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { InstantiationService } from 'egret/platform/instantiation/common/instantiationService';
import { ServiceCollection } from 'egret/platform/instantiation/common/serviceCollection';
import { IEnvironmentService, ParsedArgs } from 'egret/platform/environment/common/environment';
import { EnvironmentService } from 'egret/platform/environment/node/environmentService';

import { SyncDescriptor } from 'egret/platform/instantiation/common/descriptors';

import { CodeApplication } from './app';
import { ILifecycleService, LifecycleService } from 'egret/platform/lifecycle/electron-main/lifecycleMain';
import { StateService } from 'egret/platform/state/node/stateService';
import { IStateService } from 'egret/platform/state/common/state';


/**
 * Electron主进程入口
 */
export class ElectronMain {
	constructor(args: ParsedArgs) {
		const instantiationService = this.createServices(args);
		instantiationService.createInstance(CodeApplication).startup();
	}

	private createServices(args: ParsedArgs): IInstantiationService {
		const services = new ServiceCollection();

		const environmentService = new EnvironmentService(args, process.execPath);
		services.set(IEnvironmentService, environmentService);

		const stateServices = new StateService();
		services.set(IStateService, stateServices);

		services.set(ILifecycleService, new SyncDescriptor(LifecycleService));

		return new InstantiationService(services, true);
	}
}