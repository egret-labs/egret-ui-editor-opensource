import { createDecorator } from '../../instantiation/common/instantiation';
import URI from '../../../base/common/uri';

export const IClipboardService = createDecorator<IClipboardService>('clipboardService');

/**
 * 剪贴板服务
 */
export interface IClipboardService {

	_serviceBrand: undefined;
	/**
	 * 写文本
	 */
	writeText(text: string, type?: string): void;
	/**
	 * 从剪贴板中读取文本
	 */
	readText(type?: string): string;
	/**
	 * 写文本
	 */
	writeFindText(text: string): void;
	/**
	 * 从剪贴板中读取文本
	 */
	readFindText(): string;
	/**
	 * 写文件
	 */
	writeFiles(files: URI[]): void;
	/**
	 * 读取文件
	 */
	readFiles(): URI[];
	/**
	 * 是否含有文件
	 */
	hasFiles(): boolean;

	/**
	 * 清理内容
	 * @param type 
	 */
	clear(type?: string): void;
}