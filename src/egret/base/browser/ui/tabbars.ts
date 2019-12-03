import { addClass } from '../../common/dom';
import { ToggleButton, ButtonBase } from './buttons';
import { IDisposable, dispose } from '../../common/lifecycle';
import { Emitter, Event } from '../../common/event';
import { IUIBase, getTargetElement } from './common';

import './media/tabbars.css';

/**
 * 切换选项卡的数据源
 */
export interface DataSource {
	/**
	 * 显示标签
	 */
	label: string;
	/**
	 * 图标样式
	 */
	iconClass: string;
	/**
	 * 唯一标志
	 */
	id: string;
	/**
	 * 样式
	 */
	style?: string;
	/**
	 *大小
	 *
	 * @type {number}
	 * @memberof DataSource
	 */
	size?: number;


}

/**
 * 切换选项
 */
export class Tabbar implements IUIBase, IDisposable {
	private _onSelectedChanged: Emitter<DataSource>;

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
		this._onSelectedChanged = new Emitter<DataSource>();
		this.initView();
		this.doSetDataProvider(this._dataProvider);
	}

	/**
	 * 核心dom对象
	 */
	public getElement(): HTMLElement {
		return this.el;
	}


	/**
	 * 选择项目改变事件
	 */
	public get onSelectedChanged(): Event<DataSource> {
		return this._onSelectedChanged.event;
	}

	/**
	 * 初始化内容
	 * @param element 
	 */
	protected initView(): void {
		addClass(this.el, 'egret-tabbar');
	}

	private _dataProvider: DataSource[] = [];
	/**
	 * 数据源
	 */
	public get dataProvider(): DataSource[] {
		return this._dataProvider;
	}
	public set dataProvider(value: DataSource[]) {
		this._dataProvider = value;
		this.doSetDataProvider(this._dataProvider);
	}
	private toDisposes: IDisposable[] = [];
	private items: ToggleButton[] = [];
	private doSetDataProvider(value: DataSource[]): void {
		this.clearItemds();
		for (let i = 0; i < value.length; i++) {
			const dataSource = value[i];
			const result = this.addItem(dataSource);
			this.items.push(result.target);
			this.toDisposes.push(result.dispose);
		}
		if (this.items.length > 1) {
			for (let i = 0; i < this.items.length; i++) {
				const item = this.items[i];
				if (i == 0) {
					addClass(item.getElement(), 'begin');
				} else if (i == this.items.length - 1) {
					addClass(item.getElement(), 'end');
				} else {
					addClass(item.getElement(), 'middle');
				}
			}
			this.updateItemSelectedByItem(this.items[0]);
		}
	}

	private clearItemds(): void {
		this.items = [];
		this.toDisposes = dispose(this.toDisposes);
	}


	private addItem(data: DataSource): { target: ToggleButton, dispose: IDisposable } {
		const button = new ToggleButton(this.el);
		button.iconClass = data.iconClass;
		button.label = data.label;
		if (data.style) {
			addClass(button.getElement(), data.style);
		}
		if (data.size !== undefined) {
			button.size = data.size;
		}

		const toDispose: IDisposable[] = [];
		toDispose.push(button.onClick(target => this.itemClick_handler(target)));
		toDispose.push(button);
		return {
			target: button,
			dispose: {
				dispose: () => {
					dispose(toDispose);
				}
			}
		};
	}
	private itemClick_handler(target: ButtonBase): void {
		this.updateItemSelectedByItem(target, true);
	}

	private _selection: DataSource;
	/**
	 * 选择项目
	 */
	public get selection(): DataSource {
		return this._selection;
	}
	public set selection(value: DataSource) {
		if (this._selection != value) {
			this.updateItemSelectedByDataSrouce(value, false);
		}
	}

	private _selectedIndex: number;
	/**
	 * 当前选择的索引
	 */
	public get selectedIndex(): number {
		return this._selectedIndex;
	}

	public set selectedIndex(value: number) {
		if (this._selectedIndex != value) {
			this.updateItemSelectedByIndex(this._selectedIndex, false);
		}
	}

	/**
	 * 获取当前选中对象
	 *
	 * @readonly
	 * @type {ButtonBase}
	 * @memberof Tabbar
	 */
	public get selectedButton():ButtonBase{
		return this.items[this.selectedIndex];
	}
	private updateItemSelectedByItem(target: ButtonBase, fire: boolean = false): void {
		for (let i = 0; i < this.items.length; i++) {
			if (this.items[i] != target) {
				this.items[i].selected = false;
			} else {
				this.items[i].selected = true;
			}
		}
		const index = this.items.indexOf(target as ToggleButton);
		this._selectedIndex = index;
		const selection = this.dataProvider[index];
		if (this._selection != selection) {
			this._selection = selection;
			if (fire) {
				this._onSelectedChanged.fire(this._selection);
			}
		}
	}

	private updateItemSelectedByDataSrouce(target: DataSource, fire: boolean = false): void {
		const index = this.dataProvider.indexOf(target);
		if (index == -1) {
			return;
		}
		for (let i = 0; i < this.items.length; i++) {
			if (i != index) {
				this.items[i].selected = false;
			} else {
				this.items[i].selected = true;
			}
		}
		this._selectedIndex = index;
		if (this._selection != target) {
			this._selection = target;
			if (fire) {
				this._onSelectedChanged.fire(this._selection);
			}
		}
	}

	private updateItemSelectedByIndex(target: number, fire: boolean = false): void {
		let index = target;
		if (index < 0) {
			index = 0;
		}
		if (index > this.dataProvider.length - 1) {
			index = this.dataProvider.length - 1;
		}
		for (let i = 0; i < this.items.length; i++) {
			if (i != index) {
				this.items[i].selected = false;
			} else {
				this.items[i].selected = true;
			}
		}
		const selection = this.dataProvider[target];
		this._selectedIndex = index;
		if (this._selection != selection) {
			this._selection = selection;
			if (fire) {
				this._onSelectedChanged.fire(this._selection);
			}
		}
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.el.remove();
		this.container = null;
	}
}