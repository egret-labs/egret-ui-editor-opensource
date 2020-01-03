import { DataSource, AccordionGroup } from 'egret/base/browser/ui/accordionGroup';
import { IUIBase } from 'egret/base/browser/ui/common';
import { AutoRefreshHelper } from '../../../common/autoRefreshers';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';

/**
 * 属性详情部件接口
 */
export interface IPropertyDetailPart extends DataSource {

}

/**
 * 属性详情部件基类
 */
export abstract class PropertyBasePart implements IPropertyDetailPart, IDisposable {

	protected toDisposes: IDisposable[] = [];

	private autoRefresher: AutoRefreshHelper;
	private root: HTMLElement;
	protected owner: AccordionGroup;
	constructor(owner: AccordionGroup) {
		this.owner = owner;
		this.root = document.createElement('div');
	}

	protected init(id: string, label: string, relateProps: string[], autoRefresh: boolean = true): void {
		this.render(this.root);
		this._id = id;
		this._label = label;
		if (autoRefresh) {
			this.autoRefresher = new AutoRefreshHelper(relateProps);
			this.toDisposes.push(this.autoRefresher.onChanged(e => this.relatePropsChanged_handler(e)));
			this.relatePropsChanged_handler([]);
		}
	}

	private _label: string;
	/**
	 * 显示标签
	 */
	public get label(): string {
		return this._label;
	}

	private _id: string;
	/**
	 * 唯一标志
	 */
	public get id(): string {
		return this._id;
	}
	/**
	 * 内容
	 */
	public get content(): IUIBase | HTMLElement {
		return this.root;
	}

	private _model: IExmlModel;
	/**
	 * 选中的IExmlModel
	 */
	public get model(): IExmlModel {
		return this._model;
	}
	public set model(value: IExmlModel) {
		this.doSetModel(value);
	}

	protected doSetModel(value: IExmlModel): void {
		this._model = value;
		if (this.autoRefresher) {
			this.autoRefresher.model = this._model;
		}
		if (this._model) {
			this.relatePropsChanged_handler(this._model.getSelectedNodes());
		} else {
			this.relatePropsChanged_handler([]);
		}
	}
	/**
	 * 关联的属性发生了改变
	 * @param nodes 
	 */
	protected abstract relatePropsChanged_handler(nodes: INode[]): void;
	/**
	 * 渲染
	 * @param container 
	 */
	protected abstract render(container: HTMLElement): void;


	/**
	 * 释放
	 */
	public dispose(): void {
		dispose(this.toDisposes);
	}
}