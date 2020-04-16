import { Event } from 'egret/base/common/event';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { ClassNode } from '../syntaxNodes';
import { ParseCenterProcess } from './process/parseCenterProcess';
import { IDisposable } from 'egret/base/common/lifecycle';

export type ClassChangedType = 'ts' | 'exml' | 'mix';

/**
 * 类改变事件
 */
export class ClassChangedEvent {
	type: ClassChangedType;
	/**
	 * 类字典
	 */
	public classMap: { [fullName: string]: ClassNode } = {};
	/**
	 * 皮肤名列表
	 */
	public skinNames: string[] = [];
	/**
	 * 以皮肤名为key，皮肤文件路径为value的字典表。
	 */
	public skinToPathMap: { [className: string]: string } = {};
}


/**
 * 解析中心接口
 */
export interface IParseCenter extends IDisposable {
	/**
	 * 初始化完成
	 */
	init(): Promise<void>;
	/**
	 * 类改变事件
	 */
	readonly onClassChanges: Event<ClassChangedEvent>;
}



/**
 * 创建一个解析中心
 */
export function createParseCenter(instantiationService: IInstantiationService, propertiesPath: string, uiLib: 'eui' | 'gui'): IParseCenter {
	const center: IParseCenter = instantiationService.createInstance(ParseCenterProcess, propertiesPath, uiLib);
	center.init();
	return center;
}