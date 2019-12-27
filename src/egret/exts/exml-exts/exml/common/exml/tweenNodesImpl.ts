/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { Emitter, Event } from 'egret/base/common/event';
import { IObject, ILink, IArray, INode } from './treeNodes';
import { ITweenGroup, ITweenItem, ITweenPath, EditingPath } from '../plugin/IAnimationModel';
import { EUIExmlConfig } from 'egret/exts/exml-exts/exml/common/project/exmlConfigs';
import * as sax from 'egret/exts/exml-exts/exml/common/sax/sax';
import { TWEEN, EUI } from '../project/parsers/core/commons';

export interface TweenResult {
	[key: string]: number;
}

export class BaseTweenNode {
	private _instance: IObject;

	constructor(instance: IObject) {
		this._instance = instance;
	}

	public get instance(): IObject {
		return this._instance;
	}
}

export class TweenGroupNode extends BaseTweenNode implements ITweenGroup {

	private selectedItem: TweenItemNode;
	private _items: TweenItemNode[];

	private _onDidItemSelectChange: Emitter<TweenItemNode> = new Emitter<TweenItemNode>();
	private _onDidItemsChange: Emitter<TweenItemNode[]> = new Emitter<TweenItemNode[]>();

	constructor(instance: IObject) {
		super(instance);

		this._items = [];
		const _itemsProperty = this.instance.getProperty('items') as IArray;
		if (_itemsProperty) {
			for (var i = 0; i < _itemsProperty.getLength(); i++) {
				var tweenItem = _itemsProperty.getValueAt(i) as IObject;
				this._items.push(new TweenItemNode(tweenItem));
			}
		}
	}

	public get items(): TweenItemNode[] {
		return this._items;
	}

	public setSelectedItem(item: TweenItemNode): void {
		this.selectedItem = item;
		if (item) {
			this.selectTarget(item);
		}
		this._onDidItemSelectChange.fire(item);
	}

	public getSelectedItem(): TweenItemNode {
		return this.selectedItem;
	}

	public selectTarget(item: ITweenItem): void {
		const target = item && item.target as INode;
		if (!target) {
			return;
		}
		const nodes = target.getExmlModel().getSelectedNodes();
		for (var i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			node.setSelected(false);
		}
		if (target) {
			target.setSelected(true);
		}
	}

	public addTweenItem(target: INode): TweenItemNode {
		const tweenItem = this.createTweenItem(target);
		this.spliceTweenItem(this._items.length, 0, tweenItem);
		return tweenItem;
	}

	public removeTweenItem(item: TweenItemNode): void {
		this.spliceTweenItem(this._items.indexOf(item), 1);
	}

	public spliceTweenItem(start: number, deleteCount?: number, item?: TweenItemNode): void {
		const exmlModel = this.instance.getExmlModel();
		const groupNode = this.instance;
		let itemsNode = groupNode.getProperty('items') as IArray;
		if (!itemsNode) {
			itemsNode = exmlModel.createIArray();
			(<any>itemsNode).xmlVisible = false;
			groupNode.setProperty('items', itemsNode);
		}

		itemsNode.splice(start, deleteCount, item && item.instance);
		if (item) {
			this._items.splice(start, deleteCount, item);
		} else {
			this._items.splice(start, deleteCount);
		}

		if (this.selectedItem && this._items.indexOf(this.selectedItem) < 0) {
			this.setSelectedItem(null);
		}

		this._onDidItemsChange.fire(this._items);
	}

	public createTweenItem(target: INode, tag?: sax.Tag): TweenItemNode {
		const exmlModel = this.instance.getExmlModel();
		let itemNode: IObject;
		if (tag) {
			itemNode = <IObject><any>exmlModel.parseExmlValue(tag);
		} else {
			itemNode = exmlModel.createIObject('TweenItem', TWEEN);
		}
		if (!target.getId()) {
			target.setId(exmlModel.generateId(target));
		}
		const targetLink = exmlModel.createILink(target.getId());
		targetLink.addRelatives([target]);
		itemNode.setProperty('target', targetLink);

		return new TweenItemNode(itemNode);
	}

	public calculateTotalDuration(): number {
		let result = 0;
		this._items.forEach(item => {
			result = Math.max(result, item.calculateDuration());
		});
		return result;
	}

	public calculateTotalTime(time: number): number {
		let result = 0;
		this._items.forEach(item => {
			result = Math.max(result, item.calculateTime(time));
		});
		return result;
	}

	public get onDidItemSelectChange(): Event<TweenItemNode> {
		return this._onDidItemSelectChange.event;
	}

	public get onDidItemsChange(): Event<TweenItemNode[]> {
		return this._onDidItemsChange.event;
	}
}

export class TweenItemNode extends BaseTweenNode implements ITweenItem {

	private _paths: ITweenPath[];

	private _onDidPathsChange: Emitter<ITweenPath[]> = new Emitter<ITweenPath[]>();

	constructor(instance: IObject) {
		super(instance);
		this.refreshPaths();
	}

	public refreshPaths(): void {
		const pathsProperty = this.instance.getProperty('paths') as IArray;
		this._paths = [];
		if (pathsProperty) {
			for (var i = 0; i < pathsProperty.getLength(); i++) {
				var tweenPath = pathsProperty.getValueAt(i) as IObject;
				this._paths.push(new TweenPathNode(tweenPath));
			}
		}
		this._onDidPathsChange.fire(this._paths);
	}

	public get target(): INode {
		const t = this.instance.getProperty('target');
		if ('getRelativeIdList' in t) {
			const ids = (<ILink>t).getRelativeIdList();
			if (ids && ids.length > 0) {
				return (<ILink>t).getRelativeByID(ids[0]) as INode;
			} else {
				return null;
			}
		} else {
			return t.getInstance() as INode;
		}
	}

	public get loop(): boolean {
		const props = this.instance.getProperty('props') as IObject;
		if (props) {
			const loopValue = props.getProperty('loop');
			if (loopValue && loopValue.getInstance()) {
				return true;
			}
		}
		return false;
	}

	public set loop(value: boolean) {
		let props = this.instance.getProperty('props') as IObject;
		if (value) {
			if (!props) {
				const model = this.instance.getExmlModel();
				props = model.createIObject('Object', EUI);
				this.instance.setProperty('props', props, false);
			}
			const link = this.instance.getExmlModel().createILink('true');
			props.setProperty('loop', link);
		} else {
			this.instance.setProperty('props', null);
		}
		this._onDidPathsChange.fire(this._paths);
	}

	public get paths(): ITweenPath[] {
		return this._paths;
	}

	public findEditingPaths(time: number): EditingPath[] {
		const paths = this.paths;
		const result: EditingPath[] = [];
		if (paths.length === 0) {
			return result;
		}

		let offset = 0;
		for (let i = 0; i < paths.length; i++) {
			const path = paths[i];
			if (time === offset) {
				result.push({ path: path, position: 'start', offset: 0 });
			} else if (time === offset + path.duration) {
				result.push({ path: path, position: 'end', offset: path.duration });
			} else if (time > offset && time < (offset + path.duration)) {
				result.push({ path: path, position: 'between', offset: (time - offset) });
			}
			offset += path.duration;
		}

		return result;
	}

	public findEditingPath(time: number, includeWaitEnd: boolean = false): EditingPath {
		const paths = this.findEditingPaths(time);

		const choosePath = (paths: EditingPath[]): EditingPath => {
			if (paths.length > 0) {
				const path = paths[0];
				const instance = path.path.instance;

				// Iginore this wait end.
				if (!includeWaitEnd && instance.getName() === 'Wait' &&
					path.position === 'end') {
					return choosePath(paths.slice(1));
				} else {
					return path;
				}
			} else {
				return null;
			}
		};

		return choosePath(paths);
	}

	public isKeyFrame(time: number): boolean {
		const path = this.findEditingPath(time, false);
		if (!path) {
			return false;
		}
		const name = path.path.instance.getName();
		if (name === 'Set') {
			return true;
		} else if (name === 'To' && path.position === 'end') {
			return true;
		} else {
			return false;
		}
	}

	public findEffectedPropties(): string[] {
		let result = [];
		this.paths.forEach(path => {
			result = result.concat((<TweenPathNode>path).findEffectedPropties());
		});
		return result.filter((key, position) => {
			return result.indexOf(key) === position;
		});
	}

	public calculateValue(time: number): TweenResult {
		const result: TweenResult = {};
		if (!this.target) {
			return result;
		}

		// 1. Get this target's values at first, we must make sure refresh the target before this.
		const effectedPropties = this.findEffectedPropties();
		effectedPropties.forEach(prop => {
			result[prop] = this.getObjectInitValue(prop);
		});

		if (isNaN(time)) {
			return result;
		}

		// 2. Apply this current time's paths
		// const item: egret.tween.TweenItem = this.instance.getConfigDelegate().getInstanceByNameSync('egret.tween.TweenItem'); // Must use runtime instance
		const item: egret.tween.TweenItem = this.instance.getExmlConfig().getInstanceByName('egret.tween.TweenItem'); // Must use runtime instance
		item.target = result;
		if (this.loop) {
			item.props = { loop: true };
		}
		item.paths = this.paths.map(path => {
			return path.instance.getInstance();
		});
		// const tick: egret.tween.Tick = this.instance.getConfigDelegate().getInstanceByNameSync('egret.tween.Tick');
		const tick: egret.tween.Tick = this.instance.getExmlConfig().getInstanceByName('egret.tween.Tick');
		tick.delta = time;
		item.paths.push(tick);
		item.play();
		item.pause();

		// bug: tweenjs will add `tween_count` prop to the target.
		delete result['tween_count'];

		return result;
	}

	private getObjectInitValue(key: string): any {
		const value = this.target.getProperty(key);
		if (value) {
			return value.getInstance();
		} else {
			// TODO: use the instance current property?
			return this.target.getInstance()[key];
		}
	}

	public calculateDuration(): number {
		let result: number = 0;
		this._paths.forEach(path => {
			result += path.duration;
		});
		return result;
	}

	public calculateTime(time: number): number {
		const duration = this.calculateDuration();
		if (this.loop) {
			if (duration === 0 || time === 0) {
				return 0;
			}
			time = time % duration;
			return time === 0 ? duration : time;
		} else {
			return Math.min(time, duration);
		}
	}

	public addKeyFrame(time: number): void {
		const pathsProperty = this.getPathsProperty();
		const model = this.instance.getExmlModel();
		const editingPath = this.findEditingPath(time, false);
		if (editingPath) {
			const index = this._paths.indexOf(editingPath.path);
			const pathName = editingPath.path.instance.getName();
			if (pathName === 'To') {
				if (editingPath.position === 'between') {
					editingPath.path.instance.setNumber('duration', editingPath.path.duration - editingPath.offset);

					const toPathNode = model.createIObject('To', TWEEN);
					toPathNode.setNumber('duration', editingPath.offset);
					pathsProperty.splice(index, 0, toPathNode);

					// add props
					const effectedPropties = editingPath.path.findEffectedPropties();
					if (this.target && effectedPropties.length > 0) {
						const toPath = new TweenPathNode(toPathNode);
						effectedPropties.forEach(prop => {
							const formatValue = Math.round(this.target.getInstance()[prop] * 100) / 100;
							toPath.setProperty(prop, formatValue);
						});
					}

					this.refreshPaths();
				} else if (editingPath.position === 'start') {
					const setPathNode = model.createIObject('Set', TWEEN);
					pathsProperty.splice(index, 0, setPathNode);

					this.refreshPaths();
				}
			} else if (pathName === 'Wait') {
				const setPathNode = model.createIObject('Set', TWEEN);
				pathsProperty.splice(index, 0, setPathNode);

				if (editingPath.position === 'between') {
					editingPath.path.instance.setNumber('duration', editingPath.path.duration - editingPath.offset);

					const waitPathNode = model.createIObject('Wait', TWEEN);
					waitPathNode.setNumber('duration', editingPath.offset);
					pathsProperty.splice(index, 0, waitPathNode);
				}

				this.refreshPaths();
			}
		} else {
			const totalDuration = this.calculateDuration();
			const duration = time - totalDuration;

			if (duration >= 0) {
				if (duration > 0) {
					const waitPathNode = model.createIObject('Wait', TWEEN);
					waitPathNode.setNumber('duration', duration);
					pathsProperty.push(waitPathNode);
				}

				const setPathNode = model.createIObject('Set', TWEEN);
				pathsProperty.push(setPathNode);

				this.refreshPaths();
			}
		}
	}

	public removeKeyFrame(time: number): void {
		const editingPath = this.findEditingPath(time, false);
		if (editingPath && editingPath.path.instance.getName() === 'Set') {
			const pathsProperty = this.getPathsProperty();
			const index = this._paths.indexOf(editingPath.path);

			// 1. Remove Set Node
			pathsProperty.splice(index, 1);

			// 2. Merge Wait Node
			this.mergeWaits(pathsProperty);

			// 3. Clean Wait at last
			this.cleanLastWait(pathsProperty);

			this.refreshPaths();
		}
	}

	private mergeWaits(pathsProperty: IArray): void {
		const length = pathsProperty.getLength();
		let lastWait: IObject = null;
		for (let i = 0; i < length; i++) {
			const wait = pathsProperty.getValueAt(i) as IObject;
			if (wait.getName() === 'Wait') {
				if (lastWait) {
					pathsProperty.splice(i, 1);
					lastWait.setNumber('duration', wait.getInstance().duration + lastWait.getInstance().duration);
					this.mergeWaits(pathsProperty);
					return;
				} else {
					lastWait = wait;
				}
			} else {
				lastWait = null;
			}
		}
	}

	private cleanLastWait(pathsProperty: IArray): void {
		const length = pathsProperty.getLength();
		if (length > 0) {
			const node = pathsProperty.getValueAt(length - 1);
			if (node.getName() === 'Wait') {
				pathsProperty.splice(length - 1, 1);
				this.cleanLastWait(pathsProperty);
			}
		}
	}

	public addTween(time: number): void {
		const editingPath = this.findEditingPath(time, true);
		if (editingPath && editingPath.path.instance.getName() === 'Wait') {
			const pathsProperty = this.getPathsProperty();
			const model = this.instance.getExmlModel();
			const index = this._paths.indexOf(editingPath.path);

			// 1. Remove Wait Node
			pathsProperty.splice(index, 1);

			// 2. Add To Node
			const toNode = model.createIObject('To', TWEEN);
			pathsProperty.splice(index, 0, toNode);
			toNode.setProperty('duration', editingPath.path.instance.getProperty('duration'));

			// 3. Add To props
			const setNode = pathsProperty.getValueAt(index + 1) as IObject;
			if (setNode && setNode.getName() === 'Set') {
				pathsProperty.splice(index + 1, 1);
				toNode.setProperty('props', setNode.getProperty('props'));
			}

			// 4. Refresh Paths
			this.refreshPaths();
		}
	}

	public removeTween(time: number): void {
		const editingPath = this.findEditingPath(time, true);
		if (editingPath && editingPath.path.instance.getName() === 'To') {
			const pathsProperty = this.getPathsProperty();
			const model = this.instance.getExmlModel();
			const index = this._paths.indexOf(editingPath.path);

			// 1. Remove To node
			pathsProperty.splice(index, 1);

			// 2. Add Set Node
			const setNode = model.createIObject('Set', TWEEN);
			pathsProperty.splice(index, 0, setNode);
			setNode.setProperty('props', editingPath.path.instance.getProperty('props'));

			// 3. Add Wait Node
			const waitNode = model.createIObject('Wait', TWEEN);
			waitNode.setProperty('duration', editingPath.path.instance.getProperty('duration'));
			pathsProperty.splice(index, 0, waitNode);

			// 4. Merge Wait Node
			this.mergeWaits(pathsProperty);

			// 5. Refresh Paths
			this.refreshPaths();
		}
	}

	public addPath(name: string, index: number, callBack?: (node: IObject) => void): void {
		const model = this.instance.getExmlModel();
		const pathsProperty = this.getPathsProperty();
		const node = model.createIObject(name, TWEEN);

		if (callBack) {
			callBack(node);
		}

		// 1. Add the path
		pathsProperty.splice(index, 0, node);

		// 2. Merge Wait Node
		this.mergeWaits(pathsProperty);

		// 3. Refresh Paths
		this.refreshPaths();
	}

	public removePath(index: number): void {
		const pathsProperty = this.getPathsProperty();
		if (index < 0 || index >= pathsProperty.getLength()) {
			return;
		}

		// 1. Remove the path
		pathsProperty.splice(index, 1);

		// 2. Merge Wait Node
		this.mergeWaits(pathsProperty);

		// 3. Refresh Paths
		this.refreshPaths();
	}

	private getPathsProperty(): IArray {
		let pathsProperty = this.instance.getProperty('paths') as IArray;
		if (!pathsProperty) {
			const model = this.instance.getExmlModel();
			pathsProperty = model.createIArray();
			(<any>pathsProperty).xmlVisible = false;
			this.instance.setProperty('paths', pathsProperty);
		}
		return pathsProperty;
	}

	public get onDidPathsChange(): Event<ITweenPath[]> {
		return this._onDidPathsChange.event;
	}
}

export class TweenPathNode extends BaseTweenNode implements ITweenPath {
	public get duration(): number {
		if (this.instance.getName() === 'Set' ||
			this.instance.getName() === 'Tick') {
			return 0;
		}

		const value = this.instance.getProperty('duration');
		if (value) {
			return value.getInstance();
		} else {
			return this.instance.getInstance().duration || 0;
		}
	}

	public findEffectedPropties(): string[] {
		let result = [];
		const props = this.instance.getProperty('props') as IObject;
		if (props) {
			result = result.concat(props.getPropertyList());
		}
		return result;
	}

	public setProperty(key: string, value: number, onlyInstance: boolean = false): void {
		let props = this.instance.getProperty('props') as IObject;
		if (!props) {
			const model = this.instance.getExmlModel();
			props = model.createIObject('Object', EUI);
			this.instance.setProperty('props', props);
		}
		if (typeof value === 'number') {
			const link = this.instance.getExmlModel().createILink(value.toString());
			if (onlyInstance) {
				props.setInstanceValue(key, value);
			} else {
				props.setProperty(key, link);
			}
		} else {
			var instance = props.getInstance();
			delete instance[key];
			props.setProperty(key, null);
		}
	}
}