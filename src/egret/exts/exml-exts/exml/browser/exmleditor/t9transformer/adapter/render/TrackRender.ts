
import { IP9TPointRender } from "../interfaces/IP9TPointRender";
import { IP9TPointRenderFactory } from "../interfaces/IP9TPointRenderFactory";
export class TackRender implements IP9TPointRender,IP9TPointRenderFactory {
	public root: HTMLElement;
	constructor(){
		this.root = document.createElement('div');
		this.root.style.pointerEvents = 'all';
		this.root.style.position = 'absolute';
		this.root.style.transformOrigin = 'left top';
		this.root.style.background = 'rgba(255,255,255,0.3)';
		this.root.style.borderRadius = '13px';
		this.root.style.borderColor='#3695FF';
		this.root.style.borderStyle='solid';
		this.root.style.borderWidth='1px';
	}
	public pname: string;
	private _x: number;
	public set x(v: number) {
		this._x = v;
		this.updateStyle();
	}
	public get x(): number {
		return this._x;
	}
	private _y: number;
	public set y(v: number) {
		this._y = v;
		this.updateStyle();
	}
	public get y(): number {
		return this._y;
	}
	private _visible: boolean = true;
	public set visible(v: boolean) {
		this._visible = v;
		this.root.hidden = !v;
	}
	public get visible(): boolean {
		return this._visible;
	}public createInstance(): IP9TPointRender {
		return new TackRender();
	}
	public checkCenterSpace(stageX: number, stageY: number): boolean {
		return true;
	}
	private size: number = 26;
	public container: HTMLElement;
	public render(container: HTMLElement): void {
		this.container = container;
		this.container.appendChild(this.root);
		this.updateStyle();
	}
	protected updateStyle(): void {
		if (this.root) {
			this.root.style.left = (this._x - this.size / 2) + 'px';
			this.root.style.top = (this._y - this.size / 2) + 'px';
			this.root.style.width = this.size + 'px';
			this.root.style.height = this.size + 'px';
			this.root.hidden = !this._visible;
		}
	}
	public removeFromParent():void{
		this.root.remove();
	}
}