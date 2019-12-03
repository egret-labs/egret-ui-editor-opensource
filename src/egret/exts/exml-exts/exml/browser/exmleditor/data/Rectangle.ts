import { Point } from "./Point";

export class Rectangle {
	public x: number;
	public y: number;
	public width: number;
	public height: number;
	constructor(x: number = 0, y: number = 0, width: number = 0, height: number = 0) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}

	public containsPoint(point: Point): boolean {
		if (this.x <= point.x
			&& this.x + this.width > point.x
			&& this.y <= point.y
			&& this.y + this.height > point.y) {
			return true;
		}
		return false;
	}
	public intersects(toIntersect: Rectangle) {
		return Math.max(this.x, toIntersect.x) <= Math.min(this.x + this.width, toIntersect.x + toIntersect.width)
			&& Math.max(this.y, toIntersect.y) <= Math.min(this.y + this.height, toIntersect.y + toIntersect.height);
	};

	public containsRect(rect): boolean {
		var r1 = rect.x + rect.width;
		var b1 = rect.y + rect.height;
		var r2 = this.x + this.width;
		var b2 = this.y + this.height;
		return (rect.x >= this.x) && (rect.x < r2) && (rect.y >= this.y) && (rect.y < b2) && (r1 > this.x) && (r1 <= r2) && (b1 > this.y) && (b1 <= b2);
	};

	public clone(): Rectangle {
		return new Rectangle(this.x, this.y, this.width, this.height);
	}
}