import { IEnvironmentService, ParsedArgs } from 'egret/platform/environment/common/environment';
import { app } from 'electron';
import * as os from 'os';
import * as path from 'path';

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
		return parseUserDataDir(this._args);
	}
	get buildNls(): boolean {
		return !!this.args['build-nls'];
	}
	constructor(private _args: ParsedArgs, private _execPath: string) {
	}
}
function parseUserDataDir(args: ParsedArgs): string {
	return parsePathArg(args['user-data-dir'], process) || path.resolve(process.platform);
}
function parsePathArg(arg: string, process: NodeJS.Process): string {
	if (!arg) {
		return undefined;
	}
	const resolved = path.resolve(arg);
	if (path.normalize(arg) === resolved) {
		return resolved;
	} else {
		return path.resolve(process.env['EGRET_CWD'] || process.cwd(), arg);
	}
}