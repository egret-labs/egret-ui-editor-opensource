export class Point {
	public x: number;
	public y: number;

	constructor(x: number = 0, y: number = 0) {
		this.x = x;
		this.y = y;
	}

	public setTo(x: number, y: number): void {
		this.x = x;
		this.y = y;
	}

	public clone(): Point {
		return new Point(this.x, this.y);
	}

	public toString(): string {
		return '(x:' + this.x + ',y:' + this.y + ')';
	}
}