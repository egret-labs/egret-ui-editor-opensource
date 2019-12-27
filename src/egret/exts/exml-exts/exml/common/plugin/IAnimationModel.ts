/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { Event } from 'egret/base/common/event';

import { INode, IObject } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';

import { localize } from 'egret/base/localization/nls';
import * as sax from 'egret/exts/exml-exts/exml/common/sax/sax';

export const effectProps: NodeProperty[][] = [
	[
		{ name: 'x', label: 'X:' },
		{ name: 'y', label: 'Y:' }
	],
	[
		{ name: 'width', label: localize('width', 'Width') + ':' },
		{ name: 'height', label: localize('height', 'Height') + ':' }
	],
	[
		{ name: 'scaleX', label: localize('scaleX', 'ScaleX') + ':' },
		{ name: 'scaleY', label: localize('scaleY', 'ScaleY') + ':' }
	],
	[
		{ name: 'alpha', label: localize('alpha', 'Alpha') + ':' },
		{ name: 'rotation', label: localize('rotation', 'Rotation') + ':' }
	]
];

export interface NodeProperty {
	name: string;
	label: string;
}

export interface ITweenNode {
	instance: IObject;
}

export interface EditingPath {
	position: 'start' | 'end' | 'between';
	offset: number;
	path: ITweenPath;
}

export interface ITweenPath extends ITweenNode {
	duration: number;
	findEffectedPropties(): string[];
	setProperty(key: string, value: number, onlyInstance?: boolean): void;
}

export interface ITweenItem extends ITweenNode {
	readonly target: INode;
	readonly paths: ITweenPath[];
	loop: boolean;

	findEditingPath(time: number, includeWait?: boolean): EditingPath;
	findEditingPaths(time: number): EditingPath[];
	isKeyFrame(time: number): boolean;

	addKeyFrame(time: number): void;
	removeKeyFrame(time: number): void;

	addTween(time: number): void;
	removeTween(time: number): void;

	addPath(name: string, index: number, callBack?: (node: IObject) => void): void;
	removePath(index: number): void;

	refreshPaths(): void;

	calculateTime(time: number): number;

	onDidPathsChange: Event<ITweenPath[]>;
}

export interface ITweenGroup extends ITweenNode {
	items: ITweenItem[];

	getSelectedItem(): ITweenItem;
	setSelectedItem(item: ITweenItem): void;

	addTweenItem(target: INode): ITweenItem;
	removeTweenItem(item: ITweenItem): void;
	spliceTweenItem(start: number, deleteCount?: number, item?: ITweenItem): void;

	createTweenItem(target: INode, tag?: sax.Tag): ITweenItem;

	calculateTotalDuration(): number;
	calculateTotalTime(time: number): number;

	onDidItemSelectChange: Event<ITweenItem>;
	onDidItemsChange: Event<ITweenItem[]>;
}

export interface IAnimationModelEvent {
	target: IAnimationModel;
}

export interface IAnimationModel {
	readonly onTimeChanged: Event<IAnimationModelEvent>;
	readonly onEnableChanged: Event<IAnimationModelEvent>;
	readonly onGroupChanged: Event<IAnimationModelEvent>;
	readonly onTweenGroupSelectChanged: Event<IAnimationModelEvent>;
	readonly onNodeSelectChanged: Event<IAnimationModelEvent>;
	getEnabled(): boolean;
	setEnabled(value: boolean): void;
	getTime(): number;
	setTime(value: number): void;
	getSelectedItem(): ITweenItem;
	setSelectedItem(value: ITweenItem): void;
	getSelectedGroup(): ITweenGroup;
	setSelectedGroup(value: ITweenGroup): void;
	getTweenGroups(): ITweenGroup[];
	getSelectedNode(): INode;
	inKeyFrame(): boolean;
	addTweenGroup(): Promise<ITweenGroup>;
	removeTweenGroup(group: ITweenGroup): Promise<void>;
}
