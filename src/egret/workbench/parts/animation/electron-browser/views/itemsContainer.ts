/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as lifecycle from 'vs/base/common/lifecycle';
import { IMouseEvent } from 'vs/base/browser/mouseEvent';
import * as DOM from 'vs/base/browser/dom';
import { Emitter, Event } from 'egret/base/common/event';
import * as tree from 'vs/base/parts/tree/browser/tree';
import * as treeImpl from 'vs/base/parts/tree/browser/treeImpl';
import * as treeDefaults from 'vs/base/parts/tree/browser/treeDefaults';
import { ScrollEvent } from 'vs/base/common/scrollable';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IAnimationService } from '../../common/animation';
import { ITweenItem } from 'egret/exts/exml-exts/exml/common/plugin/IAnimationModel';
import { localize } from 'egret/base/localization/nls';
import { AddTweenItemOperation, RemoveTweenItemOperation, CopyTweenItemOperation, PasteTweenItemOperation, BaseTweenOperation } from '../../common/animationOperations';
import { IDisposable } from 'egret/base/common/lifecycle';
import { MenuItemConstructorOptions, MenuItem, remote, Menu } from 'electron';
import { IconButton } from 'egret/base/browser/ui/buttons';
import { SystemCommands } from 'egret/platform/operations/commands/systemCommands';

export class ItemsContainer implements IDisposable {

	public domNode: HTMLElement;

	private title: HTMLElement;
	private treeContainer: HTMLElement;

	private tree: treeImpl.Tree;

	private isUpdatingPostion: boolean;
	private actionProvider: ItemsOperationProvider;

	private addTweenItemIcon: IconButton;
	private deleteTweenItemIcon: IconButton;
	private copyTweenItemIcon: IconButton;
	private pasteTweenItemIcon: IconButton;
	private toDispose: lifecycle.IDisposable[];
	private tweenItemDispose: lifecycle.IDisposable[];

	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IAnimationService private animationService: IAnimationService,
	) {
		this.toDispose = [];
		this.tweenItemDispose = [];
		this.registerListener();
	}

	private registerListener(): void {
		this.toDispose.push(this.animationService.onDidGroupSelectChange(this.updateItems, this));
		this.toDispose.push(this.animationService.onDidItemsChange(this.updateItems, this));
		this.toDispose.push(this.animationService.onDidItemSelectChange(this.updateSelectedItem, this));
		this.toDispose.push(this.animationService.getViewModel().onDidVerticalPositionChange(this.setVerticalPosition, this));
	}

	private updateItems(): void {
		lifecycle.dispose(this.tweenItemDispose);
		const input: ITweenItemInput = Object.create(null);
		const group = this.animationService.animation && this.animationService.animation.getSelectedGroup();
		if (group) {
			input.items = group.items;
		} else {
			input.items = [];
		}
		input.items.forEach(item => {
			this.tweenItemDispose.push(item.onDidPathsChange(paths => {
				this.tree.refresh(item);
			}));
		});
		this.tree.setInput(input).then(() => {
			this.updateSelectedItem();
		});
	}

	private updateSelectedItem(): void {
		const group = this.animationService.animation && this.animationService.animation.getSelectedGroup();
		if (group) {
			const item = group.getSelectedItem();
			if (item) {
				this.tree.setFocus(item);
				this.tree.setSelection([item]);
				this.tree.reveal(item);
			} else {
				this.tree.clearSelection();
			}
		} else {
			this.tree.clearSelection();
		}
	}

	public create(parent: HTMLElement): void {
		this.domNode = DOM.$('.items');
		parent.appendChild(this.domNode);
		this.title = DOM.$('.titleDescription');
		this.title.textContent = localize('animationView.animation', 'Animation');
		this.domNode.appendChild(this.title);

		this.actionProvider = this.instantiationService.createInstance(ItemsOperationProvider);
		this.actionProvider.onEnableChanged((obj) => {
			this.setIconButtonState(obj.enable, obj.id);
		});


		this.treeContainer = DOM.$('.tree');
		this.domNode.appendChild(this.treeContainer);
		this.tree = new treeImpl.Tree(this.treeContainer, {
			dataSource: this.instantiationService.createInstance(TweenItemDataSource),
			renderer: this.instantiationService.createInstance(TweenItemRenderer),
			controller: this.instantiationService.createInstance(TweenItemController, this.actionProvider)
		}, { alwaysFocused: true, twistiePixels: 0 });

		var actionContainer = DOM.$('.action-bar');
		this.domNode.appendChild(actionContainer);
		this.handleOperation(actionContainer);

		this.updateItems();
	}

	/**
	 * 初始化各种用到的operation
	 */
	private handleOperation(barContainer: HTMLElement): void {
		this.addTweenItemIcon = new IconButton(barContainer);
		this.addTweenItemIcon.iconClass = 'add-state';
		this.addTweenItemIcon.toolTip = localize('animationView.handleOperation.addTweenItem', 'Add Tween Item');
		this.toDispose.push(this.addTweenItemIcon.onClick(e => {
			this.actionProvider.runOperation(ContextMenuId.ADD);
		}));
		this.setIconButtonState(this.actionProvider.getOperation(ContextMenuId.ADD).enabled, ContextMenuId.ADD);

		this.deleteTweenItemIcon = new IconButton(barContainer);
		this.deleteTweenItemIcon.iconClass = 'deleteAction';
		this.deleteTweenItemIcon.toolTip = localize('animationView.handleOperation.removeTweenItem', 'Remove Tween Item');
		this.toDispose.push(this.deleteTweenItemIcon.onClick(e => {
			this.actionProvider.runOperation(ContextMenuId.DELETE);
		}));
		this.setIconButtonState(this.actionProvider.getOperation(ContextMenuId.DELETE).enabled, ContextMenuId.DELETE);

		this.copyTweenItemIcon = new IconButton(barContainer);
		this.copyTweenItemIcon.iconClass = 'copyAction';
		this.copyTweenItemIcon.toolTip = localize('animationView.handleOperation.copyTweenItem', 'Copy Tween Item');
		this.toDispose.push(this.copyTweenItemIcon.onClick(e => {
			this.actionProvider.runOperation(ContextMenuId.COPY);
		}));
		this.setIconButtonState(this.actionProvider.getOperation(ContextMenuId.COPY).enabled, ContextMenuId.COPY);

		this.pasteTweenItemIcon = new IconButton(barContainer);
		this.pasteTweenItemIcon.iconClass = 'pasteAction';
		this.pasteTweenItemIcon.toolTip = localize('animationView.handleOperation.pasteTweenItem', 'Paste Tween Item');
		this.toDispose.push(this.pasteTweenItemIcon.onClick(e => {
			this.actionProvider.runOperation(ContextMenuId.PASTE);
		}));
		this.setIconButtonState(this.actionProvider.getOperation(ContextMenuId.PASTE).enabled, ContextMenuId.PASTE);
	}

	private setIconButtonState(enable: boolean, id: string = null): void {
		switch (id) {
			case ContextMenuId.ADD:
				if (enable) {
					this.addTweenItemIcon.enable();
				} else {
					this.addTweenItemIcon.disable();
				}
				break;
			case ContextMenuId.COPY:
				if (enable) {
					this.copyTweenItemIcon.enable();
				} else {
					this.copyTweenItemIcon.disable();
				}
				break;
			case ContextMenuId.DELETE:
				if (enable) {
					this.deleteTweenItemIcon.enable();
				} else {
					this.deleteTweenItemIcon.disable();
				}
				break;
			case ContextMenuId.PASTE:
				if (enable) {
					this.pasteTweenItemIcon.enable();
				} else {
					this.pasteTweenItemIcon.disable();
				}
				break;

			default:
				break;
		}
	}

	/**
	 * 运行一个命令
	 * @param command 要运行的命令
	 */
	public executeCommand<T>(command: string, ...args): Promise<any> {
		switch (command) {
			case SystemCommands.COPY:
				this.actionProvider.runOperation(ContextMenuId.COPY);
				break;
			case SystemCommands.PASTE:
				this.actionProvider.runOperation(ContextMenuId.PASTE);
				break;
			case SystemCommands.DELETE:
				this.actionProvider.runOperation(ContextMenuId.DELETE);
				break;
			default:
				break;
		}
		return Promise.resolve(void 0);
	}

	public setVerticalPosition(position: number): void {
		const viewHeight = this.tree.getHTMLElement().offsetHeight;
		const totalHeight = this.tree.getContentHeight();
		// Don't update position when tree is offDOM or position has been updated.
		if (viewHeight === 0 || this.isUpdatingPostion) {
			return;
		}
		this.isUpdatingPostion = true;
		this.tree.setScrollPosition(position / (totalHeight - viewHeight));
		this.isUpdatingPostion = false;
	}

	public layout(height: number): void {
		const treeHeight = height - this.title.offsetHeight - 22;
		this.treeContainer.style.height = treeHeight + 'px';
		this.tree.layout(treeHeight);
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.toDispose.forEach(v => v.dispose());
		this.tweenItemDispose.forEach(v => v.dispose());
		this.toDispose = [];
		this.tweenItemDispose = [];
	}
}

interface ITweenItemInput {
	items: ITweenItem[];
}

interface IItemTemplateData {
	root: HTMLElement;
	label: HTMLElement;
}

class ItemsOperationProvider {

	private _onEnableChanged: Emitter<{ id: string; enable: boolean; }> = new Emitter<{ id: string; enable: boolean; }>();
	private operations: { [key: string]: BaseTweenOperation };
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
		const addOperation = this.instantiationService.createInstance(AddTweenItemOperation);
		addOperation.onEnableChanged((value) => this.operationEnableHandler(ContextMenuId.ADD, value));
		this.operations[ContextMenuId.ADD] = addOperation;

		const removeOperation = this.instantiationService.createInstance(RemoveTweenItemOperation);
		removeOperation.onEnableChanged((value) => this.operationEnableHandler(ContextMenuId.DELETE, value));
		this.operations[ContextMenuId.DELETE] = removeOperation;

		const copyOperation = this.instantiationService.createInstance(CopyTweenItemOperation);
		copyOperation.onEnableChanged((value) => this.operationEnableHandler(ContextMenuId.COPY, value));
		this.operations[ContextMenuId.COPY] = copyOperation;

		const pasteOperation = this.instantiationService.createInstance(PasteTweenItemOperation);
		pasteOperation.onEnableChanged((value) => this.operationEnableHandler(ContextMenuId.PASTE, value));
		this.operations[ContextMenuId.PASTE] = pasteOperation;
	}

	private operationEnableHandler(id: string, enable: boolean): void {
		this._onEnableChanged.fire({ id: id, enable: enable });
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

class TweenItemDataSource implements tree.IDataSource {

	constructor() {
	}

	public getId(tree: tree.ITree, element: any): string {
		if (element.items) {
			return 'root';
		} else {
			return (<ITweenItem>element).instance.getXmlPath().join('-');
		}
	}

	public hasChildren(tree: tree.ITree, element: any): boolean {
		if (element.items) {
			return true;
		} else {
			return false;
		}
	}

	public getChildren(tree: tree.ITree, element: any): Promise<any> {
		return Promise.resolve(element.items);
	}

	public getParent(tree: tree.ITree, element: any): Promise<any> {
		return Promise.resolve(null);
	}
}

class TweenItemRenderer implements tree.IRenderer {

	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IAnimationService private animationService: IAnimationService
	) {
	}

	public getHeight(tree: tree.ITree, element: any): number {
		return 22;
	}

	public getTemplateId(tree: tree.ITree, element: any): string {
		return 'item';
	}

	public renderTemplate(tree: tree.ITree, templateId: string, container: HTMLElement): IItemTemplateData {
		const data = <IItemTemplateData>Object.create(null);
		data.root = container;
		const label = DOM.$('.item-label');
		container.appendChild(label);
		data.label = label;
		return data;
	}

	public renderElement(tree: tree.ITree, element: ITweenItem, templateId: string, templateData: IItemTemplateData): void {
		const index = (<ITweenItemInput>tree.getInput()).items.indexOf(element);
		DOM.removeClass(templateData.label, 'error');
		if (element.target) {
			const id = element.target.getId();
			templateData.root.title = id;
			templateData.label.textContent = id ? `${index} - ${id}` : index + '';

			if (element.loop) {
				DOM.addClass(templateData.root, 'loop');
			} else {
				DOM.removeClass(templateData.root, 'loop');
			}
		} else {
			DOM.addClass(templateData.label, 'error');

			const target = element.instance.getProperty('target');
			let id: string = '';
			if (target && 'getRelativeIdList' in target) {
				const ids: string[] = (<any>target).getRelativeIdList();
				if (ids && ids.length > 0) {
					id = ids[0];
				}
			}
			templateData.root.title = localize('animationView.targetObjectInvalid', 'Animation corresponding to the target object "{0}" does not exist, please re set the target node', id);
			templateData.label.textContent = `${index} - ` + localize('animationView.invalidAnimationTarget', 'Invalid animation target');
		}
	}

	public disposeTemplate(tree: tree.ITree, templateId: string, templateData: any): void {

	}
}

enum ContextMenuId {
	ADD = 'newAnimation',
	COPY = 'copy',
	PASTE = 'paste',
	DELETE = 'delete'
}

class TweenItemController extends treeDefaults.DefaultController {

	constructor(
		private actionProvider: ItemsOperationProvider,
		@IInstantiationService private instantiationService: IInstantiationService,
		@IAnimationService private animationService: IAnimationService
	) {
		super();
		this.actionProvider.onEnableChanged((obj) => {
			this.setContextMenuEnable(obj.enable, obj.id);
		});
		this.initContextMenuGeneral();
	}

	/**
	 * 添加一般的上下文菜单
	 */
	private initContextMenuGeneral(): void {
		this.addContextMenuItemGeneral({
			label: localize('animationView.handleOperation.addTweenItem', 'Add Tween Item'),
			id: ContextMenuId.ADD,
			enabled: this.actionProvider.getOperation(ContextMenuId.ADD).enabled
		});
		this.addContextMenuItemGeneral({
			label: localize('animationView.handleOperation.removeTweenItem', 'Remove Tween Item'),
			id: ContextMenuId.DELETE,
			enabled: this.actionProvider.getOperation(ContextMenuId.DELETE).enabled
		});
		this.addContextMenuItemGeneral({
			label: localize('animationView.handleOperation.copyTweenItem', 'Copy Tween Item'),
			id: ContextMenuId.COPY,
			enabled: this.actionProvider.getOperation(ContextMenuId.COPY).enabled
		});
		this.addContextMenuItemGeneral({
			label: localize('animationView.handleOperation.pasteTweenItem', 'Paste Tween Item'),
			id: ContextMenuId.PASTE,
			enabled: this.actionProvider.getOperation(ContextMenuId.PASTE).enabled
		});
	}

	private contextMenuItemsGeneral: { type: 'separator' | 'normal', option: MenuItemConstructorOptions, item: MenuItem }[] = [];
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
		const menu = new remote.Menu();
		for (let i = 0; i < this.contextMenuItemsGeneral.length; i++) {
			menu.append(this.contextMenuItemsGeneral[i].item);
		}
		return menu;
	}

	protected onLeftClick(tree: tree.ITree, element: any, event: IMouseEvent): boolean {
		if (tree.getInput() === element) {
			return true;
		}

		const animation = this.animationService.animation;
		if (animation && element !== animation.getSelectedItem()) {
			animation.setSelectedItem(element);
		}

		return super.onLeftClick(tree, element, event);
	}

	public onContextMenu(tree: tree.ITree, element: any, event: tree.ContextMenuEvent): boolean {
		const animation = this.animationService.animation;
		if (tree.getInput() !== element) {
			if (animation && element !== animation.getSelectedItem()) {
				animation.setSelectedItem(element);
			}
		}

		setTimeout(() => {
			this.createContextMenu().popup(remote.getCurrentWindow());
		}, 10);
		return true;
	}

	public onScroll(tree: tree.ITree, event: ScrollEvent): boolean {
		this.animationService.getViewModel().setVerticalPosition(event.scrollTop);
		return true;
	}
}