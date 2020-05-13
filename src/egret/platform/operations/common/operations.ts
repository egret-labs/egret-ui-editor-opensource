import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { IInstantiationService } from '../../instantiation/common/instantiation';
import { Event, Emitter } from 'egret/base/common/event';
import { localize } from '../../../base/localization/nls';

/**
 * 快捷键类型
 */
export enum KeybindingType {
	KEY_DOWN = 'keydown',
	KEY_UP = 'keyup'
}

/**
 * 渲染进程快捷键数据
 */
export interface KeyBindingBrowserMap {
	/**
	 * 渲染进程快捷键数据
	 */
	[command: string]: {
		key: string,
		type: KeybindingType,
		global: boolean,
		name: string,
		description: string
	};
}
/**
 * 主进程快捷键数据
 */
export interface KeyBindingMainMap {
	/**
	 * 主进程快捷键数据
	 */
	[command: string]: {
		key: string,
		name: string,
		description: string
	};
}

/**
 * 一个可以聚焦的部件
 */
export interface IFocusablePart {
	/**
	 * 得到这个部件对应的Dom节点
	 */
	getRelativeELement(): HTMLElement;
	/**
	 * 运行一个命令
	 * @param command 要运行的命令
	 */
	executeCommand<T>(command: string, ...args): Promise<T>;
	/**
	 * 是否可以运行指定命令
	 * @param command 需要判断的命令
	 */
	hasCommand(command: string): boolean;
}


/**
 * 一个具体的操作，由command来驱动执行
 */
export interface IOperation extends IDisposable {
	/**
	 * 运行
	 */
	run(): Promise<any>;
}

/**
 * 操作事件
 */
export interface IOperationEvent {
	/**
	 * 命令 command
	 */
	command: string;
}



/**
 * 可聚焦部件的命令助理，可以配合给 IFocusablePart 使用
 */
export class FocusablePartCommandHelper {

	private _onWillExecuteCommand: Emitter<IOperationEvent>;

	constructor(
		@IInstantiationService private instantiationService: IInstantiationService
	) {
		this._onWillExecuteCommand = new Emitter<IOperationEvent>();
	}
	/**
	 * 操作即将被执行
	 */
	public get onWillExecuteCommand(): Event<IOperationEvent> {
		return this._onWillExecuteCommand.event;
	}

	private operationsMap: { [command: string]: { new(...args): IOperation } } = {};
	/**
	 * 注册一个命令
	 * @param command 要注册的命令，不可以重复
	 * @param operation 要执行的实际操作
	 */
	public registerCommand(command: string, operation: { new(...args): IOperation }): void {
		if (!command) {
			throw new Error(localize('focusablePartCommandHelper.registerCommand.blank','Registration operation command must not be empty.'));
		}
		if (command in this.operationsMap) {
			throw new Error(localize('focusablePartCommandHelper.registerCommand.repeat','Registration operation command: {0} repeat',command));
		}
		this.operationsMap[command] = operation;
	}
	/**
	 * 是否可以运行指定命令
	 * @param command 需要判断的命令
	 */
	public hasCommand(command: string): boolean {
		return command in this.operationsMap;
	}
	/**
	 * 得到一个操作
	 * @param id 
	 */
	public getOperation(command: string): { new(): IOperation } {
		if (!(command in this.operationsMap)) {
			console.log('获取的操作 command "' + command + '" 尚未注册');
			return null;
		}
		return this.operationsMap[command];
	}
	/**
	 * 执行操作
	 * @param operationId 
	 * @param args 
	 */
	public executeOperation<D>(command: string, args: any[]): Promise<D> {
		return this.doExecuteOperation(command, args);
	}
	/**
	 * 执行操作
	 * @param operationId 
	 * @param args 
	 */
	private doExecuteOperation<D>(command: string, args: any[]): Promise<D> {
		const operation: { new(): IOperation } = this.getOperation(command);
		if (operation) {
			const operationImpl: IOperation = this.instantiationService.createInstance.apply(this.instantiationService, [operation].concat(args) as any);
			this._onWillExecuteCommand.fire({ command });
			return operationImpl.run().then(result => {
				dispose(operationImpl);
				return result;
			}, error => {
				dispose(operationImpl);
				return error;
			});
		}
		return Promise.resolve(void 0);
	}
}