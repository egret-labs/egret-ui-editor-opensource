import { Server, Socket } from 'net';
import { Emitter, Event } from 'egret/base/common/event';

export type EUIPorject = { folderPath: string, file?: string };

export type NewInstanceArgs = {
	forceNewWindow: boolean;
	project?: EUIPorject;
};

export type ClientMessage = {
	type: 'open' | 'status';
	forceNewWindow: boolean;
	data?: any;
};

export class MainIPCServer {
	private readonly _onOpenInstance = new Emitter<NewInstanceArgs>();
	public readonly onOpenInstance: Event<NewInstanceArgs> = this._onOpenInstance.event;
	/**
	 *
	 */
	constructor(private server: Server) {
		server.addListener('connection', this.onConnection);
	}

	private onConnection = (socket: Socket): void => {
		socket.on('close', (had_error) => {
			console.log('client closed', had_error);
		});
		socket.on('error', (err) => {
			if((err as any).code === 'EPIPE'){
				// socket closed
				return;
			}
			console.log('client error', err);
			socket.end();
		});
		socket.on('data', (data) => {
			this.receiveData(data);
		});
	}

	private receiveData(data: Buffer): void {
		try {
			const obj: ClientMessage = JSON.parse(data.toString('utf8'));
			if(obj.type === 'open'){
				this._onOpenInstance.fire({
					forceNewWindow: obj.forceNewWindow,
					project: obj.data
				});
			}
		} catch (error) {
			console.log('client data error', error);
		}
	}

	public close(): void {
		this.server.close();
	}
}

export class MainIPCClient {
	/**
	 *
	 */
	constructor(private socket: Socket) {	
		socket.on('error', (err) => {
			if((err as any).code === 'EPIPE'){
				// socket closed
				return;
			}
		});
	}

	public openInstance(forceNewWindow: boolean, project?: EUIPorject): void {
		const data: ClientMessage = {
			type: 'open',
			forceNewWindow: forceNewWindow,
			data: project
		};
		this.socket.write(JSON.stringify(data), 'utf8');
	}

	public close(): void {
		this.socket.end();
	}
}