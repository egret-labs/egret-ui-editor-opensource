import { P9TTargetAdapterEventContext } from '../t9transformer/adapter/P9TTargetAdapterEventContext';
import { P9TTargetAdapterEvent } from '../t9transformer/adapter/events/P9TTargetAdapterEvent';
import { AbsorbMotor, AbsorbResult } from './AbsorbMotor';
import { AbsorbLine, AbsorbLineType } from './AbsorbLine';
import { MatrixUtil } from '../t9transformer/util/MatrixUtil';
import { P9TTargetAdapterSyncOperateDefine } from '../t9transformer/adapter/P9TTargetAdapterSyncOperateDefine';
import { P9TTargetAdapter } from '../t9transformer/adapter/P9TTargetAdapter';
import { IP9TPointRender } from '../t9transformer/adapter/interfaces/IP9TPointRender';
import { FocusRectLayer, FocusRectExt } from '../FocusRectLayer';
import { Point } from '../data/Point';
import { Matrix } from '../data/Matrix';
import { Rectangle } from '../data/Rectangle';

/**
 * 吸附数据提供器接口
 */
export interface IAbosrbLineProvider {
	/**获取吸附线 */
	getAbsorbLines(): AbsorbLine[];
}
/**
 * 吸附器
 */
export class Absorber {
	private absorbMotor: AbsorbMotor;
	constructor() {
		this.absorbMotor = new AbsorbMotor();
		this.makeStagePoint = this.makeStagePoint.bind(this);
		this.lineProviderList = [];
	}
	private lineProviderList: IAbosrbLineProvider[];
	/**获取吸附线 */
	public addLineProvieder(v: IAbosrbLineProvider): void {
		if (this.lineProviderList.indexOf(v) === -1) {
			this.lineProviderList.push(v);
		}
	}
	/**是否可用 */
	public enabled: boolean = false;
	/**焦点层 */
	public focusRectLayer: FocusRectLayer;

	private container: HTMLElement;
	private path: SVGPathElement;
	private svg: SVGSVGElement;
	private drawCanvas: HTMLCanvasElement;
	/**渲染 */
	public render(container: HTMLElement): void {
		this.container = container;
		let ns = 'http://www.w3.org/2000/svg';
		this.svg = document.createElementNS(ns, 'svg') as SVGSVGElement;
		this.svg.style.pointerEvents = 'none';
		this.svg.style.width = '100%';
		this.svg.style.height = '100%';
		this.path = document.createElementNS(ns, 'path') as SVGPathElement;
		this.path.style.pointerEvents = 'none';
		this.path.style.fill = 'none';
		this.path.style.stroke = '#f37038';
		this.path.style.strokeWidth = '1';
		this.svg.appendChild(this.path);
		this.container.appendChild(this.svg);

		this.drawCanvas = document.createElement('canvas');
		this.drawCanvas.style.position = 'absolute';
		this.drawCanvas.style.left = '0px';
		this.drawCanvas.style.right = '0px';
		this.drawCanvas.width = this.drawCanvas.height = 1000;
		this.container.appendChild(this.drawCanvas);

		this.start();
	}
	private start(): void {
		P9TTargetAdapterEventContext.addEventListener(P9TTargetAdapterEvent.BEGINTRANSFORM, this.transformHandle, this, 1000);
		P9TTargetAdapterEventContext.addEventListener(P9TTargetAdapterEvent.BEGINUPDATETRANSFORM, this.transformHandle, this, 1000);
		P9TTargetAdapterEventContext.addEventListener(P9TTargetAdapterEvent.ENDTRANSFORM, this.transformHandle, this, 1000);
	}
	private currentOperateType: string;
	private currentAdapter: P9TTargetAdapter;
	private currentRender: IP9TPointRender;
	private renderOffset: Point = new Point();
	private absorbResults: AbsorbResult[];
	private cacheMatrix: Matrix;

	private targetAABB: Rectangle;
	private targetAABBOffset: Point;
	private transformHandle(e: P9TTargetAdapterEvent): void {
		if (!this.enabled) {
			return;
		}
		if (e.data['tag'] && e.data['tag'] === 'keyboard') {
			return;
		}
		this.currentOperateType = e.data['key'];
		if (this.currentOperateType === P9TTargetAdapterSyncOperateDefine.ROTATION ||
			this.currentOperateType === P9TTargetAdapterSyncOperateDefine.ANCHOR) {
			return;
		}
		switch (e.type) {
			case P9TTargetAdapterEvent.BEGINTRANSFORM:
				let mouseEvent: MouseEvent = e.data['mouseEvent'] as MouseEvent;
				this.currentAdapter = e.targetAdapter as P9TTargetAdapter;
				this.currentAdapter.makeStagePoint = this.makeStagePoint;
				this.currentRender = e.data['render'];
				this.targetAABB = this.focusRectLayer.getFocusRectBounds(this.currentAdapter.operateTarget as FocusRectExt);
				this.targetAABBOffset = new Point(mouseEvent.clientX - this.targetAABB.x, mouseEvent.clientY - this.targetAABB.y);
				let renderP = MatrixUtil.localToGlobal(this.currentAdapter.root, new Point(this.currentRender.x, this.currentRender.y));
				this.renderOffset.x = mouseEvent.clientX - renderP.x;
				this.renderOffset.y = mouseEvent.clientY - renderP.y;

				this.cacheMatrix = MatrixUtil.getMatrixToWindow(this.container);
				this.cacheMatrix.invert();

				//基础线条
				let baseLines: AbsorbLine[] = [];
				this.lineProviderList.forEach(provider => {
					baseLines = baseLines.concat(provider.getAbsorbLines());
				});
				//设置吸附器
				this.absorbMotor.setUp(baseLines, 4);
				break;
			case P9TTargetAdapterEvent.BEGINUPDATETRANSFORM:
				// //整理吸附线条
				let targetLines: AbsorbLine[] = [];
				mouseEvent = e.data['mouseEvent'] as MouseEvent;
				switch (this.currentOperateType) {
					case P9TTargetAdapterSyncOperateDefine.LEFTBOTTOM:
					case P9TTargetAdapterSyncOperateDefine.LEFTTOP:
					case P9TTargetAdapterSyncOperateDefine.RIGHTBOTTOM:
					case P9TTargetAdapterSyncOperateDefine.RIGHTTOP:
						let line: AbsorbLine = new AbsorbLine(AbsorbLineType.HORIZONTAIL, mouseEvent.y - this.renderOffset.y);
						line.detail = { xFrom: mouseEvent.x - this.renderOffset.x, xTo: mouseEvent.x - this.renderOffset.x };
						targetLines.push(line);
						line = new AbsorbLine(AbsorbLineType.VERTICAL, mouseEvent.x - this.renderOffset.x);
						line.detail = { yFrom: mouseEvent.y - this.renderOffset.y, yTo: mouseEvent.y - this.renderOffset.y };
						targetLines.push(line);
						this.absorbResults = this.absorbMotor.absorb(targetLines);
						break;
					case P9TTargetAdapterSyncOperateDefine.MOVE:
						let AABB = this.targetAABB;
						AABB.x = mouseEvent.clientX - this.targetAABBOffset.x;
						AABB.y = mouseEvent.clientY - this.targetAABBOffset.y;

						line = new AbsorbLine(AbsorbLineType.VERTICAL, AABB.x);
						line.detail = { yFrom: AABB.y, yTo: AABB.y + AABB.height };
						line['__offset'] = { x: mouseEvent.clientX - AABB.x };
						targetLines.push(line);
						line = new AbsorbLine(AbsorbLineType.VERTICAL, AABB.x + AABB.width / 2);
						line.detail = { yFrom: AABB.y, yTo: AABB.y + AABB.height };
						line['__offset'] = { x: mouseEvent.clientX - AABB.x - AABB.width / 2 };
						targetLines.push(line);
						line = new AbsorbLine(AbsorbLineType.VERTICAL, AABB.x + AABB.width);
						line.detail = { yFrom: AABB.y, yTo: AABB.y + AABB.height };
						line['__offset'] = { x: mouseEvent.clientX - AABB.x - AABB.width };
						targetLines.push(line);

						line = new AbsorbLine(AbsorbLineType.HORIZONTAIL, AABB.y);
						line.detail = { xFrom: AABB.x, xTo: AABB.x + AABB.width };
						line['__offset'] = { y: mouseEvent.clientY - AABB.y };
						targetLines.push(line);
						line = new AbsorbLine(AbsorbLineType.HORIZONTAIL, AABB.y + AABB.height / 2);
						line.detail = { xFrom: AABB.x, xTo: AABB.x + AABB.width };
						line['__offset'] = { y: mouseEvent.clientY - AABB.y - AABB.height / 2 };
						targetLines.push(line);
						line = new AbsorbLine(AbsorbLineType.HORIZONTAIL, AABB.y + AABB.height);
						line.detail = { xFrom: AABB.x, xTo: AABB.x + AABB.width };
						line['__offset'] = { y: mouseEvent.clientY - AABB.y - AABB.height };
						targetLines.push(line);
						this.absorbResults = this.absorbMotor.absorb(targetLines);
						break;
				}
				this.drawLine();
				break;
			case P9TTargetAdapterEvent.ENDTRANSFORM:
				this.absorbResults = null;
				if (this.currentAdapter) {
					this.currentAdapter.makeStagePoint = null;
				}
				this.drawLine();
				break;
		}
	}
	private makeStagePoint(p: Point): Point {
		if (!this.absorbResults) {
			return p;
		}
		switch (this.currentOperateType) {
			case P9TTargetAdapterSyncOperateDefine.LEFTBOTTOM:
			case P9TTargetAdapterSyncOperateDefine.LEFTTOP:
			case P9TTargetAdapterSyncOperateDefine.RIGHTBOTTOM:
			case P9TTargetAdapterSyncOperateDefine.RIGHTTOP:
				this.absorbResults.forEach(absorbResult => {
					b: switch (absorbResult.targetLine.type) {
						case AbsorbLineType.HORIZONTAIL:
							p.y = absorbResult.baseLine.value + this.renderOffset.y;
							break b;
						case AbsorbLineType.VERTICAL:
							p.x = absorbResult.baseLine.value + this.renderOffset.x;
							break b;
					}
				});
				break;
			case P9TTargetAdapterSyncOperateDefine.MOVE:
				this.absorbResults.forEach(absorbResult => {
					b: switch (absorbResult.targetLine.type) {
						case AbsorbLineType.HORIZONTAIL:
							p.y = absorbResult.baseLine.value + absorbResult.targetLine['__offset'].y;
							break b;
						case AbsorbLineType.VERTICAL:
							p.x = absorbResult.baseLine.value + absorbResult.targetLine['__offset'].x;
							break b;
					}
				});
				break;
		}

		return p;
	}
	private drawLine(): void {
		if (!this.absorbResults) {
			this.path.setAttribute('d', '');
			return;
		}
		let pathValue: string = '';
		this.absorbResults.forEach(absorbResult => {
			let obj = absorbResult.baseLine.detail;
			let obj2 = absorbResult.targetLine.detail;
			switch (absorbResult.targetLine.type) {
				case AbsorbLineType.HORIZONTAIL:
					let minx = Math.min(obj.xFrom, obj2.xFrom);
					let maxx = Math.max(obj.xTo, obj2.xTo);
					let tmpP = this.cacheMatrix.transformPoint(minx, absorbResult.baseLine.value);
					tmpP.x = Math.round(tmpP.x) + 0.5; tmpP.y = Math.round(tmpP.y) + 0.5;
					pathValue += ('M' + tmpP.x + ' ' + tmpP.y + ' ');
					tmpP = this.cacheMatrix.transformPoint(maxx, absorbResult.baseLine.value);
					tmpP.x = Math.round(tmpP.x) + 0.5; tmpP.y = Math.round(tmpP.y) + 0.5;
					pathValue += ('L' + tmpP.x + ' ' + tmpP.y);
					break;
				case AbsorbLineType.VERTICAL:
					obj2 = absorbResult.targetLine.detail;
					let miny = Math.min(obj.yFrom, obj2.yFrom);
					let maxy = Math.max(obj.yTo, obj2.yTo);
					tmpP = this.cacheMatrix.transformPoint(absorbResult.baseLine.value, miny);
					tmpP.x = Math.round(tmpP.x) + 0.5; tmpP.y = Math.round(tmpP.y) + 0.5;
					pathValue += ('M' + tmpP.x + ' ' + tmpP.y + ' ');
					tmpP = this.cacheMatrix.transformPoint(absorbResult.baseLine.value, maxy);
					tmpP.x = Math.round(tmpP.x) + 0.5; tmpP.y = Math.round(tmpP.y) + 0.5;
					pathValue += ('L' + tmpP.x + ' ' + tmpP.y);
					break;
			}
		});
		this.path.setAttribute('d', pathValue);
	}

	private stop(): void {
		P9TTargetAdapterEventContext.removeEventListener(P9TTargetAdapterEvent.BEGINTRANSFORM, this.transformHandle, this);
		P9TTargetAdapterEventContext.removeEventListener(P9TTargetAdapterEvent.BEGINUPDATETRANSFORM, this.transformHandle, this);
		P9TTargetAdapterEventContext.removeEventListener(P9TTargetAdapterEvent.ENDTRANSFORM, this.transformHandle, this);
	}
	/**释放 */
	public dispose(): void {
		this.stop();
		this.lineProviderList = [];
		//移除所有标签
		for (let i: number = this.container.children.length - 1; i >= 0; i--) {
			this.container.removeChild(this.container.children[i]);
		}
	}
}