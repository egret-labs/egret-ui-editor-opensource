import { IUIBase, getTargetElement } from './common';
import { IDisposable } from '../../common/lifecycle';
import { addClass } from '../../common/dom';
import { Emitter, Event } from '../../common/event';

import './media/selects.css';

/**
 * 下拉选择框数据源
 */
export interface SelectDataSource {
	/**
	 * 显示标签
	 */
	label: string;
	/**
	 * 唯一标志
	 */
	id: string;
	/**
	 * 数据
	 */
	data?: any;
}



/**
 * 下拉选择框
 */
export class Select implements IUIBase, IDisposable {

	private _onSelectedChanged: Emitter<SelectDataSource>;

	private container: HTMLElement;
	protected el: HTMLSelectElement;
	constructor(container: HTMLElement | IUIBase = null) {
		this.selectedChanged_handler = this.selectedChanged_handler.bind(this);

		this._onSelectedChanged = new Emitter<SelectDataSource>();

		this.el = document.createElement('select');
		if (container) {
			this.create(container);
		}
	}
	/**
	 * 选择改变事件
	 */
	public get onSelectedChanged(): Event<SelectDataSource> {
		return this._onSelectedChanged.event;
	}

	/**
	 * 样式
	 */
	public get style(): CSSStyleDeclaration {
		return this.el.style;
	}

	/**
	 * 创建
	 * @param container 
	 */
	public create(container: HTMLElement | IUIBase): void {
		this.container = getTargetElement(container);
		this.container.appendChild(this.el);
		this.initView();
		this.registerListeners();
	}

	/**
	 * 核心dom对象
	 */
	public getElement(): HTMLElement {
		return this.el;
	}

	/**
	 * 初始化内容
	 * @param element 
	 */
	protected initView(): void {
		addClass(this.el, 'egret-select');
	}

	private _dataProvider: SelectDataSource[] = [];
	/**
	 * 数据源
	 */
	public get dataProvider(): SelectDataSource[] {
		return this._dataProvider;
	}
	public set dataProvider(value: SelectDataSource[]) {
		this._dataProvider = value;
		this.doSetDataProvider(this._dataProvider);
	}

	private doSetDataProvider(value: SelectDataSource[]): void {
		this.clearItemds();
		for (let i = 0; i < this._dataProvider.length; i++) {
			const option = document.createElement('option');
			option.value = this._dataProvider[i].id;
			option.innerText = this._dataProvider[i].label;
			this.el.appendChild(option);
		}
	}

	private clearItemds(): void {
		this.el.innerHTML = '';
	}


	protected registerListeners(): void {
		this.el.addEventListener('change', this.selectedChanged_handler);
	}

	private selectedChanged_handler(): void {
		this._onSelectedChanged.fire(this._dataProvider[this.el.selectedIndex]);
	}

	/**
	 * 选择项目
	 */
	public get selection(): SelectDataSource {
		return this._dataProvider[this.el.selectedIndex];
	}
	public set selection(value: SelectDataSource) {
		const index = this._dataProvider.indexOf(value);
		this.el.selectedIndex = index;
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.el.remove();
		this.el.removeEventListener('change', this.selectedChanged_handler);
		this.container = null;
	}
}