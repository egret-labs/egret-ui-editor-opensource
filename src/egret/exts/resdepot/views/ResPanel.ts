/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as paths from 'egret/base/common/paths';
import { ResRightMenu } from 'egret/exts/resdepot/components/ResRightMenu';
import { ResInfoVO } from 'egret/exts/resdepot/common/model/ResInfoVO';
import { ResData } from 'egret/exts/resdepot/common/model/ResData';
import { AppStorage } from 'egret/exts/resdepot/common/storage/AppStorage';
import { ResFloatPop } from 'egret/exts/resdepot/components/ResFloatPop';
import { ResModel } from 'egret/exts/resdepot/common/model/ResModel';
import { ResFileHelper } from 'egret/exts/resdepot/common/utils/ResFileHelper';
import { ResInfoArea } from 'egret/exts/resdepot/views/subviews/ResInfoArea';
import { ResPreViewArea } from 'egret/exts/resdepot/views/subviews/ResPreViewArea';
import { ResTreeArea } from 'egret/exts/resdepot/views/subviews/ResTreeArea';
import { ResGroupArea } from 'egret/exts/resdepot/views/subviews/ResGroupArea';
import { IResEventService } from 'egret/exts/resdepot/events/ResEventService';
import { ResGlobalEvents } from 'egret/exts/resdepot/events/ResGlobalEvents';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { IFileService, FileChangesEvent, IFileChange } from 'egret/platform/files/common/files';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { localize } from 'egret/base/localization/nls';
import { Alert } from '../common/utils/Alert';
import { ResFileEditorModel } from './resEditorModel';
import { StateChange } from 'egret/editor/core/models';
import { ResCodeEditor } from './resCodeEditor';
import { ProjectResCenter } from '../common/model/ProjectResCenter';

/**
 * 文档展示面板
 *
 */
export class ResPanel extends eui.TabPanel {

	public static KEYBINDING_PANEL_FOCUS = 'resPanelFocus';
	/**左右分割线 资源区与信息区 */
	private topLine: egret.Sprite = new egret.Sprite();
	// private topLine: eui.Group = new eui.Group();/// 普通显示对象不能正确显示，改为用Group组件做分割符
	/**上下分割线 信息区、预览区与组 */
	private middleLine: egret.Sprite = new egret.Sprite();
	// private middleLine: eui.Group = new eui.Group();
	/**信息区与预览区 */
	private topLine2: egret.Sprite = new egret.Sprite();

	/**根目录输入框 */
	private rootInput: eui.TextInput = new eui.TextInput();
	/**浏览按钮 */
	// private borrowRootBtn: eui.Button;

	private previewGroup: eui.Group;
	private treeGroup: eui.Group;
	private infoGroup: eui.Group;
	private bottomGroup: eui.Group;

	/**信息区 */
	private infoArea: ResInfoArea;
	private previewArea: ResPreViewArea;
	private resTreeArea: ResTreeArea;
	private groupArea: ResGroupArea;

	private resModel: ResModel = this.instantiationService.createInstance(ResModel);
	private isShowing: boolean = false;//是否正在显示，切换到其他tab之后为false
	private _parentEditor: any;

	public constructor(
		parentEditor,
		@IFileService fileService: IFileService,
		@IResEventService private resEventService: IResEventService,
		@IEgretProjectService private egretProjectService: IEgretProjectService,
		@IInstantiationService private instantiationService: IInstantiationService
	) {
		super();
		this._parentEditor = parentEditor;
		//this.skinName = 'skins.ResPanelSkin';
		fileService.onFileChanges(e => this.onFileChanges(e));
		// resModel监测到sheet文件被改变，实时更新
		this.resModel.addEventListener('update_sheet', (e: egret.Event) => {
			this.toFreshSubkey(e.data);
		}, this);
		this.getResCenter().then((resCenter) => {
			resCenter.onRefresh((e) => {
				if (this._editorModel) {
					this.loadModel(this._editorModel);
				}
			});
		});
	}

	private _resCenter: ProjectResCenter;
	private async getResCenter(): Promise<ProjectResCenter> {
		if(this._resCenter){
			return Promise.resolve(this._resCenter);
		}
		await this.egretProjectService.ensureLoaded();
		this._resCenter = this.instantiationService.createInstance(ProjectResCenter);
		this._resCenter.init(this.egretProjectService.projectModel);
		return this._resCenter;
	}

	/**
	 * 得到代码编辑器
	 */
	getCodeEditor(): ResCodeEditor {
		if (this._parentEditor) {
			return this._parentEditor.getCodeEditor();
		}
		return null;
	}

	private fileChanged: boolean = false;
	//文件列表改变了
	private onFileChanges(e: FileChangesEvent): void {
		if (!this.isShowing) {//没有显示的时候不再接收事件
			return;
		}
		for (let i: number = 0; i < e.changes.length; i++) {
			let change: IFileChange = e.changes[i];
			if (!this.resJson) {
				return;
			}
			let path1: string = paths.join(change.resource.fsPath, '');
			let path2: string = paths.join(this.resJson.resJsonPath, '');
			if (path1 === path2) {//监听到本地文件的修改了
				// console.log(path1);
				let filename: string = paths.basename(path1);

				// //上方弹出提示pop
				// let yescallback = (): any => {
				// 	if (this._editorModel) {
				// 		this.loadModel(this._editorModel);
				// 	}
				// };
				// let cancel_callback = (): any => {
				// 	this.freshData = false;
				// };
				// let yesAction: Action = new Action('close.yes', '是', null, true, () => yescallback());
				// let cancelAction: Action = new Action('close.cancel', '否', null, true, () => cancel_callback());
				// let msgAction: IMessageWithAction = {
				// 	actions: [cancelAction, yesAction],
				// 	message: filename + '已在文件系统上更改了文件。要用这些更改替换编辑器内容吗？'
				// };
				// this.messageService.show(Severity.Warning, msgAction);
				this.fileChanged = true;
				//等待100ms。fileChange事件先触发，contentChange后触发，防止fileChange选择否后contentChange还是改变了显示内容。
				setTimeout(() => {
					this.fileChanged = false;
					if (this.preResContent === this._editorModel.getValue()) {
						return;
					}
					// //弹出模态提示框
					let confirm;
					confirm = {
						// title: 'title1',
						message: filename + ' ' + localize('res.editor.fileChangeInSystem', 'Has changed the file on the file system. Do you want to replace the editor with these changes?'),
						// detail: 'detail1',
						primaryButton: localize('alert.button.yes', 'Yes'),
						secondaryButton: localize('alert.button.no', 'No')
					};
					// let confirmed: boolean = this.messageService.confirm(confirm);
					// if (confirmed) {
					// 	if (this._editorModel) {
					// 		this.loadModel(this._editorModel);
					// 	}
					// } else {//保留文件内容，不刷新
					// 	this._editorModel.setValue(this.preResContent);
					// }
					Alert.show(confirm.message, undefined, undefined, (e) => {
						if (e.detail === Alert.FIRST_BUTTON) {
							if (this._editorModel) {
								this.loadModel(this._editorModel);
							}
						} else {
							// this._editorModel.setValue(this.preResContent);
						}
					}, confirm.primaryButton, confirm.secondaryButton);
				}, 100);

				// this.popupService.show(PopupType.Form);
				return;
			}
		}
	}

	public close() {
		if (this.resData) {
			var docTabGroup: eui.DocTabGroup = this.resData.owner;
			docTabGroup.removeDocument(this.resData, true, true);
		}
	}

	public get resData(): ResData {
		return this.data ? this.data : null;
	}

	private rightGroup: eui.Group;
	private selfGroug: eui.Group;
	protected createChildren() {
		super.createChildren();

		var rootGroup: eui.Group = new eui.Group();
		rootGroup.top = rootGroup.bottom = rootGroup.left = rootGroup.right = 5;
		var vL: eui.HorizontalLayout = new eui.HorizontalLayout();
		vL.gap = 3;
		rootGroup.layout = vL;
		this.addChild(rootGroup);

		let topGroup: eui.Group = new eui.Group();
		var hL: eui.HorizontalLayout = new eui.HorizontalLayout();
		hL.gap = 3;
		topGroup.layout = hL;
		topGroup.percentWidth = 100;
		topGroup.percentHeight = 100;

		rootGroup.addChild(topGroup);

		/// 资源区start
		this.treeGroup = new eui.Group();
		this.treeGroup.percentHeight = 100;
		this.treeGroup.percentWidth = 30;
		topGroup.addChild(this.treeGroup);

		this.resTreeArea = this.instantiationService.createInstance(ResTreeArea, this.treeGroup, this.resModel);
		/// 资源区end

		/// 左右分割条
		var topLineGrop: eui.Group = new eui.Group();
		topGroup.addChild(topLineGrop);
		topLineGrop.width = 0;
		topLineGrop.percentHeight = 100;
		topLineGrop.top = topLineGrop.left = 0;
		topLineGrop.addChild(this.topLine);

		this.selfGroug = new eui.Group();
		this.selfGroug.percentHeight = this.selfGroug.percentWidth = 100;
		var slayout: eui.VerticalLayout = new eui.VerticalLayout();
		slayout.gap = 5;
		this.selfGroug.layout = slayout;

		topGroup.addChild(this.selfGroug);

		this.rightGroup = new eui.Group();
		// rightGroup.percentHeight = 40;
		this.rightGroup.percentWidth = 100;
		var rightLayout: eui.HorizontalLayout = new eui.HorizontalLayout();
		rightLayout.gap = 3;
		this.rightGroup.layout = rightLayout;

		/// 信息区start
		this.infoGroup = new eui.Group();
		this.infoGroup.percentWidth = 70;
		this.rightGroup.addChild(this.infoGroup);
		this.infoArea = this.instantiationService.createInstance(ResInfoArea, this.infoGroup, this.resModel);
		/// 资源详细信息end
		/**左右分割条 */
		var topLine2Group: eui.Group = new eui.Group();
		this.rightGroup.addChild(topLine2Group);
		topLine2Group.width = 0;
		topLine2Group.percentHeight = 100;
		topLine2Group.top = topLine2Group.left = 0;
		topLine2Group.addChild(this.topLine2);

		/// 预览区部分start
		this.previewGroup = new eui.Group();
		this.previewGroup.percentWidth = 30;
		this.previewGroup.percentHeight = 100;
		this.rightGroup.addChild(this.previewGroup);
		this.previewArea = this.instantiationService.createInstance(ResPreViewArea, this.previewGroup);
		// this.previewArea.instanceService = this.instantiationService;
		// this.previewArea.projectService = this.egretProjectService;
		///预览区end
		this.selfGroug.addChild(this.rightGroup);
		/// 上下分割条
		var middleLineGroup: eui.Group = new eui.Group();
		this.selfGroug.addChild(middleLineGroup);
		middleLineGroup.height = 0;
		middleLineGroup.percentWidth = 100;
		middleLineGroup.left = middleLineGroup.top = 0;
		middleLineGroup.addChild(this.middleLine);

		///底部区域start
		this.bottomGroup = new eui.Group();
		this.bottomGroup.percentWidth = 100;
		this.bottomGroup.height = AppStorage.bottomHeight;
		this.selfGroug.addChild(this.bottomGroup);
		this.groupArea = this.instantiationService.createInstance(ResGroupArea, this.bottomGroup, this.stage, this.resModel);

		setTimeout(() => {
			//this.previewChangedHandler(null);
			this.previewGroup.addEventListener(eui.UIEventEx.UPDATE_COMPLETE, this.updateHandler, this);
			this.addEventListener(eui.UIEventEx.UPDATE_COMPLETE, this.updateHandler, this);
			this.updateHandler(null);
		}, 300);
		this.initDragLine();
		egret.callLater(this.groupArea.updateGroupRes, this.groupArea);


		this.invalidateSize();
		this.invalidateDisplayList();
		this.addEvents();
	}

	private addGlobalEvents() {
		this.resEventService.addListen(ResGlobalEvents.PREVIEW_CHANGE_CLICK, this.previewChangedHandler, this);
		this.resEventService.addListen(ResGlobalEvents.Json_Modifyed, this.onJsonModifyed, this);
		this.resEventService.addListen(ResGlobalEvents.TO_FRESH_SUBKEY, this.toFreshSubkey, this);
		this.resEventService.addListen(ResGlobalEvents.Json_FormatError, this.onGlobJsonFormatError, this);
		this.resEventService.addListen(ResGlobalEvents.Json_FormatOk, this.onGlobJsonFormatOk, this);
	}
	private removeGlobalEvents() {
		this.resEventService.removeListen(ResGlobalEvents.PREVIEW_CHANGE_CLICK, this.previewChangedHandler, this);
		this.resEventService.removeListen(ResGlobalEvents.Json_Modifyed, this.onJsonModifyed, this);
		this.resEventService.removeListen(ResGlobalEvents.TO_FRESH_SUBKEY, this.toFreshSubkey, this);
		this.resEventService.removeListen(ResGlobalEvents.Json_FormatError, this.onGlobJsonFormatError, this);
		this.resEventService.removeListen(ResGlobalEvents.Json_FormatOk, this.onGlobJsonFormatOk, this);
	}
	private addEvents() {
		this.addGlobalEvents();
		this.stage.addEventListener(egret.Event.RESIZE, this.onStageResize, this);
	}
	private removeEvents() {
		this.removeGlobalEvents();
		this.stage.removeEventListener(egret.Event.RESIZE, this.onStageResize, this);
		this.stage.removeEventListener(egret.Event.ENTER_FRAME, this.stageMouseOverHandler, this);
		this.stage.removeEventListener(egret.MouseEvent.MOUSE_UP, this.stageMouseUpHandler, this);
		this.stage.removeEventListener(egret.Event.REMOVED_FROM_STAGE, this.line_removeFromStage, this);
	}

	public $onRemoveFromStage() {
		super.$onRemoveFromStage();
		this.destory();
	}

	//初始化拉伸的线
	private initDragLine() {
		this.topLine.touchEnabled = true;
		// this.topLine.cursor = egret.MouseCursor.EW_RESIZE;
		this.reDrawGraphics(this.topLine.graphics, 4, 100);

		this.topLine2.touchEnabled = true;
		// this.topLine2.cursor = egret.MouseCursor.EW_RESIZE;
		this.reDrawGraphics(this.topLine2.graphics, 4, 100);

		this.middleLine.touchEnabled = true;
		this.middleLine.cursor = egret.MouseCursor.NS_RESIZE;
		this.reDrawGraphics(this.middleLine.graphics, 100, 4);

		// this.topLine.addEventListener(egret.MouseEvent.ROLL_OVER, this.topRollOverHandler, this);
		// this.topLine.addEventListener(egret.MouseEvent.ROLL_OUT, this.topRollOutHandler, this);
		// this.topLine.addEventListener(egret.TouchEvent.TOUCH_BEGIN, this.lineMouseDownHandler, this);

		this.middleLine.addEventListener(egret.MouseEvent.ROLL_OVER, this.topRollOverHandler, this);
		this.middleLine.addEventListener(egret.MouseEvent.ROLL_OUT, this.topRollOutHandler, this);
		this.middleLine.addEventListener(egret.TouchEvent.TOUCH_BEGIN, this.lineMouseDownHandler, this);

		// this.topLine2.addEventListener(egret.MouseEvent.ROLL_OVER, this.topRollOverHandler, this);
		// this.topLine2.addEventListener(egret.MouseEvent.ROLL_OUT, this.topRollOutHandler, this);
		// this.topLine2.addEventListener(egret.TouchEvent.TOUCH_BEGIN, this.lineMouseDownHandler, this);
	}
	/**
	 * 更新文档内布局，并持久化
	 * 更新分割线的大小，限制预览区底部区域的有效范围
	 */
	protected updateHandler(event?: eui.UIEvent) {
		//to do 因为在窗体最小化恢复的时候也会调用到updateComplete 事件。  所以这里做一个简单的处理。
		//后期应该去检查是否应该更改systemManager中的事件类型。
		if (this.width < 20 || this.height < 20) {
			return;
		}
		if (this.bottomGroup.height < 80) {
			this.bottomGroup.height = 80;
		}
		if (this.bottomGroup.height > this.height - 250) {
			this.bottomGroup.height = this.height - 250;
		}
		if (this.previewGroup.width < 80) {
			this.previewGroup.width = 80;
		}
		if (this.previewGroup.width > this.width - 250) {
			this.previewGroup.width = this.width - 250;
		}
		this.topLine.height = this.previewGroup.height;
		this.topLine2.height = this.previewGroup.height;
		// var pos: egret.Point = new egret.Point(this.previewGroup.width, 0);
		// var pos: egret.Point = new egret.Point(-4, 0);
		// pos = this.previewGroup.localToGlobal(pos.x, pos.y);
		// pos = this.globalToLocal(pos.x, pos.y);
		// this.topLine.x = pos.x;
		// this.topLine.y = pos.y;
		// this.addChild(this.topLine);
		this.topLine.visible = this.previewGroup.visible;
		this.topLine2.visible = this.infoGroup.visible;
		// console.log(this.topLine.x,this.topLine.y, this.topLine.width, this.topLine.height);

		// pos = new egret.Point(0, 0);
		// pos = this.bottomGroup.localToGlobal(pos.x, pos.y);
		// pos = this.globalToLocal(pos.x, pos.y);
		// this.middleLine.x = pos.x;
		this.middleLine.width = this.bottomGroup.width;
		// this.middleLine.y = pos.y - 5;
		// this.addChild(this.middleLine);

		if (egret.is(this.topLine, 'egret.Sprite')) {
			///如果分割线用的是egret.Sprite，在这里设置大小还需要重新绘制分割线，否则大小不会变。
			this.reDrawGraphics(this.topLine.graphics, this.topLine.width, this.topLine.height);
			this.reDrawGraphics(this.middleLine.graphics, this.middleLine.width, this.middleLine.height);
			this.reDrawGraphics(this.topLine2.graphics, this.topLine2.width, this.topLine2.height);
		}

		if (AppStorage.bottomHeight !== this.bottomGroup.height) {
			AppStorage.bottomHeight = this.bottomGroup.height;
		}
		if (AppStorage.previewWidth !== this.previewGroup.width) {
			AppStorage.previewWidth = this.previewGroup.width;
		}
		this.previewArea.updatePreviewLayout();
	}
	/**重新绘制graphics */
	private reDrawGraphics(g: egret.Graphics, w: number, h: number, alpha?: number): void {
		alpha = 0;
		if (undefined === alpha) {
			alpha = 1;
		}
		g.clear();
		g.beginFill(0x00ff00, alpha);
		g.drawRect(0, 0, w, h);
		g.endFill();
	}

	/**
	 * 运行一个动作
	 */
	public runAction(action: string): void {
		// if(action === 'eui.layerpanel.delete')
		// 	this.onDeleteLayer(null)
	}
	//鼠标碰到线
	protected topRollOverHandler(event: egret.MouseEvent) {
		// if (event.currentTarget === this.topLine) {
		//     this.topOver = true;
		//     if (!event.buttonDown) {
		//         this.topLine.cursor = egret.MouseCursor.EW_RESIZE;
		//     } else {
		//         this.topLine.cursor = egret.MouseCursor.AUTO;
		//     }
		// }
		// if (event.currentTarget === this.middleLine) {
		//     this.middleOver = true;
		//     if (!event.buttonDown) {
		//         this.middleLine.cursor = egret.MouseCursor.NS_RESIZE;
		//     } else {
		//         this.middleLine.cursor = egret.MouseCursor.AUTO;
		//     }
		// }
	}
	//鼠标离开到线
	protected topRollOutHandler(event: egret.MouseEvent) {
		// if (event.currentTarget === this.topLine) {
		//     this.topOver = false;
		// }
		// if (event.currentTarget === this.middleLine) {
		//     this.middleOver = false;
		// }
	}

	private startPos1: egret.Point = new egret.Point();
	private startPos2: egret.Point = new egret.Point();
	private currentLine: egret.Sprite | any;
	// private topOver: boolean = false;
	// private middleOver: boolean = false;
	//鼠标按下线
	protected lineMouseDownHandler(event: egret.MouseEvent) {
		if (event.currentTarget === this.topLine) {
			this.startPos1.x = this.treeGroup.width;
			this.startPos1.y = 0;
			this.startPos1 = this.treeGroup.localToGlobal(this.startPos1.x, this.startPos1.y);
			this.startPos2.x = this.treeGroup.width;
			this.currentLine = this.topLine;
			// console.log(this.treeGroup.width, this.startPos1.x, this.startPos1.y, this.startPos2.x);
		} else if (event.currentTarget === this.middleLine) {
			this.startPos1.y = this.bottomGroup.height;
			this.startPos1.x = 0;
			this.startPos1 = this.bottomGroup.localToGlobal(this.startPos1.x, this.startPos1.y);
			this.startPos2.y = this.middleLine.mouseY;
			this.currentLine = this.middleLine;
		} else if (event.currentTarget === this.topLine2) {
			this.startPos1.x = 0;
			this.startPos1.y = 0;
			this.startPos1 = this.previewGroup.localToGlobal(this.startPos1.x, this.startPos1.y);
			this.startPos2.x = this.previewGroup.width;
			this.currentLine = this.topLine2;
			// console.log(this.treeGroup.width + this.infoGroup.width, this.startPos1.x, this.startPos1.y, this.startPos2.x);
		}
		this.stage.addEventListener(egret.Event.ENTER_FRAME, this.stageMouseOverHandler, this);
		this.stage.addEventListener(egret.MouseEvent.MOUSE_UP, this.stageMouseUpHandler, this);
		this.stage.addEventListener(egret.Event.REMOVED_FROM_STAGE, this.line_removeFromStage, this);
	}
	//鼠标拖动线
	protected stageMouseOverHandler(event: egret.Event) {
		if (this.currentLine === this.topLine) {
			// var w: number = this.stage.mouseX - this.startPos1.x - this.startPos2.x;/// 这是预览区在左侧的情况
			// var w: number = this.startPos1.x - this.stage.mouseX - (this.topLine.width - this.startPos2.x) - 1;/// 预览区在右侧
			// this.previewGroup.width = w;
			var w: number = this.stage.mouseX - this.startPos1.x + this.startPos2.x;
			this.treeGroup.width = w;

			this.validateSize();
			this.validateDisplayList();

		} else if (this.currentLine === this.middleLine) {
			var h: number = this.selfGroug.height - this.stage.mouseY - (this.middleLine.height - this.startPos2.y) - 1;
			// console.log(h, this.startPos1.y, this.stage.mouseY, this.startPos2.y, this.bottomGroup.height);
			this.bottomGroup.height = h;

			this.rightGroup.height = this.stage.mouseY - (this.middleLine.height - this.startPos2.y) - 1;
			this.groupArea.groupGrid.height = this.groupArea.groupResGrid.height = h - 30;
			// this.bottomGroup.validateNow();
			this.bottomGroup.invalidateSize();
			this.bottomGroup.invalidateDisplayList();
		} else if (this.currentLine === this.topLine2) {
			// var w: number = this.startPos1.x - this.stage.mouseX - (this.topLine.width - this.startPos2.x) - 1;/// 预览区在右侧
			// this.infoGroup.width = w;

			var w: number = this.startPos2.x - (this.stage.mouseX - this.startPos1.x);
			// this.infoGroup.width = w;
			this.previewGroup.width = w;

		}
		this.updateHandler();
	}
	//鼠标在舞台上松起
	protected stageMouseUpHandler(event: egret.MouseEvent) {
		this.stage.removeEventListener(egret.Event.ENTER_FRAME, this.stageMouseOverHandler, this);
		this.stage.removeEventListener(egret.TouchEvent.TOUCH_END, this.stageMouseUpHandler, this);
		this.updateHandler();
	}

	private line_removeFromStage(event: egret.Event) {
		this.stage.removeEventListener(egret.Event.ENTER_FRAME, this.stageMouseOverHandler, this);
		this.stage.removeEventListener(egret.TouchEvent.TOUCH_END, this.stageMouseUpHandler, this);
	}
	// /**二级key列表的显示方法*/
	// private subKeysLabelFunction = function (obj: any, column: eui.GridColumn): string {
	//     if (obj.subkeys) {
	//         var str: string = '';
	//         var sublist: Array<SheetSubVO> = obj.subkeys;
	//         for (var i: number = 0; i < sublist.length; i++) {
	//             str += sublist[i].name + ',';
	//         }
	//         if (str.charAt(str.length - 1) === ',') {
	//             str = str.slice(0, str.length - 1);
	//         }
	//         return str;
	//     }
	//     return '';
	// }
	private _editorModel: ResFileEditorModel;
	private _version: number;

	private resJson: {
		resJsonPath?: string,
		resourcePath?: string
	} = {};

	/**
	 * model内容的本次改变不刷新，一次有效
	 */
	private contentChange_Not_Fresh_This_Time: boolean = false;
	private preResContent: string;
	private contentChangeTimer: number;//res.json内容修改的计时器
	private contentChangeListener;//:Lifecycle.IDisposable;
	/**
	 * 打开资源库
	 * @param resJsonPath json文件路径
	 * @param resourcePath resource的路径
	 */
	public openResourceLib(resJsonPath: string, resourcePath: string, model: ResFileEditorModel): void {
		this.resJson = {};
		this.resJson.resJsonPath = resJsonPath;
		this.resJson.resourcePath = resourcePath;
		ResRightMenu.resourceRoot = paths.normalize(this.resJson.resourcePath);
		this.isShowing = true;
		/// model一直是同一个对象，第一次赋值的时候监听文件内容改变的事件。注意如果关闭正在编辑的res.json文件，然后再打开，则model会执行dispose，监听的事件也会执行dispose而失效，因此需要重新监听一遍。
		if (!this._editorModel || this._editorModel.isDisposed()) {
			///注意：ResGlobalEvents.Json_Modifyed导致的res.json文件重写会让 ModelContentChanged事件触发很多次（每行一次）。因此最好加一个延时处理
			// this._editorModel.addListener(EditorCommon.EventType.ModelContentChanged, (event: EditorCommon.IModelContentChangedEvent) => {// 在本地修改了res.json文件的内容，刷新整个数据
			// console.log('ModelContentChanged', event);
			// });

			if (this.contentChangeListener) {//不需要这个if也没问题
				this.contentChangeListener.dispose();
				this.contentChangeListener = null;
			}
			// 在源码模式里修改了res.json的内容，刷新数据
			this.contentChangeListener = model.onDidStateChange((event: StateChange) => {
				if (event !== StateChange.CONTENT_CHANGE) {
					return;
				}
				//延时处理
				if (this.contentChangeTimer) {
					clearTimeout(this.contentChangeTimer);
					this.contentChangeTimer = 0;
				}
				if (this.contentChange_Not_Fresh_This_Time) {
					this.contentChange_Not_Fresh_This_Time = false;
					return;
				}
				if (this.fileChanged) {
					return;
				}
				this.contentChangeTimer = setTimeout(() => {
					this.contentChangeTimer = 0;
					// console.log('ModelContentChanged2', event);
					if (this._editorModel && !this._editorModel.isDisposed()) {//防止关闭res.json时不保存的情况content还原了触发这个事件。model已经释放就不需要再loadModel了
						this.loadModel(this._editorModel);
					}
				}, 100) as any;
			});
		}
		// console.log(model === this._editorModel, model.getAlternativeVersionId(), this._editorModel && this._editorModel.getAlternativeVersionId());
		this._editorModel = model;
		this._editorModel.resourceDir = resourcePath;

		//切换源码/设计模式，切换文件重新加载
		this.loadModel(model);
	}

	private loadModel(model: ResFileEditorModel, force?: boolean) {
		// console.log('loadModel');
		if (!force) {
			if (this.preResContent === this._editorModel.getValue()) {//编辑器内的内容没有改变，则不做变动（防止切换源码/设计视图重新加载数据）
				return;
			}
		}

		// 先保存当前打开的树的状态，在重新加载之后重新展开之前打开的树
		this.stat_openedPaths = {};
		for (let i: number = 0; i < this.resTreeArea.treePro.treeDp.openNodes.length; i++) {
			this.saveOpenedPath(this.resTreeArea.treePro.treeDp.openNodes[i]);
		}
		this.stat_selectedItems.length = 0;
		for (let i: number = 0; i < this.resTreeArea.treePro.selectedItems.length; i++) {
			this.saveSelectedItems(this.resTreeArea.treePro.selectedItems[i]);
		}


		this.preResContent = this._editorModel.getValue();
		this.showFloatPop(false);
		this.resModel.loadResJson(this.resJson.resJsonPath, this.resJson.resourcePath, this._editorModel.getValue()).then((ret) => {
			this.resModel.checkSameName().then(() => {
				this.infoArea.clear();
				this.previewArea.clear();
				this.groupArea.clear();
				this.resTreeArea.clear();

				this.resTreeArea.updateView();
				this.groupArea.updateView();
				this.touchEnabled = this.touchChildren = true;

				// 展开树，还原状态
				egret.callLater(() => {
					this.expandTree(this.resTreeArea.treePro.treeDp.source, this.stat_openedPaths);
					this.setPreSelection();
				}, this);

			});
		}, (e) => { });
	}
	////状态恢复
	private stat_openedPaths: any = {};//当前树的打开状态。是一个树状的结构
	private stat_selectedItems: string[] = [];//当前树选择的信息，路径字符串。可能选择了枝节点，因此用数组来保存
	/**
	 * 保存刷新之前的打开状态
	 */
	private saveOpenedPath(node: any) {
		let temp: string[] = [];
		while (node && node.label) {
			temp.push(node.label);
			node = node.parent;
		}
		let tree: any = this.stat_openedPaths;
		for (let i: number = temp.length - 1; i >= 0; i--) {
			let k: string = temp[i];
			if (!tree[k]) {
				tree[k] = {};
			}
			tree = tree[k];
		}
	}
	/**
	 * 保存刷新之前选择的项信息
	 */
	private saveSelectedItems(node: any) {
		let temp: string[] = [];
		while (node && node.label) {
			temp.push(node.label);
			node = node.parent;
		}
		this.stat_selectedItems.push(temp.reverse().join(','));
	}
	private expandTree(source: any, expandTree: any) {
		this.resTreeArea.treePro.treeDp.expandItem(source, true);
		for (let key in expandTree) {
			if (source.children && source.children.length) {
				for (let i: number = 0; i < source.children.length; i++) {
					if (source.children[i].label === key) {
						this.expandTree(source.children[i], expandTree[key]);
					}
				}
			}
		}
	}

	private setPreSelection() {
		let allSelectedItems: number[] = [];
		for (let i: number = 0; i < this.stat_selectedItems.length; i++) {
			let temp: string[] = this.stat_selectedItems[i].split(',');
			let source: any[] = this.resTreeArea.treePro.treeDp.source.children;
			for (let j: number = 0; j < temp.length; j++) {
				for (let k: number = 0; k < source.length; k++) {
					if (source[k].label === temp[j]) {
						if (j === temp.length - 1) {
							allSelectedItems.push(source[k]);
						}
						source = source[k].children;
						break;
					}
				}
			}
		}
		if (allSelectedItems.length) {
			this.resTreeArea.treePro.selectedItems = allSelectedItems;
			let firstSelectItemIndex: number = this.resTreeArea.treePro.dataProvider.getItemIndex(allSelectedItems[0]);
			this.resTreeArea.treePro.ensureIndexIsVisible(firstSelectItemIndex);
		}
	}
	public clear() {
		this.resModel.clear();
		this.resTreeArea.clear();
		this.groupArea.clear();
		this.infoArea.clear();
		this.previewArea.clear();
		this.touchEnabled = this.touchChildren = false;//禁止操作，防止会保存数据
	}

	/**当资源根目录修改后，刷新资源数据重新显示 */
	private onChangeRoot(newRootPath: string): void {
		// this.updateTreeView();
		this.previewArea.showPreView();

		this.resJson.resourcePath = newRootPath;
		this.resModel.resRoot = paths.normalize(this.resJson.resourcePath);
		this.resTreeArea.treePro.resourcePath = this.resModel.resRoot;
	}
	/** 资源列表有改变，保存到文件 */
	private onJsonModifyed() {
		// console.log('onJsonModifyed  ', this.preResVersion, this._editorModel.getVersionId());
		///this.title = '*' + PathUtil.getShortPath(this.resJson.resJsonPath, 1, 3);
		var resDataJson: string = ResFileHelper.exportJson(this.resModel.resList, this.resModel.groupList);
		if (resDataJson !== this._editorModel.getValue()) {
			this.preResContent = resDataJson;
			this.contentChange_Not_Fresh_This_Time = true;//在resdepot里的操作不立刻刷新


			var codeEditor = this.getCodeEditor();
			if (codeEditor) {
				// codeEditor.executeEdits('edit res code', [{
				// 	identifier: null,
				// 	range: this._editorModel.getEditableRange(),//this._editorModel.getFullModelRange(),
				// 	text: resDataJson,
				// 	forceMoveMarkers: true
				// }]);
				codeEditor.executeEdits(resDataJson);
				codeEditor.pushUndoStop();

			} else {
				// this.messageService.show(2, {
				// 	message: localize('jsonException', "Json text modification exception"),
				// 	actions: [
				// 		CloseAction
				// 	]
				// });
				Alert.show(localize('res.editor.jsonException', 'Json text modification exception'));
			}
		}
		// this._version = this._editorModel.getVersionId();
	}
	/** res.json的格式有错误，显示错误提示 */
	private onGlobJsonFormatError() {
		this.showFloatPop(true, localize('res.editor.jsonFileError', 'Json format error, can not be resolved!'));
	}

	private onGlobJsonFormatOk() {
		this.showFloatPop(false);
	}

	private floatPop: ResFloatPop;
	private showFloatPop(show: boolean, msg?: string) {
		if (show) {
			if (!this.floatPop) {
				this.floatPop = new ResFloatPop();
			}
			this.floatPop.show(msg);
			this.floatPop.open(this.stage, true, true);
		} else {
			if (this.floatPop) {
				this.floatPop.close();
			}
		}
	}
	private toFreshSubkey(p: ResInfoVO) {
		this.freshSubkey(p).then(ret => {
			this.resEventService.sendEvent(ResGlobalEvents.FRESH_SHOW_SUBKEY, p);
		});
	}
	/**
	 * 刷新sheet的二级key属性
	 */
	private freshSubkey(p: ResInfoVO): Promise<void> {
		return this.resModel.updateSheetSubkey([p]).then(() => {
			this.resModel.checkSameName().then(ret => {
				this.resTreeArea.treePro.treeModel.updateOneRes(p);
				this.resTreeArea.treePro.updateTreeView();
				this.groupArea.updateGroupRes();
				this.groupArea.checkError();
				this.resEventService.sendEvent(ResGlobalEvents.ON_UPDATE_RESINFOVO, p);
				this.resEventService.sendEvent(ResGlobalEvents.Json_Modifyed);
				return Promise.resolve(null);
			});
		});
	}
	/**
	 * 修改根路径
	 * @param rootPath
	 * @param fixAll
	 */
	public setRootPath(rootPath: string, fixAll: boolean = true) {
		this.rootInput.text = rootPath;
		this.onChangeRoot(rootPath);
		if (fixAll) {
			this.updateView();
		}
	}

	protected previewChangedHandler(selected: boolean) {
		this.previewGroup.includeInLayout = this.previewGroup.visible = selected;
		this.updateHandler();
	}

	/**
	 * 更新全部显示
	 */
	public updateView() {
		this.groupArea.updateView();
	}

	private _errorNum: number = 0;
	// private errorNumCache: number = 0;
	/** 错误数量  */
	public get errorNum(): number {
		return this._errorNum;
	}

	private _warningNum: number = 0;
	// private warningNumCache: number = 0;
	/*** 警告数量 （路径问题）*/
	public get warningNum(): number {
		return this._warningNum;
	}

	private _status: string = '<font color=\'#fefefe\'>' + (localize('res.editor.ready', 'Ready')) + '</font>';
	public get status(): string {
		return this._status;
	}

	// private createResModifyEvent(type: string, relateData: any, group: GroupInfoVO = null): ResModifyEvent {
	//     var resEvent: ResModifyEvent = new ResModifyEvent(type);
	//     resEvent.model = this.model;
	//     resEvent.panel = this;
	//     resEvent.relateData = relateData;
	//     resEvent.group = group;
	//     return resEvent;
	// }


	/**舞台大小发生改变 */
	private onStageResize(event: egret.Event) {
		egret.callLater(() => {///注意要在下一帧绘制，在一帧中先派发resize事件，再布局，因此组件的大小需要在下一帧获得
			this.updateHandler();
			if (this.floatPop) {// 重新绘制面板的遮罩
				this.floatPop.onStageResize();
			}
			// if (this.groupArea.editGroupPanel) {
			// 	this.groupArea.editGroupPanel.onStageResize();
			// }
		}, this);
	}

	public onVisible() {
		this.isShowing = true;
	}

	public onHide() {
		this.isShowing = false;
	}
	/**
	 * 面板销毁的时候调用，在这里移除各种对外界引用的事件的监听，同时打断对外界的引用
	 */
	public destory(): void {
		if (this.resTreeArea) {
			this.resTreeArea.destory();
			this.resTreeArea = null;
		}
		if (this.infoArea) {
			this.infoArea.destory();
			this.infoArea = null;
		}
		if (this.previewArea) {
			this.previewArea.destory();
			this.previewArea = null;
		}
		if (this.groupArea) {
			this.groupArea.destory();
			this.groupArea = null;
		}
		this.removeEvents();
	}
}