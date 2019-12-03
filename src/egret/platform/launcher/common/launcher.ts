import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as child from 'child_process';
import * as querystring from 'querystring';
import * as semver from 'semver';
import { openExternal } from './launcherHelper';
import { LauncherError, LauncherErrorCode, AppId } from './launcherDefines';

interface Promgram {
	InstallLocation: string;
}

async function searchWindowsProgram(name: string): Promise<Promgram> {
	let reg64: string = '\\SOFTWARE\\Wow6432Node';
	let reg32: string = '\\SOFTWARE';
	reg64 += '\\' + name;
	reg32 += '\\' + name;

	let result = await searchWindowsProgramRaw('HKLM' + reg64);
	if (!result) {
		result = await searchWindowsProgramRaw('HKLM' + reg32);
	}
	return result;
}

function searchWindowsProgramRaw(regKey: string): Promise<Promgram> {
	return new Promise<any>((c, e) => {
		try {
			child.exec(`reg query ${regKey} /s`, (error, stdout, stderr) => {
				if (error) {
					return c(null);
				}
				if (stderr) {
					return c(null);
				}

				const result = {};
				stdout.toString().split('\n').forEach(line => {
					const p = line.trim().split(/\s{2,}/g, 3);
					if (p.length === 3) {
						result[p[0]] = p[2];
					}
				});
				if (Object.keys(result).length > 0) {
					c(result);
				} else {
					c(null);
				}
			});
		} catch (error) {
			c(null);
		}
	});
}

function getAppDataPath(platform: string): string {
	switch (platform) {
		case 'win32': return process.env['APPDATA'] || path.join(process.env['USERPROFILE'], 'AppData', 'Roaming');
		case 'darwin': return path.join(os.homedir(), 'Library', 'Application Support');
		case 'linux': return process.env['XDG_CONFIG_HOME'] || path.join(os.homedir(), '.config');
		default: throw new Error('Platform not supported');
	}
}

const MIN_LAUNCHER_VERSOIN: string = '1.0.61';

/**
 * 以下功能需要 Egret Launcher 版本大于`MIN_LAUNCHER_VERSOIN`
 * `feedback()`
 * `launchEUIEditor()`
 * `launchFeather()`
 * `launchResDepot()`
 * `launchTextureMerger()`
 *
 */
export default class Launcher {
	private static readonly LauncherWinRegKey = '0a64b195-6a01-532b-9902-30ea12027020';
	private static readonly LoginPath: string = 'login';
	private static readonly CheckToolUpdatePath: string = 'checkToolUpdate';
	private static readonly PublishProjectPath: string = 'publishProject';
	private static readonly CreateProjectPath: string = 'createProject';
	private static readonly LaunchAppPath: string = 'launchApp';
	private static readonly FeedbackPath: string = 'feedback';

	/**
	 * 延迟指定时长
	 * @param milliseconds 延迟时间，毫秒
	 */
	private static delayAsync(milliseconds: number): Promise<void> {
		return new Promise<void>((resolve) => {
			const timer = setTimeout(() => {
				clearTimeout(timer);
				resolve(void 0);
			}, milliseconds);
		});
	}

	/**
	 * 检查文件是否存在。
	 * @param filePath
	 */
	private static fileExistsAsync(filePath: string): Promise<boolean> {
		if (!filePath) {
			return Promise.resolve(false);
		}
		return new Promise<boolean>((resolve) => {
			fs.exists(filePath, (exist) => {
				resolve(exist);
			});
		});
	}

	/**
	 * 读取指定的json文件
	 * @param filePath
	 */
	private static async readJsonAsync(filePath: string): Promise<any> {
		if (!filePath) {
			return Promise.resolve(null);
		}
		return new Promise<boolean>((resolve) => {
			fs.readFile(filePath, 'utf-8', (error: NodeJS.ErrnoException, data: string) => {
				if (error) {
					resolve(null);
				} else {
					try {
						const json = JSON.parse(data);
						resolve(json);
					} catch (parseError) {
						resolve(null);
					}
				}
			});
		});
	}

	private static async getEgretLauncherOnWindows(): Promise<{ location: string; exe: string; }> {
		const possiblePaths: { location: string; exe: string; }[] = [];
		if (process.platform === 'win32') {
			let location: string = '';
			const result = await searchWindowsProgram(Launcher.LauncherWinRegKey);
			if (result && result.InstallLocation) {
				location = result.InstallLocation;
				possiblePaths.push({ location: location, exe: path.join(location, 'EgretLauncher.exe') });
			}
			location = path.join(process.env['ProgramFiles(x86)'], 'Egret', 'EgretLauncher');
			possiblePaths.push({ location: location, exe: path.join(location, 'EgretLauncher.exe') });
			location = path.join(process.env['ProgramFiles'], 'Egret', 'EgretLauncher');
			possiblePaths.push({ location: location, exe: path.join(location, 'EgretLauncher.exe') });
		}
		for (let i = 0; i < possiblePaths.length; i++) {
			const item = possiblePaths[i];
			const exist = await Launcher.fileExistsAsync(item.exe);
			if (exist) {
				return item;
			}
		}
		return null;
	}

	/**
	 * 查找egret launcher可执行文件
	 */
	private static async findEgretLauncherAsync(): Promise<string> {
		if (process.platform === 'darwin') {
			const file = '/Applications/EgretLauncher.app/Contents/MacOS/EgretLauncher';
			const exist = await Launcher.fileExistsAsync(file);
			if (exist) {
				return file;
			}
		} else {
			const target = await this.getEgretLauncherOnWindows();
			if (target) {
				return target.exe;
			}
		}
		return null;
	}

	/**
	 * 获取已安装的egret launcher版本号。
	 * @returns 版本号，未安装返回null
	 */
	public static async getEgretLauncherVersionAsync(): Promise<string> {
		let packageFile: string = null;
		if (process.platform === 'darwin') {
			packageFile = '/Applications/EgretLauncher.app/Contents/Resources/app/package.json';
		} else {
			const target = await this.getEgretLauncherOnWindows();
			if (target) {
				packageFile = path.join(target.location, 'resources/app/package.json');
			}
		}
		if (packageFile) {
			const packageObj = await Launcher.readJsonAsync(packageFile);
			if (packageObj) {
				const version = packageObj['version'];
				if (version) {
					return version;
				}
			}
		}
		return null;
	}

	/**
	 * 启动egret launcher
	 */
	private static async launchAsync(): Promise<boolean> {
		const launcherPath = await Launcher.findEgretLauncherAsync();
		if (launcherPath) {
			const processEnv = { ...process.env };
			delete processEnv.ATOM_SHELL_INTERNAL_RUN_AS_NODE;
			delete processEnv.ELECTRON_RUN_AS_NODE;
			child.spawn(launcherPath, [], { env: processEnv, detached: true });
			return true;
		} else {
			return openExternal('egret://');
		}
	}

	/**
	 * 获取launcher服务的端口号
	 */
	private static async getLauncherHttpPortAsync(): Promise<number> {
		const settingsPath = path.join(getAppDataPath(process.platform), '/EgretLauncher/User/settings.json');
		const jsonObj = await Launcher.readJsonAsync(settingsPath);
		if (jsonObj) {
			return jsonObj.port;
		}
		return 80;
	}

	private static async httpGetAsync(urlPath: string, args: {}): Promise<string> {
		const port = await Launcher.getLauncherHttpPortAsync();
		let result = '';
		let requestPath = '';
		if (urlPath) {
			requestPath = `/${urlPath}`;
		}
		if (args) {
			requestPath += '?' + querystring.stringify(args);
		}
		const options: http.RequestOptions = {
			host: 'localhost',
			method: 'GET',
			port: port,
			path: requestPath
		};

		return new Promise<string>((resolve, reject) => {
			const req = http.request(options, (response) => {
				response.on('data', function (chunk) {
					result += chunk;
				});
				response.on('error', (error) => {
					reject(error);
				});
				response.on('end', function () {
					resolve(result);
				});
			});
			req.on('error', (error) => {
				reject(error);
			});
			req.end();
		});
	}

	/**
     * 向egret launcher发起请求
     * @param urlPath
     * @param args
     */
	private static async requestAsync(urlPath: string, args: {}): Promise<string> {
		let result: string = null;
		let retryCount: number = 5;
		while (retryCount > 0) {
			retryCount--;
			try {
				result = await Launcher.httpGetAsync(urlPath, args);
				break;
			} catch (error) {
				console.log('launcher request: ', error);
				if (retryCount > 0) {
					const launched = await Launcher.launchAsync();
					if (!launched) {
						break;
					}
					await Launcher.delayAsync(2000);
				}
			}
		}
		if (result === null) {
			return Promise.reject(new LauncherError(LauncherErrorCode.NotFound, 'Cannot find Egret Launcher.'));
		}
		return result;
	}

	// 测试代码
	// public static async testBadRequest() {
	//     return await Launcher.requestAsync("asdfasdfasdf", null);
	// }

	/**
	 * 向egret launcher发起登录请求
	 * @param appId 应用Id
	 */
	public static async loginAsync(appId: AppId): Promise<string> {
		return Launcher.requestAsync(Launcher.LoginPath, {
			appid: appId
		});
	}

	/**
	 * 检查应用更新
	 * @param appId 应用名称
	 * @returns 应用最新版本号
	 */
	public static checkAppUpdate(appId: AppId): Promise<string> {
		return Launcher.requestAsync(Launcher.CheckToolUpdatePath, {
			appid: appId,
		});
	}

	/**
	 * 打开项目发布设置
	 * @param projectFolder 项目文件夹
	 * @returns true: 成功发布，false: 取消发布
	 */
	public static async publishProject(projectFolder: string): Promise<boolean> {
		const result = await Launcher.requestAsync(Launcher.PublishProjectPath, {
			projectpath: projectFolder
		});
		if (result === 'true') {
			return true;
		}
		return false;
	}

	/**
	 * 创建项目
	 * @returns 项目路径
	 */
	public static createProject(): Promise<string> {
		return Launcher.requestAsync(Launcher.CreateProjectPath, {});
	}

	/**
	 * 检查launcher版本号是否大于指定的版本号
	 * @param version 要比较的版本号
	 */
	private static async validLauncherVersion(version: string): Promise<void> {
		const curVersion = await Launcher.getEgretLauncherVersionAsync();
		if (!curVersion) {
			return Promise.reject(new LauncherError(LauncherErrorCode.NotFound, 'Cannot find Egret Launcher.'));
		}
		if (!curVersion || !semver.gt(curVersion, version)) {
			return Promise.reject(new LauncherError(LauncherErrorCode.VersionNotMatch, `Version must greater than ${version}`, version));
		}
		return;
	}

	/**
	 * 报告错误
	 * @param appId
	 * @requires version Egret Launcher > MIN_LAUNCHER_VERSOIN
	 */
	public static async feedback(appId: AppId): Promise<boolean> {
		const result = await Launcher.requestAsync(Launcher.FeedbackPath, {
			appid: appId,
		});
		if (result === 'true') {
			return true;
		}
		return false;
	}

	/**
	 * 启动指定应用
	 * @param appId 应用id
	 * @param args 启动参数
	 * @requires version Egret Launcher > MIN_LAUNCHER_VERSOIN
	 */
	private static async launchApp(appId: AppId, ...args: string[]): Promise<boolean> {
		console.log('appid', appId);
		const result = await Launcher.requestAsync(Launcher.LaunchAppPath, {
			appid: appId,
			args: args
		});
		if (result === 'true') {
			return true;
		}
		return false;
	}

	/**
	 * 启动EUI Editor
	 * @requires version Egret Launcher > MIN_LAUNCHER_VERSOIN
	 */
	public static launchEUIEditor(): Promise<boolean>;
	/**
	 * 启动EUI Editor并打开指定文件夹
	 * @param folder 文件夹
	 * @requires version Egret Launcher > MIN_LAUNCHER_VERSOIN
	 */
	public static launchEUIEditor(folder: string): Promise<boolean>;
	public static async launchEUIEditor(folder?: string): Promise<boolean> {
		await Launcher.validLauncherVersion(MIN_LAUNCHER_VERSOIN);
		if (folder) {
			return await Launcher.launchApp(AppId.EUIEditor, `--folder="${folder}"`);
		}
		return await Launcher.launchApp(AppId.EUIEditor);
	}

	/**
	 * 启动Egret Feather
	 * @requires version Egret Launcher > MIN_LAUNCHER_VERSOIN
	 */
	public static launchFeather(): Promise<boolean>;
	/**
	 * 启动Egret Feather并打开指定粒子文件
	 * @param particleFile 粒子文件
	 * @requires version Egret Launcher > MIN_LAUNCHER_VERSOIN
	 */
	public static launchFeather(particleFile: string): Promise<boolean>;
	public static async launchFeather(particleFile?: string): Promise<boolean> {
		await Launcher.validLauncherVersion(MIN_LAUNCHER_VERSOIN);
		if (particleFile) {
			return await Launcher.launchApp(AppId.Feather, `"${particleFile}"`);
		}
		return await Launcher.launchApp(AppId.Feather);
	}

	/**
	 * 启动Res Depot
	 * @requires version Egret Launcher > MIN_LAUNCHER_VERSOIN
	 */
	public static launchResDepot(): Promise<boolean>;
	/**
	 * 启动Res Depot并打开指定资源配置文件
	 * @param resConfigFile res config 文件
	 * @requires version Egret Launcher > MIN_LAUNCHER_VERSOIN
	 */
	public static launchResDepot(resConfigFile: string): Promise<boolean>;
	/**
	 * 启动Res Depot并打开指定资源配置文件
	 * @param resConfigFile res config 文件
	 * @param resourceFolder 资源文件夹
	 */
	public static launchResDepot(resConfigFile: string, resourceFolder: string): Promise<boolean>;
	public static async launchResDepot(resConfigFile?: string, resourceFolder?: string): Promise<boolean> {
		await Launcher.validLauncherVersion(MIN_LAUNCHER_VERSOIN);
		if (resConfigFile) {
			if (resourceFolder) {
				return await Launcher.launchApp(AppId.ResDepot, `--config="${resConfigFile}"`, `--resource="${resourceFolder}"`);
			}
			return await Launcher.launchApp(AppId.ResDepot, `--config="${resConfigFile}"`);
		}
		return await Launcher.launchApp(AppId.ResDepot);
	}

	/**
	 * 启动Texture Merger
	 * @requires version Egret Launcher > MIN_LAUNCHER_VERSOIN
	 */
	public static launchTextureMerger(): Promise<boolean>;
	/**
	 * 启动Texture Merger并打开指定文件
	 * @param file 文件(`.jpg` `.jpeg` `.png` `.tmproject`)
	 * @requires version Egret Launcher > MIN_LAUNCHER_VERSOIN
	 */
	public static launchTextureMerger(file: string): Promise<boolean>;
	public static async launchTextureMerger(file?: string): Promise<boolean> {
		await Launcher.validLauncherVersion(MIN_LAUNCHER_VERSOIN);
		if (file) {
			return await Launcher.launchApp(AppId.TextureMerger, `"${file}"`);
		}
		return await Launcher.launchApp(AppId.TextureMerger);
	}
}