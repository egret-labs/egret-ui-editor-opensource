/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as lifecycle from 'egret/base/common/lifecycle';
import { Emitter, Event } from 'egret/base/common/event';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { ITweenGroup, ITweenItem, IAnimationModel } from 'egret/exts/exml-exts/exml/common/plugin/IAnimationModel';
import { IAnimationService, IViewModel, ClipboardItem } from './animation';
import { IWorkbenchEditorService } from 'egret/workbench/services/editor/common/ediors';
import { ExmlFileEditor } from 'egret/exts/exml-exts/exml/browser/exmlFileEditor';

export class AnimationService implements IAnimationService {

	public _serviceBrand: any;

	private exmlModel: IExmlModel;

	private viewModel: AnimationViewModel;

	private itemChangeDispose: lifecycle.IDisposable[];

	private _onDidGroupSelectChange: Emitter<ITweenGroup> = new Emitter<ITweenGroup>();
	public onDidGroupSelectChange: Event<ITweenGroup> = this._onDidGroupSelectChange.event;

	private _onDidGroupsChange: Emitter<ITweenGroup[]> = new Emitter<ITweenGroup[]>();
	public onDidGroupsChange: Event<ITweenGroup[]> = this._onDidGroupsChange.event;

	private _onDidTimeChange: Emitter<number> = new Emitter<number>();
	public onDidTimeChange: Event<number> = this._onDidTimeChange.event;

	private _onDidItemSelectChange: Emitter<ITweenItem> = new Emitter<ITweenItem>();
	public onDidItemSelectChange: Event<ITweenItem> = this._onDidItemSelectChange.event;

	private _onDidItemsChange: Emitter<ITweenItem[]> = new Emitter<ITweenItem[]>();
	public onDidItemsChange: Event<ITweenItem[]> = this._onDidItemsChange.event;

	private _onDidAnimationChange: Emitter<IAnimationModel> = new Emitter<IAnimationModel>();
	public onDidAnimationChange: Event<IAnimationModel> = this._onDidAnimationChange.event;

	private _onDidEnableChange: Emitter<boolean> = new Emitter<boolean>();
	public onDidEnableChange: Event<boolean> = this._onDidEnableChange.event;

	private _onDidNodeSelectChange: Emitter<void> = new Emitter<void>();
	public onDidNodeSelectChange: Event<void> = this._onDidNodeSelectChange.event;

	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IWorkbenchEditorService protected editorService: IWorkbenchEditorService,
	) {
		this.viewModel = new AnimationViewModel();
		this.registerListener();
		this.init();
	}

	private init(): void {
		const editor = this.editorService.getActiveEditor();
		if (editor && editor instanceof ExmlFileEditor) {
			this.updateModel(editor as ExmlFileEditor);
		}
	}

	private registerListener(): void {
		this.editorService.onActiveEditorChanged((e) => {
			if (!e) {
				this.setModel(null);
			} else {
				if (e instanceof ExmlFileEditor) {
					this.updateModel(e as ExmlFileEditor);
				}
			}
		});
	}

	private updateModel(editor: ExmlFileEditor): Promise<void> {
		return editor.getModel().then((model) => {
			this.setModel(model.getModel());
		});
	}

	private eventDisabledList: lifecycle.IDisposable[] = [];
	private setModel(model: IExmlModel): void {
		if (this.exmlModel === model) {
			return;
		}
		while (this.eventDisabledList.length > 0) {
			this.eventDisabledList.pop().dispose();
		}

		this.exmlModel = model;
		if (this.exmlModel) {
			this.eventDisabledList.push(
				this.animation.onGroupChanged((e) => this.onGroupChanged())
			);
			this.eventDisabledList.push(
				this.animation.onTweenGroupSelectChanged((e) => this.onGroupSelectedChanged())
			);
			this.eventDisabledList.push(
				this.animation.onTimeChanged((e) => this.onTimeChanged())
			);
			this.eventDisabledList.push(
				this.animation.onEnableChanged((e) => this.onEnableChanged())
			);
			this.eventDisabledList.push(
				this.animation.onNodeSelectChanged((e) => this.onNodeSelectChanged())
			);
		}
		this._onDidAnimationChange.fire(this.animation);
		this.onEnableChanged();
		this.onGroupChanged();
		this.onGroupSelectedChanged();
	}

	private onGroupChanged(): void {
		if (this.animation) {
			const groups = this.animation.getTweenGroups();
			this._onDidGroupsChange.fire(groups);
		} else {
			this._onDidGroupsChange.fire([]);
		}
	}

	private onGroupSelectedChanged(): void {
		const group = this.animation && this.animation.getSelectedGroup();
		this.itemChangeDispose = this.itemChangeDispose ? lifecycle.dispose(this.itemChangeDispose) : [];
		if (group) {
			this.itemChangeDispose.push(group.onDidItemSelectChange(item => {
				this._onDidItemSelectChange.fire(item);
			}));
			this.itemChangeDispose.push(group.onDidItemsChange(items => {
				this._onDidItemsChange.fire(items);
			}));
		}
		this._onDidGroupSelectChange.fire(group);
	}

	private onTimeChanged(): void {
		this._onDidTimeChange.fire(this.animation ? this.animation.getTime() : 0);
	}

	private onEnableChanged(): void {
		this._onDidEnableChange.fire(this.animation ? this.animation.getEnabled() : false);
	}

	private onNodeSelectChanged(): void {
		this._onDidNodeSelectChange.fire();
	}

	public get animation(): IAnimationModel {
		return this.exmlModel && this.exmlModel.getAnimationModel();
	}

	public getViewModel(): IViewModel {
		return this.viewModel;
	}

	public get enable(): boolean {
		return this.animation ? this.animation.getEnabled() : false;
	}
}

export class AnimationViewModel implements IViewModel {

	private editingTweenGroup: ITweenGroup;
	private verticalPosition: number = 0;
	private clipboardItem: ClipboardItem;
	private playing: boolean = false;

	private _onDidEditTweenGroup: Emitter<ITweenGroup> = new Emitter<ITweenGroup>();
	private _onDidVerticalPositionChange: Emitter<number> = new Emitter<number>();
	private _onDidClipboardItemChange: Emitter<ClipboardItem> = new Emitter<ClipboardItem>();
	private _onDidPlayingChange: Emitter<boolean> = new Emitter<boolean>();

	constructor() {
	}

	public getEditingTweenGroup(): ITweenGroup {
		return this.editingTweenGroup;
	}

	public getVerticalPosition(): number {
		return this.verticalPosition;
	}

	public getClipboardItem(): ClipboardItem {
		return this.clipboardItem;
	}

	public getPlaying(): boolean {
		return this.playing;
	}

	public setEditingTweenGroup(group: ITweenGroup): void {
		this.editingTweenGroup = group;
		this._onDidEditTweenGroup.fire(group);
	}

	public setVerticalPosition(position: number): void {
		this.verticalPosition = position;
		this._onDidVerticalPositionChange.fire(position);
	}

	public setClipboardItem(item: ClipboardItem): void {
		this.clipboardItem = item;
		this._onDidClipboardItemChange.fire(item);
	}

	public setPlaying(value: boolean): void {
		if (value === this.playing) {
			return;
		}
		this.playing = value;
		this._onDidPlayingChange.fire(value);
	}

	public get onDidEditTweenGroup(): Event<ITweenGroup> {
		return this._onDidEditTweenGroup.event;
	}

	public get onDidVerticalPositionChange(): Event<number> {
		return this._onDidVerticalPositionChange.event;
	}

	public get onDidClipboardItemChange(): Event<ClipboardItem> {
		return this._onDidClipboardItemChange.event;
	}

	public get onDidPlayingChange(): Event<boolean> {
		return this._onDidPlayingChange.event;
	}
}