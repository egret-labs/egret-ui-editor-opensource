import { INode } from './treeNodes';

/**
 * 为对象实例提供唯一的hashCode值。
 */
export interface IHashObject {
	/**
	 * 返回此对象唯一的哈希值,用于唯一确定一个对象。hashCode为大于等于1的整数。
	 */
	hashCode: number;
}


export let $hashCount: number = 1;
/**
 * 为对象实例提供唯一的hashCode值。
 */
export class HashObject implements IHashObject {
	public constructor() {
		this.$hashCode = $hashCount++;
	}
	$hashCode: number;
	/**
	 * 返回此对象唯一的哈希值,用于唯一确定一个对象。hashCode为大于等于1的整数。
	 */
	public get hashCode(): number {
		return this.$hashCode;
	}
}



/**
 * 矩形
 * @tslint false
 */
export class Rectangle {
	constructor(x: number = 0, y: number = 0, width: number = 0, height: number = 0) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}
	public x: number;
	public y: number;
	public width: number;
	public height: number;
	public get right(): number {
		return this.x + this.width;
	}
	public set right(value: number) {
		this.width = value - this.x;
	}
	public get bottom(): number {
		return this.y + this.height;
	}
	public set bottom(value: number) {
		this.height = value - this.y;
	}
	public get left(): number {
		return this.x;
	}
	public set left(value: number) {
		this.width += this.x - value;
		this.x = value;
	}
	public get top(): number {
		return this.y;
	}
	public set top(value: number) {
		this.height += this.y - value;
		this.y = value;
	}
	public get topLeft(): Point {
		return new Point(this.left, this.top);
	}
	public set topLeft(value: Point) {
		this.top = value.y;
		this.left = value.x;
	}
	public get bottomRight(): Point {
		return new Point(this.right, this.bottom);
	}
	public set bottomRight(value: Point) {
		this.bottom = value.y;
		this.right = value.x;
	}
	public copyFrom(sourceRect: Rectangle): Rectangle {
		this.x = sourceRect.x;
		this.y = sourceRect.y;
		this.width = sourceRect.width;
		this.height = sourceRect.height;
		return this;
	}
	public setTo(x: number, y: number, width: number, height: number): Rectangle {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		return this;
	}
	public contains(x: number, y: number): boolean {
		return this.x <= x &&
			this.x + this.width >= x &&
			this.y <= y &&
			this.y + this.height >= y;
	}
	public intersection(toIntersect: Rectangle): Rectangle {
		return this.clone().$intersectInPlace(toIntersect);
	}
	public inflate(dx: number, dy: number): void {
		this.x -= dx;
		this.width += 2 * dx;
		this.y -= dy;
		this.height += 2 * dy;
	}
	$intersectInPlace(clipRect: Rectangle): Rectangle {
		const x0 = this.x;
		const y0 = this.y;
		const x1 = clipRect.x;
		const y1 = clipRect.y;
		const l = Math.max(x0, x1);
		const r = Math.min(x0 + this.width, x1 + clipRect.width);
		if (l <= r) {
			const t = Math.max(y0, y1);
			const b = Math.min(y0 + this.height, y1 + clipRect.height);
			if (t <= b) {
				this.setTo(l, t, r - l, b - t);
				return this;
			}
		}
		this.setEmpty();
		return this;
	}
	public intersects(toIntersect: Rectangle): boolean {
		return Math.max(this.x, toIntersect.x) <= Math.min(this.right, toIntersect.right)
			&& Math.max(this.y, toIntersect.y) <= Math.min(this.bottom, toIntersect.bottom);
	}
	public isEmpty(): boolean {
		return this.width <= 0 || this.height <= 0;
	}
	public setEmpty(): void {
		this.x = 0;
		this.y = 0;
		this.width = 0;
		this.height = 0;
	}
	public clone(): Rectangle {
		return new Rectangle(this.x, this.y, this.width, this.height);
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
	public containsRect(rect: Rectangle): boolean {
		const r1 = rect.x + rect.width;
		const b1 = rect.y + rect.height;
		const r2 = this.x + this.width;
		const b2 = this.y + this.height;
		return (rect.x >= this.x) && (rect.x < r2) && (rect.y >= this.y) && (rect.y < b2) && (r1 > this.x) && (r1 <= r2) && (b1 > this.y) && (b1 <= b2);
	}
	public equals(toCompare: Rectangle): boolean {
		if (this === toCompare) {
			return true;
		}
		return this.x === toCompare.x && this.y === toCompare.y
			&& this.width === toCompare.width && this.height === toCompare.height;
	}
	public inflatePoint(point: Point): void {
		this.inflate(point.x, point.y);
	}
	public offset(dx: number, dy: number): void {
		this.x += dx;
		this.y += dy;
	}
	public offsetPoint(point: Point): void {
		this.offset(point.x, point.y);
	}
	public toString(): string {
		return '(x=' + this.x + ', y=' + this.y + ', width=' + this.width + ', height=' + this.height + ')';
	}
	public union(toUnion: Rectangle): Rectangle {
		const result = this.clone();
		if (toUnion.isEmpty()) {
			return result;
		}
		if (result.isEmpty()) {
			result.copyFrom(toUnion);
			return result;
		}
		const l: number = Math.min(result.x, toUnion.x);
		const t: number = Math.min(result.y, toUnion.y);
		result.setTo(l, t,
			Math.max(result.right, toUnion.right) - l,
			Math.max(result.bottom, toUnion.bottom) - t);
		return result;
	}

	$getBaseWidth(angle: number): number {
		const u = Math.abs(Math.cos(angle));
		const v = Math.abs(Math.sin(angle));
		return u * this.width + v * this.height;
	}
	$getBaseHeight(angle: number): number {
		const u = Math.abs(Math.cos(angle));
		const v = Math.abs(Math.sin(angle));
		return v * this.width + u * this.height;
	}
}
/**
 * 点
 * @tslint false
 */
export class Point {
	public constructor(x: number = 0, y: number = 0) {
		this.x = x;
		this.y = y;
	}
	public x: number;
	public y: number;
	public get length(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
	public setTo(x: number, y: number): Point {
		this.x = x;
		this.y = y;
		return this;
	}
	public clone(): Point {
		return new Point(this.x, this.y);
	}
	public equals(toCompare: Point): boolean {
		return this.x == toCompare.x && this.y == toCompare.y;
	}
	public copyFrom(sourcePoint: Point): void {
		this.x = sourcePoint.x;
		this.y = sourcePoint.y;
	}
	public add(v: Point): Point {
		return new Point(this.x + v.x, this.y + v.y);
	}
	public static interpolate(pt1: Point, pt2: Point, f: number): Point {
		const f1: number = 1 - f;
		return new Point(pt1.x * f + pt2.x * f1, pt1.y * f + pt2.y * f1);
	}
	public normalize(thickness: number): void {
		if (this.x != 0 || this.y != 0) {
			const relativeThickness: number = thickness / this.length;
			this.x *= relativeThickness;
			this.y *= relativeThickness;
		}
	}
	public offset(dx: number, dy: number): void {
		this.x += dx;
		this.y += dy;
	}
	public subtract(v: Point): Point {
		return new Point(this.x - v.x, this.y - v.y);
	}
	public toString(): string {
		return '(x=' + this.x + ', y=' + this.y + ')';
	}
}



/**
 * 转换本地矩形区域到舞台矩形区域
 * @param rect 本地的矩形区域
 * @param parent 矩形区域所在的父级容器。
 */
export function localToGlobal(rect: any, parent: any): Rectangle {
	if (!parent || !('localToGlobal' in parent)) {
		return rect;
	}
	let topLeft: any;
	let bottomRight: any;
	if ('topLeft' in rect && 'bottomRight' in rect) {
		topLeft = parent.localToGlobal(rect.topLeft.x, rect.topLeft.y);
		bottomRight = parent.localToGlobal(rect.bottomRight.x, rect.bottomRight.y);
	} else if ('left' in rect && 'top' in rect && 'right' in rect && 'bottom' in rect) {
		topLeft = parent.localToGlobal(rect.left, rect.top);
		bottomRight = parent.localToGlobal(rect.right, rect.bottom);
	}

	const newRect: Rectangle = new Rectangle();
	newRect.top = topLeft.y;
	newRect.left = topLeft.x;
	newRect.bottom = bottomRight.y;
	newRect.right = bottomRight.x;
	return newRect;
}


/**
 * 转换舞台矩形区域到本地矩形区域
 * @param rect 舞台的矩形区域
 * @param parent 矩形区域所在的父级容器。
 */
export function globalToLocal(rect: any, parent: any): Rectangle {
	if (!parent || !('globalToLocal' in parent)) {
		return rect;
	}

	let topLeft: any;
	let bottomRight: any;

	if ('topLeft' in rect && 'bottomRight' in rect) {
		topLeft = parent.globalToLocal(rect.topLeft.x, rect.topLeft.y);
		bottomRight = parent.globalToLocal(rect.bottomRight.x, rect.bottomRight.y);
	} else if ('left' in rect && 'top' in rect && 'right' in rect && 'bottom' in rect) {
		topLeft = parent.globalToLocal(rect.left, rect.top);
		bottomRight = parent.globalToLocal(rect.right, rect.bottom);
	}

	const newRect: Rectangle = new Rectangle();
	newRect.top = topLeft.y;
	newRect.left = topLeft.x;
	newRect.bottom = bottomRight.y;
	newRect.right = bottomRight.x;
	return newRect;
}

/**
 * 获取布局的矩形
 */
export function layoutRect(targetNode: INode): Rectangle {
	try {
		let bounds: any = targetNode.getExmlConfig().getInstanceByName('egret.Rectangle');
		if (bounds && 'getLayoutBounds' in targetNode.getInstance()) {
			bounds = targetNode.getInstance().getLayoutBounds(bounds);
		}
		const newRect: Rectangle = new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);
		return newRect;
	}
	catch (error) { }
	return new Rectangle();
}