import { Emitter, Event } from 'egret/base/common/event';
import { IAnimationModel, IAnimationModelEvent } from './IAnimationModel';
import * as lifecycle from 'egret/base/common/lifecycle';
import { INode, IArray, IObject } from '../exml/treeNodes';
import { TweenGroupNode, TweenItemNode } from '../exml/tweenNodesImpl';
import { IExmlModel } from '../exml/models';
import { TWEEN, W_EUI } from '../project/parsers/core/commons';

/**
 * Animation model implement
 */
export class AnimationModel implements IAnimationModel {

	private groups: TweenGroupNode[] = [];
	private tweenTargets: IObject[] = [];
	private tweenItemDispose: lifecycle.IDisposable[] = [];

	private owner: IExmlModel;
	public init(owner: IExmlModel): void {
		this.owner = owner;
	}

	protected getOwner(): IExmlModel {
		return this.owner;
	}

	private _onTimeChanged: Emitter<IAnimationModelEvent>;
	public get onTimeChanged(): Event<IAnimationModelEvent> {
		return this._onTimeChanged.event;
	}
	private _onEnableChanged: Emitter<IAnimationModelEvent>;
	public get onEnableChanged(): Event<IAnimationModelEvent> {
		return this._onEnableChanged.event;
	}
	private _onGroupChanged: Emitter<IAnimationModelEvent>;
	public get onGroupChanged(): Event<IAnimationModelEvent> {
		return this._onGroupChanged.event;
	}
	private _onTweenGroupSelectChanged: Emitter<IAnimationModelEvent>;
	public get onTweenGroupSelectChanged(): Event<IAnimationModelEvent> {
		return this._onTweenGroupSelectChanged.event;
	}
	private _onNodeSelectChanged: Emitter<IAnimationModelEvent>;
	public get onNodeSelectChanged(): Event<IAnimationModelEvent> {
		return this._onNodeSelectChanged.event;
	}

	/**
	 *
	 */
	constructor() {
		this._onTimeChanged = new Emitter<IAnimationModelEvent>();
		this._onEnableChanged = new Emitter<IAnimationModelEvent>();
		this._onGroupChanged = new Emitter<IAnimationModelEvent>();
		this._onTweenGroupSelectChanged = new Emitter<IAnimationModelEvent>();
		this._onNodeSelectChanged = new Emitter<IAnimationModelEvent>();
	}

	private onRootChange(): void {
		// Save current select group and item
		let lastGroupId: string;
		let lastGroupIndex: number = 0;
		let lastItemIndex: number = 0;
		if (this.selectedGroup) {
			lastGroupId = this.selectedGroup.instance.getId();
			lastGroupIndex = this.groups.indexOf(this.selectedGroup);

			const selectedItem = this.selectedGroup.getSelectedItem();
			lastItemIndex = selectedItem ? this.selectedGroup.items.indexOf(selectedItem) : 0;
		}

		const declarations: IArray = this.getOwner().getDeclarations();
		this.groups = [];
		if (declarations) {
			for (var i = 0; i < declarations.getLength(); i++) {
				var element = declarations.getValueAt(i);
				if (element.getNs().uri === TWEEN.uri) {
					this.groups.push(new TweenGroupNode(element as IObject));
				}
			}
		}
		this._onGroupChanged.fire({ target: this });
		if (this.groups.length > 0) {
			if (lastGroupId) {
				this.groups.some((group, index) => {
					if (group.instance.getId() === lastGroupId) {
						lastGroupIndex = index;
						return true;
					}
					return false;
				});
			}
			if (lastGroupIndex < this.groups.length) {
				this.setSelectedGroup(this.groups[lastGroupIndex]);
			} else {
				this.setSelectedGroup(this.groups[0]);
			}

			if (lastItemIndex < this.selectedGroup.items.length) {
				this.selectedGroup.setSelectedItem(this.selectedGroup.items[lastItemIndex]);
			}
		} else {
			this.setSelectedGroup(null);
		}
		this.setTime(this._time);
	}

	private onSelectedNodeChange(): void {
		this.changeSelectedItem();
		this._onNodeSelectChanged.fire({ target: this });
	}

	public getSelectedNode(): INode {
		const nodes = this.getOwner().getSelectedNodes();
		if (this.getEnabled() && nodes.length > 0) {
			return nodes[0];
		} else {
			return null;
		}
	}

	private changeSelectedItem(): void {
		const group = this.getSelectedGroup();
		if (group) {
			const node = this.getSelectedNode();
			group.items.some(item => {
				if (item.target === node) {
					if (group.getSelectedItem() !== item) {
						group.setSelectedItem(item);
					}
					return true;
				} else {
					return false;
				}
			});
		}
	}

	private _enabled: boolean = false;
	public getEnabled(): boolean {
		return this._enabled;
	}

	private ownerListenerDisposeList: lifecycle.IDisposable[] = [];
	public setEnabled(value: boolean): void {
		if (value === this._enabled) {
			return;
		}
		if (!value) {
			// clean up
			this.setSelectedGroup(null);
		}

		this._enabled = value;

		if (value) {
			this.ownerListenerDisposeList.push(this.getOwner().onRootChanged((e) => {
				this.onRootChange();
			}));
			this.ownerListenerDisposeList.push(this.getOwner().onSelectedListChanged((e) => {
				this.onSelectedNodeChange();
			}));
		} else {
			while (this.ownerListenerDisposeList.length > 0) {
				this.ownerListenerDisposeList.pop().dispose();
			}
		}
		this._onEnableChanged.fire({ target: this });

		if (value) {
			// first refresh groups and items
			this.onRootChange();
			this.onSelectedNodeChange();
		}
	}

	private _time: number = 0;
	public getTime(): number {
		return this._time;
	}
	public setTime(value: number): void {
		if (value < 0) {
			value = 0;
		}
		if (this.groups.length === 0) {
			return;
		}
		this._time = value;
		this.updateTweenTargets();
		this._onTimeChanged.fire({ target: this });
	}

	private selectedGroup: TweenGroupNode;
	public setSelectedGroup(value: TweenGroupNode): void {
		this.selectedGroup = value;
		this.updateTweenTargets();
		if (this.selectedGroup) {
			this.selectedGroup.selectTarget(this.getSelectedItem());
		}
		this._onTweenGroupSelectChanged.fire({ target: this });
	}

	public getSelectedGroup(): TweenGroupNode {
		return this.selectedGroup;
	}

	public setSelectedItem(item: TweenItemNode): void {
		if (this.selectedGroup) {
			this.selectedGroup.setSelectedItem(item);
		}
	}

	public getSelectedItem(): TweenItemNode {
		const group = this.getSelectedGroup();
		return group && group.getSelectedItem();
	}

	public getTweenGroups(): TweenGroupNode[] {
		return this.groups;
	}

	public inKeyFrame(): boolean {
		if (this._enabled) {
			const item = this.getSelectedItem();
			if (item && item.target === this.getSelectedNode() && item.isKeyFrame(this._time)) {
				return true;
			}
		}
		return false;
	}

	private disposeTweenTarget(): void {
		this.tweenItemDispose = lifecycle.dispose(this.tweenItemDispose);
		this.tweenTargets.forEach(node => {
			node.refresh();
		});
		this.tweenTargets.length = 0;
	}

	private updateTweenTargets(): void {
		this.disposeTweenTarget();

		const group = this.getSelectedGroup();
		if (!group) {
			return;
		}
		group.items.forEach(item => {
			const target = item.target;
			if (!target) {
				return;
			}
			// target has been refreshed.
			this.updateTweenTarget(item, false);
			this.tweenTargets.push(target);
			this.tweenItemDispose.push(item.onDidPathsChange(() => {
				this.updateTweenTarget(item, true);
			}));
		});
	}

	private updateTweenTarget(item: TweenItemNode, refresh: boolean = false): void {
		if (!item.target) {
			return;
		}
		if (refresh) {
			item.target.refresh();
		}
		const result = item.calculateValue(this._time);
		item.target.setInstanceValues(result);
	}

	public addTweenGroup(): Promise<TweenGroupNode> {
		let decl = this.getOwner().getDeclarations();
		if (!decl) {
			const array = this.getOwner().createIArray('Declarations', W_EUI);
			this.getOwner().getRootNode().setProperty('w:Declarations', array, false);
			decl = this.getOwner().getDeclarations();
		}
		const tween = this.getOwner().createIObject('TweenGroup', TWEEN);
		decl.splice(decl.getLength(), 0, tween);

		const group = new TweenGroupNode(tween);
		this.groups.push(group);	
		this._onGroupChanged.fire({ target: this });
		return Promise.resolve(group);
	}

	public removeTweenGroup(group: TweenGroupNode): Promise<void> {
		const host = group.instance.getHost() as IArray;
		const index = host.indexOf(group.instance);

		if (index >= 0) {
			host.splice(index, 1);
		}
		this.groups.splice(this.groups.indexOf(group), 1);

		if (group === this.selectedGroup) {
			const newIndex = Math.min(this.groups.length - 1, index);
			if (newIndex >= 0 && this.groups[newIndex]) {
				this.setSelectedGroup(this.groups[newIndex]);
			} else {
				this.setSelectedGroup(null);
			}
		}

		this._onGroupChanged.fire({ target: this });
		return Promise.resolve(void 0);
	}
}
