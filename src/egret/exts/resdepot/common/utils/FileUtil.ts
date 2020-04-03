import platform = require('vs/base/common/platform');
import * as fsextra from 'fs-extra';
import paths = require('egret/base/common/paths');
import { URI } from 'vs/base/common/uri';
/* tslint:disable */
import { remote } from 'electron';
import * as encoding from 'egret/base/common/encoding';
/* tslint:enable */

export class FileUtil {

	/**
	 * 以文本形式打开文件
	 * @param path文件路径
	 * @callback 回调里返回了文件的文本内容
	 * @param charSet 字符集 （encoding）
	 */
	public static openAsString(path: string, callback: (ret) => void, charSet: string = 'UTF-8'): void {
		fsextra.pathExists(path).then(exits => {
			if (exits) {
				if (charSet === 'UTF-8') {
					fsextra.readFile(path).then(fileContent => {
						let str = encoding.decode(fileContent, 'UTF-8');
						return callback && callback(str);
					});
				} else {
					fsextra.readFile(path, charSet).then((content: string) => {
						return callback && callback(content);
					});
				}
			} else {
				console.warn('file not exist!', path);
				return callback && callback(null);
			}
		});
	}
	/**
	 * 以二进制形式打开文件
	 * @param path 文件路径
	 * @param callback 回调里的Buffer是NodeBuffer
	 * @return 返回
	 */
	public static openAsByteArray(path: string, callback: (ret: Buffer) => void): void {
		fsextra.readFile(path).then((content: Buffer) => {
			return callback && callback(content);
		});
	}
	/**
	 * 保存文件
	 * @param data 数据内容，可为string/NodeBuffer
	 * @param callback 保存结果回调
	 * @param charSet 字符集
	 */
	public static save(path: string, data: any, callback: (result: boolean) => void = null, charSet: string = 'UTF-8'): void {
		fsextra.writeFile(path, data, charSet).then(() => {
			if (callback) {
				callback(true);
			}
		}, err => {
			if (callback) {
				callback(false);
			}
		});
	}

	//todo 浏览保存
	public static browseForSave(callback: (dir: string) => void, p2: string, p3: any, p4: any): void {

	}

	/**
	 * 检查文件是否存在，增加了？参数的形式可能
	 * 文件或者文件夹是否存在
	 */
	public static exists(url: string, callback: (ret: boolean) => void): void {
		if (!url) {
			//     debugger;
		}
		var argIndex: number = url.indexOf('?');
		if (argIndex !== -1) {
			url = url.slice(0, argIndex);
		}
		fsextra.pathExists(url).then((ret: boolean) => {
			return callback && callback(ret);
		});
	}

	/**路径存在且是文件夹 */
	public static dirExists(path: string, callback: (ret: boolean) => void): void {
		fsextra.pathExists(path).then((ret: boolean) => {
			return callback && callback(ret);
		});
	}

	/**路径存在且是文件 */
	public static fileExists(path: string, callback: (ret: boolean) => void): void {
		fsextra.pathExists(path).then((ret: boolean) => {
			return callback && callback(ret);
		});
	}


	/// paths
	/// path = 'test\swfres\testScale9\3.json';
	/// paths.dirname(path) // test/swfres/testScale9
	/// paths.basename(path) //3.json
	/// paths.extname(path) //.json
	/**
	 * 返回文件路径
	 */
	public static getDirectory(path: string): string {
		if (!path || '' === path) {
			return '';
		}
		path = FileUtil.escapePath(path);
		return paths.dirname(path);
	}
	/**
	 * 转为系统分隔符的路径
	 */
	public static nomalize(path: string): string {
		return paths.normalize(path, true);
	}
	/**
	 * 取相对路径
	 * @param from 根路径
	 * @param to 全路径
	 * @return 相对路径
	 */
	public static relative(from: string, to: string): string {
		return paths.relative(from, to);
	}
	/// paths end

	/**
	 * 取扩展名
	 */
	public static getExtension(path: string): string {
		var index: number = path.lastIndexOf('.');
		if (index === -1) {
			return '';
		}
		var i: number = path.lastIndexOf('/');
		if (i > index) {
			return '';
		}
		return path.substring(index + 1);
		/// 用paths的api来取的方法：
		//return paths.extname(path);
	}
	/**
	 * 获取路径的文件名(不含扩展名)或文件夹名
	 */
	public static getFileName(path: string): string {
		if (!path || '' === path) {
			return '';
		}
		path = FileUtil.escapePath(path);
		var startIndex: number = path.lastIndexOf('/');
		var endIndex: number;
		if (startIndex > 0 && startIndex === path.length - 1) {
			path = path.substring(0, path.length - 1);
			startIndex = path.lastIndexOf('/');
			endIndex = path.length;
			return path.substring(startIndex + 1, endIndex);
		}
		endIndex = path.lastIndexOf('.');
		if (endIndex <= startIndex) {
			endIndex = path.length;
		}
		return path.substring(startIndex + 1, endIndex);
	}
	/**
	 * 读文件夹下的所有文件
	 * @param path
	 * @param pattern 文件名匹配模式，pfs必须传入RegExp参数。默认传入空 /(?:)/ 或者new RegExp();
	 * @param callback files是所有文件名列表，默认只包含文件名，如：config.json
	 * @param fullPath 是否返回全路径格式
	 */
	public static getFilesInDir(path: string, pattern: RegExp = /(?:)/, fullPath: boolean = false): Promise<string[]> {
		let promise: Promise<string[]> = new Promise<string[]>(resolve => {
			if (!pattern) {
				pattern = /(?:)/;// new RegExp();
			}
			FileUtil.readFiles(path, pattern).then(files => {
				if (fullPath) {
					let fullPathFiles: string[] = [];
					for (let i: number = 0; i < files.length; i++) {
						fullPathFiles.push(paths.join(path, files[i]));
					}
					resolve(fullPathFiles);
				} else {
					resolve(files);
				}
			});
		});
		return promise;
	}

	public static readFiles(path: string, pattern: RegExp): Promise<string[]> {
		return fsextra.readdir(path).then((children) => {
			children = children.filter((child) => {
				return pattern.test(child);
			});
			let fileChildren = children.map((child) => {
				return FileUtil.fileExistsWithResult(paths.join(path, child), child);
			});
			return Promise.all(fileChildren).then((subdirs) => {
				return FileUtil.removeNull(subdirs);
			});
		});
	}

	public static removeNull<T>(arr: T[]): T[] {
		return arr.filter(item => (item !== null));
	}

	public static fileExistsWithResult<T>(path: string, successResult: T): Promise<T> {
		return fsextra.pathExists(path).then((exists) => {
			return exists ? successResult : null;
		}, (err) => {
			return Promise.reject(err);
		});
	}

	/**
	* Read a dir and return only subfolders
	*/
	private static readDirsInDir(dirPath: string): Promise<string[]> {
		return fsextra.readdir(dirPath).then(children => {
			return Promise.all(children.map(c => FileUtil.dirExistsCore(paths.join(dirPath, c)))).then(exists => {
				return children.filter((_, i) => exists[i]);
			});
		});
	}

	/**
	* `path` exists and is a directory
	*/
	private static dirExistsCore(path: string): Promise<boolean> {
		return fsextra.stat(path).then(stat => stat.isDirectory(), () => false);
	}
	/**
	 * 读文件夹的子文件夹
	 * @param path
	 * @param callback dirs子文件夹列表 (注意：列表内容是不包含路径的子文件夹名，通过fullPath参数来控制是否使用全路径)
	 * @param pattern 文件名匹配模式，pfs必须传入RegExp参数。默认传入空 /(?:)/ 或者new RegExp();
	 * @param fullPath 子文件夹包含全路径
	 */
	public static getDirsInDir(path: string, pattern: RegExp = /(?:)/, fullPath: boolean = false): Promise<string[]> {
		let promise: Promise<string[]> = new Promise<string[]>(resolve => {
			if (!pattern) {
				pattern = /(?:)/;// new RegExp();
			}
			FileUtil.readDirsInDir(path).then((dirs) => {
				if (fullPath) {
					var fullPathDirs: string[] = [];
					for (var i: number = 0; i < dirs.length; i++) {
						fullPathDirs.push(paths.join(path, dirs[i]));
						resolve(fullPathDirs);
					}
				} else {
					resolve(dirs);
				}
				resolve(dirs);
			});
		});
		return promise;
	}
	/**
	 * 递归得到一个文件目录下所有的文件
	 * @param path
	 * @return 文件列表 （注意这个列表在异步调用里补全，立即返回后的列表长度是0）
	 */
	public static getAllFilesInDir(path: string, pattern: RegExp = /(?:)/): Promise<string[]> {
		let promise: Promise<string[]> = new Promise<string[]>(resolve => {
			var allfiles: string[] = [];
			var nestCount_dir: number = 0;//嵌套层数，引用次数
			var nestCount_file: number = 0;
			var selectFiles = (url: string) => {
				nestCount_dir++;
				nestCount_file++;
				FileUtil.getDirsInDir(url).then(dirs => {
					nestCount_dir--;
					for (var i: number = 0; i < dirs.length; i++) {
						selectFiles(paths.join(url, dirs[i]));
					}
					if (nestCount_dir === 0 && nestCount_file === 0) {
						resolve(allfiles);
					}
				});
				FileUtil.getFilesInDir(url).then(files => {
					nestCount_file--;
					for (var i: number = 0; i < files.length; i++) {
						allfiles.push(paths.join(url, files[i]));//处理下路径，底层只返回文件名
					}
					if (nestCount_dir === 0 && nestCount_file === 0) {
						resolve(allfiles);
					}
				});
			};
			selectFiles(path);
		});
		return promise;
	}

	/**
	 * 将一个目录中的所有文件拷贝到另一个目录中
	 * @param projectPath
	 *
	 */
	// public static copyDirectory(fromPath:string, toPath:string)
	// {
	// var rootTargetPath:string = ''//<any>new File(toPath).nativePath;
	// var rootSourcePath:string = ''//<any>new File(fromPath).nativePath;
	// function copy (sourcePath:string)
	// {
	//     // var file:flash.filesystem.File = <any>new File(sourcePath);
	//     var file:any = null;//<any>new File(sourcePath);
	//     var targetPath:string = ''// <any>new File(rootTargetPath + sourcePath.replace(rootSourcePath,'')).nativePath;
	//     if(!file['isDirectory'])
	//     {
	//         FileUtil['copyTo'](sourcePath,targetPath,true);
	//     }
	//     else
	//     {
	//         var files:Array<any> = <any>file['getDirectoryListing']();
	//         for(var i:number = flash.checkInt(0);i < files.length; i++)
	//         {
	//             // copy(File(files[i]).nativePath);
	//         }
	//     }
	// };
	// copy(rootSourcePath);
	// }

	// public static moveTo(source:string,dest:string,overwrite:boolean = false):boolean
	// {
	//     return true;
	// }

	// public static copyTo(source:string,dest:string,overwrite:boolean = false):boolean
	// {
	//     return true;
	// }

	// public static deletePath(path:string,moveToTrash:boolean = false):boolean
	// {
	//     return true;
	// }
	/**
	 * 将url转换为本地路径
	 */
	public static url2Path(url: string): String {
		url = FileUtil.escapePath(url);
		var uri: URI = URI.parse(url);
		return uri.fsPath;
	}
	/**
	 * 将本地路径转换为url ???todo
	 */
	public static path2Url(path: string): string {
		path = FileUtil.escapePath(path);
		var uri: URI = URI.file(path);
		return uri.path;
	}
	/**
	 * 转换本机路径或url为Unix风格路径。若是文件夹路径，返回值结尾已包含分隔符。
	 */
	public static escapePath(path: string): string {
		if (!path) {
			return '';
		}
		var nativePath: string = path;
		if (path.indexOf('file:') === 0) {
			var uri: URI = URI.file(path);
			nativePath = uri.fsPath;
		}
		nativePath = nativePath.split('\\').join('/');
		return nativePath;
		///或者使用paths提供的api
		//return paths.normalize(path);
	}
	/**
	 * 转换url中的反斜杠为斜杠
	 */
	public static escapeUrl(url: string): string {
		if (!url || '' === url) {
			return '';
		}
		url = url.split('\\').join('/');
		return url;
	}

	/**
	 * 选择文件或者文件夹
	 * @param isFolder true为文件夹
	 * @param callback 回调返回的路径是本机格式
	 * @param _title 弹窗标题
	 * @param _filters 文件过滤，只在isFoler为false时有效 eg: [{'name':'res files', 'extensions':['json']}]
	 * @param _defaultPath
	 */
	public static getFileOrFolderPaths(isFolder: boolean, callback: (paths: string[]) => void, _title: string = '', _filters: any = null, _defaultPath: string = ''): void {
		let win = remote.BrowserWindow.getFocusedWindow();
		let pickerProperties: string[];
		if (platform.isMacintosh) {
			pickerProperties = ['multiSelections', 'openDirectory', 'openFile', 'createDirectory'];
		} else {
			pickerProperties = ['multiSelections', isFolder ? 'openDirectory' : 'openFile', 'createDirectory',];
		}
		//OpenDialogOptions
		var openDialogOptions: any = {
			title: _title,
			defaultPath: _defaultPath,
			filters: _filters,
			properties: pickerProperties
		};
		remote.dialog.showOpenDialog(win, openDialogOptions, (paths) => {
			if (paths && paths.length > 0) {
				callback(paths);
			} else {
				callback(void (0));
			}
		});
	}

}