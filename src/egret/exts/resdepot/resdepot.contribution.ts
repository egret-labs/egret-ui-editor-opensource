/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { RES_EDITOR_ID } from 'egret/exts/resdepot/common/consts/ResType';
import { ResEditorInput } from 'egret/exts/resdepot/views/resEditorInput';
import { EditorDescriptor, EditorRegistry } from 'egret/editor/editorRegistry';
import { SyncDescriptor } from 'egret/platform/instantiation/common/descriptors';
import { FileInputRegistry } from 'egret/editor/inputRegistry';
import { FileModelRegistry } from 'egret/editor/modelRegistry';
import { EditorInput } from 'egret/editor/common/input/editorInput';
import { ResEditor } from './views/resEditor';
import { ResFileEditorModel } from './views/resEditorModel';


/**
 * 初始化RES编辑器扩展
 */
export function initResEditorExts() {
	//res config
	FileInputRegistry.registerFileInput(['.json'], ResEditorInput);
	EditorRegistry.registerEditor(
		new EditorDescriptor(ResEditor, RES_EDITOR_ID, 'Res 编辑器'),
		[new SyncDescriptor<EditorInput>(ResEditorInput)]
	);
	FileModelRegistry.registerFileModel(ResFileEditorModel, [new SyncDescriptor<EditorInput>(ResEditorInput)]);
}