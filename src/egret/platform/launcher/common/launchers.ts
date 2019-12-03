import * as paths from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as child from 'child_process';
import * as querystring from 'querystring';
import { APPLICATION_NAME } from 'egret/consts/consts';
import { homedir } from 'os';

/**
 * APP存储目录
 * @param platform 
 */
function getAppDataPath(platform: string): string {
	switch (platform) {
		case 'win32': return process.env['APPDATA'] || paths.join(process.env['USERPROFILE'], 'AppData', 'Roaming');
		case 'darwin': return paths.join(homedir(), 'Library', 'Application Support');
		case 'linux': return process.env['XDG_CONFIG_HOME'] || paths.join(homedir(), '.config');
		default: throw new Error('Platform not supported');
	}
}

/**
 * 登录命令
 */
const LoginPath: string = 'login';
/**
 * 检查更新
 */
const CheckUpdate: string = 'checkToolUpdate';

/**
 * 延迟指定时长
 * @param milliseconds 延迟时间，毫秒
 */
function delayAsync(milliseconds: number): Promise<void> {
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
function fileExistsAsync(filePath: string): Promise<boolean> {
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
function readJsonAsync(filePath: string): Promise<any> {
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

/**
 * 查找egret launcher可执行文件
 */
async function findEgretLauncherAsync(): Promise<string> {
	const possiblePaths: string[] = [];
	if (process.platform === 'darwin') {
		possiblePaths.push('/Applications/EgretLauncher.app/Contents/MacOS/EgretLauncher');
	} else {
		possiblePaths.push(paths.join(process.env['ProgramFiles(x86)'], 'Egret', 'EgretLauncher', 'EgretLauncher.exe'));
		possiblePaths.push(paths.join(process.env['ProgramFiles'], 'Egret', 'EgretLauncher', 'EgretLauncher.exe'));
	}
	for (let i = 0; i < possiblePaths.length; i++) {
		const path = possiblePaths[i];
		const exist = await fileExistsAsync(path);
		if (exist) {
			return path;
		}
	}
	return null;
}

/**
 * 获取已安装的egret launcher版本号。
 * @returns 版本号，未安装返回null
 */
export async function getEgretLauncherVersionAsync(): Promise<string> {
	const possiblePaths: string[] = [];
	if (process.platform === 'darwin') {
		possiblePaths.push('/Applications/EgretLauncher.app/Contents/Resources/app/package.json');
	} else {
		possiblePaths.push(paths.join(process.env['ProgramFiles(x86)'], 'Egret', 'EgretLauncher', 'resources/app/package.json'));
		possiblePaths.push(paths.join(process.env['ProgramFiles'], 'Egret', 'EgretLauncher', 'resources/app/package.json'));
	}
	let packageFile: string = null;
	for (let i = 0; i < possiblePaths.length; i++) {
		const path = possiblePaths[i];
		const exist = await fileExistsAsync(path);
		if (exist) {
			packageFile = path;
			break;
		}
	}
	if (packageFile) {
		const packageObj = await readJsonAsync(packageFile);
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
async function launchAsync(): Promise<void> {
	const launcherPath = await findEgretLauncherAsync();
	if (launcherPath) {
		child.spawn(launcherPath, [], { detached: true });
	}
}

/**
 * 获取launcher服务的端口号
 */
async function getLauncherHttpPortAsync(): Promise<number> {
	const settingsPath = paths.join(getAppDataPath(process.platform), '/EgretLauncher/User/settings.json');
	const jsonObj = await readJsonAsync(settingsPath);
	if (jsonObj) {
		return jsonObj.port;
	}
	return 80;
}

async function httpGetAsync(path: string, args: {}): Promise<string> {
	const port = await getLauncherHttpPortAsync();
	let result = '';
	let requestPath = '';
	if (path) {
		requestPath = `/${path}`;
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
 * @param path 
 * @param args 
 */
async function requestAsync(path: string, args: {}): Promise<string> {
	let result: string = null;
	let retryCount: number = 5;
	while (retryCount > 0) {
		retryCount--;
		try {
			result = await httpGetAsync(path, args);
			break;
		} catch (error) {
			console.log('launcher request: ', error);
			if (retryCount > 0) {
				await launchAsync();
				await delayAsync(2000);
			}
		}
	}
	if (result === null) {
		return Promise.reject(void 0);
	}
	return result;
}

/**
 * 向egret launcher发起登录请求
 */
async function loginAsync(): Promise<string> {
	return requestAsync(LoginPath, {
		//TODO 想办法外界注入
		appname: APPLICATION_NAME
	});
}


/**
 * 登录
 */
export function loginFromLauncher(): Promise<{ success: boolean, userName: string }> {
	return new Promise<{ success: boolean, userName: string }>((resolve, reject) => {
		loginAsync().then(
			result => {
				if (result != 'cancel') {
					resolve({ success: true, userName: result });
				} else {
					resolve({ success: false, userName: '' });
				}
			}, () => {
				resolve({ success: false, userName: '' });
			});
	});
}

/**
 * 向egret launcher发起登录请求
 */
export function checkUpdateFromLauncher(): Promise<string> {
	return requestAsync(CheckUpdate, {
		//TODO 想办法外界注入
		appid: 'com.egret.euiEditor'
	});
}