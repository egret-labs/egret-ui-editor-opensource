/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
import { IDisposable } from 'vs/base/common/lifecycle';
import * as DOM from 'vs/base/browser/dom';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IAnimationService } from '../../common/animation';
import { TimeLineContainer } from './timeLine';
import { GroupContainer } from './groupContainer';
import { ItemsContainer } from './itemsContainer';
import { IWorkbenchEditorService } from 'egret/workbench/services/editor/common/ediors';
import { IOperationBrowserService } from 'egret/platform/operations/common/operations-browser';
import { localize } from 'egret/base/localization/nls';
import { PanelContentDom } from 'egret/parts/browser/panelDom';
import { IFocusablePart } from 'egret/platform/operations/common/operations';
import { IPanel } from 'egret/parts/common/panel';
import { SystemCommands } from 'egret/platform/operations/commands/systemCommands';

import './media/animation.css';

export class AnimationView extends PanelContentDom implements IFocusablePart {

	private groupContainer: GroupContainer;
	private itemsContainer: ItemsContainer;
	private timeLineContainer: TimeLineContainer;

	private editorInputChangeListener: IDisposable;
	private owner: IPanel;
	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IOperationBrowserService private operationService: IOperationBrowserService,
		@IWorkbenchEditorService private editorService: IWorkbenchEditorService,
		@IAnimationService private animationService: IAnimationService
	) {
		super(instantiationService);
		this.editorInputChangeListener = this.editorService.onActiveEditorChanged(() => this.onEditorsChanged());

		this.groupContainer = this.instantiationService.createInstance(GroupContainer);
		this.itemsContainer = this.instantiationService.createInstance(ItemsContainer);
		this.timeLineContainer = this.instantiationService.createInstance(TimeLineContainer);
	}

	private onEditorsChanged(): void {
		let editor = this.editorService.getActiveEditor();
		if (!editor || !editor.input) {
			return;
		}
		var uri = editor.input.getResource();
		if (!uri) {
			return;
		}
		// TODO
	}

	/**
	 * 初始化所有者
	 */
	public initOwner(owner: IPanel): void {
		this.owner = owner;
		this.initCommands();
	}

	/** 注册当前编辑器可以执行的命令 */
	private initCommands(): void {
		this.operationService.registerFocusablePart(this);
	}

	/**
	 * 得到这个部件对应的Dom节点
	 */
	public getRelativeELement(): HTMLElement {
		return this.owner.getRoot();
	}

	/**
	 * 运行一个命令
	 * @param command 要运行的命令
	 */
	public executeCommand<T>(command: string, ...args): Promise<any> {
		return this.itemsContainer.executeCommand(command, args);
	}

	/**
	 * 是否可以运行指定命令
	 * @param command 需要判断的命令
	 */
	public hasCommand(command: string): boolean {
		return [
			SystemCommands.COPY,
			SystemCommands.PASTE,
			SystemCommands.DELETE,
		].indexOf(command as SystemCommands) != -1;
	}

	render(container: HTMLDivElement) {
		this.doRender(container);
	}

	private doRender(container: HTMLDivElement) {
		const root = document.createElement('div');
		DOM.addClass(root, 'animation-panel');
		container.appendChild(root);

		this.groupContainer.create(root);
		this.itemsContainer.create(root);
		this.timeLineContainer.create(root);
	}

	/**
	* 尺寸改变
	* @param width
	* @param height
	*/
	public doResize(width: number, height: any): void {
		this.layout(new DOM.Dimension(width, height));
	}


	public layout(dimension?: DOM.Dimension): void {
		if (!dimension) {
			return;
		}

		this.groupContainer.layout(dimension.height);
		this.itemsContainer.layout(dimension.height);

		const groupWidth = this.groupContainer.domNode.offsetWidth;
		const itemWidth = this.itemsContainer.domNode.offsetWidth;

		const newWidth = dimension.width - groupWidth - itemWidth;
		this.timeLineContainer.layout(new DOM.Dimension(newWidth, dimension.height));
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this.groupContainer.dispose();
		this.itemsContainer.dispose();
		this.editorInputChangeListener.dispose();
	}
}

export namespace AnimationView {
	export const ID: string = 'workbench.animation';
	export const TITLE: string = localize('animationView.title', 'Animation');
}