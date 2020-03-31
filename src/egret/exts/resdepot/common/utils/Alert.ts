/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { remote } from 'electron';
import platform = require('vs/base/common/platform');
import { CloseEvent } from 'egret/exts/resdepot/events/CloseEvent';
import * as nls from 'egret/base/localization/nls';

/**
 * electron的弹框
 */
export class Alert {
	public constructor() {

	}

	// public static show(msg?: string){
	//     Alert.showMessageBox(msg);
	// }
	/**
	 * 当对话框关闭时，closeEvent.detail的值若等于此属性,表示被点击的按钮为firstButton。
	 */
	public static FIRST_BUTTON: number = 1;
	/**
	 * 当对话框关闭时，closeEvent.detail的值若等于此属性,表示被点击的按钮为secondButton。
	 */
	public static SECOND_BUTTON: number = 2;
	/**
	 * 当对话框关闭时，closeEvent.detail的值若等于此属性,表示被点击的按钮为thirdButton。
	 */
	public static THIRD_BUTTON: number = 3;
	/**
	 * 当对话框关闭时，closeEvent.detail的值若等于此属性,表示被点击的按钮为closeButton。
	 */
	public static CLOSE_BUTTON: number = 4;
	/**
	 * 弹出Alert控件的静态方法。在Alert控件中选择一个按钮，将关闭该控件。
	 * @param text 要显示的文本内容字符串。
	 * @param title 对话框标题
	 * @param parent 父级窗口
	 * @param closeHandler 按下Alert控件上的任意按钮时的回调函数。示例:closeHandler(event:CloseEvent);
	 * event的detail属性包含 Alert.FIRST_BUTTON、Alert.SECOND_BUTTON和Alert.CLOSE_BUTTON。
	 * @param firstButtonLabel 第一个按钮上显示的文本。
	 * @param secondButtonLabel 第二个按钮上显示的文本，若为null，则不显示第二个按钮。
	 * @param thirdButtonLabel 第三个按钮上显示的文本，若为null，则不显示第三个按钮。
	 * @param modal 是否启用模态。即禁用弹出层以下的鼠标事件。默认true。
	 * @return 弹出的对话框实例的引用
	 */
	public static show(text: string = '', title: string = '', parent = null, closeHandler: (e: CloseEvent) => void = null,
		firstButtonLabel: string = 'Alert.Confirm', secondButtonLabel: string = '',
		thirdButtonLabel: string = '', modal: Boolean = true, width: number = -1): void {

		var first: string = nls.localize('alert.button.yes', 'Yes');
		var second: string = secondButtonLabel ? nls.localize('alert.button.no', 'No') : '';
		var third: string = thirdButtonLabel ? nls.localize('alert.button.cancel', 'Cancle') : '';
		var btns: string[] = [];
		if (first) {
			btns.push(first);
		}
		if (second) {
			btns.push(second);
		}
		if (third) {
			btns.push(third);
		}

		Alert.showMessageBox(text, (response: number) => {
			var closeEvent: CloseEvent = new CloseEvent(CloseEvent.CLOSE, false, true);
			switch (btns[response]) {
				case first:
					closeEvent.detail = Alert.FIRST_BUTTON;
					break;
				case second:
					closeEvent.detail = Alert.SECOND_BUTTON;
					break;
				case third:
					closeEvent.detail = Alert.THIRD_BUTTON;
					break;
				default:
					closeEvent.detail = Alert.CLOSE_BUTTON;
					break;
			}
			if (closeHandler) {
				closeHandler(closeEvent);
			}
		}, '', title, 'info', btns);
	}

	/**
	 * 消息提示框，模态
	 * @return 点击的按钮
	 * @param msg
	 * @param callback
	 * @param detail
	 * @param title 如果没有默认值，会显示为'Electron'
	 * @param type 'none', 'info', 'error', 'question' or 'warning'
	 * @param btnLabels 三个按钮显示的文本
	 */
	public static showMessageBox(msg?: string, callback?: (response: number) => void, detail?: string, title: string = ' ', type: string = 'warning',
		btnLabels: string[] = ['save', 'dontSave', 'cancel']) {

		var save, dontSave, cancel;
		if (btnLabels && btnLabels.length > 0) {
			save = { label: btnLabels[0], result: 0 };
		}
		if (btnLabels && btnLabels.length > 1) {
			dontSave = { label: btnLabels[1], result: 1 };
		}
		if (btnLabels && btnLabels.length > 2) {
			cancel = { label: btnLabels[2], result: 2 };
		}

		var buttons = [];
		if (save) {
			buttons.push(save);
		}
		if (dontSave && cancel) {
			if (platform.isWindows) {
				buttons.push(dontSave, cancel);
			} else {
				buttons.push(cancel, dontSave);
			}

		} else {
			if (dontSave) {
				buttons.push(dontSave);
			}
			if (cancel) {
				buttons.push(cancel);
			}
		}

		let opts: Electron.MessageBoxOptions = {
			type: <any>type,
			buttons: buttons.map(b => b.label),
			title: title,
			message: msg,
			detail: detail,
			noLink: true,
			cancelId: cancel ? buttons.indexOf(cancel) : -1
		};
		remote.dialog.showMessageBox(remote.getCurrentWindow(), opts).then((value) => {
			if (callback) {
				callback(value.response);
			}
		});
	}
}
