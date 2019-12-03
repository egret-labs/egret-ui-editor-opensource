import { addClass } from 'egret/base/common/dom';
import { IDisposable } from 'egret/base/common/lifecycle';
import { IUIBase, getTargetElement } from './common';

import './media/dividelines.css';

/**
 * 分割线
 */
export class DivideLine implements IUIBase, IDisposable {

	private container: HTMLElement;
	protected el: HTMLElement;
	private tagText: HTMLDivElement;

	constructor(container: HTMLElement | IUIBase = null) {
		this.el = document.createElement('div');
		if(container){
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

	private _text:string = '';
	/** 显示的内容 */
	public get text():string{
		return this._text;
	}
	public set text(value:string){
		this._text = value;
		this.tagText.innerHTML = value;
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
		addClass(this.el, 'separator-label');
		this.el.style.display = 'flex';
		let line = document.createElement('div');
		line.className = 'line';
		this.el.appendChild(line);

		this.tagText = document.createElement('div');
		this.tagText.className = 'tagText';
		this.el.appendChild(this.tagText);

		line = document.createElement('div');
		line.className = 'line';
		this.el.appendChild(line);
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