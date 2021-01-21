import * as FileUtil from '../utils/files';

export class LabelStyleAssistUnit {
	public constructor() {

	}

	private themeData: any;
	public init(themePath: string): void {
		var jsonStr: string = FileUtil.openAsString(themePath, 'utf-8');
		this.themeData = {};
		try {
			this.themeData = JSON.parse(jsonStr);
		} catch (error) {
		}
	}

	public getStyles(range: monaco.Range): monaco.languages.CompletionItem[] {
		var completions: monaco.languages.CompletionItem[] = [];
		if (this.themeData && this.themeData.styles) {
			for (var key in this.themeData.styles) {
				var data: any = this.themeData.styles[key];
				var dataJson: string = JSON.stringify(data);
				completions.push({
					label: key,
					detail: dataJson,
					documentation: dataJson,
					range: range,
					kind: monaco.languages.CompletionItemKind.Value,
					insertText: key + '"'
				});
			}
		}
		return completions;
	}

}