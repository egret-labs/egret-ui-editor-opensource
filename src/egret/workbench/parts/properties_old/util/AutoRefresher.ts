import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { INode, TreeChangedEvent, TreeChangedKind } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { IDisposable } from 'vs/base/common/lifecycle';
// extends InvalidteEventDispatcher
/**
 * IExmlModel的监听包装器。当相关联的属性发生改变或者选择项改变时自动回调指定的函数。
 */

export class AutoRefresher {
	/**
	 * 构造函数
	 * @param relateProperties 要触发回调的相关联属性名列表,传入null则监听所有属性的改变
	 * @param callBack 要触发回调函数引用,示例：refreshAll(list:Vector.<ENode>)
	 */
	constructor(relateProperties: string[], callBack: (list: INode[]) => void, private refreshInAnimationMode?: boolean) {

		// super(stage);
		this.relateProperties = relateProperties;
		this.callBack = callBack;
	}

	private _model: IExmlModel;

	private _dispose: Array<IDisposable> = [];

	/**
	 * 获得exmlmodel
	 */
	public get model(): IExmlModel {
		return this._model;
	}

	public set model(value: IExmlModel) {
		if (this._model === value) {
			return;
		}
		if (this._model) {
			this._dispose.forEach(element => {
				element.dispose();
			});
			this._dispose = [];
		}
		this._model = value;
		if (this._model) {
			this._dispose.push(this._model.onTreeChanged(this.onDTreeChanged));
			this._dispose.push(this._model.onSelectedListChanged(this.onSelectedNodeChange));
			this._dispose.push(this._model.onStateChanged(this.onSelectedNodeChange));
		}
		this.onSelectedNodeChange();
	}
	/**
	 * 需要触发刷新的属性名列表。
	 */
	private relateProperties = [];
	/**
	 * 回调函数
	 */
	public callBack: Function;
	/**
	 * 需要刷新面板的标志
	 */
	private needRefreshFlag = false;
	/**
	 * 正在更新属性值的标志,防止重复刷新。
	 */
	public isUpdating = false;
	/**
	 * 属性发生改变
	 */
	private onDTreeChanged = (event: TreeChangedEvent): void => {
		if (this.isUpdating || !event.value) {
			return;
		}
		if (event.kind === TreeChangedKind.ADD) {
			this.needRefreshFlag = true;
			// this.invalidateProperties();
			this.commitProperties();
		}
		if (!this.relateProperties || this.relateProperties.indexOf(event.property) !== -1) {
			this.needRefreshFlag = true;
			this.commitProperties();
		}
	}
	/**
	 * 选中项发生改变
	 */
	private onSelectedNodeChange = (event: egret.Event = null): void => {
		this.needRefreshFlag = true;
		this.commitProperties();
	}


	// 刷新
	private commitProperties = (): void => {
		// super.commitProperties();
		if (this.needRefreshFlag) {
			if (this.callBack !== null) {
				if (this._model) {
					// don't refresh in animation mode
					if (this.refreshInAnimationMode || !this._model.getAnimationModel().getEnabled()) {
						let list: INode[];
						list = this._model.getSelectedNodes();
						this.callBack(list);
					}
				} else {
					this.callBack([]);
				}
			}
			this.needRefreshFlag = false;
		}

	}

	/**
	 * 释放资源
	 */
	public destory(): void {
		if (this._model) {
			this._dispose.forEach(element => {
				element.dispose();
			});
			this._dispose = null;
			this._model = null;
		}
	}
}