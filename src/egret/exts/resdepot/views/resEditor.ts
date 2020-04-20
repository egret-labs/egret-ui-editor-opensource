/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { IDisposable, dispose } from 'vs/base/common/lifecycle';
import { ResDepotView } from 'egret/exts/resdepot/views/resDepotView';
import * as DOM from 'vs/base/browser/dom';
import { BaseEditor } from 'egret/editor/browser/baseEditor';
import { ResFileEditorModel } from './resEditorModel';
import { setupStage, WebPlayer } from 'egret/base/browser/utils';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { ResCodeEditor } from './resCodeEditor';
import { ResEditorNavigation, ResEditorMode } from '../resEditorNavigation';
import { IWorkbenchEditorService } from 'egret/workbench/services/editor/common/ediors';
import { ResEditorInput } from './resEditorInput';
import { IMultiPageEditor } from 'egret/editor/core/editors';
import { RES_EDITOR_ID } from '../common/consts/ResType';
import { StateChange } from 'egret/editor/core/models';
import { IOperationBrowserService } from 'egret/platform/operations/common/operations-browser';
import { FileRootCommands } from 'egret/workbench/parts/files/commands/fileRootCommands';
const ResEditorType = 1;

export class ResEditor extends BaseEditor implements IMultiPageEditor {
	/**
	 *
	 */
	constructor(
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IWorkbenchEditorService protected editorService: IWorkbenchEditorService,
		@IOperationBrowserService private operationService: IOperationBrowserService
	) {
		super(instantiationService, editorService);
		this.initParts();
	}

	private loaded = false;

	/**
	 * 得到混合编辑器中的代码编辑器
	 */
	public getCodeEditor(): ResCodeEditor {
		return this.codeView;
	}
	/**
	 * 得到混合编辑器中的视图编辑器
	 */
	public getViewEditor(): ResDesignView {
		return this.exmlView;
	}

	/**
	 * 设置当前编辑器的input
	 */
	public setInput(input: ResEditorInput): Promise<void> {
		this.loaded = false;
		//TODO 增加直接在新编辑器打开的方法。
		return super.setInput(input).then(() => {
			return this.ensureRendered().then(() => {
				return this.doRefreshInput(false);
			});
		});
	}

	/**
	 * 同步各个子编辑器的数据
	 */
	public async syncModelData(): Promise<void> {
		await this.codeView.syncText();
		if (this._model) {
			this._model.updateDirty();
		}
	}

	protected updateModel(model: ResFileEditorModel): void {
		super.updateModel(model);
		this.exmlView.attachModel(model);
		this.codeView.setup(model);
	}

	private _model: ResFileEditorModel;

	private resolveModelPromise: Promise<ResFileEditorModel>;
	private resolveModelPromiseResolve: (value?: ResFileEditorModel | PromiseLike<ResFileEditorModel>) => void;
	/**
	 * 当前编辑器的数据模块
	 */
	public getModel(): Promise<ResFileEditorModel> {
		if (this.loaded) {
			return Promise.resolve(this._model);
		} else {
			if (!this.resolveModelPromise) {
				this.resolveModelPromise = new Promise<ResFileEditorModel>((resolve, reject) => {
					this.resolveModelPromiseResolve = resolve;
				});
			}
			return this.resolveModelPromise;
		}
	}

	/**
	 * 刷新输入流
	 */
	private doRefreshInput(refresh: boolean): Promise<void> {
		if (this.input) {
			return this.input.resolve(refresh, this.instantiationService).then(resolvedModel => {
				this._model = resolvedModel as ResFileEditorModel;
				this.updateModel(this._model);
				this.loaded = true;
				if (this.resolveModelPromiseResolve) {
					this.resolveModelPromiseResolve(this._model);
				}
				this.resolveModelPromiseResolve = null;
				this.resolveModelPromise = null;
			}, (error) => {
				if (error.code === 'ENOENT') {
					// 文件不存在，关闭当前editor
					this.editorService.closeEditor(this);
				}
				console.log(error);
			});
		}
		return Promise.resolve(void 0);
	}

	public getEditorId(): string {
		return RES_EDITOR_ID;
	}

	/**
	 * 焦点进入
	 */
	public doFocusIn(): void {
		super.doFocusIn();
	}
	/**
	 * 焦点移出
	 */
	public doFocusOut(): void {
		super.doFocusOut();
	}

	/**
	 * 窗体关闭
	 */
	public doClose(): void {
		super.doClose();
		dispose(this);
	}


	private _isCodeDirty: boolean;
	private _currentMode: ResEditorMode = ResEditorMode.Design;
	private navigationContainer: HTMLElement;
	private exmlRootContainer: HTMLElement;
	private exmlViewContainer: HTMLElement;
	private codeViewContainer: HTMLElement;

	private navigation: ResEditorNavigation;
	private codeView: ResCodeEditor;
	private exmlView: ResDesignView;
	private initParts(): void {
		this.navigationContainer = document.createElement('div');
		this.navigationContainer.style.width = '100%';
		this.navigationContainer.style.flexShrink = '0';

		this.exmlRootContainer = document.createElement('div');
		this.exmlRootContainer.style.width = '100%';
		this.exmlRootContainer.style.height = '100%';
		this.exmlRootContainer.style.display = 'flex';
		this.exmlRootContainer.style.flexDirection = 'column';

		this.exmlViewContainer = document.createElement('div');
		this.exmlViewContainer.style.width = '100%';
		this.exmlViewContainer.style.height = '100%';
		this.exmlViewContainer.style.position = 'relative';
		this.exmlViewContainer.setAttribute('className', 'exmlview-container-root');
		this.exmlView = this.instantiationService.createInstance(ResDesignView, this);

		this.codeViewContainer = document.createElement('div');
		this.codeViewContainer.style.width = '100%';
		this.codeViewContainer.style.height = '100%';
		this.codeViewContainer.style.position = 'relative';
		this.codeViewContainer.setAttribute('className', 'codeview-container-root');
		this.codeView = this.instantiationService.createInstance(ResCodeEditor);
		this.codeView.init(this.codeViewContainer, 'json');

		this.navigation = new ResEditorNavigation(this.navigationContainer);
		this.navigation.onEditModeChanged(e => this.updateEditMode(e));
		this.navigation.onSaveClick(() => this.save());

		this.initExmlView();
		this.initCodeView();
	}

	private initExmlView(): void {
		this.updateEditMode(this.navigation.editMode);
		this.exmlView.layout();
	}
	private initCodeView(): void {
		this.codeView.onDirtyStateChanged(dirty => this.codeDirtyStateChanged(dirty));
		this.codeView.layout();
	}

	private codeDirtyStateChanged(dirty: boolean): void {
		this._isCodeDirty = dirty;
		this.getModel().then((model) => {
			model.changeDirty(dirty);
		});
		this.updateTitle();
	}

	private async updateEditMode(mode: ResEditorMode): Promise<void> {
		if (mode === ResEditorMode.Code) {
			this.codeViewContainer.style.display = 'block';
			this.exmlRootContainer.style.display = 'none';
			if (this.codeView) {
				await this.codeView.setActive(true);
				this.codeView.layout();
			}
		} else {
			if (this.codeView) {
				await this.codeView.setActive(false);
			}
			this.codeViewContainer.style.display = 'none';
			this.exmlRootContainer.style.display = 'flex';
			if (this.exmlView) {
				this.exmlView.layout();
			}
		}
		this._currentMode = mode;
	}

	protected modelStateChanged_handler(e: StateChange): void {
		super.modelStateChanged_handler(e);
		if (e == StateChange.DIRTY) {
			this.updateSaveButtonState();
		}
	}

	private updateSaveButtonState(): void {
		if (this.navigation) {
			this.isDirty().then((dirty) => {
				this.navigation.updateSaveButtonState(dirty);
			});
		}
	}

	private save(): void {
		this.operationService.executeCommand(FileRootCommands.SAVE_ACTIVE);
	}

	protected resize(newWidth: number, newHeight: any): void {
		super.resize(newWidth, newHeight);
		if (this.exmlView) {
			this.exmlView.layout();
		}
		if (this.codeView) {
			this.codeView.layout();
		}
	}

	protected async isDirty(): Promise<boolean> {
		if (this._isCodeDirty) {
			return Promise.resolve(true);
		}
		return this.getModel().then(model => {
			return model.isDirty();
		});
	}
	private rendered: boolean = false;
	protected doSetVisible(v: boolean): void {
		super.doSetVisible(v);
		if (this.rendered) {
			return;
		}
		if (v) {
			this.rendered = true;
			if (this.ensureRenderedPromiseResolve) {
				this.ensureRenderedPromiseResolve();
				this.ensureRenderedPromiseResolve = null;
			}
		}
	}

	private ensureRenderedPromise: Promise<void>;
	private ensureRenderedPromiseResolve: (value?: void | PromiseLike<void>) => void;
	private ensureRendered(): Promise<void> {
		if (this.rendered) {
			return Promise.resolve(void 0);
		} else if (this.ensureRenderedPromise) {
			return this.ensureRenderedPromise;
		} else {
			this.ensureRenderedPromise = new Promise<void>((resolve, reject) => {
				this.ensureRenderedPromiseResolve = resolve;
			});
			return this.ensureRenderedPromise.then(() => {
				this.ensureRenderedPromise = null;
			});
		}
	}

	private _container: HTMLElement;
	/**
	 * 渲染内容
	 * @param container 
	 */
	public renderContent(container: HTMLElement): void {
		super.renderContent(container);
		this._container = container;

		this.exmlView.render(this.exmlViewContainer);

		const editorContainer = document.createElement('div');
		editorContainer.style.width = '100%';
		editorContainer.style.height = '100%';
		editorContainer.style.display = 'flex';
		editorContainer.style.flexDirection = 'column';
		container.appendChild(editorContainer);

		editorContainer.appendChild(this.navigationContainer);
		this.exmlRootContainer.appendChild(this.exmlViewContainer);
		editorContainer.appendChild(this.exmlRootContainer);
		editorContainer.appendChild(this.codeViewContainer);
	}

	public dispose(): void {
		super.dispose();
	}
}

class ResDesignView {
	model: ResFileEditorModel;
	player: WebPlayer;
	euiEditor: ResDepotView;

	private listenersToRemove: IDisposable[];
	constructor(
		private parentEditor: BaseEditor,
		@IInstantiationService private instantiationService: IInstantiationService,
	) {
		this.listenersToRemove = [];
	}
	public render(domNode: HTMLElement): void {
		this.unregisterDragAndDrop();
		this.registerDragAndDrop(domNode);
		if (!this.player) {
			var player = setupStage(domNode);
			this.player = player;
			var onLoad = () => {
				this.euiEditor = this.instantiationService.createInstance(ResDepotView, this.parentEditor);
				this.euiEditor.setModel(this.model);
				this.player.stage.addChild(this.euiEditor);

			};
			if (player.loaded) {
				onLoad();
			}
			else {
				player.stage.addEventListener('loaded', onLoad, this);
			}
		}
	}

	private registerDragAndDrop(domNode: HTMLElement): void {
		this.listenersToRemove.push(DOM.addDisposableListener(domNode, DOM.EventType.DRAG_ENTER, (e: DragEvent) => {
			e.stopPropagation();
			// DOM.EventHelper.stop(e, false);
		}));
		this.listenersToRemove.push(DOM.addDisposableListener(domNode, DOM.EventType.DRAG_OVER, (e: DragEvent) => {
			// DOM.EventHelper.stop(e, false);
			e.stopPropagation();
			e.dataTransfer.dropEffect = 'move';
		}));
	}

	private unregisterDragAndDrop(): void {
		dispose(this.listenersToRemove);
		this.listenersToRemove = [];
	}


	layout(): void {
		if (this.player) {
			this.player.updateScreenSize();
		}
	}

	attachModel(model: ResFileEditorModel) {
		this.model = model;
		if (this.euiEditor) {
			this.euiEditor.setModel(model);
		}
	}

	public onVisible(): void {
		setTimeout(() => {
			if (this.player) {
				this.player.updateScreenSize();
			}
		}, 1);
		if (this.euiEditor) {
			this.euiEditor.onVisible();
		}
	}

	public onHide(): void {
		if (this.euiEditor) {
			this.euiEditor.onHide();
		}
	}


	detachModel() {
		this.model = null;
	}

	public dispose(): void {
		if (this.euiEditor) {
			this.euiEditor.destory();
		}
		this.euiEditor = null;
		dispose(this.listenersToRemove);
	}
}