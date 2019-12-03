/**
 * 二级key数据包
 */
export class SheetSubVO  {
	private _name: string = '';
	private _isSameName: boolean = false;


	private _sheetData:ISheet;

	/**
	 * shee 数据
	 */
	public get sheetData():ISheet
	{
		return this._sheetData;
	}

	public set sheetData(s:ISheet){
		this._sheetData = s;
	}
	
	/**
	 * 名字
	 */
	public get name(): string {
		return this._name;
	}

	public set name(value: string) {
		this._name = value;
	}

	/**
	 * 是否重名
	 */
	public get isSameName(): boolean {
		return this._isSameName;
	}

	public set isSameName(value: boolean) {
		this._isSameName = value;
	}

}


/**
 * sheet 位置信息
 */
export interface ISheet{
	/**
	 * x 位置
	 */
	x:number;
	/**
	 * y 位置
	 */
	y:number;
	/**
	 * w 位置
	 */
	w:number;
	/**
	 * h 位置
	 */
	h:number;
	/**
	 * 偏移位置
	 */
	offX:number;
	/**
	 * 偏移位置
	 */
	offY:number;
	/**
	 * 资源宽
	 */
	sourceW:number;
	/**
	 * 资源高
	 */
	sourceH:number;
}