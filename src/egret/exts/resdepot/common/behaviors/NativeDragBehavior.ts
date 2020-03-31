

import { URI } from 'vs/base/common/uri';


const WING_DRAG_URI_LIST_FORMAT = 'text/uri-list';

/**
 * 文件拖拽行为
 *
 */
export class NativeDragBehavior extends egret.HashObject {
	private _interactiveObject: egret.DisplayObject;
	/**载入路径onLoadUrl(urlList:Array)*/
	public onLoadUrl: Function;

	public constructor() {
		super();
	}

	public init(interactiveObject: egret.DisplayObject) {
		this._interactiveObject = interactiveObject;
		egret.NativeDragManager.acceptDragDrop(this._interactiveObject, true);
		this._interactiveObject.addEventListener(egret.NativeDragEvent.NATIVE_DRAG_ENTER, this.dragEnterHandler, this);
		this._interactiveObject.addEventListener(egret.NativeDragEvent.NATIVE_DRAG_DROP, this.dragDropHandler, this);
	}

	protected dragEnterHandler(event: egret.NativeDragEvent) {
		event.dropAction = egret.NativeDragActions.COPY;
		egret.NativeDragManager.dropAction = egret.NativeDragActions.COPY;
	}

	protected dragDropHandler(event: egret.NativeDragEvent) {
		var fileList:string[] = [];

		if (event.clipboard.hasFormat(egret.ClipboardFormats.FILE_LIST_FORMAT)) {//Files
			let dropfiles = event.clipboard.getData(egret.ClipboardFormats.FILE_LIST_FORMAT) as string[];
			for (var i: number = 0; i < dropfiles.length; i++) {
				fileList.push(dropfiles[i]);
			}
		}
		// Wing file explorer drag: file schames
		if (event.clipboard.hasFormat(WING_DRAG_URI_LIST_FORMAT)) {//Files
			let dropfile = event.clipboard.getData(WING_DRAG_URI_LIST_FORMAT) as string;
			fileList.push(URI.parse(dropfile).fsPath);
		}

		if (fileList.length && this.onLoadUrl) {
			this.onLoadUrl.call(this._interactiveObject, fileList);
		}
	}

	public dispose() {
		this._interactiveObject.removeEventListener(egret.NativeDragEvent.NATIVE_DRAG_ENTER, this.dragEnterHandler, this);
		this._interactiveObject.removeEventListener(egret.NativeDragEvent.NATIVE_DRAG_DROP, this.dragDropHandler, this);
		this._interactiveObject = null;
		this.onLoadUrl = null;
	}
}