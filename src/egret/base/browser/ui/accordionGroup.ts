import { IUIBase, getTargetElement } from './common';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { addClass, removeClass } from 'egret/base/common/dom';
import { ToggleButton } from './buttons';

import './media/accordion.css';
import { Emitter, Event } from 'egret/base/common/event';
import { setIntervalPro } from './core/animations';



/**
 * 折叠面板容器数据源
 */
export interface DataSource {
	/**
	 * 显示标签
	 */
	label: string;
	/**
	 * 唯一标志
	 */
	id: string;
	/**
	 * 内容
	 */
	content: IUIBase | HTMLElement;
}

/**
 * 单一面板
 */
class AccordionGroupPanel implements IUIBase, IDisposable {
	protected el: HTMLElement;
	private container: HTMLElement;
	private titleBtn: ToggleButton;
	private contentContainer: HTMLElement;
	private toDisposes: IDisposable[];
	private _onResize:Emitter<void>;
	constructor(container: HTMLElement | IUIBase = null) {
		this.el = document.createElement('div');
		this.titleBtn = new ToggleButton();
		this.contentContainer = document.createElement('div');
		this._onResize = new Emitter<void>();
		this.toDisposes = [];
		if (container) {
			this.create(container);
		}
	}

	public get onResize():Event<void>{
		return this._onResize.event;
	}

	/**
	 * 创建
	 * @param container 
	 */
	public create(container: HTMLElement | IUIBase): void {
		addClass(this.el, 'egret-according-panel');
		this.container = getTargetElement(container);
		this.container.appendChild(this.el);
		this.titleBtn.create(this.el);
		this.titleBtn.size = 26;
		const arrow = document.createElement('div');
		addClass(arrow, 'arrow');
		this.titleBtn.getElement().appendChild(arrow);
		addClass(this.titleBtn.getElement(), 'accordion-header');
		this.el.appendChild(this.contentContainer);
		addClass(this.contentContainer, 'egret-according-content-container');
		addClass(this.contentContainer, 'hide');
		this.toDisposes.push(this.titleBtn.onSelectedChanged(() => this.titleSelectedChanged_handler()));

		this.contentContainer.style.height = '0px';
	}

	private titleSelectedChanged_handler(): void {
		if (this.titleBtn.selected) {
			this.open();
		} else {
			this.close();
		}
	}

	private _opened:boolean = false;
	private contentHeightCache = 0;
	/**
	 * 打开面板
	 */
	public open(): void {
		this._opened = true;
		if (!this.titleBtn.selected) {
			this.titleBtn.selected = true;
		}
		if (this.getContent()) {
			this.contentContainer.style.height = this.getContent().offsetHeight + 'px';
			this.contentHeightCache = this.getContent().offsetHeight;
		} else {
			this.contentContainer.style.height = '0px';
		}
		this.fireResize();
	}

	/**
	 * 关闭面板
	 */
	public close(): void {
		this._opened = false;
		if (this.titleBtn.selected) {
			this.titleBtn.selected = false;
		}
		this.contentContainer.style.height = '0px';
		this.fireResize();
	}
	/**
	 * 更新高度
	 */
	public updateHeight():void{
		if(this._opened && this.getContent()){
			if(this.getContent().offsetHeight != this.contentHeightCache){
				addClass(this.contentContainer, 'noAnimation');
				this.contentContainer.style.height = this.getContent().offsetHeight + 'px';
				this.contentHeightCache = this.getContent().offsetHeight;
				this.fireResizeDirect();
				setTimeout(() => {
					removeClass(this.contentContainer, 'noAnimation');
				}, 1);
			}
		}
	}

	private containerHeightCache:number = -1;
	private fireResize():void{
		setIntervalPro(()=>{
			if(this.containerHeightCache != this.contentContainer.offsetHeight){
				this.containerHeightCache = this.contentContainer.offsetHeight;
				this._onResize.fire();
			}
		},1000/60,500);
	}

	private fireResizeDirect():void{
		this._onResize.fire();
	}
	/**
	 * 折叠面板的标题
	 */
	public get title(): string {
		return this.titleBtn.label;
	}
	public set title(value: string) {
		this.titleBtn.label = value;
	}

	private _id: string;
	/**
	 * 面板id
	 */
	public get id(): string {
		return this._id;
	}
	public set id(value: string) {
		this._id = value;
	}

	private _content: IUIBase | HTMLElement;
	/**
	 * 内容
	 */
	public get content(): IUIBase | HTMLElement {
		return this._content;
	}
	public set content(value: IUIBase | HTMLElement) {
		this._content = value;
		this.contentContainer.innerHTML = '';
		if (this._content) {
			this.contentContainer.appendChild(this.getContentCage());
		}
	}

	private getContent(): HTMLElement {
		if (!this._content) {
			return null;
		}
		return getTargetElement(this._content);
	}

	private _contentCage:HTMLElement;
	private getContentCage():HTMLElement{
		if(!this._contentCage){
			this._contentCage = document.createElement('div');
			this._contentCage.appendChild(getTargetElement(this._content));
		}
		return this._contentCage;
	}

	/**
	 * 核心dom对象
	 */
	public getElement(): HTMLElement {
		return this.el;
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		this.el.remove();
		this.container = null;
		dispose(this.toDisposes);
	}
}

/**
 * 折叠面板容器
 */
export class AccordionGroup implements IUIBase, IDisposable {
	protected el: HTMLElement;
	private container: HTMLElement;
	private _onResize:Emitter<void>;
	constructor(container: HTMLElement | IUIBase = null) {
		this.el = document.createElement('div');
		this._onResize = new Emitter<void>();
		if (container) {
			this.create(container);
		}
	}
	/**
	 * 尺寸可能改变了的事件
	 */
	public get onResize():Event<void>{
		return this._onResize.event;
	}

	/**
	 * 创建
	 * @param container 
	 */
	public create(container: HTMLElement | IUIBase): void {
		addClass(this.el, 'egret-according-group');
		this.container = getTargetElement(container);
		this.container.appendChild(this.el);
	}
	/**
	 * 核心dom对象
	 */
	public getElement(): HTMLElement {
		return this.el;
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
	/**
	 * 重新布局
	 */
	public layout():void{
		for(let i = 0;i<this.panels.length;i++){
			this.panels[i].updateHeight();
		}
	}

	private panels: AccordionGroupPanel[] = [];
	private toDisposes:IDisposable[] = [];
	private doSetDataProvider(value: DataSource[]): void {
		this.clearItemds();
		for (let i = 0; i < value.length; i++) {
			const panel = new AccordionGroupPanel();
			panel.title = value[i].label;
			panel.id = value[i].id;
			panel.content = value[i].content;
			panel.create(this);
			this.toDisposes.push(panel.onResize(()=>this.panelResize_handler()));
			this.panels.push(panel);
		}
	}

	private clearItemds(): void {
		while (this.panels.length > 0) {
			dispose(this.panels.pop());
		}
		dispose(this.toDisposes);
	}
	/**
	 * 打开指定的面板，如果不设置id则全部打开
	 * @param ids 
	 */
	public open(...ids: string[]): void {
		setTimeout(() => {
			if (ids.length == 0) {
				for (let i = 0; i < this.panels.length; i++) {
					this.panels[i].open();
				}
			} else {
				for (let i = 0; i < ids.length; i++) {
					const panel = this.getPanelById(ids[i]);
					if (panel) {
						panel.open();
					}
				}
			}
		}, 1);
	}
	/**
	 * 关闭指定的面板，如果不设置id则全部关闭
	 * @param ids 
	 */
	public close(...ids: string[]): void {
		setTimeout(() => {
			if (ids.length == 0) {
				for (let i = 0; i < this.panels.length; i++) {
					this.panels[i].close();
				}
			} else {
				for (let i = 0; i < ids.length; i++) {
					const panel = this.getPanelById(ids[i]);
					if (panel) {
						panel.close();
					}
				}
			}
		}, 1);
	}

	private sizeChangedFlag:boolean = false;
	private panelResize_handler():void{
		if(this.sizeChangedFlag){
			return;
		}
		this.sizeChangedFlag = true;
		setTimeout(() => {
			this.sizeChangedFlag = false;
			this._onResize.fire();
		}, 60/1000);
	}

	private getPanelById(id: string): AccordionGroupPanel {
		for (let i = 0; i < this.panels.length; i++) {
			if (this.panels[i].id == id) {
				return this.panels[i];
			}
		}
		return null;
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.clearItemds();
		this.dataProvider = null;
		this.el.remove();
		this.container = null;
	}
}