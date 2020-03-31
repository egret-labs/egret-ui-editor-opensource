
/**
 * 漂浮框
 */
export class ResFloatPop extends eui.Panel {
	private root: eui.Group;
	private t: eui.Label;

	private _parent: egret.DisplayObjectContainer;
	private _isMid: boolean;
	private _isModal: boolean;

	constructor() {
		super();

		this.minWidth = 200;
		this.minHeight = 70;
		this.includeInLayout = false;
		this.skinName = 'skins.ResFloatPop';

		this.root = new eui.Group();
		this.root.minHeight = 70;
		this.root.minWidth = 70;
		this.root.verticalCenter = this.root.horizontalCenter = 0;
		this.addChild(this.root);

		let bgRect: eui.Rect = new eui.Rect();
		bgRect.fillAlpha = 1;
		bgRect.fillColor = 0x485765;
		bgRect.ellipseWidth = 10;
		bgRect.ellipseHeight = 10;
		bgRect.left = bgRect.top = 1;
		bgRect.right = bgRect.bottom = 1;
		this.root.addChild(bgRect);

		this.t = new eui.Label();
		this.root.addChild(this.t);
		this.t.text = '';
		this.t.textColor = 0XFFEE99;//0xC82C2D
		this.t.verticalCenter = this.t.horizontalCenter = 0;
		this.t.left = this.t.right = 20;
	}

	public show(msg: string) {
		this.t.text = msg;
	}

	$onAddToStage(stage: egret.Stage, nestLevel: number) {
		super.$onAddToStage(stage, nestLevel);
		// console.log('ResFloatPop onAddToStage ', this.x, this.y, this.width, this.height, this.t.text);
	}

	/**
	 * 弹出面板
	 * 重复弹出会移除上一次的弹出效果
	 * @param parent 弹出父级
	 * @param isMid 是否居中
	 * @param isModal 是否模态
	 *
	 */
	open(parent: egret.DisplayObjectContainer, isMid?: boolean, isModal?: boolean): void {
		super.open(parent, isMid, isModal);
		this._parent = parent;
		this._isMid = isMid;
		this._isModal = isModal;
	}
	/**
	 * @language zh_CN
	 * 关闭面板，从父级容器移除自身。
	 *
	 * @version Egret 2.4
	 * @version eui 1.0
	 * @platform Web,Native
	 */
	close() {
		super.close();
		this._parent = null;
		this._isMid = null;
		this._isModal = null;
	}
	/**
	 * 舞台大小改变时调用
	 */
	public onStageResize() {
		if (this.stage) {
			this.open(this._parent, this._isMid, this._isModal);
		}
	}
}