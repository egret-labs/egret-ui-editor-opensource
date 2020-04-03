import {DragSource} from 'egret/exts/resdepot/components/DragSource';

export class DragEvent extends egret.MouseEvent {

	public static DRAG_START: string;
	public static DRAG_COMPLETE: string;
	public static DRAG_DROP: string;
	public static DRAG_ENTER: string;
	public static DRAG_EXIT: string;
	public static DRAG_OVER: string;

	public constructor(type: string, bubbles: boolean = false, cancelable: boolean = true, dragInitiator: egret.DisplayObject = null, dragSource: DragSource = null, ctrlKey: boolean = false, altKey: boolean = false, shiftKey: boolean = false) {
		super(type, bubbles, cancelable);
		this.dragInitiator = dragInitiator;
		this.dragSource = dragSource;
		this.ctrlKey = ctrlKey;
		this.altKey = altKey;
		this.shiftKey = shiftKey;
	}

	public dragInitiator: egret.DisplayObject;
	public dragSource: DragSource;
	public clone(): egret.Event {
		var cloneEvent: DragEvent = new DragEvent(this.type, this.bubbles, this.cancelable, this.dragInitiator, this.dragSource, this.ctrlKey, this.altKey, this.shiftKey);
		cloneEvent.relatedObject = this.relatedObject;
		cloneEvent.$stageX = this.stageX;
		cloneEvent.$stageY = this.stageY;
		return cloneEvent;
	}

}
DragEvent.DRAG_START = 'dragStart';
DragEvent.DRAG_COMPLETE = 'dragComplete';
DragEvent.DRAG_DROP = 'dragDrop';
DragEvent.DRAG_ENTER = 'dragEnter';
DragEvent.DRAG_EXIT = 'dragExit';
DragEvent.DRAG_OVER = 'dragOver';
