import { Point } from "./Point";
import { NumberUtils } from "../utils/NumberUtils";

/**
 * 矩阵
 */
export class Matrix {
	public a: number;
	public b: number;
	public c: number;
	public d: number;
	public tx: number;
	public ty: number;
	constructor(a: number = 1, b: number = 0, c: number = 0, d: number = 1, tx: number = 0, ty: number = 0) {
		this.a = a;
		this.b = b;
		this.c = c;
		this.d = d;
		this.tx = tx;
		this.ty = ty;
	}
	public clone(): Matrix {
		return new Matrix(this.a, this.b, this.c, this.d, this.tx, this.ty);
	}
	public concat(target: Matrix): void {
		var a = this.a * target.a;
		var b = 0.0;
		var c = 0.0;
		var d = this.d * target.d;
		var tx = this.tx * target.a + target.tx;
		var ty = this.ty * target.d + target.ty;
		if (this.b !== 0.0 || this.c !== 0.0 || target.b !== 0.0 || target.c !== 0.0) {
			a += this.b * target.c;
			d += this.c * target.b;
			b += this.a * target.b + this.b * target.d;
			c += this.c * target.a + this.d * target.c;
			tx += this.ty * target.c;
			ty += this.tx * target.b;
		}
		this.a = a;
		this.b = b;
		this.c = c;
		this.d = d;
		this.tx = tx;
		this.ty = ty;
	}
	public $preConcat(target: Matrix): void {
		var a = target.a * this.a;
		var b = 0.0;
		var c = 0.0;
		var d = target.d * this.d;
		var tx = target.tx * this.a + this.tx;
		var ty = target.ty * this.d + this.ty;
		if (target.b !== 0.0 || target.c !== 0.0 || this.b !== 0.0 || this.c !== 0.0) {
			a += target.b * this.c;
			d += target.c * this.b;
			b += target.a * this.b + target.b * this.d;
			c += target.c * this.a + target.d * this.c;
			tx += target.ty * this.c;
			ty += target.tx * this.b;
		}
		this.a = a;
		this.b = b;
		this.c = c;
		this.d = d;
		this.tx = tx;
		this.ty = ty;
	}
	public copyFrom(target: Matrix): void {
		this.a = target.a;
		this.b = target.b;
		this.c = target.c;
		this.d = target.d;
		this.tx = target.tx;
		this.ty = target.ty;
	}
	public identity(): void {
		this.a = this.d = 1;
		this.b = this.c = this.tx = this.ty = 0;
	}
	public invert(): void {
		this.$invertInto(this);
	}

	private $invertInto(target: Matrix): void {
		var a = this.a;
		var b = this.b;
		var c = this.c;
		var d = this.d;
		var tx = this.tx;
		var ty = this.ty;
		if (b === 0 && c === 0) {
			target.b = target.c = 0;
			if (a === 0 || d === 0) {
				target.a = target.d = target.tx = target.ty = 0;
			}
			else {
				a = target.a = 1 / a;
				d = target.d = 1 / d;
				target.tx = -a * tx;
				target.ty = -d * ty;
			}
			return;
		}
		var determinant = a * d - b * c;
		if (determinant === 0) {
			target.identity();
			return;
		}
		determinant = 1 / determinant;
		var k = target.a = d * determinant;
		b = target.b = -b * determinant;
		c = target.c = -c * determinant;
		d = target.d = a * determinant;
		target.tx = -(k * tx + c * ty);
		target.ty = -(b * tx + d * ty);
	}
	public rotate(angle: number): void {
		angle = +angle;
		if (angle !== 0) {
			angle = angle / (Math.PI / 180);
			var u = NumberUtils.cos(angle);
			var v = NumberUtils.sin(angle);
			var ta = this.a;
			var tb = this.b;
			var tc = this.c;
			var td = this.d;
			var ttx = this.tx;
			var tty = this.ty;
			this.a = ta * u - tb * v;
			this.b = ta * v + tb * u;
			this.c = tc * u - td * v;
			this.d = tc * v + td * u;
			this.tx = ttx * u - tty * v;
			this.ty = ttx * v + tty * u;
		}
	}
	public scale(sx: number, sy: number): void {
		if (sx !== 1) {
			this.a *= sx;
			this.c *= sx;
			this.tx *= sx;
		}
		if (sy !== 1) {
			this.b *= sy;
			this.d *= sy;
			this.ty *= sy;
		}
	}
	public setTo(a: number, b: number, c: number, d: number, tx: number, ty: number): void {
		this.a = a;
		this.b = b;
		this.c = c;
		this.d = d;
		this.tx = tx;
		this.ty = ty;
	}
	public transformPoint(pointX: number, pointY: number, resultPoint?: Point): Point {
		var x = this.a * pointX + this.c * pointY + this.tx;
		var y = this.b * pointX + this.d * pointY + this.ty;
		if (resultPoint) {
			resultPoint.setTo(x, y);
			return resultPoint;
		}
		return new Point(x, y);
	}
	public deltaTransformPoint(pointX: number, pointY: number, resultPoint?: Point): Point {
		var x = this.a * pointX + this.c * pointY;
		var y = this.b * pointX + this.d * pointY;
		if (resultPoint) {
			resultPoint.setTo(x, y);
			return resultPoint;
		}
		return new Point(x, y);
	}
	public translate(dx: number, dy: number): void {
		this.tx += dx;
		this.ty += dy;
	}
	public equals(target: Matrix): boolean {
		return this.a === target.a && this.b === target.b &&
			this.c === target.c && this.d === target.d &&
			this.tx === target.tx && this.ty === target.ty;
	}

	public prepend(a: number, b: number, c: number, d: number, tx: number, ty: number): void {
		var tx1 = this.tx;
		if (a !== 1 || b !== 0 || c !== 0 || d !== 1) {
			var a1 = this.a;
			var c1 = this.c;
			this.a = a1 * a + this.b * c;
			this.b = a1 * b + this.b * d;
			this.c = c1 * a + this.d * c;
			this.d = c1 * b + this.d * d;
		}
		this.tx = tx1 * a + this.ty * c + tx;
		this.ty = tx1 * b + this.ty * d + ty;
	}
	public append(a: number, b: number, c: number, d: number, tx: number, ty: number): void {
		var a1 = this.a;
		var b1 = this.b;
		var c1 = this.c;
		var d1 = this.d;
		if (a !== 1 || b !== 0 || c !== 0 || d !== 1) {
			this.a = a * a1 + b * c1;
			this.b = a * b1 + b * d1;
			this.c = c * a1 + d * c1;
			this.d = c * b1 + d * d1;
		}
		this.tx = tx * a1 + ty * c1 + this.tx;
		this.ty = tx * b1 + ty * d1 + this.ty;
	}
	public toString(): string {
		return '(a=' + this.a + ', b=' + this.b + ', c=' + this.c + ', d=' + this.d + ', tx=' + this.tx + ', ty=' + this.ty + ')';
	}

	public createBox(scaleX: number, scaleY: number, rotation?: number, tx?: number, ty?: number): void {
		if (rotation === void 0) { rotation = 0; }
		if (tx === void 0) { tx = 0; }
		if (ty === void 0) { ty = 0; }
		var self = this;
		if (rotation !== 0) {
			rotation = rotation / (Math.PI / 180);
			var u = NumberUtils.cos(rotation);
			var v = NumberUtils.sin(rotation);
			self.a = u * scaleX;
			self.b = v * scaleY;
			self.c = -v * scaleX;
			self.d = u * scaleY;
		}
		else {
			self.a = scaleX;
			self.b = 0;
			self.c = 0;
			self.d = scaleY;
		}
		self.tx = tx;
		self.ty = ty;
	}

	public createGradientBox(width: number, height: number, rotation?: number, tx?: number, ty?: number): void {
		if (rotation === void 0) { rotation = 0; }
		if (tx === void 0) { tx = 0; }
		if (ty === void 0) { ty = 0; }
		this.createBox(width / 1638.4, height / 1638.4, rotation, tx + width / 2, ty + height / 2);
	}
	/**
	 * @private
	 */
	public $getDeterminant(): number {
		return this.a * this.d - this.b * this.c;
	};

	/**
	 * @private
	 */
	public $getScaleX(): number {
		var m = this;
		if (m.a === 1 && m.b === 0) {
			return 1;
		}
		var result = Math.sqrt(m.a * m.a + m.b * m.b);
		return this.$getDeterminant() < 0 ? -result : result;
	};

	/**
	 * @private
	 */
	public $getScaleY(): number {
		var m = this;
		if (m.c === 0 && m.d === 1) {
			return 1;
		}
		var result = Math.sqrt(m.c * m.c + m.d * m.d);
		return this.$getDeterminant() < 0 ? -result : result;
	};

	/**
	 * @private
	 */
	public $getSkewX(): number {
		return Math.atan2(this.d, this.c) - (Math.PI / 2);
	};

	/**
	 * @private
	 */
	public $getSkewY(): number {
		return Math.atan2(this.b, this.a);
	};

	/**
	 * @private
	 */
	public $getRotation(angle: number): number {
		angle %= 360;
		if (angle > 180) {
			angle -= 360;
		}
		else if (angle < -180) {
			angle += 360;
		}
		return angle;
	};
}