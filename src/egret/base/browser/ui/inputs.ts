import { IDisposable } from 'egret/base/common/lifecycle';
import { addClass } from 'egret/base/common/dom';
import { Emitter, Event } from 'egret/base/common/event';
import { IUIBase, getTargetElement } from './common';
import { trim } from '../../common/strings';
import { ContextView, AnchorAlignment } from './contextview';
import * as dom from 'vs/base/browser/dom';
import { renderFormattedText, renderText, FormattedTextRenderOptions } from 'vs/base/browser/formattedTextRenderer';

import './media/inputs.css';
const $ = dom.$;


export interface IInputValidator {
	(value: string): IMessage;
}

export interface IMessage {
	content: string;
	formatContent?: boolean; // defaults to false
	type?: MessageType;
}

export interface IInputValidationOptions {
	validation: IInputValidator;
	showMessage?: boolean;
}

export enum MessageType {
	INFO = 1,
	WARNING = 2,
	ERROR = 3
}

/**
 * 按钮基类
 */
export class TextInput implements IUIBase, IDisposable {

	protected _onValueChanging: Emitter<string>;
	protected _onValueChanged: Emitter<string>;
	protected _onFocusChanged: Emitter<boolean>;
	/**
	 * 输入过程中内容过滤
	 */
	public onChangingFilter: (value: string) => string;
	/**
	 * 输入完成内容过滤
	 */
	public onChangedFilter: (value: string) => string;

	/**
	 * 可写
	 */
	public set readonly(_readonly: boolean) {
		this.inputElement.readOnly = _readonly;
		if (_readonly) {
			this.inputElement.style.cursor = '';
		}
	}

	/**
	 * 可读
	 */
	public get readonly(): boolean {
		return this.inputElement.readOnly;
	}

	private container: HTMLElement;
	protected inputElement: HTMLInputElement;
	private message: IMessage;
	private validation: IInputValidator;
	private state = 'idle';

	constructor(container: HTMLElement | IUIBase = null, validationOptions?: IInputValidationOptions) {
		this.textChanged_handler = this.textChanged_handler.bind(this);
		this.textChanging_handler = this.textChanging_handler.bind(this);
		this.keydown_handler = this.keydown_handler.bind(this);
		this.focus_handler = this.focus_handler.bind(this);
		this.blur_handler = this.blur_handler.bind(this);
		this.dorp_handler = this.dorp_handler.bind(this);
		this.inputElement = document.createElement('input');

		this._onValueChanging = new Emitter<string>();
		this._onValueChanged = new Emitter<string>();
		this._onFocusChanged = new Emitter<boolean>();

		if (validationOptions) {
			this.validation = validationOptions.validation;
		}

		this.height = 24;
		this.paddingHorizontal = 4;
		this.fontSize = 13;
		this.width = '100%';

		if (container) {
			this.create(container);
		}
	}

	/**
	 * 样式
	 */
	public get style(): CSSStyleDeclaration {
		return this.inputElement.style;
	}


	/**
	 * 创建
	 * @param container 
	 */
	public create(container: HTMLElement | IUIBase): void {
		this.container = dom.append(getTargetElement(container), $('.monaco-inputbox.idle'));
		this.container.appendChild(this.inputElement);
		this.initView();
		this.registerListeners();
	}
	/**
	 * 核心dom对象
	 */
	public getElement(): HTMLElement {
		return this.inputElement;
	}

	/**
	 * 值改变过程
	 */
	public get onValueChanging(): Event<string> {
		return this._onValueChanging.event;
	}
	/**
	 * 值改变
	 */
	public get onValueChanged(): Event<string> {
		return this._onValueChanged.event;
	}

	public get onFocusChanged(): Event<boolean> {
		return this._onFocusChanged.event;
	}

	private _prompt: string = '';
	/**
	 * 提示文本
	 */
	public get prompt(): string {
		return this._prompt;
	}
	public set prompt(value: string) {
		this._prompt = value;
		this.inputElement.placeholder = value;
	}


	public set title(_t: string) {
		this.inputElement.title = _t;
	}

	public get title(): string {
		return this.inputElement.title;
	}
	/**
	 * 初始化内容
	 * @param element 
	 */
	protected initView(): void {
		this.inputElement.type == 'text';
		addClass(this.inputElement, 'egret-text-input');
	}

	protected registerListeners(): void {
		this.inputElement.addEventListener('input', this.textChanging_handler);
		this.inputElement.addEventListener('change', this.textChanged_handler);
		this.inputElement.addEventListener('keydown', this.keydown_handler);
		this.inputElement.addEventListener('focus', this.focus_handler);
		this.inputElement.addEventListener('blur', this.blur_handler);
		if (this.container) {
			this.container.addEventListener('drop', this.dorp_handler);
		}
	}

	private textChanging_handler(): void {
		this.processTextChanging(this.text);
	}
	private textChanged_handler(): void {
		this.processTextChanged(this.text);
	}

	private processTextChanging(text: string): void {
		if (this.onChangingFilter) {
			this.text = this.onChangingFilter(text);
		} else {
			this.text = text;
		}
		this.validate();

		if (this.state === 'open') {
			ContextView.layout();
		}
		this._onValueChanging.fire(this.text);
	}

	private processTextChanged(text: string): void {
		if (this.onChangedFilter) {
			this.text = this.onChangedFilter(text);
		} else {
			this.text = text;
		}
		this._onValueChanged.fire(this.text);
	}
	private keydown_handler(e: KeyboardEvent): void {
		if (e.keyCode == 13) {
			this.inputElement.blur();
		}
	}

	private focus_handler(): void {
		dom.addClass(this.container, 'synthetic-focus');
		this._showMessage();
		this.onFocus();
		this._onFocusChanged.fire(true);
	}

	private blur_handler(): void {
		dom.removeClass(this.container, 'synthetic-focus');
		this._hideMessage();
		this.onBlur();
		this._onFocusChanged.fire(false);
	}

	private dorp_handler(e: DragEvent): void {
		let data = e.dataTransfer.getData('text');
		if (!data) {
			return;
		}
		if (this.text !== data) {
			this.processTextChanging(data);
			this.processTextChanged(this.text);
		}
	}

	protected onFocus(): void {
	}

	protected onBlur(): void {

	}

	private _height: number = 20;
	/**
	 * 标签高度
	 */
	public get height(): number {
		return this._height;
	}
	public set height(value: number) {
		this._height = value;
		this.inputElement.style.height = value + 'px';
		this.inputElement.style.lineHeight = value + 'px';
	}

	private _width: number | string;
	/**
	 * 宽度
	 */
	public get width(): number | string {
		return this._width;
	}
	public set width(value: number | string) {
		this._width = value;
		if (typeof value == 'string') {
			this.inputElement.style.width = value;
		} else {
			this.inputElement.style.width = value + 'px';
		}
	}

	private _paddingHorizontal: number = 0;
	/**
	 * 水平边距
	 */
	public get paddingHorizontal(): number {
		return this._paddingHorizontal;
	}
	public set paddingHorizontal(value: number) {
		this._paddingHorizontal = value;
		this.inputElement.style.paddingLeft = value + 'px';
		this.inputElement.style.paddingRight = value + 'px';
	}

	private _paddingVertical: number = 0;
	/**
	 * 竖直边距
	 */
	public get paddingVertical(): number {
		return this._paddingVertical;
	}
	public set paddingVertical(value: number) {
		this._paddingVertical = value;
		this.inputElement.style.paddingTop = value + 'px';
		this.inputElement.style.paddingBottom = value + 'px';
	}

	private _fontSize: number = 13;
	/**
	 * 字号
	 */
	public get fontsSize(): number {
		return this._fontSize;
	}
	public set fontSize(value: number) {
		this._fontSize = value;
		this.inputElement.style.fontSize = value + 'px';
	}

	/**
	 * 输入框文本内容
	 */
	public get text(): string {
		return this.inputElement.value;
	}
	public set text(value: string) {
		if (this.inputElement.value !== value) {
			this.inputElement.value = value;
		}
	}

	public focus(): void {
		this.inputElement.focus();
	}

	public blur(): void {
		this.inputElement.blur();
	}


	public hasFocus(): boolean {
		return document.activeElement === this.inputElement;
	}

	public showMessage(message: IMessage, force?: boolean): void {
		this.message = message;

		dom.removeClass(this.container, 'idle');
		dom.removeClass(this.container, 'info');
		dom.removeClass(this.container, 'warning');
		dom.removeClass(this.container, 'error');
		dom.addClass(this.container, this.classForType(message.type));

		if (this.hasFocus() || force) {
			this._showMessage();
		}
	}

	public hideMessage(): void {
		this.message = null;

		dom.removeClass(this.container, 'info');
		dom.removeClass(this.container, 'warning');
		dom.removeClass(this.container, 'error');
		dom.addClass(this.container, 'idle');

		this._hideMessage();
	}

	public isInputValid(): boolean {
		return !!this.validation && !this.validation(this.text);
	}

	public validate(): boolean {
		let result: IMessage = null;

		if (this.validation) {
			result = this.validation(this.text);

			if (!result) {
				this.inputElement.removeAttribute('aria-invalid');
				this.hideMessage();
			} else {
				this.inputElement.setAttribute('aria-invalid', 'true');
				this.showMessage(result);
			}
		}

		return !result;
	}

	private classForType(type: MessageType): string {
		switch (type) {
			case MessageType.INFO: return 'info';
			case MessageType.WARNING: return 'warning';
			default: return 'error';
		}
	}

	private _showMessage(): void {
		if (!this.message) {
			return;
		}

		let div: HTMLElement;
		let layout = () => div.style.width = dom.getTotalWidth(this.container) + 'px';

		ContextView.show({
			getAnchor: () => this.container,
			anchorAlignment: AnchorAlignment.RIGHT,
			render: (container: HTMLElement) => {
				if (!this.message) {
					return null;
				}

				div = dom.append(container, $('.monaco-inputbox-container'));
				layout();

				const renderOptions: FormattedTextRenderOptions = {
					inline: true,
					className: 'monaco-inputbox-message'
				};

				const spanElement = (this.message.formatContent
					? renderFormattedText(this.message.content, renderOptions)
					: renderText(this.message.content, renderOptions));
				dom.addClass(spanElement, this.classForType(this.message.type));

				dom.append(div, spanElement);

				return null;
			},
			onHide: () => {
				this.state = 'closed';
			},
			layout: layout
		});

		this.state = 'open';
	}

	private _hideMessage(): void {
		if (this.state !== 'open') {
			return;
		}

		this.state = 'idle';

		ContextView.hide();
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.inputElement.remove();
		this.inputElement.removeEventListener('input', this.textChanging_handler);
		this.inputElement.removeEventListener('change', this.textChanged_handler);
		this.inputElement.removeEventListener('keydown', this.keydown_handler);
		this.inputElement.removeEventListener('focus', this.focus_handler);
		this.inputElement.removeEventListener('blur', this.blur_handler);
		if (this.container) {
			this.container.removeEventListener('drop', this.dorp_handler);
		}
		this.container = null;
	}
}

/**
 * 数字输入框
 */
export class NumberInput extends TextInput {

	protected _onRegulateValue: Emitter<string>;
	/**
	 * 是否支持百分号，默认支持
	 */
	public supportPercent: boolean = true;
	/**
	 * 是否支持小数，默认支持
	 */
	public supportDecimal: boolean = true;
	private _supportRegulate: boolean = true;
	/**
	 * 是否支持鼠标调节，默认支持
	 */
	public get supportRegulate(): boolean {
		return this._supportRegulate;
	}
	public set supportRegulate(value: boolean) {
		this._supportRegulate = value;
		if (this._supportRegulate && !this.readonly) {
			this.inputElement.style.cursor = 'col-resize';
		} else {
			this.inputElement.style.cursor = '';
		}
	}
	/**
	 * 鼠标拖拽调节数值的跨度
	 */
	public regulateStep: number = 0.1;
	/**
	 * 开始执行拖拽交互的相应距离
	 */
	public regulateInteractiveOffset: number = 3;
	/**
	 * 最大值，默认不设置最大值
	 */
	public maxValue: number = NaN;
	/**
	 * 最小值，默认不设置最小值
	 */
	public minValue: number = NaN;




	constructor(container: HTMLElement | IUIBase = null) {
		super(container);
		this.supportRegulate = this.supportRegulate;
		this._onRegulateValue = new Emitter<string>();
	}

	/**
	 * 鼠标拖拽下的值改变
	 */
	public get onRegulateValue(): Event<string> {
		return this._onRegulateValue.event;
	}


	/**
	 * 创建
	 * @param container 
	 */
	public create(container): void {
		super.create(container);
		this.onChangingFilter = value => {
			return this.doChangingFilter(value);
		};
		this.onChangedFilter = value => {
			return this.doChangedFilter(value);
		};
	}

	private doChangingFilter(value: string): string {
		value = trim(value);
		if (value.length == 0) {
			return '';
		}
		let tmpValue: string = '';
		//先过滤一遍非法字符，且只保留一个小数点
		let hasPoint: boolean = false;
		for (var i = 0; i < value.length; i++) {
			if (this.supportDecimal) {
				if (value.charAt(i) == '.') {
					if (!hasPoint) {
						hasPoint = true;
						tmpValue += '.';
					}
				}
			}
			if (
				(value.charCodeAt(i) >= 48 && value.charCodeAt(i) <= 57) ||
				value.charAt(i) == '-' ||
				(this.supportPercent && value.charAt(i) == '%')
			) {
				tmpValue += value.charAt(i);
			}
		}
		value = tmpValue;
		tmpValue = '';
		//处理负号和百分号不能在中间的情况
		for (var i = 0; i < value.length; i++) {
			if (value.charAt(i) == '-' && i == 0) {
				tmpValue += value.charAt(i);
			}
			if (value.charAt(i) == '%' && i == value.length - 1) {
				tmpValue += value.charAt(i);
			}
			if (
				(value.charCodeAt(i) >= 48 && value.charCodeAt(i) <= 57) ||
				value.charAt(i) == '.'
			) {
				tmpValue += value.charAt(i);
			}
		}
		value = tmpValue;
		tmpValue = '';
		if (value.length == 0) {
			return '';
		}
		//处理小数点开始的情况
		if (value.charAt(0) == '.') {
			value = '0' + value;
		}
		//处理负号和小数点连起来的情况
		if (value.length >= 2 && value.charAt(0) == '-' && value.charAt(1) == '.') {
			value = '-0.' + value.slice(2);
		}
		//处理百分号前面不是数字的可能
		if (value.length == 1 && value.charAt(0) == '%') {
			value = '0%';
		}
		if (value.length > 1 && value.charAt(value.length - 1) == '%') {
			if (value.charAt(value.length - 2) == '.') {
				value = value.slice(0, value.length - 2) + '%';
			}
		}
		if (value.length > 1 && value.charAt(value.length - 1) == '%') {
			if (value.charCodeAt(value.length - 2) < 48 || value.charCodeAt(value.length - 2) > 57) {
				value = value.slice(0, value.length - 1) + '0%';
			}
		}
		return value;

	}
	private doChangedFilter(value: string): string {
		value = this.doChangingFilter(value);
		if (!value) {
			return '';
		}
		//处理值域的问题
		let isPercent = false;
		let numValue = 0;
		if (value.charAt(value.length - 1) == '%') {
			isPercent = true;
			numValue = parseFloat(value.slice(0, value.length - 1)) * 100;
		} else {
			numValue = parseFloat(value);
		}
		if (Number.isNaN(numValue)) {
			return '';
		}
		numValue = this.validateRange(numValue);

		let result = '';
		if (isPercent) {
			result = numValue / 100 + '%';
		} else {
			result = numValue + '';
		}
		return result;
	}

	private validateRange(value: number): number {
		if (!isNaN(this.minValue)) {
			if (value < this.minValue) {
				value = this.minValue;
			}
		}
		if (!isNaN(this.maxValue)) {
			if (value > this.maxValue) {
				value = this.maxValue;
			}
		}
		return value;
	}


	protected registerListeners(): void {
		super.registerListeners();
		this.mouseDown_handler = this.mouseDown_handler.bind(this);
		this.mouseMove_handler = this.mouseMove_handler.bind(this);
		this.mouseUp_handler = this.mouseUp_handler.bind(this);
		this.inputElement.addEventListener('mousedown', this.mouseDown_handler);
	}

	private focused = false;

	protected onFocus(): void {
		super.onFocus();
		this.inputElement.style.cursor = '';
		this.focused = true;
	}

	protected onBlur(): void {
		super.onBlur();
		if (this._supportRegulate && !this.readonly) {
			this.inputElement.style.cursor = 'col-resize';
		}
		this.focused = false;
	}

	private startX: number = 0;
	private startY: number = 0;
	private startValue: number = 0;
	private startIsPercent: boolean = false;
	private startRegulated: boolean = false;
	private mouseDown_handler(e: MouseEvent): void {
		if (this.readonly) {
			return;
		}
		this.startX = e.pageX;
		this.startY = e.pageY;
		if (this.supportRegulate) {
			if (this.focused) {
				return;
			}
			const value = this.text;
			this.startIsPercent = false;
			let numValue = 0;
			if (value.charAt(value.length - 1) == '%') {
				this.startIsPercent = true;
				numValue = parseFloat(value.slice(0, value.length - 1)) * 100;
			} else {
				numValue = parseFloat(value);
			}
			this.startValue = numValue;
			this.startRegulated = false;
			document.addEventListener('mousemove', this.mouseMove_handler);
			document.addEventListener('mouseup', this.mouseUp_handler);
			document.body.style.cursor = 'col-resize';
			e.preventDefault();
		}
	}

	private mouseMove_handler(e: MouseEvent): void {
		if (this.readonly) {
			return;
		}
		if (Math.abs(e.pageX - this.startX) >= this.regulateInteractiveOffset || Math.abs(e.pageY - this.startY) >= this.regulateInteractiveOffset) {
			this.startRegulated = true;
		}
		if (!this.startRegulated) {
			return;
		}
		if (isNaN(this.startValue)) {
			this.startValue = 0;
		}
		let currentStep = this.regulateStep;
		if (this.startIsPercent) {
			currentStep *= 100;
		}
		const offsetValue = (e.pageX - this.startX) * currentStep;
		let value: number = this.startValue + offsetValue;
		value = this.validateRange(value);
		if (!this.supportDecimal) {
			value = Math.round(value);
		}
		let result = '';
		if (this.startIsPercent) {
			value = Math.round(value * 10) / 1000;
			result = value + '%';
		} else {
			value = Math.round(value * 1000) / 1000;
			result = value + '';
		}
		this.text = result;
		this._onValueChanging.fire(this.text);
		this._onRegulateValue.fire(this.text);
	}

	private mouseUp_handler(e: MouseEvent): void {
		document.removeEventListener('mousemove', this.mouseMove_handler);
		document.removeEventListener('mouseup', this.mouseUp_handler);
		if (this.supportRegulate) {
			document.body.style.cursor = '';
			if (Math.abs(e.pageX - this.startX) < this.regulateInteractiveOffset && Math.abs(e.pageY - this.startY) < this.regulateInteractiveOffset) {
				this.inputElement.focus();
			} else {
				this._onValueChanged.fire(this.text);
			}
		}
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		super.dispose();
		this.inputElement.removeEventListener('mousedown', this.mouseDown_handler);
		document.removeEventListener('mousemove', this.mouseMove_handler);
		document.removeEventListener('mouseup', this.mouseUp_handler);

	}
}