import { endWith } from '../../../utils/strings';
import URI from 'egret/base/common/uri';
import { ClassNode } from '../../syntaxNodes';
import * as sax from '../../../sax/sax';
import * as xmlTagUtil from '../../../sax/xml-tagUtils';
import { Namespace } from '../../../sax/Namespace';

/**
 * 临时的ts类数据
 */
export interface TempClassData {
	/**
	 * 基类名
	 */
	baseNames: string[];
	/**
	 * 接口名
	 */
	implementedNames: string[];
	/**
	 * 类节点
	 */
	classNode: ClassNode;
}

/**
 * 判断是否是有效的ts文件
 * @param resource 
 */
export function isTs(resource: URI): boolean {
	if (!resource || !resource.fsPath) {
		return false;
	}
	if (
		endWith(resource.fsPath.toLocaleLowerCase(), '.ts') &&
		!endWith(resource.fsPath.toLocaleLowerCase(), '.exml.e.d.ts') &&
		!endWith(resource.fsPath.toLocaleLowerCase(), '.exml.g.d.ts')
	) {
		return true;
	}
	return false;
}
/**
 * 判断是否是有效的exml文件
 * @param resource 
 */
export function isExml(resource: URI): boolean {
	if (!resource || !resource.fsPath) {
		return false;
	}
	if (endWith(resource.fsPath.toLocaleLowerCase(), '.exml')) {
		return true;
	}
	return false;
}



/**
 * Eui项目中Wing工作空间的命名空间
 */
export var W_EUI: Namespace = new Namespace('w', 'http://ns.egret.com/wing');
/**
 * Gui项目中Wing工作空间的命名空间
 */
export var W_GUI: Namespace = new Namespace('w', 'http://ns.egret-labs.org/wing');
/**
 * Eui的命名空间
 */
export var EUI: Namespace = new Namespace('e', 'http://ns.egret.com/eui');
/**
 * Gui的命名空间
 */
export var GUI: Namespace = new Namespace('e', 'http://ns.egret-labs.org/egret');
/**
 * Tween的命名空间
 */
export var TWEEN: Namespace = new Namespace('tween', 'egret.tween.*');



/**
 * Exml皮肤的核心解析类
 */
export abstract class ExmlCoreParser {
	/**
	 * 得到基类的名字
	 * @param text 
	 */
	public getBaseClassName(text: string | sax.Tag): string {
		let exml: sax.Tag = null;
		if (text) {
			if (typeof text === 'string') {
				try {
					exml = xmlTagUtil.parse(text);
				} catch (error) { }
			} else {
				exml = text;
			}
		}
		if (!exml) {
			return null;
		}
		const superClass: string = this.getRootClassName(exml);
		return superClass;
	}
	private getRootClassName(node: sax.Tag): string {
		if (!node) {
			return '';
		}
		const name: string = node.localName;
		const ns: Namespace = new Namespace(node.prefix, node.namespace);
		let className: string = this.getClassName(name, ns);
		if (!className) {
			if (ns.uri === '*' || endWith(ns.uri, '.*')) {
				className = ns.uri.substring(0, ns.uri.length - 1) + name;
			}
		}
		return className;
	}

	protected abstract getBasicTypes(): string[];
	protected abstract getEgretClasses(): string[];
	/**
	 * 得到UI的命名空间
	 */
	public abstract getUINs(): Namespace;
	protected abstract getWorkNs(): Namespace;
	protected abstract getUIPrefix(): string;

	/**
	 * 通过tag得到类名
	 * @param node 
	 */
	public getClassName(node: sax.Tag): string;
	/**
	 * 通过类的短名和命名空间得到一个类的全名
	 * @param id 短名，如 com.test.classname 的短名为classname
	 * @param ns 类的命名空间
	 */
	public getClassName(id: string, ns: Namespace): string;
	public getClassName(arg1: any, arg2?: any): string {
		if (typeof arg1 == 'string') {
			const id: string = arg1;
			var ns: Namespace = arg2;
			if (ns.uri === EUI.uri) {
				if (id === 'Object') {
					return id;
				}
				if (this.getEgretClasses().indexOf(id) !== -1 && ns.uri === this.getUINs().uri) {
					return 'egret.' + id;
				}
			}
			var name: string = '';
			if (this.getBasicTypes().indexOf(id) !== -1) {
				return id;
			}
			if (ns.uri === this.getWorkNs().uri) {
			} else if (!ns || !ns.uri || (ns.uri === this.getUINs().uri)) {
				name = this.getUIPrefix() + id;
			} else {
				name = ns.uri.substring(0, ns.uri.length - 1) + id;
			}
			return name;
		} else {
			const node: sax.Tag = arg1;
			if (!node || typeof node != 'object') {
				return '';
			}
			var name: string = node.localName;
			var ns: Namespace = new Namespace(node.prefix, node.namespace);
			let className: string = this.getClassName(name, ns);
			if (!className) {
				if (ns.uri === '*' || endWith(ns.uri, '.*')) {
					className = ns.uri.substring(0, ns.uri.length - 1) + name;
				}
			}
			return className;
		}
	}
}

/**
 * Exml皮肤的核心解析类
 */
export class ExmlCoreParserEUI extends ExmlCoreParser {
	private static coreClasses: string[] = ['Point', 'Matrix', 'Rectangle'];
	private static basicTypes: string[] = ['Array', 'boolean', 'string', 'number'];
	protected getBasicTypes(): string[] {
		return ExmlCoreParserEUI.basicTypes;
	}
	protected getEgretClasses(): string[] {
		return ExmlCoreParserEUI.coreClasses;
	}
	protected getUIPrefix(): string {
		return 'eui.';
	}
	/**
	 * 得到UI的命名空间
	 */
	public getUINs(): Namespace {
		return EUI;
	}
	protected getWorkNs(): Namespace {
		return W_EUI;
	}
}

/**
 * Exml皮肤的核心解析类
 */
export class ExmlCoreParserGUI extends ExmlCoreParser {
	private static coreClasses: string[] = ['Point', 'Matrix', 'Rectangle'];
	private static basicTypes: string[] = ['void', 'any', 'number', 'string', 'boolean', 'Object', 'Array', 'Function'];
	protected getBasicTypes(): string[] {
		return ExmlCoreParserGUI.basicTypes;
	}
	protected getEgretClasses(): string[] {
		return ExmlCoreParserGUI.coreClasses;
	}
	protected getUIPrefix(): string {
		return 'egret.gui.';
	}
	/**
	 * 得到UI的命名空间
	 */
	public getUINs(): Namespace {
		return GUI;
	}
	protected getWorkNs(): Namespace {
		return W_GUI;
	}
}