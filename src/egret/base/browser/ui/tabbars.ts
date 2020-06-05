import { addClass, removeClass } from '../../common/dom';
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

type TabbarItem = {
	button: ToggleButton;
	source: DataSource;
	visible: boolean;
};

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
	private items: TabbarItem[] = [];
	private doSetDataProvider(value: DataSource[]): void {
		this.clearItems();
		for (let i = 0; i < value.length; i++) {
			const dataSource = value[i];
			const result = this.addItem(dataSource);
			this.items.push({
				button: result.target,
				source: dataSource,
				visible: true
			});
			this.toDisposes.push(result.dispose);
		}
		this._selectedIndex = -1;
		this.layout();
	}

	private layout(): void {
		const temp: TabbarItem[] = [];
		for (let i = 0; i < this.items.length; i++) {
			const element = this.items[i];
			if (element.visible) {
				removeClass(element.button.getElement(), 'begin');
				removeClass(element.button.getElement(), 'end');
				removeClass(element.button.getElement(), 'middle');
				removeClass(element.button.getElement(), 'hide');
				temp.push(element);
			} else {
				addClass(element.button.getElement(), 'hide');
			}
		}
		if (temp.length > 0) {
			for (let i = 0; i < temp.length; i++) {
				const item = temp[i];
				if (i == 0) {
					addClass(item.button.getElement(), 'begin');
				} else if (i == temp.length - 1) {
					addClass(item.button.getElement(), 'end');
				} else {
					addClass(item.button.getElement(), 'middle');
				}
			}
		}
		this.doDefaultSelect();
	}

	private doDefaultSelect(): void {
		let chooseFirst: boolean = false;
		if (this._selectedIndex >= 0 && this.items.length > this._selectedIndex) {
			const item = this.items[this._selectedIndex];
			if (!item.visible) {
				chooseFirst = true;
			}
		} else {
			chooseFirst = true;
		}
		if (chooseFirst) {
			for (let i = 0; i < this.items.length; i++) {
				const element = this.items[i];
				if (element.visible) {
					this.updateItemSelectedByItem(element.button, true);
					break;
				}
			}
		}
	}

	private clearItems(): void {
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
			this.updateItemSelectedByIndex(value, false);
		}
	}

	/**
	 * 获取当前选中对象
	 *
	 * @readonly
	 * @type {ButtonBase}
	 * @memberof Tabbar
	 */
	public get selectedButton(): ButtonBase {
		return this.items[this.selectedIndex].button;
	}

	private getButtonIndex(target: ButtonBase): number {
		for (let i = 0; i < this.items.length; i++) {
			const item = this.items[i];
			if (item.button === target) {
				return i;
			}
		}
		return -1;
	}

	public setItemVisible(index: number, visible: boolean): void;
	public setItemVisible(value: DataSource, visible: boolean): void;
	public setItemVisible(target: any, visible: boolean): void {
		if (typeof target === 'number') {
			const index = target as number;
			if(this.items.length > index){
				this.items[index].visible = visible;
			}
		} else {
			const value = target as DataSource;
			for (let i = 0; i < this.items.length; i++) {
				const element = this.items[i];
				if(element.source === value){
					element.visible = visible;
					break;
				}
			}
		}
		this.layout();
	}

	private updateItemSelectedByItem(target: ButtonBase, fire: boolean = false): void {
		for (let i = 0; i < this.items.length; i++) {
			if (this.items[i].button != target) {
				this.items[i].button.selected = false;
			} else {
				this.items[i].button.selected = true;
			}
		}
		const index = this.getButtonIndex(target as ToggleButton);
		this._selectedIndex = index;
		const item = this.items[index];
		if (this._selection != item.source) {
			this._selection = item.source;
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
				this.items[i].button.selected = false;
			} else {
				this.items[i].button.selected = true;
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
				this.items[i].button.selected = false;
			} else {
				this.items[i].button.selected = true;
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