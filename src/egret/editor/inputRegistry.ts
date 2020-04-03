import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';

import * as paths from 'egret/base/common/paths';

import URI from '../base/common/uri';
import { IFileEditorInput } from './core/inputs';
import { FileEditorInput } from './common/input/editorInput';
import { localize } from '../base/localization/nls';

/**
 * 文件输入流工厂
 */
export interface IFileInputRegistry {
	/**
	 * 设置默认的文件输入流，如果通过扩展名没有找到任何对应文件输入流类型时，则返回默认文件输入流实例
	 * @param inputCls 
	 */
	setDefaultFileInput(inputCls: any): void;
	/**
	 * 注册扩展名对应的文件输入流
	 * @param exts 扩展名
	 * @param inputCls 文件输入流类
	 */
	registerFileInput(exts: string[], inputCls: any): void;
	/**  
	 * 创建一个文件输入流
	 * @param resource URI
	 * @param encoding 编码
	 * @param instantiationService 实例化服务
	 */
	getFileInput(resource: URI, encoding: string, instantiationService: IInstantiationService): IFileEditorInput;
	/**
	 * 判断是否是文件输入流
	 * @param obj 
	 */
	isFileInput(obj: any): obj is IFileEditorInput;
	/**
	 * 得到注册的所有的文件输入流类型
	 */
	getFileInputs(): { ext: string, inputCls: any }[];
}

class FileInputRegistryImpl implements IFileInputRegistry {
	private _defaultFileInputCls: any;
	/**
	 * 设置默认的文件输入流，如果通过扩展名没有找到任何对应文件输入流类型时，则返回默认文件输入流实例
	 * @param inputCls 
	 */
	public setDefaultFileInput(inputCls: any): void {
		this._defaultFileInputCls = inputCls;
	}
	private fileInputClsMap: { [ext: string]: any } = {};
	/**
	 * 注册扩展名对应的文件输入流
	 * @param exts 扩展名
	 * @param inputCls 文件输入流类
	 */
	public registerFileInput(exts: string[], inputCls: any): void {
		for (let i = 0; i < exts.length; i++) {
			const ext: string = exts[i].toLocaleLowerCase();
			if (ext in this.fileInputClsMap) {
				throw new Error(localize('inputRegistry.registerFileInput.error', 'Duplicate registration of input stream with file type {0}.', ext));
			} else {
				this.fileInputClsMap[ext] = inputCls;
			}
		}
	}
	/**  
	 * 创建一个文件输入流
	 * @param resource URI
	 * @param encoding 编码
	 * @param instantiationService 实例化服务
	 */
	public getFileInput(resource: URI, encoding: string, instantiationService: IInstantiationService): IFileEditorInput {
		let baseName = paths.basename(resource.fsPath);
		let dot = baseName.indexOf('.');
		while (dot > -1) {
			let ext: string = baseName.substring(dot);
			if (ext) {
				ext = ext.toLocaleLowerCase();
				if (ext in this.fileInputClsMap) {
					const inputCls = this.fileInputClsMap[ext];
					return instantiationService.createInstance(inputCls, resource, encoding);
				}
			}
			baseName = baseName.substring(dot + 1);
			dot = baseName.indexOf('.');
		}
		// let ext: string = paths.extname(resource.fsPath);
		// if (ext) {
		// 	ext = ext.toLocaleLowerCase();
		// 	if (ext in this.fileInputClsMap) {
		// 		const inputCls = this.fileInputClsMap[ext];
		// 		return instantiationService.createInstance(inputCls, resource, encoding);
		// 	}
		// }
		if(!this._defaultFileInputCls){
			return null;
		}
		return instantiationService.createInstance(this._defaultFileInputCls, resource, encoding);
	}
	/**
	 * 判断是否是文件输入流
	 * @param obj 
	 */
	public isFileInput(obj: any): obj is IFileEditorInput {
		return obj instanceof FileEditorInput;
	}
	/**
	 * 得到注册的所有的文件输入流类型
	 */
	public getFileInputs(): { ext: string, inputCls: any }[] {
		const lists: { ext: string, inputCls: any }[] = [];
		for (const ext in this.fileInputClsMap) {
			lists.push({
				ext: ext,
				inputCls: this.fileInputClsMap[ext]
			});
		}
		return lists;
	}
}
/**
 * 文件输入流注册器
 */
export const FileInputRegistry = new FileInputRegistryImpl();