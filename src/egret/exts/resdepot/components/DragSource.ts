
export class DragSource extends egret.HashObject {


	public constructor() {
		super();
		super();
	}

	private dataHolder: any = {};
	private formatHandlers: any = {};
	private _formats: Array<any> = [];
	public get formats(): Array<any> {
		return this._formats;
	}

	public set formats(value: Array<any>) {
		egret.superSetter(DragSource, this, 'formats', value);
	}

	public addData(data: any, format: string) {
		this._formats.push(format);
		this.dataHolder[format] = data;
	}

	public addHandler(handler: Function, format: string) {
		this._formats.push(format);
		this.formatHandlers[format] = handler;
	}

	public dataForFormat(format: string): any {
		var data: any = this.dataHolder[format];
		if (data) {
			return data;
		}
		if (this.formatHandlers[format]) {
			return this.formatHandlers[format]();
		}
		return null;
	}

	public hasFormat(format: string): boolean {
		var n: number = (this._formats.length);
		for (var i: number = 0; i < n; i++) {
			if (this._formats[i] === format) {
				return true;
			}
		}
		return false;
	}
}