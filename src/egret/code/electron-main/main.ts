import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { InstantiationService } from 'egret/platform/instantiation/common/instantiationService';
import { ServiceCollection } from 'egret/platform/instantiation/common/serviceCollection';
import { IEnvironmentService } from 'egret/platform/environment/common/environment';
import { EnvironmentService, getEUIProject } from 'egret/platform/environment/node/environmentService';
import { CodeApplication } from './app';
import { ILifecycleService, LifecycleService } from 'egret/platform/lifecycle/electron-main/lifecycleMain';
import { StateService } from 'egret/platform/state/node/stateService';
import { IStateService } from 'egret/platform/state/common/state';
import { MainIPCServer, MainIPCClient } from './mainIPC';
import { isMacintosh, isWindows } from 'egret/base/common/platform';
import { app } from 'electron';
import * as fs from 'fs';
import { connect, serve } from 'egret/base/parts/ipc/node/ipc.net';
import { once } from 'egret/base/common/functional';
import { ParsedArgs } from 'egret/platform/environment/common/args';

class ExpectedError extends Error {
	readonly isExpected = true;
}

/**
 * Electron主进程入口
 */
export class ElectronMain {
	constructor() {
	}

	public async startup(args: ParsedArgs): Promise<void> {
		const [instantiationService, environmentService, lifecycleService] = this.createServices(args);
		try {
			const mainIPCServer = await this.doStartup(args, environmentService, lifecycleService, true);
			instantiationService.createInstance(CodeApplication, mainIPCServer).startup();
		} catch (err) {
			if ((err as ExpectedError).isExpected) {
				if (err.message) {
					console.log(err.message);
				}
				lifecycleService.quit();
			} else {
				throw err;
			}
		}
	}

	private createServices(args: ParsedArgs): [IInstantiationService, IEnvironmentService, ILifecycleService] {
		const services = new ServiceCollection();

		const environmentService = new EnvironmentService(args, process.execPath);
		services.set(IEnvironmentService, environmentService);

		const stateServices = new StateService();
		services.set(IStateService, stateServices);

		const lifecycleService = new LifecycleService();
		services.set(ILifecycleService, lifecycleService);

		return [new InstantiationService(services, true), environmentService, lifecycleService];
	}

	private async doStartup(args: ParsedArgs, environmentService: IEnvironmentService, lifecycleService: ILifecycleService, retry: boolean): Promise<MainIPCServer> {
		let mainServer: MainIPCServer;
		try {
			const server = await serve(environmentService.mainIPCHandle);
			mainServer = new MainIPCServer(server);
			once(lifecycleService.onShutdown)(() => mainServer.close());
		} catch (error) {

			// Handle unexpected errors (the only expected error is EADDRINUSE that
			// indicates a second instance of Code is running)
			if (error.code !== 'EADDRINUSE') {
				// Any other runtime error is just printed to the console
				throw error;
			}

			// Since we are the second instance, we do not want to show the dock
			if (isMacintosh) {
				app.dock.hide();
			}

			// there's a running instance, let's connect to it
			let mainClient: MainIPCClient;
			try {
				const client = await connect(environmentService.mainIPCHandle);
				mainClient = new MainIPCClient(client);
			} catch (error) {

				// Handle unexpected connection errors by showing a dialog to the user
				if (!retry || isWindows || error.code !== 'ECONNREFUSED') {
					throw error;
				}

				// it happens on Linux and OS X that the pipe is left behind
				// let's delete it, since we can't connect to it and then
				// retry the whole thing
				try {
					fs.unlinkSync(environmentService.mainIPCHandle);
				} catch (error) {
					console.warn('Could not delete obsolete instance handle', error);

					throw error;
				}

				return this.doStartup(args, environmentService, lifecycleService, false);
			}

			// Send environment over...
			console.log('Sending env to running instance...');
			mainClient.openInstance(!!args['new-window'], getEUIProject(environmentService.args));

			// Cleanup
			mainClient.close();

			throw new ExpectedError('Sent env to running instance. Terminating...');
		}

		return mainServer;
	}
}