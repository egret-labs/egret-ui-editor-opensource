import { ExmlFileStat } from './searchFileModel';
import { IFileService } from 'egret/platform/files/common/files';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import { first } from 'egret/base/common/arrays';


/**
 * 搜索文件的数据
 */
export class SearchFileData {

	private workspacePath:string = '';
	constructor(
		@IFileService private fileService: IFileService,
		@IWorkspaceService private workspaceService: IWorkspaceService
	) {
		if(this.workspaceService.getWorkspace()){
			this.workspacePath = this.workspaceService.getWorkspace().uri.fsPath;
		}
	}
	/**
	 * 得到根节点
	 */
	public getRoot(): Promise<ExmlFileStat> {
		return new Promise<ExmlFileStat>((resolve, reject) => {
			const root = new ExmlFileStat();
			this.fileService.select(this.workspaceService.getWorkspace().uri, ['.exml'],null,['node_modules','.git','.DS_Store']).then(results => {
				const numSum = results.length;
				let numParserd = 0;
				const checkComplete = ()=>{
					if(numParserd == numSum){
						resolve(root);
					}
				};
				results.forEach(fileStat => {
					const exmlFileStat = new ExmlFileStat();
					exmlFileStat.fileName = fileStat.name;
					exmlFileStat.resource = fileStat.resource;
					exmlFileStat.parent = root;
					let targetPath = fileStat.resource.fsPath;
					if(targetPath.indexOf(this.workspacePath) == 0){
						targetPath = targetPath.slice(this.workspacePath.length);
					}
					exmlFileStat.path = targetPath;

					this.fileService.resolveContent(exmlFileStat.resource, 'utf8').then(content => {
						const className = this.getClassNameByContent(content.value);
						exmlFileStat.className = className;
						root.children.push(exmlFileStat);
						numParserd++;
						checkComplete();
					}, error => {
						root.children.push(exmlFileStat);
						numParserd++;
						checkComplete();
					});
				});
			});
		});
	}

	private getClassNameByContent(content: string): string {
		let firstNode = '';
		const startIndex = content.indexOf('<e:Skin');
		if(startIndex != -1){
			const endIndex = content.indexOf('>',startIndex);
			firstNode = content.slice(startIndex,endIndex+1);
		}
		if(firstNode){
			const tmpArr = firstNode.match(/class=.*?['|"](.*?)['|"]/);
			if(tmpArr && tmpArr.length >= 2){
				const className = tmpArr[1];
				return className;
			}
		}
		return '';
	}
}