import {ResRightMenu} from 'egret/exts/resdepot/components/ResRightMenu';
import {GridItemRendererBase} from './GridItemRendererBase';
import { isMacintosh } from 'egret/base/common/platform';
import { IResEventService } from '../events/ResEventService';

/**
 * 组
 */
export class ResGroupItemRender extends GridItemRendererBase {
	private rightMenu:ResRightMenu = new ResRightMenu([ResRightMenu.LABELS.DELETE_GROUP],[ResRightMenu.IDS.DELETE_GROUP]);
	public errorLabel:eui.Label = new eui.Label();
	public constructor() {
		super();
		this.touchChildren = false;
		this.addEventListener(egret.MouseEvent.MOUSE_OVER, this.onMouseOver, this);
		this.addEventListener(egret.MouseEvent.MOUSE_OUT, this.onMouseOut, this);
		this.addEventListener(egret.MouseEvent.RIGHT_MOUSE_DOWN, this.onRightMouseDown, this);
		this.skin['labelDisplay'].size = 14;
		this.skin['labelDisplay'].maxHeight = 14;//设置最大高度，防止宽度不够导致换行
		this.errorLabel.right = 3;
		this.errorLabel.size = 14;
		this.errorLabel.fontFamily = isMacintosh ? 'PingFangSC-Regular' : 'Microsoft YaHei';
		this.errorLabel.verticalCenter = 0;
		this.errorLabel.textColor = 0xff2222;
		this.errorLabel.maxHeight = 14;
		this.errorLabel.textAlign = 'right';
		this.addChild(this.errorLabel);
	}
	
	private _resEventService:IResEventService;
	private get resEventService(): IResEventService {
		if(!this._resEventService){
			this._resEventService = this.owner['resEventService'];
		}
		return this._resEventService;
	}

	private onRightMouseDown(event: egret.MouseEvent): void {
		// 添加右键菜单
		this.rightMenu.setResEventService(this.resEventService);
		this.rightMenu.data = this.data;
		this.rightMenu.rightMenu.display(this.stage, this.stage.mouseX, this.stage.mouseY);
		// console.log(this.data);
	}

	public prepare(hasBeenRecycled: boolean): void {
		super.prepare(hasBeenRecycled);
		this.updateError();

	}

	private updateError():void{
		if (this.data && this.data.info && this.data.info) {
			if(this.data.fileErrorNum>0){
				this.warningVisible = true;
				this.errorLabel.text = `(error:${this.data.fileErrorNum})`;
				return;
			}
		}
		this.errorLabel.text = '';
	}

	public discard(r):void{
		super.discard(r);
		this.errorLabel.text = '';
	}


	private onMouseOver(event: egret.MouseEvent) {
		// console.log('onMouseOver', event.data, this);
	}

	private onMouseOut(event: egret.MouseEvent) {
		// console.log('onMouseOver', event.data, this);
	}
}