import { ExmlFileStat } from './searchFileModel';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import * as path from 'path';


/**
 * 搜索文件的数据
 */
export class SearchFileData {

	private workspacePath:string = '';
	constructor(
		@IEgretProjectService private projectService: IEgretProjectService,
		@IWorkspaceService private workspaceService: IWorkspaceService
	) {
		if(this.workspaceService.getWorkspace()){
			this.workspacePath = this.workspaceService.getWorkspace().uri.fsPath;
		}
	}

	/**
	 * 得到根节点
	 */
	public async getRoot(): Promise<ExmlFileStat> {
		await this.projectService.ensureLoaded();
		await this.projectService.exmlConfig.ensurePaserCenterInited();
		const root = new ExmlFileStat();
		const exmlConfig = this.projectService.exmlConfig;
		const skins = exmlConfig.getSkinNames();
		for (const skin of skins) {
			const url = exmlConfig.getExmlUri(skin);
			if(url) {
				const exmlFileStat = new ExmlFileStat();
				exmlFileStat.fileName = path.basename(url.fsPath);
				exmlFileStat.resource = url;
				exmlFileStat.parent = root;
				let targetPath = url.fsPath;
				if(targetPath.indexOf(this.workspacePath) == 0){
					targetPath = targetPath.slice(this.workspacePath.length);
				}
				exmlFileStat.path = targetPath;
				exmlFileStat.className = skin;
				root.children.push(exmlFileStat);
			}
		}
		return root;
	}
}