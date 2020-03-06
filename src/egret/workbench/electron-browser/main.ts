import { ServiceCollection } from 'egret/platform/instantiation/common/serviceCollection';
import { IEnvironmentService } from 'egret/platform/environment/common/environment';
import { EnvironmentService } from 'egret/platform/environment/node/environmentService';
import { WorkbenchShell } from './shell';
import { WorkspaceService } from 'egret/platform/workspace/workspaceService';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import { IStorageService } from 'egret/platform/storage/common/storage';
import { StorageService, IStorage } from 'egret/platform/storage/common/storageService';
import uri from 'egret/base/common/uri';
import { IWindowConfiguration } from 'egret/platform/windows/common/window';
import { isMacintosh } from 'egret/base/common/platform';

/**
 * 渲染进程启动
 */
export function startup(configuration: IWindowConfiguration): Promise<void> {
	if(isMacintosh){
		if(process.env.PATH.indexOf(':/usr/local/bin') == -1){
			process.env.PATH = process.env.PATH + ':/usr/local/bin';
		}
	}

	//阻止原生选择操作
	document['onselectstart'] = function () { return false; };
	
	return openWorkbench(configuration);
}

function openWorkbench(configuration: IWindowConfiguration): Promise<void> {
	const mainServices = createMainProcessServices();
	const environmentService = new EnvironmentService(configuration, configuration.execPath);
	return createAndInitializeWorkspaceService(configuration, environmentService).then(workspaceService => {
		const storageService = createStorageService(workspaceService, environmentService);

		return domContentLoaded().then(() => {
			const shell = new WorkbenchShell(document.body, {
				workspaceService, environmentService
			}, mainServices, configuration,storageService);
			shell.open();
		});
	});
}

function createStorageService(workspaceService: IWorkspaceService, environmentService: IEnvironmentService): IStorageService {

	let workspaceId: string;
	let secondaryWorkspaceId: number;

	if(workspaceService.getWorkspace())
	{
		workspaceId = uri.from({ path: workspaceService.getWorkspace().uri.fsPath, scheme: 'root' }).toString();
	}

	const storage: IStorage = window.localStorage;

	return new StorageService(storage, storage, workspaceId, secondaryWorkspaceId);

}

function domContentLoaded(): Promise<any> {
	return new Promise<any>((c, e) => {
		const readyState = document.readyState;
		if (readyState === 'complete' || (document && document.body !== null)) {
			window.setImmediate(c);
		} else {
			window.addEventListener('DOMContentLoaded', c, false);
		}
	});
}

function createMainProcessServices(): ServiceCollection {
	const serviceCollection = new ServiceCollection();
	//TODO 添加渲染进程更多服务
	return serviceCollection;
}

function createAndInitializeWorkspaceService(configuration: IWindowConfiguration, environmentService: EnvironmentService): Promise<WorkspaceService> {
	const workspaceService = new WorkspaceService(environmentService, configuration.folderPath, configuration.file);
	return Promise.resolve(workspaceService);
}