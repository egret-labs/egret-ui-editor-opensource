/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { TextDocumentBase } from './TextDocumentBase';
import * as sax from '../sax/sax';
import * as xml from '../sax/xml-tagUtils';
import * as headerChecker from '../sax/xmlHeaderChecker';
/**
 * 增量模式的文本文档
 */
export class XMLDocument extends TextDocumentBase {
	public constructor(uri: string, content: string) {
		super(uri, content);
		this._xmlRoot = xml.parse(this.getText(), false, false);
	}

	/**
	 * 根据增量变化来修正文档
	 */
	public update(params: monaco.editor.IModelContentChangedEvent): void {
		super.update(params);
		this._xmlRoot = xml.parse(this.getText(), false, false);
	}

	private _xmlRoot: sax.Tag;
	/**
	 * 当前xml文档的根节点，在每次改变文本的时候，会更新根节点
	 */
	public get xmlRoot(): sax.Tag {
		return this._xmlRoot;
	}

	public getError(): sax.Error[] {
		let errors: sax.Error[] = this.xmlRoot.errors;
		let headerError = headerChecker.check(this.getText());
		if (!errors) {
			errors = [];
		}
		for (let i = 0; i < headerError.length; i++) {
			errors.push({
				message: headerError[i].info,
				start: headerError[i].start,
				end: headerError[i].end,
				name: headerError[i].info
			});
		}
		return errors;
	}
}