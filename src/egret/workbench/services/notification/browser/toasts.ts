import { addClass, removeClass } from 'egret/base/common/dom';

import './media/toast.css';

/**
 * Toast 提示框
 */
export class Toast {
	/**
	 * 消失回调
	 */
	public onHided: () => void = null;
	private isShow: boolean = false;
	private container: HTMLElement;
	private closeButton: HTMLElement;
	private span: HTMLSpanElement;
	constructor() {
		this.container = document.createElement('div');
		this.span = document.createElement('span');
		this.closeButton = document.createElement('div');
		this.closeButton.style.marginLeft = '6px';
		this.closeButton.style.cursor = 'pointer';
		this.closeButton.onclick = this.close;
		this.closeButton.appendChild(this.createSvg());
		addClass(this.container, 'toast-container');
		addClass(this.span, 'text-display');
	}
	/**
	 * 颜色
	 */
	public color: string = '#ffffff';

	/**
	 * 显示内容，默认持续时间3秒
	 * @param content 内容
	 * @param duration 持续时间
	 */
	public show(content: string | HTMLElement, duration: number = 5000): void {
		this.isShow = true;
		this.container.innerHTML = '';
		if (content instanceof HTMLElement) {
			this.container.appendChild(content);
		} else {
			this.container.appendChild(this.span);
			this.span.innerText = content;
			this.span.style.color = this.color;
		}
		if (duration <= 0) {
			this.container.appendChild(this.closeButton);
		}
		document.body.appendChild(this.container);
		this.container.style.display = 'flex';
		setTimeout(() => {
			addClass(this.container, 'show');
		}, 1);
		if (duration > 0) {
			setTimeout(() => {
				this.close();
			}, duration);
		}
	}

	public dispose(): void {
		this.close();
		this.container.remove();
	}

	private close = (): void => {
		if(!this.isShow){
			return;
		}
		this.isShow = false;
		removeClass(this.container, 'show');
		setTimeout(() => {
			this.container.style.display = null;
			if (this.onHided) {
				this.onHided();
			}
		}, 200);
	}

	private createSvg(): SVGElement {
		const xmlns = 'http://www.w3.org/2000/svg';
		const icon = document.createElementNS(xmlns, 'svg');
		icon.style.width = '10px';
		icon.style.height = '10px';
		icon.setAttributeNS(null, 'x', '0px');
		icon.setAttributeNS(null, 'y', '0px');
		icon.setAttributeNS(null, 'viewBox', '0 0 10.2 10.2');
		const polygon = document.createElementNS(xmlns, 'polygon');
		polygon.style.strokeWidth = '0.1';
		polygon.style.fill = '#bbbbbb';
		polygon.setAttributeNS(null, 'points', '10.2,0.7 9.5,0 5.1,4.4 0.7,0 0,0.7 4.4,5.1 0,9.5 0.7,10.2 5.1,5.8 9.5,10.2 10.2,9.5 5.8,5.1');

		icon.appendChild(polygon);

		return icon;
	}
}