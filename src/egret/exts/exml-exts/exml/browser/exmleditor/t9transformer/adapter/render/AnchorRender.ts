
import { IP9TPointRender } from "../interfaces/IP9TPointRender";
import { IP9TPointRenderFactory } from "../interfaces/IP9TPointRenderFactory";

export class AnchorRender implements IP9TPointRender, IP9TPointRenderFactory {
	public root: HTMLElement;
	constructor() {
		this.root = document.createElement('div');
		this.root.style.pointerEvents = 'all';
		this.root.style.position = 'absolute';
		this.root.style.border = 'solid 1px wheat';
		this.root.style.transformOrigin = 'left top';
		this.root.style.background = '#007bff';
		this.root.style.borderRadius = '4px';
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
	public pname: string;
	private size: number = 8;
	public checkCenterSpace(stageX: number, stageY: number): boolean {
		return true;
	}
	public createInstance(): IP9TPointRender {
		return new AnchorRender();
	}
	private _visible: boolean = true;
	public set visible(v: boolean) {
		this._visible = v;
		this.root.hidden = !v;
	}
	public get visible(): boolean {
		return this._visible;
	}
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
	public removeFromParent(): void {
		this.root.remove();
	}
}