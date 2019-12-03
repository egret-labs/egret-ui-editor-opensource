import * as React from 'react';
import ReactDOM = require('react-dom');
import { InnerBtnWindow } from 'egret/platform/innerwindow/browser/innerWindow';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { InnerButtonType } from 'egret/platform/innerwindow/common/innerWindows';
import { localize } from 'egret/base/localization/nls';
import { Scale9Window } from './Scale9Window';

/**
 * 九宫格面板
 */
export class Scale9WindowPanel extends InnerBtnWindow {
	// 获取图片对象
	private image;
	// 组件引用
	private Scale9Window: Scale9Window;
	// 确认颜色时执行
	public confirm: Function;
	// 取消按钮事件
	public cancel: Function;

	constructor(image, confirmCallback: Function) {
		super();
		// 设置窗体标题
		this.title = localize('scale9WindowPanel.constructor.title', 'Scale9Grid Setting');
		// this.backgroundColor = '#232c33';
		// 设置窗体按钮
		this.initButtons(
			{ label: localize('alert.button.confirm', 'Confirm') },
			{ label: localize('alert.button.cancel', 'Cancel') },
		);


		// 设置图片对象
		this.image = image;
		// 绑定确认回调函数
		this.confirm = confirmCallback;
		// 注册监听事件
		this.registerListeners();
	}


	private disposables: IDisposable[] = [];

	/**
	 * 注册监听事件
	 * @private
	 * @memberof Scale9WindowPanel
	 */
	private registerListeners(): void {
		// 监听按钮点击事件
		let dispose = this.onButtonClick(e => this.handleBtnClick(e));
		this.disposables.push(dispose);
	}

	/**
	 * 按钮点击绑定事件
	 * @private
	 * @param {InnerButtonType} button
	 * @memberof Scale9WindowPanel
	 */
	private handleBtnClick(button: InnerButtonType): void {
		switch (button) {
			// 确定按钮
			case InnerButtonType.FIRST_BUTTON:
				let v = {
					x: this.Scale9Window.state.x,
					y: this.Scale9Window.state.y,
					width: this.Scale9Window.state.width,
					height: this.Scale9Window.state.height
				};
				this.Scale9Window.state.axisIsShow ? this.confirm(v) : this.confirm(null);
				break;
			// 取消按钮
			case InnerButtonType.SECOND_BUTTON:
				break;
			// 左上角关闭按钮
			case InnerButtonType.CLOSE_BUTTON:
				break;
		}
	}

	/**
	 * 重载父类方法，对窗体进行渲染
	 * @param {HTMLElement} contentGroup
	 * @memberof Scale9WindowPanel
	 */
	public render(contentGroup: HTMLElement): void {
		super.render(contentGroup);
		ReactDOM.render(
			<Scale9Window
				ref={(scale9window) => { this.Scale9Window = scale9window; }}
				imgResource={this.image.src}
				offsetX={this.image.offsetX}
				offsetY={this.image.offsetY}
				imageWidth={this.image.imageWidth}
				imageHeight={this.image.imageHeight}
				x={this.image.x}
				y={this.image.y}
				width={this.image.width}
				height={this.image.height}
				axisIsShow={this.image.isSet}
			/>,
			contentGroup
		);
	}

	// 注销
	public dispose() {
		super.dispose();
		dispose(this.disposables);
		this.cancel = null;
		this.confirm = null;
	}
}