
export class GridItemPrompt extends eui.Group {

	public constructor() {
		super();
	}

	// private rectArr:Array<any> = [];
	private rectGrounp: eui.Rect;
	private rectWarning: eui.Rect;
	private rectError: eui.Rect;
	protected createChildren() {
		super.createChildren();
		this.rectGrounp = new eui.Rect();
		//this.rectGrounp.fillColor = 0xff0000;
		this.rectGrounp.fillAlpha = 0.0;
		this.rectGrounp.top = this.rectGrounp.left = -1;
		this.rectGrounp.bottom = this.rectGrounp.right = -1;
		this.addChild(this.rectGrounp);
		this.rectGrounp.visible = false;
		this.rectWarning = new eui.Rect();
		this.rectWarning.strokeColor = (0xfff330);
		this.rectWarning.strokeAlpha = 0.8;
		this.rectWarning.strokeWeight = 1;
		this.rectWarning.fillAlpha = 0;
		this.rectWarning.top = this.rectWarning.left = 1;
		this.rectWarning.bottom = this.rectWarning.right = 1;
		this.addChild(this.rectWarning);
		this.rectWarning.visible = false;
		this.rectError = new eui.Rect();
		this.rectError.strokeColor = (0xff0000);
		this.rectError.strokeAlpha = 0.8;
		this.rectError.strokeWeight = 1;
		this.rectError.fillAlpha = 0;
		this.rectError.top = this.rectError.left = 1;
		this.rectError.bottom = this.rectError.right = 1;
		this.addChild(this.rectError);
		this.rectError.visible = false;
	}

	private colorChange: boolean = false;
	private group: boolean = false;
	private warning: boolean = false;
	private error: boolean = false;
	public updateColor($group: boolean, $warning: boolean, $error: boolean) {
		var _self__: any = this;
		if (this.group !== $group || this.warning !== $warning || this.error !== $error) {
			this.group = $group;
			this.warning = $warning;
			this.error = $error;
			this.colorChange = true;
			_self__.invalidateProperties();
		}
	}

	protected commitProperties() {
		super.commitProperties();
		if (this.colorChange) {
			this.rectGrounp.visible = this.group;
			this.rectWarning.visible = this.warning;
			this.rectError.visible = this.error;
			this.colorChange = false;
		}
	}

}

