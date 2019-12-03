import { IFileChange } from 'egret/platform/files/common/files';

/**
 * 解析接口
 */
export interface IParserProcess {
	/**
	 * 初始化
	 * @param propertiesPath 
	 */
	initProcess(propertiesPath: string, uiLib: string, workspace: string): Promise<void>;
	/**
	 * 文件改变
	 * @param changes 
	 */
	onFileChanged(changes: IFileChange[]): Promise<void>;
}