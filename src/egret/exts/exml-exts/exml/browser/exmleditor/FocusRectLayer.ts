import { Event, EventDispatcher } from './EventDispatcher';
import { IP9TTarget } from './t9transformer/interfaces/IP9TTarget';
import { MatrixUtil } from './t9transformer/util/MatrixUtil';
import { P9TTargetEvent } from './t9transformer/events/P9TTargetEvent';
import { EgretContentHost, EgretContentHostEvent } from './EgretContentHost';
import { HtmlElementResizeHelper } from './HtmlElementResizeHelper';
import { IAbosrbLineProvider } from "./absorb/Absorber";
import { AbsorbLine, AbsorbLineType } from "./absorb/AbsorbLine";
import { Matrix } from './data/Matrix';
import { Rectangle } from './data/Rectangle';
import { Point } from './data/Point';
import { IRender } from './IRender';
import { IRuntimeAPI } from '../../runtime/runtime';
import { IDisposable } from 'vs/base/common/lifecycle';
import { NodeAddedEvent, NodeRemovedEvent, INode, IValue } from '../../common/exml/treeNodes';
import { ExmlModelHelper } from '../../common/exml/helpers';
import { SelectedListChangedEvent, IExmlModel } from '../../common/exml/models';
import { EContainer } from '../../common/exml/treeNodesImpls';
import { TweenLite } from "gsap";
import { Point2D, expandPolygon } from './utils/polygonUtils';
import { isMacintosh } from 'egret/base/common/platform';
import { Emitter, Event as VSEvent } from 'egret/base/common/event';



export class FocusRectLayerEvent extends Event {
	/**选择发生变化 */
	public static SELECTCAHNGED: string = 'selectchanged';
	/**焦点矩形框添加 data:FocusRectExt*/
	public static FOUCSRECT_ADDED: string = 'focusrect_added';
	/**焦点矩形框删除 data:FocusRectExt*/
	public static FOUCSRECT_REMOVED: string = 'focusrect_removed';
	/**焦点矩形框更新 data:FocusRectExt*/
	public static FOUCSRECT_UPDATED: string = 'focusrect_updated';
	/**视图发生变化，移动、缩放视图后会触发此事件 */
	public static VIEWCHANGED: string = 'viewchanged';
	/**用户键盘事件 */
	public static USER_KEYBOARDEVENT: string = 'user_keyboardevent';
	constructor(type: string, data?: any) {
		super(type, data);
	}
}
/**
 * 焦点层
 */
export class FocusRectLayer extends EventDispatcher implements IAbosrbLineProvider {
	public egretContentHost: EgretContentHost;
	private egretSprite;

	private _onScaleChanged: Emitter<number>;

	/**
	 * egretContentHost:舞台内容承载对象，此对象紧接于stage，
	 * 编辑器中游戏场景的所有可视元素都是挂在此对象之下，（用来刷新焦点框）
	 */
	constructor() {
		super();
		this._onScaleChanged = new Emitter<number>();
	}

	public get onScaleChanged(): VSEvent<number> {
		return this._onScaleChanged.event;
	}

	private container: HTMLElement;

	//视图代理焦点对象，
	private viewAdapterFocusRect: FocusRect;
	//根焦点对象
	private rootFocusRect: FocusRectExt;

	private stageShadowDisplay: ShadowDisplay;
	public render(container: HTMLElement): void {

		this.container = container;
		this.container.style.opacity = this._opacity + '';

		this.viewAdapterFocusRect = new FocusRect(container, false);
		this.viewAdapterFocusRect.render(container);
		this.rootFocusRect = new FocusRectExt(container);
		this.viewAdapterFocusRect.addFocusRect(this.rootFocusRect);
		HtmlElementResizeHelper.watch(container);


		this.stageShadowDisplay = new ShadowDisplay();
		this.stageShadowDisplay.render(this.container);
	}

	/**
	 * 获取容器
	 */
	public get rootContainer(): HTMLElement {
		return this.container;
	}

	public hide(): void {
		if (this.viewAdapterFocusRect) {
			this.viewAdapterFocusRect.hide();
		}
	}

	public show(): void {
		if (this.viewAdapterFocusRect) {
			this.viewAdapterFocusRect.show();
		}
	}


	private exmlModel: IExmlModel;
	private exmlModelHelper: ExmlModelHelper;
	private runtime: IRuntimeAPI;
	public setup(exmlModel: IExmlModel, exmlModelHelper: ExmlModelHelper, runtime: IRuntimeAPI) {
		this.detachEventListener();
		this.exmlModel = exmlModel;
		this.exmlModelHelper = exmlModelHelper;
		this.runtime = runtime;
		this.insertEgretContentAdapter();
		this.attachEventListener();
		this.refresh();
	}
	/**获取所有选中的焦点矩形 */
	public getAllSelectedFocusRect(): FocusRectExt[] {
		//犹豫种种原因，选中的数据并不代表对应的焦点矩形就可被选中，比如子父级关系的数据
		//操作层会认为此方法返回的数据一定是可以被部署九点变换框的数据
		let allFocusRect: FocusRectExt[] = [];
		this.getAllChildFcousRect(this.getRootFocusRect(), allFocusRect);
		allFocusRect.push(this.getRootFocusRect());
		let allNode = this.exmlModel.getSelectedNodes();
		let selectedList = [];
		for (let k: number = 0; k < allNode.length; k++) {
			let node = allNode[k];
			b: for (let i: number = 0; i < allFocusRect.length; i++) {
				if (allFocusRect[i].targetNode === node && allFocusRect[i].canSelect) {
					selectedList.push(allFocusRect[i]);
					break b;
				}
			}
		}
		selectedList = this.filterSelected(selectedList);
		return selectedList;
	}
	/**设置选中 */
	public setSelected(list: FocusRectExt[]): void {
		let selectNode: INode[] = [];
		for (var i = 0; i < list.length; i++) {
			var rect = list[i];
			if (rect && rect.targetNode) {
				selectNode.push(rect.targetNode);
			}
		}
		this.exmlModel.setIgnoreSelectionChange(true);
		this.exmlModelHelper.select(selectNode);
		this.exmlModel.setIgnoreSelectionChange(false);
	}
	//筛选出列表中的顶级对象
	private filterSelected(list: FocusRectExt[]): FocusRectExt[] {
		let newList = [];
		let alreadyCheckList = [];
		for (let i: number = 0; i < list.length; i++) {
			let target = list[i];
			let theTop: FocusRectExt;
			b: while (target) {
				if (alreadyCheckList.indexOf(target) !== -1) {
					theTop = null;
					break b;
				}
				if (list.indexOf(target) !== -1) {
					theTop = target;
					alreadyCheckList.push(target);
				}
				target = target.parentFocusRect as FocusRectExt;
			}
			if (theTop) {
				newList.push(theTop);
			}
		}
		return newList;
	}
	private insertEgretContentAdapter(): void {
		let containers = [];
		let stage: egret.Stage = this.exmlModel.getRootElement().stage;
		this.egretSprite = new this.runtime.egret.Sprite();
		this.egretSprite['__paperSrpite'] = true;
		if (stage.getChildAt(0)['__paperSrpite']) {
			for (let i: number = (stage.getChildAt(0) as egret.DisplayObjectContainer).numChildren - 1; i >= 0; i--) {
				containers[i] = (stage.getChildAt(0) as egret.DisplayObjectContainer).getChildAt(i);
			}
		} else {
			for (let i: number = stage.numChildren - 1; i >= 0; i--) {
				containers[i] = stage.getChildAt(i);
			}
		}
		stage.removeChildren();
		//向舞台添加内容代理对象
		stage.scaleMode = this.runtime.egret.StageScaleMode.NO_SCALE;//调整缩放模式
		containers.forEach(value => {
			this.egretSprite.addChild(value);
		});
		stage.addChild(this.egretSprite);
		this.egretContentHost = new EgretContentHost();
		this.egretContentHost.setTarget(this.egretSprite);
	}
	private listenerList: IDisposable[] = [];
	private attachEventListener(): void {
		if (this.exmlModel) {
			this.egretContentHost.addEventListener(EgretContentHostEvent.DISPLAYCHANGE, this.contentHostDisplayChangeHandle, this);
			this.listenerList.push(this.exmlModel.onNodeAdded(this.nodeAdded, this));
			this.listenerList.push(this.exmlModel.onNodeRemoved(this.nodeRemoved, this));
			this.listenerList.push(this.exmlModel.onSelectedListChanged(this.selectedChanged, this));
		}
	}
	private detachEventListener(): void {
		if (this.exmlModel) {
			this.egretContentHost.removeEventListener(EgretContentHostEvent.DISPLAYCHANGE, this.contentHostDisplayChangeHandle, this);
			this.listenerList.forEach(v => { v.dispose() });
			this.listenerList = [];
		}
	}
	//内容承载对象的展现发生变化
	private contentHostDisplayChangeHandle(e: egret.Event): void {
		this.updateViewAdapter();
	}
	//添加了一个节点
	private nodeAdded(e: NodeAddedEvent): void {
		var target: INode = e.node as INode;
		let parentFocusRect: FocusRect = this.getFocusRectWidthNode(target.getParent());
		if (parentFocusRect) {
			let focusRect: FocusRect = this.getOneFocusRect();
			focusRect.targetNode = target;
			parentFocusRect.addFocusRect(focusRect);
			this.dispatchEvent(new Event(FocusRectLayerEvent.FOUCSRECT_ADDED, focusRect));
		}
	}
	//删除了一个节点
	private nodeRemoved(e: NodeRemovedEvent): void {
		let target: INode = e.node as INode;
		let focusRect: FocusRect = this.getFocusRectWidthNode(target);
		if (focusRect) {
			focusRect.removeFromParentFocusRect();
			this.dispatchEvent(new Event(FocusRectLayerEvent.FOUCSRECT_REMOVED, focusRect));
		}
	}
	//选中列表发生变化
	private selectedChanged(e: SelectedListChangedEvent): void {
		this.dispatchEvent(new FocusRectLayerEvent(FocusRectLayerEvent.SELECTCAHNGED));
	}
	private _scale: number = 1;
	/**当前视图缩放值 */
	public get scale(): number {
		return this._scale;
	}

	public get stageHeight(): number {
		return this.runtime.runtimeRootContainer.contentHeight;
	}
	public get stageWidth(): number {
		return this.runtime.runtimeRootContainer.contentWidth;
	}

	public get viewHeight(): number {
		return this.container.parentElement.parentElement.clientHeight - 60;
	}
	public get viewWidth(): number {
		return this.container.parentElement.parentElement.clientWidth - 60;
	}

	/**适配 */
	public fitScreen(scale: number = NaN, toCenter: boolean = true, tween: boolean = false, strict: boolean = false): void {
		if (this.container && this.runtime) {
			var curScale = this.scale;
			let stageHeight: number = this.runtime.runtimeRootContainer.contentHeight;
			let stageWidth: number = this.runtime.runtimeRootContainer.contentWidth;

			if (isNaN(scale)) {
				//如果舞台尺寸大于视图尺寸则需要进行一下缩放
				if (stageHeight > this.viewHeight || stageWidth > this.viewWidth || strict) {
					if (stageHeight / this.viewHeight > stageWidth / this.viewWidth) {
						curScale = this.viewHeight / stageHeight;
					}
					else {
						curScale = this.viewWidth / stageWidth;
					}
				}
			} else {
				curScale = scale;
			}
			if (toCenter) {
				stageHeight *= curScale;
				stageWidth *= curScale;
				this.movePoint.x = (this.viewWidth - stageWidth) / 2 + 40;
				this.movePoint.y = (this.viewHeight - stageHeight) / 2 + 40;
				this.egretContentHost.setProperty(
					(this.viewWidth - stageWidth) / 2 + 40,
					(this.viewHeight - stageHeight) / 2 + 40,
					curScale,
					curScale, tween);
			} else {
				var offsetX = this.container.parentElement.parentElement.clientWidth / 2 - this.egretContentHost.getTarget().x;
				var offsetY = this.container.parentElement.parentElement.clientHeight / 2 - this.egretContentHost.getTarget().y;
				var newOffsetX = offsetX * curScale / this.scale;
				var newOffsetY = offsetY * curScale / this.scale;
				var targetX = this.egretContentHost.getTarget().x - (newOffsetX - offsetX);
				var targetY = this.egretContentHost.getTarget().y - (newOffsetY - offsetY);
				this.movePoint.x = targetX;
				this.movePoint.y = targetY;
				this.egretContentHost.setProperty(
					targetX,
					targetY,
					curScale,
					curScale, tween);
			}
		}
	}

	/**适配 */
	public resizeTo(width: number, height: number, tween: boolean = false): void {
		if (this.container) {
			var scaleX = width / this.runtime.runtimeRootContainer.contentWidth;
			var scaleY = height / this.runtime.runtimeRootContainer.contentHeight;
			var targetScale = Math.min(scaleX, scaleY);

			var curScale = this.scale;
			let stageHeight: number = this.runtime.runtimeRootContainer.contentHeight;
			let stageWidth: number = this.runtime.runtimeRootContainer.contentWidth;

			if (isNaN(targetScale)) {
				//如果舞台尺寸大于视图尺寸则需要进行一下缩放
				if (stageHeight > this.viewHeight || stageWidth > this.viewWidth) {
					if (stageHeight / this.viewHeight > stageWidth / this.viewWidth) {
						curScale = this.viewHeight / stageHeight;
					}
					else {
						curScale = this.viewWidth / stageWidth;
					}
				}
			} else {
				curScale = targetScale;
			}

			stageHeight *= curScale;
			stageWidth *= curScale;
			this.egretContentHost.setProperty(
				(this.viewWidth - stageWidth) / 2 + 40,
				(this.viewHeight - stageHeight) / 2 + 40,
				curScale,
				curScale, tween);
		}
	}

	private refreshPreview(): void {
		if (this.previewed) {
			this.adjustPreview(this.autoContentCache, this.contentWidthCache, this.contentHeightCache, this.screenWidthCache, this.screenHeightCache, this.scaleModeCache, this.screenScaleCache);
		}
	}
	private _opacity: number = 1;
	public get opacity(): number {
		if (this.container) {
			return parseFloat(this.container.style.opacity);
		}
		return this._opacity;
	}
	public set opacity(value: number) {
		this._opacity = value;
		this.container.style.opacity = value + '';
	}

	private rootElementExplicitWidthCache = 0;
	private rootElementExplicitHeightCache = 0;
	private rootElementWidthCache = 0;
	private rootElementHeightCache = 0;
	/**
	 * 激活预览模式
	 * @param autoContent 是否自动适应内容大小
	 * @param contentWidth 内容宽
	 * @param contentHeight 内容高
	 * @param screenWidth 屏幕宽
	 * @param screenHeight 屏幕高
	 * @param scaleMode 缩放模式
	 * @param scale 缩放比例
	 * @param tween 是否缓动
	 * @param duration 缓动时长
	 */
	public enablePreview(autoContent: boolean, contentWidth: number, contentHeight: number, screenWidth: number, screenHeight: number, scaleMode: string, scale: number, tween: boolean = false, duration: number = 0.3): void {
		if (!this.exmlModel || !this.exmlModel.getRootElement()) {
			return;
		}
		var rootElement = this.exmlModel.getRootElement();
		this.rootElementExplicitWidthCache = rootElement.explicitWidth;
		this.rootElementExplicitHeightCache = rootElement.explicitHeight;
		this.rootElementWidthCache = rootElement.width;
		this.rootElementHeightCache = rootElement.height;

		this.adjustPreview(autoContent, contentWidth, contentHeight, screenWidth, screenHeight, scaleMode, scale, tween, duration);
	}

	private autoContentCache: boolean;
	private contentWidthCache: number = 0;
	private contentHeightCache: number = 0;
	private screenWidthCache: number = 0;
	private screenHeightCache: number = 0;
	private scaleModeCache: string = '';
	private screenScaleCache: number = 0;
	private previewed: boolean = false;

	private previewMask = null;

	/**
	 * 调整预览模式
	 * @param autoContent 是否自动适应内容大小
	 * @param contentWidth 内容宽
	 * @param contentHeight 内容高
	 * @param screenWidth 屏幕宽
	 * @param screenHeight 屏幕高
	 * @param scaleMode 缩放模式
	 * @param screenScale 缩放比例
	 * @param tween 是否缓动
	 * @param duration 缓动时长
	 */
	public adjustPreview(autoContent: boolean, contentWidth: number, contentHeight: number, screenWidth: number, screenHeight: number, scaleMode: string, screenScale: number, tween: boolean = false, duration: number = 0.3): void {
		this.autoContentCache = autoContent;
		this.contentWidthCache = contentWidth;
		this.contentHeightCache = contentHeight;
		this.screenWidthCache = screenWidth;
		this.screenHeightCache = screenHeight;
		this.scaleModeCache = scaleMode;
		this.screenScaleCache = screenScale;
		this.previewed = true;

		if (!this.exmlModel || !this.exmlModel.getRootElement() || !this.egretSprite) {
			return;
		}
		//调整画布
		var rootElement = this.exmlModel.getRootElement();

		if (autoContent) {
			contentWidth = this.rootElementWidthCache;
			contentHeight = this.rootElementHeightCache;
		}
		if (!screenWidth || !screenHeight) {
			screenWidth = contentWidth;
			screenHeight = contentHeight;
		}

		this.screenWidthCache = screenWidth;
		this.screenHeightCache = screenHeight;

		var stageDisplaySize: {
			stageWidth: number,
			stageHeight: number,
			displayWidth: number,
			displayHeight: number
		} = this.runtime.egret.sys.screenAdapter.calculateStageSize(scaleMode, screenWidth, screenHeight, contentWidth, contentHeight);

		var scaleX = stageDisplaySize.displayWidth / stageDisplaySize.stageWidth;
		var scaleY = stageDisplaySize.displayHeight / stageDisplaySize.stageHeight;
		var offsetX: number = (screenWidth - stageDisplaySize.displayWidth) / 2;
		var offsetY: number = (screenHeight - stageDisplaySize.displayHeight) / 2;

		if (!this.previewMask) {
			this.previewMask = new this.runtime.egret.Rectangle(0, 0, this.egretSprite.width, this.egretSprite.height);
		}

		this.egretSprite.mask = this.previewMask;
		TweenLite.killTweensOf(rootElement);
		TweenLite.killTweensOf(this.previewMask);
		TweenLite.killTweensOf(this.stageShadowDisplay);


		if (tween) {
			TweenLite.to(this, duration, { opacity: 0 });
			TweenLite.to(rootElement, duration, {
				width: stageDisplaySize.stageWidth,
				height: stageDisplaySize.stageHeight,
				x: offsetX,
				y: offsetY,
				scaleX: scaleX,
				scaleY: scaleY
			});
			TweenLite.to(this.previewMask, duration, {
				width: screenWidth,
				height: screenHeight,
				onUpdate: () => {
					this.egretSprite.mask = this.previewMask;
				}, onComplete: () => {
					this.previewMask.width = screenWidth;
					this.previewMask.height = screenHeight;
					this.egretSprite.mask = this.previewMask;
				}
			})
			TweenLite.to(this.stageShadowDisplay, duration, {
				opacity: 1,
				onUpdate: () => {
					this.egretSprite.graphics.clear();
					this.egretSprite.graphics.beginFill(0xffffff, this.stageShadowDisplay.opacity);
					this.egretSprite.graphics.drawRect(0, 0, this.previewMask.width, this.previewMask.height);
					this.egretSprite.graphics.endFill();
				}, onComplete: () => {
					this.egretSprite.graphics.clear();
					this.egretSprite.graphics.beginFill(0xffffff, 1);
					this.egretSprite.graphics.drawRect(0, 0, screenWidth, screenHeight);
					this.egretSprite.graphics.endFill();
				}
			})
		} else {
			this.opacity = 0;
			rootElement.width = stageDisplaySize.stageWidth;
			rootElement.height = stageDisplaySize.stageHeight;
			rootElement.x = offsetX;
			rootElement.y = offsetY
			rootElement.scaleX = scaleX;
			rootElement.scaleY = scaleY;
			this.stageShadowDisplay.opacity = 1;
			this.egretSprite.graphics.clear();
			this.egretSprite.graphics.beginFill(0xffffff, 1);
			this.egretSprite.graphics.drawRect(0, 0, screenWidth, screenHeight);
			this.egretSprite.graphics.endFill();
			this.previewMask.width = screenWidth;
			this.previewMask.height = screenHeight;
			this.egretSprite.mask = this.previewMask;
		}

		//调整视口
		if (!screenScale) {
			var scaleX = this.viewWidth / screenWidth;
			var scaleY = this.viewHeight / screenHeight;
			screenScale = Math.min(scaleX, scaleY);
			if (screenScale > 1) {
				screenScale = 1;
			}
		}
		let stageHeight: number = screenHeight;
		let stageWidth: number = screenWidth;
		stageHeight *= screenScale;
		stageWidth *= screenScale;
		this.egretContentHost.setProperty(
			(this.viewWidth - stageWidth) / 2 + 40,
			(this.viewHeight - stageHeight) / 2 + 40,
			screenScale,
			screenScale, true);

	}
	/**
	 * 失活预览模式
	 */
	public disablePreview(tween: boolean = false, duration: number = 0.3): void {
		this.previewed = false;
		if (!this.exmlModel || !this.exmlModel.getRootElement() || !this.egretSprite) {
			return;
		}
		var rootElement = this.exmlModel.getRootElement();


		TweenLite.killTweensOf(rootElement);
		TweenLite.killTweensOf(this.previewMask);
		TweenLite.killTweensOf(this.stageShadowDisplay);
		if (tween) {
			TweenLite.to(this, duration, { opacity: 1 });
			TweenLite.to(rootElement, duration, {
				width: this.rootElementWidthCache,
				height: this.rootElementHeightCache,
				scaleX: 1,
				scaleY: 1,
				x: 0,
				y: 0,
				onComplete: () => {
					rootElement.width = this.rootElementExplicitWidthCache;
					rootElement.height = this.rootElementExplicitHeightCache;
					rootElement.scaleX = 1;
					rootElement.scaleY = 1;
					rootElement.x = 0;
					rootElement.y = 0;
				}
			});
			TweenLite.to(this.previewMask, duration, {
				width: this.rootElementWidthCache,
				height: this.rootElementHeightCache,
				onUpdate: () => {
					this.egretSprite.mask = this.previewMask;
				},
				onComplete: () => {
					this.egretSprite.mask = null;
				}
			});

			TweenLite.to(this.stageShadowDisplay, duration, {
				opacity: 0,
				onUpdate: () => {
					this.egretSprite.graphics.clear();
					this.egretSprite.graphics.beginFill(0xffffff, this.stageShadowDisplay.opacity);
					this.egretSprite.graphics.drawRect(0, 0, this.previewMask.width, this.previewMask.height);
					this.egretSprite.graphics.endFill();
				}, onComplete: () => {
					this.egretSprite.graphics.clear();
				}
			})
		} else {
			this.opacity = 1;
			this.egretSprite.mask = null;
			rootElement.width = this.rootElementExplicitWidthCache;
			rootElement.height = this.rootElementExplicitHeightCache;
			rootElement.scaleX = 1;
			rootElement.scaleY = 1;
			rootElement.x = 0;
			rootElement.y = 0;
			this.stageShadowDisplay.opacity = 0;
			this.egretSprite.graphics.clear();
		}
	}


	/**居中 */
	public centerScreen(tween: boolean = false): void {
		if (this.container) {
			let stageHeight: number = this.runtime.runtimeRootContainer.contentHeight * this.scale;
			let stageWidth: number = this.runtime.runtimeRootContainer.contentWidth * this.scale;
			let viewWidth: number = this.container.parentElement.parentElement.clientWidth;
			let viewHeight: number = this.container.parentElement.parentElement.clientHeight;
			var property = this.egretContentHost.getProperty();
			if (stageWidth < viewWidth) {
				this.egretContentHost.setProperty(
					(viewWidth - stageWidth) / 2,
					property.y,
					property.scaleX,
					property.scaleY, tween);
			}
			if (stageHeight < viewHeight) {
				this.egretContentHost.setProperty(
					property.x,
					(viewHeight - stageHeight) / 2,
					property.scaleX,
					property.scaleY, tween);
			}
		}
	}
	/**定位 */
	public locateToNode(target: INode, tween: boolean = false): void {
		let targetRect: FocusRectExt;
		let rects: FocusRectExt[] = [];
		this.getAllChildFcousRect(this.getRootFocusRect(), rects);
		for (let i: number = 0; i < rects.length; i++) {
			if (rects[i].targetNode === target) {
				targetRect = rects[i];
				break;
			}
		}
		if (targetRect) {
			let viewWidth: number = this.container.clientWidth;
			let viewHeight: number = this.container.clientHeight;
			let bounds = this.getFocusRectBounds(targetRect);
			let p = MatrixUtil.localToGlobal(this.container, new Point(viewWidth / 2, viewHeight / 2));
			let scale = 0;
			let scaleSize = 200;
			if (bounds.width === 0 || bounds.height === 0) {
				scale = 1;
			}
			else if (scaleSize - bounds.height > scaleSize - bounds.width) {
				scale = scaleSize / bounds.width;
			}
			else {
				scale = scaleSize / bounds.height;
			}
			let p2 = MatrixUtil.localToGlobalForEgret(this.egretContentHost.getTarget(), new Point(0, 0));
			let offsetX = p.x - p2.x - (bounds.width * scale / 2 + (bounds.x - p2.x) * scale);
			let offsetY = p.y - p2.y - (bounds.height * scale / 2 + (bounds.y - p2.y) * scale);
			var curScale = this.scale * scale;
			this.egretContentHost.setProperty(
				this.egretContentHost.getTarget().x + offsetX,
				this.egretContentHost.getTarget().y + offsetY,
				curScale,
				curScale, tween);
		};
	}
	//获取视图信息
	public getViewInfo(): { x: number, y: number, scale: number } {
		if (!this.egretContentHost) {
			return null;
		}
		var property = this.egretContentHost.getProperty();
		if (!property) {
			return null;
		}
		return { x: property.x, y: property.y, scale: property.scaleX };
	}
	//设置视图
	public setViewTo(to: { x: number, y: number, scale: number }, tween: boolean = false, duration: number = 0.3): void {
		this.egretContentHost.setProperty(to.x, to.y, to.scale, to.scale, tween, duration);
	}
	public notifyKeyboradEvent(e: KeyboardEvent): void {
		this.dispatchEvent(new Event(FocusRectLayerEvent.USER_KEYBOARDEVENT, e));
	}

	public notifyMouseEvent = (e) => {
		let mouseEvent: MouseEvent = e;
		switch (e.type) {
			case 'mousedown':
				if (e.button == 0) {
					this.mouseDownHandler(e);//left
				} else if (e.button == 1) {
					this.middleMouseDownHandler(e);//middle
				}
				break;
			case 'mousemove':
				this.mouseMoveHandler(e);
				break;
			case 'mouseup':
				if (e.button == 0) {
					this.mouseUpHandler(e);//left
				} else if (e.button == 1) {
					this.middleMouseUpHandler(e);//middle
				}
				this.detachMouseEvent();
				break;
			case 'mousewheel':
				let event: MouseWheelEvent = e;
				if (event.ctrlKey) {
					if (isMacintosh) {
						this.gestureZoom_handler(event);
					} else {
						this.mouseWheelHandler(event);
					}
				} else {
					if (event.deltaY % 1 == 0 && isMacintosh) {
						this.gesturePan_handler(event);
					} else {
						this.mouseWheelHandler(event);
					}
				}
				if (this.runtime) {
					this.runtime.resumeOnceGlobal();
				}
				break;
		}
	};

	private _dragEnabled: boolean = false;
	public get dragEnabled(): boolean {
		return this._dragEnabled;
	}
	public set dragEnabled(value: boolean) {
		if (this._dragEnabled != value) {
			this._dragEnabled = value;
			this.updateCursor();
		}
	}

	private targetStartPos: Point = new Point();
	private mousePos: Point = new Point();
	private speed: Point = new Point();

	private _movePoint: Point;
	private get movePoint(): Point {
		if (!this._movePoint) {
			this._movePoint = new Point(this.egretContentHost.getTarget().x, this.egretContentHost.getTarget().y);
		}
		return this._movePoint;
	}
	private updateTargetPos(): void {
		this.setViewTo({ x: Math.round(this.movePoint.x), y: Math.round(this.movePoint.y), scale: this.egretContentHost.getTarget().scaleX })
	}

	private mouseDownHandler(event: MouseEvent): void {
		if (this.dragEnabled) {
			this.startMove(event);
		}
	}
	private middleMouseDownHandler(event: MouseEvent): void {
		this.startMove(event);
	}
	private moving: boolean = false;
	private startMove(event: MouseEvent): void {
		this.attachMouseEvent();
		event.preventDefault();
		event.stopPropagation();
		this.targetStartPos.x = event.clientX - this.egretContentHost.getTarget().x;
		this.targetStartPos.y = event.clientY - this.egretContentHost.getTarget().y;
		this.mousePos.x = event.clientX;
		this.mousePos.y = event.clientY;
		// this.stopEase();
		this.moving = true;
		this.updateCursor();
	}

	private mouseMoveHandler(event: MouseEvent): void {
		this.speed.x = event.clientX - this.mousePos.x;
		this.speed.y = event.clientY - this.mousePos.y;
		this.movePoint.x = event.clientX - this.targetStartPos.x;
		this.movePoint.y = event.clientY - this.targetStartPos.y;
		this.updateTargetPos();
		this.mousePos.x = event.clientX;
		this.mousePos.y = event.clientY;
	}
	private mouseUpHandler(event: MouseEvent): void {
		this.stopMove(event);

	}
	private middleMouseUpHandler(event: MouseEvent): void {
		this.stopMove(event);
	}
	private stopMove(event: MouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
		// this.startEase();
		this.moving = false;
		this.updateCursor();
	}

	private mouseWheelHandler(event: MouseWheelEvent): void {
		var curScale = this.scale;
		var delta = event.deltaY;
		if (delta > 0) {
			delta = 1;
		} else if (delta < 0) {
			delta = -1;
		}
		delta = delta * (this.scale / 7);

		var targetScale = this.scale - delta;
		if (targetScale < 0.02) {
			targetScale = 0.02;
		}
		var offsetX = (event as any).layerX - this.egretContentHost.getTarget().x;
		var offsetY = (event as any).layerY - this.egretContentHost.getTarget().y;

		var newOffsetX = offsetX * targetScale / curScale;
		var newOffsetY = offsetY * targetScale / curScale;

		this.movePoint.x = this.egretContentHost.getTarget().x - (newOffsetX - offsetX);
		this.movePoint.y = this.egretContentHost.getTarget().y - (newOffsetY - offsetY);

		this.setViewTo({ x: this.movePoint.x, y: this.movePoint.y, scale: targetScale }, true, 0.1)
	}
	private gesturePan_handler(event: MouseWheelEvent): void {
		// this.stopEase();
		var offsetX = event.deltaX / 2;
		var offsetY = event.deltaY / 2;
		this.movePoint.x -= offsetX;
		this.movePoint.y -= offsetY;
		this.updateTargetPos();
	}
	private gestureZoom_handler(event: MouseWheelEvent): void {
		var curScale = this.scale;
		var delta = event.deltaY / 5;
		delta = delta * (this.scale / 5);

		var targetScale = this.scale - delta;
		if (targetScale < 0.02) {
			targetScale = 0.02;
		}

		var offsetX = (event as any).layerX - this.egretContentHost.getTarget().x;
		var offsetY = (event as any).layerY - this.egretContentHost.getTarget().y;

		var newOffsetX = offsetX * targetScale / curScale;
		var newOffsetY = offsetY * targetScale / curScale;

		this.movePoint.x = this.egretContentHost.getTarget().x - (newOffsetX - offsetX);
		this.movePoint.y = this.egretContentHost.getTarget().y - (newOffsetY - offsetY);

		this.setViewTo({ x: Math.round(this.movePoint.x), y: Math.round(this.movePoint.y), scale: targetScale }, true, 0.1)
	}

	// private easeTimeoutFlag = null
	// private easeIntervalFlag = null
	// private startEase(): void {
	// 	if (this.easeIntervalFlag) {
	// 		clearInterval(this.easeIntervalFlag);
	// 		this.easeIntervalFlag = null;
	// 	}
	// 	if (this.easeTimeoutFlag) {
	// 		clearTimeout(this.easeTimeoutFlag);
	// 		this.easeTimeoutFlag = null;
	// 	}
	// 	this.easeTimeoutFlag = setTimeout(() => {
	// 		this.easeIntervalFlag = setInterval(() => this.doEase(), 1000 / 60);
	// 	}, 1000 / 60);
	// }
	// private stopEase(): void {
	// 	if (this.easeIntervalFlag) {
	// 		clearInterval(this.easeIntervalFlag);
	// 		this.easeIntervalFlag = null;
	// 	}
	// 	if (this.easeTimeoutFlag) {
	// 		clearTimeout(this.easeTimeoutFlag);
	// 		this.easeTimeoutFlag = null;
	// 	}
	// }

	// private doEase(): void {
	// 	if (this.speed.x == 0 && this.speed.y == 0) {
	// 		return;
	// 	}
	// 	this.speed.x = this.speed.x / 1.10;
	// 	this.speed.y = this.speed.y / 1.10;
	// 	if (this.speed.y <= 0.1 && this.speed.y >= -0.1) {
	// 		this.speed.y = 0;
	// 	}
	// 	if (this.speed.x <= 0.1 && this.speed.x >= -0.1) {
	// 		this.speed.x = 0;
	// 	}
	// 	this.movePoint.x += this.speed.x;
	// 	this.movePoint.y += this.speed.y;
	// 	this.updateTargetPos();
	// 	if (this.speed.x == 0 && this.speed.y == 0) {
	// 		this.stopEase();
	// 	}
	// }

	private updateCursor(): void {
		if (this.dragEnabled || this.moving) {
			if (this.moving) {
				this.container.parentElement.style.cursor = `url(${"./resources/cursor/hand_close.svg"}),default`;
			} else {
				this.container.parentElement.style.cursor = `url(${"./resources/cursor/hand_open.svg"}),default`;
			}
		} else {
			this.container.parentElement.style.cursor = '';
		}
	}










	private attachMouseEvent(): void {
		document.addEventListener('mousemove', this.notifyMouseEvent, true);
		document.addEventListener('mouseup', this.notifyMouseEvent, true);
	}
	private detachMouseEvent(): void {
		document.removeEventListener('mousemove', this.notifyMouseEvent, true);
		document.removeEventListener('mouseup', this.notifyMouseEvent, true);
	}
	/**根据一个Node来获取对应的焦点对象 */
	private getFocusRectWidthNode(v: INode): FocusRectExt {
		var allFocusRects: Array<FocusRectExt> = [];
		this.getAllChildFcousRect(this.getRootFocusRect(), allFocusRects);
		allFocusRects.push(this.getRootFocusRect());
		for (var i: number = 0; i < allFocusRects.length; i++) {
			if (allFocusRects[i].targetNode === v) {
				return allFocusRects[i];
			}
		}
		return null;
	}

	/**获取一个焦点对象 */
	private getOneFocusRect(): FocusRectExt {
		return new FocusRectExt(this.container);
	}
	/**刷新焦点对象树 */
	private refresh(): void {
		this.updateViewAdapter();
		this.refreshPreview();
		this.getRootFocusRect().targetNode = this.exmlModel.getRootNode();
	}

	/**刷新视图代理 */
	private updateViewAdapter(): void {
		this._scale = this.egretContentHost.getTarget().scaleX;
		if (!Number.isFinite(this._scale)) {
			this._scale = 1;
		}
		this._onScaleChanged.fire(this._scale);

		let m: Matrix = this.egretContentHost.getTarget().matrix;
		this.viewAdapterFocusRect.root.style.transform = 'matrix(' + m.a + ',' + m.b + ',' + m.c + ',' + m.d + ',' + m.tx + ',' + m.ty + ')';
		if (this.previewMask) {
			this.stageShadowDisplay.x = m.tx;
			this.stageShadowDisplay.y = m.ty;
			this.stageShadowDisplay.width = this.previewMask.width * this.scale;
			this.stageShadowDisplay.height = this.previewMask.height * this.scale;
		}
		//TODO 这里刷新所有的显示框
		if (this.viewAdapterFocusRect) {
			this.viewAdapterFocusRect.refreshRectRender();
		}
		if (this.rootFocusRect) {
			this.rootFocusRect.refreshRectRender();
		}
		this.dispatchEvent(new Event(FocusRectLayerEvent.VIEWCHANGED, null));
	}


	/**获取某个焦点对象内部所有的焦点对象集合 */
	public getAllChildFcousRect(v: FocusRectExt, result: Array<FocusRectExt>): void {
		var childList: Array<FocusRect> = v.getChildFocusRects();
		for (var i: number = 0; i < childList.length; i++) {
			result.push(childList[i] as FocusRectExt);
			this.getAllChildFcousRect(childList[i] as FocusRectExt, result);
		}
	}
	/**获取根焦点对象 */
	public getRootFocusRect(): FocusRectExt {
		return this.rootFocusRect;
	}
	/**获取窗口区域内的所有可被选则的焦点对象
	 * (根据目标对象的AABB框来做判断.当目标区域的宽高大于1时如果[容器]的AABB框包含了目标区域则不被选中，此种设定是为了实现容器内框选.) */
	public getAllChildFocusRectWithWindowRange(range: Rectangle, includeRoot: boolean = false, mustContains: boolean = true): Array<FocusRectExt> {
		var focusRects: Array<FocusRectExt> = [];
		this.getAllChildFcousRect(this.getRootFocusRect(), focusRects);
		if (includeRoot) {
			focusRects.push(this.getRootFocusRect());
		}
		var result: Array<FocusRectExt> = [];
		for (var i: number = 0; i < focusRects.length; i++) {
			var rect: FocusRectExt = focusRects[i];
			if (rect.canSelect) {
				var stageBounds: Rectangle = this.getFocusRectBounds(rect);
				if (mustContains) {
					if (range.containsRect(stageBounds)) {
						result.push(rect);
					}
				} else {
					if (range.intersects(stageBounds)) {
						result.push(rect);
					}
				}
			}
		}
		return result;
	}
	/**获取焦点举行的AABB框 */
	public getFocusRectBounds(target: FocusRect): Rectangle {
		let globalMatrix: Matrix = MatrixUtil.getMatrixToWindow(target.root);
		var p1: Point = globalMatrix.transformPoint(0, 0);
		var p2: Point = globalMatrix.transformPoint(target.root.offsetWidth, 0);
		var p3: Point = globalMatrix.transformPoint(target.root.offsetWidth, target.root.offsetHeight);
		var p4: Point = globalMatrix.transformPoint(0, target.root.offsetHeight);
		var minx: number = p1.x;
		var maxx: number = p1.x;
		var miny: number = p1.y;
		var maxy: number = p1.y;
		[p2, p3, p4].forEach(element => {
			minx = Math.min(minx, element.x);
			maxx = Math.max(maxx, element.x);
			miny = Math.min(miny, element.y);
			maxy = Math.max(maxy, element.y);
		});
		var rect: Rectangle = new Rectangle(minx, miny, maxx - minx, maxy - miny);
		return rect;
	}
	/**
	 * 按视觉层次排序
	 */
	public sortForDisplay(list: Array<FocusRectExt>): void {
		if (list.length < 2) {
			return;
		}
		//生成每个对象的显示索引路径列表
		var displayPathList: { rect: FocusRectExt, path: number[] }[] = [];
		list.forEach(element => {
			let result: number[] = [];
			let currentRect = element;
			while (currentRect.parentFocusRect) {
				result.unshift(currentRect.parentFocusRect.getChildIndex(currentRect));
				currentRect = currentRect.parentFocusRect as FocusRectExt;
			}
			displayPathList.push({ rect: element, path: result });
		});
		function getPath(rect: FocusRectExt): number[] {
			for (let i: number = 0; i < displayPathList.length; i++) {
				if (displayPathList[i].rect === rect) {
					return displayPathList[i].path;
				}
			}
		}

		//冒泡排序法把视觉上最高的对象移动到列表的第一项
		var length: number = list.length - 1;
		while (length > 0) {
			for (var i: number = 0; i < length; i++) {
				var B: number[] = getPath(list[i + 1]);
				var A: number[] = getPath(list[i]);

				var needChangeIndex: boolean = false;
				var minLength: number = Math.min(A.length, B.length);
				let k: number = 0;
				b: for (k; k < minLength; k++) {
					if (A[k] < B[k]) {
						needChangeIndex = true;
						break b;
					}
				}
				//如果查到头没有发现需要交换索引那么存在一种情况，就是A、B之前是父子关系，那么此时谁的索引序列长谁的显示层级就越高
				if (k === minLength && !needChangeIndex) {
					if (A.length < B.length) {
						needChangeIndex = true;
					}
				}
				if (needChangeIndex) {
					var tmpv: any = list[i];
					list[i] = list[i + 1];
					list[i + 1] = tmpv;
				}
			}
			length--;
		}
	}
	public getAbsorbLines(): AbsorbLine[] {
		let focusRectList: FocusRectExt[] = [];
		this.getAllChildFcousRect(this.getRootFocusRect(), focusRectList);

		let excludeList: FocusRectExt[] = [];//排除列表
		this.exmlModel.getSelectedNodes().forEach(node => {
			let targetRect;
			for (let i: number = 0; i < focusRectList.length; i++) {
				if (focusRectList[i].targetNode === node) {
					targetRect = focusRectList[i];
					break;
				}
			}
			if (targetRect) {
				let rects = [];
				this.getAllChildFcousRect(targetRect, rects);
				rects.push(targetRect);
				excludeList = excludeList.concat(rects);
			}
		});
		excludeList.forEach(rect => {
			let index = focusRectList.indexOf(rect as FocusRectExt);
			if (index !== -1) {
				focusRectList.splice(index, 1);
			}
		});
		//整理基础线条
		let baseLines: AbsorbLine[] = [];
		let AABBList: Rectangle[] = [];
		focusRectList.forEach(rect => {
			AABBList.push(this.getFocusRectBounds(rect));
		});

		AABBList.forEach(AABB => {
			let line = new AbsorbLine(AbsorbLineType.HORIZONTAIL, AABB.y);
			line.detail = { xFrom: AABB.x, xTo: AABB.x + AABB.width };
			baseLines.push(line);
			line = new AbsorbLine(AbsorbLineType.HORIZONTAIL, AABB.y + AABB.height / 2);
			line.detail = { xFrom: AABB.x, xTo: AABB.x + AABB.width };
			baseLines.push(line);
			line = new AbsorbLine(AbsorbLineType.HORIZONTAIL, AABB.y + AABB.height);
			line.detail = { xFrom: AABB.x, xTo: AABB.x + AABB.width };
			baseLines.push(line);
			line = new AbsorbLine(AbsorbLineType.VERTICAL, AABB.x);
			line.detail = { yFrom: AABB.y, yTo: AABB.y + AABB.height };
			baseLines.push(line);
			line = new AbsorbLine(AbsorbLineType.VERTICAL, AABB.x + AABB.width / 2);
			line.detail = { yFrom: AABB.y, yTo: AABB.y + AABB.height };
			baseLines.push(line);
			line = new AbsorbLine(AbsorbLineType.VERTICAL, AABB.x + AABB.width);
			line.detail = { yFrom: AABB.y, yTo: AABB.y + AABB.height };
			baseLines.push(line);
		});
		return baseLines;
	}
	public dispose(): void {
		this.detachEventListener();
		//释放所有的焦点矩形
		var allFocusRects: Array<FocusRectExt> = [];
		this.getAllChildFcousRect(this.getRootFocusRect(), allFocusRects);
		allFocusRects.push(this.getRootFocusRect());
		for (var i: number = 0; i < allFocusRects.length; i++) {
			allFocusRects[i].dispose();
		}
		//移除所有标签
		for (let i: number = this.container.children.length - 1; i >= 0; i--) {
			this.container.removeChild(this.container.children[i]);
		}
		//释放egret内容承载对象
		if (this.egretContentHost) {
			this.egretContentHost.dispose();
		}

		HtmlElementResizeHelper.unWatch(this.container);
	}
}




////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
class RectRender {
	private svg: SVGSVGElement;
	private line1: SVGPolylineElement;
	private line2: SVGPolylineElement
	private svgContainer: HTMLElement;
	constructor() {
		let ns = 'http://www.w3.org/2000/svg';
		this.svg = document.createElementNS(ns, 'svg') as SVGSVGElement;
		this.svg.style.pointerEvents = 'none';
		this.svg.style.width = '100%';
		this.svg.style.height = '100%';
		this.line1 = document.createElementNS(ns, 'polygon') as SVGPolylineElement;
		this.line1.style.pointerEvents = 'none';
		this.line1.style.fill = 'none';
		this.line1.style.stroke = '#000000';
		this.line1.style.strokeWidth = '1';
		this.svg.appendChild(this.line1);
		this.line2 = document.createElementNS(ns, 'polygon') as SVGPolylineElement;
		this.line2.style.pointerEvents = 'none';
		this.line2.style.fill = 'none';
		this.line2.style.stroke = '#ffffff';
		this.line2.style.strokeWidth = '1';
		// this.line2.style.strokeDasharray = '6,6';
		this.svg.appendChild(this.line2);

		this.svgContainer = document.createElement('div');
		this.svgContainer.style.width = '100%';
		this.svgContainer.style.height = '100%';
		this.svgContainer.style.top = '0';
		this.svgContainer.style.left = '0';
		this.svgContainer.style.position = 'absolute';
		this.svgContainer.style.overflow = 'hidden';
		this.svgContainer.style.pointerEvents = 'none';
		this.svgContainer.appendChild(this.svg);
		this.svgContainer.style.opacity = '0.5';
	}

	private _visible: boolean = true;
	public get visible(): boolean {
		return this._visible;
	}
	public set visible(value: boolean) {
		this._visible = value;
		if (value) {
			this.svgContainer.style.display = null;
		} else {
			this.svgContainer.style.display = 'none';
		}
	}

	public render(container: HTMLElement): void {
		container.appendChild(this.svgContainer);
	}

	public draw(p1: { x: number, y: number }, p2: { x: number, y: number }, p3: { x: number, y: number }, p4: { x: number, y: number }): void {
		p1.x = Math.round(p1.x); p1.y = Math.round(p1.y);
		p2.x = Math.round(p2.x); p2.y = Math.round(p2.y);
		p3.x = Math.round(p3.x); p3.y = Math.round(p3.y);
		p4.x = Math.round(p4.x); p4.y = Math.round(p4.y);

		var points: Point2D[] = [];
		points.push(p1, p2, p3, p4);

		var outerPoints = expandPolygon(points, -0.5);
		var pointsStr: string = '';
		pointsStr += outerPoints[0].x + ',' + outerPoints[0].y + ' ';
		pointsStr += outerPoints[1].x + ',' + outerPoints[1].y + ' ';
		pointsStr += outerPoints[2].x + ',' + outerPoints[2].y + ' ';
		pointsStr += outerPoints[3].x + ',' + outerPoints[3].y + ' ';
		this.line1.setAttribute('points', pointsStr);

		var innerPoints = expandPolygon(points, 0.5);
		var pointsStr: string = '';
		pointsStr += innerPoints[0].x + ',' + innerPoints[0].y + ' ';
		pointsStr += innerPoints[1].x + ',' + innerPoints[1].y + ' ';
		pointsStr += innerPoints[2].x + ',' + innerPoints[2].y + ' ';
		pointsStr += innerPoints[3].x + ',' + innerPoints[3].y + ' ';
		this.line2.setAttribute('points', pointsStr);
	}

	public dispose(): void {
		this.svgContainer.remove();
	}
}



/**焦点对象
 * 此对象是对一个Inode展现形态的映射
 */
export class FocusRect extends EventDispatcher implements IRender {

	public root: HTMLElement;
	private border: HTMLElement;
	protected ownerLayer: HTMLElement;
	protected rectRender: RectRender;
	private drawBorder: boolean = false;
	constructor(ownerLayer: HTMLElement, drawBorder: boolean = true) {
		super();
		this.ownerLayer = ownerLayer;
		this.rectRender = new RectRender();
		this.root = document.createElement('div');
		this.root.style.position = 'absolute';
		this.root.style.transformOrigin = 'top left';
		this.root.style.left = '0px';
		this.root.style.top = '0px';
		if (drawBorder) {
			this.rectRender.render(ownerLayer);
		}

		// if (drawBorder) {
		// 	this.border = document.createElement('div');
		// 	this.border.style.position = 'absolute';
		// 	this.border.style.left = '-1px';
		// 	this.border.style.right = '-1px';
		// 	this.border.style.top = '-1px';
		// 	this.border.style.bottom = '-1px';
		// 	this.border.style.borderColor = 'rgba(255,255,255,0.6)';
		// 	this.border.style.borderWidth = '1px';
		// 	this.border.style.borderStyle = 'solid';
		// 	this.border.style.outlineColor = 'rgba(0,0,0,0.6)'
		// 	this.border.style.outlineWidth = '1px';
		// 	this.border.style.outlineOffset = '0px';
		// 	this.border.style.outlineStyle = 'solid';
		// 	this.root.appendChild(this.border);
		// }
	}
	public hide(): void {
		this.root.style.visibility = 'hidden';
	}

	public show(): void {
		this.root.style.visibility = '';
	}

	private _targetNode: INode;
	/**目标节点 */
	public get targetNode(): INode {
		return this._targetNode;
	}
	public set targetNode(v: INode) {
		this.setTargetNode(v);
	}
	protected setTargetNode(v: INode): void {
		this._targetNode = v;
		//移除所有焦点矩形
		this.removeAllFocusRects();
		//刷新
		this.registToUpdateDisplay();
		//生成子集
		this.makeChildFocusRects(v);

		this.detachEvent();
		this.attachEvent();
	}

	private eventDispose: IDisposable[] = [];
	private attachEvent(): void {
		let node: INode = this.targetNode;
		if (node) {
			this.eventDispose.push(node.onPropertyChanged(this.nodeEventHandler, this));
			this.eventDispose.push(node.onLockedChanged(this.nodeEventHandler, this));
			node.addEgretEventlistener('addedToStage', this.nodeEventHandler, this);
			node.addEgretEventlistener('move', this.nodeEventHandler, this);
			node.addEgretEventlistener('resize', this.nodeEventHandler, this);
		}
	}
	private detachEvent(): void {
		let node: INode = this.targetNode;
		if (node) {
			this.eventDispose.forEach(d => { d.dispose() });
			this.eventDispose = [];
			node.removeEgretEventlistener('addedToStage', this.nodeEventHandler, this);
			node.removeEgretEventlistener('move', this.nodeEventHandler, this);
			node.removeEgretEventlistener('resize', this.nodeEventHandler, this);
		}
	}
	private nodeEventHandler(): void {
		this.registToUpdateDisplay();
	}

	private _parentFocusRect: FocusRect;
	/**父级焦点对象 */
	public get parentFocusRect(): FocusRect {
		return this._parentFocusRect;
	}
	public set parentFocusRect(v: FocusRect) {
		this._parentFocusRect = v;
	}
	public container: HTMLElement;
	public render(container: HTMLElement, index: number = undefined): void {
		this.container = container;
		container.appendChild(this.root);
		if (index !== undefined) {
			this.root.style.zIndex = index.toString();
		}
	}

	public setBounds(x: number, y: number, width: number, height: number) {

	}
	public getChildIndex(element: FocusRect): number {
		let node = element.targetNode as INode;
		if (node.getParent()) {
			return node.getParent().getNodeIndex(node);
		}
		return 0;
	}
	//子集FocusRect列表
	private childfocusRects: Array<FocusRect> = [];
	/**获取子集焦点对象集合 */
	public getChildFocusRects(): Array<FocusRect> {
		return this.childfocusRects;
	}
	/**添加一个foucusRect对象
	 * 此方法可以自动调整对象的焦点对象的显示层级
	 */
	public addFocusRect(v: FocusRect) {
		v.removeFromParentFocusRect();
		this.childfocusRects.push(v);
		if (!v.targetNode) {
			v.render(this.root);
		} else {
			try {
				let node = v.targetNode as INode;
				var index: number = node.getParent().getNodeIndex(node);
				v.render(this.root, index);
			}
			catch (e) {
				v.render(this.root);
			}
		}
		v.parentFocusRect = this;
	}
	/**删除一个focusRect对象 */
	public removeFocusRect(v: FocusRect) {
		var index: number = this.childfocusRects.indexOf(v);
		if (index !== -1) {
			this.childfocusRects.splice(index, 1);
			v.removeFromParent();
			v.parentFocusRect = null;
		}
	}
	/**从父级焦点对象中移除 */
	public removeFromParentFocusRect(): void {
		if (this.parentFocusRect) {
			this.parentFocusRect.removeFocusRect(this);
		}
	}
	/**移除所有的焦点矩形对象 */
	public removeAllFocusRects(): void {
		this.childfocusRects.forEach(rect => {
			rect.removeFromParent();
			rect.parentFocusRect = null;
		})
		this.childfocusRects.length = 0;
	}
	//生成子焦点对像
	private makeChildFocusRects(v: any) {
		if (v && v instanceof EContainer) {
			let numberChildren = v.getNumChildren();
			for (let i = 0; i < numberChildren; i++) {
				var fr: FocusRect = this.getFocusRectInstance();
				fr.targetNode = v.getNodeAt(i);
				this.addFocusRect(fr);
			}
		}
	}
	protected getFocusRectInstance(): FocusRect {
		return new FocusRect(this.ownerLayer);
	}
	private registed: boolean = false;
	private registToUpdateDisplay(): void {
		if (!this.targetNode) {
			return;
		}
		//todo 这里按理说不应该有这个延时，应该想办法检测到引擎最终的改变然后进行更新。 这里加这个延时是为了防止validenow进入死循环。
		if (!this.registed) {
			this.registed = true;
			setTimeout(() => {
				this.refreshDisplay();
			}, 10);
		}
	}
	private cacheInstanceWidth: number;
	private cacheInstanceHeight: number;
	private cacheMatrix: Matrix;
	/**刷新展现形态 */
	protected refreshDisplay(): void {
		if (!this.targetNode) {
			this.visible = false;
			return;
		}
		this.registed = false;
		let egretObj = this.targetNode.getInstance() as egret.DisplayObject;
		this.visible = egretObj.visible

		egretObj.addEventListener('complete', this.instanceEventHandle, this);
		var parentInstance = egretObj.parent;
		if (parentInstance && 'validateNow' in parentInstance) {
			(<any>parentInstance['validateNow'])();
		}
		var m: Matrix = new Matrix(1, 0, 0, 1, -egretObj.anchorOffsetX, -egretObj.anchorOffsetY);
		m.concat(egretObj.matrix.clone() as any)
		//由于相对布局的问题，如果自身发生变化可能会引起父级的变化，这里更新一下父级
		if (this.parentFocusRect && this.cacheMatrix && (
			!m.equals(this.cacheMatrix) ||
			this.cacheInstanceWidth !== egretObj.width ||
			this.cacheInstanceHeight !== egretObj.height)) {
			this.cacheInstanceWidth = egretObj.width;
			this.cacheInstanceHeight = egretObj.height;
			this.parentFocusRect.refreshDisplay();
		}
		this.root.style.width = egretObj.width + 'px';
		this.root.style.height = egretObj.height + 'px';
		this.root.style.transform = 'matrix(' + m.a + ',' + m.b + ',' + m.c + ',' + m.d + ',' + m.tx + ',' + m.ty + ')';
		this.cacheMatrix = m;
		this.drawColorRange();
		this.refreshRectRender();
	}

	public refreshRectRender(): void {
		var childList = this.getChildFocusRects();
		for (var i = 0; i < childList.length; i++) {
			childList[i].refreshRectRender();
		}
		if (!this.targetNode) {
			return;
		}
		this.doRefreshRectRender();
	}

	protected doRefreshRectRender(): void {

	}

	private _visible: boolean = true;
	public get visible(): boolean {
		return this._visible;
	}
	public set visible(value: boolean) {
		this._visible = value;
		this.updateVisible();
		var childList = this.getChildFocusRects();
		for (var i = 0; i < childList.length; i++) {
			childList[i].updateVisible();
		}
	}

	public updateVisible(): void {

	}



	private instanceEventHandle(e: egret.Event): void {
		//这里主要为更好的获取到Image的尺寸
		var nodeInstance: egret.DisplayObject = (<egret.DisplayObject>this.targetNode.getInstance());
		nodeInstance.removeEventListener('complete', this.instanceEventHandle, this);
		this.refreshDisplay();
	}
	/**是否可被选择 */
	public get canSelect(): boolean {
		let node: INode = this.targetNode;
		if (node && !node.getLocked() && this.getVisible()) {
			return true;
		}
		return false;
	}//获取可见度
	private getVisible(): boolean {
		if (!this.targetNode) {
			return false;
		}
		let p: INode = this.targetNode;
		while (p) {
			var visible: boolean = p.getInstance()['visible'];
			if (!visible) {
				return false;
			}
			else if (visible && p.getLocked()) {
				return false;
			}
			else {
				p = p.getParent();
			}
		}
		return true;
	}
	//绘制颜色区域
	private drawColorRange(): void {

	}
	public removeFromParent(): void {
		this.root.remove();
		this.dispose();
	}
	public dispose(): void {
		this.ownerLayer = null;
		this.rectRender.dispose();
		var childs = this.getChildFocusRects();
		for (var i = 0; i < childs.length; i++) {
			childs[i].dispose();
		}
	}
}




/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**拓展的焦点矩形 实现了IP9Target接口 */
export class FocusRectExt extends FocusRect implements IP9TTarget {
	constructor(ownerLayer: HTMLElement) {
		super(ownerLayer);
		this.doUpdate = this.doUpdate.bind(this);
	}
	protected setTargetNode(v: INode): void {
		super.setTargetNode(v);
		if (v) {
			this._canResize = true;
			this._canMove = true;
			this._canSetAnchor = true;
			this._canRotate = true;
			this._canScale = true;

			if (v.getIsRoot && v.getIsRoot()) {
				this._canMove = false;
				this._canRotate = false;
				this._canSetAnchor = false;
			}
		}
	}
	private commitDefaultProperty(): void {
		if (!this.targetNode) {
			return;
		}
		//犹豫映射层的左上角与egret层的左上角是重叠的，所以这里提交的属性完全可以是egret对象的数值
		let egretObj: egret.DisplayObject = this.targetNode.getInstance();
		this._localX = egretObj.x;
		this._localY = egretObj.y
		this._width = egretObj.width
		this._height = egretObj.height;
		this._scaleX = egretObj.scaleX;
		this._scaleY = egretObj.scaleY;
		this._skewX = egretObj.skewX;
		this._skewY = egretObj.skewY;
		this._rotation = egretObj.rotation;
		//当宽度为0时，锚点比例的计算会出现问题，这里约束到1
		if (this._width === 0) {
			this._width = 1;
		}
		if (this._height === 0) {
			this._height = 1;
		}
		this._anchorX = egretObj.anchorOffsetX / this._width;
		this._anchorY = egretObj.anchorOffsetY / this._height;
	}
	//即将更新的数值字典，此对象催在的意义是在进行统一更新的时候不会讲未发生改变的属性也设置到targetNode上
	willUpdateValueDic: { [key: string]: number } = {};

	private _localX: number = 0;
	public set localX(v: number) {
		if (this._localX !== v) {
			this.willUpdateValueDic['x'] = v;
			this._localX = v;
			this.update();
		}
	}
	public get localX(): number {
		return this._localX;
	}
	private _localY: number = 0;
	public set localY(v: number) {
		if (this._localY !== v) {
			this.willUpdateValueDic['y'] = v;
			this._localY = v;
			this.update();
		}
	}
	public get localY(): number {
		return this._localY;
	}
	private _width: number = 0;
	public set width(v: number) {
		if (this._width !== v) {
			this.willUpdateValueDic['width'] = v;
			this._width = v;
			this.update();
		}
	}
	public get width(): number {
		return this._width;
	}
	private _height: number = 0;
	public set height(v: number) {
		if (this._height !== v) {
			this.willUpdateValueDic['height'] = v;
			this._height = v;
			this.update();
		}
	}
	public get height(): number {
		return this._height;
	}
	private _rotation: number = 0;
	public set rotation(v: number) {
		if (this._rotation !== v) {
			this.willUpdateValueDic['rotation'] = v;
			this._rotation = v;;
			this.update();
		}
	}
	public get rotation(): number {
		return this._rotation;
	}
	private _anchorX: number = 0;
	public set anchorX(v: number) {
		if (this._anchorX !== v) {
			this.willUpdateValueDic['anchorOffsetX'] = v;
			this._anchorX = v;
			this.update();
		}
	}
	public get anchorX(): number {
		return this._anchorX;
	}
	private _anchorY: number = 0;
	public set anchorY(v: number) {
		if (this._anchorY !== v) {
			this.willUpdateValueDic['anchorOffsetY'] = v;
			this._anchorY = v;
			this.update();
		}
	}
	public get anchorY(): number {
		return this._anchorY;
	}
	private _scaleX: number = 1;
	public set scaleX(v: number) {
		if (this._scaleX !== v) {
			this.willUpdateValueDic['scaleX'] = v;
			this._scaleX = v;
			this.update();
		}
	}
	public get scaleX(): number {
		return this._scaleX;
	}
	private _scaleY: number = 1;
	public set scaleY(v: number) {
		if (this._scaleY !== v) {
			this.willUpdateValueDic['scaleY'] = v;
			this._scaleY = v;
			this.update();
		}
	}
	public get scaleY(): number {
		return this._scaleY;
	}
	private _skewX: number = 0;
	public set skewX(v: number) {
		if (this._skewX !== v) {
			this.willUpdateValueDic['skewX'] = v;
			this._skewX = v;
			this.update();
		}
	}
	public get skewX(): number {
		return this._skewX;
	}
	private _skewY: number = 0;
	public set skewY(v: number) {
		if (this._skewY !== v) {
			this.willUpdateValueDic['skewY'] = v;
			this._skewY = v;
			this.update();
		}
	}
	public get skewY(): number {
		return this._skewY;
	}

	private _canResize: boolean = false;
	public get canResize(): boolean {
		return this._canResize && this.canOperate();
	}

	private _canScale: boolean = false;
	public get canScale(): boolean {
		return this._canScale && this.canOperate();
	}

	private _canMove: boolean = false;
	public get canMove(): boolean {
		return this._canMove && this.canOperate();
	}

	private _canRotate: boolean = false;
	public get canRotate(): boolean {
		return this._canRotate && this.canOperate();
	}

	private _canSetAnchor: boolean = false;
	public get canSetAnchor(): boolean {
		return this._canSetAnchor && this.canOperate(true);
	}

	private canOperate(isAnchor: boolean = false): boolean {
		const exmlModel = this.targetNode.getExmlModel();
		const animationModel = exmlModel.getAnimationModel();

		if (animationModel.getEnabled() && (!animationModel.inKeyFrame() || isAnchor)) {
			return false;
		} else {
			return true;
		}
	}
	private regist: boolean = false;
	protected update(): void {
		if (!this.regist) {
			this.regist = true;
			setTimeout(() => {
				this.regist = false;
				this.doUpdate();
			}, 3);
		}
	}
	protected getFocusRectInstance(): FocusRect {
		return new FocusRectExt(this.ownerLayer);
	}
	//此AABB信息是纪录即将更新数值后的预期AABB信息
	//因为数值更新是单个设置的，这会导致再设置下一个属性时AABB框的信息会更新导致约束信息的计算错误
	private cacheAABB: Rectangle;
	private doUpdate(): void {
		if (this.targetNode) {
			//缓存一下预期AABB框信息
			this.cacheAABB = this.getAABB();

			if (this.canResize) {
				this.setTargetPropertyValue('width');
				this.setTargetPropertyValue('height');
			}
			if (this.canScale) {
				this.setTargetPropertyValue('scaleX');
				this.setTargetPropertyValue('scaleY');
			}
			if (this.canMove) {
				this.setTargetPropertyValue('x');
				this.setTargetPropertyValue('y');
			}
			if (this.canSetAnchor) {
				this.setTargetPropertyValue('anchorOffsetX');
				this.setTargetPropertyValue('anchorOffsetY');
			}
			if (this.canRotate) {
				this.setTargetPropertyValue('rotation');
			}
			this.setTargetPropertyValue('skewX');
			this.setTargetPropertyValue('skewY');
			this.willUpdateValueDic = {};
		}
	}
	private setTargetPropertyValue(property: string): void {
		const animationModel = this.targetNode.getExmlModel().getAnimationModel();
		let value = this.willUpdateValueDic[property];
		if (value !== undefined && value !== null && value !== NaN) {
			if (animationModel.inKeyFrame()) {
				const editingPath = animationModel.getSelectedItem().findEditingPath(animationModel.getTime(), false);
				editingPath.path.setProperty(property, this.rn(value));

				const item = animationModel.getSelectedItem();
				if (item) {
					item.refreshPaths();
				}
				return;
			}
			/**预处理（规整数值和处理排斥项） */
			if (property === 'anchorOffsetX') {
				let w: number = this.willUpdateValueDic['width'];
				if (w === undefined || w === null || w === NaN) {
					w = this._width;
				}
				value = value * w;
			} else if (property === 'width') {
				let anchorX: number = this.willUpdateValueDic['anchorOffsetX'];
				if (anchorX === undefined || anchorX === null || anchorX === NaN) {
					anchorX = this._anchorX;
				}
				if (this.canSetAnchor) {
					var existOffsetX = null;
					if (this.targetNode.getProperty('anchorOffsetX')) {
						existOffsetX = this.targetNode.getProperty('anchorOffsetX').getInstance();
					}
					var newOffsetX = this.rn(value * anchorX);
					if (existOffsetX !== newOffsetX && !(newOffsetX === 0 && isNaN(existOffsetX))) {
						this.targetNode.setNumber('anchorOffsetX', newOffsetX);
					}
				}
			} else if (property === 'anchorOffsetY') {
				let h: number = this.willUpdateValueDic['height'];
				if (h === undefined || h === null || h === NaN) {
					h = this._height;
				}
				value = value * h;
			} else if (property === 'height') {
				let anchorY: number = this.willUpdateValueDic['anchorOffsetY'];
				if (anchorY === undefined || anchorY === null || anchorY === NaN) {
					anchorY = this._anchorY;
				}
				if (this.canSetAnchor) {

					var existOffsetY = null;
					if (this.targetNode.getProperty('anchorOffsetY')) {
						existOffsetY = this.targetNode.getProperty('anchorOffsetY').getInstance();
					}
					var newOffsetY = this.rn(value * anchorY);
					if (existOffsetY !== newOffsetY && !(newOffsetY === 0 && isNaN(existOffsetY))) {
						this.targetNode.setNumber('anchorOffsetY', newOffsetY);
					}
				}
			}
			/**处理数值 */
			var AABB: Rectangle = this.cacheAABB;
			// console.log(AABB.toString());
			var setX: boolean = true;
			var setY: boolean = true;
			var setWidth: boolean = true;
			var setHeight: boolean = true;
			if (AABB) {
				var parentW: number = this.container.offsetWidth;
				var parentH: number = this.container.offsetHeight;

				var leftValue: IValue = this.targetNode.getProperty('left');
				var rightValue: IValue = this.targetNode.getProperty('right');
				var hCValue: IValue = this.targetNode.getProperty('horizontalCenter');
				if (leftValue) {
					this.targetNode.setNumber('left', AABB.x);
					setX = false;
				}
				if (rightValue) {
					this.targetNode.setNumber('right', parentW - AABB.x - AABB.width);
					setX = false;
				}
				if (hCValue) {
					this.targetNode.setNumber('horizontalCenter', AABB.x + AABB.width * 0.5 - parentW * 0.5);
					setX = false;
				}
				if (rightValue && leftValue) {
					setWidth = false;
				}

				var topValue: IValue = this.targetNode.getProperty('top');
				var bottomValue: IValue = this.targetNode.getProperty('bottom');
				var vCValue: IValue = this.targetNode.getProperty('verticalCenter');
				if (topValue) {
					this.targetNode.setNumber('top', AABB.y);
					setY = false;
				}
				if (bottomValue) {
					this.targetNode.setNumber('bottom', parentH - AABB.y - AABB.height);
					setY = false;
				}
				if (vCValue) {
					this.targetNode.setNumber('verticalCenter', AABB.height * 0.5 - parentH * 0.5 + AABB.y);
					setY = false;
				}
				if (bottomValue && topValue) {
					setHeight = false;
				}
			}
			if ((!setX && property === 'x') || (!setY && property === 'y') ||
				(!setHeight && property === 'height') || (!setWidth && property === 'width')) {
				return;
			}
			this.targetNode.setNumber(property, this.rn(value));
		}
	}
	private getAABB(): Rectangle {
		if (!this.container) {
			return null;
		}
		var m: Matrix = MatrixUtil.getMatrixForIP9TTarget(this);

		var p1: Point = m.transformPoint(0, 0);
		var p2: Point = m.transformPoint(this.width, 0);
		var p3: Point = m.transformPoint(this.width, this.height);
		var p4: Point = m.transformPoint(0, this.height);

		var minx: number = p1.x;
		var maxx: number = p1.x;
		var miny: number = p1.y;
		var maxy: number = p1.y;
		[p2, p3, p4].forEach(element => {
			minx = Math.min(minx, element.x);
			maxx = Math.max(maxx, element.x);
			miny = Math.min(miny, element.y);
			maxy = Math.max(maxy, element.y);
		});
		var rect: Rectangle = new Rectangle(minx, miny, maxx - minx, maxy - miny);
		rect.x = Math.round(rect.x);
		rect.y = Math.round(rect.y);
		rect.width = Math.round(rect.width);
		rect.height = Math.round(rect.height);
		return rect;
	}
	//截取数值
	private rn(v: number, decimal: number = 0): number {
		decimal = 3;
		var scale: number = 1;
		while (decimal > 0) {
			scale *= 10;
			decimal--;
		}
		v *= scale;
		v = Math.round(v);
		return v / scale;
	}
	public getMatrix(): Matrix {
		return MatrixUtil.getMatrix(this.root);
	}
	public getStageToParentMatrix(): Matrix {
		return MatrixUtil.getMatrixToWindow(this.container);
	}
	/**刷新展现形态 */
	protected refreshDisplay(): void {
		super.refreshDisplay();
		this.commitDefaultProperty();
		this.dispatchEvent(new P9TTargetEvent(P9TTargetEvent.DISPLAYCHANGE));
	}

	public updateVisible(): void {
		var targetVisible: boolean = true;
		var curTarget: FocusRect = this;
		while (curTarget) {
			if (!curTarget.visible && curTarget.parentFocusRect) {
				targetVisible = false;
				break;
			}
			curTarget = curTarget.parentFocusRect;
		}
		this.rectRender.visible = targetVisible;
	}

	private getDisplayObjectSize(obj: egret.DisplayObject): { width: number; height: number } {
		let width = obj.width;
		if (!Number.isFinite(width)) {
			if (this.container) {
				width = this.container.clientWidth;
			} else {
				width = 0;
			}
		}
		let height = obj.height;
		if (!Number.isFinite(height)) {
			if (this.container) {
				height = this.container.clientHeight;
			} else {
				height = 0;
			}
		}

		return { width: width, height: height };
	}

	protected doRefreshRectRender(): void {
		if (!this.ownerLayer) {
			return
		}
		let egretObj = this.targetNode.getInstance() as egret.DisplayObject;
		let objSize = this.getDisplayObjectSize(egretObj);
		let p1 = new Point(0, 0);
		let p2 = new Point(objSize.width, 0);
		let p3 = new Point(objSize.width, objSize.height);
		let p4 = new Point(0, objSize.height);

		let targetGlobalMatix: Matrix = this.getMatrix();
		targetGlobalMatix.concat(MatrixUtil.getMatrixToWindow(this.container));

		let rootLocalMatrix: Matrix = MatrixUtil.getMatrixToWindow(this.ownerLayer);
		rootLocalMatrix.invert();

		p1 = targetGlobalMatix.transformPoint(p1.x, p1.y);
		p1 = rootLocalMatrix.transformPoint(p1.x, p1.y);

		p2 = targetGlobalMatix.transformPoint(p2.x, p2.y);
		p2 = rootLocalMatrix.transformPoint(p2.x, p2.y);

		p3 = targetGlobalMatix.transformPoint(p3.x, p3.y);
		p3 = rootLocalMatrix.transformPoint(p3.x, p3.y);

		p4 = targetGlobalMatix.transformPoint(p4.x, p4.y);
		p4 = rootLocalMatrix.transformPoint(p4.x, p4.y);

		this.rectRender.draw(p1, p2, p3, p4);
	}


	public dispose(): void {
		super.dispose();
	}
}

class ShadowDisplay {
	private el: HTMLElement;
	constructor() {
		this.el = document.createElement('div');
		this.el.style.position = 'absolute';
		this.el.style.left = '0px';
		this.el.style.width = '0px';
		this.el.style.boxShadow = '0px 8px 16px 0px rgba(0, 0, 0, 0.4)';
		this.el.className = 'stage-shadow-display';
		this.el.style.pointerEvents = 'none';
		this.el.style.opacity = '0';
	}
	public render(container: HTMLElement) {
		container.appendChild(this.el);
	}

	private _x: number = 0;
	public get x(): number {
		return this._x;
	}
	public set x(value: number) {
		this._x = value;
		this.el.style.left = value + 'px';
	}

	private _y: number = 0;
	public get y(): number {
		return this._y;
	}
	public set y(value: number) {
		this._y = value;
		this.el.style.top = value + 'px';
	}

	private _width: number = 0;
	public get width(): number {
		return this._width;
	}
	public set width(value: number) {
		this._width = value;
		this.el.style.width = value + 'px';
	}

	private _height: number = 0;
	public get height(): number {
		return this._height;
	}
	public set height(value: number) {
		this._height = value;
		this.el.style.height = value + 'px';
	}

	private _opacity: number = 0;
	public get opacity(): number {
		return this._opacity;
	}
	public set opacity(value: number) {
		this._opacity = value;
		this.el.style.opacity = value + '';
	}
}