import * as sax from '../../../sax/sax';
import * as xmlTagUtil from '../../../sax/xml-tagUtils';
import * as paths from 'path';
import * as fs from 'fs';
import URI from 'egret/base/common/uri';
import { TempClassData, ExmlCoreParser, ExmlCoreParserEUI, ExmlCoreParserGUI } from './commons';
import { ClassNode } from '../../syntaxNodes';
import { endWith } from '../../../utils/strings';
import { isEqualOrParent, normalize } from 'egret/base/common/paths';

/**
 * Exml文件解析器
 */
export class ExmlParser {
	protected coreParser: ExmlCoreParser;
	constructor(private project: URI) {
	}
	protected get src(): URI {
		const srcPath = paths.join(this.project.fsPath, 'src');
		return URI.file(srcPath);
	}

	private _skinClassNameToPath: { [className: string]: string } = {};
	/**
	 * 皮肤和路径的对应关系
	 */
	public get skinClassNameToPath(): { [className: string]: string } {
		return this._skinClassNameToPath;
	}
	private pathToClassData: { [path: string]: { className: string, baseName: string, shortUrl: string } } = {};
	private tempClassDataMap: { [className: string]: TempClassData } = {};
	/**
	 * 文件变化
	 * @param adds 
	 * @param modifies 
	 * @param deletes 
	 */
	public fileChanged(adds: string[], modifies: string[], deletes: string[]): void {
		const mPaths: string[] = modifies;
		const dPaths: string[] = deletes;
		const cPaths: string[] = adds;
		
		//delete
		for (const key in this.pathToClassData) {
			for (const dp of dPaths) {
				if (isEqualOrParent(normalize(key), normalize(dp))) {
					delete this.pathToClassData[key];
				}
			}
		}
		//added and modify
		const newPaths: string[] = cPaths.concat(mPaths);
		for (let i = 0; i < newPaths.length; i++) {
			const path = newPaths[i];
			if (!fs.existsSync(path)) {
				continue;
			}
			const content = fs.readFileSync(path, 'utf8');
			let contentTag: sax.Tag = null;
			try {
				contentTag = xmlTagUtil.parse(content);
			} catch (error) { }
			const className = this.parseExmlClassName(path, contentTag);
			const shortUrl = this.path2relative(path);
			const baseClassName = this.coreParser.getBaseClassName(contentTag);
			this.pathToClassData[path] = {
				className: className,
				baseName: baseClassName,
				shortUrl: shortUrl
			};
		}
		this.tempClassDataMap = {};
		this._skinClassNameToPath = {};
		//sum
		for (let path in this.pathToClassData) {
			const currentClassData = this.pathToClassData[path];
			const baseClassName = currentClassData.baseName;
			const className = currentClassData.className;
			const shortUrl = currentClassData.shortUrl;
			if (className) {
				this._skinClassNameToPath[className] = path;
			} else {
				this._skinClassNameToPath[shortUrl] = path;
			}
			if (className) {
				const classNode = new ClassNode();
				classNode.fullName = className;
				const tempClassData: TempClassData = {
					baseNames: [baseClassName],
					implementedNames: [],
					classNode: classNode
				};
				this.tempClassDataMap[className] = tempClassData;
			}
		}
	}

	/**
	 * 得到类数据
	 */
	public getClassDataMap(): { [className: string]: TempClassData } {
		return this.tempClassDataMap;
	}

	private path2relative(path: string): string {
		const index = path.indexOf(this.project.fsPath);
		if (index === 0) {
			return path.substring(this.project.fsPath.length);
		} else {
			return '';
		}
	}

	protected parseExmlClassName(filePath: string, content: string | sax.Tag): string {
		return '';
	}

	/**
	 * 得到所有的皮肤列表
	 */
	public getAllSkinClassName(): string[] {
		const array: string[] = [];
		for (const skinClassName in this._skinClassNameToPath) {
			if (!endWith(skinClassName.toLowerCase(), '.exml')) {
				array.push(skinClassName);
			}
		}
		array.sort();
		return array;
	}

	/**
	 * 通过类名得到exml的路径
	 * @param className 
	 */
	public getExmlPath(className: string): string {
		if (!className) {
			return null;
		}
		if (endWith(className.toLowerCase(), '.exml')) {
			return paths.join(this.project.fsPath, className);
		}
		return this._skinClassNameToPath[className];
	}
}
/**
 * EUI的exml解析器
 */
export class EUIParser extends ExmlParser {
	constructor(project: URI) {
		super(project);
		this.coreParser = new ExmlCoreParserEUI();
	}
	protected parseExmlClassName(filePath: string, content: string | sax.Tag): string {
		if (!content) {
			return '';
		}
		try {
			let exml: sax.Tag;
			if (typeof content === 'string') {
				exml = xmlTagUtil.parse(content);
			} else {
				exml = content;
			}
			const className: string = exml.attributes['class'];
			if (className) {
				return className;
			}
			return '';
		}
		catch (error) {
		}
		return '';
	}
}

/**
 * GUI的exml解析器
 */
export class GUIParser extends ExmlParser {
	constructor(project: URI) {
		super(project);
		this.coreParser = new ExmlCoreParserGUI();
	}

	protected parseExmlClassName(filePath: string, content: string | sax.Tag): string {
		filePath = paths.normalize(filePath);
		let srcPath = paths.normalize(this.src.fsPath);
		filePath = filePath.toLocaleLowerCase();
		srcPath = srcPath.toLocaleLowerCase();

		let className: string = '';
		if (filePath.substring(0, srcPath.length) === srcPath) {
			className = filePath.substring(srcPath.length, filePath.length - 5);
			className = className.split('\\').join('.');
			className = className.split('/').join('.');
		}
		return className;
	}
}