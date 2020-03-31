import {ResRightMenu} from 'egret/exts/resdepot/components/ResRightMenu';
import {GridItemRendererBase} from './GridItemRendererBase';
import { IResEventService } from '../events/ResEventService';

/**
 * 组内资源
 */
export class ResGroupResItemRender extends GridItemRendererBase {
	private rightMenu: ResRightMenu = new ResRightMenu([ResRightMenu.LABELS.REMOVE_RES, ResRightMenu.LABELS.OPEN_IN_FOLDER],
		[ResRightMenu.IDS.REMOVE_RES, ResRightMenu.IDS.OPEN_IN_FOLDER], 'default', this);

	public constructor() {
		super();
		this.touchChildren = false;
		this.addEventListener(egret.MouseEvent.MOUSE_OVER, this.onMouseOver, this);
		this.addEventListener(egret.MouseEvent.MOUSE_OUT, this.onMouseOut, this);
		this.addEventListener(egret.MouseEvent.RIGHT_MOUSE_DOWN, this.onRightMouseDown, this);
		// this.skin['labelDisplay'].size = 14;
		this.skin['labelDisplay'].maxHeight = 14;//设置最大高度，防止宽度不够导致换行
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
	// private _groupVisible:boolean = false;

	public prepare(hasBeenRecycled: boolean): void {
		super.prepare(hasBeenRecycled);

		if (this.data && this.data.info && this.data.info) {
			// if(!ResInfoVO(data.info).inCurrentGroup)
			// {
			// 	groupVisible = false;
			// }else
			// {
			this.groupVisible = true;
			// }
		}
	}

	private onMouseOver(event: egret.MouseEvent) {
		// console.log('onMouseOver', event.data, this);
	}

	private onMouseOut(event: egret.MouseEvent) {
		// console.log('onMouseOver', event.data, this);
	}
}