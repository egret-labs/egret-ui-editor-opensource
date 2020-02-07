import { BaseEditor } from 'egret/editor/browser/baseEditor';
import { EditorInput } from 'egret/editor/common/input/editorInput';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { ExmlView } from './exmlView';
import { IExmlFileEditorModel } from '../common/exml/models';
import { IExmlViewContainer, IExmlView, ICodeViewContainer, ICodeView } from './editors';
import { dispose } from 'egret/base/common/lifecycle';
import { ExmlFileEditorNavigation } from './exmlFileEditorNavigation';
import { EditMode } from './commons';
import { StateBar } from 'egret/workbench/parts/state/stateBar';
import { IWorkbenchEditorService } from 'egret/workbench/services/editor/common/ediors';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import { Keyboard } from './exmleditor/data/Keyboard';
import { EuiCommands } from '../commands/euiCommands';
import { IOperationBrowserService } from 'egret/platform/operations/common/operations-browser';
import { IFocusablePart, KeybindingType } from 'egret/platform/operations/common/operations';
import { localize } from 'egret/base/localization/nls';
import { SystemCommands } from 'egret/platform/operations/commands/systemCommands';
import { CodeView } from './codeView';
import { OutputView } from 'egret/workbench/parts/output/browser/outputView';
import { PanelDom } from 'egret/parts/browser/panelDom';
import { AnimationView } from 'egret/workbench/parts/animation/electron-browser/views/animationView';

//TODO 销毁方法
/**
 * Exml文件编辑器
 */
export class ExmlFileEditor extends BaseEditor implements IExmlViewContainer, ICodeViewContainer, IFocusablePart {

	constructor(
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IWorkbenchEditorService protected editorService: IWorkbenchEditorService,
		@IWorkspaceService private workspaceService: IWorkspaceService,
		@IOperationBrowserService protected operationService: IOperationBrowserService
	) {
		super(instantiationService, editorService);
		this.keydown_handler = this.keydown_handler.bind(this);
		this.keyup_handler = this.keyup_handler.bind(this);

		this.initCommands();
		this.initParts();
	}

	/** 注册当前编辑器可以执行的命令 */
	private initCommands(): void {
		this.operationService.registerFocusablePart(this);
		this.operationService.registerKeybingding(EuiCommands.GROUP, 'mod+g', KeybindingType.KEY_DOWN, localize('exmlFileEditor.initCommands.group', 'EUI Group'), localize('exmlFileEditor.initCommands.groupDes', 'Group the selected component in current Exml'), false);
		this.operationService.registerKeybingding(EuiCommands.UNGROUP, 'mod+u', KeybindingType.KEY_DOWN, localize('exmlFileEditor.initCommands.ungroup', 'EUI Ungroup'), localize('exmlFileEditor.initCommands.ungroupDes', 'Unpack the selected group in current Exml'), false);
		this.operationService.registerKeybingding(EuiCommands.REFRESH, 'mod+r', KeybindingType.KEY_DOWN, localize('exmlFileEditor.initCommands.freshEidtor', 'Refresh Exml editor'), localize('exmlFileEditor.initCommands.freshEidtorDes', 'Refresh the currently active Exml editor'), false);
		this.operationService.registerKeybingding(EuiCommands.ZOOM_IN, 'mod+=', KeybindingType.KEY_DOWN, localize('exmlFileEditor.initCommands.zoomIn', 'Zoom in Exml editor'), localize('exmlFileEditor.initCommands.zoomInDes', 'Zoom in on the currently active Exml editor'), false);
		this.operationService.registerKeybingding(EuiCommands.ZOOM_OUT, 'mod+-', KeybindingType.KEY_DOWN, localize('exmlFileEditor.initCommands.zoomOut', 'Zoom out Exml editor'), localize('exmlFileEditor.initCommands.zoomOutDes', 'Zoom put on the currently active Exml editor'), false);
		this.operationService.registerKeybingding(EuiCommands.FIT_SCREEN, 'mod+0', KeybindingType.KEY_DOWN, localize('exmlFileEditor.initCommands.fitScreen', 'Fit Screen'), localize('exmlFileEditor.initCommands.fitScreenDes', 'Display current Exml by screen size'), false);
		this.operationService.registerKeybingding(EuiCommands.NO_SCALE, 'mod+1', KeybindingType.KEY_DOWN, localize('exmlFileEditor.initCommands.noScale', 'No Scale'), localize('exmlFileEditor.initCommands.noScaleDes', '100% display current Exml'), false);
		//TODO 可以把其他快捷键也写进去，然后计入一个空的
	}

	/**
	 * 得到这个部件对应的Dom节点
	 */
	public getRelativeELement(): HTMLElement {
		return this.root;
	}
	/**
	 * 运行一个命令
	 * @param command 要运行的命令
	 */
	public executeCommand<T>(command: string, ...args): Promise<T> {
		let currentExmlView = this.exmlView;
		while (currentExmlView) {
			if (currentExmlView.subview) {
				currentExmlView = currentExmlView.subview;
			} else {
				break;
			}
		}
		if (currentExmlView) {
			currentExmlView.runCommand(command as EuiCommands);
		}
		return Promise.resolve(void 0);
	}
	/**
	 * 是否可以运行指定命令
	 * @param command 需要判断的命令
	 */
	public hasCommand(command: string): boolean {
		return [
			SystemCommands.COPY,
			SystemCommands.CUT,
			SystemCommands.PASTE,
			SystemCommands.DELETE,
			SystemCommands.SELECT_ALL,
			EuiCommands.GROUP,
			EuiCommands.UNGROUP,
			EuiCommands.COPY_PROPERTY,
			EuiCommands.PASTE_SIZE,
			EuiCommands.PASTE_POS,
			EuiCommands.PASTE_RESTRICT,
			EuiCommands.CONVERT_TO_INNER,
			EuiCommands.REFRESH,
			EuiCommands.ZOOM_IN,
			EuiCommands.ZOOM_OUT,
			EuiCommands.FIT_SCREEN,
			EuiCommands.NO_SCALE
		].indexOf(command as EuiCommands) != -1;
	}




	private loaded = false;
	/**
	 * 编辑器的Id
	 */
	public static readonly ID = 'workbench.editors.exmlEditor';
	/**
	 * 这个编辑器类型的标识
	 */
	public getEditorId(): string {
		return ExmlFileEditor.ID;
	}
	/**
	 * 焦点进入
	 */
	public doFocusIn(): void {
		super.doFocusIn();
		if (this.exmlView) {
			this.exmlView.doFosusIn();
		}
		this.refreshAnimationState(this._currentMode === EditMode.ANIMATION);
	}
	/**
	 * 焦点移出
	 */
	public doFocusOut(): void {
		super.doFocusOut();
		if (this.exmlView) {
			this.exmlView.doFosusOut();
		}
	}
	/**
	 * 窗体关闭
	 */
	public doClose(): void {
		super.doClose();
		this.refreshAnimationState(false);
		dispose(this);
	}

	/**
	 * 设置当前编辑器的input
	 */
	public setInput(input: EditorInput): Promise<void> {
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
	public syncModelData(): void {
		this.codeView.syncModelData();
		if (this._model) {
			this._model.updateDirty();
		}
	}

	/**
	 * 刷新输入流
	 */
	private doRefreshInput(refresh: boolean): Promise<void> {
		if (this.input) {
			return this.input.resolve(refresh).then(resolvedModel => {
				this._model = resolvedModel as IExmlFileEditorModel;
				this.updateModel(this._model);
				this.loaded = true;
				if (this.resolveModelPromiseResolve) {
					this.resolveModelPromiseResolve(this._model);
				}
				this.resolveModelPromiseResolve = null;
				this.resolveModelPromise = null;
			}, (error)=> {
				if(error.code === 'ENOENT'){
					// 文件不存在，关闭当前editor
					this.editorService.closeEditor(this);
				}
				console.log(error);
			});
		}
		return Promise.resolve(void 0);
	}
	/**
	 * 刷新输入流
	 */
	public refreshInput(): void {
		this.doRefreshInput(true).then(() => {
			this.refreshExml();
		});
	}



	protected updateModel(model: IExmlFileEditorModel): void {
		super.updateModel(model);
		this.exmlView.setModel(model.getModel());
		this.codeView.setModel(model);
		this.stateBar.setModel(model.getModel());
		this.refreshAnimationState(this._currentMode === EditMode.ANIMATION);
	}

	private _isCodeDirty: boolean;
	private _currentMode: EditMode = EditMode.DESIGN;
	private _model: IExmlFileEditorModel;

	private resolveModelPromise: Promise<IExmlFileEditorModel>;
	private resolveModelPromiseResolve: (value?: IExmlFileEditorModel | PromiseLike<IExmlFileEditorModel>) => void;
	/**
	 * 当前编辑器的数据模块
	 */
	public getModel(): Promise<IExmlFileEditorModel> {
		if (this.loaded) {
			return Promise.resolve(this._model);
		} else {
			if (!this.resolveModelPromise) {
				this.resolveModelPromise = new Promise<IExmlFileEditorModel>((resolve, reject) => {
					this.resolveModelPromiseResolve = resolve;
				});
			}
			return this.resolveModelPromise;
		}
	}

	private navigationContainer: HTMLElement;
	private exmlRootContainer: HTMLElement;
	private exmlViewContainer: HTMLElement;
	private stateBarContainer: HTMLElement;
	private codeViewContainer: HTMLElement;

	private navigation: ExmlFileEditorNavigation;
	private exmlView: ExmlView;
	private codeView: CodeView;
	private stateBar: StateBar;
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
		this.exmlView = this.instantiationService.createInstance(ExmlView, this);

		this.codeViewContainer = document.createElement('div');
		this.codeViewContainer.style.width = '100%';
		this.codeViewContainer.style.height = '100%';
		this.codeViewContainer.style.position = 'relative';
		this.codeViewContainer.setAttribute('className', 'codeview-container-root');
		this.codeView = this.instantiationService.createInstance(CodeView, this);

		this.navigation = new ExmlFileEditorNavigation(this.navigationContainer);
		this.navigation.onEditModeChanged(e => this.updateEditMode(e));
		this.navigation.onPreviewOptionChanged(e => this.updatePreviewConfig());
		this.navigation.onRefreshClick(e => this.refreshClick_handler());
		this.navigation.onZoomInClick(e => this.zoomInClick_handler());
		this.navigation.onZoomOutClick(e => this.zoomOutClick_handler());
		this.navigation.onShowAllClick(e => this.showAllClick_handler());
		this.navigation.onNoScaleClick(e => this.noScaleClick_handler());
		this.navigation.onAdsortChanged(e => this.adsortChanged_handler(e));
		this.navigation.onLockGroupChanged(e => this.lockGroupChanged_handler(e));
		this.navigation.onGrabChanged(e => this.grabChanged_handler(e));

		this.stateBarContainer = document.createElement('div');
		this.stateBarContainer.style.width = '100%';
		this.stateBarContainer.style.marginBottom = '2px';
		this.exmlViewContainer.style.position = 'relative';
		this.stateBarContainer.setAttribute('className', 'state-bar-container-root');
		this.stateBar = this.instantiationService.createInstance(StateBar, this.stateBarContainer);
		this.initExmlView();
		this.initCodeView();
	}

	private initExmlView(): void {
		this.exmlView.onZoomChanged(scale => this.zoomChanged_handler(scale));
		this.exmlView.absorbAble = this.navigation.adsorbed;
		this.exmlView.lockGroup = this.navigation.lockGroup;
		this.zoomChanged_handler(this.exmlView.getCurrentZoom());
		this.updateEditMode(this.navigation.editMode);
		this.exmlView.doResize();
	}
	private initCodeView(): void {
		this.codeView.onDirtyStateChanged(dirty => this.codeDirtyStateChanged(dirty));
		this.codeView.doResize();
	}
	protected resize(newWidth: number, newHeight: any): void {
		super.resize(newWidth, newHeight);
		if (this.exmlView) {
			this.exmlView.doResize();
		}
		if (this.codeView) {
			this.codeView.doResize();
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

	private refreshClick_handler(): void {
		this.refreshExml();
	}
	/**
	 * 刷新
	 */
	public refreshExml(): void {
		if (this.exmlView) {
			this.exmlView.refreshRuntime();
			this.exmlView.refresh();
		}
	}

	private codeDirtyStateChanged(dirty: boolean): void {
		this._isCodeDirty = dirty;
		this.updateTitle();
	}

	private updateEditMode(mode: EditMode): void {
		if (mode === EditMode.CODE) {
			this.codeViewContainer.style.display = 'block';
			this.exmlRootContainer.style.display = 'none';
			if (this.codeView) {
				this.codeView.setActive(true);
				this.codeView.doResize();
			}
		} else {
			let shouldRefresh: boolean = false;
			if (this._currentMode === EditMode.CODE) {
				shouldRefresh = this._isCodeDirty;
			}
			if (this.codeView) {
				this.codeView.setActive(false);
			}
			if (shouldRefresh) {
				this.refreshExml();
			}
			this.codeViewContainer.style.display = 'none';
			this.exmlRootContainer.style.display = 'flex';
			this.exmlView.setEditMode(mode, this.navigation.previewConfig);
		}
		this.refreshAnimationState(mode === EditMode.ANIMATION);
		this._currentMode = mode;
	}

	private refreshAnimationState(enable: boolean): void {
		this.toogleAnmationView(enable);
		this.toogleAnimationEnable(enable);
	}

	private toogleAnimationEnable(enable: boolean): void {
		if(!this._model){
			this.getModel().then((model) => {
				model.getModel().getAnimationModel().setEnabled(enable);
			});
		} else {
			this._model.getModel().getAnimationModel().setEnabled(enable);
		}
	}

	private toogleAnmationView(open: boolean): void {
		if (open) {
			const groups = this.workspaceService.boxlayout.getAllOpenPanels();
			for (let i = 0; i < groups.length; i++) {
				const element = groups[i];
				if (element.getId() === OutputView.ID) {
					element.focus();
				}
			}
			this.workspaceService.boxlayout.openPanelById(AnimationView.ID, true);
		} else {
			this.workspaceService.boxlayout.closePanelById(AnimationView.ID);
		}
	}

	private updatePreviewConfig(): void {
		this.exmlView.updatePreviewConfig(this.navigation.previewConfig);
	}

	private zoomInClick_handler(): void {
		this.exmlView.zoomIn();
	}
	private zoomOutClick_handler(): void {
		this.exmlView.zoomOut();
	}
	private showAllClick_handler(): void {
		this.exmlView.fitScreen();
	}
	private noScaleClick_handler(): void {
		this.exmlView.noScale();
	}
	private zoomChanged_handler(scale: number): void {
		if (this.navigation) {
			this.navigation.updateZoomDisplay(scale);
		}
	}
	private adsortChanged_handler(value: boolean): void {
		this.exmlView.absorbAble = value;
	}
	private lockGroupChanged_handler(value: boolean): void {
		this.exmlView.lockGroup = value;
		this.exmlView.promptLockGroupTips();
	}
	private grabChanged_handler(value: boolean): void {
		this.exmlView.exmlEditor.dragEnabled = value;
	}

	private _container: HTMLElement;
	/**
	 * 渲染内容
	 * @param container 
	 */
	public renderContent(container: HTMLElement): void {
		super.renderContent(container);
		this._container = container;
		const editorContainer = document.createElement('div');
		editorContainer.style.width = '100%';
		editorContainer.style.height = '100%';
		editorContainer.style.display = 'flex';
		editorContainer.style.flexDirection = 'column';
		container.appendChild(editorContainer);

		editorContainer.appendChild(this.navigationContainer);
		this.exmlRootContainer.appendChild(this.exmlViewContainer);
		this.exmlRootContainer.appendChild(this.stateBarContainer);
		editorContainer.appendChild(this.exmlRootContainer);
		editorContainer.appendChild(this.codeViewContainer);

		container.addEventListener('keydown', this.keydown_handler);
		container.addEventListener('keyup', this.keyup_handler);
	}

	private keydown_handler(e: KeyboardEvent): void {
		if (this._currentMode !== EditMode.CODE) {
			this.notifyKeyboardEvent(e);
		}
	}
	private keyup_handler(e: KeyboardEvent): void {
		if (this._currentMode !== EditMode.CODE) {
			this.notifyKeyboardEvent(e);
		}
	}

	/**
	 * 通知键盘事件
	 * @param e 
	 */
	public notifyKeyboardEvent(e: KeyboardEvent): void {
		if (e.type == 'keydown') {
			if (e.keyCode == Keyboard.ALTERNATE) {
				this.navigation.lockGroup = !this.navigation.lockGroup;
				this.exmlView.lockGroup = this.navigation.lockGroup;
				this.exmlView.promptLockGroupTips();
			}
			if (this.exmlView) {
				this.exmlView.notifyKeyboardEvent(e);
			}
		} else {
			if (e.keyCode == Keyboard.ALTERNATE) {
				this.navigation.lockGroup = !this.navigation.lockGroup;
				this.exmlView.lockGroup = this.navigation.lockGroup;
				this.exmlView.promptLockGroupTips();
			}
			if (this.exmlView) {
				this.exmlView.notifyKeyboardEvent(e);
			}
		}
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

	/**
	 * 添加一个ExmlView
	 * @param view 
	 */
	public addExmlView(view: IExmlView): void {
		this.exmlViewContainer.appendChild(view.container);
	}
	/**
	 * 移除ExmlView
	 * @param view 
	 */
	public removeExmlView(view: IExmlView): void {
		this.exmlViewContainer.removeChild(view.container);
		dispose(view);
	}

	/**
	 * 添加一个CodeView
	 * @param view 
	 */
	public addCodeView(view: ICodeView): void {
		this.codeViewContainer.appendChild(view.container);
	}
	/**
	 * 移除CodeView
	 * @param view 
	 */
	public removeCodeView(view: ICodeView): void {
		this.codeViewContainer.removeChild(view.container);
		dispose(view);
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		super.dispose();
		this.operationService.unregisterFocusablePart(this);
		dispose(this.exmlView);
		if (this._container) {
			this._container.removeEventListener('keydown', this.keydown_handler);
			this._container.removeEventListener('keyup', this.keyup_handler);
		}
		this._container = null;
	}


}