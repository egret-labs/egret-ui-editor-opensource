import { createDecorator } from 'egret/platform/instantiation/common/instantiation';

export const ICodeService = createDecorator<ICodeService>('codeService');

/**
 * exml源码编辑服务
 */
export interface ICodeService {
	_serviceBrand: any;
	/**
	 * 初始化
	 */
	init(): void;
	/**
	 * 将服务添加到编辑器中
	 * @param editor 
	 */
	attachEditor(editor: monaco.editor.IStandaloneCodeEditor): void;
	/**
	 * 将服务从编辑器中移除
	 * @param editor 
	 */
	detachEditor(editor: monaco.editor.IStandaloneCodeEditor): void;
}