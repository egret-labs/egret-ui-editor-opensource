import { KeybindingType, KeyBindingMainMap, KeyBindingBrowserMap, IOperationEvent, IFocusablePart } from './operations';
import { Event } from 'egret/base/common/event';
import { createDecorator } from '../../instantiation/common/instantiation';

export const IOperationBrowserService = createDecorator<IOperationBrowserService>('operationBrowserService');
/**
 * 渲染进程命令服务
 */
export interface IOperationBrowserService {
	_serviceBrand: undefined;

	/**
	 * 操作即将被执行
	 */
	onWillExecuteCommand: Event<IOperationEvent>;

	/**
	 * 注册命令对应的快捷键
	 * @param command 命令
	 * @param defaultKey 快捷键
	 * @param type 键盘按下还是松起时触发
	 * @param name 命令名
	 * @param description 命令描述 
	 * @param global 是否是全局快捷键，即如果焦点在input里是否会触发该快捷键
	 */
	registerKeybingding(command: string, defaultKey: string, type: KeybindingType, name: string, description: string, global?: boolean): void;

	/**
	 * 得到当前快捷键绑定关系表，用于渲染进程弹出面板进行修改
	 */
	getKeybingdsConfig(): Promise<{
		mainDefault: KeyBindingMainMap,
		browserDrault: KeyBindingBrowserMap,
		mainUser: KeyBindingMainMap,
		browserUser: KeyBindingBrowserMap
	}>;

	/**
	 * 更新快捷键配置
	 */
	updateKeybinding(mainConfig: KeyBindingMainMap, browserConfig: KeyBindingBrowserMap): void;

	/**
	 * 注册一个可聚焦的部件，不可重复注册
	 * @param part 可聚焦的部件
	 */
	registerFocusablePart(part: IFocusablePart): void;

	/**
	 * 取消注册一个可接受快捷键的部件
	 * @param part 
	 */
	unregisterFocusablePart(part: IFocusablePart): void;

	/**
	 * 执行操作
	 * @param command 要执行的命令 
	 * @param args 命令初始化的参数
	 */
	executeCommand<T = any>(command: string, ...args: any[]): Promise<T>;
}