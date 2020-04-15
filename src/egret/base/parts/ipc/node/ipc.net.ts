import { createServer, createConnection, Server, Socket } from 'net';

export function serve(port: number): Promise<Server>;
export function serve(namedPipe: string): Promise<Server>;
export function serve(hook: any): Promise<Server> {
	return new Promise<Server>((c, e) => {
		const server = createServer();

		server.on('error', e);
		server.listen(hook, () => {
			server.removeListener('error', e);
			c(server);
		});
	});
}

export function connect(options: { host: string, port: number }): Promise<Socket>;
export function connect(port: number): Promise<Socket>;
export function connect(namedPipe: string): Promise<Socket>;
export function connect(hook: any): Promise<Socket> {
	return new Promise<Socket>((c, e) => {
		const socket = createConnection(hook, () => {
			socket.removeListener('error', e);
			c(socket);
		});

		socket.once('error', e);
	});
}