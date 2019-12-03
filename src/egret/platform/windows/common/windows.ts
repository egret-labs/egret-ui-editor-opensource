import { ParsedArgs } from '../../environment/common/environment';
import { BrowserWindow, OpenDialogOptions } from 'electron';
import { createDecorator } from '../../instantiation/common/instantiation';
import { IBrowserWindowEx } from './window';

/**
 * 窗体的打开参数
 */
export interface IOpenBrowserWindowOptions {
	/** 命令 */
	cli?: ParsedArgs;
	/** 要打开的路径 */
	folderPath?: string;
}

/**
 * 消息盒子选项
 */
export interface MessageBoxOptions {
	/**
	 * 窗体ID
	 */
	windowId?:number;
	/**
	 * 类型
	 */
	type?: string;
	/**
	 * 包含的按钮
	 */
	buttons?: string[];
	/**
	 * 默认按钮id
	 */
	defaultId?: number;
	/**
	 * 标题
	 */
	title?: string;
	/**
	 * 提示消息
	 */
	message: string;
	/**
	 * 提示详细内容
	 */
	detail?: string;
	/**
	 * 复选框文本内容
	 */
	checkboxLabel?: string;
	/**
	 * 是否有复选框
	 */
	checkboxChecked?: boolean;
	/**
	 * 取消的按钮id
	 */
	cancelId?: number;
	/**
	 * 是否有链接
	 */
	noLink?: boolean;
	/** 
	 * 可接受的key
	 */
	normalizeAccessKeys?: boolean;
}
/**
 * 消息盒子结果
 */
export interface IMessageBoxResult {
	/**
	 * 点击的button索引
	 */
	button: number;
	/**
	 * 是否勾选了复选框
	 */
	checkboxChecked?: boolean;
}
/**
 * 原生文件选择器参数
 */
export interface INativeOpenDialogOptions {
	/**
	 * 窗体ID
	 */
	windowId?: number;
	/**
	 * 打开为新窗体
	 */
	forceNewWindow?: boolean;
	/**
	 * 对话框参数
	 */
	dialogOptions?: OpenDialogOptions;
	/**
	 * 选择文件夹
	 */
	pickFolders?: boolean;
	/**
	 * 选择文件
	 */
	pickFiles?: boolean;
}


export const IWindowsMainService = createDecorator<IWindowsMainService>('windowsMainService');
/**
 * 多窗口管理入口
 */
export interface IWindowsMainService {
	_serviceBrand: any;
	/**
	 * 打开主窗体
	 */
	open(options:IOpenBrowserWindowOptions): void;
	/**
	 * 退出主窗体
	 */
	quit(): void;
	/**
	 * 重新加载当前激活的窗体
	 */
	reload():void;
	/**
	 * 选择文件打开
	 */
	pickFolderAndOpen(options: INativeOpenDialogOptions): void;
	/**
	 * 弹出消息盒子
	 * @param options 
	 */
	showMessageBox(options: MessageBoxOptions): Promise<IMessageBoxResult>;
	/**
	 * 发送消息
	 * @param channel 
	 * @param args 
	 */
	sendToFocused(channel: string, ...args: any[]): void;
	/**
	 * 获得当前编辑window
	 */
	getFocusedWindow(): IBrowserWindowEx;
	/**
	 * 根据ID得到窗体
	 */
	getWindowById(id:number):IBrowserWindowEx;
	/**
	 * 得到所有窗体
	 */
	getAllWindows():IBrowserWindowEx[];
}