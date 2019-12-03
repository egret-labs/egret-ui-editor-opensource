import { IUIBase, getTargetElement } from 'egret/base/browser/ui/common';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import './media/labelContainer.css';
import { Label } from 'egret/base/browser/ui/labels';
import { TextInput } from 'egret/base/browser/ui/inputs';
import { SystemButton } from './buttons';

/**
 * 文本 加输入框
 */
export class LabelContainer implements IUIBase, IDisposable {

	protected el: HTMLElement;

	private container: HTMLElement;

	private _label: Label;

	// 文本
	public get label():Label{
		return this._label;
	}

	private _textInput: TextInput;

	//获得输入
	public get inputText():TextInput{
		return this._textInput;
	}


	private _button: SystemButton;

	public set text(_txt: string) {
		this.label.text = _txt;
	}

	public get text(): string {
		return this.label.text;
	}

	public set labelWidth(w: string) {
		this.label.getElement().style.minWidth = w;
	}

	public get labelWidth(): string {
		return this.label.getElement().style.minWidth;
	}

	public set textInput(_txt: string) {
		this._textInput.text = _txt;
	}

	public get textInput(): string {
		return this._textInput.text;
	}


	public set btnTxt(label: string) {
		this._button.label = label;
	}

	public get btnTxt(): string {
		return this._button.label;
	}

	// 文件
	public btnClick: Function;

	/**
	 * 核心dom对象
	 */
	public getElement(): HTMLElement {
		return this.el;
	}

	private idisposes: Array<IDisposable>;
	dispose(): void {
		dispose(this.idisposes);
		this.idisposes = null;
	}

	/**
	 * 创建
	 */
	create(container: HTMLElement | IUIBase): void {
		this.container = getTargetElement(container);
		this.container.appendChild(this.el);
		this.el.className = 'labelContainer';
		this.el.style.display = 'flex';
		this.el.style.width = '420px';
		this.el.style.flexDirection = 'row';
		this.el.style.marginLeft = '15px';
		this.el.style.marginRight = '15px';

		this._label = new Label(this.el);
		let el = this.label.getElement();
		el.style.display = 'inline-block';
		el.style.minWidth = '30px';
		el.style.textAlign = 'right';
		el.style.wordBreak = 'break-all';
		el.style.whiteSpace = 'nowrap';
		el.style.cursor = 'default';
		el.style.flexShrink = '0';
		el.style.fontSize = '13px';

		this._textInput = new TextInput(this.el);

		const inel = this._textInput.getElement();
		inel.style.marginLeft = '10px';
		inel.style.flexGrow = '1';
		inel.style.display = 'flex';
		inel.style.alignItems = 'center';

		this._button = new SystemButton(this.el);
		el = this._button.getElement();
		el.style.marginLeft = '10px';

		this.idisposes.push(this._button.onClick(() => {
			this.btnClick && this.btnClick();
		}));
	}

	/**
	 * 设置样式
	 * @param b 
	 */
	public setBtnBisibility(b: boolean): void {
		this._button.getElement().style.visibility = b ? 'visible' : 'hidden';
	}

	/**
	 * 隐藏  
	 * @param b 
	 */
	public hiddenBtn(b:boolean){
		this._button.getElement().style.display = b ? 'inline' : 'none';
	}

	constructor(container: HTMLElement | IUIBase = null) {
		this.el = document.createElement('div');
		this.idisposes = [];
		if (container) {
			this.create(container);
		}
	}
}