import { IFileChange } from 'egret/platform/files/common/files';
import { IDisposable } from 'egret/base/common/lifecycle';

/**
 * 解析接口
 */
export interface IParserProcess extends IDisposable {
	/**
	 * 初始化
	 * @param propertiesPath 
	 * @param parseFolders 需要解析的文件夹
	 */
	initProcess(propertiesPath: string, uiLib: string, workspace: string, parseFolders: string[]): Promise<void>;
	/**
	 * 更改解析文件夹
	 * @param folders 
	 */
	changeParseFolders(folders: string[]): Promise<void>;
	/**
	 * 文件改变
	 * @param changes 
	 */
	onFileChanged(changes: IFileChange[]): Promise<void>;
}