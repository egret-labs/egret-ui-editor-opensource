/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as lifecycle from 'vs/base/common/lifecycle';
import * as DOM from 'vs/base/browser/dom';
import { GlobalMouseMoveMonitor } from 'vs/base/browser/globalMouseMoveMonitor';
import { StandardMouseEvent, StandardWheelEvent } from 'vs/base/browser/mouseEvent';
import { KeyCode } from 'vs/base/common/keyCodes';
import { ScrollableElement } from 'vs/base/browser/ui/scrollbar/scrollableElement';
import { ScrollbarVisibility } from 'vs/base/common/scrollable';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IAnimationService } from '../../common/animation';
import { ITweenItem, ITweenPath } from 'egret/exts/exml-exts/exml/common/plugin/IAnimationModel';
import { localize } from 'egret/base/localization/nls';
import { PlayAndPauseOperation, BaseTweenOperation } from '../../common/animationOperations';
import { IconButton } from 'egret/base/browser/ui/buttons';
import { MenuItemConstructorOptions, MenuItem, remote, Menu } from 'electron';
import { Emitter, Event } from 'egret/base/common/event';

const TILE_WIDTH = 10;
const TILE_HEIGHT = 22;
const TILE_SIZE = 5;

function timeToLength(time: number): number {
	const length = time / (250 / TILE_WIDTH / TILE_SIZE);
	return length;
}

function lengthToTime(length: number): number {
	return length * (250 / TILE_WIDTH / TILE_SIZE);
}

function mouseMoveMerger(lastEvent: MouseEvent, currentEvent: MouseEvent): MouseEvent {
	return currentEvent;
}

class BaseTimelineOperation extends BaseTweenOperation {
	constructor(
		@IAnimationService animationService: IAnimationService
	) {
		super(animationService);
	}

	public update(): void {
		this.updateEnablement();
	}
}

class CreateTweemOperation extends BaseTimelineOperation {
	constructor(
		@IAnimationService animationService: IAnimationService
	) {
		super(animationService);
	}

	protected updateEnablement(): void {
		let enabled = true;
		if (!this.animationService.animation) {
			this.enabled = false;
			return;
		}
		const item = this.animationService.animation.getSelectedItem();
		if (!item) {
			this.enabled = false;
			return;
		}
		const time = this.animationService.animation.getTime();
		const editingPath = item.findEditingPath(time, true);
		if (!editingPath || editingPath.path.instance.getName() !== 'Wait') {
			this.enabled = false;
			return;
		}
		this.enabled = enabled;
	}

	public run(): Promise<any> {
		const item = this.animationService.animation && this.animationService.animation.getSelectedItem();
		if (item) {
			item.addTween(this.animationService.animation.getTime());
		}
		return Promise.resolve(null);
	}
}

class DeleteTweenOperation extends BaseTimelineOperation {
	constructor(
		@IAnimationService animationService: IAnimationService
	) {
		super(animationService);
	}

	protected updateEnablement(): void {
		let enabled = true;
		if (!this.animationService.animation) {
			this.enabled = false;
			return;
		}
		const item = this.animationService.animation.getSelectedItem();
		if (!item) {
			this.enabled = false;
			return;
		}
		const time = this.animationService.animation.getTime();
		const editingPath = item.findEditingPath(time, true);
		if (!editingPath || editingPath.path.instance.getName() !== 'To') {
			this.enabled = false;
			return;
		}
		this.enabled = enabled;
	}

	public run(): Promise<any> {
		const item = this.animationService.animation && this.animationService.animation.getSelectedItem();
		if (item) {
			item.removeTween(this.animationService.animation.getTime());
		}
		return Promise.resolve(null);
	}
}

class CreateKeyFrameOperation extends BaseTimelineOperation {
	constructor(
		@IAnimationService animationService: IAnimationService
	) {
		super(animationService);
	}

	protected updateEnablement(): void {
		let enabled = true;
		if (!this.animationService.animation) {
			this.enabled = false;
			return;
		}
		const item = this.animationService.animation.getSelectedItem();
		if (!item) {
			this.enabled = false;
			return;
		}
		const time = this.animationService.animation.getTime();
		const editingPath = item.findEditingPath(time, false);
		if (editingPath) {
			const pathName = editingPath.path.instance.getName();
			if (pathName !== 'To' && pathName !== 'Wait') {
				this.enabled = false;
				return;
			} else if (pathName === 'To' && editingPath.position === 'end') {
				this.enabled = false;
				return;
			}
		}
		this.enabled = enabled;
	}

	public run(): Promise<any> {
		const item = this.animationService.animation && this.animationService.animation.getSelectedItem();
		if (item) {
			item.addKeyFrame(this.animationService.animation.getTime());
		}
		return Promise.resolve(null);
	}
}

class DeleteKeyFrameOperation extends BaseTimelineOperation {
	constructor(
		@IAnimationService animationService: IAnimationService
	) {
		super(animationService);
	}

	protected updateEnablement(): void {
		let enabled = true;
		if (!this.animationService.animation) {
			this.enabled = false;
			return;
		}
		const item = this.animationService.animation.getSelectedItem();
		if (!item) {
			this.enabled = false;
			return;
		}
		const time = this.animationService.animation.getTime();
		const editingPath = item.findEditingPath(time, false);
		if (!editingPath || editingPath.path.instance.getName() !== 'Set') {
			this.enabled = false;
			return;
		}
		this.enabled = enabled;
	}

	public run(): Promise<any> {
		const item = this.animationService.animation && this.animationService.animation.getSelectedItem();
		if (item) {
			item.removeKeyFrame(this.animationService.animation.getTime());
		}
		return Promise.resolve(null);
	}
}

enum ContextMenuId {
	CREATE = 'createTween',
	DELETE_KEY_FRAME = 'deleteKeyFrame',
	CREATE_KEY_FRAME = 'createKeyFrame',
	DELETE = 'deleteTween'
}

class ItemsOperationProvider {

	private _onEnableChanged: Emitter<{ id: string; enable: boolean; }> = new Emitter<{ id: string; enable: boolean; }>();
	private operations: { [key: string]: BaseTimelineOperation };
	constructor(
		@IInstantiationService private instantiationService: IInstantiationService
	) {
		this.init();
	}

	public get onEnableChanged(): Event<{ id: string; enable: boolean; }> {
		return this._onEnableChanged.event;
	}

	private init(): void {
		this.operations = {};
		const createOperation = this.instantiationService.createInstance(CreateTweemOperation);
		createOperation.onEnableChanged((value) => this.operationEnableHandler(ContextMenuId.CREATE, value));
		this.operations[ContextMenuId.CREATE] = createOperation;

		const deleteOperation = this.instantiationService.createInstance(DeleteTweenOperation);
		deleteOperation.onEnableChanged((value) => this.operationEnableHandler(ContextMenuId.DELETE, value));
		this.operations[ContextMenuId.DELETE] = deleteOperation;

		const createKeyFrameOperation = this.instantiationService.createInstance(CreateKeyFrameOperation);
		createKeyFrameOperation.onEnableChanged((value) => this.operationEnableHandler(ContextMenuId.CREATE_KEY_FRAME, value));
		this.operations[ContextMenuId.CREATE_KEY_FRAME] = createKeyFrameOperation;

		const deleteKeyFrameOperation = this.instantiationService.createInstance(DeleteKeyFrameOperation);
		deleteKeyFrameOperation.onEnableChanged((value) => this.operationEnableHandler(ContextMenuId.DELETE_KEY_FRAME, value));
		this.operations[ContextMenuId.DELETE_KEY_FRAME] = deleteKeyFrameOperation;
	}

	private operationEnableHandler(id: string, enable: boolean): void {
		this._onEnableChanged.fire({ id: id, enable: enable });
	}

	public update(): void {
		for (const key in this.operations) {
			if (this.operations.hasOwnProperty(key)) {
				const element = this.operations[key];
				element.update();
			}
		}
	}

	public getOperation(id: string): BaseTweenOperation {
		return this.operations[id];
	}

	public runOperation(id: string): Promise<any> {
		const operation = this.operations[id];
		if (operation && operation.enabled) {
			return operation.run();
		}
		return Promise.resolve();
	}
}

export class TimeLineContainer {

	public domNode: HTMLElement;
	private hContainer: HTMLElement;

	private header: TimeLineHeader;
	private body: HTMLElement;
	private bodyContent: HTMLElement;
	private stamp: TimeLineStamp;

	private tile: TimeLineTile;
	private track: TimeLineTrack;
	private selector: TimeLineSelector;

	private actionBar: TimeLineActionBar;
	private actionProvider: ItemsOperationProvider;

	private position = 0;

	private mouseMoveMonitor = new GlobalMouseMoveMonitor<MouseEvent>();

	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IAnimationService private animationService: IAnimationService
	) {
		this.registerListener();
	}

	private registerListener(): void {
		this.animationService.onDidGroupSelectChange(this.updateItems, this);
		this.animationService.onDidItemsChange(this.updateItems, this);
		this.animationService.onDidItemSelectChange(this.updateSelectedItem, this);
		this.animationService.onDidTimeChange(this.updateTime, this);
		this.animationService.getViewModel().onDidVerticalPositionChange(this.setVerticalPosition, this);
		this.animationService.getViewModel().onDidPlayingChange(isPlaying => {
			if (!isPlaying && this.animationService.animation) {
				let time = this.animationService.animation.getTime();
				const group = this.animationService.animation.getSelectedGroup();
				if (group) {
					time = group.calculateTotalTime(time);
				}
				this.animationService.animation.setTime(time);
			}
		});
	}

	private screenPositionToTime(position: number): number {
		let nativePosition = DOM.getPositionRelativeTo(document.body, this.hContainer).left + position;
		nativePosition = Math.floor(Math.max(nativePosition, 0) / TILE_WIDTH) * TILE_WIDTH;
		return lengthToTime(nativePosition);
	}

	private screenPositionToRow(position: number): number {
		const headerHeight = this.header.domNode.offsetHeight;

		let nativePosition = DOM.getPositionRelativeTo(document.body,this.hContainer).top + position - headerHeight;
		if (nativePosition > 0) {
			nativePosition += DOM.getPositionRelativeTo(this.body, this.bodyContent).top;
		}
		const row = Math.floor(nativePosition / TILE_HEIGHT);
		const items = this.track.getItems();
		if (row < 0 || row >= items.length) {
			return -1;
		} else {
			return row;
		}
	}

	public create(parent: HTMLElement): void {
		this.domNode = DOM.$('.timeLine');
		this.domNode.tabIndex = -1;
		parent.appendChild(this.domNode);
		this.hContainer = DOM.$('.hContainer');
		this.domNode.appendChild(this.hContainer);

		this.actionProvider = this.instantiationService.createInstance(ItemsOperationProvider);
		this.actionProvider.onEnableChanged((obj) => {
			this.setContextMenuEnable(obj.enable, obj.id);
		});
		this.actionProvider.update();
		this.initContextMenuGeneral();

		this.actionBar = this.instantiationService.createInstance(TimeLineActionBar, this.domNode);
		const scrollbar = this.actionBar.scrollbar;
		scrollbar.onScroll(e => {
			if (e.scrollLeftChanged) {
				this.setPosition(e.scrollLeft);
			}
		});

		this.header = new TimeLineHeader(this.hContainer);

		this.body = DOM.$('.body');
		this.hContainer.appendChild(this.body);
		const bodyContent = DOM.$('div');
		bodyContent.style.position = 'relative';
		this.body.appendChild(bodyContent);
		bodyContent.addEventListener('wheel', (browserEvent: MouseWheelEvent) => {
			this.onBodyContentWheel(browserEvent);
		});
		this.bodyContent = bodyContent;
		this.tile = this.instantiationService.createInstance(TimeLineTile, bodyContent);
		this.track = this.instantiationService.createInstance(TimeLineTrack, bodyContent);
		this.selector = this.instantiationService.createInstance(TimeLineSelector, bodyContent);

		this.stamp = this.instantiationService.createInstance(TimeLineStamp, this.hContainer);

		this.attachEventListeners();

		this.updateItems();
		this.setPosition(0);
		this.updateTime(0);
	}

	private onBodyContentWheel(browserEvent: MouseWheelEvent): void {
		let e = new StandardWheelEvent(browserEvent as any);
		let verticalPosition = this.animationService.getViewModel().getVerticalPosition();
		const maxPosition = this.bodyContent.offsetHeight - this.body.offsetHeight;
		verticalPosition = Math.min(maxPosition, verticalPosition - e.deltaY * 50); // SCROLL_WHEEL_SENSITIVITY = 50
		verticalPosition = Math.max(0, verticalPosition);
		this.animationService.getViewModel().setVerticalPosition(verticalPosition);

		if (e.deltaX !== 0) {
			this.setPosition(Math.max(0, this.position - e.deltaX * 50));
		}
	}

	private attachEventListeners(): void {
		DOM.addStandardDisposableListener(this.domNode, 'keyup', e => {
			if (e.keyCode === KeyCode.Space) {
				this.actionBar.playAndPauseOperation.run();
			}
		});

		this.hContainer.addEventListener('mousedown', (e: MouseEvent) => {
			this.actionBar.playAndPauseOperation.pause();
			if (!this.animationService.animation) {
				return;
			}
			const time = this.screenPositionToTime(e.clientX);
			const row = this.screenPositionToRow(e.clientY);

			// 1. Change Time
			this.animationService.animation.setTime(time);

			// 2. Change Selected Node
			if (row >= 0) {
				const group = this.animationService.animation.getSelectedGroup();
				this.animationService.animation.setSelectedItem(group.items[row]);
			}

			if (row < 0) {
				// Start Drag Time when outside the track
				this.mouseMoveMonitor.startMonitoring(mouseMoveMerger, (mouseMoveData: MouseEvent) => {
					const newTime = this.screenPositionToTime(mouseMoveData.clientX);
					if (newTime !== this.animationService.animation.getTime()) {
						this.animationService.animation.setTime(newTime);
					}
				}, () => {
				});
			} else {
				if (e.which === 3) {
					// trigger the context menu on right click
					// this.showContextMenu(e);
					this.createContextMenu().popup({
						window: remote.getCurrentWindow()
					});
				} else {
					// Start Drag Track when inside the track
					this.dragTweenItem();
				}
			}
		});
	}

	/**
	 * 添加一般的上下文菜单
	 */
	private initContextMenuGeneral(): void {
		this.addContextMenuItemGeneral({
			label: localize('tweenController.initContextMenuGeneral.createTweenAnimation', 'Create Tween Animation'),
			id: ContextMenuId.CREATE,
			enabled: this.actionProvider.getOperation(ContextMenuId.CREATE).enabled
		});
		this.addContextMenuItemGeneral({
			label: localize('tweenController.initContextMenuGeneral.deleteTween', 'Delete Tween'),
			id: ContextMenuId.DELETE,
			enabled: this.actionProvider.getOperation(ContextMenuId.DELETE).enabled
		});
		// this.addContextMenuSeparator();
		this.addContextMenuItemGeneral({
			label: localize('tweenController.initContextMenuGeneral.createKeyFrame', 'Add Key Frame'),
			id: ContextMenuId.CREATE_KEY_FRAME,
			enabled: this.actionProvider.getOperation(ContextMenuId.CREATE_KEY_FRAME).enabled
		});
		this.addContextMenuItemGeneral({
			label: localize('tweenController.initContextMenuGeneral.removeKeyFrame', 'Remove Key Frame'),
			id: ContextMenuId.DELETE_KEY_FRAME,
			enabled: this.actionProvider.getOperation(ContextMenuId.DELETE_KEY_FRAME).enabled
		});
	}

	private contextMenuItemsGeneral: { type: 'separator' | 'normal', option: MenuItemConstructorOptions, item: MenuItem }[] = [];
	/**
	 * 在上下文菜单中添加一个分割线
	 */
	private addContextMenuSeparator(): void {
		const option: MenuItemConstructorOptions = { type: 'separator' };
		const item = new remote.MenuItem(option);
		this.contextMenuItemsGeneral.push({ type: 'separator', option: option, item: item });
	}

	/**
	 * 在上下文菜单中添加一个项目
	 * @param option 
	 */
	private addContextMenuItemGeneral(option: MenuItemConstructorOptions): void {
		option.click = (item, win) => {
			this.contextMenuGeneralSelected_handler(option.id as ContextMenuId);
		};
		const item = new remote.MenuItem(option);
		this.contextMenuItemsGeneral.push({
			type: 'normal',
			option: option,
			item: item
		});
	}

	/**
	 * 设置上下文菜单的禁用与否
	 * @param enable 
	 * @param id 
	 */
	private setContextMenuEnable(enable: boolean, id: string = null): void {
		if (id) {
			for (var i = 0; i < this.contextMenuItemsGeneral.length; i++) {
				if (this.contextMenuItemsGeneral[i].option.id == id) {
					this.contextMenuItemsGeneral[i].item.enabled = enable;
					break;
				}
			}
		} else {
			for (var i = 0; i < this.contextMenuItemsGeneral.length; i++) {
				this.contextMenuItemsGeneral[i].item.enabled = enable;
			}
		}
	}

	/**
	 * 上下文菜单被选择
	 * @param itemId 
	 */
	private contextMenuGeneralSelected_handler(action: ContextMenuId): void {
		this.actionProvider.runOperation(action);
	}

	/**
	 * 创建上下文菜单
	 */
	private createContextMenu(): Menu {
		this.actionProvider.update();
		const menu = new remote.Menu();
		for (let i = 0; i < this.contextMenuItemsGeneral.length; i++) {
			const element = this.contextMenuItemsGeneral[i];
			if (element.item.enabled) {
				menu.append(element.item);
			}
		}
		return menu;
	}

	private dragTweenItem(): void {
		const time = this.animationService.animation.getTime();
		const tweenItem = this.animationService.animation.getSelectedItem();
		if (tweenItem) {
			const editingPath = tweenItem.findEditingPath(time, true);
			const pathIndex = editingPath && tweenItem.paths.indexOf(editingPath.path);

			const canDragTweenItem = (): boolean => {
				if (!editingPath) {
					return false;
				}
				if (time === 0 && editingPath.path.instance.getName() !== 'Wait') {
					return true;
				} else {
					if (editingPath.position === 'start' ||
						editingPath.position === 'between') {
						return false;
					}
					if (editingPath.path.duration <= 0) {
						return false;
					}
				}
				return true;
			};

			if (!canDragTweenItem()) {
				return;
			}

			this.domNode.style.cursor = 'pointer';

			const group = this.animationService.animation.getSelectedGroup();
			const itemIndex = group.items.indexOf(tweenItem);

			let newTime: number;
			this.mouseMoveMonitor.startMonitoring(mouseMoveMerger, (mouseMoveData: MouseEvent) => {
				newTime = this.screenPositionToTime(mouseMoveData.clientX);
				this.selector.updateDragSelector(newTime, itemIndex);
			}, () => {
				this.domNode.style.cursor = 'default';
				this.selector.hideDragSelector();
				if (newTime === undefined) {
					return;
				}

				if (time === 0) {
					if (newTime > 0) {
						// Add wait path at first.
						tweenItem.addPath('Wait', 0, node => {
							node.setNumber('duration', newTime);
						});
						this.animationService.animation.setTime(newTime);
					}
				} else {
					const duration = editingPath.path.duration + newTime - time;
					if (duration > 0) {
						editingPath.path.instance.setNumber('duration', duration);
						tweenItem.refreshPaths();
						this.animationService.animation.setTime(newTime);
					} else if (duration === 0 && editingPath.path.instance.getName() === 'Wait' && pathIndex === 0) {
						// Remove wait path at first.
						tweenItem.removePath(pathIndex);
						this.animationService.animation.setTime(newTime);
					}
				}
			});
		}
	}

	public setPosition(position: number): void {
		this.position = position;
		this.hContainer.style.left = `${-position}px`;
		this.updateScollerWidth();
		this.header.setPosition(position);
	}

	public setVerticalPosition(position: number): void {
		this.bodyContent.style.top = `${-position}px`;
	}

	private updateItems(): void {
		this.actionBar.playAndPauseOperation.pause();
		const group = this.animationService.animation && this.animationService.animation.getSelectedGroup();
		if (group) {
			this.tile.update(group.items.length);
			this.track.setItems(group.items);
		} else {
			this.tile.update(0);
			this.track.setItems(null);
		}
		this.updateSelectedItem();
		this.setVerticalPosition(this.animationService.getViewModel().getVerticalPosition());
	}

	private updateSelectedItem(): void {
		this.actionBar.playAndPauseOperation.pause();
		let itemIndex = -1;
		if (this.animationService.animation) {
			const group = this.animationService.animation.getSelectedGroup();
			if (group) {
				const item = group.getSelectedItem();
				if (item) {
					itemIndex = group.items.indexOf(item);
				}
			}
		}
		this.selector.updateFrameSelector(null, itemIndex);
	}

	private updateTime(time: number): void {
		this.actionBar.updateLabel(time);

		const isPlaying = this.animationService.getViewModel().getPlaying();
		if (isPlaying) {
			this.stamp.hide();
			this.selector.hideFrameSelector();

			const group = this.animationService.animation && this.animationService.animation.getSelectedGroup();
			if (group) {
				time = group.calculateTotalTime(time);
			}
		} else {
			this.stamp.show();
			this.stamp.setTime(time);

			this.selector.updateFrameSelector(time, null);
		}

		const position = timeToLength(time);
		const offsetWidth = this.domNode.offsetWidth - TILE_WIDTH;
		if (offsetWidth > 0) {
			if (position <= this.position) {
				this.setPosition(position);
			} else if (position > this.position + offsetWidth) {
				this.setPosition(position - offsetWidth);
			}
		}
	}

	public layout(dimension: DOM.Dimension): void {
		this.hContainer.style.height = (dimension.height - 22) + 'px';
		this.updateScollerWidth();

		const length = Math.ceil(dimension.width / TILE_WIDTH / TILE_SIZE);
		this.header.updateElements(length);

		const headerHeight = this.header.domNode.offsetHeight;
		this.body.style.height = this.hContainer.offsetHeight - headerHeight + 'px';
		this.track.layout(dimension.height);
	}

	private updateScollerWidth(): void {
		let scrollWidth = 2500;
		if (this.animationService.animation) {
			const group = this.animationService.animation.getSelectedGroup();
			if (group) {
				const totalTime = group.calculateTotalDuration();
				scrollWidth = Math.max(timeToLength(totalTime) + 100, scrollWidth);
			}
		}

		let width = 2500 * (1 + Math.ceil(this.position / 2500));
		width = Math.max(scrollWidth, width);
		if (this.hContainer.style.width !== (width + 'px')) {
			this.hContainer.style.width = width + 'px';
		}

		const scrollbar = this.actionBar.scrollbar;
		scrollbar.setScrollDimensions({
			width: scrollbar.getDomNode().offsetWidth,
			scrollWidth: scrollWidth
		});
		scrollbar.setScrollPosition({
			scrollLeft: this.position
		});
	}

}

export class TimeLineHeader {

	public domNode: HTMLElement;
	private elements: HTMLElement[];

	private position = 0;

	constructor(parent: HTMLElement) {
		this.domNode = DOM.$('.header');
		parent.appendChild(this.domNode);
		this.elements = [];
	}

	public setPosition(position: number): void {
		this.position = position;
		this.updateElements();
	}

	private createOneElement(index: number): HTMLElement {
		const element = DOM.$('span');
		this.domNode.append(element);

		// element.offsetWidth = 30
		const offsetLeft = (Math.max(element.offsetWidth, 30) - TILE_WIDTH) / 2;
		const left = (index * TILE_WIDTH * TILE_SIZE - offsetLeft) + 'px';
		element.style.left = left;
		element.setAttribute('index', index + '');
		element.textContent = index / 4 + '';
		return element;
	}

	public updateElements(elementsLength?: number): void {
		if (elementsLength === undefined) {
			elementsLength = this.elements.length;
		}
		const startIndex = Math.ceil(this.position / TILE_WIDTH / TILE_SIZE);
		const endIndex = startIndex + elementsLength - 1;

		const preservedElements: number[] = [];
		// 1. Remove unless elements
		for (let index = this.elements.length - 1; index >= 0; index--) {
			const element = this.elements[index];
			const elementIndex = parseInt(element.getAttribute('index'));
			if (elementIndex < startIndex || elementIndex > endIndex) {
				element.remove();
				this.elements.splice(index, 1);
			} else {
				preservedElements.push(elementIndex);
			}
		}

		// 2. Add elements
		for (let index = startIndex; index <= endIndex; index++) {
			if (preservedElements.indexOf(index) < 0) {
				const element = this.createOneElement(index);
				this.elements.push(element);
			}
		}
	}
}

export class TimeLineTile {
	public domNode: HTMLElement;

	constructor(parent: HTMLElement) {
		this.domNode = DOM.$('.tile');
		parent.appendChild(this.domNode);
	}

	public update(length: number): void {
		this.domNode.style.height = length * TILE_HEIGHT + 'px';
	}
}

export class TimeLineTrackItem {

	private domNode: HTMLElement;
	private content: HTMLElement;
	private selector: HTMLElement;

	private toDispose: lifecycle.IDisposable[];

	constructor(
		parent: HTMLElement,
		private item: ITweenItem,
		@IAnimationService private animationService: IAnimationService
	) {
		this.toDispose = [];
		this.domNode = DOM.$('.trackItem');
		parent.appendChild(this.domNode);
		this.content = DOM.$('.content');
		this.domNode.appendChild(this.content);
		this.selector = DOM.$('.selector');
		this.domNode.appendChild(this.selector);
		this.selector.style.top = '0px';
		DOM.hide(this.selector);

		this.toDispose.push(this.animationService.onDidTimeChange(time => {
			this.updateTime(time);
		}));
	}

	private updateTime(time: number): void {
		const isPlaying = this.animationService.getViewModel().getPlaying();
		if (isPlaying) {
			DOM.show(this.selector);
			const left = timeToLength(this.item.calculateTime(time));
			this.selector.style.left = left + 'px';
		} else {
			DOM.hide(this.selector);
		}
	}

	public fill(): void {
		DOM.clearNode(this.content);
		if (this.item.loop) {
			DOM.addClass(this.domNode, 'loop');
		} else {
			DOM.removeClass(this.domNode, 'loop');
		}
		this.item.paths.forEach(path => {
			const name = path.instance.getName();
			if (name === 'To') {
				this.content.append(this.createToPath(path));
			} else if (name === 'Wait') {
				this.content.append(this.createWaitPath(path));
			} else if (name === 'Set') {
				this.content.append(this.createSetPath(path));
			}
		});
	}

	private createToPath(path: ITweenPath): HTMLElement {
		const element = DOM.$('.to');
		const to: egret.tween.To = path.instance.getInstance();
		const width = timeToLength(to.duration);
		element.style.width = width + 'px';

		element.append(DOM.$('span.first.frame'));

		const arrowLine = DOM.$('span.arrowLine');
		element.appendChild(arrowLine);
		arrowLine.append(DOM.$('span.first.arrow'));
		arrowLine.append(DOM.$('span.last.arrow'));

		element.append(DOM.$('span.last.frame'));

		return element;
	}

	private createWaitPath(path: ITweenPath): HTMLElement {
		const element = DOM.$('.wait');
		const wait: egret.tween.Wait = path.instance.getInstance();
		const width = timeToLength(wait.duration);
		element.style.width = width + 'px';
		return element;
	}

	private createSetPath(path: ITweenPath): HTMLElement {
		const element = DOM.$('.set');
		element.style.width = '0px';
		element.append(DOM.$('span'));
		return element;
	}

	public dispose(): void {
		lifecycle.dispose(this.toDispose);
	}
}

export class TimeLineTrack {
	private domNode: HTMLElement;
	private items: ITweenItem[];

	private toDispose: lifecycle.IDisposable[];

	constructor(
		parent: HTMLElement,
		@IInstantiationService private instantiationService: IInstantiationService
	) {
		this.toDispose = [];
		this.domNode = DOM.$('.track');
		parent.appendChild(this.domNode);
	}

	public getItems(): ITweenItem[] {
		if (this.items) {
			return this.items.concat();
		} else {
			return [];
		}
	}

	public setItems(items: ITweenItem[]): void {
		DOM.clearNode(this.domNode);
		lifecycle.dispose(this.toDispose);
		this.items = items;
		if (items) {
			items.forEach(item => {
				this.createTrack(item);
			});
		}
	}

	private createTrack(item: ITweenItem): void {
		const trackItem = this.instantiationService.createInstance(TimeLineTrackItem, this.domNode, item);
		this.toDispose.push(item.onDidPathsChange(path => {
			trackItem.fill();
		}));
		this.toDispose.push(trackItem);
		trackItem.fill();
	}

	public layout(height: number): void {
		this.domNode.style.height = height + 'px';
	}
}

export class TimeLineSelector {
	private domNode: HTMLElement;

	private frameSelector: HTMLElement;
	private dragSelector: HTMLElement;

	constructor(parent: HTMLElement) {
		this.domNode = DOM.$('div');
		parent.appendChild(this.domNode);
		this.frameSelector = DOM.$('.frameFlag.selector');
		this.domNode.appendChild(this.frameSelector);
		this.dragSelector = DOM.$('.dragFlag.selector');
		this.domNode.appendChild(this.dragSelector);

		this.updateFrameSelector(0, 0);
		this.updateDragSelector(0, 0);

		DOM.hide(this.frameSelector);
		DOM.hide(this.dragSelector);
	}

	public updateFrameSelector(time: number, row: number): void {
		DOM.show(this.frameSelector);
		if (typeof time === 'number') {
			const left = timeToLength(time);
			this.frameSelector.style.left = left + 'px';
		}
		if (typeof row === 'number') {
			const top = row * TILE_HEIGHT;
			this.frameSelector.style.top = top + 'px';

			if (row < 0) {
				DOM.hide(this.frameSelector);
			}
		}
	}

	public hideFrameSelector(): void {
		DOM.hide(this.frameSelector);
	}

	public updateDragSelector(time: number, row: number): void {
		DOM.show(this.dragSelector);
		if (typeof time === 'number') {
			const left = timeToLength(time);
			this.dragSelector.style.left = left + 'px';
		}
		if (typeof row === 'number') {
			const top = row * TILE_HEIGHT;
			this.dragSelector.style.top = top + 'px';
		}
	}

	public hideDragSelector(): void {
		DOM.hide(this.dragSelector);
	}
}

export class TimeLineStamp {

	private domNode: HTMLElement;
	private dragHeader: HTMLElement;

	private time: number = 0;

	constructor(
		parent: HTMLElement,
		@IAnimationService private animationService: IAnimationService
	) {
		this.domNode = DOM.$('.stamp');
		parent.appendChild(this.domNode);
		this.dragHeader = DOM.$('.drag-header');
		this.domNode.appendChild(this.dragHeader);
		this.domNode.appendChild(DOM.$('.drag-body'));
	}

	public setTime(time: number): void {
		this.time = time;
		const offset = timeToLength(time);
		this.domNode.style.left = offset + 'px';
	}

	public show(): void {
		DOM.show(this.domNode);
	}

	public hide(): void {
		DOM.hide(this.domNode);
	}
}

export class TimeLineActionBar {

	private domNode: HTMLElement;
	private timeLabel: HTMLElement;

	public scrollbar: ScrollableElement;
	private scrollableElement: HTMLElement;

	public playAndPauseOperation: PlayAndPauseOperation;
	private playAndPauseIcon: IconButton;

	constructor(
		parent: HTMLElement,
		@IInstantiationService private instantiationService: IInstantiationService
	) {
		this.domNode = DOM.$('.action-bar');
		parent.appendChild(this.domNode);
		this.initOperationButton(this.domNode);

		this.playAndPauseOperation = this.instantiationService.createInstance(PlayAndPauseOperation);
		this.playAndPauseOperation.onCheckedChanged((value) => this.toogleButtonState(value));

		this.timeLabel = DOM.$('.time-label');
		this.domNode.appendChild(this.timeLabel);

		const scrollableElement = document.createElement('div');
		scrollableElement.style.width = '100%';
		scrollableElement.style.height = '18px';
		scrollableElement.style.visibility = 'false';

		this.scrollableElement = scrollableElement;
		this.scrollbar = new ScrollableElement(scrollableElement, {
			horizontal: ScrollbarVisibility.Visible,
			horizontalHasArrows: true,
			horizontalScrollbarSize: 18,
			horizontalSliderSize: 10,
			arrowSize: 18,
			vertical: ScrollbarVisibility.Hidden,
			useShadows: false
		});
		this.domNode.append(this.scrollbar.getDomNode());
	}

	private initOperationButton(barContainer: HTMLElement): void {
		this.playAndPauseIcon = new IconButton(barContainer);
		this.playAndPauseIcon.iconClass = 'playAction';
		this.playAndPauseIcon.toolTip = localize('tweenController.play', 'Play');
		this.playAndPauseIcon.onClick(e => {
			this.playAndPauseOperation.run();
		});
	}

	private toogleButtonState(value: boolean): void {
		if (value) {
			this.playAndPauseIcon.iconClass = 'pauseAction';
			this.playAndPauseIcon.toolTip = localize('tweenController.stop', 'Stop');
		} else {
			this.playAndPauseIcon.iconClass = 'playAction';
			this.playAndPauseIcon.toolTip = localize('tweenController.play', 'Play');
		}
	}

	public updateLabel(time: number): void {
		this.timeLabel.textContent = (time / 1000).toFixed(2) + 's';
	}
}