// @ts-nocheck
import {ResType} from 'egret/exts/resdepot/common/consts/ResType';

export class SoundGridItemEditor extends eui.GridItemEditor {

	public constructor() {
		super();
		// this.skinName = code.module.view.skins.DropDownListEditorSkin;
	}

	private dp: eui.ArrayCollection = new eui.ArrayCollection(ResType.SOUND_TYPE);
	public prepare() {
		super.prepare();
		this.dataGrid.selectedIndex = (this.rowIndex);
		if (this.dropDownList) {
			this.dropDownList.addEventListener(egret.Event.CLOSE, this.dropDown_closeHandler, this);
			// this.dropDownList.openDropDown();
		}
	}

	public discard() {
		this.dropDownList.removeEventListener(egret.Event.CLOSE, this.dropDown_closeHandler, this);
	}

	public get value(): any {
		if (this.dropDownList && this.dropDownList.list.selectedIndex !== -1) {
			return this.dp[this.dropDownList.list.selectedIndex];
		}
		return '';
	}

	public set value(newValue: any) {
		var index: number = (-1);
		for (var i: number = (0); i < this.dp.length; i++) {
			if (this.dp[i] === newValue) {
				index = (i);
				break;
			}
		}
		if (index !== -1 && this.dropDownList) {
			this.dropDownList.list.selectedIndex = index;
		}
	}

	public dropDownList: eui.DropDownList;
	protected partAdded(partName: string, instance: any) {
		super['partAdded'](partName, instance);
		if (instance === this.dropDownList) {
			this.dropDownList.dataProvider = this.dp;
		}
	}

	private dropDown_closeHandler(event: eui.UIEvent) {
		this.dataGrid.endItemEditorSession();
	}

}