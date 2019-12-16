import * as FileUtil from '../utils/files';

/**
 * 图片的source提示助手单元
 */
export class ImageSourceAssistUnit {

	public constructor() {
	}

	private configMap: { [url: string]: any } = {};
    /**
     * 初始化文件根目录
     * @param rootPath 文件根路径
     */
	public init(rootPath: string): void {
		this.configMap = {};
		FileUtil.select(rootPath, ['json'], (filePath: string) => {
			this.fileChanged(filePath, 1)
		}, this)
	}

    /**
     * 文件改变
     * @param filePath 文件地址
     * @param type 类型 1:Added 2:Changed 3:Deleted
     */
	public fileChanged(filePath: string, type: number): void {
		if (type == 1) {
			var jsonObj: any = this.resConfigCheck(filePath);
			if (jsonObj) {
				this.configMap[filePath.toLocaleLowerCase()] = { 'path': filePath, 'jsonObj': jsonObj };
			}
		} else if (type == 2) {
			delete this.configMap[filePath.toLocaleLowerCase()];
			var jsonObj: any = this.resConfigCheck(filePath);
			if (jsonObj) {
				this.configMap[filePath.toLocaleLowerCase()] = { 'path': filePath, 'jsonObj': jsonObj };
			}
		} else if (type == 3) {
			delete this.configMap[filePath.toLocaleLowerCase()];
		}
	}

    /**
     * 检查是否是资源配置文件，是则返回对应的json对象，否则返回null
     * @param filePath 文件路径
     * @return 是则返回对应的json对象，否则返回null
     */
	private resConfigCheck(filePath: string): any {
		var ext: string = FileUtil.getExtension(filePath);
		if (ext == 'json') {
			var jsonStr: string = FileUtil.openAsString(filePath, 'utf-8');
			if (jsonStr) {
				var jsonObj: any = null;
				try {
					jsonObj = JSON.parse(jsonStr);
				} catch (error) { }
				if (jsonObj) {
					var groupsArr: any[] = jsonObj['groups'];
					var resourcesArr: any[] = jsonObj['resources'];
					if (groupsArr && resourcesArr)
						return jsonObj;
				}
			}
		}
		return null;
	}
    /**
     * 得到目前所有的资源key列表提示
     */
	public getKeyCompetions(range: monaco.Range): monaco.languages.CompletionItem[] {
		var completions: monaco.languages.CompletionItem[] = [];
		for (var key in this.configMap) {
			var obj: any = this.configMap[key]
			var filePath: string = obj['path'];
			var jsonObj: any = obj['jsonObj'];
			var resourcesArr: any[] = jsonObj['resources'];
			for (var i = 0; i < resourcesArr.length; i++) {
				if (resourcesArr[i]['type'] == 'image') {
					completions.push({
						label: resourcesArr[i]['name'],
						detail: resourcesArr[i]['url'],
						documentation: filePath,
						kind: monaco.languages.CompletionItemKind.Value,
						range: range,
						insertText: resourcesArr[i]['name']
					});
				}
			}
		}
		return completions;
	}
}