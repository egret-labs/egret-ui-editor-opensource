/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { isMacintosh } from 'vs/base/common/platform';
import { KeyMod, KeyCode } from 'vs/base/common/keyCodes';
import { IKeyboardEvent } from 'vs/base/browser/keyboardEvent';
import { IMouseEvent } from 'vs/base/browser/mouseEvent';
import * as lifecycle from 'vs/base/common/lifecycle';
import * as DOM from 'vs/base/browser/dom';
import { once } from 'vs/base/common/functional';
import { TextInput } from 'egret/base/browser/ui/inputs';
import * as tree from 'vs/base/parts/tree/browser/tree';
import * as treeImpl from 'vs/base/parts/tree/browser/treeImpl';
import * as treeDefaults from 'vs/base/parts/tree/browser/treeDefaults';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IAnimationService } from '../../common/animation';
import { ITweenGroup } from 'egret/exts/exml-exts/exml/common/plugin/IAnimationModel';
import { IconButton } from 'egret/base/browser/ui/buttons';
import { localize } from 'egret/base/localization/nls';
import { AddTweenGroupOperation, RemoveTweenGroupOperation } from '../../common/animationOperations';
import { IDisposable } from 'egret/base/common/lifecycle';

export class GroupContainer implements IDisposable {

	public domNode: HTMLElement;

	private title: HTMLElement;
	private treeContainer: HTMLElement;

	private tree: treeImpl.Tree;

	private addOperation: AddTweenGroupOperation;
	private removeOperation: RemoveTweenGroupOperation;

	private deleteGroupIcon: IconButton;
	private addGroupIcon: IconButton;
	private _dispose: Array<lifecycle.IDisposable>;

	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IAnimationService private animationService: IAnimationService
	) {
		this._dispose = [];
		this.registerListener();
	}

	private registerListener(): void {
		this.animationService.onDidGroupSelectChange(this.updateSelect, this);
		this.animationService.onDidGroupsChange(this.updateGroups, this);
		this.animationService.getViewModel().onDidEditTweenGroup(e => {
			this.tree.refresh();
		});
	}

	public create(parent: HTMLElement): void {
		this.domNode = DOM.$('.group');
		parent.appendChild(this.domNode);
		this.title = DOM.$('.titleDescription');
		this.title.textContent = localize('animationView.group', 'Group');
		this.domNode.appendChild(this.title);

		this.treeContainer = DOM.$('.tree');
		this.domNode.appendChild(this.treeContainer);
		this.tree = new treeImpl.Tree(this.treeContainer, {
			dataSource: this.instantiationService.createInstance(TweenGroupDataSource),
			renderer: this.instantiationService.createInstance(TweenGroupRenderer),
			controller: this.instantiationService.createInstance(TweenGroupController)
		}, { alwaysFocused: true, twistiePixels: 0 });


		this.addOperation = this.instantiationService.createInstance(AddTweenGroupOperation);
		this._dispose.push(this.addOperation.onEnableChanged((value) => {
			this.updateButtonState();
		}));
		this.removeOperation = this.instantiationService.createInstance(RemoveTweenGroupOperation);
		this._dispose.push(this.removeOperation.onEnableChanged((value) => {
			this.updateButtonState();
		}));

		var actionContainer = DOM.$('.action-bar');
		this.domNode.appendChild(actionContainer);
		this.handleOperation(actionContainer);
		this.updateGroups();
	}

	private updateGroups(groups?: ITweenGroup[]): void {
		const input: ITweenGroupInput = Object.create(null);
		if (this.animationService.animation) {
			input.groups = this.animationService.animation.getTweenGroups();
		} else {
			input.groups = [];
		}
		this.tree.setInput(input).then(() => {
			this.updateSelect();
		});
	}

	private updateSelect(): void {
		const group = this.animationService.animation && this.animationService.animation.getSelectedGroup();
		if (group) {
			this.tree.setFocus(group);
			this.tree.setSelection([group]);
		} else {
			this.tree.clearSelection();
		}
	}

	/**
	 * 初始化各种用到的operation
	 */
	private handleOperation(barContainer: HTMLElement): void {
		this.addGroupIcon = new IconButton(barContainer);
		this.addGroupIcon.iconClass = 'add-state';
		this.addGroupIcon.toolTip = localize('animationView.handleOperation.addGroup', 'Add Group');
		this._dispose.push(this.addGroupIcon.onClick(e => {
			this.addOperation.run();
		}));

		this.deleteGroupIcon = new IconButton(barContainer);
		this.deleteGroupIcon.iconClass = 'deleteAction';
		this.deleteGroupIcon.toolTip = localize('animationView.handleOperation.removeGroup', 'Delete Group');
		this._dispose.push(this.deleteGroupIcon.onClick(e => {
			this.removeOperation.run();
		}));
		this.updateButtonState();
	}

	private updateButtonState(): void {
		if (this.deleteGroupIcon) {
			if (this.removeOperation.enabled) {
				this.deleteGroupIcon.enable();
			} else {
				this.deleteGroupIcon.disable();
			}
		}
		if (this.addGroupIcon) {
			if (this.addGroupIcon.enabled) {
				this.addGroupIcon.enable();
			} else {
				this.addGroupIcon.disable();
			}
		}
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
		this._dispose.forEach(v => v.dispose());
		this._dispose = null;
	}
}

interface IGroupItemTemplateData {
	root: HTMLElement;
	label: HTMLElement;
}

interface ITweenGroupInput {
	groups: ITweenGroup[];
}

class TweenGroupDataSource implements tree.IDataSource {

	constructor() {
	}

	public getId(tree: tree.ITree, element: any): string {
		if (element.groups) {
			return 'root';
		} else {
			return (<ITweenGroup>element).instance.getXmlPath().join('-');
		}
	}

	public hasChildren(tree: tree.ITree, element: any): boolean {
		if (element.groups) {
			return true;
		} else {
			return false;
		}
	}

	public getChildren(tree: tree.ITree, element: any): Promise<any> {
		return Promise.resolve(element.groups);
	}

	public getParent(tree: tree.ITree, element: any): Promise<any> {
		return Promise.resolve(null);
	}
}

class TweenGroupRenderer implements tree.IRenderer {

	constructor(
		@IAnimationService private animationService: IAnimationService
	) {
	}

	public getHeight(tree: tree.ITree, element: any): number {
		return 22;
	}

	public getTemplateId(tree: tree.ITree, element: any): string {
		return 'group';
	}

	public renderTemplate(tree: tree.ITree, templateId: string, container: HTMLElement): any {
		const data = <IGroupItemTemplateData>Object.create(null);
		data.root = container;
		data.label = DOM.$('.group-label');
		container.appendChild(data.label);
		return data;
	}

	public renderElement(tree: tree.ITree, element: ITweenGroup, templateId: string, templateData: any): void {
		const editingTweenGroup = this.animationService.getViewModel().getEditingTweenGroup();
		if (editingTweenGroup && editingTweenGroup === element) {
			this.renderRenameBox(tree, editingTweenGroup, templateId, templateData.root);
		} else {
			const id = element.instance.getId();
			const index = (<ITweenGroupInput>tree.getInput()).groups.indexOf(element);
			templateData.root.title = id;
			templateData.label.textContent = id ? `${index} - ${id}` : index + '';
		}
	}

	private renderRenameBox(tree: tree.ITree, element: ITweenGroup, templateId: string, container: HTMLElement): void {
		if(container.children.length === 2){
			if(container.children[1].className.indexOf('inputBoxContainer') >= 0){
				tree.clearHighlight();
				tree.setHighlight(element);
				return;
			}
		}
		const inputBoxContainer = DOM.$('.inputBoxContainer');
		container.appendChild(inputBoxContainer);
		const inputBox = new TextInput(inputBoxContainer, {
			validation: (value: string) => {
				if (value && element.instance.getId() !== value) {
					const node = element.instance.getExmlModel().getValueByID(value);
					if (node) {
						return { content: localize('animationView.idHasExisting', 'ID has been existing as: {0} node', value) };
					}
				}
				return null;
			}
		});
		inputBox.height = 20;
		inputBox.prompt = localize('animationView.tweenGroupId', 'Tween Group ID');

		tree.setHighlight(element);

		inputBox.text = element.instance.getId();
		inputBox.focus();

		let disposed = false;
		const toDispose: [lifecycle.IDisposable] = [inputBox];

		const wrapUp = once((renamed: boolean) => {
			if (!disposed) {
				disposed = true;

				if (renamed) {
					element.instance.setId(inputBox.text);
				}

				tree.clearHighlight();
				tree.domFocus();
				tree.setFocus(element);

				// need to remove the input box since this template will be reused.
				container.removeChild(inputBoxContainer);
				lifecycle.dispose(toDispose);

				this.animationService.getViewModel().setEditingTweenGroup(null);
			}
		});

		toDispose.push(DOM.addStandardDisposableListener(inputBox.getElement(), 'keydown', (e: IKeyboardEvent) => {
			if (e.equals(KeyCode.Enter)) {
				if (inputBox.validate()) {
					wrapUp(true);
				}
			} else if (e.equals(KeyCode.Escape)) {
				wrapUp(false);
			}
		}));
		toDispose.push(DOM.addDisposableListener(inputBox.getElement(), 'blur', () => {
			wrapUp(inputBox.isInputValid());
		}));
	}

	public disposeTemplate(tree: tree.ITree, templateId: string, templateData: any): void {
		
	}
}

class TweenGroupController extends treeDefaults.DefaultController {

	constructor(
		@IAnimationService private animationService: IAnimationService
	) {
		super();

		if (isMacintosh) {
			this.downKeyBindingDispatcher.set(KeyCode.Enter, this.onRename.bind(this));
			this.downKeyBindingDispatcher.set(KeyCode.Backspace, this.onDelete.bind(this));
			this.downKeyBindingDispatcher.set(KeyMod.CtrlCmd | KeyCode.Backspace, this.onDelete.bind(this));
		} else {
			this.downKeyBindingDispatcher.set(KeyCode.F2, this.onRename.bind(this));
			this.downKeyBindingDispatcher.set(KeyCode.Delete, this.onDelete.bind(this));
			this.downKeyBindingDispatcher.set(KeyMod.Shift | KeyCode.Delete, this.onDelete.bind(this));
		}
	}

	protected onLeftClick(tree: tree.ITree, element: any, event: IMouseEvent): boolean {
		if (tree.getInput() === element) {
			return true;
		}

		if (this.animationService.animation) {
			this.animationService.animation.setSelectedGroup(element as ITweenGroup);
		}

		// double click on primitive value: open input box to be able to rename value.
		if (event.detail === 2) {
			this.animationService.getViewModel().setEditingTweenGroup(element as ITweenGroup);
			return true;
		}

		return super.onLeftClick(tree, element, event);
	}

	protected onRename(tree: tree.ITree, event: KeyboardEvent): boolean {
		const element = tree.getFocus();
		this.animationService.getViewModel().setEditingTweenGroup(element as ITweenGroup);
		return false;
	}

	protected onDelete(tree: tree.ITree, event: IKeyboardEvent): boolean {
		const element = tree.getFocus();
		this.animationService.animation.removeTweenGroup(element as ITweenGroup);
		return false;
	}
}