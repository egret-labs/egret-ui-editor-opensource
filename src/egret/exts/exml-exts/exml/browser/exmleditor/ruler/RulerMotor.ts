/**标尺驱动器 
*/
export class RulerMotor {
	constructor(scale: number = 1, transfromunit: number = 1, minmarklength: number = 50) {
		this._scale = scale;
		this._transformUint = transfromunit;
		this._minMarkLength = minmarklength;
		this.calculate();
	}

	private _transformUint: number = 1;
	public set transformUint(v: number) {
		if (this._transformUint !== v) {
			this._transformUint = v;
			this.calculate();
		}
	}
	public get transformUint(): number {
		return this._transformUint;
	}
	private _scale: number;
	public set scale(v: number) {
		if (this._scale !== v) {
			this._scale = Math.max(v, 0.0001);
			this.calculate();
		}
	}
	public get scale(): number {
		return this._scale;
	}
	private _minMarkLength: number;
	public set minMarkLength(v: number) {
		if (this._minMarkLength !== v) {
			this._minMarkLength = v;
			this.calculate();
		}
	}
	public get minMarkLength(): number {
		return this._minMarkLength;
	}
	private _minMarkRange: number[] = [1, 2, 5];
	public set minMarkRange(v: number[]) {
		this._minMarkRange = v;
		this.calculate();
	}
	public get minMarkRange(): number[] {
		return this._minMarkRange;
	}

	private _currentMarkNum: number;
	public get currentMarkNum(): number {
		return this._currentMarkNum;
	}
	private _currentMarkLength: number;
	public get currentMarkLength(): number {
		return this._currentMarkLength;
	}
	private calculate(): void {
		var rise: number = 1;
		var tmpNum: number;
		var tmpLength: number;
		var index: number = 0;
		b: while (true) {
			index = 0;
			while (index < this._minMarkRange.length) {
				tmpNum = this._minMarkRange[index] * rise;
				tmpLength = tmpNum * this._transformUint * this._scale;
				if (tmpLength >= this._minMarkLength)
					break b;
				index++;
			}
			rise *= 10;
		}
		this._currentMarkNum = tmpNum;
		this._currentMarkLength = tmpLength;
	}
}