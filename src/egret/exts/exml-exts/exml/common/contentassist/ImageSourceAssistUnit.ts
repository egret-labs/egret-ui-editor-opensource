import { ResLibData } from 'egret/workbench/parts/assets/material/common/ResLibData';
import { ResType } from 'egret/workbench/parts/assets/material/common/ResType';

/**
 * 图片的source提示助手单元
 */
export class ImageSourceAssistUnit {
	public constructor() {
	}

	/**
     * 得到目前所有的资源key列表提示
     */
	public getKeyCompetions(range: monaco.Range): monaco.languages.CompletionItem[] {
		var completions: monaco.languages.CompletionItem[] = [];
		const resInfos = ResLibData.caches;
		let obj: any;
		for (obj in resInfos) {
			const resourcesArr = resInfos[obj];
			for (let i: number = 0; i < resourcesArr.length; i++) {
				if (resourcesArr[i]['type'] === ResType.TYPE_IMAGE) {
					completions.push({
						label: resourcesArr[i].name,
						detail: resourcesArr[i].showUrl,
						documentation: resourcesArr[i].url,
						kind: monaco.languages.CompletionItemKind.Value,
						range: range,
						insertText: resourcesArr[i].name + '"'
					});
				}
			}
		}
		return completions;
	}
}