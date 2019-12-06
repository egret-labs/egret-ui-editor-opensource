import { Event } from 'egret/base/common/event';
import URI from 'egret/base/common/uri';
import { IFileStat } from 'egret/platform/files/common/files';

/**
 * 一个编辑器的数据层基础接口
 */
export interface IEditorModel {
	/**
	 * 当model释放的时候派发
	 */
	onDispose: Event<void>;
	/**
	 * 重新加载
	 */
	reload():Promise<IEditorModel>;
	/**
	 * 加载model
	 */
	load(): Promise<IEditorModel>;
	/**
	 * 释放
	 */
	dispose(): void;
	/**
	 * 是否已经释放
	 */
	isDisposed(): boolean;
}

/**
 * 状态改变
 */
export enum StateChange {
	/** 脏改变 */
	DIRTY,
	/** 保存中 */
	SAVING,
	/** 保存失败 */
	SAVE_ERROR,
	/** 保存完成 */
	SAVED,
	/** 内容改变 */
	CONTENT_CHANGE
}

/**
 * 模块内部数据模块
 */
export interface IInnerModel{
}


/**
 * 一个文件编辑器的数据层基础接口
 */
export interface IFileEditorModel extends IEditorModel {
	/**
	 * 状态改变事件
	 */
	readonly onDidStateChange: Event<StateChange>;
	/**
	 * 文件被修改事件
	 */
	readonly onFileDiskUpdate: Event<IFileEditorModel>;
	/**
	 * 文件删除事件
	 */
	readonly onFileRemove:Event<IFileStat>;

	/**
	 * 文件被修改事件
	 */
	readonly onFileDiskUpdateDirty: Event<IFileStat>;
	/**
	 * 文件删除事件
	 */
	readonly onFileRemoveDirty:Event<IFileStat>;


	/** 
	 * 得到内部数据模块，在执行加载之后可以得到其数据 
	 */
	getModel(): IInnerModel;
	/**
	 * 当前model对应的资源
	 */
	getResource(): URI;
	/**
	 * 加载当前的数据模块
	 * @param focus 是否强制加载，忽视脏等属性
	 */
	load(focus?:boolean): Promise<IFileEditorModel>;
	/**
	 * 保存当前数据模块
	 */
	save(): Promise<void>;
	/**
	 * 另存为当前数据模块
	 */
	saveAs(resource:URI): Promise<void>;
	/**
	 * 当前模块是否脏了
	 */
	isDirty(): boolean;
	/**
	 * 立即检查模块是否脏了
	 */
	updateDirty(): void;
	/**
	 * 这个数据model是否已经被加载过
	 */
	isResolved(): boolean;
	/**
	 * 是否可以撤销
	 */
	getCanUndo(): boolean;
	/**
	 * 撤销
	 */
	undo():void;
	/**
	 * 是否可以重做
	 */
	getCanRedo(): boolean;
	/**
	 * 重做
	 */
	redo():void;


}



/**
 * 文件数据模块改变事件
 */
export class FileModelChangeEvent {
	private _resource: URI;
	private _kind: StateChange;

	constructor(model: IFileEditorModel, kind: StateChange) {
		this._resource = model.getResource();
		this._kind = kind;
	}
	/**
	 * 资源路径
	 */
	public get resource(): URI {
		return this._resource;
	}
	/**
	 * 改变类型
	 */
	public get kind(): StateChange {
		return this._kind;
	}
}