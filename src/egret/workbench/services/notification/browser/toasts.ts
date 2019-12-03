import { addClass, removeClass } from 'egret/base/common/dom';

import './media/toast.css';

/**
 * Toast 提示框
 */
export class Toast{
	/**
	 * 消失回调
	 */
	public onHided:()=>void = null;
	private container:HTMLElement;
	private span:HTMLSpanElement;
	constructor(){
		this.container = document.createElement('div');
		this.span = document.createElement('span');
		addClass(this.container,'toast-container');
		addClass(this.span,'text-display');
	}
	/**
	 * 颜色
	 */
	public color:string = '#ffffff';

	/**
	 * 显示内容，默认持续时间3秒
	 * @param content 内容
	 * @param duration 持续时间
	 */
	public show(content:string | HTMLElement,duration:number = 3000):void{
		this.container.innerHTML = '';
		if(content instanceof HTMLElement){
			this.container.appendChild(content);
		}else{
			this.container.appendChild(this.span);
			this.span.innerText = content;
			this.span.style.color = this.color;
		}
		document.body.appendChild(this.container);
		this.container.style.display = 'block';
		setTimeout(() => {
			addClass(this.container,'show');
		}, 1);
		setTimeout(() => {
			removeClass(this.container,'show');
			setTimeout(() => {
				this.container.style.display = null;
				if(this.onHided){
					this.onHided();
				}
			}, 200);
		}, duration);
	}
}