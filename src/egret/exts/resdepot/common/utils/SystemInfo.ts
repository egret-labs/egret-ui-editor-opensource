import platform = require('vs/base/common/platform');
/**
 * 系统信息查询类
 * chenpeng 封装了platform
 */
export class SystemInfo{
	/**
	 * 是否是mac系统
	 */
	public static get isMacOS():boolean{
		return platform.isMacintosh;
	}

	public static get isWindows():boolean{
		return platform.isWindows;
	}

	public static get isNative():boolean{
		return platform.isNative;
	}

	public static get isWeb():boolean{
		return platform.isWeb;
	}

	// private static _nativeStoragePath:String = '';
	/**
	 * 本机应用程序储存目录根路径。路径已包含结尾分隔符。分隔符为原生格式。
	 * Mac：/用户目录/Library/Application Support/
	 * Windows：\用户目录\AppData\Roaming\
	 */
	// public static function get nativeStoragePath():String
	// {
	//     if(_nativeStoragePath)
	//         return _nativeStoragePath;
	//     if(isMacOS)
	//     {
	//         _nativeStoragePath = File.userDirectory.nativePath+'/Library/Application Support/';
	//     }
	//     else
	//     {
	//         var file:File = new File(File.applicationStorageDirectory.nativePath);
	//         _nativeStoragePath = file.parent.parent.nativePath+'\\';
	//     }
	//     return _nativeStoragePath;
	// }
}