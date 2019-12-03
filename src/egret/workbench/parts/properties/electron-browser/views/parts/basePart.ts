import { IUIBase, getTargetElement } from 'egret/base/browser/ui/common';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { AccordionGroup } from 'egret/base/browser/ui/accordionGroup';

/**
 * 样式属性中的不同部分基类
 */
export abstract class BasePart implements IUIBase,IDisposable{
	private el: HTMLElement;
	private container: HTMLElement;
	protected toDisposes:IDisposable[];

	constructor(container: HTMLElement | IUIBase = null) {
		this.el = document.createElement('div');
		this.toDisposes = [];
		if (container) {
			this.create(container);
		}
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

	protected doSetModel(value: IExmlModel):void{
		this._model = value;
	}
	/**
	 * 关联的属性发生了改变
	 * @param nodes 
	 */
	public abstract doRelatePropsChanged(nodes:INode[]):void;

	/**
	 * 核心dom对象
	 */
	public getElement(): HTMLElement {
		return this.el;
	}

	/**
	 * 创建
	 * @param container 
	 */
	public create(container: HTMLElement | IUIBase): void {
		this.container = getTargetElement(container);
		this.render(this.el);
		this.container.appendChild(this.el);
		this.hide();
	}

	/**
	 * 渲染
	 * @param el 
	 */
	protected abstract render(el:HTMLElement):void;

	/**
	 * 释放
	 */
	public dispose(): void {
		this.el.remove();
		this.container = null;
		dispose(this.toDisposes);
	}

	/**
	 * 隐藏
	 */
	public hide():void{
		this.el.style.display = 'none';
	}
	/**
	 * 显示
	 */
	public show():void{
		this.el.style.display = 'flex';
	}
}