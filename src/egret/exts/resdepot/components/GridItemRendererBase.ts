import {GridItemPrompt} from 'egret/exts/resdepot/components/GridItemPrompt';
import {ResInfoVO} from 'egret/exts/resdepot/common/model/ResInfoVO';
import {SheetSubVO} from 'egret/exts/resdepot/common/model/SheetSubVO';
import { isMacintosh } from 'egret/base/common/platform';

export class GridItemRendererBase extends eui.GridItemRenderer {
	private _groupVisible: boolean = false;
	private _errorVisible: boolean = false;
	private _warningVisible: boolean = false;

	public constructor() {
		super();
		this.skinName = 'skins.GridItemResRendererSkin';
		this.skin['labelDisplay'].fontFamily = isMacintosh ? 'PingFangSC-Regular' : 'Microsoft YaHei';
	}

	protected get groupVisible(): boolean {
		return this._groupVisible;
	}

	protected set groupVisible(value: boolean) {
		this._groupVisible = value;
		this.updatePromptColor();
	}

	private get errorVisible(): boolean {
		return this._errorVisible;
	}

	private set errorVisible(value: boolean) {
		this._errorVisible = value;
		this.updatePromptColor();
	}

	public get warningVisible(): boolean {
		return this._warningVisible;
	}

	public set warningVisible(value: boolean) {
		this._warningVisible = value;
		this.updatePromptColor();
	}

	public childrenCreated(): void {
		this.promptRect = new GridItemPrompt();
		this.promptRect.percentHeight = 100;
		this.promptRect.percentWidth = 100;
		this.addChild(this.promptRect);
		this.updatePromptColor();
	}

	public prepare(hasBeenRecycled: boolean) {
		if (this.data) {
			// (<eui.Label>(this.labelDisplay)).toolTip = null;
			this.labelDisplay.text = this.label;
			this.errorVisible = false;
			this.warningVisible = false;
			if (this.data['error'] && this.columnIndex === 0) {
				this.errorVisible = true;
			}
			if (this.data['info'] && this.data['info'] && this.columnIndex <= 2) {
				var resInfoVO: ResInfoVO = this.data['info'];
				if (resInfoVO.fileError) {
					this.warningVisible = true;
					// (<eui.Label>(this.labelDisplay)).toolTip = (egret.utils.tr('ResPanel.RightMenu.FileErrorTips'));
				}
				if (resInfoVO.subError) {
					this.warningVisible = true;
				}
			}
			if (this.data['otherError'] && this.columnIndex === 3) {
				this.errorVisible = true;
			}
			if (this.columnIndex === 4) {
				var subError: boolean = <any>false;
				var subErrorTip: string = '';
				if (this.data['subkeys']) {
					var sublist: Array<SheetSubVO> = <any>this.data['subkeys'];
					if (sublist) {
						for (var i: number = (0); i < sublist.length; i++) {
							if (sublist[i].isSameName === true) {
								subError = true;
								subErrorTip += sublist[i].name + ', ';
							}
						}
					}
				}
				if (subError) {
					this.warningVisible = true;
					subErrorTip = subErrorTip.slice(0, subErrorTip.length - 2);
					subErrorTip = subErrorTip + (egret.utils.tr('ResPanel.RightMenu.SameNameTips'));
					// (<eui.Label>(this.labelDisplay)).toolTip = subErrorTip;
				}
			}
		}
	}

	public promptRect: GridItemPrompt;
	public iconDisplay: eui.Image;
	protected partAdded(partName: string, instance: any) {
	}
	// private updateIcon() {
	//     //this.iconDisplay.source = this.data
	// }
	private updatePromptColor() {
		if (this.promptRect) {
			this.promptRect.updateColor(this._groupVisible, this._warningVisible, this._errorVisible);
		}
	}
}