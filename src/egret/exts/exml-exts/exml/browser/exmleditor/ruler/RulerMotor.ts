/**标尺驱动器 
*/
export class RulerMotor {
	constructor(scale: number = 1, transfromunit: number = 1, minmarklength: number = 50) {
		this._scale = this.validNumber(scale, 1);
		this._transformUint = this.validNumber(transfromunit, 1);
		this._minMarkLength = this.validNumber(minmarklength, 50);
		this.calculate();
	}

	private _transformUint: number = 1;
	public set transformUint(v: number) {
		const newV = this.validNumber(v, 1);
		if (this._transformUint !== newV) {
			this._transformUint = newV;
			this.calculate();
		}
	}
	public get transformUint(): number {
		return this._transformUint;
	}
	private _scale: number;
	public set scale(v: number) {
		const newV = this.validNumber(v, 1);
		if (this._scale !== newV) {
			this._scale = Math.max(newV, 0.0001);
			this.calculate();
		}
	}
	public get scale(): number {
		return this._scale;
	}
	private _minMarkLength: number;
	public set minMarkLength(v: number) {
		const newV = this.validNumber(v, 50);
		if (this._minMarkLength !== newV) {
			this._minMarkLength = newV;
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

	private validNumber(value: number, defaultValue: number): number {
		if (typeof value === 'undefined') {
			return defaultValue;
		}
		if (value === null) {
			return defaultValue;
		}
		if (Number.isFinite(value)) {
			return value;
		}
		return defaultValue;
	}

	private calculate(): void {
		var rise: number = 1;
		var tmpNum: number;
		var tmpLength: number;
		var index: number = 0;
		b: while (true) {
			index = 0;
			while (index < this._minMarkRange.length) {
				tmpNum = this.validNumber(this._minMarkRange[index] * rise, rise);
				tmpLength = this.validNumber(tmpNum * this._transformUint * this._scale, tmpNum);
				if (tmpLength >= this._minMarkLength)
					break b;
				index++;
			}
			rise *= 10;
			// 避免某些情况下的无限循环
			if (rise > 1000) {
				break;
			}
		}
		this._currentMarkNum = tmpNum;
		this._currentMarkLength = tmpLength;
	}
}