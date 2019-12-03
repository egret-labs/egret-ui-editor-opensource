import { IDisposable } from 'egret/base/common/lifecycle';
import { addClass } from 'vs/base/browser/dom';
import { removeClass } from '../../../base/common/dom';
import { Emitter, Event } from '../../../base/common/event';
import { localize } from 'egret/base/localization/nls';

/**
 * 状态的数据
 */
export interface StateItemDataSource {
	/** 状态名 */
	name: string;
	/** 是否是所有状态 */
	allState: boolean;
}

/**
 * 每一个状态的渲染项
 */
export class StateItemRenderer implements IDisposable {
	private _onClick: Emitter<StateItemRenderer>;
	private _onDefaultClick: Emitter<StateItemRenderer>;
	private _onDeleteClick: Emitter<StateItemRenderer>;
	private _onStateInput: Emitter<{ oldName: string, newName: string }>;

	constructor(parent: HTMLElement) {
		this.mouseOver_handler = this.mouseOver_handler.bind(this);
		this.mouseOut_handler = this.mouseOut_handler.bind(this);
		this.click_handler = this.click_handler.bind(this);
		this.doubleClick_handler = this.doubleClick_handler.bind(this);
		this.defaultClick_handler = this.defaultClick_handler.bind(this);
		this.deleteClick_handler = this.deleteClick_handler.bind(this);
		this.nameInputKeyDown_handler = this.nameInputKeyDown_handler.bind(this);
		this.nameInputBlur_handler = this.nameInputBlur_handler.bind(this);


		this._onClick = new Emitter<StateItemRenderer>();
		this._onDefaultClick = new Emitter<StateItemRenderer>();
		this._onDeleteClick = new Emitter<StateItemRenderer>();
		this._onStateInput = new Emitter<{ oldName: string, newName: string }>();
		this.initView(parent);
	}
	/** 点击事件 */
	public get onClick(): Event<StateItemRenderer> {
		return this._onClick.event;
	}
	/** 默认状态点击事件 */
	public get onDefaultClick(): Event<StateItemRenderer> {
		return this._onDefaultClick.event;
	}
	/** 删除按钮点击事件 */
	public get onDeleteClick(): Event<StateItemRenderer> {
		return this._onDeleteClick.event;
	}
	/** 状态名输入的事件 */
	public get onStateInput(): Event<{ oldName: string, newName: string }> {
		return this._onStateInput.event;
	}


	private container: HTMLElement;
	private nameDisplay: HTMLElement;
	private nameInput: HTMLInputElement;
	private defaultBtn: HTMLElement;
	private deleteBtn: HTMLElement;
	private initView(parent: HTMLElement): void {
		this.container = document.createElement('div');
		addClass(this.container, 'state-item-container');
		parent.appendChild(this.container);

		this.nameDisplay = document.createElement('div');
		addClass(this.nameDisplay, 'name-display');
		this.container.appendChild(this.nameDisplay);

		this.defaultBtn = document.createElement('div');
		addClass(this.defaultBtn, 'default-btn');
		this.container.appendChild(this.defaultBtn);

		this.deleteBtn = document.createElement('div');
		addClass(this.deleteBtn, 'delete-btn');
		this.container.appendChild(this.deleteBtn);

		this.nameInput = document.createElement('input');
		this.nameInput.type = 'text';
		addClass(this.nameInput, 'name-input');
		addClass(this.nameInput, 'hidden');
		this.container.appendChild(this.nameInput);


		this.container.addEventListener('mouseover', this.mouseOver_handler);
		this.container.addEventListener('mouseout', this.mouseOut_handler);

		this.nameDisplay.addEventListener('click', this.click_handler);
		this.nameDisplay.addEventListener('dblclick', this.doubleClick_handler);
		this.defaultBtn.addEventListener('click', this.defaultClick_handler);
		this.deleteBtn.addEventListener('click', this.deleteClick_handler);

		this.nameInput.addEventListener('keydown', this.nameInputKeyDown_handler);
		this.nameInput.addEventListener('blur', this.nameInputBlur_handler);

		this.updateBtnVisible();
	}

	private mouseIn: boolean = false;
	private mouseOver_handler(e: MouseEvent): void {
		this.mouseIn = true;
		this.updateBtnVisible();
	}

	private mouseOut_handler(e: MouseEvent): void {
		this.mouseIn = false;
		this.updateBtnVisible();
	}

	private click_handler(e: MouseEvent): void {
		this._onClick.fire(this);
	}
	private doubleClick_handler(e: MouseEvent): void {
		//所有状态项不可以改变名称
		if (this.dataSource.allState) {
			return;
		}
		removeClass(this.nameInput, 'hidden');
		this.nameInput.value = this.dataSource.name;
		this.nameInput.focus();
	}
	private defaultClick_handler(e: MouseEvent): void {
		this._onDefaultClick.fire(this);
	}
	private deleteClick_handler(e: MouseEvent): void {
		this._onDeleteClick.fire(this);
	}

	private nameInputKeyDown_handler(e: KeyboardEvent): void {
		if (e.keyCode == 13) {//enter
			e.stopPropagation();
			this.nameInput.blur();
		}
	}
	private nameInputBlur_handler(e: FocusEvent): void {
		addClass(this.nameInput, 'hidden');
		if (this.nameInput.value != this.dataSource.name && this.nameInput.value) {
			this._onStateInput.fire({
				oldName: this.dataSource.name,
				newName: this.nameInput.value
			});
		}
	}


	private _dataSource: StateItemDataSource = null;
	/** 数据源 */
	public get dataSource(): StateItemDataSource {
		return this._dataSource;
	}
	/**
	 * 设置数据源
	 * @param data 
	 */
	public setData(dataSource: StateItemDataSource): void {
		this._dataSource = dataSource;
		if (dataSource.allState) {
			this.nameDisplay.innerHTML = localize('createStatePanel.constructor.allStatus','[ All Status ]')
		} else {
			this.nameDisplay.innerHTML = dataSource.name;
		}
		this.updateBtnVisible();
	}

	private _selected: boolean = false;
	/** 选择状态 */
	public get selected(): boolean {
		return this._selected;
	}
	public set selected(value: boolean) {
		this._selected = value;
		this.selected ? addClass(this.container, 'selected') : removeClass(this.container, 'selected');
	}

	private _default: boolean = false;
	/** 默认状态 */
	public get default(): boolean {
		return this._default;
	}
	public set default(value: boolean) {
		this._default = value;
		this.default ? addClass(this.defaultBtn, 'active') : removeClass(this.defaultBtn, 'active');
		this.updateBtnVisible();
	}

	private updateBtnVisible(): void {
		// 所有状态没有默认和删除按钮
		if (this.dataSource && this.dataSource.allState) {
			this.defaultBtn.style.display = 'none';
			this.deleteBtn.style.display = 'none';
			return;
		}

		if (this.mouseIn) {
			this.defaultBtn.style.display = '';
			this.deleteBtn.style.display = '';
		} else {
			this.deleteBtn.style.display = 'none';
			if (!this.default) {
				this.defaultBtn.style.display = 'none';
			} else {
				this.defaultBtn.style.display = '';
			}
		}
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.container.removeEventListener('mouseover', this.mouseOver_handler);
		this.container.removeEventListener('mouseout', this.mouseOut_handler);

		this.nameDisplay.removeEventListener('click', this.click_handler);
		this.nameDisplay.removeEventListener('dblclick', this.doubleClick_handler);
		this.defaultBtn.removeEventListener('click', this.defaultClick_handler);
		this.deleteBtn.removeEventListener('click', this.deleteClick_handler);

		this.nameInput.removeEventListener('keydown', this.nameInputKeyDown_handler);
		this.nameInput.removeEventListener('blur', this.nameInputBlur_handler);

		this.container.remove();
	}
}