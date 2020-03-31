import {AppStorage} from 'egret/exts/resdepot/common/storage/AppStorage';

export class TypeGridItemEditor extends eui.GridItemEditor {

	public constructor() {
		super();
		// this.skinName = code.module.view.skins.TypeGridItemEditorSkin;
	}

	// private defaultTypes:Array<any> = [];
	private typeDp: eui.ArrayCollection = new eui.ArrayCollection(['image', 'text', 'json', 'sheet', 'font', 'sound']);
	public prepare() {
		super.prepare();
		var resTypeArr: Array<any> = AppStorage.resType;
		var arr: Array<any> = [];
		for (var i: number = (0); i < resTypeArr.length; i++) {
			arr.push(resTypeArr[i].key);
		}
		this.typeDp.source = arr;
		this.dataGrid.selectedIndex = (this.rowIndex);
		this.typeComboBox['addEventListener'](egret.Event.CLOSE, this.dropDown_closeHandler, this);
		this.typeComboBox['openDropDown']();
		this.typeComboBox['selectedItem'] = this.data[this.dataGrid.columns[this.columnIndex]['dataField']];
		(egret.callLater(this.typeComboBox['textInput'].setFocus, this));
	}

	public discard() {
		this.typeComboBox['removeEventListener'](egret.Event.CLOSE, this.dropDown_closeHandler, this);
	}

	public get value(): any {
		return this.typeComboBox['selectedItem'];
	}

	public set value(newValue: any) {
		this.typeComboBox['selectedItem'] = newValue ? this.toString() : '';
	}

	public typeComboBox: eui.DocDropDownList;
	protected partAdded(partName: string, instance: any) {
		super['partAdded'](partName, instance);
		if (instance === this.typeComboBox) {
			this.typeComboBox['dataProvider'] = this.typeDp;
		}
	}

	private dropDown_closeHandler(event: eui.UIEvent) {
		this.dataGrid.endItemEditorSession();
	}

}

