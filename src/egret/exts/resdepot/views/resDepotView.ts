/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as fsextra from 'fs-extra';
import * as paths from 'egret/base/common/paths';
import { ResPanel } from 'egret/exts/resdepot/views/ResPanel';
import { ShortcutManager } from 'egret/exts/resdepot/common/keyboard/ShortcutManager';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import { BaseEditor } from 'egret/editor/browser/baseEditor';
import { ResFileEditorModel } from './resEditorModel';

/**
 * 资源编辑器
 */
export class ResDepotView extends eui.UILayer {
	private resPanel: ResPanel;

	public container: HTMLElement;
	private _parentEditor: BaseEditor;
	private model: ResFileEditorModel;
	constructor(
		parentEditor: BaseEditor,
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IEgretProjectService protected egretProjectService: IEgretProjectService,
		@IWorkspaceService protected contextService: IWorkspaceService) {
		super();
		this._parentEditor = parentEditor;
		this.addEventListener(eui.UIEvent.CREATION_COMPLETE, this.createover, this);
		this.addEventListener(egret.Event.REMOVED_FROM_STAGE, this.onRemove, this);

	}

	createChildren() {
		super.createChildren();

		ShortcutManager.initialize(this.stage);
		this.resPanel = this.instantiationService.createInstance(ResPanel as any, this._parentEditor);
		this.addChild(this.resPanel);
		if (this.model) {
			this.refresh();
		}
	}

	createover(e: eui.UIEvent): void {
		// console.log('resdepot createover');
	}

	onRemove() {
		// console.log('resdepot onRemove4');
		this.removeEventListener(eui.UIEvent.CREATION_COMPLETE, this.createover, this);
		this.removeEventListener(egret.Event.REMOVED_FROM_STAGE, this.onRemove, this);
	}

	public setModel(model: ResFileEditorModel) {

		if (model === this.model) {
			return;
			//this.listenersToRemove.push(model.addListener(EditorCommon.EventType.ModelContentChanged2, () => this.refresh()));
		}
		this.detachModel();

		this.model = model;
		this.refresh();
	}

	public refresh() {
		if (!this.resPanel || !this.model) {
			return;
		}
		// console.log(this.model.isDisposed());
		if (this.model.isDisposed()) {
			this.model = null;
			return;
		}
		// console.log('resdepot setmodel', model);
		var resPath = this.model.getResource();
		var workspace = this.contextService.getWorkspace().uri;
		var resUrl = paths.relative(workspace.toString(), resPath.toString());
		let resRelativePath: string = 'resource/';//默认资源路径


		// var service = getProjectService();
		// var project = service.getProject((<IResourceInput><any>this._parentEditor.input).resource);
		const project = this.egretProjectService.projectModel;
		const configs = project.resConfigs;
		for (let i: number = 0; i < configs.length; i++) {
			if (resUrl === configs[i].url) {
				resRelativePath = configs[i].folder;
			}
		}
		let resourcePath: string = paths.normalize(project.project.fsPath + '/' + resRelativePath);
		let urlFull: string = paths.normalize(project.project.fsPath + '/' + resUrl);
		fsextra.pathExists(resourcePath).then(success => {
			if (success) {
				this.resPanel.openResourceLib(urlFull, resourcePath, this.model);
			}
		});
	}

	public onVisible() {
		this.refresh();
		this.resPanel.onVisible();
	}

	public onHide() {
		this.resPanel.onHide();
	}

	private detachModel() {
	}

	destory() {
		// console.log('resdepot destory');
		this.model = null;
	}

}