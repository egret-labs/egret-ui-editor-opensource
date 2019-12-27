/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { IOperation } from 'egret/platform/operations/common/operations';
import * as lifecycle from 'egret/base/common/lifecycle';
// import { ResolvedKeybinding, SimpleKeybinding, KeyMod, KeyCode } from 'vs/base/common/keyCodes';
// import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { Emitter, Event } from 'egret/base/common/event';
import { IAnimationService } from './animation';
import { ITweenItem } from 'egret/exts/exml-exts/exml/common/plugin/IAnimationModel';

export class BaseTweenOperation implements IOperation {

	protected toDispose: lifecycle.IDisposable[];
	protected _enabled: boolean;
	private _onEnableChanged: Emitter<boolean> = new Emitter<boolean>();


	constructor(
		@IAnimationService protected animationService: IAnimationService) {
		this.toDispose = [];
		this.updateEnablement();
	}

	public get enabled(): boolean {
		return this._enabled;
	}

	public set enabled(value: boolean) {
		this._setEnabled(value);
	}

	protected _setEnabled(value: boolean): void {
		if (this._enabled !== value) {
			this._enabled = value;
			this._onEnableChanged.fire(value);
		}
	}

	/**
	 * Enable改变事件
	 */
	public get onEnableChanged(): Event<boolean> {
		return this._onEnableChanged.event;
	}

	protected updateEnablement(): void {
		let enabled = true;
		if (!this.animationService.animation) {
			this.enabled = false;
			return;
		}
		this.enabled = enabled;
	}

	public run(context?: any): Promise<any> {
		return Promise.resolve();
	}

	public dispose(): void {
		this._onEnableChanged.dispose();
		this.animationService = null;
		lifecycle.dispose(this.toDispose);
	}
}

export class AddTweenGroupOperation extends BaseTweenOperation {

	constructor(
		@IAnimationService animationService: IAnimationService
	) {
		super(animationService);
		this.toDispose.push(this.animationService.onDidGroupsChange(() => this.updateEnablement()));
		this.toDispose.push(this.animationService.onDidEnableChange(() => this.updateEnablement()));
		this.toDispose.push(this.animationService.getViewModel().onDidEditTweenGroup(() => this.updateEnablement()));
	}

	public run(): Promise<any> {
		if (this.animationService.animation) {
			return this.animationService.animation.addTweenGroup().then(group => {
				this.animationService.getViewModel().setEditingTweenGroup(group);
				this.animationService.animation.setSelectedGroup(group);
			});
		}
		return Promise.resolve();
	}

	protected updateEnablement(): void {
		super.updateEnablement();
		if (!this.enabled) {
			return;
		}
		this.enabled = this.animationService.animation.getEnabled() &&
			!this.animationService.getViewModel().getEditingTweenGroup();
	}
}

export class RemoveTweenGroupOperation extends BaseTweenOperation {

	constructor(
		@IAnimationService animationService: IAnimationService
	) {
		super(animationService);
		this.toDispose.push(this.animationService.onDidGroupSelectChange(() => this.updateEnablement()));
		this.toDispose.push(this.animationService.getViewModel().onDidEditTweenGroup(() => this.updateEnablement()));
	}

	protected updateEnablement(): void {
		super.updateEnablement();
		if (!this.enabled) {
			return;
		}
		this.enabled = !!this.animationService.animation.getSelectedGroup() &&
			!this.animationService.getViewModel().getEditingTweenGroup();
	}

	public run(): Promise<any> {
		if (this.animationService.animation) {
			const group = this.animationService.animation.getSelectedGroup();
			if (group) {
				return this.animationService.animation.removeTweenGroup(group);
			}
		}
		return Promise.resolve();
	}
}

export class AddTweenItemOperation extends BaseTweenOperation {

	constructor(
		@IAnimationService animationService: IAnimationService
	) {
		super(animationService);
		this.toDispose.push(this.animationService.onDidGroupSelectChange(() => this.updateEnablement()));
		this.toDispose.push(this.animationService.onDidNodeSelectChange(() => this.updateEnablement()));
		this.toDispose.push(this.animationService.onDidItemSelectChange(() => this.updateEnablement()));
	}

	public run(): Promise<any> {
		const group = this.animationService.animation.getSelectedGroup();
		const node = this.animationService.animation.getSelectedNode();
		const item = group.addTweenItem(node);
		group.setSelectedItem(item);
		return Promise.resolve();
	}

	protected updateEnablement(): void {
		super.updateEnablement();
		if (!this.enabled) {
			return;
		}
		const group = this.animationService.animation.getSelectedGroup();
		if (!group) {
			this.enabled = false;
			return;
		}
		const node = this.animationService.animation.getSelectedNode();
		if (!node || node.getIsRoot()) {
			this.enabled = false;
			return;
		}

		// disabled when items has exist the current selected node.
		group.items.some(item => {
			if (item.target === node) {
				this.enabled = false;
				return true;
			} else {
				return false;
			}
		});
	}
}

export class RemoveTweenItemOperation extends BaseTweenOperation {

	constructor(
		@IAnimationService animationService: IAnimationService
	) {
		super(animationService);
		this.toDispose.push(this.animationService.onDidGroupSelectChange(() => this.updateEnablement()));
		this.toDispose.push(this.animationService.onDidItemSelectChange(() => this.updateEnablement()));
	}

	protected updateEnablement(): void {
		super.updateEnablement();
		if (!this.enabled) {
			return;
		}
		const item = this.animationService.animation.getSelectedItem();
		if (!item) {
			this.enabled = false;
		}
	}

	public run(): Promise<any> {
		const group = this.animationService.animation.getSelectedGroup();
		group.removeTweenItem(group.getSelectedItem());
		if (group.items.length > 0) {
			group.setSelectedItem(group.items[0]);
		}
		return Promise.resolve();
	}
}

export class CopyTweenItemOperation extends BaseTweenOperation {

	constructor(
		@IAnimationService protected animationService: IAnimationService
	) {
		super(animationService);
		this.toDispose.push(this.animationService.onDidGroupSelectChange(() => this.updateEnablement()));
		this.toDispose.push(this.animationService.onDidItemSelectChange(() => this.updateEnablement()));
	}

	public run(): Promise<any> {
		const item = this.animationService.animation.getSelectedItem();
		if (item) {
			const itemNode = item.instance;
			const clipboardItem = {
				tag: itemNode.getExmlModel().parseXML(itemNode, true),
				targetId: item.target.getId()
			};
			this.animationService.getViewModel().setClipboardItem(clipboardItem);
		}
		return Promise.resolve();
	}

	protected updateEnablement(): void {
		super.updateEnablement();
		if (!this.enabled) {
			return;
		}
		const item = this.animationService.animation.getSelectedItem();
		if (!item) {
			this.enabled = false;
		}
	}
}

export class PasteTweenItemOperation extends BaseTweenOperation {

	constructor(
		@IAnimationService animationService: IAnimationService
	) {
		super(animationService);
		this.toDispose.push(this.animationService.onDidGroupSelectChange(() => this.updateEnablement()));
		this.toDispose.push(this.animationService.onDidItemSelectChange(() => this.updateEnablement()));
		this.toDispose.push(this.animationService.getViewModel().onDidClipboardItemChange(() => this.updateEnablement()));
	}

	public run(): Promise<any> {
		const group = this.animationService.animation.getSelectedGroup();
		const item = this.animationService.animation.getSelectedItem();
		if (item) {
			const clipboardItem = this.animationService.getViewModel().getClipboardItem();
			const newTweenItem = group.createTweenItem(item.target, clipboardItem.tag);
			group.spliceTweenItem(group.items.indexOf(item), 1, newTweenItem);
			group.setSelectedItem(newTweenItem);
		}
		return Promise.resolve();
	}

	protected updateEnablement(): void {
		super.updateEnablement();
		if (!this.enabled) {
			return;
		}
		const clipboardItem = this.animationService.getViewModel().getClipboardItem();
		if (!clipboardItem) {
			this.enabled = false;
			return;
		}
		const item = this.animationService.animation.getSelectedItem();
		if (!item || item.target.getId() === clipboardItem.targetId) {
			this.enabled = false;
		}
	}
}

export class ToggleLoopOperation extends BaseTweenOperation {

	constructor(
		@IAnimationService animationService: IAnimationService
	) {
		super(animationService);
	}

	public run(context: { item: ITweenItem }): Promise<any> {
		const item = context.item;
		item.loop = !item.loop;
		return Promise.resolve(null);
	}
}

export class PlayAndPauseOperation extends BaseTweenOperation {
	private static handle: number;
	protected _checked: boolean;
	private _onCheckedChanged: Emitter<boolean> = new Emitter<boolean>();

	constructor(
		@IAnimationService protected animationService: IAnimationService
	) {
		super(animationService);
	}
	
	/**
	 * Checked改变事件
	 */
	public get onCheckedChanged(): Event<boolean> {
		return this._onCheckedChanged.event;
	}

	public get checked(): boolean {
		return this._checked;
	}

	public set checked(value: boolean) {
		this._setChecked(value);
	}

	protected _setChecked(value: boolean): void {
		if (this._checked !== value) {
			this._checked = value;
			this._onCheckedChanged.fire(value);
		}
	}

	private updateTime(back: boolean = false): void {
		if (!this.animationService.animation) {
			return;
		}
		const group = this.animationService.animation.getSelectedGroup();
		if (!group) {
			return;
		}
		const loop = group.items.some(item => {
			return item.loop;
		});

		let time = this.animationService.animation.getTime();
		const totalTime = group.calculateTotalDuration();
		if (!loop && time >= totalTime) {
			if (!back) {
				time = totalTime;
				this.pause();
			} else {
				time = 0;
			}
		} else {
			time = time + 50;
		}
		this.animationService.animation.setTime(time);
	}

	public play(): void {
		this.checked = true;
		this.animationService.getViewModel().setPlaying(true);

		clearInterval(PlayAndPauseOperation.handle);
		PlayAndPauseOperation.handle = <any>setInterval(() => {
			this.updateTime();
		}, 1000 / 20);
		this.updateTime(true);
	}

	public pause(): void {
		this.checked = false;
		this.animationService.getViewModel().setPlaying(false);

		clearTimeout(PlayAndPauseOperation.handle);
	}

	public run(): Promise<any> {
		const play = !this.checked;
		if (play) {
			this.play();
		} else {
			this.pause();
		}
		return Promise.resolve();
	}
	
	public dispose(): void {
		this._onCheckedChanged.dispose();
		super.dispose();
	}
}

// export function keybindingForAction(id: string, keybindingService: IKeybindingService): ResolvedKeybinding {
// 	switch (id) {
// 		case PlayAndPauseAction.ID:
// 			return keybindingService.resolveKeybinding(new SimpleKeybinding(KeyCode.Space));
// 		case CopyTweenItemAction.ID:
// 			return keybindingService.resolveKeybinding(new SimpleKeybinding(KeyMod.CtrlCmd | KeyCode.KEY_C));
// 		case PasteTweenItemAction.ID:
// 			return keybindingService.resolveKeybinding(new SimpleKeybinding(KeyMod.CtrlCmd | KeyCode.KEY_V));
// 		case RemoveTweenItemAction.ID:
// 			return keybindingService.resolveKeybinding(new SimpleKeybinding(isMacintosh ? KeyMod.CtrlCmd | KeyCode.Backspace : KeyCode.Delete));
// 	}

// 	if (keybindingService) {
// 		const keys = keybindingService.lookupKeybindings(id);
// 		if (keys.length > 0) {
// 			return keys[0]; // only take the first one
// 		}
// 	}

// 	return null;
// }