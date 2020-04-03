export class GridExEvent extends eui.GridEvent {
	public static GRID_RIGHT_CLICK: string;

	public constructor(type: string,
		bubbles: boolean = false,
		cancelable: boolean = false,
		localX: number = NaN,
		localY: number = NaN,
		relatedObject: egret.DisplayObject = null,
		ctrlKey: boolean = false,
		altKey: boolean = false,
		shiftKey: boolean = false,
		buttonDown: boolean = false,
		delta: number = 0,
		rowIndex: number = -1,
		columnIndex: number = -1,
		column: eui.GridColumn = null,
		item: any = null,
		itemRenderer: eui.IGridItemRenderer = null) {
		super(type, bubbles, cancelable, localX, localY,
			relatedObject, ctrlKey, altKey, shiftKey, buttonDown, delta, rowIndex, columnIndex, column, item, itemRenderer);
	}

}
GridExEvent.GRID_RIGHT_CLICK = 'gridRightClick';
