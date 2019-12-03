import { IUIBase, getTargetElement } from './common';
import { IDisposable } from '../../common/lifecycle';
import { addClass } from '../../common/dom';
import { Label } from './labels';

import './media/containers.css';


/**
 * 横向容器
 */
export class HGroup implements IUIBase, IDisposable {

	protected el: HTMLElement;
	private container: HTMLElement;
	constructor(container: HTMLElement | IUIBase = null) {
		this.el = document.createElement('div');
		if (container) {
			this.create(container);
		}

	}
	/**
	 * 样式
	 */
	public get style(): CSSStyleDeclaration {
		return this.el.style;
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


	/**
	 * 创建
	 * @param container 
	 */
	public create(container: HTMLElement | IUIBase): void {
		addClass(this.el, 'egret-h-group');
		this.container = getTargetElement(container);
		this.container.appendChild(this.el);
	}


	/**
	 * 核心dom对象
	 */
	public getElement(): HTMLElement {
		return this.el;
	}
	/**
	 * 清除所有内容
	 */
	public removeChildren():void{
		this.el.innerHTML = '';
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		this.el.remove();
		this.container = null;
	}
}


/**
 * 纵向容器
 */
export class VGroup implements IUIBase, IDisposable {

	protected el: HTMLElement;
	private container: HTMLElement;
	constructor(container: HTMLElement | IUIBase = null) {
		this.el = document.createElement('div');
		if (container) {
			this.create(container);
		}
	}
	/**
	 * 样式
	 */
	public get style(): CSSStyleDeclaration {
		return this.el.style;
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

	/**
	 * 创建
	 * @param container 
	 */
	public create(container: HTMLElement | IUIBase): void {
		addClass(this.el, 'egret-v-group');
		this.container = getTargetElement(container);
		this.container.appendChild(this.el);
	}
	/**
	 * 核心dom对象
	 */
	public getElement(): HTMLElement {
		return this.el;
	}
	/**
	 * 清除所有内容
	 */
	public removeChildren():void{
		this.el.innerHTML = '';
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.el.remove();
		this.container = null;
	}
}



/**
 * 属性条目容器，可以实现如:
 * 文本(固定宽度) | 控件1(容器自适应宽度) | 附加控件(固定宽度)
 */
export class AttributeItemGroup implements IUIBase, IDisposable {

	private el: HTMLElement;

	private labelDisplay: Label;
	private contentGroup: HTMLElement;
	private additionalGroup: HTMLElement;

	private container: HTMLElement;

	constructor(container: HTMLElement | IUIBase = null) {
		this.el = document.createElement('div');

		this.labelDisplay = new Label();
		this.contentGroup = document.createElement('div');
		addClass(this.contentGroup, 'contentGroup');
		this.additionalGroup = document.createElement('div');
		addClass(this.additionalGroup, 'additionalGroup');

		this.labelDisplay.style.flexGrow = '0';
		this.labelDisplay.style.flexShrink = '0';

		this.labelWidth = this.labelWidth;
		this.additionalWidth = this.additionalWidth;
		this.additionalVisible = this.additionalVisible;
		this.labelRight = this.labelRight;

		if (container) {
			this.create(container);
		}
	}
	/**
	 * 样式
	 */
	public get style(): CSSStyleDeclaration {
		return this.el.style;
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

	/**
	 * 创建
	 * @param container 
	 */
	public create(container: HTMLElement | IUIBase): void {
		addClass(this.el, 'egret-attribute-item-group');
		this.container = getTargetElement(container);
		this.container.appendChild(this.el);
		this.labelDisplay.create(this.el);
		this.el.appendChild(this.contentGroup);
		this.contentGroup.style.marginLeft = '10px';
		this.el.appendChild(this.additionalGroup);
		this.additionalGroup.style.marginLeft = '10px';
	}


	/**
	 * 核心dom对象
	 */
	public getElement(): HTMLElement {
		return this.contentGroup;
	}
	/**
	 * 附加dom对象
	 */
	public getAdditionalElement(): HTMLElement {
		return this.additionalGroup;
	}
	/**
	 * 得到外层条目的对象
	 */
	public getItemElement():HTMLElement{
		return this.el;
	}
	/**
	 * 文本标签内容
	 */
	public get label(): string {
		return this.labelDisplay.text;
	}
	public set label(value: string) {
		this.labelDisplay.text = value;
	}

	private _labelWidth: number = 40;
	/**
	 * 标签的宽度，默认80;
	 */
	public get labelWidth(): number {
		return this._labelWidth;
	}
	public set labelWidth(value: number) {
		this._labelWidth = value;
		this.labelDisplay.style.minWidth = value + 'px';
	}


	private _additionalWidth: number = 80;
	/**
	 * 附加控件宽度，默认80;
	 */
	public get additionalWidth(): number {
		return this._additionalWidth;
	}
	public set additionalWidth(value: number) {
		this._additionalWidth = value;
		this.additionalGroup.style.minWidth = value + 'px';
	}

	private _additionalVisible: boolean = false;
	/**
	 * 附加部分是否显示，默认不显示
	 */
	public get additionalVisible(): boolean {
		return this._additionalVisible;
	}
	public set additionalVisible(value: boolean) {
		this._additionalVisible = value;
		this.additionalGroup.hidden = !value;
	}

	private _labelRight = true;
	/**
	 * 文本是否右对齐
	 */
	public get labelRight():boolean{
		return this._labelRight;
	}
	public set labelRight(value:boolean){
		this._labelRight = value;
		this.labelDisplay.style.textAlign = this._labelRight ? 'right' : '';
	}


	/**
	 * 释放
	 */
	public dispose(): void {
		this.el.remove();
		this.container = null;
	}
}