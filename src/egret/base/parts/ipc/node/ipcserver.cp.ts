import { ChildProcess, fork } from 'child_process';
import { remote } from 'electron';

import * as paths from 'path';
import { localize } from 'egret/base/localization/nls';
import { IDisposable } from 'egret/base/common/lifecycle';


/**
 * IPC的服务进程，主进程
 */
class IPCServer implements IDisposable {
	private callIndex: number = 0;
	private child: ChildProcess;
	private childPid: number = 0;
	public onReceiveHandler: (messageId: string, data: any) => void;

	constructor(modulePath: string) {
		this.error_handler = this.error_handler.bind(this);
		this.exit_handler = this.exit_handler.bind(this);
		this.message_handler = this.message_handler.bind(this);

		// this.child = fork(paths.join(remote.app.getAppPath(), './out', modulePath));
		this.child = fork(paths.join(remote.app.getAppPath(), './out', modulePath), [], { silent: true });
		this.child.stdout!.on('data', (data: Buffer) => console.log(data.toString('utf8').trim()));
		this.child.stderr!.on('data', (data: Buffer) => console.log(data.toString('utf8').trim()));
		this.child.addListener('error', this.error_handler);
		this.child.addListener('exit', this.exit_handler);
		this.child.addListener('message', this.message_handler);
		this.childPid = this.child.pid;
	}

	private error_handler(error: Error): void {
		if((error as any).code === 'EPIPE'){
			console.log('IPCServer', this.childPid, 'closed');
			return;
		}
		console.log('IPCServer', this.childPid, error);
	}

	private exit_handler(code: number, signal: string): void {
		console.log('IPCServer exit', this.childPid, code, signal);
	}

	private message_handler(msg: any): void {
		const type: string = msg.type;
		if (type == 'custom') {
			const messageId: string = msg.messageId;
			const data: any = msg.data;
			this.onReceived(messageId, data);
			return;
		}

		const funcName: string = msg.funcName;
		const callIndex: number = msg.callIndex;
		const key: string = funcName + '_' + callIndex;
		const callbackInfo = this.callbackMap[key];
		delete this.callbackMap[key];
		if (callbackInfo) {
			if (type == 'result') {
				const result: any = msg.result;
				callbackInfo.resolve(result);
			} else if (type == 'error') {
				const error: any = msg.error;
				callbackInfo.reject(error);
			} else if (type == 'null') {
				callbackInfo.reject(localize('ipcseriver.cp.message_handler', 'Method {0} was not found in the child process', funcName));
			}
		}
	}
	/**
	 * 接收到子进程发来的数据
	 * @param messageId 
	 * @param data 
	 */
	private onReceived(messageId: string, data: any): void {
		if (this.onReceiveHandler) {
			this.onReceiveHandler(messageId, data);
		}
	}

	private callbackMap: { [funcName: string]: { resolve: (value?: any) => void, reject: (reason?: any) => void } } = {};
	/**
	 * 调用child的方法
	 * @param funcName 方法名
	 * @param args 参数
	 */
	public call(funcName: string, args: any[]): Promise<any> {
		const callIndex = this.callIndex++;
		this.send({ funcName, callIndex, args });
		return new Promise((resolve, reject) => {
			this.callbackMap[funcName + '_' + callIndex] = {
				resolve: resolve,
				reject: reject
			};
		});
	}

	private send(data: any): void {
		if (this.child && this.child.connected) {
			this.child.send(data);
		}
	}

	public dispose(): void {
		if (this.child) {
			console.log('kill IPCServer', this.child.pid);
			this.child.kill();
			this.child = null;
		}
	}
}

/**
 * 子进程持有者
 */
export class NodeProcessOwner extends IPCServer {
}

/**
 * 创建一个子进程
 * @param modulePath 子进程路径
 * @param onReceive 子进程路径
 */
export function createChildProcess<T>(modulePath: string, onReceive?: (messageId: string, data: any) => void): T {
	const server: IPCServer = new NodeProcessOwner(modulePath);
	server.onReceiveHandler = onReceive;
	const proxy = new Proxy<IPCServer>(server, {
		get(target: IPCServer, property: string) {
			if (property in target) {
				return target[property];
			} else {
				return function (...args) {
					return target.call(property, args);
				};
			}
		}
	});
	return proxy as any;
}