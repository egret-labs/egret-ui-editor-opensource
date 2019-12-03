



const rectanglePool: Rectangle[] = [];
/**
 * A Rectangle object is an area defined by its position, as indicated by its top-left corner point (x, y) and by its
 * width and its height.<br/>
 * The x, y, width, and height properties of the Rectangle class are independent of each other; changing the value of
 * one property has no effect on the others. However, the right and bottom properties are integrally related to those
 * four properties. For example, if you change the value of the right property, the value of the width property changes;
 * if you change the bottom property, the value of the height property changes.
 * @version Egret 2.4
 * @platform Web,Native
 * @includeExample egret/geom/Rectangle.ts
 * @language en_US
 */
/**
 * Rectangle 对象是按其位置（由它左上角的点 (x, y) 确定）以及宽度和高度定义的区域。<br/>
 * Rectangle 类的 x、y、width 和 height 属性相互独立；更改一个属性的值不会影响其他属性。
 * 但是，right 和 bottom 属性与这四个属性是整体相关的。例如，如果更改 right 属性的值，则 width
 * 属性的值将发生变化；如果更改 bottom 属性，则 height 属性的值将发生变化。
 * @version Egret 2.4
 * @platform Web,Native
 * @includeExample egret/geom/Rectangle.ts
 * @language zh_CN
 */
// tslint:disable-next-line:check-comment
export class Rectangle {

	/**
	 * Releases a rectangle instance to the object pool.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 释放一个Rectangle实例到对象池
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public static release(rect: Rectangle): void {
		if (!rect) {
			return;
		}
		rectanglePool.push(rect);
	}

	/**
	 * get a rectangle instance from the object pool or create a new one.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 从对象池中取出或创建一个新的Rectangle对象。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public static create(): Rectangle {
		let rect = rectanglePool.pop();
		if (!rect) {
			rect = new Rectangle();
		}
		return rect;
	}

	/**
	 * Creates a new Rectangle object with the top-left corner specified by the x and y parameters and with the specified
	 * width and height parameters.
	 * @param x The x coordinate of the top-left corner of the rectangle.
	 * @param y The y coordinate of the top-left corner of the rectangle.
	 * @param width The width of the rectangle, in pixels.
	 * @param height The height of the rectangle, in pixels.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 创建一个新 Rectangle 对象，其左上角由 x 和 y 参数指定，并具有指定的 width 和 height 参数。
	 * @param x 矩形左上角的 x 坐标。
	 * @param y 矩形左上角的 y 坐标。
	 * @param width 矩形的宽度（以像素为单位）。
	 * @param height 矩形的高度（以像素为单位）。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public constructor(x: number = 0, y: number = 0, width: number = 0, height: number = 0) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
	}

	/**
	 * The x coordinate of the top-left corner of the rectangle.
	 * @default 0
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 矩形左上角的 x 坐标。
	 * @default 0
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public x: number;
	/**
	 * The y coordinate of the top-left corner of the rectangle.
	 * @default 0
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 矩形左上角的 y 坐标。
	 * @default 0
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public y: number;
	/**
	 * The width of the rectangle, in pixels.
	 * @default 0
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 矩形的宽度（以像素为单位）。
	 * @default 0
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public width: number;
	/**
	 * 矩形的高度（以像素为单位）。
	 * @default 0
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * The height of the rectangle, in pixels.
	 * @default 0
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	// tslint:disable-next-line:check-comment
	public height: number;

	/**
	 * The sum of the x and width properties.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * x 和 width 属性的和。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public get right(): number {
		return this.x + this.width;
	}

	public set right(value: number) {
		this.width = value - this.x;
	}

	/**
	 * The sum of the y and height properties.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * y 和 height 属性的和。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public get bottom(): number {
		return this.y + this.height;
	}

	public set bottom(value: number) {
		this.height = value - this.y;
	}

	/**
	 * The x coordinate of the top-left corner of the rectangle. Changing the left property of a Rectangle object has
	 * no effect on the y and height properties. However it does affect the width property, whereas changing the x value
	 * does not affect the width property.
	 * The value of the left property is equal to the value of the x property.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 矩形左上角的 x 坐标。更改 Rectangle 对象的 left 属性对 y 和 height 属性没有影响。但是，它会影响 width 属性，而更改 x 值不会影响 width 属性。
	 * left 属性的值等于 x 属性的值。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public get left(): number {
		return this.x;
	}

	public set left(value: number) {
		this.width += this.x - value;
		this.x = value;
	}

	/**
	 * The y coordinate of the top-left corner of the rectangle. Changing the top property of a Rectangle object has
	 * no effect on the x and width properties. However it does affect the height property, whereas changing the y
	 * value does not affect the height property.<br/>
	 * The value of the top property is equal to the value of the y property.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 矩形左上角的 y 坐标。更改 Rectangle 对象的 top 属性对 x 和 width 属性没有影响。但是，它会影响 height 属性，而更改 y 值不会影响 height 属性。<br/>
	 * top 属性的值等于 y 属性的值。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public get top(): number {
		return this.y;
	}

	public set top(value: number) {
		this.height += this.y - value;
		this.y = value;
	}

	/**
	 * The location of the Rectangle object's top-left corner, determined by the x and y coordinates of the point.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 由该点的 x 和 y 坐标确定的 Rectangle 对象左上角的位置。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public get topLeft(): Point {
		return new Point(this.left, this.top);
	}

	public set topLeft(value: Point) {
		this.top = value.y;
		this.left = value.x;
	}

	/**
	 * The location of the Rectangle object's bottom-right corner, determined by the values of the right and bottom properties.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 由 right 和 bottom 属性的值确定的 Rectangle 对象的右下角的位置。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public get bottomRight(): Point {
		return new Point(this.right, this.bottom);
	}

	public set bottomRight(value: Point) {
		this.bottom = value.y;
		this.right = value.x;
	}

	/**
	 * Copies all of rectangle data from the source Rectangle object into the calling Rectangle object.
	 * @param sourceRect The Rectangle object from which to copy the data.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 将源 Rectangle 对象中的所有矩形数据复制到调用方 Rectangle 对象中。
	 * @param sourceRect 要从中复制数据的 Rectangle 对象。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public copyFrom(sourceRect: Rectangle): Rectangle {
		this.x = sourceRect.x;
		this.y = sourceRect.y;
		this.width = sourceRect.width;
		this.height = sourceRect.height;
		return this;
	}

	/**
	 * Sets the members of Rectangle to the specified values
	 * @param x The x coordinate of the top-left corner of the rectangle.
	 * @param y The y coordinate of the top-left corner of the rectangle.
	 * @param width The width of the rectangle, in pixels.
	 * @param height The height of the rectangle, in pixels.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 将 Rectangle 的成员设置为指定值
	 * @param x 矩形左上角的 x 坐标。
	 * @param y 矩形左上角的 y 坐标。
	 * @param width 矩形的宽度（以像素为单位）。
	 * @param height 矩形的高度（以像素为单位）。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public setTo(x: number, y: number, width: number, height: number): Rectangle {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		return this;
	}

	/**
	 * Determines whether the specified point is contained within the rectangular region defined by this Rectangle object.
	 * @param x The x coordinate (horizontal position) of the point.
	 * @param y The y coordinate (vertical position) of the point.
	 * @returns A value of true if the Rectangle object contains the specified point; otherwise false.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 确定由此 Rectangle 对象定义的矩形区域内是否包含指定的点。
	 * @param x 检测点的x轴
	 * @param y 检测点的y轴
	 * @returns 如果检测点位于矩形内，返回true，否则，返回false
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public contains(x: number, y: number): boolean {
		return this.x <= x &&
			this.x + this.width >= x &&
			this.y <= y &&
			this.y + this.height >= y;
	}

	/**
	 * If the Rectangle object specified in the toIntersect parameter intersects with this Rectangle object, returns
	 * the area of intersection as a Rectangle object. If the rectangles do not intersect, this method returns an empty
	 * Rectangle object with its properties set to 0.
	 * @param toIntersect The Rectangle object to compare against to see if it intersects with this Rectangle object.
	 * @returns A Rectangle object that equals the area of intersection. If the rectangles do not intersect, this method
	 * returns an empty Rectangle object; that is, a rectangle with its x, y, width, and height properties set to 0.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 如果在 toIntersect 参数中指定的 Rectangle 对象与此 Rectangle 对象相交，则返回交集区域作为 Rectangle 对象。如果矩形不相交，
	 * 则此方法返回一个空的 Rectangle 对象，其属性设置为 0。
	 * @param toIntersect 要对照比较以查看其是否与此 Rectangle 对象相交的 Rectangle 对象。
	 * @returns 等于交集区域的 Rectangle 对象。如果该矩形不相交，则此方法返回一个空的 Rectangle 对象；即，其 x、y、width 和
	 * height 属性均设置为 0 的矩形。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public intersection(toIntersect: Rectangle): Rectangle {
		return this.clone().$intersectInPlace(toIntersect);
	}

	/**
	 * Increases the size of the Rectangle object by the specified amounts, in pixels.
	 * The center point of the Rectangle object stays the same, and its size increases to the left and right by the dx value, and to the top and the bottom by the dy value.
	 * @param dx The value to be added to the left and the right of the Rectangle object.
	 * @param dy The value to be added to the top and the bottom of the Rectangle.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 按指定量增加 Rectangle 对象的大小（以像素为单位）
	 * 保持 Rectangle 对象的中心点不变，使用 dx 值横向增加它的大小，使用 dy 值纵向增加它的大小。
	 * @param dx Rectangle 对象横向增加的值。
	 * @param dy Rectangle 对象纵向增加的值。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public inflate(dx: number, dy: number): void {
		this.x -= dx;
		this.width += 2 * dx;
		this.y -= dy;
		this.height += 2 * dy;
	}

	/**
	 * @private
	 */
	// tslint:disable-next-line:check-comment
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

	/**
	 * Determines whether the object specified in the toIntersect parameter intersects with this Rectangle object.
	 * This method checks the x, y, width, and height properties of the specified Rectangle object to see if it
	 * intersects with this Rectangle object.
	 * @param toIntersect The Rectangle object to compare against this Rectangle object.
	 * @returns A value of true if the specified object intersects with this Rectangle object; otherwise false.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 确定在 toIntersect 参数中指定的对象是否与此 Rectangle 对象相交。此方法检查指定的 Rectangle
	 * 对象的 x、y、width 和 height 属性，以查看它是否与此 Rectangle 对象相交。
	 * @param toIntersect 要与此 Rectangle 对象比较的 Rectangle 对象。
	 * @returns 如果两个矩形相交，返回true，否则返回false
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public intersects(toIntersect: Rectangle): boolean {
		return Math.max(this.x, toIntersect.x) <= Math.min(this.right, toIntersect.right)
			&& Math.max(this.y, toIntersect.y) <= Math.min(this.bottom, toIntersect.bottom);
	}

	/**
	 * Determines whether or not this Rectangle object is empty.
	 * @returns A value of true if the Rectangle object's width or height is less than or equal to 0; otherwise false.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 确定此 Rectangle 对象是否为空。
	 * @returns 如果 Rectangle 对象的宽度或高度小于等于 0，则返回 true 值，否则返回 false。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public isEmpty(): boolean {
		return this.width <= 0 || this.height <= 0;
	}

	/**
	 * Sets all of the Rectangle object's properties to 0. A Rectangle object is empty if its width or height is less than or equal to 0.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 将 Rectangle 对象的所有属性设置为 0。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public setEmpty(): void {
		this.x = 0;
		this.y = 0;
		this.width = 0;
		this.height = 0;
	}

	/**
	 * Returns a new Rectangle object with the same values for the x, y, width, and height properties as the original Rectangle object.
	 * @returns A new Rectangle object with the same values for the x, y, width, and height properties as the original Rectangle object.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 返回一个新的 Rectangle 对象，其 x、y、width 和 height 属性的值与原始 Rectangle 对象的对应值相同。
	 * @returns 新的 Rectangle 对象，其 x、y、width 和 height 属性的值与原始 Rectangle 对象的对应值相同。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public clone(): Rectangle {
		return new Rectangle(this.x, this.y, this.width, this.height);
	}

	/**
	 * Determines whether the specified point is contained within the rectangular region defined by this Rectangle object.
	 * This method is similar to the Rectangle.contains() method, except that it takes a Point object as a parameter.
	 * @param point The point, as represented by its x and y coordinates.
	 * @returns A value of true if the Rectangle object contains the specified point; otherwise false.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 确定由此 Rectangle 对象定义的矩形区域内是否包含指定的点。
	 * 此方法与 Rectangle.contains() 方法类似，只不过它采用 Point 对象作为参数。
	 * @param point 包含点对象
	 * @returns 如果包含，返回true，否则返回false
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public containsPoint(point: Point): boolean {
		if (this.x <= point.x
			&& this.x + this.width > point.x
			&& this.y <= point.y
			&& this.y + this.height > point.y) {
			return true;
		}
		return false;
	}

	/**
	 * Determines whether the Rectangle object specified by the rect parameter is contained within this Rectangle object.
	 * A Rectangle object is said to contain another if the second Rectangle object falls entirely within the boundaries of the first.
	 * @param rect The Rectangle object being checked.
	 * @returns A value of true if the Rectangle object that you specify is contained by this Rectangle object; otherwise false.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 确定此 Rectangle 对象内是否包含由 rect 参数指定的 Rectangle 对象。
	 * 如果一个 Rectangle 对象完全在另一个 Rectangle 的边界内，我们说第二个 Rectangle 包含第一个 Rectangle。
	 * @param rect 所检查的 Rectangle 对象
	 * @returns 如果此 Rectangle 对象包含您指定的 Rectangle 对象，则返回 true 值，否则返回 false。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public containsRect(rect: egret.Rectangle): boolean {
		const r1 = rect.x + rect.width;
		const b1 = rect.y + rect.height;
		const r2 = this.x + this.width;
		const b2 = this.y + this.height;
		return (rect.x >= this.x) && (rect.x < r2) && (rect.y >= this.y) && (rect.y < b2) && (r1 > this.x) && (r1 <= r2) && (b1 > this.y) && (b1 <= b2);
	}

	/**
	 * Determines whether the object specified in the toCompare parameter is equal to this Rectangle object.
	 * This method compares the x, y, width, and height properties of an object against the same properties of this Rectangle object.
	 * @param The rectangle to compare to this Rectangle object.
	 * @returns A value of true if the object has exactly the same values for the x, y, width, and height properties as this Rectangle object; otherwise false.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 确定在 toCompare 参数中指定的对象是否等于此 Rectangle 对象。
	 * 此方法将某个对象的 x、y、width 和 height 属性与此 Rectangle 对象所对应的相同属性进行比较。
	 * @param toCompare 要与此 Rectangle 对象进行比较的矩形。
	 * @returns 如果对象具有与此 Rectangle 对象完全相同的 x、y、width 和 height 属性值，则返回 true 值，否则返回 false。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public equals(toCompare: Rectangle): boolean {
		if (this === toCompare) {
			return true;
		}
		return this.x === toCompare.x && this.y === toCompare.y
			&& this.width === toCompare.width && this.height === toCompare.height;
	}

	/**
	 * Increases the size of the Rectangle object. This method is similar to the Rectangle.inflate() method except it takes a Point object as a parameter.
	 * @param point 此 Point 对象的 x 属性用于增加 Rectangle 对象的水平尺寸。y 属性用于增加 Rectangle 对象的垂直尺寸。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 增加 Rectangle 对象的大小。此方法与 Rectangle.inflate() 方法类似，只不过它采用 Point 对象作为参数。
	 * @param point The x property of this Point object is used to increase the horizontal dimension of the Rectangle object. The y property is used to increase the vertical dimension of the Rectangle object.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public inflatePoint(point: Point): void {
		this.inflate(point.x, point.y);
	}

	/**
	 * Adjusts the location of the Rectangle object, as determined by its top-left corner, by the specified amounts.
	 * @param dx Moves the x value of the Rectangle object by this amount.
	 * @param dy Moves the y value of the Rectangle object by this amount.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 按指定量调整 Rectangle 对象的位置（由其左上角确定）。
	 * @param dx 将 Rectangle 对象的 x 值移动此数量。
	 * @param dy 将 Rectangle 对象的 t 值移动此数量。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public offset(dx: number, dy: number): void {
		this.x += dx;
		this.y += dy;
	}

	/**
	 * Adjusts the location of the Rectangle object using a Point object as a parameter. This method is similar to the Rectangle.offset() method, except that it takes a Point object as a parameter.
	 * @param point A Point object to use to offset this Rectangle object.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 将 Point 对象用作参数来调整 Rectangle 对象的位置。此方法与 Rectangle.offset() 方法类似，只不过它采用 Point 对象作为参数。
	 * @param point 要用于偏移此 Rectangle 对象的 Point 对象。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public offsetPoint(point: Point): void {
		this.offset(point.x, point.y);
	}

	/**
	 * Builds and returns a string that lists the horizontal and vertical positions and the width and height of the Rectangle object.
	 * @returns A string listing the value of each of the following properties of the Rectangle object: x, y, width, and height.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 生成并返回一个字符串，该字符串列出 Rectangle 对象的水平位置和垂直位置以及高度和宽度。
	 * @returns 一个字符串，它列出了 Rectangle 对象的下列各个属性的值：x、y、width 和 height。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public toString(): string {
		return '(x=' + this.x + ', y=' + this.y + ', width=' + this.width + ', height=' + this.height + ')';
	}

	/**
	 * Adds two rectangles together to create a new Rectangle object, by filling in the horizontal and vertical space between the two rectangles.
	 * @param toUnion A Rectangle object to add to this Rectangle object.
	 * @returns A new Rectangle object that is the union of the two rectangles.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 通过填充两个矩形之间的水平和垂直空间，将这两个矩形组合在一起以创建一个新的 Rectangle 对象。
	 * @param toUnion 要添加到此 Rectangle 对象的 Rectangle 对象。
	 * @returns 充当两个矩形的联合的新 Rectangle 对象。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
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

	/**
	 * @private
	 */
	// tslint:disable-next-line:check-comment
	$getBaseWidth(angle: number): number {
		const u = Math.abs(Math.cos(angle));
		const v = Math.abs(Math.sin(angle));
		return u * this.width + v * this.height;
	}

	/**
	 * @private
	 */
	// tslint:disable-next-line:check-comment
	$getBaseHeight(angle: number): number {
		const u = Math.abs(Math.cos(angle));
		const v = Math.abs(Math.sin(angle));
		return v * this.width + u * this.height;
	}
}

/**
 * @private
 * 仅供框架内复用，要防止暴露引用到外部。
 */
export const $TempRectangle = new Rectangle();



const pointPool: Point[] = [];

/**
 * The Point object represents a location in a two-dimensional coordinate system, where x represents the horizontal
 * axis and y represents the vertical axis.
 * @version Egret 2.4
 * @platform Web,Native
 * @includeExample egret/geom/Point.ts
 * @language en_US
 */
/**
 * Point 对象表示二维坐标系统中的某个位置，其中 x 表示水平轴，y 表示垂直轴。
 * @version Egret 2.4
 * @platform Web,Native
 * @includeExample egret/geom/Point.ts
 * @language zh_CN
 */
// tslint:disable-next-line:check-comment
export class Point {

	/**
	 * Releases a point instance to the object pool
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 释放一个Point实例到对象池
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public static release(point: Point): void {
		if (!point) {
			return;
		}
		pointPool.push(point);
	}

	/**
	 * get a point instance from the object pool or create a new one.
	 * @param x The horizontal coordinate.
	 * @param y The vertical coordinate.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 从对象池中取出或创建一个新的Point对象。
	 * @param x 该对象的x属性值，默认为0
	 * @param y 该对象的y属性值，默认为0
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public static create(x: number, y: number): Point {
		let point = pointPool.pop();
		if (!point) {
			point = new Point();
		}
		return point.setTo(x, y);
	}
	/**
	 * Creates a new point. If you pass no parameters to this method, a point is created at (0,0).
	 * @param x The horizontal coordinate.
	 * @param y The vertical coordinate.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 创建一个 egret.Point 对象.若不传入任何参数，将会创建一个位于（0，0）位置的点。
	 * @param x 该对象的x属性值，默认为0
	 * @param y 该对象的y属性值，默认为0
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public constructor(x: number = 0, y: number = 0) {
		this.x = x;
		this.y = y;
	}

	/**
	 * The horizontal coordinate.
	 * @default 0
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 该点的水平坐标。
	 * @default 0
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public x: number;
	/**
	 * The vertical coordinate.
	 * @default 0
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 该点的垂直坐标。
	 * @default 0
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public y: number;

	/**
	 * The length of the line segment from (0,0) to this point.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 从 (0,0) 到此点的线段长度。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public get length(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}
	/**
	 * Sets the members of Point to the specified values
	 * @param x The horizontal coordinate.
	 * @param y The vertical coordinate.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 将 Point 的成员设置为指定值
	 * @param x 该对象的x属性值
	 * @param y 该对象的y属性值
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public setTo(x: number, y: number): Point {
		this.x = x;
		this.y = y;
		return this;
	}

	/**
	 * Creates a copy of this Point object.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 克隆点对象
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public clone(): Point {
		return new Point(this.x, this.y);
	}


	/**
	 * Determines whether two points are equal. Two points are equal if they have the same x and y values.
	 * @param toCompare The point to be compared.
	 * @returns A value of true if the object is equal to this Point object; false if it is not equal.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 确定两个点是否相同。如果两个点具有相同的 x 和 y 值，则它们是相同的点。
	 * @param toCompare 要比较的点。
	 * @returns 如果该对象与此 Point 对象相同，则为 true 值，如果不相同，则为 false。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public equals(toCompare: Point): boolean {
		return this.x == toCompare.x && this.y == toCompare.y;
	}

	/**
	 * Returns the distance between pt1 and pt2.
	 * @param p1 The first point.
	 * @param p2 The second point.
	 * @returns The distance between the first and second points.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 返回 pt1 和 pt2 之间的距离。
	 * @param p1 第一个点
	 * @param p2 第二个点
	 * @returns 第一个点和第二个点之间的距离。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public static distance(p1: Point, p2: Point): number {
		return Math.sqrt((p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y));
	}

	/**
	 * Copies all of the point data from the source Point object into the calling Point object.
	 * @param sourcePoint The Point object from which to copy the data.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 将源 Point 对象中的所有点数据复制到调用方 Point 对象中。
	 * @param sourcePoint 要从中复制数据的 Point 对象。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public copyFrom(sourcePoint: Point): void {
		this.x = sourcePoint.x;
		this.y = sourcePoint.y;
	}

	/**
	 * Adds the coordinates of another point to the coordinates of this point to create a new point.
	 * @param v The point to be added.
	 * @returns The new point.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 将另一个点的坐标添加到此点的坐标以创建一个新点。
	 * @param v 要添加的点。
	 * @returns 新点。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public add(v: Point): Point {
		return new Point(this.x + v.x, this.y + v.y);
	}

	/**
	 * Determines a point between two specified points.
	 * The parameter f determines where the new interpolated point is located relative to the two end points specified by parameters pt1 and pt2. The closer the value of the parameter f is to 1.0, the closer the interpolated point is to the first point (parameter pt1). The closer the value of the parameter f is to 0, the closer the interpolated point is to the second point (parameter pt2).
	 * @param pt1 The first point.
	 * @param pt2 The second point.
	 * @param f The level of interpolation between the two points. Indicates where the new point will be, along the line between pt1 and pt2. If f=1, pt1 is returned; if f=0, pt2 is returned.
	 * @returns The new interpolated point.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 确定两个指定点之间的点。
	 * 参数 f 确定新的内插点相对于参数 pt1 和 pt2 指定的两个端点所处的位置。参数 f 的值越接近 1.0，则内插点就越接近第一个点（参数 pt1）。参数 f 的值越接近 0，则内插点就越接近第二个点（参数 pt2）。
	 * @param pt1 第一个点。
	 * @param pt2 第二个点。
	 * @param f 两个点之间的内插级别。表示新点将位于 pt1 和 pt2 连成的直线上的什么位置。如果 f=1，则返回 pt1；如果 f=0，则返回 pt2。
	 * @returns 新的内插点。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public static interpolate(pt1: Point, pt2: Point, f: number): Point {
		const f1: number = 1 - f;
		return new Point(pt1.x * f + pt2.x * f1, pt1.y * f + pt2.y * f1);
	}

	/**
	 * Scales the line segment between (0,0) and the current point to a set length.
	 * @param thickness The scaling value. For example, if the current point is (0,5), and you normalize it to 1, the point returned is at (0,1).
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 将 (0,0) 和当前点之间的线段缩放为设定的长度。
	 * @param thickness 缩放值。例如，如果当前点为 (0,5) 并且您将它规范化为 1，则返回的点位于 (0,1) 处。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public normalize(thickness: number): void {
		if (this.x != 0 || this.y != 0) {
			const relativeThickness: number = thickness / this.length;
			this.x *= relativeThickness;
			this.y *= relativeThickness;
		}
	}

	/**
	 * Offsets the Point object by the specified amount. The value of dx is added to the original value of x to create the new x value. The value of dy is added to the original value of y to create the new y value.
	 * @param dx The amount by which to offset the horizontal coordinate, x.
	 * @param dy The amount by which to offset the vertical coordinate, y.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 按指定量偏移 Point 对象。dx 的值将添加到 x 的原始值中以创建新的 x 值。dy 的值将添加到 y 的原始值中以创建新的 y 值。
	 * @param dx 水平坐标 x 的偏移量。
	 * @param dy 水平坐标 y 的偏移量。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public offset(dx: number, dy: number): void {
		this.x += dx;
		this.y += dy;
	}

	/**
	 * Converts a pair of polar coordinates to a Cartesian point coordinate.
	 * @param len The length coordinate of the polar pair.
	 * @param angle The angle, in radians, of the polar pair.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 将一对极坐标转换为笛卡尔点坐标。
	 * @param len 极坐标对的长度。
	 * @param angle 极坐标对的角度（以弧度表示）。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public static polar(len: number, angle: number): Point {
		return new Point(len * NumberUtils.cos(angle / DEG_TO_RAD), len * NumberUtils.sin(angle / DEG_TO_RAD));
	}

	/**
	 * Subtracts the coordinates of another point from the coordinates of this point to create a new point.
	 * @param v The point to be subtracted.
	 * @returns The new point.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 从此点的坐标中减去另一个点的坐标以创建一个新点。
	 * @param v 要减去的点。
	 * @returns 新点。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public subtract(v: Point): Point {
		return new Point(this.x - v.x, this.y - v.y);
	}

	/**
	 * Returns a string that contains the values of the x and y coordinates. The string has the form '(x=x, y=y)', so calling the toString() method for a point at 23,17 would return '(x=23, y=17)'.
	 * @returns The string representation of the coordinates.
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 返回包含 x 和 y 坐标的值的字符串。该字符串的格式为 '(x=x, y=y)'，因此为点 23,17 调用 toString() 方法将返回 '(x=23, y=17)'。
	 * @returns 坐标的字符串表示形式。
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public toString(): string {
		return '(x=' + this.x + ', y=' + this.y + ')';
	}
}

/**
 * @private
 * 仅供框架内复用，要防止暴露引用到外部。
 */
export const $TempPoint = new Point();

//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-present, Egret Technology.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS 'AS IS' AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////



/**
 * @version Egret 2.4
 * @platform Web,Native
 */
// tslint:disable-next-line:check-comment
export class NumberUtils {

	/**
	 * Judge whether it is a numerical value
	 * @param value Parameter that needs to be judged
	 * @returns 
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 判断是否是数值
	 * @param value 需要判断的参数
	 * @returns
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public static isNumber(value: any): boolean {
		return typeof (value) === 'number' && !isNaN(value);
	}

	/**
	 * Obtain the approximate sin value of the corresponding angle value
	 * @param value {number} Angle value
	 * @returns {number} sin value
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 得到对应角度值的sin近似值
	 * @param value {number} 角度值
	 * @returns {number} sin值
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public static sin(value: number): number {
		const valueFloor: number = Math.floor(value);
		const valueCeil: number = valueFloor + 1;
		const resultFloor: number = NumberUtils.sinInt(valueFloor);
		if (valueFloor == value) {
			return resultFloor;
		}
		const resultCeil: number = NumberUtils.sinInt(valueCeil);

		return (value - valueFloor) * resultCeil + (valueCeil - value) * resultFloor;
	}

	/**
	 * @private
	 * 
	 * @param value 
	 * @returns 
	 */
	// tslint:disable-next-line:check-comment
	private static sinInt(value: number): number {
		value = value % 360;
		if (value < 0) {
			value += 360;
		}
		return egret_sin_map[value];
	}

	/**
	 * Obtain the approximate cos value of the corresponding angle value
	 * @param value {number} Angle value
	 * @returns {number} cos value
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language en_US
	 */
	/**
	 * 得到对应角度值的cos近似值
	 * @param value {number} 角度值
	 * @returns {number} cos值
	 * @version Egret 2.4
	 * @platform Web,Native
	 * @language zh_CN
	 */
	public static cos(value: number): number {
		const valueFloor: number = Math.floor(value);
		const valueCeil: number = valueFloor + 1;
		const resultFloor: number = NumberUtils.cosInt(valueFloor);
		if (valueFloor == value) {
			return resultFloor;
		}
		const resultCeil: number = NumberUtils.cosInt(valueCeil);

		return (value - valueFloor) * resultCeil + (valueCeil - value) * resultFloor;
	}

	/**
	 * @private
	 * 
	 * @param value 
	 * @returns 
	 */
	// tslint:disable-next-line:check-comment
	private static cosInt(value: number): number {
		value = value % 360;
		if (value < 0) {
			value += 360;
		}
		return egret_cos_map[value];
	}

}

/**
 * @private
 */
const egret_sin_map = {};
/**
 * @private
 */
const egret_cos_map = {};
/**
 * @private
 */
const DEG_TO_RAD: number = Math.PI / 180;

for (let NumberUtils_i = 0; NumberUtils_i < 360; NumberUtils_i++) {
	egret_sin_map[NumberUtils_i] = Math.sin(NumberUtils_i * DEG_TO_RAD);
	egret_cos_map[NumberUtils_i] = Math.cos(NumberUtils_i * DEG_TO_RAD);
}
egret_sin_map[90] = 1;
egret_cos_map[90] = 0;
egret_sin_map[180] = 0;
egret_cos_map[180] = -1;
egret_sin_map[270] = -1;
egret_cos_map[270] = 0;

//对未提供bind的浏览器实现bind机制
if (!Function.prototype.bind) {
	Function.prototype.bind = function (oThis) {
		if (typeof this !== 'function') {
			// closest thing possible to the ECMAScript 5 internal IsCallable function
			egret.$error(1029);
		}

		const aArgs = Array.prototype.slice.call(arguments, 1),
			fToBind = this,
			fNOP = function () {
			},
			fBound = function () {
				return fToBind.apply(this instanceof fNOP && oThis
					? this
					: oThis,
					aArgs.concat(Array.prototype.slice.call(arguments)));
			};

		fNOP.prototype = this.prototype;
		fBound.prototype = new fNOP();

		return fBound;
	};
}