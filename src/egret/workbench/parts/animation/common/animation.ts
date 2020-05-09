/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { Event } from 'egret/base/common/event';
import { createDecorator } from 'egret/platform/instantiation/common/instantiation';
import { ITweenGroup, ITweenItem, IAnimationModel } from 'egret/exts/exml-exts/exml/common/plugin/IAnimationModel';

import * as sax from 'egret/exts/exml-exts/exml/common/sax/sax';

/**
 * Animation panel id
 */
export const ANIMATION_PANEL_ID = 'workbench.panel.animation';

export var IAnimationService = createDecorator<IAnimationService>('animationService');

export interface ClipboardItem {
	tag: sax.Tag;
	targetId: string;
}

export interface IAnimationService {
	_serviceBrand: undefined;

	animation: IAnimationModel;

	getViewModel(): IViewModel;

	onDidAnimationChange: Event<IAnimationModel>;
	onDidGroupsChange: Event<ITweenGroup[]>;
	onDidGroupSelectChange: Event<ITweenGroup>;
	onDidItemsChange: Event<ITweenItem[]>;
	onDidItemSelectChange: Event<ITweenItem>;
	onDidTimeChange: Event<number>;
	onDidEnableChange: Event<boolean>;
	onDidNodeSelectChange: Event<void>;
}

export interface IViewModel {
	getEditingTweenGroup(): ITweenGroup;
	setEditingTweenGroup(group: ITweenGroup): void;

	getVerticalPosition(): number;
	setVerticalPosition(position: number): void;

	getClipboardItem(): ClipboardItem;
	setClipboardItem(item: ClipboardItem): void;

	getPlaying(): boolean;
	setPlaying(value: boolean): void;

	onDidEditTweenGroup: Event<ITweenGroup>;
	onDidVerticalPositionChange: Event<number>;
	onDidClipboardItemChange: Event<ClipboardItem>;
	onDidPlayingChange: Event<boolean>;
}