import { Event, Emitter } from 'egret/base/common/event';
import URI from 'egret/base/common/uri';
import { IWorkspaceService, IWorkspace, Workspace } from './common/workspace';
import * as path from 'path';
import { IEnvironmentService } from '../environment/common/environment';

/**
 * 工作空间
 */
export class WorkspaceService implements IWorkspaceService {
	_serviceBrand: undefined;

	private readonly workspace: IWorkspace;
	constructor(private environmentService: IEnvironmentService,
		folderPath: string,
		file: string) {
		if (folderPath) {
			this.workspace = new Workspace(path.basename(folderPath), URI.file(folderPath), file ? URI.file(file) : null);
		}
	}
	/**
	 * 获取当前workspace
	 */
	public getWorkspace(): IWorkspace {
		return this.workspace;
	}

	private _box: boxlayout.BoxLayout;
	/**
	 * 获取当前盒式布局的根
	 */
	public get boxlayout(): boxlayout.BoxLayout {
		return this._box;
	}
	/**
	 * 注册盒式布局的根
	 * @param box 
	 */
	registerBoxlayout(box: boxlayout.BoxLayout): void {
		this._box = box;
	}
}