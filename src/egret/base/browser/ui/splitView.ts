import { addClass } from 'egret/base/common/dom';
import { IDisposable } from 'egret/base/common/lifecycle';
import { IUIBase, getTargetElement } from './common';

import './media/split.css';
import { HGroup } from 'egret/base/browser/ui/containers';
import { Label } from './labels';

/**
 * 分割线
 */
export class SplitView implements IUIBase, IDisposable {

	private container: HTMLElement;
	protected el: HTMLElement;

	constructor(container: HTMLElement | IUIBase = null) {
		this.el = document.createElement('div');
		if (container) {
			this.create(container);
		}
	}

	/**
	 * 创建
	 * @param container 
	 */
	public create(container: HTMLElement | IUIBase): void {
		this.container = getTargetElement(container);
		this.container.appendChild(this.el);
		this.initView();
	}

	/**
	 * 核心dom对象
	 */
	public getElement(): HTMLElement {
		return this.el;
	}

	/**
	 * 设置是否隐藏
	 */
	public setHidden(_isHidden: boolean) {
		this.el.style.display = _isHidden ? 'none' : 'flex';
	}


	/**
	 * 初始化内容
	 * @param element 
	 */
	protected initView(): void {
		const collapse = new Collapse(this.el);
	}


	/**
	 * 样式
	 */
	public get style(): CSSStyleDeclaration {
		return this.el.style;
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.el.remove();
		this.container = null;
	}

}

class Header implements IUIBase, IDisposable {

	protected el: HTMLElement;

	private container: HTMLElement;

	private _opened: boolean = false;

	private arrow: HTMLDivElement;

	public clickFun: Function;

	constructor(container: IUIBase | HTMLElement) {
		this.el = document.createElement('div');
		if (container) {
			this.create(container);
		}
	}

	dispose(): void {

	}

	getElement(): HTMLElement {
		return this.el;
	}

	create(container: IUIBase | HTMLElement): void {

		this.container = getTargetElement(container);
		const top = document.createElement('div');

		top.style.border = '0';
		top.style.borderBottom = '1px solid #282828';
		this.container.appendChild(this.el);
		this.el.appendChild(top);
		const group = new HGroup(top);
		this.arrow = document.createElement('div');
		this.arrow.className = 'test-icon-button';
		this.arrow.style.height = this.arrow.style.width = '16px';
		group.getElement().appendChild(this.arrow);

		const label = new Label(group.getElement());
		label.text = 'asssss';

		group.getElement().addEventListener('click', this.arrowClick);
	}

	arrowClick = () => {
		if (this.clickFun) {
			this._opened = !this._opened;
			this.clickFun(this._opened);
			if (this._opened) {
				this.arrow.style.transform = 'rotate(90deg)';
			} else {
				this.arrow.style.transform = 'rotate(0deg)';
			}
		}
	}
}
/**
 * 折叠面板
 */
export class Collapse implements IUIBase, IDisposable {

	private container: HTMLElement;
	protected el: HTMLElement;
	private tagText: HTMLDivElement;

	private _opened: boolean = false;

	private body: HTMLElement;

	constructor(container: HTMLElement | IUIBase = null) {
		this.el = document.createElement('div');
		if (container) {
			this.create(container);
		}
	}

	/**
	 * 创建
	 * @param container 
	 */
	public create(container: HTMLElement | IUIBase): void {
		this.container = getTargetElement(container);
		this.container.appendChild(this.el);
		this.initView();
	}

	/**
	 * 核心dom对象
	 */
	public getElement(): HTMLElement {
		return this.el;
	}

	/**
	 * 设置是否隐藏
	 */
	public setHidden(_isHidden: boolean) {
		this.el.style.display = _isHidden ? 'none' : 'flex';
	}

	/**
	 * 更新文本
	 */
	public updateTxt(_tagTxt): void {
		this.tagText.innerHTML = _tagTxt;
	}
	/**
	 * 初始化内容
	 * @param element 
	 */
	protected initView(): void {
		const top = document.createElement('div');
		this.el.appendChild(top);

		this.body = document.createElement('div');
		this.el.appendChild(this.body);

		this.initHeader(top);
		this.initBody();
	}

	private header: Header;
	private initHeader(top: HTMLDivElement): void {
		this.header = new Header(top);
		this.header.clickFun = this.arrowClick;
	}

	private arrowClick = () => {
		this._opened = !this._opened;
		console.log('打开or关闭: ', this._opened);
		this.initBody();
	}

	private initBody(): void {
		if (this._opened) {
			this.body.style.display = 'black';
			this.body.style.height = '100px';
		} else {
			this.body.style.display = 'black';
			this.body.style.height = '0px';
		}
	}

	private set opened(_on: boolean) {
		this._opened = _on;
	}

	/**
	 * 样式
	 */
	public get style(): CSSStyleDeclaration {
		return this.el.style;
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.el.remove();
		this.container = null;
	}

}
