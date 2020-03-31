/**
 * resdepot的状态栏
 */
export class ResStatusBar extends eui.Group {
	public constructor() {
		super();
	}
	private label: eui.Label = new eui.Label();
	private _status: string | egret.ITextElement[] = '';

	public get status(): string | egret.ITextElement[] {
		return this._status;
	}

	public set status(value: string | egret.ITextElement[]) {
		this._status = value;
		if (typeof value === 'string') {
			this.label.text = <string>value;
		} else {
			this.label.textFlow = <Array<egret.ITextElement>>value;
		}
	}

	protected createChildren() {
		super.createChildren();
		this.label.percentWidth = 100;
		this.addChild(this.label);
		this.label.verticalCenter = 0;
		this.label.left = 4;
	}
}