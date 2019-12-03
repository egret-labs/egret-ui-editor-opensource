import { EditorRegistry, EditorDescriptor } from 'egret/editor/editorRegistry';
import { FileInputRegistry } from 'egret/editor/inputRegistry';
import { EditorInput } from 'egret/editor/common/input/editorInput';
import { SyncDescriptor } from 'egret/platform/instantiation/common/descriptors';
import { FileModelRegistry } from 'egret/editor/modelRegistry';

import { ExmlFileEditorInput } from './exml/common/exmlInput';
import { ExmlFileEditor } from './exml/browser/exmlFileEditor';
import { ExmlFileEditorModel } from './exml/common/exmlFileEditorModel';

/**
 * 初始化编辑器扩展
 */
export function initEditorExts() {
	//Exml
	FileInputRegistry.registerFileInput(['.exml'], ExmlFileEditorInput);
	EditorRegistry.registerEditor(
		new EditorDescriptor(ExmlFileEditor, ExmlFileEditor.ID, 'Exml 编辑器'),
		[new SyncDescriptor<EditorInput>(ExmlFileEditorInput)]
	);
	FileModelRegistry.registerFileModel(ExmlFileEditorModel, [new SyncDescriptor<EditorInput>(ExmlFileEditorInput)]);
}