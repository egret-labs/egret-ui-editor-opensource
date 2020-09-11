// @ts-nocheck

	export class Scale9GridItemEditor extends eui.GridItemEditor {

	public constructor() {
		super();
		// this.skinName = code.module.view.skins.GridItemEditorSkin;
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
		this.textInput.text = this.toString();
	}

	protected keyDownHandler(event: egret.KeyboardEvent) {
		if (event.keyCode === egret.Keyboard.ENTER) {
			this.dataGrid.endItemEditorSession();
		}
	}

	public discard() {
		this.textInput.removeEventListener(egret.KeyboardEvent.KEY_DOWN, this.keyDownHandler, this);
	}

	protected partAdded(partName: string, instance: any) {
		super['partAdded'](partName, instance);
		if (instance === this.textInput) {
			this.textInput.restrict = '0-9\,\[\]';
		}
	}

}
