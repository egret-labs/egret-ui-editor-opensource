import { IClipboardService } from '../common/clipboardService';
import { clipboard } from 'electron';
import { isMacintosh } from 'egret/base/common/platform';
import URI from 'egret/base/common/uri';

/**
 * 剪贴板服务
 */
export class ClipboardService implements IClipboardService {

	private static FILE_FORMAT = 'code/file-list';



	_serviceBrand: undefined;
	/**
	 * 写文本
	 * @param text 
	 */
	public writeText(text: string, type?: 'selection' | 'clipboard'): void {
		clipboard.writeText(text, type);
	}
	/**
	 * 从剪贴板中读取文本
	 */
	public readText(type?: 'selection' | 'clipboard'): string {
		return clipboard.readText(type);
	}

	/**
	* 清理剪切板内容
	*/
	public clear(type?: 'selection' | 'clipboard'): void {
		clipboard.clear(type);
	}
	/**
	 * 写文本
	 */
	public writeFindText(text: string): void {
		if (isMacintosh) {
			clipboard.writeFindText(text);
		}
	}
	/**
	 * 从剪贴板中读取文本
	 */
	public readFindText(): string {
		if (isMacintosh) {
			return clipboard.readFindText();
		}
		return '';
	}
	/**
	 * 写文件
	 */
	public writeFiles(resources: URI[]): void {
		const files = resources.filter(f => f.scheme === 'file');

		if (files.length) {
			clipboard.writeBuffer(ClipboardService.FILE_FORMAT, this.filesToBuffer(files));
		}
	}
	/**
	 * 读取文件
	 */
	public readFiles(): URI[] {
		return this.bufferToFiles(clipboard.readBuffer(ClipboardService.FILE_FORMAT));
	}
	/**
	 * 是否含有文件
	 */
	public hasFiles(): boolean {
		return clipboard.has(ClipboardService.FILE_FORMAT);
	}

	private filesToBuffer(resources: URI[]): Buffer {
		return Buffer.from(resources.map(r => r.fsPath).join('\n'));
	}

	private bufferToFiles(buffer: Buffer): URI[] {
		if (!buffer) {
			return [];
		}

		const bufferValue = buffer.toString();
		if (!bufferValue) {
			return [];
		}

		try {
			return bufferValue.split('\n').map(f => URI.file(f));
		} catch (error) {
			return []; // do not trust clipboard data
		}
	}
}