import { IP9TTargetAdapter } from './../interfaces/IP9TTargetAdapter';
import { DefaultP9TPRender } from './render/DefaultP9TPRender';
import { P9Transformer } from './../P9Transformer';
import { IP9TTargetRender, IP9TTarget } from './../interfaces/IP9TTarget';
import { IP9TPointRenderFactory } from './interfaces/IP9TPointRenderFactory';
import { P9TTargetAdapterSyncOperateDefine } from './P9TTargetAdapterSyncOperateDefine';
// import { P9TUtil } from './../util/P9TUtil';
import { IP9TPointRender } from './interfaces/IP9TPointRender';
import { P9TPointNameDefine } from './../P9TPointNameDefine';
import { P9TPoint } from './../P9TPoint';
import { P9TTargetAdapterEventContext } from './P9TTargetAdapterEventContext';
import { P9TTargetAdapterEvent } from './events/P9TTargetAdapterEvent';
import { RadiusUtil } from './../util/RadiusUtil';
import { P9TTargetEvent } from './../events/P9TTargetEvent';
import { EventDispatcher } from '../../EventDispatcher';
import { MatrixUtil } from '../util/MatrixUtil';
import { MoveOPRender } from "./render/MoveOPRender";
import { TackRender } from "./render/TrackRender";
import { AnchorRender_Rotation } from "./render/AnchorRender_Rotation";
import { Matrix } from '../../data/Matrix';
import { Point } from '../../data/Point';
import { Rectangle } from '../../data/Rectangle';
import { Keyboard } from '../../data/Keyboard';
import { Point2D, expandPolygon, fitPixel } from '../../utils/polygonUtils';
import { FocusRectExt } from '../../FocusRectLayer';
/**
 */
export class P9TTargetAdapter extends EventDispatcher implements IP9TTargetAdapter {
	public root: HTMLElement;
	constructor() {
		super();
		this.root = document.createElement("div");
		this.root.style.width = '100%';
		this.root.style.height = '100%';
		this.root.style.position = 'absolute';
		this.root.style.top = '0px';
		this.root.style.left = '0px';
		this.root.style.pointerEvents = 'none';

		this._opRender = new DefaultP9TPRender();
		this._transformer = new P9Transformer();
		this._transformer.target = this;
		this.mouseHandle = this.mouseHandle.bind(this);
		this.cursHandle = this.cursHandle.bind(this);
		this._setOpRenderForPoint(P9TPointNameDefine.ANCHOR, new AnchorRender_Rotation());
		this._setOpRenderForPoint(P9TPointNameDefine.TACK, new TackRender());
	}

	private _enable: boolean = true;
	public get enable(): boolean {
		return this._enable;
	}
	public set enable(value: boolean) {
		this._enable = value;
		if (!value) {
			this.lockCursor = false;
			this.setCursor('');
		}
	}

	private _transformer: P9Transformer;
	public get p9transformer(): P9Transformer {
		return this._transformer;
	}
	private _target: IP9TTarget;
	public set operateTarget(v: IP9TTarget) {
		if (this._target) {
			this._target.removeEventListener(P9TTargetEvent.DISPLAYCHANGE, this.targetDisplayChange, this);
		}
		this._displayMode = 'none';
		this._target = v;
		this.commitDefaultValue();
		this.layoutPoints();
		if (this._target) {
			this._target.addEventListener(P9TTargetEvent.DISPLAYCHANGE, this.targetDisplayChange, this);
		}
	}
	public get operateTarget(): IP9TTarget {
		return this._target;
	}
	private _localX: number;
	public set localX(v: number) {
		this._localX = v;
	}
	public get localX(): number {
		return this._localX;
	}
	private _localY: number;
	public set localY(v: number) {
		this._localY = v;
	}
	public get localY(): number {
		return this._localY;
	}
	private _width: number;
	public set width(v: number) {
		this._width = v;
	}
	public get width(): number {
		return this._width;
	}
	private _height: number;
	public set height(v: number) {
		this._height = v;
	}
	public get height(): number {
		return this._height;
	}
	private _rotation: number;
	public set rotation(v: number) {
		this._rotation = v;
	}
	public get rotation(): number {
		return this._rotation;
	}
	private _anchorX: number = 0;
	public set anchorX(v: number) {
		this._anchorX = v;
	}
	public get anchorX(): number {
		return this._anchorX;
	}
	private _anchorY: number = 0;
	public set anchorY(v: number) {
		this._anchorY = v;
	}
	public get anchorY(): number {
		return this._anchorY;
	}
	private _scaleX: number;
	public set scaleX(v: number) {
		this._scaleX = v;
	}
	public get scaleX(): number {
		return this._scaleX;
	}
	private _scaleY: number;
	public set scaleY(v: number) {
		this._scaleY = v;
	}
	public get scaleY(): number {
		return this._scaleY;
	}
	private _skewX: number = 0;
	public set skewX(v: number) {
		this._skewX = v;
	}
	public get skewX(): number {
		return this._skewX;
	}
	private _skewY: number = 0;
	public set skewY(v: number) {
		this._skewY = v;
	}
	public get skewY(): number {
		return this._skewY;
	}

	public get canResize(): boolean {
		return this._target.canResize;
	}
	public set canResize(v: boolean) {
		this._target.canResize = v;
	}

	public get canScale(): boolean {
		return this._target.canScale;
	}
	public set canScale(v: boolean) {
		this._target.canScale = v;
	}

	public get canMove(): boolean {
		return this._target.canMove;
	}
	public set canMove(v: boolean) {
		this._target.canMove = v;
	}

	public get canRotate(): boolean {
		return this._target.canRotate;
	}
	public set canRotate(v: boolean) {
		this._target.canRotate = v;
	}

	public get canSetAnchor(): boolean {
		return this._target.canSetAnchor;
	}
	public set canSetAnchor(v: boolean) {
		this._target.canSetAnchor = v;
	}

	private _opRender: IP9TPointRenderFactory;
	public set opRender(factory: IP9TPointRenderFactory) {
		this._opRender = factory;
		this.makeRenderInstance();
		this.layoutPoints();
	}
	public get opRender(): IP9TPointRenderFactory {
		return this._opRender;
	}

	private renderForPointDic: any = {};
	public setOpRenderForPoint(pname: string, factory: IP9TPointRenderFactory): void {
		this._setOpRenderForPoint(pname, factory);
		this.makeRenderInstance();
		this.layoutPoints();
	}
	private _setOpRenderForPoint(pname: string, factory: IP9TPointRenderFactory) {
		this.renderForPointDic[pname] = factory;
	}

	private syncTransformOperateList: string[] = [
		P9TTargetAdapterSyncOperateDefine.TOP,
		P9TTargetAdapterSyncOperateDefine.BOTTOM,
		P9TTargetAdapterSyncOperateDefine.LEFT,
		P9TTargetAdapterSyncOperateDefine.RIGHT,
		P9TTargetAdapterSyncOperateDefine.LEFTBOTTOM,
		P9TTargetAdapterSyncOperateDefine.LEFTTOP,
		P9TTargetAdapterSyncOperateDefine.RIGHTBOTTOM,
		P9TTargetAdapterSyncOperateDefine.RIGHTTOP,
		P9TTargetAdapterSyncOperateDefine.MOVE,
		P9TTargetAdapterSyncOperateDefine.ROTATION,
		P9TTargetAdapterSyncOperateDefine.TACK
	];
	public set useSyncTransform(operateList: string[]) {
		this.syncTransformOperateList = operateList;
	}
	public get useSyncTransform(): string[] {
		return this.syncTransformOperateList;
	}
	public getMatrix(): Matrix {
		return MatrixUtil.getMatrixForIP9TTarget(this);
	}
	public getStageToParentMatrix(): Matrix {
		let matrix: Matrix = MatrixUtil.getMatrixToWindow(this.container);		
		const target = this.operateTarget as FocusRectExt;
		matrix.scale(target.RootMatrix.a, target.RootMatrix.d);
		return matrix;
	}
	private targetDisplayChange(e: P9TTargetEvent): void {
		this.refresh();
	}
	/**刷新 */
	public refresh(): void {
		//重新提交目标属性并布局操作点
		this.commitDefaultValue();
		this.layoutPoints();
	}
	private _visible: boolean = true;
	public set visible(v: boolean) {
		this._visible = v;
		this.updateVisible();
	}
	public get visible(): boolean {
		return this._visible;
	}
	private updateVisible(): void {
		if (this.root) {
			this.root.hidden = !this._visible;
		}
	}
	private _renderPoint: boolean = true;
	public set renderPoint(v: boolean) {
		if (this._renderPoint !== v) {
			this._renderPoint = v;
			this.validatePointDisplay();
		}
	}
	private _displayMode: string = 'none';
	private set displayMode(v: string) {
		if (this._displayMode !== v) {
			this._displayMode = v;
			this.validatePointDisplay();
		}
	}
	private validatePointDisplay(): void {
		switch (this._displayMode) {
			case 'normal': this.tackP.visible = false; break;
			case 'small': this.tackP.visible = true; break;
		}
		if (this._displayMode === 'small') {
			this.itemList.forEach((item) => {
				if (item !== this.moveP && item !== this.tackP) {
					item.visible = false;
				}
			});
			return;
		}
		this.itemList.forEach((item) => {
			if (item !== this.moveP && item !== this.tackP) {
				item.visible = this._renderPoint;
			}
		});
	}
	public container: HTMLElement;
	private line: SVGPolygonElement;
	private svg: SVGSVGElement;
	public render(container: HTMLElement): void {
		this.container = container;
		this.container.appendChild(this.root);
		this.updateVisible();

		this.makeRenderInstance();
		this.layoutPoints();
		this.attachEventListeners();
		//初始化光标逻辑
		this.initCursorLogic();
	}
	public removeFromParent(): void {
		if (this.container) {
			this.root.remove();
			this.dispose();
		}
	}
	private attachEventListeners(): void {
		this.root.addEventListener('mousedown', this.mouseHandle);
		P9TTargetAdapterEventContext.addEventListener(P9TTargetAdapterEvent.BEGINTRANSFORM, this.syncTransform, this);
		P9TTargetAdapterEventContext.addEventListener(P9TTargetAdapterEvent.UPDATETRANSFORM, this.syncTransform, this);
		P9TTargetAdapterEventContext.addEventListener(P9TTargetAdapterEvent.ENDTRANSFORM, this.syncTransform, this);
	}
	private detachEventListeners(): void {
		this.root.removeEventListener('mousedown', this.mouseHandle);
		P9TTargetAdapterEventContext.removeEventListener(P9TTargetAdapterEvent.BEGINTRANSFORM, this.syncTransform, this);
		P9TTargetAdapterEventContext.removeEventListener(P9TTargetAdapterEvent.UPDATETRANSFORM, this.syncTransform, this);
		P9TTargetAdapterEventContext.removeEventListener(P9TTargetAdapterEvent.ENDTRANSFORM, this.syncTransform, this);
	}
	private toDoUpdate(): void {
		this.updateOperateTarget();
	}
	protected commitDefaultValue(): void {
		if (!this._target) {
			this.detachWindowMouseEvent();
			return;
		}
		if (this.startedTransform) {
			this._localX = this._localX;
			this._localY = this._localY;
		}
		else {
			this._localX = this._target.localX;
			this._localY = this._target.localY;
		}
		this._width = this._target.width;
		this._height = this._target.height;
		this._anchorX = this._target.anchorX;
		this._anchorY = this._target.anchorY;
		this._rotation = this._target.rotation;
		this._scaleX = this._target.scaleX;
		this._scaleY = this._target.scaleY;
		this._skewX = this._target.skewX;
		this._skewY = this._target.skewY;
	}
	protected updateOperateTarget(): void {
		if (!this._target) {
			return;
		}
		this._target.localX = this._localX;
		this._target.localY = this._localY;
		this._target.width = this._width;
		this._target.height = this._height;
		this._target.anchorX = this._anchorX;
		this._target.anchorY = this._anchorY;
		this._target.rotation = this._rotation;
		this._target.scaleX = this._scaleX;
		this._target.scaleY = this._scaleY;
		this._target.skewX = this._skewX;
		this._target.skewY = this._skewY;
	}

	private topP: IP9TPointRender;
	private bottomP: IP9TPointRender;
	private leftP: IP9TPointRender;
	private rightP: IP9TPointRender;

	private rtopP: IP9TPointRender;
	private rbottomP: IP9TPointRender;
	private ltopP: IP9TPointRender;
	private lbottomP: IP9TPointRender;

	private anchorP: IP9TPointRender;
	private moveP: IP9TPointRender;

	private tackP: IP9TPointRender;

	private itemList: Array<IP9TPointRender> = [];
	private makeRenderInstance(): void {
		for (let i: number = this.root.children.length - 1; i >= 0; i--) {
			this.root.removeChild(this.root.children[i]);
		}
		let ns = 'http://www.w3.org/2000/svg';
		this.svg = document.createElementNS(ns, 'svg') as SVGSVGElement;
		this.svg.style.pointerEvents = 'none';
		this.svg.style.width = '100%';
		this.svg.style.height = '100%';
		this.line = document.createElementNS(ns, 'polygon') as SVGPolylineElement;
		this.line.style.pointerEvents = 'none';
		this.line.style.fill = 'none';
		this.line.style.stroke = '#3695FF';
		this.line.style.strokeWidth = '1';
		this.svg.appendChild(this.line);
		this.root.appendChild(this.svg);


		this.moveP = new MoveOPRender();
		this.moveP.pname = P9TPointNameDefine.MOVE;
		this.moveP.render(this.root);

		this.topP = this.getRenderForPoint(P9TPointNameDefine.TOP);
		this.topP.render(this.root);
		this.bottomP = this.getRenderForPoint(P9TPointNameDefine.BOTTOM);
		this.bottomP.render(this.root);
		this.leftP = this.getRenderForPoint(P9TPointNameDefine.LEFT);
		this.leftP.render(this.root);
		this.rightP = this.getRenderForPoint(P9TPointNameDefine.RIGHT);
		this.rightP.render(this.root);


		this.ltopP = this.getRenderForPoint(P9TPointNameDefine.LEFTTOP);
		this.ltopP.render(this.root);
		this.lbottomP = this.getRenderForPoint(P9TPointNameDefine.LEFTBOTTOM);
		this.lbottomP.render(this.root);
		this.rtopP = this.getRenderForPoint(P9TPointNameDefine.RIGHTTOP);
		this.rtopP.render(this.root);
		this.rbottomP = this.getRenderForPoint(P9TPointNameDefine.RIGHTBOTTOM);
		this.rbottomP.render(this.root);

		this.anchorP = this.getRenderForPoint(P9TPointNameDefine.ANCHOR);
		this.anchorP.render(this.root);

		this.tackP = this.getRenderForPoint(P9TPointNameDefine.TACK);
		this.tackP.render(this.root);
		//此列表的顺序影响到到操作点的响应顺序，排在前面的优先响应
		this.itemList = [
			this.tackP,
			this.anchorP,
			this.rbottomP, this.rtopP, this.lbottomP, this.ltopP,
			this.topP, this.bottomP, this.rightP, this.leftP,
			this.moveP
		];
	}
	private getRenderForPoint(pname: string): IP9TPointRender {
		let returnInstance: IP9TPointRender;
		if (this.renderForPointDic[pname]) {
			returnInstance = (<IP9TPointRenderFactory>(this.renderForPointDic[pname])).createInstance();
			returnInstance.pname = pname;
			return returnInstance;
		}
		returnInstance = this._opRender.createInstance();
		returnInstance.pname = pname;
		return returnInstance;
	}
	private points: P9TPoint[];
	protected layoutPoints(): void {
		//TODO 这里画的
		if (!this.root) {
			return;
		}
		if (!this.operateTarget) {
			return;
		}
		var tmpOP: IP9TPointRender;
		var tmpP: Point = new Point();
		this.points = this.p9transformer.refreshPoints();

		let targetGlobalMatix: Matrix = this.getMatrix();
		const target = this.operateTarget as FocusRectExt;
		if(target.parentFocusRect){
			targetGlobalMatix.concat(target.parentFocusRect.getAbsoluteMatrix());
		}
		targetGlobalMatix.concat(target.RootMatrix);
		let minx: number = Number.MAX_VALUE;
		let maxx: number = Number.MIN_VALUE;
		let miny: number = Number.MAX_VALUE;
		let maxy: number = Number.MIN_VALUE;
		for (var index: number = 0; index < this.points.length; index++) {
			var p: P9TPoint = this.points[index];
			b: switch (p.pointName) {
				case P9TPointNameDefine.TOP: tmpOP = this.topP; break b;
				case P9TPointNameDefine.BOTTOM: tmpOP = this.bottomP; break b;
				case P9TPointNameDefine.LEFT: tmpOP = this.leftP; break b;
				case P9TPointNameDefine.RIGHT: tmpOP = this.rightP; break b;
				case P9TPointNameDefine.LEFTTOP: tmpOP = this.ltopP; break b;
				case P9TPointNameDefine.LEFTBOTTOM: tmpOP = this.lbottomP; break b;
				case P9TPointNameDefine.RIGHTTOP: tmpOP = this.rtopP; break b;
				case P9TPointNameDefine.RIGHTBOTTOM: tmpOP = this.rbottomP; break b;
				case P9TPointNameDefine.ANCHOR: tmpOP = this.anchorP; break b;
			}
			tmpP.x = p.x;
			tmpP.y = p.y;
			tmpP = targetGlobalMatix.transformPoint(tmpP.x, tmpP.y);

			minx = Math.min(minx, tmpP.x);
			maxx = Math.max(maxx, tmpP.x);
			miny = Math.min(miny, tmpP.y);
			maxy = Math.max(maxy, tmpP.y);

			tmpOP.x = tmpP.x;
			tmpOP.y = tmpP.y;
		}
		//计算旋转角度（这是对paper需求的特殊处理，多点变换库本身没有旋转角度的api） 
		if (this.anchorP instanceof AnchorRender_Rotation) {
			this.anchorP['rotation'] = RadiusUtil.calculateRadius(new Point(this.ltopP.x, this.ltopP.y), new Point(this.rtopP.x, this.rtopP.y));
		}

		this.moveP['width'] = this.width;
		this.moveP['height'] = this.height;
		targetGlobalMatix.tx = this.ltopP.x;
		targetGlobalMatix.ty = this.ltopP.y;
		this.moveP['matrix'] = targetGlobalMatix;

		this.tackP.x = minx + (maxx - minx) / 2;
		this.tackP.y = miny + (maxy - miny) / 2;
		//绘制线条

		var p1 = { x: this.ltopP.x, y: this.ltopP.y };
		var p2 = { x: this.rtopP.x, y: this.rtopP.y };
		var p3 = { x: this.rbottomP.x, y: this.rbottomP.y };
		var p4 = { x: this.lbottomP.x, y: this.lbottomP.y };
		p1.x = Math.round(p1.x); p1.y = Math.round(p1.y);
		p2.x = Math.round(p2.x); p2.y = Math.round(p2.y);
		p3.x = Math.round(p3.x); p3.y = Math.round(p3.y);
		p4.x = Math.round(p4.x); p4.y = Math.round(p4.y);

		var points = [];
		points.push(p1, p2, p3, p4);

		var outerPoints = expandPolygon(points, -0.5);
		var pointsStr: string = '';
		pointsStr += outerPoints[0].x + ',' + outerPoints[0].y + ' ';
		pointsStr += outerPoints[1].x + ',' + outerPoints[1].y + ' ';
		pointsStr += outerPoints[2].x + ',' + outerPoints[2].y + ' ';
		pointsStr += outerPoints[3].x + ',' + outerPoints[3].y + ' ';
		this.line.setAttribute('points', pointsStr);


		//设置显示模式
		if (maxx - minx < 20 && maxy - miny < 20) {
			this.displayMode = 'small';
		}
		else {
			this.displayMode = 'normal';
		}
	}
	//是否产生形变。
	private get isDistorted(): boolean {
		if (Math.abs(this.ltopP.y - this.rtopP.y) > 0.5 ||
			Math.abs(this.ltopP.x - this.lbottomP.x) > 0.5) {
			return true;
		}
		return false;
	}
	private currentOperateItem: IP9TPointRender;
	private currentOperateKey: string;
	private operateMode: string = 'simple';
	private oldStageX: number;
	private oldStageY: number;
	private shiftKey: boolean = false;
	private mouseHandle(e: MouseEvent): void {
		if (!this.enable) {
			return;
		}
		switch (e.type) {
			case 'mousedown':
				{
					if (e.button === 0) {
						this.currentOperateItem = this.getOneOperateItemWidthPoint(e.clientX, e.clientY);
						if (this.currentOperateItem && this.p9transformer.readyToTransform()) {
							this.operateMode = this.getOperateMode(this.currentOperateItem, e.clientX, e.clientY);
							var key: string;
							switch (this.currentOperateItem) {
								case this.topP: key = P9TTargetAdapterSyncOperateDefine.TOP; break;
								case this.leftP: key = P9TTargetAdapterSyncOperateDefine.LEFT; break;
								case this.rightP: key = P9TTargetAdapterSyncOperateDefine.RIGHT; break;
								case this.bottomP: key = P9TTargetAdapterSyncOperateDefine.BOTTOM; break;
								case this.ltopP: key = P9TTargetAdapterSyncOperateDefine.LEFTTOP; break;
								case this.lbottomP: key = P9TTargetAdapterSyncOperateDefine.LEFTBOTTOM; break;
								case this.rtopP: key = P9TTargetAdapterSyncOperateDefine.RIGHTTOP; break;
								case this.rbottomP: key = P9TTargetAdapterSyncOperateDefine.RIGHTBOTTOM; break;
								case this.moveP:
								case this.tackP: key = P9TTargetAdapterSyncOperateDefine.MOVE; break;
								case this.anchorP: key = P9TTargetAdapterSyncOperateDefine.ANCHOR; break;
							}
							if (this.operateMode === 'rotation') {
								key = P9TTargetAdapterSyncOperateDefine.ROTATION;
							}
							this.currentOperateKey = key;

							this.oldStageX = e.clientX;
							this.oldStageY = e.clientY;
							this.shiftKey = e.shiftKey;
							this.attachWindowMouseEvent();
							this.onTransformBegin();

							if (this.currentOperateKey) {
								P9TTargetAdapterEventContext.dispatchEvent(new P9TTargetAdapterEvent(
									P9TTargetAdapterEvent.BEGINTRANSFORM,
									this,
									{
										key: this.currentOperateKey,
										shiftKey: this.shiftKey,
										render: this.currentOperateItem,
										mouseEvent: e
									}
								));
							}

						}
					}
				}
				break;
			case 'mousemove':
				{
					// https://github.com/egret-labs/egret-ui-editor-opensource/issues/79
					// 当某些情况比如右键后再点击左键，虽然鼠标位置没有变化但会触发mousemove事件, 示例：http://jsfiddle.net/9onhpgt6/6/
					// 当移动距离为1时不处理
					if (Math.abs(e.clientX - this.oldStageX) > 1 ||
						Math.abs(e.clientY - this.oldStageY) > 1) {
						switch (this.operateMode) {
							case 'simple':
								var m: Matrix = this.getStageToParentMatrix();
								//在执行变换过程中某些特殊情况导致目标对象被移除，这里做一下判断，如果取不到矩阵直接退出此次变换周期。
								if (!m) {
									this.detachWindowMouseEvent();
									this.onTransformEnd();
									if (this.currentOperateKey) {
										P9TTargetAdapterEventContext.dispatchEvent(new P9TTargetAdapterEvent(
											P9TTargetAdapterEvent.ENDTRANSFORM,
											this,
											{
												key: this.currentOperateKey,
												mouseEvent: e
											}));
									}
									return;
								}
								m = m.clone();
								m.invert();
								var oldPT: Point = new Point(this.oldStageX, this.oldStageY);
								var newPT: Point = new Point(e.clientX, e.clientY);
								if (this.currentOperateKey) {
									P9TTargetAdapterEventContext.dispatchEvent(new P9TTargetAdapterEvent(
										P9TTargetAdapterEvent.BEGINUPDATETRANSFORM,
										this,
										{
											key: this.currentOperateKey,
											mouseEvent: e
										}));
								}
								if (this.makeStagePoint) {
									newPT = this.makeStagePoint(newPT);
								}
								var restrictP = this.restrictStagePoint(oldPT, newPT);
								oldPT = m.transformPoint(oldPT.x, oldPT.y);
								newPT = m.transformPoint(restrictP.x, restrictP.y);
								//
								this.transformNormal(newPT.x - oldPT.x, newPT.y - oldPT.y, this.shiftKey);
								this.onTransformUpdate();

								if (this.currentOperateKey) {
									P9TTargetAdapterEventContext.dispatchEvent(new P9TTargetAdapterEvent(
										P9TTargetAdapterEvent.UPDATETRANSFORM,
										this,
										{
											key: this.currentOperateKey,
											oldStageX: this.oldStageX, oldStageY: this.oldStageY,
											newStageX: restrictP.x, newStageY: restrictP.y,
											mouseEvent: e
										}));
								}
								break;
							case 'rotation':
								var A: Point = MatrixUtil.globalToLocal(this.anchorP.root, new Point(this.oldStageX, this.oldStageY));
								var B: Point = MatrixUtil.globalToLocal(this.anchorP.root, new Point(e.clientX, e.clientY));
								var rotationNum: number = RadiusUtil.calculateIncludedRadius(A, B);
								this._transformer.transformRotation(-rotationNum, this.shiftKey);
								this.onTransformUpdate();

								if (this.currentOperateKey) {
									P9TTargetAdapterEventContext.dispatchEvent(new P9TTargetAdapterEvent(
										P9TTargetAdapterEvent.UPDATETRANSFORM,
										this,
										{
											key: this.currentOperateKey,
											vrotation: -rotationNum,
											restrict: this.shiftKey,
											mouseEvent: e
										}));
								}

								break;
						}
					}
				}
				break;
			case 'mouseup':
				{
					this.detachWindowMouseEvent();
					this.onTransformEnd();

					if (this.currentOperateKey) {
						P9TTargetAdapterEventContext.dispatchEvent(new P9TTargetAdapterEvent(
							P9TTargetAdapterEvent.ENDTRANSFORM,
							this,
							{
								key: this.currentOperateKey,
								mouseEvent: e
							}));
					}
				}
				break;
		}
	}
	/**
	 * 此变量是用来在进行变换操作时重新规划当前鼠标所在的舞台坐标，也可以说是专门为了“吸附”功能做的一个接口
	 */
	public makeStagePoint: (p: Point) => Point;

	private restrictStagePoint(oldStageP: { x: number, y: number }, newStageP: { x: number, y: number }): { x: number, y: number } {
		if (this.currentOperateItem === this.moveP) {
			if (this.shiftKey) {
				if (Math.abs(newStageP.x - oldStageP.x) > Math.abs(newStageP.y - oldStageP.y)) {
					newStageP.y = oldStageP.y;
				}
				else {
					newStageP.x = oldStageP.x;
				}
			}
			return newStageP;
		}
		return newStageP;
	}
	private transformNormal(vx: number, vy: number, shift: boolean): void {
		switch (this.currentOperateItem) {
			case this.topP: this.p9transformer.transformTop(vx, vy, shift); break;
			case this.leftP: this.p9transformer.transformLeft(vx, vy, shift); break;
			case this.rightP: this.p9transformer.transformRight(vx, vy, shift); break;
			case this.bottomP: this.p9transformer.transformBottom(vx, vy, shift); break;
			case this.ltopP: this.p9transformer.transformLeftTop(vx, vy, shift); break;
			case this.lbottomP: this.p9transformer.transformLeftBottom(vx, vy, shift); break;
			case this.rtopP: this.p9transformer.transformRightTop(vx, vy, shift); break;
			case this.rbottomP: this.p9transformer.transformRightBottom(vx, vy, shift); break;
			case this.anchorP: this.p9transformer.transformAnchor(vx, vy, shift); break;
			case this.tackP:
			case this.moveP: this.p9transformer.transformMove(vx, vy); break;
		}
	}
	//
	private attachWindowMouseEvent(): void {
		window.addEventListener('mousemove', this.mouseHandle);
		window.addEventListener('mouseup', this.mouseHandle);
	}
	private detachWindowMouseEvent(): void {
		window.removeEventListener('mousemove', this.mouseHandle);
		window.removeEventListener('mouseup', this.mouseHandle);
	}
	public getOneOperateItemWidthPoint(x: number, y: number): IP9TPointRender {
		for (var i: number = 0; i < this.itemList.length; i++) {
			var item: IP9TPointRender = this.itemList[i];
			if (item.visible && this.hittest(item.root, x, y)) {
				if (item === this.leftP || item === this.rightP || item === this.topP || item === this.bottomP ||
					item === this.ltopP || item === this.rtopP || item === this.lbottomP || item === this.rbottomP) {
					if (!(<IP9TPointRender><any>item).checkCenterSpace(x, y) && this.hittest(this.moveP.root, x, y)) {
						return this.moveP;
					}
				}
				return <any>item;
			}
		}
		return null;
	}
	private hittest(target: HTMLElement, windowx: number, windowy: number): boolean {
		let localP: Point = MatrixUtil.globalToLocal(target, new Point(windowx, windowy));
		let width: number = Number(target.style.width.substring(0, target.style.width.length - 2));
		let height: number = Number(target.style.height.substring(0, target.style.height.length - 2));
		let range: Rectangle = new Rectangle(0, 0, width, height);
		return range.containsPoint(<any>localP);
	}
	private getOperateMode(target: IP9TPointRender, stageX: number, stageY: number): string {
		if (target === this.moveP || target === this.anchorP || target === this.tackP) {
			return 'simple';
		}
		if (target.checkCenterSpace(stageX, stageY)) {
			return 'simple';
		}
		if (!target.checkCenterSpace(stageX, stageY) && !this.hittest(this.moveP.root, stageX, stageY)) {
			if (target === this.ltopP || target === this.lbottomP || target === this.rtopP || target === this.rbottomP) {
				return 'rotation';
			}
		}
		return '';
	}
	//
	//同步变换
	private syncTransform(e: P9TTargetAdapterEvent): void {
		if (!this.operateTarget || !this.useSyncTransform || e.targetAdapter === this) {
			return;
		}
		if ((<any>e.targetAdapter).container !== this.container) {
			return;
		}
		switch (e.type) {
			case P9TTargetAdapterEvent.BEGINTRANSFORM:
				this.p9transformer.readyToTransform();
				this.shiftKey = e.data['shiftKey'];
				this.onTransformBegin();
				break;
			case P9TTargetAdapterEvent.UPDATETRANSFORM:
				if (!this.checkSyncOperate(e.data['key'])) {
					return;
				}
				if (e.data['key'] === P9TTargetAdapterSyncOperateDefine.ROTATION) {
					this._transformer.transformRotation(e.data['vrotation'], e.data['restrict']);
					this.onTransformUpdate();
				}
				else {
					var m: Matrix = this.getStageToParentMatrix().clone();
					m.invert();
					var oldPT: Point = new Point(e.data['oldStageX'], e.data['oldStageY']);
					oldPT = m.transformPoint(oldPT.x, oldPT.y);
					var newPT: Point = new Point(e.data['newStageX'], e.data['newStageY']);
					newPT = m.transformPoint(newPT.x, newPT.y);

					switch (e.data['key']) {
						case P9TTargetAdapterSyncOperateDefine.TOP: this.currentOperateItem = this.topP; break;
						case P9TTargetAdapterSyncOperateDefine.LEFT: this.currentOperateItem = this.leftP; break;
						case P9TTargetAdapterSyncOperateDefine.RIGHT: this.currentOperateItem = this.rightP; break;
						case P9TTargetAdapterSyncOperateDefine.BOTTOM: this.currentOperateItem = this.bottomP; break;
						case P9TTargetAdapterSyncOperateDefine.LEFTTOP: this.currentOperateItem = this.ltopP; break;
						case P9TTargetAdapterSyncOperateDefine.LEFTBOTTOM: this.currentOperateItem = this.lbottomP; break;
						case P9TTargetAdapterSyncOperateDefine.RIGHTTOP: this.currentOperateItem = this.rtopP; break;
						case P9TTargetAdapterSyncOperateDefine.RIGHTBOTTOM: this.currentOperateItem = this.rbottomP; break;
						case P9TTargetAdapterSyncOperateDefine.MOVE: this.currentOperateItem = this.moveP; break;
						case P9TTargetAdapterSyncOperateDefine.ANCHOR: this.currentOperateItem = this.anchorP; break;
						case P9TTargetAdapterSyncOperateDefine.TACK: this.currentOperateItem = this.tackP; break;
					}
					this.transformNormal(newPT.x - oldPT.x, newPT.y - oldPT.y, this.shiftKey);
					this.onTransformUpdate();
				}
				break;
			case P9TTargetAdapterEvent.ENDTRANSFORM:
				this.onTransformEnd();
				break;
		}
	}

	private checkSyncOperate(operate: string): boolean {
		if (!this.syncTransformOperateList) {
			return false;
		}
		for (var i: number = 0; i < this.syncTransformOperateList.length; i++) {
			var item: string = <string>this.syncTransformOperateList[i];
			if (item === operate) {
				return true;
			}
		}
		return false;
	}
	private startedTransform: boolean = false;
	protected onTransformBegin(): void {
		this.startedTransform = true;
		//子代可重写
	}
	protected onTransformUpdate(): void {
		this.layoutPoints();
		// this.toDoUpdate();
		//子代可重写
	}
	protected onTransformEnd(): void {
		this.startedTransform = false;
		this.toDoUpdate();
		//子代可重写
	}

	//以下为辅助功能（可通过外界传入用户输入来启动一个变换周期）
	private cacheNewP: { x: number, y: number };//目标点，当持续调用该方法时，该目标点回持续变化，直到下次重新变换时被重置
	/**根据一个键盘事件启动一次变换（注：之前是执行一次完整周期，现在是执行开始、更新阶段，结束阶段需要手动停止，参阅：stopCurrenTransform） */
	public beginTransformWithKeyBoardEvent(e: KeyboardEvent): void {
		var p: { x: number, y: number };
		var numScale: number = 1;
		if (e.shiftKey) {
			numScale = 10;
		}
		switch (e.keyCode) {
			case Keyboard.UP: p = { x: 0, y: -1 * numScale }; break;
			case Keyboard.DOWN: p = { x: 0, y: 1 * numScale }; break;
			case Keyboard.LEFT: p = { x: -1 * numScale, y: 0 }; break;
			case Keyboard.RIGHT: p = { x: 1 * numScale, y: 0 }; break;
		}
		if (!p) {
			return;
		}
		//开始变换
		if (!this.startedTransform) {
			this.p9transformer.readyToTransform();
			this.onTransformBegin();
			this.shiftKey = e.shiftKey;
			this.cacheNewP = { x: 0, y: 0 };//缓存一下目标点
			P9TTargetAdapterEventContext.dispatchEvent(new P9TTargetAdapterEvent(
				P9TTargetAdapterEvent.BEGINTRANSFORM,
				this,
				{
					key: P9TTargetAdapterSyncOperateDefine.MOVE,
					shiftKey: this.shiftKey,
					tag: 'keyboard'
				}
			));
		}
		//更新变换
		var m: Matrix = this.getStageToParentMatrix().clone();
		m.invert();
		var oldPT: { x: number, y: number } = { x: 0, y: 0 };
		this.cacheNewP.x += p.x;
		this.cacheNewP.y += p.y;
		var newPT: { x: number, y: number } = { x: this.cacheNewP.x, y: this.cacheNewP.y };
		var restrictP = this.restrictStagePoint(oldPT, newPT);
		oldPT = m.transformPoint(oldPT.x, oldPT.y);
		newPT = m.transformPoint(restrictP.x, restrictP.y);
		this.currentOperateItem = this.moveP;
		this.transformNormal(newPT.x - oldPT.x, newPT.y - oldPT.y, this.shiftKey);

		this.onTransformUpdate();
		P9TTargetAdapterEventContext.dispatchEvent(new P9TTargetAdapterEvent(
			P9TTargetAdapterEvent.UPDATETRANSFORM,
			this,
			{
				key: P9TTargetAdapterSyncOperateDefine.MOVE,
				oldStageX: 0, oldStageY: 0,
				newStageX: restrictP.x, newStageY: restrictP.y,
				tag: 'keyboard'
			}));
		// // //结束变换
		this.onTransformEnd();
		P9TTargetAdapterEventContext.dispatchEvent(new P9TTargetAdapterEvent(
			P9TTargetAdapterEvent.ENDTRANSFORM,
			this, {
			key: P9TTargetAdapterSyncOperateDefine.MOVE,
			tag: 'keyboard'
		}));
	}
	/**根据一个鼠标事件启动一个变换*/
	public beginTransformWithMouseEvent(e: MouseEvent): void {
		if (!this.operateTarget) {
			return;
		}
		this.mouseHandle(e);
	}
	/**结束当前变换（如果没有执行任何变换则直接返回） */
	public stopCurrenTransform(tag: string): void {
		if (this.startedTransform) {
			//结束变换
			this.onTransformEnd();
			P9TTargetAdapterEventContext.dispatchEvent(new P9TTargetAdapterEvent(
				P9TTargetAdapterEvent.ENDTRANSFORM,
				this, {
				key: P9TTargetAdapterSyncOperateDefine.MOVE,
				tag: tag
			}));
		}
	}
	/////////////////////////////////////////////////////////////////////////////
	/////////////////cursor逻辑///////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////////////////
	//////////////////////
	private initCursorLogic(): void {
		this.attachCursorMouseHandle();
	}
	private lockCursor: boolean = false;
	private attachCursorMouseHandle(): void {
		this.container.parentElement.addEventListener('mousemove', this.cursHandle);
		this.container.parentElement.addEventListener('mousedown', this.cursHandle);
		document.addEventListener('mouseup', this.cursHandle);
	}
	private detachCursorMouseHandle(): void {
		if (this.container && this.container.parentElement) {
			this.container.parentElement.removeEventListener('mousemove', this.cursHandle);
			this.container.parentElement.removeEventListener('mousedown', this.cursHandle);
		}
		document.removeEventListener('mouseup', this.cursHandle);
	}
	private cursHandle(e: MouseEvent): void {
		if (!this.enable) {
			return;
		}
		if (!this._renderPoint) {
			return;
		}
		switch (e.type) {
			case 'mouseup':
				this.lockCursor = false;
				this.setCursor('');
				break;
			case 'mousedown':
				this.lockCursor = true;
				break;
			case 'mousemove':
				if (!this.lockCursor) {
					let currentRender: IP9TPointRender = this.getOneOperateItemWidthPoint(e.clientX, e.clientY);
					if (currentRender) {
						let operateMode = this.getOperateMode(currentRender, e.clientX, e.clientY);
						if (operateMode === 'rotation') {
							this.setCursor(`url(${"./resources/cursor/rotate.svg"}),default`);
						}
						else if (operateMode === 'simple') {
							switch (currentRender.pname) {
								case P9TPointNameDefine.LEFT:
								case P9TPointNameDefine.RIGHT:
									this.setCursor(this.getOneCursorNameWithAngle(0 + this._rotation));
									break;
								case P9TPointNameDefine.TOP:
								case P9TPointNameDefine.BOTTOM:
									this.setCursor(this.getOneCursorNameWithAngle(90 + this._rotation));
									break;
								case P9TPointNameDefine.LEFTTOP:
								case P9TPointNameDefine.RIGHTBOTTOM:
									this.setCursor(this.getOneCursorNameWithAngle(45 + this._rotation));
									break;
								case P9TPointNameDefine.LEFTBOTTOM:
								case P9TPointNameDefine.RIGHTTOP:
									this.setCursor(this.getOneCursorNameWithAngle(135 + this._rotation));
									break;
								case P9TPointNameDefine.MOVE:
								case P9TPointNameDefine.TACK:
									this.setCursor('move');
									break;
								case P9TPointNameDefine.ANCHOR:
									this.setCursor('crosshair');
									break;
							}
						}
					}
					else {
						this.setCursor('');
					}
				}
				break;
		}
	}
	private setCursor(cursor: string): void {
		//将光标样式应用到操作层以便增强用户体验
		this.container.parentElement.style.cursor = cursor;
	}
	private getOneCursorNameWithAngle(angle: number): string {
		angle = RadiusUtil.restrictRadiusRange(angle);
		if (angle < 22.5 || angle >= 337.5 || (angle >= 157.5 && angle < 202.5)) {
			return 'ew-resize';
		}
		else if ((angle >= 22.5 && angle < 67.5) || (angle >= 202.5 && angle < 247.5)) {
			return 'nwse-resize';
		}
		else if ((angle >= 67.5 && angle < 112.5) || (angle >= 247.5 && angle < 292.5)) {
			return 'ns-resize';
		}
		else if ((angle >= 112.5 && angle < 157.5) || (angle >= 292.5 && angle < 337.5)) {
			return 'nesw-resize';
		}
	}

	//释放 代理移除后必须调用
	private dispose(): void {
		this.makeStagePoint = null;
		this.startedTransform = false;
		this.detachWindowMouseEvent();
		this.detachEventListeners();
		this.detachCursorMouseHandle();
	}
}