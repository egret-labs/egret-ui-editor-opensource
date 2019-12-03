//拖动区渲染器
import { IP9TPointRender } from "../interfaces/IP9TPointRender";
import { Matrix } from "../../../data/Matrix";
export class MoveOPRender implements IP9TPointRender {
	public root: HTMLElement;
	constructor() {
		this.root = document.createElement('div');
		this.root.style.position = 'absolute';
		this.root.style.pointerEvents = 'all';
		// this.root.style.border = 'solid 1px #007bff';
		this.root.style.transformOrigin = 'left top';
		this.root.style.left = '0px';
		this.root.style.top = '0px';
	}
	private _x: number;
	public set x(v: number) {
		this._x = v;
		this.updateStyle();
	}
	private _y: number;
	public set y(v: number) {
		this._y = v;
		this.updateStyle();
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
	private _matrix: Matrix = new Matrix();
	public set matrix(v: Matrix) {
		this._matrix = v;
		this.updateStyle();
	}
	private _visible: boolean = true;
	public set visible(v: boolean) {
		this._visible = v;
		this.root.hidden = !v;
	}
	public get visible(): boolean {
		return this._visible;
	}
	public pname: string;
	public checkCenterSpace(stageX: number, stageY: number): boolean {
		return true;
	}
	protected updateStyle(): void {
		if (this.root) {
			this.root.style.width = this._width + 'px';
			this.root.style.height = this._height + 'px';
			this.root.style.transform = 'matrix(' + this._matrix.a + ',' + this._matrix.b + ',' + this._matrix.c + ',' + this._matrix.d + ',' + this._matrix.tx + ',' + this._matrix.ty + ')';
			this.root.hidden = !this._visible;
		}
	}
	public container: HTMLElement;
	public render(container: HTMLElement): void {
		this.container = container;
		this.container.appendChild(this.root);
		this.updateStyle();
	}
	public removeFromParent():void{
		this.root.remove();
	}
}