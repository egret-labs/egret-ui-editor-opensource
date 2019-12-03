import { IP9TPointRender } from './../interfaces/IP9TPointRender';
import { IP9TPointRenderFactory } from './../interfaces/IP9TPointRenderFactory';
import { MatrixUtil } from '../../util/MatrixUtil';
import { Point } from '../../../data/Point';

/**
 */
export class DefaultP9TPRender implements IP9TPointRender, IP9TPointRenderFactory {
	public root:HTMLElement;
	constructor() {
		this.root = document.createElement('div');
		this.root.style.position = 'absolute';
		this.root.style.transformOrigin='left top';
		this.root.style.background='rgba(255,255,255,0.0)';
		this.root.style.borderRadius=this.size/2+'px';
		this.root.style.pointerEvents='all';

		let item=document.createElement('div');
		item.style.position = 'absolute';
		item.style.border='solid 2px #3695FF';
		item.style.transformOrigin='left top';
		item.style.width='8px';
		item.style.height='8px';
		item.style.left='6px';
		item.style.top='6px';
		item.style.background='#d8d8d8';
		item.style.borderRadius='4px';
		this.root.appendChild(item);
		this.root.hidden=!this._visible;
	}
	private _x: number;
	public set x(v: number) {
		this._x = v;
		this.updateStyle();
	}
	public get x():number{
		return this._x;
	}
	private _y: number;
	public set y(v: number) {
		this._y = v;
		this.updateStyle();
	}
	public get y():number{
		return this._y;
	}
	private _width: number;
	public set width(v: number) {
		this._width = v;
		this.updateStyle();
	}
	private _height: number;
	public set height(v: number) {
		this._height = v;
		this.updateStyle();
	}
	public pname: string;
	private size: number = 20;
	public checkCenterSpace(stageX: number, stageY: number): boolean {
		var localP: Point =MatrixUtil.globalToLocal(this.root,new Point(stageX,stageY));
		localP.x-=this.size/2;
		localP.y-=this.size/2;
		var length: number = Math.sqrt(localP.x * localP.x + localP.y * localP.y);
		if (length > 4) {
			return false;
		}
		return true;
	}
	private _visible:boolean=true;
	public set visible(v:boolean){
		this._visible=v;
		this.root.hidden=!v;
	}
	public get visible():boolean{
		return this._visible;
	}
	public container:HTMLElement;
	public render(container: HTMLElement): void {
		this.container=container;
		this.container.appendChild(this.root);
		this.updateStyle();
	}
	protected updateStyle(): void {
		if (this.root) {
			this.root.style.left = (this._x-this.size/2) + 'px';
			this.root.style.top = (this._y-this.size/2) + 'px';
			this.root.style.width = this.size + 'px';
			this.root.style.height = this.size + 'px';
		}
	}
	public removeFromParent():void{
		this.root.remove();
	}
	public createInstance(): IP9TPointRender {
		return new DefaultP9TPRender();
	}
}