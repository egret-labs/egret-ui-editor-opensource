import { IFileChange } from 'egret/platform/files/common/files';
import { IDisposable } from 'egret/base/common/lifecycle';

/**
 * 解析接口
 */
export interface IParserProcess extends IDisposable {
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