import { createDecorator } from 'egret/platform/instantiation/common/instantiation';
import { ParsedArgs } from './args';

export const IEnvironmentService = createDecorator<IEnvironmentService>('environmentService');
/**
 * 环境变量服务
 */
export interface IEnvironmentService {
	_serviceBrand: undefined;
	/**
	 * 参数
	 */
	readonly args: ParsedArgs;
	/**
	 * 执行路径
	 */
	readonly execPath: string;
	/**
	 * 根路径
	 */
	readonly appRoot: string;
	/**
	 * 用户目录
	 */
	readonly userHome: string;
	/**
	 * 工作空间目录用户目录
	 */
	readonly workspacesHome: string;
	/**
	 * 用户存储目录
	 */
	readonly userDataPath:string;
	/**
	 * 编译多语言
	 */
	readonly buildNls:boolean;
	readonly mainIPCHandle: string;

}