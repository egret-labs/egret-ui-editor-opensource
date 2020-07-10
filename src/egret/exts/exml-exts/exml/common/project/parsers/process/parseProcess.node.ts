import { NodeProcess } from 'egret/base/parts/ipc/node/ipc.cp';
import { IParserProcess } from './parseProcess';
import { ClassNode } from '../../syntaxNodes';
import { TsParser } from '../core/tsParser';
import { ExmlParser, EUIParser, GUIParser } from '../core/exmlParser';
import URI from 'egret/base/common/uri';
import { ISelectedStat, FileChangeType, IFileChange } from 'egret/platform/files/common/files';
import { isTs, isExml } from '../core/commons';
import * as fs from 'fs';
import { isIgnore } from '../core/ignores';
import { ClassChangedType } from '../parser';
import * as fileUtils from 'egret/workbench/services/files/fileUtils';
import { isEqual, isEqualOrParent, normalize } from 'egret/base/common/paths';

class ParserProcess extends NodeProcess implements IParserProcess {
	private tsParser: TsParser;
	protected exmlParser: ExmlParser;

	private properties: any = {};
	private currentParsedFolders: string[] = [];

	/**
	 * 初始化
	 * @param propertiesPath 
	 */
	public initProcess(propertiesPath: string, uiLib: string, workspace: string, parseFolders: string[]): Promise<void> {
		this.currentParsedFolders = parseFolders;
		return this.initProperty(propertiesPath).then(propertiesMap => {
			this.properties = propertiesMap;
			this.tsParser = new TsParser();
			if (uiLib == 'eui') {
				this.exmlParser = new EUIParser(URI.file(workspace));
			} else {
				this.exmlParser = new GUIParser(URI.file(workspace));
			}
			let tasks: Promise<ISelectedStat[]>[] = [];
			for (const item of parseFolders) {
				tasks.push(this.getFiles(item));
			}
			return Promise.all(tasks).then((result) => {
				result.forEach(fileStats => {
					for (const stat of fileStats) {
						this.addFile(stat.resource);
					}
				});
				this.doFilesChanged('mix');
				console.log('ParserProcess Inited');
			});
			// return this.select(workspace, ['.exml', '.ts'], null, ['node_modules', '.git', '.DS_Store']).then(fileStats => {
			// 	for (let i = 0; i < fileStats.length; i++) {
			// 		this.addFile(fileStats[i].resource);
			// 	}
			// 	this.doFilesChanged('mix');
			// 	console.log('ParserProcess Inited');
			// });
		});
	}

	private getFiles(folder: string): Promise<ISelectedStat[]> {
		return this.select(folder, ['.exml', '.ts'], null, ['node_modules', '.git', '.DS_Store']);
	}

	/**
	 * 选择文件，这个方法是递归的
	 * @param resource 开始查找的文件
	 * @param exts 要查找的扩展名，如['.bmp','.txt']
	 * @param onSelected 每查到一个目标文件的时候调用
	 */
	private select(filePath: string, exts: string[], onSelected?: (stat: ISelectedStat) => void, ignores?: string[]): Promise<ISelectedStat[]> {
		return fileUtils.select(URI.file(filePath), exts, onSelected, ignores);
	}

	// 可能增加或移除同一个文件夹多次，此处只考虑增加的文件夹，对于移除的则不做处理
	public changeParseFolders(folders: string[]): Promise<void> {
		let newFolders: string[] = [];
		for (const item of folders) {
			if (!this.isFolderParsed(item)) {
				newFolders.push(item);
			}
		}
		if (newFolders.length > 0) {
			this.currentParsedFolders.push(...newFolders);
			let tasks: Promise<ISelectedStat[]>[] = [];
			for (const item of newFolders) {
				console.log('new parsed folder', item);
				tasks.push(this.getFiles(item));
			}
			return Promise.all(tasks).then((result) => {
				result.forEach(fileStats => {
					for (const stat of fileStats) {
						this.addFile(stat.resource);
					}
				});
				this.doFilesChanged('mix');
			});
		}
	}

	private isFolderParsed(folder: string): boolean {
		for (const item of this.currentParsedFolders) {
			if (isEqual(normalize(folder), normalize(item))) {
				return true;
			}
		}
		return false;
	}

	private shouldSkip(file: URI): boolean {
		for (const item of this.currentParsedFolders) {
			if (isEqualOrParent(normalize(file.fsPath), normalize(item))) {
				return false;
			}
		}
		return true;
	}

	/**
	 * 文件改变
	 * @param changes 
	 */
	public async onFileChanged(changes: IFileChange[]): Promise<void> {
		let actualChanges: IFileChange[] = [];
		for (const change of changes) {
			if(this.shouldSkip(change.resource)) {
				continue;
			}
			actualChanges.push(change);
		}
		for (const change of actualChanges) {
			if (change.type == FileChangeType.ADDED) {
				const fileStats = await this.getFiles(change.resource.fsPath);
				for (const stat of fileStats) {
					this.addFile(stat.resource);
				}
			} else if (change.type == FileChangeType.DELETED) {
				this.deleteFile(change.resource);
			} else if (change.type == FileChangeType.UPDATED) {
				this.updateFile(change.resource);
			}
		}
		let changeType: ClassChangedType = 'mix';
		if (actualChanges.length === 1) {
			const item = actualChanges[0];
			if (isTs(item.resource)) {
				changeType = 'ts';
			} else if (isExml(item.resource)) {
				changeType = 'exml';
			}
		}
		if (actualChanges.length > 0) {
			this.doFilesChanged(changeType);
		}
		return Promise.resolve(void 0);
	}

	private initProperty(propertiesPath: string): Promise<any> {
		return new Promise<void>((resolve, reject) => {

			fs.readFile(propertiesPath, { encoding: 'utf8' }, (err, data) => {
				if (err) {
					reject(err);
				} else {
					let propertyMap: any = null;
					try {
						propertyMap = JSON.parse(data);
					} catch (error) {
						reject(error);
						return;
					}
					resolve(propertyMap);
				}
			});
		});
	}

	private tsAdds: string[] = [];
	private tsModifies: string[] = [];
	private tsDelete: string[] = [];

	private exmlAdds: string[] = [];
	private exmlModifies: string[] = [];
	private exmlDelete: string[] = [];
	private addFile(resource: URI): void {
		if (!resource) {
			return;
		}
		if (isIgnore(resource.fsPath)) {
			return;
		}
		if (isTs(resource)) {
			let index = this.tsModifies.indexOf(resource.fsPath);
			if (index !== -1) {
				this.tsModifies.splice(index, 1);
			}
			index = this.tsDelete.indexOf(resource.fsPath);
			if (index !== -1) {
				this.tsDelete.splice(index, 1);
			}
			index = this.tsAdds.indexOf(resource.fsPath);
			if (index === -1) {
				this.tsAdds.push(resource.fsPath);
			}
			this.fileChanged('ts');
		} else if (isExml(resource)) {
			let index = this.exmlModifies.indexOf(resource.fsPath);
			if (index !== -1) {
				this.exmlModifies.splice(index, 1);
			}
			index = this.exmlDelete.indexOf(resource.fsPath);
			if (index !== -1) {
				this.exmlDelete.splice(index, 1);
			}
			index = this.exmlAdds.indexOf(resource.fsPath);
			if (index === -1) {
				this.exmlAdds.push(resource.fsPath);
			}
			this.fileChanged('exml');
		}
	}
	private deleteFile(resource: URI): void {
		if (isTs(resource)) {
			let index = this.tsModifies.indexOf(resource.fsPath);
			if (index !== -1) {
				this.tsModifies.splice(index, 1);
			}
			index = this.tsAdds.indexOf(resource.fsPath);
			if (index !== -1) {
				this.tsAdds.splice(index, 1);
			}
			index = this.tsDelete.indexOf(resource.fsPath);
			if (index === -1) {
				this.tsDelete.push(resource.fsPath);
			}
			this.fileChanged('ts');
		} else if (isExml(resource)) {
			let index = this.exmlModifies.indexOf(resource.fsPath);
			if (index !== -1) {
				this.exmlModifies.splice(index, 1);
			}
			index = this.exmlAdds.indexOf(resource.fsPath);
			if (index !== -1) {
				this.exmlAdds.splice(index, 1);
			}
			index = this.exmlDelete.indexOf(resource.fsPath);
			if (index === -1) {
				this.exmlDelete.push(resource.fsPath);
			}
			this.fileChanged('exml');
		} else {
			// 可能删除的是文件夹，同时通知ts和exml解析器删除
			let index = this.tsDelete.indexOf(resource.fsPath);
			if (index === -1) {
				this.tsDelete.push(resource.fsPath);
			}
			this.fileChanged('ts');
			index = this.exmlDelete.indexOf(resource.fsPath);
			if (index === -1) {
				this.exmlDelete.push(resource.fsPath);
			}
			this.fileChanged('exml');
		}
	}
	private updateFile(resource: URI): void {
		if (isTs(resource)) {
			let index = this.tsModifies.indexOf(resource.fsPath);
			if (index === -1) {
				this.tsModifies.push(resource.fsPath);
			}
			this.fileChanged('ts');
		} else if (isExml(resource)) {
			let index = this.exmlModifies.indexOf(resource.fsPath);
			if (index === -1) {
				this.exmlModifies.push(resource.fsPath);
			}
			this.fileChanged('exml');
		}
	}

	private tsFileChanged: boolean = false;
	private exmlFileChanged: boolean = false;

	private fileChanged(type: ClassChangedType): void {
		if (type === 'ts') {
			this.tsFileChanged = true;
		} else if (type === 'exml') {
			this.exmlFileChanged = true;
		}
	}

	private doFilesChanged(type: ClassChangedType): void {
		if (this.tsFileChanged) {
			this.tsParser.fileChanged(this.tsAdds, this.tsModifies, this.tsDelete);
			this.tsAdds = [];
			this.tsModifies = [];
			this.tsDelete = [];
		}
		if (this.exmlFileChanged) {
			this.exmlParser.fileChanged(this.exmlAdds, this.exmlModifies, this.exmlDelete);
			this.exmlAdds = [];
			this.exmlModifies = [];
			this.exmlDelete = [];
		}
		this.exmlFileChanged = false;
		this.tsFileChanged = false;
		this.currentStamp = process.uptime();
		this.fireClassChanged(type);
		//TODO fuck
	}

	private fireClassChanged(type: ClassChangedType): void {
		const classMap: { [fullName: string]: ClassNode } = this.getClassNodeMap();
		const classDataMap = {};
		for (const fullName in classMap) {
			const classNode = classMap[fullName];
			const implementeds: string[] = [];
			for (let j = 0; j < classNode.implementeds.length; j++) {
				implementeds.push(classNode.implementeds[j].fullName);
			}
			const newClassData = {
				'inEngine': classNode.inEngine,
				'inPrompt': classNode.inPrompt,
				'fullName': classNode.fullName,
				'baseClass': classNode.baseClass ? classNode.baseClass.fullName : '',
				'implementeds': implementeds,
				'props': classNode.props,
				'isInterface': classNode.isInterface
			};
			classDataMap[fullName] = newClassData;
		}
		const allSkins = this.exmlParser.getAllSkinClassName();
		const skinClassNameToPath = this.exmlParser.skinClassNameToPath;
		this.send('classChanged', {
			type, classDataMap, allSkins, skinClassNameToPath
		});
	}

	private currentStamp: number = -1;
	private cacheStamp: number = -1;
	private _classNodeMap: { [fullName: string]: ClassNode } = {};
	/**
	 * 得到类的数据
	 */
	private getClassNodeMap(): { [fullName: string]: ClassNode } {
		if (this.currentStamp !== this.cacheStamp) {
			this._classNodeMap = {};
			const tsClassDataMap = this.tsParser.getClassDataMap();
			const exmlClassDataMap = this.exmlParser.getClassDataMap();
			const classNodes: ClassNode[] = [];
			for (var className in tsClassDataMap) {
				var classNode: ClassNode = tsClassDataMap[className].classNode;
				var baseNames: string[] = tsClassDataMap[className].baseNames;
				const implementedNames: string[] = tsClassDataMap[className].implementedNames;
				for (var i = 0; i < baseNames.length; i++) {
					var baseClass = tsClassDataMap[baseNames[i]];
					var baseClassNode = baseClass ? baseClass.classNode : null;
					if (baseClassNode) {
						classNode.baseClass = baseClassNode;
					}
				}
				for (var i = 0; i < implementedNames.length; i++) {
					const interfaceClass = tsClassDataMap[implementedNames[i]];
					const interfaceClassNode = interfaceClass ? interfaceClass.classNode : null;
					if (interfaceClassNode) {
						classNode.implementeds.push(interfaceClassNode);
					}
				}
				classNodes.push(classNode);
			}
			for (var className in exmlClassDataMap) {
				var baseNames = exmlClassDataMap[className].baseNames;
				var classNode = exmlClassDataMap[className].classNode;
				for (var i = 0; i < baseNames.length; i++) {
					var baseClass = tsClassDataMap[baseNames[i]];
					var baseClassNode = baseClass ? baseClass.classNode : null;
					if (baseClass) {
						classNode.baseClass = baseClassNode;
					}
					classNodes.push(classNode);
				}
			}
			for (var i = 0; i < classNodes.length; i++) {
				this._classNodeMap[classNodes[i].fullName] = classNodes[i];
			}
			this.cacheStamp = this.currentStamp;
			for (var className in tsClassDataMap) {
				var classNode = this._classNodeMap[className];
				this.parseAvailableProps(classNode);
			}
		}
		return this._classNodeMap;
	}
	private parseAvailableProps(classNode: ClassNode): void {
		const eumnData = this.properties ? this.properties['eumn'] : null;
		if (!eumnData) {
			return;
		}
		const fullClassName: string = classNode.fullName;
		for (let i = 0; i < classNode.props.length; i++) {
			const prop = classNode.props[i];
			prop.available = this.getPropAvailable(fullClassName, prop.name, eumnData);
		}
	}
	/**
	 * 得到一个类的继承连
	 * @param className 
	 */
	private getExtendsChain(className: string): ClassNode[] {
		const arr: ClassNode[] = [];
		let currentClassNode = this._classNodeMap[className];
		while (true) {
			if (!currentClassNode) {
				break;
			}
			arr.push(currentClassNode);
			currentClassNode = currentClassNode.baseClass;
		}
		return arr;
	}
	private getPropAvailable(fullClassName: string, propName: string, eumnData: any): string[] {
		const extendsChains = this.getExtendsChain(fullClassName);
		for (let i = 0; i < extendsChains.length; i++) {
			const curClassName = extendsChains[i].fullName;
			if (eumnData[curClassName] && eumnData[curClassName][propName]) {
				return eumnData[eumnData[curClassName][propName]];
			}
		}
		return [];
	}

	public dispose(): void {
		console.log('ParserProcess Disposed');
		if (this.tsParser) {
			this.tsParser.dispose();
			this.tsParser = null;
		}
	}
}


new ParserProcess();