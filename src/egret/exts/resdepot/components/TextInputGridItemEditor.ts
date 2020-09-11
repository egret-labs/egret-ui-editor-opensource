// @ts-nocheck

export class TextInputGridItemEditor extends eui.GridItemEditor {

	public constructor() {
		super();
		this.skinName = 'skins.GridItemEditorSkin';
	}

	public textInput: eui.TextInput;
	public prepare() {
		var _self__: any = this;
		super.prepare();
		this.dataGrid.selectedIndex = (this.rowIndex);
		(egret.callLater(function () {
			_self__.textInput.setFocus();
		}, this));
		this.textInput.addEventListener(egret.KeyboardEvent.KEY_DOWN, this.keyDownHandler, this);
	}

	public get value(): any {
		return this.textInput.text;
	}

	public set value(newValue: any) {
		this.textInput.text = newValue;//this.toString();
	}

	protected keyDownHandler(event: egret.KeyboardEvent) {
		if (event.keyCode === egret.Keyboard.ENTER) {
			this.dataGrid.endItemEditorSession();
		}
	}

	public discard() {
		this.textInput.removeEventListener(egret.KeyboardEvent.KEY_DOWN, this.keyDownHandler, this);
	}

	protected partRemoved(partName: string, instance: any) {
		//super['partRemoved'](partName,instance);
		super.partRemoved(partName, instance);
	}

}

