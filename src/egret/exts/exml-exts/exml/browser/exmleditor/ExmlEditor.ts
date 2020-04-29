import { ExmlModelHelper } from "../../common/exml/helpers";
import { IRuntimeAPI } from "../../runtime/runtime";
import { IExmlModel } from "../../common/exml/models";
import { FocusRectLayer } from "./FocusRectLayer";
import { TransformLayer } from "./TransformLayer";
import { Absorber } from "./absorb/Absorber";
import { Ruler } from "./ruler/Ruler";
import { PixGrid } from "./ruler/PixGrid";
import { HtmlElementResizeHelper } from "./HtmlElementResizeHelper";
import { EgretContentHostEvent } from "./EgretContentHost";
import { INode } from "../../common/exml/treeNodes";
import { MatrixUtil } from "./t9transformer/util/MatrixUtil";
import { Point } from "./data/Point";
import { EventDispatcher, Event } from "./EventDispatcher";
import { DragWorker } from "./DragWorker";
import { TweenLite } from "gsap";
import { IExmlViewContainer } from "../editors";
import { IClipboardService } from "egret/platform/clipboard/common/clipboardService";
import { OperateLayer } from "./operatelayers/OperateLayer";
import { AutoMarkLayer } from "./AutoMarkLayer";
import { Keyboard } from "./data/Keyboard";
/**
 */
export class ExmlEditor extends EventDispatcher {
	constructor() {
		super();
		this.focusRectContainerSizeChange = this.focusRectContainerSizeChange.bind(this);
	}

	private _editable: boolean = true;
	/**
	 * 设置是否可以编辑
	 */
	public get editable(): boolean {
		return this._editable;
	}
	public set editable(value: boolean) {
		this._editable = value;
		this.updateEdiable();
	}

	private updateEdiable(): void {
		if (this.editable) {
			if (this.absorbContainer) {
				this.absorbContainer.style.visibility = "";
			}
			if (this.transformContainer) {
				this.transformContainer.style.visibility = "";
			}
			if (this.focusRectLayer) {
				this.focusRectLayer.show();
			}
		} else {
			if (this.absorbContainer) {
				this.absorbContainer.style.visibility = "hidden";
			}
			if (this.transformContainer) {
				this.transformContainer.style.visibility = "hidden";
			}
			if (this.focusRectLayer) {
				this.focusRectLayer.hide();
			}
		}
	}

	private keyDic: any = {};
	/**根据一个键盘事件来启动一个变换 */
	public beginTransformWithKeyBoardEvent(e: KeyboardEvent): void {
		let keyCode = e.keyCode;
		switch (e.type) {
			case 'keydown':
				this.keyDic[keyCode] = 1;
				break;
			case 'keyup':
				this.keyDic[keyCode] = 0;
				break;
		}
		if (this.keyDic[Keyboard.UP] ||
			this.keyDic[Keyboard.DOWN] ||
			this.keyDic[Keyboard.LEFT] ||
			this.keyDic[Keyboard.RIGHT]) {
			//键盘启动的变换不应该触发容器自动识别和吸附逻辑，这里先关掉再打开
			this.autoMarkLayer.enalbed = false;
			this.adsorber.enabled = false;
			this.focusRectLayer.notifyKeyboradEvent(e);
		}
		else {
			// this.operateLayer.stopCurrenTransform();
			this.autoMarkLayer.enalbed = true;
			this.adsorber.enabled = true;
		}
	}


	public focusRectLayer: FocusRectLayer;
	private operateLayer: OperateLayer;
	private transformLayer: TransformLayer;
	private autoMarkLayer: AutoMarkLayer;
	private adsorber: Absorber;
	private dragWorker: DragWorker;
	private hRuler: Ruler;
	private vRuler: Ruler;
	private pixGrid: PixGrid;
	private container: HTMLElement;
	private backgroundContainer: HTMLElement;
	private runtime: IRuntimeAPI;

	public init(container: HTMLElement, backgroundContainer: HTMLElement, rootContianer: IExmlViewContainer, clipboardService: IClipboardService): void {
		this.container = container;
		this.backgroundContainer = backgroundContainer;
		this.initView();
		this.focusRectContainer.addEventListener('resize', this.focusRectContainerSizeChange);
		//添加节点映射层
		this.focusRectLayer = new FocusRectLayer();
		this.focusRectLayer.render(this.focusRectContainer);
		//操作层
		this.operateLayer = new OperateLayer();
		//添加变换层
		this.transformLayer = new TransformLayer(this.operateLayer);
		this.transformLayer.dragEnabled = this.dragEnabled;
		this.transformLayer.render(this.transformContainer);
		this.transformContainer.addEventListener('mousedown', this.contextMenuHanlder);
		this.transformContainer.addEventListener('mouseup', this.contextMenuHanlder);
		//拖拽过程容器识别
		this.autoMarkLayer = new AutoMarkLayer(this.operateLayer, this.focusRectLayer, container);



		//添加吸附器
		this.adsorber = new Absorber();
		this.adsorber.render(this.absorbContainer);
		this.adsorber.focusRectLayer = this.focusRectLayer;
		this.adsorber.enabled = false;//默认不开启吸附
		//构建标尺
		this.hRuler = new Ruler(Ruler.TYPE_HORIZONTAL);
		this.hRuler.render(this.hRulerContainer);
		this.hRuler.focusRectLayer = this.focusRectLayer;
		this.vRuler = new Ruler(Ruler.TYPE_VERTICAL);
		this.vRuler.render(this.vRulerContainer);
		this.vRuler.focusRectLayer = this.focusRectLayer;
		//构建网格
		this.pixGrid = new PixGrid();
		this.pixGrid.render(this.gridContainer);
		this.pixGrid.focusRectLayer = this.focusRectLayer;
		this.pixGrid.explicityGridSize = NaN;//不启动网格
		//添加吸附线数据提供者
		this.adsorber.addLineProvieder(this.focusRectLayer);
		this.adsorber.addLineProvieder(this.pixGrid);
		//启动拖拽工作器
		this.dragWorker = new DragWorker();
		this.dragWorker.init(this.focusRectLayer, container, rootContianer, clipboardService);
	}
	/**
	 * 吸附功能
	 */
	public get absorbAble(): boolean {
		if(!this.adsorber){
			return false;
		}
		return this.adsorber.enabled;
	}
	public set absorbAble(value: boolean) {
		if(this.adsorber){
			this.adsorber.enabled = value;
		}
	}
	/**
	 * 锁定图层移动
	 */
	public get lockGroup(): boolean {
		if(!this.autoMarkLayer){
			return false;
		}
		return !this.autoMarkLayer.autoMark;
	}
	public set lockGroup(value: boolean) {
		if(this.autoMarkLayer){
			this.autoMarkLayer.autoMark = !value;
		}
	}
	/**
	 * 提示
	 */
	public promptLockGroupTips(): void {
		this.autoMarkLayer.promptTips();
	}

	private _dragEnabled: boolean = false;
	public get dragEnabled(): boolean {
		return this._dragEnabled;
	}
	public set dragEnabled(value: boolean) {
		if (this._dragEnabled != value) {
			this._dragEnabled = value;
			if(this.transformLayer){
				this.transformLayer.dragEnabled = value;
			}
		}
	}	

	public getViewInfo(): { x: number, y: number, scale: number } {
		return this.focusRectLayer.getViewInfo();
	}
	private setuped: boolean = false;
	public setup(exmlModel: IExmlModel, exmlModelHelper: ExmlModelHelper, runtime: IRuntimeAPI): void {
		var viewInfo = this.focusRectLayer.getViewInfo();
		this.runtime = runtime;
		HtmlElementResizeHelper.watch(this.focusRectContainer);
		//添加节点映射层
		this.focusRectLayer.setup(exmlModel, exmlModelHelper, runtime);
		if (!this.setuped) {
			this.focusRectContainerSizeChange();
			this.focusRectLayer.fitScreen(1, true, false);
		} else if (viewInfo) {
			this.focusRectLayer.setViewTo(viewInfo);
		}

		this.transformLayer.focusRectLayer = this.focusRectLayer;
		//启动拖拽工作器
		this.dragWorker.setup(exmlModel, this.runtime);
		this.autoMarkLayer.setup(exmlModel);
		this.setuped = true;
	}
	public clearRuntime():void{
		if(this.runtime && this.runtime.runtimeRootContainer){
			this.runtime.runtimeRootContainer.removeChildren();
		}
	}

	public hideGrid(tween: boolean = false): void {
		TweenLite.killTweensOf(this);
		if (!tween) {
			this.gridAlpha = 0;
		} else {
			TweenLite.to(this, 0.3, { gridAlpha: 0 })
		}
	}
	public showGrid(tween: boolean = false): void {
		TweenLite.killTweensOf(this);
		if (!tween) {
			this.gridAlpha = 1;
		} else {
			TweenLite.to(this, 0.3, { gridAlpha: 1 })
		}
	}
	private _gridAlpha: number = 0;
	public get gridAlpha(): number {
		return this._gridAlpha;
	}
	public set gridAlpha(value: number) {
		this._gridAlpha = value;
		if (this.gridContainer) {
			this.gridContainer.style.opacity = this._gridAlpha + '';
		}
	}

	private gridContainer: HTMLElement;
	private absorbContainer: HTMLElement;
	private hRulerContainer: HTMLElement;
	private vRulerContainer: HTMLElement;
	private focusRectContainer: HTMLElement;
	public transformContainer: HTMLElement;
	private initView(): void {
		this.gridContainer = document.createElement('div');
		this.gridContainer.className = 'exmleditor-gridContainer';
		this.backgroundContainer.appendChild(this.gridContainer);
		this.setStyle(this.gridContainer);
		this.gridAlpha = this.gridAlpha;//刷新网格的透明度

		this.focusRectContainer = document.createElement('div');
		this.focusRectContainer.className = 'exmleditor-focusRectContainer';
		this.container.appendChild(this.focusRectContainer);
		this.setStyle(this.focusRectContainer);

		this.transformContainer = document.createElement('div');
		this.container.appendChild(this.transformContainer);
		this.setStyle(this.transformContainer);

		this.absorbContainer = document.createElement('div');
		this.container.appendChild(this.absorbContainer);
		this.setStyle(this.absorbContainer, '100%', '100%', false);

		this.hRulerContainer = document.createElement('div');
		this.container.appendChild(this.hRulerContainer);
		this.setStyle(this.hRulerContainer, '100%', '20px');

		this.vRulerContainer = document.createElement('div');
		this.container.appendChild(this.vRulerContainer);
		this.setStyle(this.vRulerContainer, '20px');
		this.updateEdiable();
	}
	private setStyle(element: HTMLElement, width?: string, heigth?: string, pointerEvents: boolean = true): void {
		element.style.position = 'absolute';
		element.style.width = width ? width : '100%';
		element.style.height = heigth ? heigth : '100%';
		element.style.overflow = 'hidden';
		element.style.top = '0px';
		element.style.left = '0px';
		if (!pointerEvents) {
			element.style.pointerEvents = 'none';
		}
	}
	private _visible: boolean = true;
	public set visible(v: boolean) {
		this._visible = v;
		if (this.focusRectContainer)
			this.transformContainer.hidden = this.gridContainer.hidden = !v;
	}
	public get visible(): boolean {
		return this._visible;
	}
	public dispose(): void {
		if (this.focusRectLayer) {
			// this.focusRectLayer.removeEventListener(FocusRectLayerEvent.VIEWCHANGED, this.cacheViewInfo, this);
			this.focusRectLayer.dispose();
		}
		if (this.transformLayer) {
			this.transformLayer.dispose();
			this.transformContainer.removeEventListener('mousedown', this.contextMenuHanlder);
			this.transformContainer.removeEventListener('mouseup', this.contextMenuHanlder);
		}
		if (this.operateLayer) {
			this.operateLayer.dispose();
		}
		if (this.adsorber) { this.adsorber.dispose(); }
		if (this.hRuler) { this.hRuler.dispose(); };
		if (this.vRuler) { this.vRuler.dispose(); };
		if (this.pixGrid) { this.pixGrid.dispose(); };
		if (this.focusRectContainer) {
			HtmlElementResizeHelper.unWatch(this.focusRectContainer);
		}
		if (this.container) {
			for (let i: number = this.container.children.length - 1; i >= 0; i--) {
				this.container.removeChild(this.container.children[i]);
			}
		}
		if (this.dragWorker) {
			this.dragWorker.disopose();
		}
	}
	private startX: number;
	private startY: number;

	private contextMenuHanlder = (e: MouseEvent) => {
		if (!this.runtime) {
			return;
		}
		if (e.button === 2) {
			switch (e.type) {
				case 'mousedown':
					this.startX = e.clientX;
					this.startY = e.clientY;
					break;
				case 'mouseup':
					if (Math.abs(this.startX - e.clientX) < 2 && Math.abs(this.startY - e.clientY) < 2) {
						this.dispatchEvent(new Event('onContextMenu'))
					}
					this.startX = this.startY = NaN;
					break;
			}
		}
	}
	public notifyMouseEvent = (e) => {
		if (!this.runtime) {
			return;
		}
		if (this.focusRectLayer) {
			//将捕获阶段的鼠标事件转交给节点映射层处理
			this.focusRectLayer.notifyMouseEvent(e);
		}
	}
	private focusRectContainerSizeChange() {
		if (!this.runtime) {
			return;
		}
		var egretPlayer = this.runtime.egretPlayer;
		(<any>egretPlayer).getBoundingClientRect = () => {
			return { x: 0, y: 0, width: this.focusRectContainer.offsetWidth, height: this.focusRectContainer.offsetHeight };
		};
		var egretPlayerTmp = egretPlayer['egret-player'];
		egretPlayerTmp.updateScreenSize();
	}
	// private cacheViewInfo(e): void {
	// 	this.viewInfo = this.focusRectLayer.getViewInfo();
	// }
	private subEditorList: Array<{ editor: ExmlEditor, node: INode }> = [];
	public addSubViewAdapter(editor: ExmlEditor, node: INode) {
		this.subEditorList.push({ editor: editor, node: node });
		if (this.subEditorList.length === 1) {
			this.focusRectLayer.egretContentHost.addEventListener(EgretContentHostEvent.DISPLAYCHANGE, this.contentHostDisplayChangeHandle, this);
			this.contentHostDisplayChangeHandle();
		}
	}
	private contentHostDisplayChangeHandle = (): void => {
		for (let i: number = 0; i < this.subEditorList.length; i++) {
			let node = this.subEditorList[i].node;
			let glboalP: Point = MatrixUtil.localToGlobalForEgret(node.getInstance(), new Point());
			let localP: Point = MatrixUtil.globalToLocal(this.transformContainer, glboalP);
			this.subEditorList[i].editor.focusRectLayer.setViewTo({ x: localP.x, y: localP.y, scale: this.focusRectLayer.scale });
		}
	}
	public removeSubViewAdapter(editor: ExmlEditor, node: INode) {
		for (let i: number = 0; i < this.subEditorList.length; i++) {
			if (this.subEditorList[i].node === node) {
				this.subEditorList.splice(i, 1);
				break;
			}
		}
		if (this.subEditorList.length === 0) {
			this.focusRectLayer.egretContentHost.removeEventListener(EgretContentHostEvent.DISPLAYCHANGE, this.contentHostDisplayChangeHandle, this);
		}
	}
}