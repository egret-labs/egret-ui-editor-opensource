import { Point } from "../../data/Point";

export class RadiusUtil {
	public static calculateRadius(A: Point, B: Point): number {
		var vx: number = B.x - A.x;
		var vy: number = B.y - A.y;
		var value: number = Math.atan(vy / vx) * 180 / Math.PI;
		if (vx < 0) {
			value = 180 + value;
		}
		if (vx >= 0 && vy < 0) {
			value = 360 + value;
		}
		if (!value) {
			value = 0;
		}
		return value;
	}
	public static calculateIncludedRadius(A: Point, B: Point): number {
		var p: Point = new Point();
		var radiuA: number = this.calculateRadius(p, A);
		var radiuB: number = this.calculateRadius(p, B);
		var vRadiu: number = radiuA - radiuB;
		if (vRadiu > 180) {
			vRadiu -= 360;
		}
		return vRadiu;
	}
	public static calculatePoint(P: Point, angle: number): Point {
		var vx: number = Math.cos(Math.PI * angle / 180.0) * P.x - Math.sin(Math.PI * angle / 180.0) * P.y;
		var vy: number = Math.cos(Math.PI * angle / 180.0) * P.y + Math.sin(Math.PI * angle / 180.0) * P.x;
		return new Point(vx, vy);
	}
	public static restrictRadiusRange(angle: number): number {
		if (angle > 360) {
			return angle % 360;
		}
		while (angle < 0) {
			angle += 360;
		}
		return angle;
	}
}