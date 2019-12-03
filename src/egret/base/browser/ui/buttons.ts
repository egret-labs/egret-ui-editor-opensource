import { Event, Emitter } from '../../common/event';
import { IDisposable, dispose } from '../../common/lifecycle';
import { addClass, removeClass } from '../../common/dom';
import { isMacintosh } from '../../common/platform';
import { IUIBase, getTargetElement } from './common';

import './media/buttons.css';

/**
 * 按钮基类
 */
export class ButtonBase implements IUIBase, IDisposable {
	protected _onClick: Emitter<ButtonBase>;

	private container: HTMLElement;
	protected el: HTMLElement;

	private _cancelBubble: boolean = false;

	public set cancelBubble(_canbelBubble: boolean) {
		this._cancelBubble = _canbelBubble;
	}

	/**
	 * 核心dom对象
	 */
	public getElement(): HTMLElement {
		return this.el;
	}
	protected toDisposes: IDisposable[] = [];
	constructor(container: HTMLElement | IUIBase = null) {
		this.click_handler = this.click_handler.bind(this);
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
		this._onClick = new Emitter<ButtonBase>();

		this.container.appendChild(this.el);
		this.initView();
		this.registerListeners();
		this.enable();
		this.active();
	}

	/**
	 * 注册时间监听器
	 * @param element 
	 */
	protected registerListeners(): void {
		this.el.addEventListener('click', this.click_handler,true);
		this.toDisposes.push({
			dispose: () => {
				this.el.removeEventListener('click', this.click_handler);
			}
		});
	}

	protected click_handler(e: MouseEvent): void {
		if (this.enabled) {
			if (this._cancelBubble) {
				if (e.stopPropagation) {
					e.stopPropagation();
				}
			}
			this._onClick.fire(this);
		}
	}

	/**
	 * 初始化内容
	 * @param element 
	 */
	protected initView(): void {
		addClass(this.el, 'egret-button');
	}
	/**
	 * 按钮点击事件
	 */
	public get onClick(): Event<ButtonBase> {
		return this._onClick.event;
	}

	protected actived: boolean = false;
	/**
	 * 激活
	 */
	public active(): void {
		this.actived = true;
		removeClass(this.el, 'inactive');
		addClass(this.el, 'active');
	}
	/**
	 * 失活
	 */
	public inactive(): void {
		this.actived = false;
		removeClass(this.el, 'active');
		addClass(this.el, 'inactive');
	}
	private _toolTip: string = '';
	/**
	 * tips提示
	 */
	public get toolTip(): string {
		return this._toolTip;
	}
	public set toolTip(value: string) {
		this._toolTip = value;
		this.el.title = value;
	}

	private _enabled: boolean = true;

	/**
	 * 生效按钮
	 */
	public enable(): void {
		this._enabled = true;
		removeClass(this.el, 'disable');
	}

	/**
	 * 获取启用状态
	 */
	public get enabled(): boolean {
		return this._enabled;
	}
	/**
	 * 禁用按钮
	 */
	public disable(): void {
		this._enabled = false;
		removeClass(this.el, 'enable');
		addClass(this.el, 'disable');
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
		dispose(this.toDisposes);
	}

}

/**
 * 图片按钮
 */
export class IconButton extends ButtonBase {
	constructor(container: HTMLElement | IUIBase = null) {
		super(container);
		this.size = 22;
		this.iconSize = 15;
	}
	/**
	 * 初始化内容
	 * @param element 
	 */
	protected initView(): void {
		super.initView();
		addClass(this.el, 'icon');
	}

	private _iconClass: string = '';
	private _oldIconClass: string = '';
	/**
	 * 图标的类名
	 */
	public get iconClass(): string {
		return this._iconClass;
	}
	public set iconClass(value: string) {
		removeClass(this.el, this._oldIconClass);
		this._iconClass = value;
		this._oldIconClass = this._iconClass;
		addClass(this.el, this._iconClass);
		this.doSetSize(this.size);
	}

	private _size: number = 0;
	/**
	 * 按钮的尺寸
	 */
	public get size(): number {
		return this._size;
	}
	public set size(value: number) {
		this._size = value;
		this.doSetSize(this._size);
	}

	protected doSetSize(value: number): void {
		this.el.style.width = value + 'px';
		this.el.style.height = value + 'px';
	}

	private _iconSize: number = 0;
	/**
	 * 图标的尺寸
	 */
	public get iconSize(): number {
		return this._iconSize;
	}
	public set iconSize(value: number) {
		this._iconSize = value;
		this.doSetIconSize(this._iconSize);
	}

	protected doSetIconSize(value: number): void {
		this.el.style.backgroundSize = value + 'px' + ' ' + value + 'px';
	}
}

/**
 * 系统按钮
 */
export class SystemButton extends ButtonBase {
	/**
	 * 初始化内容
	 * @param element 
	 */
	protected initView(): void {
		super.initView();
		addClass(this.el, 'system');
		if (isMacintosh) {
			addClass(this.el, 'mac');
		} else {
			addClass(this.el, 'win');
		}

	}

	private _isDefault: boolean = false;
	/**
	 * 是否是默认按钮
	 */
	public get isDefault(): boolean {
		return this._isDefault;
	}
	public set isDefault(value: boolean) {
		this._isDefault = value;
		if (this._isDefault) {
			addClass(this.el, 'default');
		} else {
			removeClass(this.el, 'default');
		}
	}

	private _label: string = '';
	/**
	 * 按钮的显示文本
	 */
	public get label(): string {
		return this._label;
	}
	public set label(value: string) {
		this._label = value;
		this.el.innerText = this._label;
	}
}

/**
 * 两态图标按钮
 */
export class ToggleIconButton extends IconButton {

	private _onSelectedChanged: Emitter<ToggleIconButton>;
	constructor(container: HTMLElement | IUIBase = null) {
		super(container);
		this.doSetSelected(false);
	}
	/**
	 * 创建
	 * @param container 
	 */
	public create(container: HTMLElement | IUIBase): void {
		super.create(container);
		this._onSelectedChanged = new Emitter<ToggleIconButton>();
		this.toDisposes.push(this.onClick(target => this.toggleIconBtnClick_handler()));
	}

	/**
	 * 选择改变事件
	 */
	public get onSelectedChanged(): Event<ToggleIconButton> {
		return this._onSelectedChanged.event;
	}

	private toggleIconBtnClick_handler(): void {
		this.doSetSelected(!this.selected, true);
	}

	private _selected: boolean = false;
	/**
	 * 是否是选择状态
	 */
	public get selected(): boolean {
		return this._selected;
	}
	public set selected(value: boolean) {
		if (this._selected == value) {
			return;
		}
		this.doSetSelected(value);
	}

	protected doSetSelected(value: boolean, fire: boolean = false): void {
		this._selected = value;
		if (this._selected) {
			addClass(this.el, 'selected');
		} else {
			removeClass(this.el, 'selected');
		}
		if (fire) {
			this._onSelectedChanged.fire(this);
		}
	}
}


/**
 * 两态按钮
 */
export class ToggleButton extends ToggleIconButton {

	private labelDisplay: HTMLSpanElement;

	constructor(container: HTMLElement | IUIBase = null) {
		super(container);
	}

	/**
	 * 初始化内容
	 * @param element 
	 */
	protected initView(): void {
		super.initView();
		addClass(this.el, 'label');
		this.labelDisplay = document.createElement('span');
		this.el.appendChild(this.labelDisplay);
		this.labelDisplay.innerText = this._label;
	}

	private _label: string = '';
	/**
	 * 按钮的显示文本
	 */
	public get label(): string {
		return this._label;
	}
	public set label(value: string) {
		this._label = value;
		if (this.labelDisplay) {
			this.labelDisplay.innerText = this._label;
		}
	}

	protected doSetSize(value: number): void {
		this.el.style.height = value + 'px';
		if (this.iconClass) {
			this.el.style.paddingLeft = value + 'px';
		} else {
			this.el.style.paddingLeft = '';
		}
		this.el.style.lineHeight = value + 'px';
	}

	protected doSetIconSize(value: number): void {
		this.el.style.backgroundSize = value + 'px' + ' ' + value + 'px';
		const offsetLeft: number = (this.size - this.iconSize) / 2;
		this.el.style.backgroundPositionX = offsetLeft + 'px';
	}
}