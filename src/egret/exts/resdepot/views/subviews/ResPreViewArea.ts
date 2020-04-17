import * as fsextra from 'fs-extra';
import { MusicDisplay } from 'egret/exts/resdepot/components/MusicDisplay';
import { ResInfoVO } from 'egret/exts/resdepot/common/model/ResInfoVO';
import { ResType } from 'egret/exts/resdepot/common/consts/ResType';
import { TreeLeafNode, TreeNodeBase, TreeParentNode } from 'egret/exts/resdepot/common/model/TreeModel';
import { IResEventService } from 'egret/exts/resdepot/events/ResEventService';
import { ResGlobalEvents } from 'egret/exts/resdepot/events/ResGlobalEvents';
import { ResUtil } from 'egret/exts/resdepot/common/utils/ResUtil';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { MaterialDisplay } from './MaterialDisplay';
import { Scale9WindowPanel } from 'egret/workbench/parts/properties_old/exml-prop/component/scale9window/Scale9WindowPanel';
import { ProjectResCenter } from '../../common/model/ProjectResCenter';

/**
 * 预览区代理
 */
export class ResPreViewArea {

	private matDisplay: MaterialDisplay = new MaterialDisplay();
	private scale9GridBtn: eui.Button = new eui.Button();
	private musicDisplay: MusicDisplay = new MusicDisplay();
	private previewGroup: eui.Group;
	//当前的主题
	private m_theme: string;
	constructor(previewGroup,
		@IResEventService private resEventService: IResEventService,
		@IEgretProjectService private egretProjectService: IEgretProjectService,
		@IInstantiationService private instantiationService: IInstantiationService) {
		//获取主题
		this.m_theme = document.body.classList[1];
		this.previewGroup = previewGroup;
		previewGroup.minHeight = 165;

		this.previewGroup.scrollEnabled = true;//clipAndEnableScrolling
		this.previewGroup.percentHeight = 100;
		// this.previewGroup.percentWidth = 100;// = AppStorage.previewWidth;
		this.previewGroup.addEventListener(eui.UIEvent.RESIZE, this.onPreViewGroupResize, this);

		var rect: eui.Rect = new eui.Rect();///预览区背景纯色
		rect.fillColor = 0x3b3b3b;
		rect.strokeColor = 0x2b2b2b;

		rect.strokeAlpha = 1;
		rect.strokeWeight = 1;
		rect.top = 0;
		rect.left = 0;
		rect.right = rect.bottom = 0;
		this.previewGroup.addChild(rect);


		var group: eui.Group = new eui.Group();
		group.addChild(this.matDisplay);
		this.previewGroup.addChild(group);

		var buttonGroup: eui.Group = new eui.Group();
		buttonGroup.top = buttonGroup.left = buttonGroup.right = buttonGroup.bottom = 1;
		this.previewGroup.addChild(buttonGroup);
		buttonGroup.scrollEnabled = true;//clipAndEnableScrolling

		this.scale9GridBtn.skinName = 'skins.IconButtonSkin';/// 带图标的按钮需要设置皮肤
		this.scale9GridBtn.icon = 'scale_9_grid_light_svg';//'resource/assets/CheckBox/scale_9_grid.png'
		// this.scale9GridBtn.toolTip = (egret.utils.tr('ResPanel.RightMenu.EditScale9Grid'));
		this.scale9GridBtn.addEventListener(egret.TouchEvent.TOUCH_TAP, this.scale9GridClick_handler, this);
		this.scale9GridBtn.visible = this.scale9GridBtn.includeInLayout = false;
		buttonGroup.addChild(this.scale9GridBtn);
		this.scale9GridBtn.bottom = 5;
		this.scale9GridBtn.left = 5;

		this.musicDisplay = new MusicDisplay();
		this.musicDisplay.percentHeight = this.musicDisplay.percentWidth = 100;
		buttonGroup.addChild(this.musicDisplay);
		this.musicDisplay.visible = this.musicDisplay.includeInLayout = false;

		this.addGlobalEvents();
	}

	private addGlobalEvents() {
		this.resEventService.addListen(ResGlobalEvents.UPDATE_PREVIEW, this.onGlobShowPreview, this);
		this.resEventService.addListen(ResGlobalEvents.TOUCH_TREE_ITEM, this.onGlobalTouchTreeItem, this);
		this.resEventService.addListen(ResGlobalEvents.OPEN_SCALE9_VIEW, this.onGlobalOpenScale9View, this);
		this.resEventService.addListen(ResGlobalEvents.ON_UPDATE_RESINFOVO, this.onUpdateResinfoVO, this);
	}
	private removeGlobalEvents() {
		this.resEventService.removeListen(ResGlobalEvents.UPDATE_PREVIEW, this.onGlobShowPreview, this);
		this.resEventService.removeListen(ResGlobalEvents.TOUCH_TREE_ITEM, this.onGlobalTouchTreeItem, this);
		this.resEventService.removeListen(ResGlobalEvents.OPEN_SCALE9_VIEW, this.onGlobalOpenScale9View, this);
		this.resEventService.removeListen(ResGlobalEvents.ON_UPDATE_RESINFOVO, this.onUpdateResinfoVO, this);
	}

	private onGlobalTouchTreeItem(nodes: any[]) {
		let node = nodes[0];
		if (nodes.length === 1) {
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
		this.showPreView(node);
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

	// private adapter: eui.DefaultAssetAdapter = new eui.DefaultAssetAdapter();
	private currentScale9grid: egret.Rectangle;
	/**当前选择的资源 */
	private currentResInfoVO: ResInfoVO;
	//显示预览图
	private updatePreview(resInfoVO: ResInfoVO) {
		if (resInfoVO && resInfoVO.type !== ResType.TYPE_SOUND) {
			this.scale9GridBtn.includeInLayout = this.scale9GridBtn.visible = false;
			this.musicDisplay.visible = this.musicDisplay.includeInLayout = false;
			this.musicDisplay.stop();
			if (resInfoVO) {
				if (resInfoVO.type === ResType.TYPE_IMAGE) {
					if (resInfoVO.x !== 0 || resInfoVO.y !== 0 || resInfoVO.w !== 0 || resInfoVO.y !== 0) {
						this.currentScale9grid = new egret.Rectangle(resInfoVO.x, resInfoVO.y, resInfoVO.w, resInfoVO.h);
					} else {
						this.currentScale9grid = null;
					}
					this.scale9GridBtn.includeInLayout = this.scale9GridBtn.visible = true;
					// this.adapter.getAsset(FileUtil.path2Url(resInfoVO.locolUrl), this.onLoadComplete, FileUtil.path2Url(resInfoVO.locolUrl));
				}
				else if (resInfoVO.type === ResType.TYPE_FONT || resInfoVO.type === ResType.TYPE_SHEET) {
					// var fontPath: string = resInfoVO.locolUrl;
					// var fontFileName: string = FileUtil.getFileName(fontPath);
					/// todo font sheet
					// var files: Array<any> = FileUtil.search(FileUtil.getDirectory(fontPath), null, function(file: any): boolean//flash.filesystem.File
					// {
					//     if (FileUtil.getFileName(file.nativePath) === fontFileName && file.extension && (file.extension.toLocaleLowerCase() === 'png' || file.extension.toLocaleLowerCase() === 'bmp' || file.extension.toLocaleLowerCase() === 'jpg' || file.extension.toLocaleLowerCase() === 'gif' || file.extension.toLocaleLowerCase() === 'jpeg')) {
					//         return true;
					//     }
					//     return false;
					// });
					// if(files.length > 0)
					// 	this.adapter.getAsset(File(files[0]).url,this.onLoadComplete,this),File(files[0]).url);
					this.matDisplay.setScale9Grid(null);
					this.currentScale9grid = null;
				}
				else {
					this.matDisplay.setScale9Grid(null);
					this.currentScale9grid = null;
					this.matDisplay.source = null;
				}
				if (resInfoVO.type === ResType.TYPE_SOUND) {
					this.musicDisplay.visible = this.musicDisplay.includeInLayout = true;
					this.musicDisplay.setUrl(resInfoVO.locolUrl);
				}
			}
			else {
				this.matDisplay.setScale9Grid(null);
				this.currentScale9grid = null;
				this.matDisplay.source = null;
			}
			this.updatePreviewLayout();
		}
	}

	// private onLoadComplete = (data: any, key: string) => {
	// 	this.matDisplay.source = data;
	// 	egret.callLater(() => {
	// 		this.matDisplay.setScale9Grid(this.currentScale9grid);
	// 		this.updatePreviewLayout();
	// 	}, this);
	// }

	//更新预览图的大小和位置
	public updatePreviewLayout() {
		// egret.callLater(function () {
		//     if (this.previewGroup) {
		//         var r: number = Math.max(this.matDisplay.realW / this.previewGroup.width, this.matDisplay.realH / this.previewGroup.height);
		//         var w: number = this.matDisplay.realW / r;
		//         var h: number = this.matDisplay.realH / r;
		//         this.matDisplay.width = w - 2;
		//         this.matDisplay.height = h - 2;
		//         this.matDisplay.x = (this.previewGroup.width - this.matDisplay.width) / 2;
		//         this.matDisplay.y = (this.previewGroup.height - this.matDisplay.height) / 2;
		//         this.matDisplay.updateView(this.previewGroup.width, this.previewGroup.height);
		//     }
		// }, this);
	}
	/**
	 * 预览区大小变化
	 */
	private onPreViewGroupResize(event: eui.UIEvent): void {
		this.matDisplay.savePreViewSize(this.previewGroup.width, this.previewGroup.height);
		// 预览图片跟随预览区大小变动位置
		this.matDisplay.setAssetPosition();
		// 预览图片跟随预览区大小变动大小
		this.matDisplay.updateDisplayList();
		// 九切格跟随预览图片移动
		this.matDisplay.updateView();
	}
	/**
	 * 9切要编辑的vo
	 */
	private scale9_grid_editvo: ResInfoVO;
	private onGlobalOpenScale9View(resvo: ResInfoVO) {
		this.scale9_grid_editvo = resvo;
		this.openScale9View();
	}

	protected scale9GridClick_handler(event: egret.MouseEvent) {
		this.resEventService.sendEvent(ResGlobalEvents.OPEN_SCALE9_VIEW, this.currentResInfoVO);
	}

	private async openScale9View() {
		var key: string = this.scale9_grid_editvo.name;
		let scale9Grid: egret.Rectangle = null;
		if (this.scale9_grid_editvo.x !== 0 || this.scale9_grid_editvo.y !== 0 || this.scale9_grid_editvo.w !== 0 || this.scale9_grid_editvo.y !== 0) {
			scale9Grid = new egret.Rectangle(this.scale9_grid_editvo.x, this.scale9_grid_editvo.y, this.scale9_grid_editvo.w, this.scale9_grid_editvo.h);
		}

		var uri = this.scale9_grid_editvo.locolUrl;
		const resCenter = await this.getResCenter();
		resCenter.getRes(key).then(texture => {
			const imageObj = {
				// 图片的路径
				src: uri,
				x: 0,
				y: 0,
				width: texture.textureWidth,
				height: texture.textureHeight,
				imageWidth: texture.textureWidth,
				imageHeight: texture.textureHeight,
				offsetX: texture._bitmapX,
				offsetY: texture._bitmapY,
				isSet: false
			};
			// 图片曾经被设置过
			if (scale9Grid) {
				imageObj.x = scale9Grid.x;
				imageObj.y = scale9Grid.y;
				imageObj.width = scale9Grid.width;
				imageObj.height = scale9Grid.height;
				imageObj.isSet = true;
			}
			const thisObj = this;
			var window: Scale9WindowPanel = this.instantiationService.createInstance(Scale9WindowPanel, imageObj, (v) => {
				// 设置一个九宫格数据
				scale9Grid = v;
				if (thisObj.scale9_grid_editvo) {
					if (scale9Grid) {
						thisObj.scale9_grid_editvo.x = scale9Grid.x;
						thisObj.scale9_grid_editvo.y = scale9Grid.y;
						thisObj.scale9_grid_editvo.w = scale9Grid.width;
						thisObj.scale9_grid_editvo.h = scale9Grid.height;
						thisObj.scale9_grid_editvo.other = `${scale9Grid.x},${scale9Grid.y},${scale9Grid.width},${scale9Grid.height}`;
					} else {
						thisObj.scale9_grid_editvo.x = thisObj.scale9_grid_editvo.y = thisObj.scale9_grid_editvo.w = thisObj.scale9_grid_editvo.h = 0;
						thisObj.scale9_grid_editvo.other = '';
					}
					thisObj.resEventService.sendEvent(ResGlobalEvents.UPDATE_SCALE9, thisObj.scale9_grid_editvo);
					thisObj.resEventService.sendEvent(ResGlobalEvents.UPDATE_PREVIEW, thisObj.scale9_grid_editvo);
					thisObj.resEventService.sendEvent(ResGlobalEvents.Json_Modifyed, thisObj.scale9_grid_editvo);
				}
			});
			window.open('root', true);
		});
	}

	/**在预览区显示节点 */
	public showPreView(node?: TreeLeafNode | TreeParentNode | TreeNodeBase | any) {
		this.clear();
		if (node) {
			if (node.isFolder) {//folder
				if (ResType.TYPE_SHEET === node.type) {// 加载sheet里的图
					if (node.resvo && node.resvo instanceof ResInfoVO) {
						let resvo: ResInfoVO = node.resvo;
						this.currentResInfoVO = resvo;
						ResUtil.getSheetPicPath(resvo.locolUrl).then(picpath => {
							if (picpath && picpath.length) {
								RES.getResByUrl(picpath, texture => {
									this.matDisplay.source = texture;
								}, this, RES.ResourceItem.TYPE_IMAGE);
							}
						});
					}
				}
			} else {//file
				if (node instanceof TreeLeafNode) {
					if (node.resvo && (node.resvo instanceof ResInfoVO)) {
						var resvo: ResInfoVO = node.resvo;
						this.currentResInfoVO = resvo;
						this.matDisplay.savePreViewSize(this.previewGroup.width, this.previewGroup.height);
						if (ResType.TYPE_SHEET === resvo.type) {// 加载sheet里的图
							fsextra.pathExists(resvo.locolUrl).then((ret: boolean) => {
								if (ret) {
									//加载sheet还要判断对应的图片是否存在
									ResUtil.getSheetPicPath(resvo.locolUrl).then(picpath => {
										if (picpath && picpath.length) {
											RES.getResByUrl(resvo.locolUrl, function (r: egret.SpriteSheet) {
												if (r) {
													this.matDisplay.source = r.getTexture(node.label);
												}
												this.updateSizeLabel();
											}, this, RES.ResourceItem.TYPE_SHEET);
										}
									});
								} else {
									console.warn('json file not exists:', resvo.locolUrl);
								}
							});
						} else {
							this.showPreViewByResVO(resvo);
						}
					}
				}
			}
		}
	}

	private onGlobShowPreview(data: any) {
		if (data instanceof ResInfoVO) {
			this.showPreViewByResVO(data);
		} else if (data instanceof Array) {
			//选择了多个vo，显示第一个选中的
			this.showPreViewByResVO(data[0]);
		} else {
			this.clear();
		}
	}

	private onUpdateResinfoVO(vo: ResInfoVO) {
		if (this.currentResInfoVO !== vo) {
			return;
		}
		this.showPreViewByResVO(vo);
	}
	/**
	 * 更新预览区的显示
	 */
	private showPreViewByResVO(resvo: ResInfoVO) {
		this.clear();
		this.currentResInfoVO = resvo;
		if (!resvo) {
			return;
		}

		this.matDisplay.savePreViewSize(this.previewGroup.width, this.previewGroup.height);
		if (resvo.fileError) {
			return;
		}
		if (ResType.TYPE_IMAGE === resvo.type) {
			this.scale9GridBtn.visible = true;
			fsextra.pathExists(resvo.locolUrl).then((ret: boolean) => {
				if (ret) {
					// 通过完整URL方式获取外部资源
					RES.getResByUrl(resvo.locolUrl + '?rand=' + Math.random(), (texture: egret.Texture) => {
						//将加载完的资源进行显示
						this.matDisplay.source = texture;
						// 显示size信息和grid信息，要等待加载完资源后设置
						var scale9grid: egret.Rectangle = new egret.Rectangle(resvo.x, resvo.y, resvo.w, resvo.h);
						this.setScale9(scale9grid);
						this.updatePreview(resvo);
						this.updateSizeLabel();
					}, this, RES.ResourceItem.TYPE_IMAGE);
				} else {
					console.warn('not exists path:', resvo.locolUrl);
				}
			});
		} else if (ResType.TYPE_SHEET === resvo.type) {
			ResUtil.getSheetPicPath(resvo.locolUrl).then(picpath => {
				if (picpath && picpath.length) {
					RES.getResByUrl(picpath, texture => {
						this.matDisplay.source = texture;
					}, this, RES.ResourceItem.TYPE_IMAGE);
				}
			});
		}
	}

	/**更新尺寸文本的显示 */
	private updateSizeLabel(): void {
		this.previewGroup.invalidateSize();
		this.previewGroup.invalidateDisplayList();
		this.previewGroup.validateNow();
	}
	public setScale9(scale9Grid: egret.Rectangle): void {
		this.matDisplay.setScale9Grid(scale9Grid);
	}
	/**清除预览区显示的内容 */
	public clear() {
		this.matDisplay.source = null;
		this.setScale9(null);//清空9切线
		this.scale9GridBtn.visible = false;
	}


	public destory() {
		this.matDisplay = null;
		this.previewGroup.removeEventListener(eui.UIEvent.RESIZE, this.onPreViewGroupResize, this);
		this.removeGlobalEvents();
	}
}