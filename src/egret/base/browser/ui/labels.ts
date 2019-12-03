import { IDisposable } from 'egret/base/common/lifecycle';
import { addClass } from 'egret/base/common/dom';
import { IUIBase, getTargetElement } from './common';

import './media/labels.css';

/**
 * 标签
 */
export class Label implements IUIBase, IDisposable {

	private container: HTMLElement;
	protected el: HTMLSpanElement;
	constructor(container: HTMLElement | IUIBase = null) {
		this.el = document.createElement('span');
		this.height = 22;
		this.fontSize = 13;
		
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
	 * 样式
	 */
	public get style(): CSSStyleDeclaration {
		return this.el.style;
	}

	private _text: string = '';
	/**
	 * 标签内容
	 */
	public get text(): string {
		return this._text;
	}
	public set text(value: string) {
		this._text = value;
		this.el.innerText = value;
	}

	/**
	 * 显示
	 */
	public get visible(): boolean {
		return !this.el.hidden;
	}
	public set visible(value: boolean) {
		this.el.hidden = !value;
	}

	private _height: number = 0;
	/**
	 * 标签高度
	 */
	public get height(): number {
		return this._height;
	}
	public set height(value: number) {
		this._height = value;
		this.el.style.lineHeight = value + 'px';
	}
	private _autoWrap:boolean = false;
	/**
	 * 自动换行
	 */
	public get autoWrap():boolean{
		return this._autoWrap;
	}
	public set autoWrap(value:boolean){
		this._autoWrap = value;
		if(this._autoWrap){
			this.el.style.whiteSpace = 'normal';
		}else{
			this.el.style.whiteSpace = 'nowrap';
		}
	}

	private _paddingHorizontal: number = 0;
	/**
	 * 水平边距
	 */
	public get paddingHorizontal(): number {
		return this._paddingHorizontal;
	}
	public set paddingHorizontal(value: number) {
		this._paddingHorizontal = value;
		this.el.style.paddingLeft = value + 'px';
		this.el.style.paddingRight = value + 'px';
	}

	private _paddingVertical: number = 0;
	/**
	 * 竖直边距
	 */
	public get paddingVertical(): number {
		return this._paddingVertical;
	}
	public set paddingVertical(value: number) {
		this._paddingVertical = value;
		this.el.style.paddingTop = value + 'px';
		this.el.style.paddingBottom = value + 'px';
	}

	private _fontSize: number = 13;
	/**
	 * 字号
	 */
	public get fontSize(): number {
		return this._fontSize;
	}
	public set fontSize(value: number) {
		this._fontSize = value;
		this.el.style.fontSize = value + 'px';
	}

	/**
	 * 初始化内容
	 * @param element 
	 */
	protected initView(): void {
		addClass(this.el, 'egret-label');
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		this.el.remove();
		this.container = null;
	}
}