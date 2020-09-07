import { IEnvironmentService } from 'egret/platform/environment/common/environment';
import { app } from 'electron';
import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import configuration from 'egret/platform/node/package';
import { getDefaultUserDataPath } from 'egret/platform/node/userPaths';
import { Platform, platform, isWindows } from 'egret/base/common/platform';
import { isArray } from 'egret/base/common/types';
import { ParsedArgs } from '../common/args';

/**
 * 环境变量服务实例
 */
export class EnvironmentService implements IEnvironmentService {
	_serviceBrand: undefined;

	get args(): ParsedArgs {
		return this._args;
	}
	get appRoot(): string {
		const appRoot = app.getAppPath();
		return appRoot;
	}
	get execPath(): string {
		return this._execPath;
	}
	get userHome(): string {
		return os.homedir();
	}
	get workspacesHome(): string {
		return path.join(this.userDataPath, 'Workspaces');
	}
	get userDataPath(): string {
		return parseUserDataDir(this._args, process);
	}
	get buildNls(): boolean {
		return !!this.args['build-nls'];
	}
	get mainIPCHandle(): string {
		return getIPCHandle(this.userDataPath, 'main');
	}
	constructor(private _args: ParsedArgs, private _execPath: string) {
	}
}

function parseUserDataDir(args: ParsedArgs, process: NodeJS.Process) {
	const arg = args['user-data-dir'];
	if (arg) {
		// Determine if the arg is relative or absolute, if relative use the original CWD
		// (APP_CWD), not the potentially overridden one (process.cwd()).
		const resolved = path.resolve(arg);
		if (path.normalize(arg) === resolved) {
			return resolved;
		} else {
			return path.resolve(process.env['APP_CWD'] || process.cwd(), arg);
		}
	}
	return path.resolve(getDefaultUserDataPath(process.platform));
}

const safeIpcPathLengths: { [platform: number]: number } = {
	[Platform.Linux]: 107,
	[Platform.Mac]: 103
};

function getNixIPCHandle(userDataPath: string, type: string): string {
	let result: string = path.join(userDataPath, `${configuration.version}-${type}.sock`);

	const limit = safeIpcPathLengths[platform];
	if (typeof limit === 'number') {
		if (result.length >= limit) {
			// https://nodejs.org/api/net.html#net_identifying_paths_for_ipc_connections
			console.warn(`WARNING: IPC handle "${result}" is longer than ${limit} chars, try a shorter`);
		}
	}

	return result;
}

function getWin32IPCHandle(userDataPath: string, type: string): string {
	const scope = crypto.createHash('md5').update(userDataPath).digest('hex');

	return `\\\\.\\pipe\\${scope}-${configuration.version}-${type}-sock`;
}

function getIPCHandle(userDataPath: string, type: string): string {
	if (isWindows) {
		return getWin32IPCHandle(userDataPath, type);
	}

	return getNixIPCHandle(userDataPath, type);
}
export function getEUIProject(target: string): { folderPath: string | null, file: string | null };
export function getEUIProject(target: ParsedArgs): { folderPath: string | null, file: string | null };
export function getEUIProject(target: any): { folderPath: string | null, file: string | null } {
	// console.log('target', target);
	let folder: string;
	if (typeof target === 'object') {
		const args = target as ParsedArgs;
		if (args.folder) {
			if (typeof args.folder === 'string') {
				folder = args.folder;
			} else if (isArray(args.folder)) {
				folder = args.folder.length > 0 ? args.folder[0] : null;
			}
		}
		if (!folder) {
			const arg_ = args._;
			if (arg_ && arg_.length > 1) {
				const first: string = arg_[0];
				let target: string = null;
				if (first.endsWith('electron.exe') ||
					first.endsWith('Electron')) {
					// DEBUG
					// npm run start
					// electron .
					if (arg_.length > 2) {
						target = arg_[2];
					}
				} else {
					target = arg_[1];
				}
				if (target === '.') {
					folder = process.cwd();
				} else {
					folder = target;
				}
			}
		}
	} else if(typeof target === 'string'){
		folder = target;
	}
	// console.log(folder, process.env['EUI_FROM_SHELL']);
	if (folder) {
		if (
			(folder.charAt(0) == '\'' || folder.charAt(0) == '"') &&
			(folder.charAt(folder.length - 1) == '\'' || folder.charAt(folder.length - 1) == '"')
		) {
			folder = folder.slice(1, folder.length - 1);
		}
	}
	let targetFile: string = null;
	let targetToOpen: string = null;
	if (folder) {
		const project = getEUIProjectPath(folder);
		targetToOpen = project.folderPath;
		targetFile = project.file;
	}
	return {
		folderPath: targetToOpen,
		file: targetFile
	};
}

function getEUIProjectPath(target: string): { folderPath: string, file?: string } | null {
	try {
		const stat = fs.statSync(target);
		if (stat.isDirectory()) {
			if (isEgretFolder(target)) {
				return { folderPath: target };
			}
		}
	} catch (error) {

	}
	const project = findProjectFromFile(target);
	if (!project) {
		return { folderPath: target };
	} else {
		return { folderPath: project, file: target };
	}
}

function findProjectFromFile(file: string): string {
	const dir = path.dirname(file);
	if (!dir) {
		return null;
	}
	if (dir === file) {
		return null;
	}
	if (dir === '\\' || dir === '/') {
		return null;
	}
	try {
		if (isEgretFolder(dir)) {
			return dir;
		}
	} catch (error) {

	}
	return findProjectFromFile(dir);
}

function isEgretFolder(dir: string): boolean {
	try {
		const items = fs.readdirSync(dir);
		for (let i = 0; i < items.length; i++) {
			const element = items[i];
			const stat = fs.statSync(path.join(dir, element));
			if (stat.isFile() && element === 'egretProperties.json') {
				return true;
			}
		}
	} catch (error) {

	}
	return false;
}