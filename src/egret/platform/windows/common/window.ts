import { createDecorator } from '../../instantiation/common/instantiation';
import { INativeOpenDialogOptions, MessageBoxOptions, IMessageBoxResult } from './windows';
import { Event } from 'vs/base/common/event';
import { ParsedArgs } from 'egret/platform/environment/common/args';


/**
 * 打开窗体的配置
 */
export interface IWindowConfiguration extends ParsedArgs {
	/**
	 * 机器ID
	 */
	machineId: string;
	/**
	 * 窗口ID
	 */
	windowId: number;
	/**
	 * App根路径
	 */
	appRoot: string;
	/**
	 * 执行路径
	 */
	execPath: string;
	/**
	 * 打开的文件夹路径
	 */
	folderPath: string;
	/** 要打开的文件 */
	file?: string;
}

/**
 * 窗体接口
 */
export interface IBrowserWindowEx {
	/**
	 * 窗体的id
	 */
	readonly id: number;
	/**
	 * 窗体核心对象
	 */
	readonly win: Electron.BrowserWindow;
	/**
	 * 当前的配置参数
	 */
	readonly config: IWindowConfiguration;
	/**
	 * 窗体关闭事件
	 */
	readonly onClosed: Event<void>;
	/**
	 * 打开窗体
	 * @param config 窗体的打开配置
	 */
	load(config: IWindowConfiguration): void;
	isFocus(): boolean;
	focus(): void;
	readonly isReady: boolean;
	ready(): Promise<IBrowserWindowEx>;
	setReady(): void;
	/**
	 * 重新加载
	 */
	reload():void;
	/**
	 * 关闭窗体
	 */
	close(): void;
	/**
	 * 通过channel向渲染器进程发送异步消息
	 * @param channel 信道
	 * @param args 任意数据
	 */
	send(channel: string, ...args: any[]): void;
	sendWhenReady(channel: string, ...args: any[]): void;
}

export const IWindowClientService = createDecorator<IWindowClientService>('windowClientService');
/**
 * 窗体服务
 */
export interface IWindowClientService {
	_serviceBrand: undefined;
	/**
	 * 得到当前窗体的id
	 */
	getCurrentWindowId(): number;
	/**
	 * 得到窗体的配置
	 */
	getConfiguration(): IWindowConfiguration;
	/**
	 * 选择文件打开
	 */
	pickFolderAndOpen(options: INativeOpenDialogOptions): void;
	/**
	 * 弹出消息盒子
	 * @param options 
	 */
	showMessageBox(options: MessageBoxOptions): Promise<IMessageBoxResult>;
}