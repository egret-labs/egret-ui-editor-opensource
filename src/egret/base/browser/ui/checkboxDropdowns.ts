import { DropDownItemRendererBase, DropDownBase, IDropDownItemRenderer, IDropDownLabelDisplay, DropDownLabelDisplayDefault, IDropDownDataSourceBase } from './dropdowns';
import { addClass, removeClass } from 'egret/base/common/dom';
import { IUIBase, getTargetElement } from './common';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';

import './media/checkboxDropdowns.css';
import { Event } from 'egret/base/common/event';


/**
 * 数据源
 */
export interface IDropDownCheckBoxDataSource extends IDropDownDataSourceBase {
	/**
	 * 数据项id
	 */
	id: string;
	/**
	 * 数据项内容
	 */
	data: {
		/**
		 * 是处于选中状态
		 */
		chekced: boolean,
		/**
		 * 文本内容
		 */
		label: string
	};
}


/**
 * 复选框下拉菜单渲染项
 */
class CheckBoxDropDownItemRenderer extends DropDownItemRendererBase<IDropDownCheckBoxDataSource> {
	private el: HTMLElement;
	private checkBox: HTMLInputElement;
	private span: HTMLSpanElement;
	constructor() {
		super();
		this.click_handler = this.click_handler.bind(this);

		this.el = document.createElement('div');
		this.checkBox = document.createElement('input');
		this.checkBox.type = 'checkbox';
		this.el.appendChild(this.checkBox);
		this.span = document.createElement('span');
		this.el.appendChild(this.span);
		addClass(this.el, 'checkbox-dropdown-item');
		this.el.addEventListener('click', this.click_handler);
	}

	public click_handler(e: MouseEvent): void {
		this.checked = !this.checked;
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
	protected doSetData(data: IDropDownCheckBoxDataSource): void {
		this.span.innerText = data.data.label;
		this.checked = data.data.chekced;
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
	 * 已选中
	 */
	public get checked(): boolean {
		return this.data.data.chekced;
	}
	public set checked(value: boolean) {
		this.checkBox.checked = value;
		this.data.data.chekced = value;
	}

	public updateDisplay():void{
		this.checkBox.checked = this.data.data.chekced;
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

class SelectAllButton implements IUIBase, IDisposable {

	public onClick: () => void;

	private container: HTMLElement;
	private el: HTMLElement;
	private toDisposes: IDisposable[] = [];

	constructor(container: HTMLElement | IUIBase = null) {
		this.click_handler = this.click_handler.bind(this);
		this.mouseEnter_handler = this.mouseEnter_handler.bind(this);
		this.mouseOut_handler = this.mouseOut_handler.bind(this);
		this.mouseup_handler = this.mouseup_handler.bind(this);

		this.initView();
		if (container) {
			this.create(container);
		}
	}

	private _isSelectAll: boolean = false;
	public get isSelectAll(): boolean {
		return this._isSelectAll;
	}
	public set isSelectAll(value: boolean) {
		this._isSelectAll = value;
		if (this._isSelectAll) {
			this.el.innerText = '全选';
		} else {
			this.el.innerText = '全不选';
		}
	}

	/**
	 * 初始化内容
	 * @param element 
	 */
	private initView(): void {
		this.el = document.createElement('div');
		this.el.addEventListener('mouseup', this.mouseup_handler);
		this.el.addEventListener('click', this.click_handler);
		this.el.addEventListener('mouseenter', this.mouseEnter_handler);
		this.el.addEventListener('mouseout', this.mouseOut_handler);
		this.isSelectAll = true;
		addClass(this.el, 'checkbox-dropdown-item select-all-button');
	}

	protected mouseup_handler(e: MouseEvent): void {
		e.stopImmediatePropagation();
		e.stopPropagation();
		e.preventDefault();
	}

	protected click_handler(e: MouseEvent): void {
		e.stopImmediatePropagation();
		e.stopPropagation();
		e.preventDefault();

		if (this.onClick) {
			this.onClick();
		}
	}
	protected mouseEnter_handler(e: MouseEvent): void {
		addClass(this.el, 'hover');
	}
	protected mouseOut_handler(e: MouseEvent): void {
		removeClass(this.el, 'hover');
	}

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
		this.container.appendChild(this.el);
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.onClick = null;
		this.el.remove();
		this.el.removeEventListener('click', this.click_handler);
		this.el.removeEventListener('mouseenter', this.mouseEnter_handler);
		this.el.removeEventListener('mouseout', this.mouseOut_handler);
		this.el.removeEventListener('mouseup', this.mouseup_handler);
		dispose(this.toDisposes);
	}

}





/**
 * 复选框主要显示部件
 */
class CheckBoxDropDownLabelDisplay implements IDropDownLabelDisplay<IDropDownCheckBoxDataSource> {
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

			addClass(this._labelElement,'checkbox-dropdown-label');
			addClass(this._promptElement, 'prompt-display');
			addClass(this._root,'checkbox-dropdown-label-part');
		}
		return this._root;
	}
	/**
	 * 得到标签内容
	 */
	public getData(): IDropDownCheckBoxDataSource {
		return null;
	}
	/**
	 * 设置标签内容
	 * @param value 
	 */
	public setData(value: IDropDownCheckBoxDataSource): void {
	}

	private datas:IDropDownCheckBoxDataSource[] = [];
	/**
	 * 得到标签内容
	 */
	public getDatas(): IDropDownCheckBoxDataSource[] {
		return this.datas;
	}
	/**
	 * 设置标签内容
	 * @param value 
	 */
	public setDatas(value: IDropDownCheckBoxDataSource[]): void {
		this.datas = value;
		let text:string = '';
		for(let i = 0;i<this.datas.length;i++){
			text += this.datas[i].data.label;
			if(i < this.datas.length-1){
				text += ', ';
			}
		}
		this._labelElement.innerText = text;
		if(!text){
			this._labelElement.title = null;
		}else{
			this._labelElement.title = text;
		}
	}


	/**
	 * 设置提示文本
	 * @param value 
	 */
	public setPrompt(value: string): void {
		this._promptElement.innerText = value;
		this._labelElement.innerText = '';
	}
}

/**
 * 菜单弹出框
 */
export class CheckBoxDropDown extends DropDownBase<IDropDownCheckBoxDataSource> implements IUIBase, IDisposable {
	/**
     * 选择项改变
     */
	public get onSelectChanged(): Event<CheckBoxDropDown> {
		return this._onSelectChanged.event as any;
	}


	private selectAllButton: SelectAllButton;
	protected initView(): void {
		super.initView();
		this.selectAllButton = new SelectAllButton();
		this.selectAllButton.onClick = () => this.selectAllClick_handler();
	}

	private selectAllClick_handler(): void {
		for (let i = 0; i < this.itemRendererList.length; i++) {
			const curItemRenderer: CheckBoxDropDownItemRenderer = this.itemRendererList[i] as CheckBoxDropDownItemRenderer;
			if (this.selectAllButton.isSelectAll) {
				curItemRenderer.checked = true;
			} else {
				curItemRenderer.checked = false;
			}
		}
		this.updateSelectAllButtonDisplay();
		this.updateSelections();
		this.updateSelectionDisplay(this.getLabelDisplay(),this.getSelection());
		this._onSelectChanged.fire(this);
	}

	protected doItemClick(item: IDropDownItemRenderer<IDropDownCheckBoxDataSource>): void {
		setTimeout(() => {
			this.updateSelectAllButtonDisplay();
			this.updateSelections();
			this.updateSelectionDisplay(this.getLabelDisplay(),this.getSelection());
			this._onSelectChanged.fire(this);
		}, 1);
	}

	private _selections: IDropDownCheckBoxDataSource[] = [];
	/**
	 * 得到当前的选中项列表
	 */
	public getSelections(): IDropDownCheckBoxDataSource[] {
		return this._selections;
	}
	/**
	 * 设置选择项目列表
	 * @param items 项目数据或者id的列表
	 */
	public setSelections(items: (IDropDownCheckBoxDataSource | string)[]): void {
		this.doSetSelections(items, false);
	}

	protected doSetSelections(items: (IDropDownCheckBoxDataSource | string)[], fire: boolean): void {
		const selectionCache = this.getSelection();
		const targetItems:IDropDownCheckBoxDataSource[] = [];
		for(let i = 0;i<items.length;i++){
			const item = items[i];
			if (typeof item == 'string') {
				let targetItem:IDropDownCheckBoxDataSource = null;
				for(let j = 0;j<this.getDatas().length;j++){
					if(this.getDatas()[j].id == item){
						targetItem = this.getDatas()[j];
						break;
					}
				}
				if(targetItem){
					targetItems.push(targetItem);
				}
			} else {
				targetItems.push(item);
			}
		}
		this.setSelectionsByData(targetItems);
		if (fire && selectionCache != this.getSelection()) {
			this._onSelectChanged.fire(this);
		}
	}

	/**
	 * 根据项目数据设置选中
	 * @param item 
	 */
	private setSelectionsByData(items: IDropDownCheckBoxDataSource[]): void {
		this._selections = items;
		for(let i = 0;i<this.getDatas().length;i++){
			const curData = this.getDatas()[i];
			if(items.indexOf(curData) != -1){
				curData.data.chekced = true;
			}else{
				curData.data.chekced = false;
			}
		}
		for(let i = 0;i<this.itemRendererList.length;i++){
			const itemRenderer:CheckBoxDropDownItemRenderer = this.itemRendererList[i] as CheckBoxDropDownItemRenderer;
			itemRenderer.updateDisplay();
		}
		this.updateSelectionDisplay(this.getLabelDisplay(),this.getSelection());
	}
	
	private updateSelections():void{
		this._selections.length = 0;
		for(let i = 0;i<this.getDatas().length;i++){
			if(this.getDatas()[i].data.chekced){
				this._selections.push(this.getDatas()[i]);
			}
		}
	}

	/**
	 * 更新显示标题
	 */
	protected updateSelectionDisplay(labelDisplay: IDropDownLabelDisplay<IDropDownCheckBoxDataSource>, selection: IDropDownCheckBoxDataSource): void {
		const checkboxLabelDisplay = labelDisplay as CheckBoxDropDownLabelDisplay;
		if(this.getSelections().length == 0){
			checkboxLabelDisplay.setPrompt(this.prompt);
		}else{
			checkboxLabelDisplay.setPrompt('');
		}
		checkboxLabelDisplay.setDatas(this.getSelections());
	}

	/**
	 * 渲染之前做的事情，子类可进行重写
	 * @param datas 
	 */
	protected doBeforeRendererItems(datas: IDropDownCheckBoxDataSource[], itemsContainer: HTMLElement): void {
		super.doBeforeRendererItems(datas, itemsContainer);
		this.selectAllButton.create(itemsContainer);
	}

	/**
	 * 渲染之后做的事情，子类可进行重写
	 * @param datas 
	 */
	protected doAfterRendererItems(datas: IDropDownCheckBoxDataSource[], itemsContainer: HTMLElement): void {
		super.doAfterRendererItems(datas, itemsContainer);
		this.updateSelectAllButtonDisplay();
	}
	/**
	 * 刷新渲染项目
	 */
	protected refresh(): void {
		super.refresh();
		this.updateSelections();
		this.updateSelectionDisplay(this.getLabelDisplay(),this.getSelection());
	}

	/**
	 * 创建一个渲染条目
	 */
	protected createItemRenderer(): IDropDownItemRenderer<IDropDownCheckBoxDataSource> {
		return new CheckBoxDropDownItemRenderer();
	}
	/**
	 * 创建顶部显示标签控件
	 */
	protected createDisplayLabel(): IDropDownLabelDisplay<IDropDownCheckBoxDataSource> {
		return new CheckBoxDropDownLabelDisplay();
	}

	private updateSelectAllButtonDisplay(): void {
		let isSelectAll: boolean = true;
		for (let i = 0; i < this.itemRendererList.length; i++) {
			const curItemRenderer: CheckBoxDropDownItemRenderer = this.itemRendererList[i] as CheckBoxDropDownItemRenderer;
			if (!curItemRenderer.checked) {
				isSelectAll = false;
				break;
			}
		}
		this.selectAllButton.isSelectAll = !isSelectAll;
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		super.dispose();
		dispose(this.selectAllButton);
	}
} 