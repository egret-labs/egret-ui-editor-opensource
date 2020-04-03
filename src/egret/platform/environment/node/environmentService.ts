import { IEnvironmentService, ParsedArgs } from 'egret/platform/environment/common/environment';
import { app } from 'electron';
import * as os from 'os';
import * as path from 'path';
import { getDefaultUserDataPath } from 'egret/platform/node/userPaths';

/**
 * 环境变量服务实例
 */
export class EnvironmentService implements IEnvironmentService {
	_serviceBrand: any;

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