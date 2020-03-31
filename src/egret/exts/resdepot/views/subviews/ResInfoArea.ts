import * as nls from 'egret/base/localization/nls';
import { ResInfoVO } from 'egret/exts/resdepot/common/model/ResInfoVO';
import { TreeLeafNode, TreeNodeBase, TreeParentNode } from 'egret/exts/resdepot/common/model/TreeModel';
import { ResType } from 'egret/exts/resdepot/common/consts/ResType';
import { IResEventService } from 'egret/exts/resdepot/events/ResEventService';
import { ResRightMenu } from 'egret/exts/resdepot/components/ResRightMenu';
import { ResGlobalEvents } from 'egret/exts/resdepot/events/ResGlobalEvents';
import { ResModel } from 'egret/exts/resdepot/common/model/ResModel';
import { isMacintosh } from 'egret/base/common/platform';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';

/**
 * 资源信息区代理
 */
export class ResInfoArea {
	private static INFO_AREA_WIDTH: number = 200;// 信息区的默认宽度
	/**状态：是否有修改 */
	public modifyed: boolean = false;
	private curEditResVO: ResInfoVO;
	private curEditNode;
	private nameEdit: eui.TextInput;
	private urlEdit: eui.TextInput;
	private otherParamEdit: eui.TextInput;
	private subkeysEdit: eui.TextInput;
	private typeList: eui.DropDownList;

	private infoGroup: eui.Group;

	private nameError: eui.Rect = new eui.Rect();// name的错误框
	private urlError: eui.Rect = new eui.Rect();// url的错误框
	private otherError: eui.Rect = new eui.Rect();// other的错误框
	private subkeysError: eui.Rect = new eui.Rect();// other的错误框
	private typeError: eui.Rect = new eui.Rect();// other的错误框


	//当前的主题
	private m_theme: string;
	private subkeyMenu: ResRightMenu;
	private resModel: ResModel;

	constructor(infoGroup: eui.Group, resModel: ResModel,
		@IResEventService private resEventService: IResEventService,
		@IInstantiationService private instantiationService: IInstantiationService) {
		this.resModel = resModel;
		//获取主题
		this.m_theme = document.body.classList[1];
		var textColor = 0xf0f0f0;
		this.infoGroup = infoGroup;
		infoGroup.percentHeight = 100;
		infoGroup.minHeight = 165;
		// infoGroup.percentWidth = 100;
		infoGroup.top = 0;
		// infoGroup.bottom = 50;


		var rect: eui.Rect = new eui.Rect();/// 信息区背景纯色
		rect.fillColor = 0x3b3b3b;
		rect.strokeColor = 0x2b2b2b;

		rect.strokeAlpha = 1;
		rect.strokeWeight = 1;
		rect.top = 0;
		rect.left = 0;
		rect.right = rect.bottom = 0;
		infoGroup.addChild(rect);

		var vGroup: eui.Group = new eui.Group();
		vGroup.left = 10;
		vGroup.top = 10;
		infoGroup.addChild(vGroup);
		vGroup.right = 0;

		vGroup.minWidth = ResInfoArea.INFO_AREA_WIDTH;
		var vL: eui.VerticalLayout = new eui.VerticalLayout();
		vL.gap = 8;
		vGroup.layout = vL;

		var nameGroup: eui.Group = new eui.Group();
		nameGroup.percentWidth = 99;
		// nameGroup.top = 30;
		var nameLayout: eui.HorizontalLayout = new eui.HorizontalLayout();
		nameLayout.gap = 5;
		nameGroup.x = 20;

		nameLayout.verticalAlign = egret.VerticalAlign.MIDDLE;
		nameGroup.layout = nameLayout;
		// nameGroup.right = 10;

		vGroup.addChild(nameGroup);

		var nameLabel: eui.Label = new eui.Label();
		nameLabel.fontFamily = isMacintosh ? 'PingFangSC-Regular' : 'Microsoft YaHei';
		nameLabel.textColor = textColor;
		nameLabel.size = 12;
		nameLabel.text = nls.localize('res.editor.resInfo.itemName', '       Name: ');
		// nameLabel.x = 20;
		nameGroup.addChild(nameLabel);
		this.nameEdit = new eui.TextInput();
		this.nameEdit.skinName = 'skins.MaterialPanelTextInputSkin';
		this.nameEdit.textDisplay.fontFamily = isMacintosh ? 'PingFangSC-Regular' : 'Microsoft YaHei';
		nameGroup.addChild(this.nameEdit);
		this.nameEdit.percentWidth = 100;
		// this.nameEdit.width = 300;
		// this.nameEdit.right = 10;
		// this.nameEdit.multiline = true;
		// this.nameEdit.wordWrap = true;
		this.nameEdit.text = '';
		// this.nameEdit.$inputEnabled = true;
		// this.nameEdit.backgroundColor = 0xaaaaaa;
		this.nameEdit.addEventListener(egret.Event.CHANGE, this.onEditTextChange, this);
		// this.nameEdit.addEventListener(egret.Event.FOCUS_OUT, this.onEditTextFocusOut, this);
		// this.nameEdit.addEventListener(egret.KeyboardEvent.KEY_DOWN, this.onEditTextKeyDown, this);

		this.setErrorElementInfo(this.nameError);
		this.nameEdit.addChild(this.nameError);

		var typeGroup: eui.Group = new eui.Group();
		var typeLayout: eui.HorizontalLayout = new eui.HorizontalLayout();
		typeLayout.gap = 5;
		typeLayout.verticalAlign = egret.VerticalAlign.MIDDLE;
		typeGroup.layout = typeLayout;

		vGroup.addChild(typeGroup);
		var typeLabel: eui.Label = new eui.Label();
		typeLabel.fontFamily = isMacintosh ? 'PingFangSC-Regular' : 'Microsoft YaHei';
		typeLabel.textColor = textColor;
		typeLabel.size = 12;
		typeLabel.text = nls.localize('res.editor.resInfo.itemType', '       Type: ');//再修改布局
		typeLabel.verticalAlign = egret.HorizontalAlign.CENTER;
		typeGroup.addChild(typeLabel);

		this.typeList = new eui.DropDownList();
		this.typeList.skinName = 'skins.EUIDropDownListSkin';
		var dp: eui.ArrayCollection = new eui.ArrayCollection();
		dp.addItem({ 'label': ResType.TYPE_IMAGE });
		dp.addItem({ 'label': ResType.TYPE_JSON });
		dp.addItem({ 'label': ResType.TYPE_TEXT });
		dp.addItem({ 'label': ResType.TYPE_FONT });
		dp.addItem({ 'label': ResType.TYPE_SHEET });
		dp.addItem({ 'label': ResType.TYPE_SOUND });
		dp.addItem({ 'label': ResType.TYPE_BIN });
		this.typeList.dataProvider = dp;
		this.typeList.selectedIndex = -1;
		// this.typeList.top = -2;
		this.typeList.width = 70;
		this.typeList.labelField = 'label';
		this.typeList.labelDisplay.fontFamily = isMacintosh ? 'PingFangSC-Regular' : 'Microsoft YaHei';
		typeGroup.addChild(this.typeList);
		// this.typeList.verticalAlign = egret.HorizontalAlign.CENTER;
		this.typeList.addEventListener(eui.PropertyEvent.CHANGE, this.onChangeDropDownList, this);
		this.typeList.visible = false;

		this.setErrorElementInfo(this.typeError);
		this.typeList.addChild(this.typeError);

		var urlGroup: eui.Group = new eui.Group();
		urlGroup.percentWidth = 99;
		var urlLayout: eui.HorizontalLayout = new eui.HorizontalLayout();
		urlLayout.gap = 5;
		urlLayout.verticalAlign = egret.VerticalAlign.MIDDLE;
		urlGroup.layout = urlLayout;

		vGroup.addChild(urlGroup);

		var urlLabel: eui.Label = new eui.Label();
		urlLabel.fontFamily = isMacintosh ? 'PingFangSC-Regular' : 'Microsoft YaHei';
		urlLabel.textColor = textColor;
		urlLabel.size = 12;
		urlLabel.text = nls.localize('res.editor.resInfo.itemUrl', '      Url: ');
		urlGroup.addChild(urlLabel);
		this.urlEdit = new eui.TextInput();
		this.urlEdit.skinName = 'skins.MaterialPanelTextInputSkin';
		this.urlEdit.textDisplay.fontFamily = isMacintosh ? 'PingFangSC-Regular' : 'Microsoft YaHei';
		this.urlEdit.textDisplay.multiline = false;
		urlGroup.addChild(this.urlEdit);
		this.urlEdit.percentWidth = 100;

		this.setErrorElementInfo(this.urlError);
		this.urlEdit.addChild(this.urlError);

		setInterval(() => {
			this.urlEdit.textDisplay.type = egret.TextFieldType.DYNAMIC;
		}, 1000);
		// this.urlEdit.height = 30;
		// this.urlEdit.left = this.urlEdit.right = 0;
		this.urlEdit.text = '';
		// this.urlEdit.$inputEnabled = true;
		// this.urlEdit.multiline = true;
		// this.urlEdit.wordWrap = true;
		this.urlEdit.addEventListener(egret.Event.CHANGE, this.onEditTextChange, this);
		// this.urlEdit.addEventListener(egret.Event.FOCUS_OUT, this.onEditTextFocusOut, this);
		// this.urlEdit.addEventListener(egret.KeyboardEvent.KEY_DOWN, this.onEditTextKeyDown, this);

		var otherParamGroup: eui.Group = new eui.Group();
		otherParamGroup.bottom = 10;
		otherParamGroup.percentWidth = 99;
		var otherParamlay: eui.HorizontalLayout = new eui.HorizontalLayout();
		otherParamlay.gap = 5;
		otherParamlay.verticalAlign = egret.VerticalAlign.MIDDLE;
		otherParamGroup.layout = otherParamlay;
		vGroup.addChild(otherParamGroup);

		var otherParam: eui.Label = new eui.Label();
		otherParam.fontFamily = isMacintosh ? 'PingFangSC-Regular' : 'Microsoft YaHei';
		otherParam.textColor = textColor;
		otherParam.size = 12;
		otherParam.text = nls.localize('res.editor.resInfo.otherParam', 'Additional Parameter: ');
		otherParamGroup.addChild(otherParam);
		this.otherParamEdit = new eui.TextInput();
		this.otherParamEdit.skinName = 'skins.MaterialPanelTextInputSkin';
		this.otherParamEdit.textDisplay.fontFamily = isMacintosh ? 'PingFangSC-Regular' : 'Microsoft YaHei';
		otherParamGroup.addChild(this.otherParamEdit);
		this.otherParamEdit.percentWidth = 100;
		this.otherParamEdit.text = '';
		this.otherParamEdit.restrict = ', 0-9';
		this.otherParamEdit.addEventListener(egret.Event.CHANGE, this.onEditTextChange, this);
		// this.otherParamEdit.addEventListener(egret.Event.FOCUS_OUT, this.onEditTextFocusOut, this);
		// this.otherParamEdit.addEventListener(egret.KeyboardEvent.KEY_DOWN, this.onEditTextKeyDown, this);

		this.setErrorElementInfo(this.otherError);
		this.otherParamEdit.addChild(this.otherError);

		var subkyesGroup: eui.Group = new eui.Group();
		subkyesGroup.percentWidth = 99;
		subkyesGroup.bottom = 50;
		var subkyes: eui.HorizontalLayout = new eui.HorizontalLayout();
		subkyes.gap = 5;
		subkyes.verticalAlign = egret.VerticalAlign.MIDDLE;
		subkyesGroup.layout = subkyes;
		vGroup.addChild(subkyesGroup);
		var subkyesLabel: eui.Label = new eui.Label();
		subkyesLabel.fontFamily = isMacintosh ? 'PingFangSC-Regular' : 'Microsoft YaHei';
		subkyesLabel.textColor = textColor;
		subkyesLabel.size = 12;
		subkyesLabel.text = nls.localize('res.editor.resInfo.subkeys', '  Subkeys: ');
		subkyesGroup.addChild(subkyesLabel);
		this.subkeysEdit = new eui.TextInput();
		this.subkeysEdit.skinName = 'skins.MaterialPanelTextInputSkin';
		this.subkeysEdit.textDisplay.fontFamily = isMacintosh ? 'PingFangSC-Regular' : 'Microsoft YaHei';
		this.subkeysEdit.percentWidth = 100;
		// this.subkeysEdit.enabled = false;
		// this.subkeysEdit.bottom = 3;
		subkyesGroup.addChild(this.subkeysEdit);
		this.subkeysEdit.text = '';
		this.subkeysEdit.addEventListener(egret.Event.CHANGE, this.onEditTextChange, this);
		// this.subkeysEdit.addEventListener(egret.Event.FOCUS_OUT, this.onEditTextFocusOut, this);
		// this.subkeysEdit.addEventListener(egret.KeyboardEvent.KEY_DOWN, this.onEditTextKeyDown, this);
		this.subkeysEdit.addEventListener(egret.MouseEvent.RIGHT_MOUSE_DOWN, this.onSubkeyRightMouseDown, this);
		this.subkeysEdit.touchEnabled = true;
		this.subkeysEdit.touchChildren = false;

		this.setErrorElementInfo(this.subkeysError);
		this.subkeysEdit.addChild(this.subkeysError);

		vGroup.touchEnabled = true;
		vGroup.touchChildren = true;
		// vGroup.addEventListener(egret.MouseEvent.CLICK, this.onClickInfoGroup, this);
		this.setEnabled(false);

		this.addGlobalEvents();
	}

	private addGlobalEvents() {
		this.resEventService.addListen(ResGlobalEvents.UPDATE_SCALE9, this.onGlobUpdateScale9, this);
		this.resEventService.addListen(ResGlobalEvents.TOUCH_TREE_ITEM, this.onGlobTouchTreeItem, this);
		this.resEventService.addListen(ResGlobalEvents.UPDATE_INFO_AREA, this.onGlobUpdateInfoArea, this);
		this.resEventService.addListen(ResGlobalEvents.FRESH_SHOW_SUBKEY, this.onGlobUpdateSubkey, this);
		this.resEventService.addListen(ResGlobalEvents.ON_UPDATE_RESINFOVO, this.onUpdateResinfoVO, this);
	}
	private removeGlobalEvents() {
		this.resEventService.removeListen(ResGlobalEvents.UPDATE_SCALE9, this.onGlobUpdateScale9, this);
		this.resEventService.removeListen(ResGlobalEvents.TOUCH_TREE_ITEM, this.onGlobTouchTreeItem, this);
		this.resEventService.removeListen(ResGlobalEvents.UPDATE_INFO_AREA, this.onGlobUpdateInfoArea, this);
		this.resEventService.removeListen(ResGlobalEvents.FRESH_SHOW_SUBKEY, this.onGlobUpdateSubkey, this);
		this.resEventService.removeListen(ResGlobalEvents.ON_UPDATE_RESINFOVO, this.onUpdateResinfoVO, this);
	}
	private onGlobTouchTreeItem(nodes: any[]) {
		let node = nodes[0];
		if (nodes.length === 1) {
			if (node instanceof TreeLeafNode && node.resvo.type === ResType.TYPE_SHEET) {
				this.subkeysError.visible = false;
			}
		} else {
			// this.clear();
			// for (let i: number = 0; i < nodes.length; i++) {
			// 	if (!node.resvo && nodes[i].resvo) {
			// 		node = nodes[i];
			// 	}
			// 	if (nodes[i].resvo && nodes[i].resvo.inCurrentGroup) {
			// 		node = nodes[i];
			// 		break;
			// 	}
			// }
		}
		this.updateInfoArea(node);
		this.updateErrorStat();
	}
	private onGlobUpdateInfoArea(data: any) {
		let resvo: ResInfoVO;
		if (data instanceof ResInfoVO) {
			resvo = data;
		} else if (data instanceof Array) {
			resvo = data[0];
		}
		this.updateByResVO(resvo);
		this.updateErrorStat();
	}

	private setEnabled(b: boolean) {
		this.infoGroup.touchEnabled = this.infoGroup.touchChildren = b;
		this.otherParamEdit.touchEnabled = this.otherParamEdit.touchChildren = b;
	}
	/** 设置错误框的属性 */
	private setErrorElementInfo(element: eui.Rect) {
		element.left = element.top = 1;
		element.right = element.bottom = 1;
		element.strokeColor = 0xfff330;
		element.strokeAlpha = 0.8;
		element.strokeWeight = 1;
		element.fillColor = 0x0000ff;
		element.fillAlpha = 0;
		element.touchEnabled = element.touchChildren = false;
		element.visible = false;
	}

	/**更新信息区 */
	public updateInfoArea(node: TreeLeafNode | TreeParentNode | TreeNodeBase | any) {
		this.clear();

		this.curEditNode = node;
		if (node instanceof TreeLeafNode) {
			var leaf: TreeLeafNode = node;
			this.curEditResVO = leaf.resvo;
			if (ResType.TYPE_SHEET === this.curEditResVO.type) {
				this.setEnabled(false);
				this.nameEdit.text = leaf.label;
			} else {
				this.setEnabled(true);
				this.nameEdit.text = this.curEditResVO.name;
			}
			if (ResType.TYPE_JSON === this.curEditResVO.type || ResType.TYPE_SHEET === this.curEditResVO.type) {
				this.otherParamEdit.touchEnabled = this.otherParamEdit.touchChildren = false;
			}
			this.typeList.visible = true;
			this.setTypeListSelect(this.curEditResVO.type);
			this.urlEdit.text = this.curEditResVO.showUrl;
			this.onGlobUpdateScale9(this.curEditResVO);
			if (leaf.type === ResType.TYPE_SHEET) {
				this.subkeysEdit.text = 'sheet';//todo  show all child
			}
		} else if (node instanceof TreeParentNode) {
			let p: TreeParentNode = node;
			if (ResType.TYPE_SHEET === p.type) {
				this.updateByResVO(p['resvo']);
			}
		} else {
			this.setEnabled(false);
		}
	}
	/** 更新信息区 参数类型为resvo*/
	public updateByResVO(resvo: ResInfoVO) {
		this.clear(resvo);
		this.curEditResVO = resvo;
		if (!resvo) {
			this.setEnabled(false);
			return;
		}
		this.setEnabled(true);
		if (ResType.TYPE_SHEET === resvo.type) {//sheet的json文件
			this.nameEdit.text = resvo.name;
			this.updateSubkey(resvo);
		} else {
			this.nameEdit.text = resvo.name;
		}
		if (ResType.TYPE_JSON === resvo.type || ResType.TYPE_SHEET === resvo.type) {
			this.otherParamEdit.touchEnabled = this.otherParamEdit.touchChildren = false;
		}
		this.typeList.visible = true;
		this.setTypeListSelect(resvo.type);
		this.urlEdit.text = resvo.showUrl;
		this.onGlobUpdateScale9(resvo);
	}

	private onUpdateResinfoVO(vo: ResInfoVO) {
		if (this.curEditResVO !== vo) {
			return;
		}
		this.updateByResVO(vo);
	}

	//根据资源类型设置类型选择器项
	private setTypeListSelect(type: string) {
		var dp: eui.ArrayCollection = this.typeList.dataProvider;
		for (var i: number = 0; i < dp.length; i++) {
			var child: any = dp.getItemAt(i);
			if (child.label === type) {
				this.typeList.selectedIndex = i;
				break;
			}
		}
	}
	/**
	 * 更新二级key
	 */
	private updateSubkey(resvo: ResInfoVO) {
		let subNameArr: string[] = [];
		if (resvo.subList) {
			for (let i: number = 0; i < resvo.subList.length; i++) {
				subNameArr.push(resvo.subList[i].name);
			}
			this.subkeysEdit.text = subNameArr.join(',');
		} else {
			this.subkeysEdit.text = '';
		}
	}
	/** 更新9切数据 */
	private onGlobUpdateScale9(resvo: ResInfoVO) {
		// if (0 !== resvo.x || 0 !== resvo.y || 0 !== resvo.w || 0 !== resvo.h) {
		// 	this.otherParamEdit.text = '' + resvo.x + ',' + resvo.y + ',' + resvo.w + ',' + resvo.h;
		// }
		if (resvo.other) {
			if (this.otherParamEdit.text !== resvo.other) {
				this.otherParamEdit.text = resvo.other;
			}
		}
	}
	/**
	 * 检查每一项是否显示错误的状态
	 */
	private updateErrorStat() {
		if (!this.curEditResVO) {
			this.clearErrors();
			return;
		}
		this.nameError.visible = this.curEditResVO.isSameName;
		this.urlError.visible = this.curEditResVO.fileError;
		this.otherError.visible = this.curEditResVO.otherError;
		this.subkeysError.visible = this.curEditResVO.subError;
		if (this.curEditNode instanceof TreeLeafNode) {
			if (this.curEditNode.resvo.type === ResType.TYPE_SHEET) {//sheet subkey item
				this.subkeysError.visible = false;
			}
		}
	}

	public clear(newVo?: ResInfoVO) {
		this.curEditResVO = newVo;
		//避免输入时光标重置
		if (newVo) {
			if (this.nameEdit.text !== newVo.name) {
				this.nameEdit.text = newVo.name;
			}
			if (this.otherParamEdit.text !== newVo.other) {
				this.otherParamEdit.text = newVo.other;
			}

		}
		else {
			this.nameEdit.text = '';
			this.otherParamEdit.text = '';
		}
		this.urlEdit.text = '';
		this.subkeysEdit.text = '';
		this.typeList.selectedIndex = -1;
		this.typeList.visible = false;

		this.clearErrors();
	}
	private clearErrors() {
		this.nameError.visible = false;
		this.urlError.visible = false;
		this.typeError.visible = false;
		this.otherError.visible = false;
		this.subkeysError.visible = false;
	}

	// /**点击信息区 */
	// private onClickInfoGroup(event: egret.MouseEvent) {
	//     if (egret.is(event.target, 'eui.Label')) {
	//         //event.target.text = 'touched';
	//     }
	// }

	/** 编辑改变了文本 */
	private editChanged: boolean = false;
	/**编辑文本有改变 */
	private onEditTextChange(event: egret.Event) {
		this.modifyed = true;
		if (egret.is(event.currentTarget, 'eui.TextInput')) {
			//console.log('onEditTextChange', event.currentTarget.text);
			this.editChanged = true;
		}
		this.onChangeEdit(event);
	}
	private onChangeEdit(event: egret.Event) {
		if (this.curEditResVO) {
			let edit: eui.TextInput = event.currentTarget;
			switch (edit) {
				case this.nameEdit:
					if (!edit.text) {
						edit.text = this.curEditResVO.name;
						this.editChanged = false;
					} else {
						this.curEditResVO.name = edit.text;
						this.resModel.checkSameName().then(resolve => {
							this.resEventService.sendEvent(ResGlobalEvents.GROUP_GRID_FRESH, this.curEditResVO);
						});
					}
					break;
				case this.urlEdit:
					break;
				case this.otherParamEdit:
					this.curEditResVO.other = edit.text;
					this.resEventService.sendEvent(ResGlobalEvents.ERROR_FRESH_GROUP_AREA);
					this.resEventService.sendEvent(ResGlobalEvents.UPDATE_PREVIEW, this.curEditResVO);
					break;
				case this.subkeysEdit:
					break;
				default:
					break;
			}
			if (this.editChanged) {
				this.resEventService.sendEvent(ResGlobalEvents.Json_Modifyed, this.curEditResVO);
				this.updateErrorStat();
			}
			this.editChanged = false;
		}
	}
	// /**编辑文本失去焦点 */
	// private onEditTextFocusOut(event: egret.Event) {
	// }

	// private onEditTextKeyDown(event: egret.KeyboardEvent) {
	// 	// if (event.keyCode === egret.Keyboard.ENTER) {
	// 	// 	this.onChangeEdit(event);
	// 	// }
	// }

	private onSubkeyRightMouseDown(event: egret.MouseEvent) {
		if (!this.curEditResVO || this.curEditResVO.type !== ResType.TYPE_SHEET) {
			return;
		}
		if (!this.subkeyMenu) {
			this.subkeyMenu = this.instantiationService.createInstance(ResRightMenu, [ResRightMenu.LABELS.FRESH_SHEET], [ResRightMenu.IDS.FRESH_SHEET], null);
		}
		this.subkeyMenu.data = this.curEditResVO;
		this.subkeyMenu.rightMenu.display(this.subkeysEdit.stage, this.subkeysEdit.stage.mouseX, this.subkeysEdit.stage.mouseY);
	}

	private onGlobUpdateSubkey(data: ResInfoVO) {
		this.updateSubkey(data);
		this.updateErrorStat();
	}

	/**改变资源类型 */
	private onChangeDropDownList(event: egret.Event) {
		if (this.curEditResVO) {
			this.curEditResVO.type = this.typeList.selectedItem.label;
			this.resEventService.sendEvent(ResGlobalEvents.UPDATE_PREVIEW, this.curEditResVO);
			this.resEventService.sendEvent(ResGlobalEvents.Json_Modifyed, this.curEditResVO);
		}
	}

	public destory() {
		this.modifyed = false;

		this.nameEdit.removeEventListener(egret.Event.CHANGE, this.onEditTextChange, this);
		// this.nameEdit.removeEventListener(egret.Event.FOCUS_OUT, this.onEditTextFocusOut, this);
		// this.nameEdit.removeEventListener(egret.KeyboardEvent.KEY_DOWN, this.onEditTextKeyDown, this);

		this.urlEdit.removeEventListener(egret.Event.CHANGE, this.onEditTextChange, this);
		// this.urlEdit.removeEventListener(egret.Event.FOCUS_OUT, this.onEditTextFocusOut, this);
		// this.urlEdit.removeEventListener(egret.KeyboardEvent.KEY_DOWN, this.onEditTextKeyDown, this);

		this.otherParamEdit.removeEventListener(egret.Event.CHANGE, this.onEditTextChange, this);
		// this.otherParamEdit.removeEventListener(egret.Event.FOCUS_OUT, this.onEditTextFocusOut, this);
		// this.otherParamEdit.removeEventListener(egret.KeyboardEvent.KEY_DOWN, this.onEditTextKeyDown, this);

		this.subkeysEdit.removeEventListener(egret.Event.CHANGE, this.onEditTextChange, this);
		// this.subkeysEdit.removeEventListener(egret.Event.FOCUS_OUT, this.onEditTextFocusOut, this);
		// this.subkeysEdit.removeEventListener(egret.KeyboardEvent.KEY_DOWN, this.onEditTextKeyDown, this);

		this.removeGlobalEvents();
	}
}