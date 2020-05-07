import { EgretRuntimeDelegate, IRuntimeAPI } from '../runtime/runtime';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IEgretProjectService } from '../../project';
import { EUIExmlConfig } from '../common/project/exmlConfigs';
import { IExmlModel, RootChangedEvent, TextChangedEvent } from '../common/exml/models';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { IValue, INode, IClass, ViewStackIndexChangedEvent, IViewStack, isInstanceof, IContainer } from '../common/exml/treeNodes';
import URI from 'egret/base/common/uri';
import { IEditorService } from 'egret/editor/core/editors';
import { EUI } from '../common/project/parsers/core/commons';
import { Menu, MenuItem, remote, MenuItemConstructorOptions } from 'electron';
import { canPasteSize, canPastePos, canPasteRestrict } from '../common/exml/nodeClipboard';
import { ExmlModelHelper } from '../common/exml/helpers';
import { ExmlEditor } from './exmleditor/ExmlEditor';
import { IExmlView, IExmlViewContainer } from './editors';
import * as xmlStrUtil from '../common/sax/xml-strUtils';
import * as xmlTagUtil from '../common/sax/xml-tagUtils';
import { Namespace } from '../common/sax/Namespace';
import { Rectangle } from './exmleditor/data/Rectangle';
import { EditMode, PreviewConfig } from './commons';
import { IOutputService } from 'egret/workbench/parts/output/common/output';
import { EuiCommands } from '../commands/euiCommands';
import { Emitter, Event } from 'egret/base/common/event';
import { IClipboardService } from 'egret/platform/clipboard/common/clipboardService';
import { localize } from 'egret/base/localization/nls';
import { SystemCommands } from 'egret/platform/operations/commands/systemCommands';
import { IDesignConfig } from '../common/exml/designConfig';
import { BackgroundType } from '../common/exml/designConfigImpl';
import { Matrix } from './exmleditor/data/Matrix';
import { FocusRectLayerEvent } from './exmleditor/FocusRectLayer';


/**
 * Exml编辑的核心层
 */
export class ExmlView implements IExmlView {
	//TODO 缩放的临时值记录和存储以及相关事件的派发
	private _helper: ExmlModelHelper;
	private runtimeLayer: HTMLElement;
	exmlEditor: ExmlEditor;

	private _onZoomChanged: Emitter<number>;
	private _onViewChanged: Emitter<ExmlView>;

	constructor(
		protected rootContainer: IExmlViewContainer,
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IEgretProjectService protected egretProjectService: IEgretProjectService,
		@IEditorService protected editorService: IEditorService,
		@IOutputService protected outputService: IOutputService,
		@IClipboardService protected clipboardService: IClipboardService
	) {
		this._onZoomChanged = new Emitter<number>();
		this._onViewChanged = new Emitter<ExmlView>();
		this._helper = this.instantiationService.createInstance(ExmlModelHelper, this);
		this.runtimeLayer = document.createElement('div');
		this.runtimeLayer.setAttribute('className', 'runtime-layer');
		this.exmlEditor = new ExmlEditor();
		this.initView();
		this.initContextMenuGeneral();
	}
	/**
	 * 缩放改变事件
	 */
	public get onZoomChanged(): Event<number> {
		return this._onZoomChanged.event;
	}

	/**
	 * 试图改变，比如：切换子视图
	 */
	public get onViewChanged(): Event<ExmlView> {
		return this._onViewChanged.event;
	}

	/**
	 * 得到ExmlModel操作工具
	 */
	public get helper(): ExmlModelHelper {
		return this._helper;
	}
	/**
	 * 刷新
	 */
	public refresh(): void {
		if (this.getModel() && this.getModel().getExmlConfig()) {
			this.getModel().getExmlConfig().refreshResConfig();
			this.getModel().refreshTree();
		}
	}

	private _previewConfig: PreviewConfig;
	/**
	 * 预览参数
	 */
	public get previewConfig(): PreviewConfig {
		return this._previewConfig;
	}

	private _editMode: EditMode;
	/**
	 * 编辑模式
	 */
	public getEditMode(): EditMode {
		return this._editMode;
	}
	/**
	 * 编辑模式
	 */
	public setEditMode(value: EditMode, previewConfig?: PreviewConfig) {
		this._editMode = value;
		this._previewConfig = previewConfig;
		this.updateEditMode(previewConfig);
	}

	private updateEditMode(previewConfig?: PreviewConfig): void {
		if (this.getEditMode() == EditMode.PREVIEW) {
			this.modeToPreview(previewConfig);
		} else {
			this.modeToDesign();
		}
	}


	/**
	 * 吸附功能
	 */
	public get absorbAble(): boolean {
		return this.exmlEditor.absorbAble;
	}
	public set absorbAble(value: boolean) {
		this.exmlEditor.absorbAble = value;
		if (this.subview) {
			this.subview.absorbAble = value;
		}
	}

	/**
	 * 锁定图层移动
	 */
	public get lockGroup(): boolean {
		return this.exmlEditor.lockGroup;
	}
	public set lockGroup(value: boolean) {
		this.exmlEditor.lockGroup = value;
		if (this.subview) {
			this.subview.lockGroup = value;
		}
	}
	/**
	 * 提示锁定图层移动
	 */
	public promptLockGroupTips(): void {
		this.exmlEditor.promptLockGroupTips();
	}

	/**
	 * 将外部特定的键盘事件传递给预览视图。
	 */
	public notifyKeyboardEvent(e: KeyboardEvent): void {
		if (this.subview) {
			this.subview.notifyKeyboardEvent(e);
		}
		else {
			//移动方向
			if (e.keyCode === 37 || e.keyCode === 38 || e.keyCode === 39 || e.keyCode === 40) {
				this.exmlEditor.beginTransformWithKeyBoardEvent(e);
			}
		}
	}

	/**
	 * 更新预览配置
	 * @param previewOption 
	 */
	public updatePreviewConfig(previewConfig?: PreviewConfig): void {
		this._previewConfig = previewConfig;
		if (this.getEditMode() == EditMode.PREVIEW) {
			this.refreshPreview(previewConfig, false);
		}
	}

	private designViewInfoCache: { x: number, y: number, scale: number } = null;
	private modeToDesign(): void {
		this.exmlEditor.editable = true;
		this.editLayer.style.pointerEvents = '';
		this.runtime.getRuntime().then(api => {
			api.runtimeRootContainer.touchEnabled = false;
			api.runtimeRootContainer.touchChildren = false;
		});
		if (this.designViewInfoCache) {
			if (this.exmlEditor.focusRectLayer) {
				this.exmlEditor.focusRectLayer.disablePreview(true);
				this.exmlEditor.focusRectLayer.setViewTo(this.designViewInfoCache, true);
				// this.exmlEditor.focusRectLayer.removeMask(true);
			}
		}
		this.enableExmlEditorInteractive();
		this.exmlEditor.showGrid(true);
	}

	private modeToPreview(previewOption?: PreviewConfig): void {
		this.exmlEditor.editable = false;
		this.editLayer.style.pointerEvents = 'none';
		this.removeSubView();
		this.runtime.getRuntime().then(api => {
			api.runtimeRootContainer.touchEnabled = true;
			api.runtimeRootContainer.touchChildren = true;
		});
		this.designViewInfoCache = null;
		if (this.exmlEditor.focusRectLayer) {
			this.designViewInfoCache = this.exmlEditor.focusRectLayer.getViewInfo();
			this.refreshPreview(previewOption, true);
		}
		this.disableExmlEditorInteractive();
		this.exmlEditor.hideGrid(true);
	}


	private refreshPreview(PreviewConfig: PreviewConfig, fromInit: boolean): void {
		if (this.exmlEditor.focusRectLayer) {
			let screenWidth = 0;
			let screenHeight = 0;
			let screenScale = 1;
			let fitContent = false;
			if (PreviewConfig) {
				screenWidth = PreviewConfig.screenWidth;
				screenHeight = PreviewConfig.screenHeight;
				screenScale = PreviewConfig.screenScale;
				fitContent = PreviewConfig.fitContent;
			} else {
			}
			if (screenWidth <= 0 || screenHeight <= 0) {
				if (this.container) {
					screenWidth = this.container.clientWidth;
					screenHeight = this.container.clientHeight;
					screenScale = 1;
				}
			}
			setTimeout(() => {
				const stageInfo = this.egretProjectService.projectModel.getStageInfo();
				if (fromInit) {
					this.exmlEditor.focusRectLayer.enablePreview(fitContent, stageInfo.contentWidth, stageInfo.contentHeight, screenWidth, screenHeight, stageInfo.scaleMode, screenScale, true);
				} else {
					this.exmlEditor.focusRectLayer.adjustPreview(fitContent, stageInfo.contentWidth, stageInfo.contentHeight, screenWidth, screenHeight, stageInfo.scaleMode, screenScale, true);
				}
			}, 20);
		}
	}

	/**
	 * 放大
	 */
	public zoomIn(): void {
		const targetScale = this.exmlEditor.focusRectLayer.scale * 1.5;
		this.exmlEditor.focusRectLayer.fitScreen(targetScale, false, true);
	}
	/**
	 * 缩小
	 */
	public zoomOut(): void {
		const targetScale = this.exmlEditor.focusRectLayer.scale / 1.5;
		this.exmlEditor.focusRectLayer.fitScreen(targetScale, false, true);
	}
	/**
	 * 适应屏幕
	 */
	public fitScreen(): void {
		this.exmlEditor.focusRectLayer.fitScreen(NaN, true, true, true);
	}
	/**
	 * 无缩放
	 */
	public noScale(): void {
		this.exmlEditor.focusRectLayer.fitScreen(1, true, true);
	}
	/**
	 * 当前缩放值
	 */
	public getCurrentZoom(): number {
		return this.exmlEditor.focusRectLayer.scale;
	}

	public refreshRectRender(): void {
		this.exmlEditor.focusRectLayer.refresh();
	}

	private _subview: SubExmlView;
	/**
	 * 获取子视图
	 */
	public get subview(): SubExmlView {
		return this._subview;
	}
	/**
	 * 视图的名称
	 */
	public getViewName(): string {
		if (this.getModel()) {
			return this.getModel().getClassName();
		}
		return '';
	}

	private _runtime: EgretRuntimeDelegate;
	/** 编辑器区域中的运行时 */
	public get runtime(): EgretRuntimeDelegate {
		return this._runtime;
	}

	/**
	 * 刷新布局
	 */
	public doResize(): void {
		if (this.runtime) {
			this.runtime.getRuntime().then(runtime => {
				runtime.resumeOnceGlobal();
			});
		}
	}

	private _focused: boolean = false;
	/**
	 * 是否有焦点
	 */
	public get focused(): boolean {
		return this._focused;
	}
	/**
	 * 赋予焦点
	 */
	public doFosusIn(): void {
		this._focused = true;
		if (this.runtime) {
			this.runtime.getRuntime().then(api => {
				api.resumeGlobal();
			});
		}
		if (this.subview) {
			this.subview.doFosusIn();
		}
	}


	/**
	 * 失去焦点
	 */
	public doFosusOut(): void {
		this._focused = false;
		if (this.runtime) {
			this.runtime.getRuntime().then(api => {
				api.pauseGlobal();
				api.resumeOnceGlobal();
			});
		}
		if (this.subview) {
			this.subview.doFosusOut();
		}
	}

	private backgroundLayer: HTMLElement;
	private designBackgroundLayer: HTMLElement;
	private editLayer: HTMLElement;
	private _container: HTMLElement;
	/**
	 * 得到核心容器
	 */
	public get container(): HTMLElement {
		return this._container;
	}

	protected initView(): void {
		this.runtimeLayer.style.width = '100%';
		this.runtimeLayer.style.height = '100%';
		this.runtimeLayer.style.position = 'absolute';
		this.runtimeLayer.style.top = '0';
		this.runtimeLayer.style.left = '0';
		this.runtimeLayer.style.zIndex = '-1';
		this._runtime = this.instantiationService.createInstance(EgretRuntimeDelegate, this.runtimeLayer);
		this._runtime.onLog = (message) => {
			this.outputService.append(message);
		};
		this._runtime.onWarn = (message) => {
			message = '[Warning]:' + message;
			this.outputService.append(message);
		};
		this._runtime.onError = (message) => {
			message = '[Error]:' + message;
			this.outputService.append(message);
		};
		this.backgroundLayer = document.createElement('div');
		this.backgroundLayer.className = 'backgroundLayer';
		this.backgroundLayer.style.width = '100%';
		this.backgroundLayer.style.height = '100%';
		this.backgroundLayer.style.position = 'absolute';
		this.backgroundLayer.style.top = '0';
		this.backgroundLayer.style.left = '0';
		this.backgroundLayer.style.zIndex = '-2';

		this.designBackgroundLayer = document.createElement('div');
		this.designBackgroundLayer.className = 'exmlEditor-designBackgroundLayer';
		this.designBackgroundLayer.style.width = '0px';
		this.designBackgroundLayer.style.height = '0px';
		this.designBackgroundLayer.style.position = 'absolute';
		this.designBackgroundLayer.style.top = '0';
		this.designBackgroundLayer.style.left = '0';
		this.designBackgroundLayer.style.zIndex = '-2';
		this.designBackgroundLayer.style.overflow = 'hidden';
		this.designBackgroundLayer.style.backgroundRepeat = 'no-repeat';
		this.designBackgroundLayer.style.backgroundSize = '100%';
		this.designBackgroundLayer.style.transformOrigin = 'left top';
		this.designBackgroundLayer.style.backgroundSize = 'cover';

		this.editLayer = document.createElement('div');
		this.editLayer.style.width = '100%';
		this.editLayer.style.height = '100%';
		this.editLayer.style.top = '0';
		this.editLayer.style.left = '0';

		this._container = document.createElement('div');
		this._container.setAttribute('className', 'exmlview-container');
		this._container.style.width = '100%';
		this._container.style.height = '100%';
		this._container.style.position = 'absolute';
		this._container.style.top = '0';
		this._container.style.left = '0';
		this._container.style.zIndex = '0';
		this._container.style.overflow = 'hidden';

		this._container.appendChild(this.backgroundLayer);
		this._container.appendChild(this.designBackgroundLayer);
		this._container.appendChild(this.runtimeLayer);
		this._container.appendChild(this.editLayer);

		this.rootContainer.addExmlView(this);

		this.exmlEditor.init(this.editLayer, this.backgroundLayer, this.rootContainer, this.clipboardService);
		this.exmlEditor.focusRectLayer.onScaleChanged(scale => { this._onZoomChanged.fire(scale); });
		this.exmlEditor.focusRectLayer.addEventListener(FocusRectLayerEvent.VIEWCHANGED, () => { this.updateDesignBackgroundLayer(); }, this);
		this.refreshRuntime();
	}
	/**
	 * 刷新运行时
	 */
	public refreshRuntime(): void {
		this.egretProjectService.ensureLoaded().then(() => {
			if (this.egretProjectService.exmlConfig) {
				this.egretProjectService.exmlConfig.ensureLoaded().then(() => {
					const exmlConfig = this.egretProjectService.exmlConfig as EUIExmlConfig;
					const runtimeUrl = exmlConfig.getRuntimeUrlDirect();
					if (this._runtime) {
						this._runtime.initRuntime(runtimeUrl);
					}
				});
			}
		});
	}

	/**
	 * 进入内嵌皮肤
	 * @param node 要进入的节点
	 */
	protected enterToInner(node: INode): void {
		const model = this.getModel();
		const tryOpen: Function = (className: string) => {
			let name: string;
			const uri = model.getExmlConfig().getProjectConfig().getExmlUri(className);
			const path: string = uri ? uri.fsPath : '';
			if (!className || !path) {
				name = model.getExmlConfig().getClassNameById(node.getName(), node.getNs());
			} else {
				name = className;
			}
			if (name && path) {
				this.editorService.openEditor({
					resource: URI.file(path)
				});
				return true;
			}
			return false;
		};
		const tryInstallView = (property: string) => {
			let propertyClassName: string;
			const innerClass = node.getProperty(property) as IClass;
			if (innerClass) {
				propertyClassName = innerClass.getClassName();
				if (innerClass.getIsInner()) {
					this.installEditingView(innerClass);
					return true;
				}
			} else {
				if (node.getInstance()[property]) {
					if (typeof node.getInstance()[property] === 'string') {
						propertyClassName = node.getInstance()[property];
					} else {
						propertyClassName = model.getExmlConfig().getQualifiedClassName(node.getInstance()[property]);
					}
				}
			}
			return tryOpen(propertyClassName);
		};
		if (model.getExmlConfig().isInstance(node.getInstance(), 'eui.DataGroup')) {
			if (tryInstallView('itemRenderer')) {
				return;
			} else if (tryInstallView('itemRendererSkinName')) {
				return;
			}
		}
		if (model.getExmlConfig().isInstance(node.getInstance(), 'eui.Component')) {
			if (tryInstallView('skinName')) {
				return;
			}
		}
		if (node.getNs().uri !== EUI.uri) {
			const nodeClassName: String = model.getExmlConfig().getClassNameById(node.getName(), node.getNs());
			if (nodeClassName) {
				tryOpen(nodeClassName);
			}
		}
	}

	protected modelDisposables: IDisposable[] = [];
	protected _model: IExmlModel;
	protected _designConfig: IDesignConfig;
	/**
	 * 当前视图的exml数据层
	 */
	public getModel(): IExmlModel {
		return this._model;
	}
	/**
	 * 当前视图的exml数据层
	 */
	public setModel(value: IExmlModel): void {
		if (this._model == value) {
			return;
		}
		dispose(this.modelDisposables);
		if (value) {
			this._helper.setModel(value);

			this._model = value;
			this._designConfig = this._model.getDesignConfig();
			this.modelDisposables.push(this._model.onRootChanged(e => this.rootChanged_handler(e)));
			this.modelDisposables.push(this._model.onViewStackIndexChanged(e => this.viewStackIndexChanged_handler(e)));
			this.modelDisposables.push(this._model.onCompileError(e => this.compileError_handler(e)));
			this.modelDisposables.push(this._model.onCompileWarning(e => this.compileWarning_handler(e)));
			this.modelDisposables.push(this._model.onDesignConfigChanged(e => this.applyDesignConfig()));

			this._model.getExmlConfig().setRuntime(this._runtime);
			this._model.refreshTree();
		} else {
			this.exmlEditor.clearRuntime();
		}
	}

	private updateDesignBackgroundLayer(): void {
		if(this.getEditMode() === EditMode.PREVIEW) {
			this.designBackgroundLayer.style.display = 'none';
		} else {
			this.designBackgroundLayer.style.display = 'block';
		}
		if (this.exmlEditor.focusRectLayer.egretContentHost) {
			let m: Matrix = this.exmlEditor.focusRectLayer.egretContentHost.getTarget().matrix;
			this.designBackgroundLayer.style.transform = 'matrix(' + m.a + ',' + m.b + ',' + m.c + ',' + m.d + ',' + m.tx + ',' + m.ty + ')';
		}
		const rootFocusRect = this.exmlEditor.focusRectLayer.getRootFocusRect();
		this.designBackgroundLayer.style.width = rootFocusRect.width + 'px';
		this.designBackgroundLayer.style.height = rootFocusRect.height + 'px';
	}

	private applyDesignConfig(): void {
		this.updateDesignBackgroundLayer();
		const configModel: IDesignConfig = this._model.getDesignConfig();

		switch (configModel.backgroundType) {
			case BackgroundType.User:
				if (configModel.useBgColor) {
					this.designBackgroundLayer.style.backgroundColor = configModel.backgroundColor;
				}
				else {
					this.designBackgroundLayer.style.backgroundColor = '';
				}
				if (configModel.useBgImage) {
					var image: string = configModel.backgroundImage;
					if (image) {
						image = image.replace(/\\/ig, '/');
						image = 'url(\'' + image + '\')';
					}
					this.designBackgroundLayer.style.backgroundImage = image;
				}
				else {
					this.designBackgroundLayer.style.backgroundImage = '';
				}
				this.designBackgroundLayer.style.opacity = (configModel.backgroundAlpha * 0.01) + '';
				break;
			case BackgroundType.Null:
				this.designBackgroundLayer.style.backgroundColor = configModel.globalBackgroundColor;
				var image: string = configModel.globalBackgroundImage;
				if (image) {
					image = image.replace(/\\/ig, '/');
					image = 'url(\'' + image + '\')';
				}
				this.designBackgroundLayer.style.backgroundImage = image;
				this.designBackgroundLayer.style.opacity = (configModel.globalBackgroundAlpha * 0.01) + '';
				break;
		}

	}

	private compileError_handler(msg: string): void {
		this.outputService.append(msg);
	}
	private compileWarning_handler(msg: string): void {
		this.outputService.append(msg);
	}

	private rootChanged_handler(e: RootChangedEvent): void {
		this.removeSubView();
		this.runtime.getRuntime().then(runtimeApi => {
			runtimeApi.runtimeRootContainer.removeChildren();
			if (e.target.getRootElement()) {
				runtimeApi.runtimeRootContainer.addChild(e.target.getRootElement());//初始化编辑器
				//TODO 杨宁临时加了个延时，他说后面要优化
				setTimeout(() => {
					this.attachExmlEditor(this._model, this.helper, runtimeApi);
					runtimeApi.resumeOnceGlobal();
					this.applyDesignConfig();
				}, 50);
			} else {
				//TODO 如果没有内容肯定是编辑报错了，此时应该在正文显示点啥，比如显示错误信息？
			}
			runtimeApi.resumeOnceGlobal();
		});
	}
	protected detachExmlEditor(): void {
		this.exmlEditor.dispose();
		this.disableExmlEditorInteractive();
	}
	private disableExmlEditorInteractive(): void {
		this.container.parentElement.removeEventListener('mousewheel', this.containerEventHandler);
		this.container.parentElement.removeEventListener('mousedown', this.containerEventHandler);
		this.container.removeEventListener('dblclick', this.containerEventHandler);
		this.exmlEditor.removeEventListener('onContextMenu', this.onContextMenu, this);
	}
	protected attachExmlEditor(model: IExmlModel, helper: ExmlModelHelper, runtimeApi: IRuntimeAPI): void {
		this.exmlEditor.setup(model, helper, runtimeApi);
		if (this.getEditMode() == EditMode.DESIGN) {
			this.enableExmlEditorInteractive();
		}
	}
	private enableExmlEditorInteractive(): void {
		this.disableExmlEditorInteractive();
		this.container.parentElement.addEventListener('mousewheel', this.containerEventHandler);
		this.container.parentElement.addEventListener('mousedown', this.containerEventHandler);
		this.container.addEventListener('dblclick', this.containerEventHandler);
		this.exmlEditor.addEventListener('onContextMenu', this.onContextMenu, this);
	}
	private onContextMenu(e: MouseEvent): void {
		this.displayContextMenu(e.pageX, e.pageY);
	}
	private containerEventHandler = (e: MouseEvent): void => {
		switch (e.type) {
			case 'dblclick':
				if (!this.helper.rootNode || this.getEditMode() != EditMode.DESIGN) {
					return;
				}
				const nodes = this._model.getSelectedNodes();
				if (nodes.length > 0) {
					const node = nodes[0];
					this.enterToInner(node);
				}
				break;
			case 'mousedown':
			case 'mousewheel':
				this.exmlEditor.notifyMouseEvent(e);
				break;
		}
	}

	private viewStackIndexChanged_handler(e: ViewStackIndexChangedEvent): void {
		const viewStack: IViewStack = e.newNode as IViewStack;
		if (!(isInstanceof(viewStack, 'eui.IViewStack'))) {
			return;
		}
		const oldNode: INode = e.oldNode as INode;
		if (isInstanceof(oldNode, 'eui.INode') && oldNode.getInstance()) {
			const container: any = oldNode.getInstance();
			for (let i = 0; i < this._model.getSelectedNodes().length; i++) {
				const node: INode = this._model.getSelectedNodes()[i];
				if (container.contains && container.contains(node.getInstance())) {
					node.setSelected(false);
				}
			}
		}
	}

	/* -------------------------------- 子视图相关 -------------------------------- */
	/**
	 * 移除所有子集视图
	 */
	public removeSubView(): void {
		if (this._subview) {
			this._subview.dispose();
		}
		this._subview = null;
		if (this.exmlEditor) {
			this.exmlEditor.visible = true;
		}
		this._onViewChanged.fire(this);
	}

	/** 
	 * 安装子视图
	 */
	public installEditingView(node: IValue): void {
		const view: SubExmlView = this.instantiationService.createInstance(SubExmlView, this, node, this.rootContainer);
		view.setEditMode(this.getEditMode(), this.previewConfig);
		this._subview = view;
		if (this.exmlEditor) {
			this.exmlEditor.visible = false;
		}
		//TODO 派发viewChanged事件
		this._onViewChanged.fire(this._subview);
	}


	/* -------------------------------- 上下文菜单 -------------------------------- */
	/**
	 * 添加一般的上下文菜单
	 */
	private initContextMenuGeneral(): void {
		this.addContextMenuItemGeneral({ label: localize('exmlView.initContextMenuGeneral.copy', 'Copy'), id: SystemCommands.COPY });
		this.addContextMenuItemGeneral({ label: localize('exmlView.initContextMenuGeneral.cut', 'Cut'), id: SystemCommands.CUT });
		this.addContextMenuItemGeneral({ label: localize('exmlView.initContextMenuGeneral.paste', 'Paste'), id: SystemCommands.PASTE });
		this.addContextMenuItemGeneral({ label: localize('system.delete', 'Delete'), id: SystemCommands.DELETE });
		this.addContextMenuSeparator();
		this.addContextMenuItemGeneral({ label: localize('exmlView.initContextMenuGeneral.group', 'Group'), id: EuiCommands.GROUP });
		this.addContextMenuItemGeneral({ label: localize('exmlView.initContextMenuGeneral.upgroup', 'Ungroup'), id: EuiCommands.UNGROUP });
		this.addContextMenuSeparator();
		this.addContextMenuItemGeneral({ label: localize('exmlView.initContextMenuGeneral.copyProperty', 'Copy Property'), id: EuiCommands.COPY_PROPERTY });
		this.addContextMenuItemGeneral({ label: localize('exmlView.initContextMenuGeneral.pastePos', 'Paste Pos'), id: EuiCommands.PASTE_POS });
		this.addContextMenuItemGeneral({ label: localize('exmlView.initContextMenuGeneral.pasteSize', 'Paste Size'), id: EuiCommands.PASTE_SIZE });
		this.addContextMenuItemGeneral({ label: localize('exmlView.initContextMenuGeneral.pasteRestrict', 'Paste Restrict'), id: EuiCommands.PASTE_RESTRICT });
		this.addContextMenuSeparator();
		this.addContextMenuItemGeneral({ label: localize('exmlView.initContextMenuGeneral.convertToInner', 'Convert to Inline Skin'), id: EuiCommands.CONVERT_TO_INNER });
	}


	/**
	 * 添加动态的上下文菜单内容
	 */
	private initContextMenuDynamic(displayX: number, displayY: number): void {
		//TODO 应该根据当前右键的位置，来得到下面可以选择的所有节点，然后添加到上下文菜单的顶部
		this.clearDynamicMenuItems();
		const rects = this.exmlEditor.focusRectLayer.getAllChildFocusRectWithWindowRange(new Rectangle(displayX, displayY, 1, 1), false, false);
		let menuItemAdded: boolean = false;
		for (let i = 0; i < rects.length; i++) {
			const node = rects[i].targetNode as INode;
			let label: string = '';
			if (node.getId()) {
				label = node.getName() + ' - ' + node.getId();
			} else {
				label = node.getName();
			}
			this.addContextMenuItemDynamic({ label: label, id: '' }, node);
			menuItemAdded = true;
		}
		if (menuItemAdded) {
			this.addContextMenuItemDynamic({ type: 'separator' }, null);
		}
	}

	private contextMenuItemsGeneral: { type: 'separator' | 'normal', option: MenuItemConstructorOptions, item: MenuItem }[] = [];
	private contextMenuItemsDynamic: { type: 'separator' | 'normal', option: MenuItemConstructorOptions, item: MenuItem, disposable: IDisposable }[] = [];

	/**
	 * 在上下文菜单中添加一个项目
	 * @param option 
	 */
	private addContextMenuItemGeneral(option: MenuItemConstructorOptions): void {
		option.click = (item, win) => {
			this.runCommand(option.id as EuiCommands);
		};
		const item = new remote.MenuItem(option);
		this.contextMenuItemsGeneral.push({
			type: 'normal',
			option: option,
			item: item
		});
	}
	/**
	 * 运行命令
	 */
	public runCommand(command: EuiCommands | SystemCommands): void {
		switch (command) {
			case SystemCommands.COPY:
				this.helper.copyNodesToClipboard();
				break;
			case SystemCommands.CUT:
				this.helper.cutNodesToClipboard();
				break;
			case SystemCommands.PASTE:
				this.helper.pasteNodesFromClipboard();
				break;
			case SystemCommands.DELETE:
				this.helper.removeSelectedNodes();
				break;
			case SystemCommands.SELECT_ALL:
				this.helper.selectAll();
				break;
			case EuiCommands.GROUP:
				this.helper.groupNodes();
				break;
			case EuiCommands.UNGROUP:
				this.helper.unGroupNodes();
				break;
			case EuiCommands.COPY_PROPERTY:
				this.helper.copyNodeProperty();
				break;
			case EuiCommands.PASTE_SIZE:
				this.helper.pasteNodeSize();
				break;
			case EuiCommands.PASTE_POS:
				this.helper.pasteNodePos();
				break;
			case EuiCommands.PASTE_RESTRICT:
				this.helper.pasteNodeRestrict();
				break;
			case EuiCommands.CONVERT_TO_INNER:
				this.helper.convertToInner(this.getModel().getSelectedNodes()[0]).then(classNode => {
					if (classNode) {
						this.installEditingView(classNode);
					}
				});
				break;
			case EuiCommands.REFRESH:
				this.refresh();
				break;
			case EuiCommands.ZOOM_IN:
				this.zoomIn();
				break;
			case EuiCommands.ZOOM_OUT:
				this.zoomOut();
				break;
			case EuiCommands.FIT_SCREEN:
				this.fitScreen();
				break;
			case EuiCommands.NO_SCALE:
				this.noScale();
				break;
			default:
				break;
		}
	}

	/**
	 * 在上下文菜单中添加一个项目
	 * @param option 
	 */
	private addContextMenuItemDynamic(option: MenuItemConstructorOptions, itemData: any): void {
		let clickRef: { doClick: Function };
		if (option.type != 'separator') {
			clickRef = {
				doClick: () => {
					this.contextMenuDynamicSelected_handler(itemData);
				}
			};
			option.click = (item, win) => {
				if (clickRef.doClick) {
					clickRef.doClick();
				}
			};
		}
		const item = new remote.MenuItem(option);
		let disposable: IDisposable = null;
		if (clickRef) {
			disposable = {
				dispose: () => {
					clickRef.doClick = null;
				}
			};
		}
		this.contextMenuItemsDynamic.push({
			type: 'normal',
			option: option,
			item: item,
			disposable: disposable
		});
	}
	/**
	 * 清理所有动态菜单项
	 */
	private clearDynamicMenuItems(): void {
		while (this.contextMenuItemsDynamic.length > 0) {
			const disposable = this.contextMenuItemsDynamic.pop().disposable;
			if (disposable) {
				disposable.dispose();
			}
		}
	}


	/**
	 * 在上下文菜单中添加一个分割线
	 */
	private addContextMenuSeparator(): void {
		const option: MenuItemConstructorOptions = { type: 'separator' };
		const item = new remote.MenuItem(option);
		this.contextMenuItemsGeneral.push({ type: 'separator', option: option, item: item });
	}

	/**
	 * 创建上下文菜单
	 */
	private createContextMenu(): Menu {
		const menu = new remote.Menu();
		for (let i = 0; i < this.contextMenuItemsDynamic.length; i++) {
			menu.append(this.contextMenuItemsDynamic[i].item);
		}
		for (let i = 0; i < this.contextMenuItemsGeneral.length; i++) {
			menu.append(this.contextMenuItemsGeneral[i].item);
		}
		return menu;
	}

	/**
	 * 设置上下文菜单的禁用与否
	 * @param enable 
	 * @param id 
	 */
	private setContextMenuEnable(enable: boolean, id: string = null): void {
		if (id) {
			for (let i = 0; i < this.contextMenuItemsGeneral.length; i++) {
				if (this.contextMenuItemsGeneral[i].option.id == id) {
					this.contextMenuItemsGeneral[i].item.enabled = enable;
					break;
				}
			}
		} else {
			for (let i = 0; i < this.contextMenuItemsGeneral.length; i++) {
				this.contextMenuItemsGeneral[i].item.enabled = enable;
			}
		}
	}
	/**
	 * 显示上下文菜单
	 * @param displayX 
	 * @param displayY 
	 */
	private displayContextMenu(displayX: number, displayY: number): void {
		//如果得不到Model就返回，不要继续弹出菜单
		if (!this.getModel()) {
			return;
		}
		this.setContextMenuEnable(false);
		const selectedNodes = this.getModel().getSelectedNodes();
		if (selectedNodes.length > 0 && !this._model.getAnimationModel().getEnabled()) {
			if (selectedNodes.length >= 2 && selectedNodes.indexOf(this.helper.rootNode) === -1) {
				this.setContextMenuEnable(true, EuiCommands.GROUP);
			}
			if (this.helper.canUngroupNodes()) {
				this.setContextMenuEnable(true, EuiCommands.UNGROUP);
			}
			if (selectedNodes[0] !== this.helper.rootNode) {
				this.setContextMenuEnable(true, SystemCommands.COPY);
				this.setContextMenuEnable(true, SystemCommands.DELETE);
				this.setContextMenuEnable(true, SystemCommands.CUT);
				if (canPastePos()) {
					this.setContextMenuEnable(true, EuiCommands.PASTE_POS);
				}
				if (canPasteSize()) {
					this.setContextMenuEnable(true, EuiCommands.PASTE_SIZE);
				}
				if (canPasteRestrict()) {
					this.setContextMenuEnable(true, EuiCommands.PASTE_RESTRICT);
				}
			}
			this.setContextMenuEnable(true, SystemCommands.PASTE);
		}
		if (selectedNodes.length === 1 && !this._model.getAnimationModel().getEnabled()) {
			if (selectedNodes[0] !== this.helper.rootNode) {
				this.setContextMenuEnable(true, EuiCommands.COPY_PROPERTY);
			}
			if (this.helper.canConvertToInner(selectedNodes[0])) {
				this.setContextMenuEnable(true, EuiCommands.CONVERT_TO_INNER);
			}
		}
		this.initContextMenuDynamic(displayX, displayY);
		this.createContextMenu().popup({
			window: remote.getCurrentWindow(),
			x: displayX,
			y: displayY
		});
	}

	/**
	 * 上下文菜单被选择
	 * @param itemId 
	 */
	private contextMenuDynamicSelected_handler(itemData: any): void {
		this.helper.select(itemData as INode);
	}

	private disposed: boolean = false;
	/* -------------------------------- 生命周期结束 -------------------------------- */
	/**
	 * 释放
	 */
	public dispose(): void {
		if (this.disposed) {
			return;
		}
		this.disposed = true;
		this.detachExmlEditor();
		dispose(this.modelDisposables);
		dispose(this._subview);
		dispose(this._helper);
		this._subview = null;
		if (this.rootContainer) {
			this.rootContainer.removeExmlView(this);
		}
		dispose(this._runtime);
		this._runtime = null;
		this.rootContainer = null;
	}
}


/**
 * 子视图
 */
export class SubExmlView extends ExmlView implements IExmlView {
	constructor(
		private parentView: ExmlView,
		private nodeBelonged: IValue,
		protected rootContainer: IExmlViewContainer,
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IEgretProjectService protected egretProjectService: IEgretProjectService,
		@IEditorService protected editorService: IEditorService,
		@IOutputService protected outputService: IOutputService,
		@IClipboardService protected clipboardService: IClipboardService
	) {
		super(rootContainer, instantiationService, egretProjectService, editorService, outputService, clipboardService);
		this.initView();
		this.instalView();
		if (this.parentView.focused) {
			this.doFosusIn();
		}
	}

	protected detachExmlEditor(): void {
		this.parentView.exmlEditor.removeSubViewAdapter(this.exmlEditor, this.host);
		this.exmlEditor.dispose();
		this.container.removeEventListener('dblclick', this.eventHandler);
	}
	protected attachExmlEditor(model: IExmlModel, helper: ExmlModelHelper, runtimeApi: IRuntimeAPI): void {
		this.exmlEditor.setup(model, helper, runtimeApi);
		this.parentView.exmlEditor.addSubViewAdapter(this.exmlEditor, this.host);
		this.container.addEventListener('dblclick', this.eventHandler);
	}
	private eventHandler = (e: MouseEvent): void => {
		switch (e.type) {
			case 'dblclick':
				const nodes = this._model.getSelectedNodes();
				if (nodes.length === 1) {
					if (nodes[0].getIsRoot()) {
						this.parentView.removeSubView();
					}
				} else if (nodes.length == 0) {
					this.parentView.removeSubView();
				}
				break;
		}
	}

	private parentModel: IExmlModel;
	private host: INode;
	private addNameSpaces: string[] = [];

	/**
	 * 安装当前视图
	 */
	protected instalView(): void {
		this.host = this.nodeBelonged.getHost() as INode;
		this.parentModel = this.parentView.getModel();

		const range: number[] = xmlStrUtil.findRangeByPath(
			this.nodeBelonged.getExmlModel().getText(),
			this.nodeBelonged.getXmlPath(),
			this.nodeBelonged.getExmlModel().getCurrentState(),
			this.nodeBelonged.getExmlModel().getStates());

		let innerStr: string = this.nodeBelonged.getExmlModel().getText().substring(range[0], range[3] + 1);

		const nss: Namespace[] = xmlTagUtil.inScopeNamespaces(xmlTagUtil.parse(this.nodeBelonged.getExmlModel().getText()));
		let insertIndex = (range[2] === range[3]) ? (range[1] - 1) : range[1];
		insertIndex = insertIndex - range[0];

		for (let i = 0; i < nss.length; i++) {
			const ns = nss[i];
			const xmlnsInsertStr = ' xmlns:' + ns.prefix + '=\'' + ns.uri + '\'';
			const contentNss = xmlStrUtil.getNamespaces(innerStr);
			let has: boolean = false;
			for (let j = 0; j < contentNss.length; j++) {
				if (contentNss[j].prefix === ns.prefix) {
					has = true;
					break;
				}
			}
			if (!has) {
				if (innerStr.indexOf(xmlnsInsertStr) < 0 || innerStr.indexOf(xmlnsInsertStr) > range[1]) {
					innerStr = innerStr.substring(0, insertIndex) + xmlnsInsertStr + innerStr.substring(insertIndex);
					this.addNameSpaces.push(xmlnsInsertStr);
					insertIndex += xmlnsInsertStr.length;
				}
			}
		}

		const subModel: IExmlModel = this.egretProjectService.createSubExmlModel(innerStr, this.parentModel);
		subModel.setEnabled(true);
		this.setModel(subModel);
		this.parentModel.addChildModel(this.getModel());
		//TODO 更新缩放尺寸和位置
		this.host.getInstance().visible = false;
	}

	/**
	 * 从上级视图移除
	 */
	private removeFromParent(): void {
		this.host.getInstance().visible = true;
		this.parentModel.removeChildModel(this.getModel());
		this.parentModel.refreshTree();
		this.setModel(null);
	}

	protected initView(): void {
		if (!this.parentView) {
			return;
		}
		super.initView();
		//应用父级吸附功能
		this.exmlEditor.absorbAble = this.parentView.absorbAble;
		//应用锁定图层移动
		this.exmlEditor.lockGroup = this.parentView.lockGroup;
	}


	/**
	 * 当前视图的exml数据层
	 */
	public setModel(value: IExmlModel): void {
		super.setModel(value);

		if (this._model) {
			this.modelDisposables.push(this._model.onTextChanged(e => this.textChanged_handler(e)));
		}
	}

	private textChanged_handler(e: TextChangedEvent): void {
		const parentRange: number[] = xmlStrUtil.findRangeByPath(
			this.parentModel.getText(),
			this.nodeBelonged.getXmlPath(),
			this.parentModel.getCurrentState(),
			this.parentModel.getStates());

		//全部替换
		if (e.oldStartIndex === 0 && e.insertText === this.getModel().getText()) {
			for (let i = 0; i < this.addNameSpaces.length; i++) {
				//将带有已经存在的命名空间的文本替换回去
				const ns: string = this.addNameSpaces[i];
				e.insertText = e.insertText.replace(ns, '');
			}
			let newText: string = this.parentModel.getText();
			newText = newText.substring(0, parentRange[0]) + e.insertText + newText.substring(parentRange[3] + 1);
			this.parentModel.insertText(newText, 0, 2147483647, true, false);
			//TODO 子视图添加了状态后会刷新整个exml，然后退出编辑
		} else {
			const newStartIndex: number = this.mapToParent(e.oldStartIndex, parentRange);
			const newEndIndex: number = newStartIndex + e.oldEndIndex - e.oldStartIndex;
			this.parentModel.insertText(e.insertText, newStartIndex, newEndIndex, true, false);
		}
	}

	/**
	 * 将一个字符索引映射到父级的索引位置
	 * @parent index 要映射的字符索引
	 */
	private mapToParent(index: number, range: number[]): number {
		if (index < range[1] - range[0]) {
			return index + range[0];
		} else {
			let addLength: number = 0;
			for (let i = 0; i < this.addNameSpaces.length; i++) {
				const ns: string = this.addNameSpaces[i];
				addLength += ns.length;
			}
			return index + range[0] - addLength;
		}
	}

	/**
	 * 进入内嵌皮肤
	 * @param node 要进入的节点
	 */
	protected enterToInner(node: INode): void {
		if (!node) {
			this.parentModel.refreshTree();
		} else {
			super.enterToInner(node);
		}
	}


	private subDisposed: boolean = false;
	/* -------------------------------- 生命周期结束 -------------------------------- */
	/**
	 * 释放
	 */
	public dispose() {
		if (this.subDisposed) {
			return;
		}
		this.subDisposed = true;
		if (this.nodeBelonged) {
			this.removeFromParent();
		}
		super.dispose();
		this.parentView = null;
		this.nodeBelonged = null;
		this.rootContainer = null;
		this.instantiationService = null;
		this.editorService = null;
		this.egretProjectService = null;
		this.parentView = null;
		this.host = null;
		this.parentModel = null;
		//TODO 派发视图改变事件
	}
}