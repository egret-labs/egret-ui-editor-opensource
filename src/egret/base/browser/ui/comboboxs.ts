import { IDropDownLabelDisplay, DropDownBase, IDropDownItemRenderer, DropDownItemRendererDefault, IDropDownTextDataSource } from './dropdowns';
import { addClass } from 'egret/base/common/dom';
import { IUIBase } from './common';
import { IDisposable } from 'egret/base/common/lifecycle';

import './media/comboboxs.css';
import { Event } from 'egret/base/common/event';

class ComboBoxLabelDisplay implements IDropDownLabelDisplay<IDropDownTextDataSource> {
	private _root: HTMLInputElement;
	public getElement(): HTMLElement {
		if (!this._root) {
			this._root = document.createElement('input');
			this._root.type == 'text';
			addClass(this._root, 'egret-text-input combobox-input');
		}
		return this._root;
	}
	private _data: IDropDownTextDataSource;
	public getData(): IDropDownTextDataSource {
		return this._data;
	}
	public setData(value: IDropDownTextDataSource): void {
		this._data = value;
		if (value) {
			this._root.value = this._data.data;
		} else {
			this._root.value = '';
		}
	}
	public getInputedText(): string {
		return this._root.value;
	}
	public setPrompt(value: string): void {
		this._root.placeholder = value;
	}
}

/**
 * 可以输入搜索的下拉菜单
 */
export class ComboBox extends DropDownBase<IDropDownTextDataSource> implements IUIBase, IDisposable {

	constructor(container: HTMLElement | IUIBase = null) {
		super(container);
		this.textChanged_handler = this.textChanged_handler.bind(this);
		this.textChanging_handler = this.textChanging_handler.bind(this);
		this.keydown_handler = this.keydown_handler.bind(this);
		this.initListener();
	}

	/**
     * 选择项改变
     */
	public get onSelectChanged(): Event<ComboBox> {
		return this._onSelectChanged.event as any;
	}


	private emptyDisplay: HTMLSpanElement;
	protected initView(): void {
		super.initView();

		this.emptyDisplay = document.createElement('span');
		addClass(this.emptyDisplay, 'empty-display');
		this.emptyDisplay.innerText = '无匹配项';

		addClass(this.el, 'egret-combobox');
	}

	private initListener(): void {
		this.getLabelDisplay().getElement().addEventListener('input', this.textChanging_handler);
		this.getLabelDisplay().getElement().addEventListener('change', this.textChanged_handler);
		this.getLabelDisplay().getElement().addEventListener('keydown', this.keydown_handler);
	}

	private textChanging_handler(): void {
		this.refresh();
	}
	private textChanged_handler(): void {
		this.refresh();
	}

	private keydown_handler(e: KeyboardEvent): void {
		const inputDisplay: ComboBoxLabelDisplay = this.getLabelDisplay() as ComboBoxLabelDisplay;
		if (e.keyCode == 27) { //ESC
			e.stopImmediatePropagation();
			e.stopPropagation();
			e.preventDefault();
			this.hide();
		} else if (e.keyCode == 13) { //ENTER
			e.stopImmediatePropagation();
			e.stopPropagation();
			e.preventDefault();
			//fuck
			if (!inputDisplay.getInputedText() && !this.getHoverDataSource()) {
				this.doSetSelection(null, true);
			} else if (this.getHoverDataSource()) {
				this.doSetSelection(this.getHoverDataSource(), true);
			}
			this.hide();
		} else if (e.keyCode == 38 || e.keyCode == 40) { // UP DOWN
			if (this.itemRendererList.length == 0) {
				return;
			}
			e.stopImmediatePropagation();
			e.stopPropagation();
			e.preventDefault();
			if (this.getHoverDataSource()) {
				let has: boolean = false;
				for (let i = 0; i < this.itemRendererList.length; i++) {
					if (this.itemRendererList[i].data == this.getHoverDataSource()) {
						has = true;
						break;
					}
				}
				if (!has) {
					this.setHover(0);
					this.ensureItemVisible(0);
				}
			}
			let index = this.getHoverIndex();
			if (e.keyCode == 38) {
				index--;
			} else if (e.keyCode == 40) {
				index++;
			}
			if (index < 0) {
				index = this.itemRendererList.length - 1;
			} else if (index >= this.itemRendererList.length) {
				index = 0;
			}
			this.setHover(index);
			this.ensureItemVisible(index);
		}
	}

	private filterItemds(): IDropDownTextDataSource[] {
		const inputDisplay: ComboBoxLabelDisplay = this.getLabelDisplay() as ComboBoxLabelDisplay;
		const inputedText = inputDisplay.getInputedText();
		if (!inputedText) {
			return this.getDatas();
		}
		const newDatas: IDropDownTextDataSource[] = [];
		for (let i = 0; i < this.getDatas().length; i++) {
			const text: string = this.getDatas()[i].data;
			if (text.toLocaleLowerCase().indexOf(inputedText.toLocaleLowerCase()) != -1) {
				newDatas.push(this.getDatas()[i]);
			}
		}
		return newDatas;
	}
	/**
	 * 得到要显示的数据，子类可以重写，可以进行过滤筛选等
	 */
	protected getDatasForRender(showInit:boolean): IDropDownTextDataSource[] {
		if(showInit){
			return super.getDatasForRender(showInit);
		}else{
			return this.filterItemds();
		}
	}

	/**
	 * 刷新之后做的事情，子类可进行重写
	 * @param datas 
	 */
	protected doAfterRendererItems(datas: IDropDownTextDataSource[], itemsContainer: HTMLElement): void {
		super.doAfterRendererItems(datas, itemsContainer);
		if (datas.length == 0) {
			this.itemsContainer.appendChild(this.emptyDisplay);
		}
		const inputDisplay: ComboBoxLabelDisplay = this.getLabelDisplay() as ComboBoxLabelDisplay;
		if (!inputDisplay.getInputedText()) {
			this.setHover(-1);
		} else {
			if (this.itemRendererList.length != 0) {
				let has: boolean = false;
				if (this.getHoverDataSource()) {
					for (let i = 0; i < this.itemRendererList.length; i++) {
						if (this.itemRendererList[i].data == this.getHoverDataSource()) {
							has = true;
							break;
						}
					}
				}
				if (!has) {
					this.setHover(0);
					this.ensureItemVisible(0);
				}
			}
		}
	}
	protected hide() {
		super.hide();
		this.getLabelDisplay().getElement().blur();
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
		return new ComboBoxLabelDisplay();
	}
}
