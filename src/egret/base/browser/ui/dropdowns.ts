import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { addClass, removeClass, contains } from 'egret/base/common/dom';
import { IUIBase, getTargetElement } from './common';
import { Emitter, Event } from 'egret/base/common/event';

import './media/dropdowns.css';

/**
 * 数据源
 */
export interface IDropDownDataSourceBase {
	/**
	 * 数据项id
	 */
	id: string;
	/**
	 * 数据项内容
	 */
	data: any;
}

/**
 * 数据源
 */
export interface IDropDownTextDataSource extends IDropDownDataSourceBase{
	/**
	 * 数据项id
	 */
	id: string;
	/**
	 * 数据项内容
	 */
	data: string;
}


/**
 * 下拉框的显示部件
 */
export interface IDropDownLabelDisplay<T extends IDropDownDataSourceBase> {
	/**
	 * 得到对应的显示元素
	 */
	getElement(): HTMLElement;
	/**
	 * 得到标签内容
	 */
	getData(): T;
	/**
	 * 设置标签内容
	 * @param value 
	 */
	setData(value: T): void;
	/**
	 * 设置提示文本
	 * @param value 
	 */
	setPrompt(value: string): void;
}


/**
 * 一个渲染项目的渲染接口
 */
export interface IDropDownItemRenderer<T extends IDropDownDataSourceBase> extends IDisposable {
	/**
	 * 内容
	 * @param value 
	 */
	data: T;
	/**
	 * 得到对应的显示元素
	 */
	getElement(): HTMLElement;
	/**
	 * 是否是选中状态
	 */
	selected: boolean;
	/**
	 * 设置为选中
	 */
	hover: boolean;
}



/**
 * 一个渲染项的基类
 */
export abstract class DropDownItemRendererBase<T extends IDropDownDataSourceBase> implements IDropDownItemRenderer<T> {
	constructor() {
	}
	/**
	 * 得到对应的显示元素，子类具体实现
	 */
	public abstract getElement(): HTMLElement;

	private _data: T;
	/**
	 * 得到标签
	 */
	public get data(): T {
		return this._data;
	}
	public set data(value: T) {
		this._data = value;
		this.doSetData(this.data);
	}
	/**
	 * 子类实现，设置数据
	 * @param data 
	 */
	protected abstract doSetData(data: T): void;

	private _selected: boolean = false;
	/**
	 * 是否是选中状态
	 */
	public get selected(): boolean {
		return this._selected;
	}
	public set selected(value: boolean) {
		this._selected = value;
		this.doSetSelected(value);
	}
	/**
	 * 设置选中效果，子类实现
	 * @param data 
	 */
	protected abstract doSetSelected(value: boolean): void;

	private _hover: boolean;
	/**
	 * 设置为选中
	 */
	public get hover(): boolean {
		return this._hover;
	}
	public set hover(value: boolean) {
		this._hover = value;
		this.doSetHover(this._hover);
	}
	/**
	 * 设置触碰效果，子类实现
	 * @param data 
	 */
	protected abstract doSetHover(value: boolean): void;
	/**
	 * 释放
	 */
	public abstract dispose(): void;
}



/**
 * 默认的主要显示部件
 */
export class DropDownLabelDisplayDefault implements IDropDownLabelDisplay<IDropDownTextDataSource> {
	private _root: HTMLElement;
	private _promptElement: HTMLSpanElement;
	private _labelElement: HTMLSpanElement;
	/**
	 * 得到对应的显示元素
	 */
	public getElement(): HTMLElement {
		if (!this._root) {
			this._root = document.createElement('div');
			this._promptElement = document.createElement('span');
			this._labelElement = document.createElement('span');
			this._root.appendChild(this._promptElement);
			this._root.appendChild(this._labelElement);
			addClass(this._promptElement, 'prompt-display');
			addClass(this._promptElement, 'label-display');
		}
		return this._root;
	}
	private _data: IDropDownTextDataSource;
	/**
	 * 得到标签内容
	 */
	public getData(): IDropDownTextDataSource {
		return this._data;
	}
	/**
	 * 设置标签内容
	 * @param value 
	 */
	public setData(value: IDropDownTextDataSource): void {
		this._data = value;
		if (value) {
			this._labelElement.innerText = this._data.data;
			this._labelElement.title = this._data.data;
		} else {
			this._labelElement.innerText = '';
			this._labelElement.title = null;
		}
	}
	/**
	 * 设置提示文本
	 * @param value 
	 */
	public setPrompt(value: string): void {
		this._promptElement.innerText = value;
	}
}

/**
 * 默认的下拉菜单渲染项
 */
export class DropDownItemRendererDefault extends DropDownItemRendererBase<IDropDownTextDataSource> {
	private el: HTMLElement;
	private span: HTMLSpanElement;
	constructor() {
		super();
		this.el = document.createElement('div');
		this.span = document.createElement('span');
		this.el.appendChild(this.span);
		addClass(this.el, 'dropdown-item');
	}
	/**
	 * 得到对应的显示元素
	 */
	public getElement(): HTMLElement {
		return this.el;
	}
	/**
	 * 设置数据
	 * @param data 
	 */
	protected doSetData(data: IDropDownTextDataSource): void {
		this.span.innerText = data.data;
	}
	/**
	 * 设置选中效果
	 * @param data 
	 */
	protected doSetSelected(value: boolean): void {
		if (value) {
			addClass(this.el, 'active');
		} else {
			removeClass(this.el, 'active');
		}
	}
	/**
	 * 设置触碰效果
	 * @param data 
	 */
	protected doSetHover(value: boolean): void {
		if (value) {
			addClass(this.el, 'hover');
		} else {
			removeClass(this.el, 'hover');
		}
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		this.el.remove();
	}
}

/**
 * 下拉菜单的抽象基类
 */
export abstract class DropDownBase<T extends IDropDownDataSourceBase> implements IUIBase, IDisposable {

	/**
	 * 最大高度
	 */
	public maxHeight:number = 300;

	protected _onSelectChanged: Emitter<DropDownBase<T>>;

	protected el: HTMLElement;
	constructor(container: HTMLElement | IUIBase = null) {

		this.targetClick_handler = this.targetClick_handler.bind(this);
		this.documentClick_handler = this.documentClick_handler.bind(this);
		this.documentMouseOver_handler = this.documentMouseOver_handler.bind(this);
		this.documentDown_handler = this.documentDown_handler.bind(this);
		this.documentOther_handler = this.documentOther_handler.bind(this);

		this._onSelectChanged = new Emitter<DropDownBase<T>>();
		this.initView();

		if (container) {
			this.create(container);
		}
	}
	/**
	 * 得到样式
	 */
	public get style(): CSSStyleDeclaration {
		return this.getElement().style;
	}
	/**
	 * 核心dom对象
	 */
	public getElement(): HTMLElement {
		return this.el;
	}
	/**
     * 选择项改变
     */
	public get onSelectChanged(): Event<DropDownBase<T>> {
		return this._onSelectChanged.event;
	}

	private _labelDisplay: IDropDownLabelDisplay<T>;
	protected getLabelDisplay(): IDropDownLabelDisplay<T> {
		if (!this._labelDisplay) {
			this._labelDisplay = this.createDisplayLabel();
		}
		return this._labelDisplay;
	}

	private isPropagationStopped: boolean = false;
	private containerCage: HTMLDivElement;
	protected itemsContainer: HTMLElement;
	protected initView(): void {
		this.el = document.createElement('div');
		addClass(this.el, 'egret-dropdown');

		this.el.appendChild(this.getLabelDisplay().getElement());

		this.containerCage = document.createElement('div');
		// 防止点击滚动条时dropdown隐藏
		this.containerCage.addEventListener('mousedown', (event) => {
			event.stopPropagation();
		});
		this.containerCage.addEventListener('mouseup', (event) => {
			this.isPropagationStopped = true;
		});
		addClass(this.containerCage, 'dropdown-display-container');

		this.itemsContainer = document.createElement('div');
		addClass(this.itemsContainer, 'dropdown-items-container');
		this.containerCage.appendChild(this.itemsContainer);

		this.getLabelDisplay().getElement().addEventListener('click', this.targetClick_handler);
	}

	private displaying: boolean = false;
	private targetClick_handler(): void {
		if (this.displaying) {
			return;
		}
		if (!this.enable) {
			return;
		}
		this.containerCage.style.zIndex = '1000';
		this.refresh(true);
		this.displaying = true;
		this.show();
		this.startUpdatePos();
	}
	private _currentDirection = 'down';
	private show():void{
		removeClass(this.containerCage,'up');
		removeClass(this.itemsContainer,'up');
		removeClass(this.el, 'up');

		const elementBounds = this.el.getBoundingClientRect();
		this.containerCage.style.width = Math.ceil(this.el.offsetWidth)+'px';
		this.containerCage.style.left = Math.ceil(elementBounds.left)+'px';
		this.containerCage.style.top = Math.ceil(elementBounds.top+elementBounds.height)+'px';

		document.body.appendChild(this.containerCage);
		this.containerCage.style.maxHeight = this.maxHeight+'px';
		this.itemsContainer.style.maxHeight = (this.maxHeight-1)+'px';

		this._currentDirection = 'down';
		if(document.body.clientHeight - 1 - Math.ceil(elementBounds.top+elementBounds.height) < this.containerCage.clientHeight){
			this._currentDirection = 'up';
		}

		addClass(this.el, 'active');
		if(this._currentDirection == 'up'){
			addClass(this.containerCage,'up');
			addClass(this.itemsContainer,'up');
			addClass(this.el, 'up');
			this.containerCage.style.top = (Math.ceil(elementBounds.top)-this.containerCage.clientHeight)+'px';
		}

		setTimeout(() => {
			document.addEventListener('mouseup', this.documentClick_handler);
			document.addEventListener('mouseover', this.documentMouseOver_handler);
			document.addEventListener('mousedown', this.documentDown_handler);
			document.addEventListener('wheel', this.documentOther_handler);
		}, 10);
	}

	private inputBoundsCache: ClientRect | DOMRect = null;
	private startUpdatePos():void{
		window.requestAnimationFrame(time=>{
			this.doUpdatePositionStep();
		});
	}

	private doUpdatePositionStep():void{
		if(!this.inputBoundsCache){
			this.inputBoundsCache = this.el.getBoundingClientRect();
		}
		const curBounds = this.el.getBoundingClientRect();
		if(
			curBounds.left != this.inputBoundsCache.left || 
			curBounds.top != this.inputBoundsCache.top || 
			curBounds.height != this.inputBoundsCache.height || 
			curBounds.width != this.inputBoundsCache.width
			){
				this.inputBoundsCache = curBounds;
				this.updatePosition();
			}
		if(this.displaying){
			window.requestAnimationFrame(time=>{
				this.doUpdatePositionStep();
			});
		}
	}

	private updatePosition():void{
		if(!this.displaying){
			return;
		}
		removeClass(this.containerCage,'up');
		removeClass(this.itemsContainer,'up');
		removeClass(this.el, 'up');

		const elementBounds = this.el.getBoundingClientRect();
		this.containerCage.style.width = Math.ceil(this.el.offsetWidth)+'px';
		this.containerCage.style.left = Math.ceil(elementBounds.left)+'px';
		this.containerCage.style.top = Math.ceil(elementBounds.top+elementBounds.height)+'px';

		this._currentDirection = 'down';
		if(document.body.clientHeight - 1 - Math.ceil(elementBounds.top+elementBounds.height) < this.containerCage.clientHeight){
			this._currentDirection = 'up';
		}

		if(this._currentDirection == 'up'){
			addClass(this.containerCage,'up');
			addClass(this.itemsContainer,'up');
			addClass(this.el, 'up');
			this.containerCage.style.top = (Math.ceil(elementBounds.top)-this.containerCage.clientHeight)+'px';
		}
	}

	private documentMouseOver_handler(event: MouseEvent): void {
		const targetItemRenderer = this.getRendererByElement(event.target as HTMLElement);
		this.setHover(targetItemRenderer);
	}

	private documentClick_handler(event: MouseEvent): void {
		const targetItemRenderer = this.getRendererByElement(event.target as HTMLElement);
		if (targetItemRenderer) {
			this.doItemClick(targetItemRenderer);
		} else {
			if(!this.isPropagationStopped && !contains(event.target as HTMLElement,this.el)){
				this.hide();
			}
		}
		this.isPropagationStopped = false;
	}
	private documentDown_handler(event: MouseEvent): void {
		const targetItemRenderer = this.getRendererByElement(event.target as HTMLElement);
		if (!targetItemRenderer && !contains(event.target as HTMLElement,this.el)) {
			this.hide();
		}
	}
	private documentOther_handler(event: MouseEvent): void {
		const targetItemRenderer = this.getRendererByElement(event.target as HTMLElement);
		if (!targetItemRenderer) {
			this.hide();
		}
	}

	private getRendererByElement(target: HTMLElement): IDropDownItemRenderer<T> {
		let targetItemRenderer: IDropDownItemRenderer<T> = null;
		for (let i = 0; i < this.itemRendererList.length; i++) {
			const curItem = this.itemRendererList[i];
			if (contains(event.target as HTMLElement, curItem.getElement())) {
				targetItemRenderer = curItem;
				break;
			}
		}
		return targetItemRenderer;
	}

	protected doItemClick(item: IDropDownItemRenderer<T>): void {
		this.doSetSelection(item.data, true);
		this.hide();
	}

	/**
	 * 设置鼠标触碰项目
	 * @param item 
	 */
	protected setHover(item: IDropDownItemRenderer<T> | number): void {
		if (typeof item == 'number') {
			this.setHoverByIndex(item);
		} else {
			this.setHoverByItem(item);
		}
	}
	/** 得到当前触碰的索引id */
	protected getHoverIndex(): number {
		return this._hoverIndex;
	}
	/** 得到当前触碰的项数据 */
	protected getHoverDataSource(): T {
		return this._hoverDataSource;
	}

	private setHoverByIndex(index: number): void {
		let item: IDropDownItemRenderer<T> = null;
		if (index >= 0 && index < this.itemRendererList.length) {
			item = this.itemRendererList[index];
		}
		this.setHoverByItem(item);
	}

	private _hoverIndex: number = -1;
	private _hoverDataSource: T;
	private setHoverByItem(item: IDropDownItemRenderer<T>): void {
		if (!item) {
			this._hoverIndex = -1;
			this._hoverDataSource = null;
		} else {
			this._hoverIndex = this.itemRendererList.indexOf(item);
			this._hoverDataSource = item.data;
		}
		for (let i = 0; i < this.itemRendererList.length; i++) {
			if (this.itemRendererList[i] != item) {
				this.itemRendererList[i].hover = false;
			}
		}
		if (item) {
			item.hover = true;
		}
	}

	private _selection: T;
	/**
	 * 得到当前的选中项
	 */
	public getSelection(): T {
		return this._selection;
	}
	/**
	 * 设置选择项目
	 * @param item 项目数据或者id
	 */
	public setSelection(item: T | string): void {
		this.doSetSelection(item, false);
	}
	protected doSetSelection(item: T | string, fire: boolean): void {
		const selectionCache = this.getSelection();
		if (typeof item == 'string') {
			this.setSelectionById(item);
		} else {
			this.setSelectionByData(item);
		}
		if (fire && selectionCache != this.getSelection()) {
			this._onSelectChanged.fire(this);
		}
	}
	/**
	 * 根据id设置选择
	 * @param id 
	 */
	private setSelectionById(id: string): void {
		let targetDataSource: T = null;
		for (let i = 0; i < this.datas.length; i++) {
			if (this.datas[i].id == id) {
				targetDataSource = this.datas[i];
				break;
			}
		}
		this.setSelectionByData(targetDataSource);
	}
	/**
	 * 根据项目数据设置选中
	 * @param item 
	 */
	private setSelectionByData(item: T): void {
		this._selection = item;
		this.updateSelectionDisplay(this.getLabelDisplay(), this._selection);
	}

	/**
	 * 更新显示标题
	 */
	protected updateSelectionDisplay(labelDisplay: IDropDownLabelDisplay<T>, selection: T): void {
		for (let i = 0; i < this.itemRendererList.length; i++) {
			if (this.itemRendererList[i].data == selection) {
				this.itemRendererList[i].selected = true;
			} else {
				this.itemRendererList[i].selected = false;
			}
		}
		if (!selection) {
			labelDisplay.setPrompt(this.prompt);
		} else {
			labelDisplay.setPrompt(this._prefix);
		}
		labelDisplay.setData(selection);
	}

	/**
	 * 隐藏
	 */
	protected hide(): void {
		this.displaying = false;
		this.containerCage.style.zIndex = '1';
		removeClass(this.el, 'active');
		this.containerCage.style.maxHeight = null;
		setTimeout(() => {
			this.containerCage.remove();
		}, 300);
		document.removeEventListener('mouseup', this.documentClick_handler);
		document.removeEventListener('mouseover', this.documentMouseOver_handler);
		document.removeEventListener('mousedown', this.documentDown_handler);
		document.removeEventListener('wheel', this.documentOther_handler);
	}


	/**
	 * 创建
	 * @param container 
	 */
	public create(container: HTMLElement | IUIBase): void {
		const curContainer = getTargetElement(container);
		curContainer.appendChild(this.el);
		setTimeout(() => {
			addClass(this.el, 'inited');
		}, 1);
	}

	private _prompt: string = '';
	/**
	 * 未选择时的提示文本
	 * @param text 
	 */
	public get prompt(): string {
		return this._prompt;
	}
	public set prompt(value: string) {
		this._prompt = value;
		this.doSetSelection(this.getSelection(), false);
	}
	/**
	 * 选中之后的显示前缀
	 */
	protected _prefix: string = '';


	private _enable: boolean = true;
	/**
	 * 是否生效
	 */
	public get enable(): boolean {
		return this._enable;
	}
	public set enable(value: boolean) {
		this._enable = value;
		if (this._enable) {
			removeClass(this.el, 'disable');
		} else {
			addClass(this.el, 'disable');
		}
	}

	private datas: T[] = [];
	/**
	 * 设置数据源
	 * @param data 
	 */
	public setDatas(data: T[]): void {
		if(!data){
			data = [];
		}
		this.datas = data;
		if (this.datas.length == 0) {
			this.enable = false;
		} else {
			this.enable = true;
		}
		this.refresh();
	}
	protected getDatas(): T[] {
		return this.datas;
	}

	/**
	 * 刷新渲染项目
	 */
	protected refresh(showInit:boolean = false): void {
		this.renderItems(showInit);
	}
	/**
	 * 得到要显示的数据，子类可以重写，可以进行过滤筛选等
	 */
	protected getDatasForRender(showInit:boolean): T[] {
		return this.getDatas();
	}

	protected itemRendererList: IDropDownItemRenderer<T>[] = [];
	private renderItems(showInit:boolean): void {
		const datas = this.getDatasForRender(showInit);
		while (this.itemRendererList.length > 0) {
			dispose(this.itemRendererList.pop());
		}
		this.itemsContainer.innerHTML = '';
		this.doBeforeRendererItems(datas, this.itemsContainer);
		for (let i = 0; i < datas.length; i++) {
			const itemRenderer: IDropDownItemRenderer<T> = this.createItemRenderer();
			itemRenderer.data = datas[i];
			this.itemRendererList.push(itemRenderer);
			this.itemsContainer.appendChild(itemRenderer.getElement());
		}
		this.doAfterRendererItems(datas, this.itemsContainer);
		this._hoverIndex = -1;
		for (let i = 0; i < this.itemRendererList.length; i++) {
			if (this.itemRendererList[i].data == this.getHoverDataSource()) {
				this.itemRendererList[i].hover = true;
				this._hoverIndex = i;
				this.ensureItemVisible(i);
			} else {
				this.itemRendererList[i].hover = false;
			}
		}
		this.updatePosition();
	}
	/**
	 * 渲染之前做的事情，子类可进行重写
	 * @param datas 
	 */
	protected doBeforeRendererItems(datas: T[], itemsContainer: HTMLElement): void {
	}
	/**
	 * 渲染之后做的事情，子类可进行重写
	 * @param datas 
	 */
	protected doAfterRendererItems(datas: T[], itemsContainer: HTMLElement): void {
	}

	/**
	 * 确保某一项可见
	 * @param index 
	 */
	protected ensureItemVisible(index: number): void {
		if (index >= 0 && index < this.itemRendererList.length) {
			const item = this.itemRendererList[index].getElement();
			if (item.offsetTop + item.offsetHeight > this.itemsContainer.scrollTop + this.itemsContainer.offsetHeight) {
				this.itemsContainer.scrollTop = item.offsetTop + item.offsetHeight - this.itemsContainer.offsetHeight;
			} else if (item.offsetTop < this.itemsContainer.scrollTop) {
				this.itemsContainer.scrollTop = item.offsetTop;
			}
		}
	}


	/**
	 * 创建一个渲染条目
	 */
	protected abstract createItemRenderer(): IDropDownItemRenderer<T>;
	/**
	 * 创建顶部显示标签控件
	 */
	protected abstract createDisplayLabel(): IDropDownLabelDisplay<T>;
	/**
	 * 释放
	 */
	public dispose(): void {
		document.removeEventListener('mouseup', this.documentClick_handler);
		document.removeEventListener('mouseover', this.documentMouseOver_handler);
		document.removeEventListener('mousedown', this.documentDown_handler);
		document.removeEventListener('wheel', this.documentOther_handler);
		this.getLabelDisplay().getElement().removeEventListener('click', this.targetClick_handler);
		this.el.remove();
	}
}


/**
 * 菜单弹出框
 */
export class DropDown extends DropDownBase<IDropDownTextDataSource> implements IUIBase, IDisposable {
	
	/**
     * 选择项改变
     */
	public get onSelectChanged(): Event<DropDown> {
		return this._onSelectChanged.event as any;
	}

	/**
	 * 选中之后的显示前缀
	 */
	public get prefix(): string {
		return this._prefix;
	}
	public set prefix(value: string) {
		this._prefix = value;
		this.doSetSelection(this.getSelection(), false);
	}

	/**
	 * 创建一个渲染条目
	 */
	protected createItemRenderer(): IDropDownItemRenderer<IDropDownTextDataSource> {
		return new DropDownItemRendererDefault();
	}
	/**
	 * 创建顶部显示标签控件
	 */
	protected createDisplayLabel(): IDropDownLabelDisplay<IDropDownTextDataSource> {
		return new DropDownLabelDisplayDefault();
	}
} 