import { P9TPoint } from './P9TPoint';
import { IP9TTarget } from './interfaces/IP9TTarget';
import { RadiusUtil } from './util/RadiusUtil';
import { P9TPointNameDefine } from './P9TPointNameDefine';
import { Matrix } from '../data/Matrix';
import { Point } from '../data/Point';
import { Rectangle } from '../data/Rectangle';
/**
 * */
export class P9Transformer {
	private points: Array<P9TPoint>;
	constructor() {
		this.points = [];
		[this.topP, this.bottomP, this.leftP,
		this.rightP, this.rtopP, this.rbottomP, this.ltopP, this.lbottomP,
		this.anchorP].forEach(element => {
			this.points.push(element);
		});
	}
	private _target: IP9TTarget;
	public set target(v: IP9TTarget) {
		if (this._target !== v) {
			this._target = v;
		}
	}
	public get target(): IP9TTarget {
		return this._target;
	}
	private tmpX: number;
	private tmpY: number;
	private tmpWidth: number;
	private tmpHeight: number;
	private tmpAnchorX: number;
	private tmpAnchorY: number;
	private tmpScaleX: number;
	private tmpScaleY: number;
	private tmpRotation: number;
	private tmpSkewX: number;
	private tmpSkewY: number;
	private tmpTargetMatrix: Matrix;
	private tmpTargetInvertMatrix: Matrix;

	public readyToTransform(): boolean {
		if (!this._target) {
			return false;
		}
		this.tmpX = this._target.localX;
		this.tmpY = this._target.localY;
		this.tmpWidth = this._target.width;
		this.tmpHeight = this._target.height;
		this.tmpAnchorX = this._target.anchorX;
		this.tmpAnchorY = this._target.anchorY;
		this.tmpScaleX = this._target.scaleX;
		this.tmpScaleY = this._target.scaleY;
		this.tmpRotation = this._target.rotation;
		this.tmpSkewX = this._target.skewX;
		this.tmpSkewY = this._target.skewY;
		this.tmpTargetMatrix = this.target.getMatrix().clone();
		this.tmpTargetInvertMatrix = this.target.getMatrix().clone();
		this.tmpTargetInvertMatrix.invert();
		return true;
	}
	public transformTop(vx: number, vy: number, scale: boolean = false): void {
		if ((scale && !this.target.canScale) || (!scale && !this.target.canResize)) {
			return;
		}
		var p: Point = this.tmpTargetMatrix.transformPoint(this.tmpWidth / 2, 0);
		p.x += vx;
		p.y += vy;
		p = this.tmpTargetInvertMatrix.transformPoint(p.x, p.y);
		this._target.height = this.tmpHeight - p.y;
		var oldBP: Point = new Point(this.tmpWidth / 2, this.tmpHeight);
		var newBP: Point = new Point(this.tmpWidth / 2, this.tmpHeight - p.y);
		oldBP = this.tmpTargetMatrix.transformPoint(oldBP.x, oldBP.y);
		let m: Matrix = this.target.getMatrix();
		m.translate(-this.target.localX, -this.target.localY);
		m.translate(this.tmpX, this.tmpY);
		newBP = m.transformPoint(newBP.x, newBP.y);
		this.target.localX = this.tmpX - (newBP.x - oldBP.x);
		this.target.localY = this.tmpY - (newBP.y - oldBP.y);
	}
	public transformRight(vx: number, vy: number, scale: boolean = false): void {
		if ((scale && !this.target.canScale) || (!scale && !this.target.canResize)) {
			return;
		}
		var p: Point = this.tmpTargetMatrix.transformPoint(this.tmpWidth, this.tmpHeight / 2);
		p.x += vx;
		p.y += vy;
		p = this.tmpTargetInvertMatrix.transformPoint(p.x, p.y);
		this._target.width = p.x;
		var oldLP: Point = new Point(0, this.tmpHeight / 2);
		var newLP: Point = new Point(0, this.tmpHeight / 2);
		oldLP = this.tmpTargetMatrix.transformPoint(oldLP.x, oldLP.y);
		let m: Matrix = this.target.getMatrix();
		m.translate(-this.target.localX, -this.target.localY);
		m.translate(this.tmpX, this.tmpY);
		newLP = m.transformPoint(newLP.x, newLP.y);
		this.target.localX = this.tmpX - (newLP.x - oldLP.x);
		this.target.localY = this.tmpY - (newLP.y - oldLP.y);
	}
	public transformBottom(vx: number, vy: number, scale: boolean = false): void {
		if ((scale && !this.target.canScale) || (!scale && !this.target.canResize)) {
			return;
		}
		var p: Point = this.tmpTargetMatrix.transformPoint(this.tmpWidth / 2, this.tmpHeight);
		p.x += vx;
		p.y += vy;
		p = this.tmpTargetInvertMatrix.transformPoint(p.x, p.y);
		this._target.height = p.y;
		var oldTP: Point = new Point(this.tmpWidth / 2, 0);
		var newTP: Point = new Point(this.tmpWidth / 2, 0);
		oldTP = this.tmpTargetMatrix.transformPoint(oldTP.x, oldTP.y);
		let m: Matrix = this.target.getMatrix();
		m.translate(-this.target.localX, -this.target.localY);
		m.translate(this.tmpX, this.tmpY);
		newTP = m.transformPoint(newTP.x, newTP.y);
		this.target.localX = this.tmpX - (newTP.x - oldTP.x);
		this.target.localY = this.tmpY - (newTP.y - oldTP.y);
	}
	public transformLeft(vx: number, vy: number, scale: boolean = false): void {
		if ((scale && !this.target.canScale) || (!scale && !this.target.canResize)) {
			return;
		}
		var p: Point = this.tmpTargetMatrix.transformPoint(0, this.tmpHeight / 2);
		p.x += vx;
		p.y += vy;
		p = this.tmpTargetInvertMatrix.transformPoint(p.x, p.y);
		this._target.width = this.tmpWidth - p.x;
		var oldRP: Point = new Point(this.tmpWidth, this.tmpHeight / 2);
		var newRP: Point = new Point(this.tmpWidth - p.x, this.tmpHeight / 2);
		oldRP = this.tmpTargetMatrix.transformPoint(oldRP.x, oldRP.y);
		let m: Matrix = this.target.getMatrix();
		m.translate(-this.target.localX, -this.target.localY);
		m.translate(this.tmpX, this.tmpY);
		newRP = m.transformPoint(newRP.x, newRP.y);
		this.target.localX = this.tmpX - (newRP.x - oldRP.x);
		this.target.localY = this.tmpY - (newRP.y - oldRP.y);
	}
	public transformLeftTop(vx: number, vy: number, scale: boolean = false): void {
		if ((scale && !this.target.canScale) || (!scale && !this.target.canResize)) {
			return;
		}
		var p: Point = this.tmpTargetMatrix.transformPoint(0, 0);
		p.x += vx;
		p.y += vy;
		p = this.tmpTargetInvertMatrix.transformPoint(p.x, p.y);
		if (scale) {
			var wh: number = this.tmpWidth / this.tmpHeight;
			if ((this.tmpWidth - p.x) / (this.tmpHeight - p.y) > wh) {
				p.y = this.tmpHeight - (this.tmpWidth - p.x) / wh;
			}
			else {
				p.x = this.tmpWidth - (this.tmpHeight - p.y) * wh;
			}
		}
		this.target.width = this.tmpWidth - p.x;
		this.target.height = this.tmpHeight - p.y;
		var oldRBP: Point = new Point(this.tmpWidth, this.tmpHeight);
		var newRBP: Point = new Point(this.tmpWidth - p.x, this.tmpHeight - p.y);

		oldRBP = this.tmpTargetMatrix.transformPoint(oldRBP.x, oldRBP.y);
		let m: Matrix = this.target.getMatrix();
		m.translate(-this.target.localX, -this.target.localY);
		m.translate(this.tmpX, this.tmpY);
		newRBP = m.transformPoint(newRBP.x, newRBP.y);
		this.target.localX = this.tmpX - (newRBP.x - oldRBP.x);
		this.target.localY = this.tmpY - (newRBP.y - oldRBP.y);
	}
	public transformRightTop(vx: number, vy: number, scale: boolean = false): void {
		if ((scale && !this.target.canScale) || (!scale && !this.target.canResize)) {
			return;
		}
		var p: Point = this.tmpTargetMatrix.transformPoint(this.tmpWidth, 0);
		p.x += vx;
		p.y += vy;
		p = this.tmpTargetInvertMatrix.transformPoint(p.x, p.y);
		if (scale) {
			var wh: number = this.tmpWidth / this.tmpHeight;
			if (p.x / (this.tmpHeight - p.y) > wh) {
				p.y = this.tmpHeight - p.x / wh;
			}
			else {
				p.x = this.tmpWidth - p.y * wh;
			}
		}
		this.target.width = p.x;
		this.target.height = this.tmpHeight - p.y;
		var oldLBP: Point = new Point(0, this.tmpHeight);
		var newLBP: Point = new Point(0, this.tmpHeight - p.y);

		oldLBP = this.tmpTargetMatrix.transformPoint(oldLBP.x, oldLBP.y);
		let m: Matrix = this.target.getMatrix();
		m.translate(-this.target.localX, -this.target.localY);
		m.translate(this.tmpX, this.tmpY);
		newLBP = m.transformPoint(newLBP.x, newLBP.y);
		this.target.localX = this.tmpX - (newLBP.x - oldLBP.x);
		this.target.localY = this.tmpY - (newLBP.y - oldLBP.y);
	}
	public transformLeftBottom(vx: number, vy: number, scale: boolean = false): void {
		if ((scale && !this.target.canScale) || (!scale && !this.target.canResize)) {
			return;
		}
		var p: Point = this.tmpTargetMatrix.transformPoint(0, this.tmpHeight);
		p.x += vx;
		p.y += vy;
		p = this.tmpTargetInvertMatrix.transformPoint(p.x, p.y);
		if (scale) {
			var wh: number = this.tmpWidth / this.tmpHeight;
			if ((this.tmpWidth - p.x) / p.y > wh) {
				p.y = (this.tmpWidth - p.x) / wh;
			}
			else {
				p.x = this.tmpWidth - p.y * wh;
			}
		}
		this.target.width = this.tmpWidth - p.x;
		this.target.height = p.y;
		var oldRTP: Point = new Point(this.tmpWidth, 0);
		var newRTP: Point = new Point(this.tmpWidth - p.x, 0);

		oldRTP = this.tmpTargetMatrix.transformPoint(oldRTP.x, oldRTP.y);
		let m: Matrix = this.target.getMatrix();
		m.translate(-this.target.localX, -this.target.localY);
		m.translate(this.tmpX, this.tmpY);
		newRTP = m.transformPoint(newRTP.x, newRTP.y);
		this.target.localX = this.tmpX - (newRTP.x - oldRTP.x);
		this.target.localY = this.tmpY - (newRTP.y - oldRTP.y);
	}
	public transformRightBottom(vx: number, vy: number, scale: boolean = false): void {
		if ((scale && !this.target.canScale) || (!scale && !this.target.canResize)) {
			return;
		}
		var p: Point = this.tmpTargetMatrix.transformPoint(this.tmpWidth, this.tmpHeight);
		p.x += vx;
		p.y += vy;
		p = this.tmpTargetInvertMatrix.transformPoint(p.x, p.y);
		if (scale) {
			var wh: number = this.tmpWidth / this.tmpHeight;
			if (p.x / p.y > wh) {
				p.y = p.x / wh;
			}
			else {
				p.x = p.y * wh;
			}
		}
		this.target.width = p.x;
		this.target.height = p.y;
		var oldLTP: Point = new Point(0, 0);
		var newLTP: Point = new Point(0, 0);

		oldLTP = this.tmpTargetMatrix.transformPoint(oldLTP.x, oldLTP.y);
		let m: Matrix = this.target.getMatrix();
		m.translate(-this.target.localX, -this.target.localY);
		m.translate(this.tmpX, this.tmpY);
		newLTP = m.transformPoint(newLTP.x, newLTP.y);
		this.target.localX = this.tmpX - (newLTP.x - oldLTP.x);
		this.target.localY = this.tmpY - (newLTP.y - oldLTP.y);
	}
	public transformAnchor(vx: number, vy: number, restrict: boolean = false): void {
		if (!this.target.canSetAnchor) {
			return;
		}
		var explicitX: number = this.tmpWidth * this.tmpAnchorX;
		var explicitY: number = this.tmpHeight * this.tmpAnchorY;
		var p: Point = new Point(explicitX, explicitY);
		p = this.tmpTargetMatrix.transformPoint(p.x, p.y);
		p.x += vx;
		p.y += vy;
		p = this.tmpTargetInvertMatrix.transformPoint(p.x, p.y);
		if (restrict) {
			var restrictRanges: any[] = [
				{ x: 0, y: 0, w: this.tmpWidth / 4, h: this.tmpHeight / 4 }, { x: this.tmpWidth / 4, y: 0, w: this.tmpWidth / 2, h: this.tmpHeight / 4 }, { x: this.tmpWidth / 4 * 3, y: 0, w: this.tmpWidth / 4, h: this.tmpHeight / 4 },
				{ x: 0, y: this.tmpHeight / 4, w: this.tmpWidth / 4, h: this.tmpHeight / 2 }, { x: this.tmpWidth / 4, y: this.tmpHeight / 4, w: this.tmpWidth / 2, h: this.tmpHeight / 2 }, { x: this.tmpWidth / 4 * 3, y: this.tmpHeight / 4, w: this.tmpWidth / 4, h: this.tmpHeight / 2 },
				{ x: 0, y: this.tmpHeight / 4 * 3, w: this.tmpWidth / 4, h: this.tmpHeight / 2 }, { x: this.tmpWidth / 4, y: this.tmpHeight / 4 * 3, w: this.tmpWidth / 2, h: this.tmpHeight / 4 }, { x: this.tmpWidth / 4 * 3, y: this.tmpHeight / 4 * 3, w: this.tmpWidth / 4, h: this.tmpHeight / 4 }];
			var range: Rectangle = new Rectangle();
			for (var i: number = 0; i < restrictRanges.length; i++) {
				var info: Object = restrictRanges[i];
				range.x = info['x'];
				range.y = info['y'];
				range.width = info['w'];
				range.height = info['h'];
				if (range.containsPoint(p)) {
					switch (i) {
						case 0: p.x = p.y = 0; break;
						case 1: p.x = this.tmpWidth / 2; p.y = 0; break;
						case 2: p.x = this.tmpWidth; p.y = 0; break;
						case 3: p.x = 0; p.y = this.tmpHeight / 2; break;
						case 4: p.x = this.tmpWidth / 2; p.y = this.tmpHeight / 2; break;
						case 5: p.x = this.tmpWidth; p.y = this.tmpHeight / 2; break;
						case 6: p.x = 0; p.y = this.tmpHeight; break;
						case 7: p.x = this.tmpWidth / 2; p.y = this.tmpHeight; break;
						case 8: p.x = this.tmpWidth; p.y = this.tmpHeight; break;
					}
				}
				var m2: Matrix = this.tmpTargetMatrix.clone();
				var oldP: Point = m2.transformPoint(explicitX, explicitY);
				var newP: Point = m2.transformPoint(p.x, p.y);
				vx = newP.x - oldP.x;
				vy = newP.y - oldP.y;
			}
		}
		this._target.anchorX = p.x / this.tmpWidth;
		this._target.anchorY = p.y / this.tmpHeight;
		this._target.localX = this.tmpX + vx;
		this._target.localY = this.tmpY + vy;
	}
	public transformMove(vx: number, vy: number): void {
		if (!this.target.canMove) {
			return;
		}

		this._target.localX = this.tmpX + vx;
		this._target.localY = this.tmpY + vy;
	}
	public transformRotation(vrotation: number, restrict: boolean = false): void {
		if (!this.target.canRotate) {
			return;
		}
		var rn: number = this.tmpRotation + vrotation;
		rn = RadiusUtil.restrictRadiusRange(rn);
		if (restrict) {
			rn = Math.round(rn / 45) * 45;
		}
		this._target.rotation = rn;
	}
	private tmpP1: Point = new Point();
	private tmpP2: Point = new Point();
	private vt(x: number, y: number, angle: number): number {
		this.tmpP2.x = x; this.tmpP2.y = y;
		var jiaodu: number = RadiusUtil.calculateRadius(this.tmpP1, this.tmpP2);
		var jiajiao: number = jiaodu - angle;
		jiajiao = RadiusUtil.restrictRadiusRange(jiajiao);
		var mom: number = Math.sqrt(x * x + y * y);
		var weiyi: number = Math.cos(jiajiao / 180 * Math.PI) * mom;
		return weiyi;
	}
	private topP: P9TPoint = new P9TPoint(P9TPointNameDefine.TOP);
	private bottomP: P9TPoint = new P9TPoint(P9TPointNameDefine.BOTTOM);
	private leftP: P9TPoint = new P9TPoint(P9TPointNameDefine.LEFT);
	private rightP: P9TPoint = new P9TPoint(P9TPointNameDefine.RIGHT);
	private rtopP: P9TPoint = new P9TPoint(P9TPointNameDefine.RIGHTTOP);
	private rbottomP: P9TPoint = new P9TPoint(P9TPointNameDefine.RIGHTBOTTOM);
	private ltopP: P9TPoint = new P9TPoint(P9TPointNameDefine.LEFTTOP);
	private lbottomP: P9TPoint = new P9TPoint(P9TPointNameDefine.LEFTBOTTOM);
	private anchorP: P9TPoint = new P9TPoint(P9TPointNameDefine.ANCHOR);

	private tp: Point = new Point();
	public refreshPoints(): Array<P9TPoint> {
		if (!this._target) {
			return [];
		}
		var w: number = this.target.width;
		var h: number = this.target.height;
		var anchorX: number = this.target.anchorX;
		var anchorY: number = this.target.anchorY;
		var itemX: number = 0;
		var itemY: number = 0;
		this.tp.x = w * anchorX; this.tp.y = h * anchorY;
		// this.tp = m.transformPoint(this.tp.x, this.tp.y);
		this.anchorP.x = this.tp.x;
		this.anchorP.y = this.tp.y;
		this.tp.x = itemX; this.tp.y = itemY;
		// this.tp = m.transformPoint(this.tp.x, this.tp.y);
		this.ltopP.x = this.tp.x;
		this.ltopP.y = this.tp.y;
		this.tp.x = itemX + w / 2; this.tp.y = itemY;
		// this.tp = m.transformPoint(this.tp.x, this.tp.y);
		this.topP.x = this.tp.x;
		this.topP.y = this.tp.y;
		this.tp.x = itemX + w; this.tp.y = itemY;
		// this.tp = m.transformPoint(this.tp.x, this.tp.y);
		this.rtopP.x = this.tp.x;
		this.rtopP.y = this.tp.y;
		this.tp.x = itemX + w; this.tp.y = itemY + h / 2;
		// this.tp = m.transformPoint(this.tp.x, this.tp.y);
		this.rightP.x = this.tp.x;
		this.rightP.y = this.tp.y;
		this.tp.x = itemX + w; this.tp.y = itemY + h;
		// this.tp = m.transformPoint(this.tp.x, this.tp.y);
		this.rbottomP.x = this.tp.x;
		this.rbottomP.y = this.tp.y;
		this.tp.x = itemX + w / 2; this.tp.y = itemY + h;
		// this.tp = m.transformPoint(this.tp.x, this.tp.y);
		this.bottomP.x = this.tp.x;
		this.bottomP.y = this.tp.y;
		this.tp.x = itemX; this.tp.y = itemY + h;
		// this.tp = m.transformPoint(this.tp.x, this.tp.y);
		this.lbottomP.x = this.tp.x;
		this.lbottomP.y = this.tp.y;
		this.tp.x = itemX; this.tp.y = itemY + h / 2;
		// this.tp = m.transformPoint(this.tp.x, this.tp.y);
		this.leftP.x = this.tp.x;
		this.leftP.y = this.tp.y;
		return this.points;
	}
}