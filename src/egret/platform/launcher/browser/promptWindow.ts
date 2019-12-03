import { InnerWindow } from 'egret/platform/innerwindow/browser/innerWindow';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';

import './media/prompt.css';
import { addClass } from 'egret/base/common/dom';
import { localize } from 'egret/base/localization/nls';
/**
 * 登录提示
 */
export class PromptWindow extends InnerWindow {
	constructor() {
		super();
		this.titleBarVisible = false;
	}

	/**
	 * 重载父类的render方法，进行内容渲染
	 * @param contentGroup 
	 */
	public render(contentGroup: HTMLElement): void {
		super.render(contentGroup);
		contentGroup.style.padding = '15px 15px';
		const titleDisplay = document.createElement('div');
		addClass(titleDisplay,'login-prompt-title');

		const contentDisplay = document.createElement('div');
		addClass(contentDisplay,'login-prompt-content');

		contentGroup.appendChild(titleDisplay);
		contentGroup.appendChild(contentDisplay);

		titleDisplay.innerText = localize('login.title','Please wait...');
		contentDisplay.innerText = localize('login.content','Please log in in Egret Launcher');
	}
	/**
	 * 执行esc
	 */
	public doEsc(): void {
		//do nothing
	}
	/**
	 * 释放
	 */
	public dispose() {
		super.dispose();
	}
}