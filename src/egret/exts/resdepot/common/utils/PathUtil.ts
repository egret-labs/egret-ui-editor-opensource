
export class PathUtil extends egret.HashObject {
	public static getShortPath(path: string, startSlashIndex: number = 1, endSlashIndex: number = 3): string {
		var numSlash: number = 0;
		for (var i: number = 0; i < path.length; i++) {
			if (path.charAt(i) === '/') {
				numSlash++;
			}
		}
		if (numSlash <= startSlashIndex + endSlashIndex) {
			return path;
		} else {
			var startPoint: number = 0;
			var endPoint: number = 0;
			var tmpStart: number = 0;
			var tmpEnd: number = 0;
			endSlashIndex = numSlash - endSlashIndex + 1;
			for (i = 0; i < path.length; i++) {
				if (path.charAt(i) === '/') {
					tmpStart++;
					tmpEnd++;
				}
				if (tmpStart === startSlashIndex - 1) {
					startPoint = i;
				}
				if (tmpEnd === endSlashIndex - 1) {
					endPoint = i;
				}
			}
			var startStr: string = path.slice(0, startPoint + 2);
			var endStr: string = path.slice(endPoint + 1);
			return startStr + '...' + endStr;
		}
		//return path;
	}

	public static removeExtFormStr(str: string): string {
		var ext: string = '';//<any>FileUtil['getExtension'](str);
		if (ext) {
			ext = '.' + ext;
			var index: number = str.lastIndexOf(ext);
			if (index !== -1) {
				var newStr: string = str.slice(0, index);
				return newStr;
			}
		}
		return str;
	}

	public static regForAllName: RegExp;
	public static getAllFileNameFromUrl(url: string): string {
		var argIndex: number = url.indexOf('?');
		if (argIndex !== -1) {
			url = url.slice(0, argIndex);
		}
		return url.split(PathUtil.regForAllName)[1];
	}

}

PathUtil.regForAllName = /(?:.*\/)(.*)/;
