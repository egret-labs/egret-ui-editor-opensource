/**
 * */
export class P9TPoint {
	public x: number;
	public y: number;
	public pointName: string;
	constructor(name: string, x: number = 0, y: number = 0) {
		this.x = x;
		this.y = y;
		this.pointName = name;
	}
}