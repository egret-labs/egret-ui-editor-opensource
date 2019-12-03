import { IExmlModel, SelectedListChangedEvent } from 'egret/exts/exml-exts/exml/common/exml/models';
import { INode, TreeChangedEvent, TreeChangedKind } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { IDisposable } from 'vs/base/commo/lifecycle';
import { Emitter, Event } from 'egret/base/common/event';
import { dispose } from 'egret/base/common/lifecycle';

/**
 * ExmlModel属性自动刷新的监听助手
 */
export class AutoRefreshHelper implements IDisposable{

	private _relateProps:string[] = [];
	private _onChanged:Emitter<INode[]>;

	private toDisposes: IDisposable[] = [];

	constructor(relateProps:string[]){
		this._relateProps = relateProps;
		this._onChanged = new Emitter<INode[]>();
	}

	/**
	 * 选择节点或指定属性发生了改变事件
	 */
	public get onChanged():Event<INode[]>{
		return this._onChanged.event;
	}

	private _model: IExmlModel;
	/**
	 * 数据模型
	 */
	public get model(): IExmlModel {
		return this._model;
	}
	public set model(value: IExmlModel) {
		if (this._model === value) {
			return;
		}
		dispose(this.toDisposes);
		this._model = value;
		if (this._model) {
			this.toDisposes.push(this._model.onTreeChanged(e=>this.treeChanged_handler(e)));
			this.toDisposes.push(this._model.onSelectedListChanged(e=>this.selectedListChanged_handler(e)));
			this.toDisposes.push(this._model.onStateChanged(e=>this.selectedListChanged_handler(e)));
		}
		this.selectedListChanged_handler();
	}

	private treeChanged_handler(e:TreeChangedEvent):void{
		if(!e.value){
			return;
		}
		if(e.kind == TreeChangedKind.ADD) {
			this.refresh();
		}else if(!this._relateProps || this._relateProps.indexOf(e.property as string) !== -1){
			this.refresh();
		}
	}
	private selectedListChanged_handler(e:SelectedListChangedEvent = null):void{
		this.refresh();
	}

	private refreshing:boolean = false;
	private refresh():void{
		if(this.refreshing){
			return;
		}
		this.refreshing = true;
		setTimeout(() => {
			this.refreshing = false;
			this.doRefresh();
		}, 100);
	}

	private doRefresh():void{
		if(this._model){
			this._onChanged.fire(this._model.getSelectedNodes());
		}else{
			this._onChanged.fire([]);
		}
	}

	/**
	 * 释放
	 */
	public dispose():void{
		dispose(this.toDisposes);
		this._model = null;
	}
}