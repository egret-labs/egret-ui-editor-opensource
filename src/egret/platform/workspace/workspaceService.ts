import { Event, Emitter } from 'egret/base/common/event';
import URI from 'egret/base/common/uri';
import { IWorkspaceService, IWorkspace, Workspace } from './common/workspace';
import * as path from 'path';
import { IEnvironmentService } from '../environment/common/environment';

/**
 * 工作空间
 */
export class WorkspaceService implements IWorkspaceService {
	_serviceBrand: any;

	private readonly workspace: IWorkspace;
	constructor(private environmentService: IEnvironmentService,
		folderPath: string) {
		if(folderPath){
			this.workspace = new Workspace(path.basename(folderPath), URI.file(folderPath));
		}
	}
	/**
	 * 获取当前workspace
	 */
	public getWorkspace(): IWorkspace {
		return this.workspace;
	}
}