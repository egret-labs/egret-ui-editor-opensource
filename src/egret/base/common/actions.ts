/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { IDisposable } from './lifecycle';
import { Event, Emitter } from './event';

/**
 * 动作接口
 */
export interface IAction extends IDisposable {
	//动作ID
	id: string;

	//动作描述
	label: string;

	//是否可用
	enabled?: boolean;

	//提示文本
	tooltip?: string;

	//样式
	class: string;

	//执行动作
	run(event?: any): Promise<any>;
}


// tslint:disable-next-line:check-comment
export interface IActionChangeEvent {
	//文本
	label?: string;

	//是否可用
	enabled?: boolean;

	//提示文本
	tooltip?: string;
}

/**
 * 动作
 */
export class Action implements IAction {

	//暂时保留，改变后事件
	protected _onDidChange = new Emitter<IActionChangeEvent>();
	protected _id: string;
	protected _label: string;
	protected _cssClass: string;
	protected _enabled: boolean;

	protected _actionCallback: (event?: any) => Promise<any>;

	constructor(id: string, label: string = '', cssClass: string = '', enabled: boolean = true,actionCallback?: (event?: any) => Promise<any>) {
		this._id = id;
		this._label = label;
		this._cssClass = cssClass;
		this._enabled = enabled;
		this._actionCallback = actionCallback;
	}


	/**
	 * 销毁
	 */
	public dispose() {
		this._onDidChange.dispose();
	}

	/**
	 * 改变后的时间
	 */
	public get onDidChange(): Event<IActionChangeEvent> {
		return this._onDidChange.event;
	}

	/**
	 * 动作ID
	 */
	public get id(): string {
		return this._id;
	}

	/**
	 * 样式
	 */
	public get class(): string {
		return this._cssClass;
	}

	public set class(value: string) {
		this._cssClass = value;
	}

	/**
	 * 动作标签
	 */
	public get label(): string {
		return this._label;
	}

	public set label(value: string) {
		this._setLabel(value);
	}

	protected _setLabel(value: string): void {
		if (this._label !== value) {
			this._label = value;
			this._onDidChange.fire({ label: value });
		}
	}

	/**
	 * 执行动作
	 * @param event 事件
	 */
	public run(event?: any): Promise<any> {
		if (this._actionCallback !== void 0) {
			return this._actionCallback(event);
		}
		return Promise.resolve(true);
	}


	/**
	 * 激活
	 */
	public get enabled(): boolean {
		return this._enabled;
	}

	public set enabled(value: boolean) {
		this._setEnabled(value);
	}

	protected _setEnabled(value: boolean): void {
		if (this._enabled !== value) {
			this._enabled = value;
			this._onDidChange.fire({ enabled: value });
		}
	}
}

