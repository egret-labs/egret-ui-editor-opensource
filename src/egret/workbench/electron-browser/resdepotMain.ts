import { EnvironmentService } from 'egret/platform/environment/node/environmentService';
import { IWindowConfiguration } from 'egret/platform/windows/common/window';
import { ResdepotShell } from './resdepotShell';
import { Main } from './main';

export class ResdepotMain extends Main {
	/**
	 *
	 */
	constructor() {
		super();
		
	}

	protected openWorkbench(configuration: IWindowConfiguration): Promise<void> {
		const mainServices = this.createMainProcessServices();
		const environmentService = new EnvironmentService(configuration, configuration.execPath);
		return this.createAndInitializeWorkspaceService(configuration, environmentService).then(workspaceService => {
			const storageService = this.createStorageService(workspaceService, environmentService);
	
			return this.domContentLoaded().then(() => {
				const shell = new ResdepotShell(document.body, {
					workspaceService, environmentService
				}, mainServices, configuration,storageService);
				shell.open();
			});
		});
	}

}