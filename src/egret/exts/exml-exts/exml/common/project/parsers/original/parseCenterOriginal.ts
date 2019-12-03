import { Emitter, Event } from 'egret/base/common/event';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IFileService, FileChangesEvent, FileChangeType } from 'egret/platform/files/common/files';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import { ClassChangedEvent, IParseCenter } from '../parser';
import { isTs, isExml } from '../core/commons';
import URI from 'egret/base/common/uri';
import { TsParser } from '../core/tsParser';
import { ExmlParser, EUIParser, GUIParser } from '../core/exmlParser';
import { ClassNode } from '../../syntaxNodes';
import { isIgnore } from '../core/ignores';

/**
 * Ts解析中心，单进程版本
 */
export class ParseCenterOriginal implements IParseCenter {
	private readonly _onClassChanges: Emitter<ClassChangedEvent>;

	private tsParser: TsParser;
	protected exmlParser: ExmlParser;

	private properties: any = {};
	constructor(
		private propertiesPath: string,
		private uiLib: 'eui' | 'gui',
		@IInstantiationService private instantiationService: IInstantiationService,
		@IFileService private fileService: IFileService,
		@IWorkspaceService private workspaceService: IWorkspaceService
	) {
		this._onClassChanges = new Emitter<ClassChangedEvent>();
	}

	private inited:boolean = false;
	private initPromise:Promise<void> = null;
	/**
	 * 初始化完成
	 */
	public init(): Promise<void> {
		if(this.inited){
			return Promise.resolve(void 0);
		}else if(this.initPromise){
			return this.initPromise;
		}else{
			const initPormise = this.doInit().then(()=>{
				this.initPromise = null;
				this.inited = true;
			});
			this.initPromise = initPormise;
			return this.initPromise;
		}
	}

	private doInit(): Promise<void> {
		return this.initProperty(this.propertiesPath).then(propertiesMap => {
			this.properties = propertiesMap;
			this.tsParser = this.instantiationService.createInstance(TsParser);
			if (this.uiLib == 'eui') {
				this.exmlParser = this.instantiationService.createInstance(EUIParser, this.workspaceService.getWorkspace().uri);
			} else {
				this.exmlParser = this.instantiationService.createInstance(GUIParser, this.workspaceService.getWorkspace().uri);
			}
			this.fileService.onFileChanges(e => this.fileChanged_handler(e));
			return this.fileService.select(this.workspaceService.getWorkspace().uri, ['.exml', '.ts'], null,['node_modules','.git','.DS_Store']).then(fileStats => {
				for (let i = 0; i < fileStats.length; i++) {
					this.addFile(fileStats[i].resource);
				}
				this.doFilesChanged();
				console.log('ParseCenter Inited');
			});
		});
	}

	private fileChanged_handler(e: FileChangesEvent) {
		for (let i = 0; i < e.changes.length; i++) {
			const change = e.changes[i];
			if (change.type == FileChangeType.ADDED) {
				this.addFile(change.resource);
			} else if (change.type == FileChangeType.DELETED) {
				this.deleteFile(change.resource);
			} else if (change.type == FileChangeType.UPDATED) {
				this.updateFile(change.resource);
			}
		}
	}

	private initProperty(propertiesPath: string): Promise<any> {
		return new Promise<void>((resolve, reject) => {
			this.fileService.resolveContent(URI.file(propertiesPath)).then(stat => {
				let propertyMap: any = null;
				try {
					propertyMap = JSON.parse(stat.value);
				} catch (error) {
					reject(error);
					return;
				}
				resolve(propertyMap);
			}, err => {
				reject(err);
			});
		});
	}

	/**
	 * 类信息改变的时候
	 */
	public get onClassChanges(): Event<ClassChangedEvent> {
		return this._onClassChanges.event;
	}

	private tsAdds: string[] = [];
	private tsModifies: string[] = [];
	private tsDelete: string[] = [];

	private exmlAdds: string[] = [];
	private exmlModifies: string[] = [];
	private exmlDelete: string[] = [];
	private addFile(resource: URI): void {
		if(!resource){
			return;
		}
		if (isIgnore(resource.fsPath)) {
			return;
		}
		if (isTs(resource)) {
			var index = this.tsModifies.indexOf(resource.fsPath);
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
			var index = this.exmlModifies.indexOf(resource.fsPath);
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
			var index = this.tsModifies.indexOf(resource.fsPath);
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
			var index = this.exmlModifies.indexOf(resource.fsPath);
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
		}
	}
	private updateFile(resource: URI): void {
		if (isTs(resource)) {
			var index = this.tsModifies.indexOf(resource.fsPath);
			if (index === -1) {
				this.tsModifies.push(resource.fsPath);
			}
			this.fileChanged('ts');
		} else if (isExml(resource)) {
			var index = this.exmlModifies.indexOf(resource.fsPath);
			if (index === -1) {
				this.exmlModifies.push(resource.fsPath);
			}
			this.fileChanged('exml');
		}
	}

	private tsFileChanged: boolean = false;
	private exmlFileChanged: boolean = false;

	private fileChanged(type: string = ''): void {
		if (type === 'ts') {
			this.tsFileChanged = true;
		} else if (type === 'exml') {
			this.exmlFileChanged = true;
		}
		if (this.doFilesChangedStamp) {
			clearTimeout(this.doFilesChangedStamp);
		}
		this.doFilesChangedStamp = setTimeout(() => {
			this.doFilesChanged();
		}, 100);
	}

	private doFilesChangedStamp = null;
	private doFilesChanged(): void {
		if (this.doFilesChangedStamp) {
			clearTimeout(this.doFilesChangedStamp);
			this.doFilesChangedStamp = null;
		}
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
		this.fireClassChanged();
	}

	private fireClassChanged(): void {
		const event = new ClassChangedEvent();
		event.classMap = this.getClassNodeMap();
		event.skinNames = this.exmlParser.getAllSkinClassName();
		event.skinToPathMap = this.exmlParser.skinClassNameToPath;
		this._onClassChanges.fire(event);
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
			prop.available = this.getPropAvailable(fullClassName,prop.name,eumnData);
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

	private getPropAvailable(fullClassName:string,propName:string,eumnData:any):string[]{
		const extendsChains = this.getExtendsChain(fullClassName);
		for(let i = 0;i<extendsChains.length;i++){
			const curClassName = extendsChains[i].fullName;
			if (eumnData[curClassName] && eumnData[curClassName][propName]) {
				return eumnData[eumnData[curClassName][propName]];
			}
		}
		return [];
	}
}