/**
 * 二级key数据包
 */
export class SheetSubVO extends egret.HashObject {
	private _name: string = '';
	private _isSameName: boolean = false;

	public get name(): string {
		return this._name;
	}

	public set name(value: string) {
		this._name = value;
	}

	public get isSameName(): boolean {
		return this._isSameName;
	}

	public set isSameName(value: boolean) {
		this._isSameName = value;
	}

}
