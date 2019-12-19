/**
 * 增量模式的文本文档
 */
export class TextDocumentBase {
	private _uri: string = '';
	private _content: string = '';
	languageId = 'exml';
	version = 1;

	public constructor(uri: string, content: string) {
		this._uri = uri;
		this._content = content;
	}
	/**
	 * 当前文本文档的标识
	 */
	public get uri(): string {
		return this._uri;
	}
	/**
     * 当前文档的文本
     */
	public getText(): string {
		return this._content;
	}

	private _lineOffsets: number[] = null;
    /**
     * 根据增量变化来修正文档
     */
	public update(params: monaco.editor.IModelContentChangedEvent): void {
		for (let i = 0; i < params.changes.length; i++) {
			let event: monaco.editor.IModelContentChange = params.changes[i];
			let startOffset: number = this.offsetAt((event.range as monaco.Range).getStartPosition());
			let endOffset: number = this.offsetAt((event.range as monaco.Range).getEndPosition());
			let str1: string = this._content.slice(0, startOffset);
			let str2: string = event.text;
			let str3: string = this._content.slice(endOffset);
			this._content = str1 + str2 + str3;
			this._lineOffsets = null;
		}
	}
    /**
     * 得到每一行的索引位置
     */
	public getLineOffsets(): number[] {
		if (this._lineOffsets === null) {
			let lineOffsets: number[] = [];
			let text: string = this._content;
			let isLineStart: boolean = true;
			for (let i = 0; i < text.length; i++) {
				if (isLineStart) {
					lineOffsets.push(i);
					isLineStart = false;
				}
				let ch: string = text.charAt(i);
				isLineStart = (ch === '\r' || ch === '\n');
				if (ch === '\r' && i + 1 < text.length && text.charAt(i + 1) === '\n') {
					i++;
				}
			}
			if (isLineStart && text.length > 0) {
				lineOffsets.push(text.length);
			}
			this._lineOffsets = lineOffsets;
		}
		return this._lineOffsets;
	}
    /**
     * 在指定的索引位置得到Position
     */
	public positionAt(offset: number): monaco.IPosition {
		offset = Math.max(Math.min(offset, this._content.length), 0);
		let lineOffsets = this.getLineOffsets();
		let low = 0, high = lineOffsets.length;
		if (high === 0) {
			return new monaco.Position(0, offset);
		}
		while (low < high) {
			let mid = Math.floor((low + high) / 2);
			if (lineOffsets[mid] > offset) {
				high = mid;
			} else {
				low = mid + 1;
			}
		}
		let line = low;
		return new monaco.Position(line, offset - lineOffsets[line - 1] + 1);
	}
    /**
     * 在指定的位置得到索引位置
     */
	public offsetAt(position: monaco.Position): number {
		let lineOffsets = this.getLineOffsets();
		if (position.lineNumber >= lineOffsets.length) {
			return this._content.length;
		} else if (position.lineNumber < 0) {
			return 0;
		}
		let lineOffset = lineOffsets[position.lineNumber - 1];
		let nextLineOffset = (position.lineNumber < lineOffsets.length) ? lineOffsets[position.lineNumber] : this._content.length;
		return Math.max(Math.min(lineOffset + position.column - 1, nextLineOffset), lineOffset);
	}

    /**
     * 行数
     */
	public get lineCount(): number {
		return this.getLineOffsets().length;
	}
}