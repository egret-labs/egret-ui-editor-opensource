import { IP9TPointRender } from "../interfaces/IP9TPointRender";
import { IP9TPointRenderFactory } from "../interfaces/IP9TPointRenderFactory";
// tslint:disable-next-line:class-name
export class AnchorRender_Rotation implements IP9TPointRender, IP9TPointRenderFactory {
	constructor() {
		this.root = document.createElement('div');
		this.root.style.pointerEvents = 'all';
		this.root.style.width = this.size + 'px';
		this.root.style.height = this.size + 'px';
		this.root.style.position = 'absolute';
		this.root.style.transformOrigin = 'left top';

		let ns = 'http://www.w3.org/2000/svg';
		this.svg = document.createElementNS(ns, 'svg') as SVGSVGElement;
		this.svg.style.pointerEvents = 'none';
		this.svg.style.position = 'absolute';
		this.svg.style.width = '24px';
		this.svg.style.height = '24px';
		this.svg.style.transformOrigin = '50% 50%';
		this.root.appendChild(this.svg);

		let path: SVGPathElement = document.createElementNS(ns, 'path') as SVGPathElement;
		path.style.pointerEvents = 'none';
		path.style.fill = '#fff';
		path.style.opacity = '0.72';
		path.setAttribute('d', 'M12,14a2,2,0,1,0-2-2A2,2,0,0,0,12,14ZM7.05,7.05a7,7,0,0,1,9.9,0L21.9,12l-4.95,4.95a7,7,0,0,1-9.9-9.9Z');
		this.svg.appendChild(path);

		path = document.createElementNS(ns, 'path') as SVGPathElement;
		path.style.pointerEvents = 'none';
		path.style.fill = '#3695FF';
		path.style.fillRule = 'evenodd';
		path.setAttribute('d', 'M12,15a3,3,0,1,0-3-3A3,3,0,0,0,12,15ZM7.76,7.76a6,6,0,0,1,8.49,0L20.49,12l-4.24,4.24A6,6,0,0,1,7.76,7.76Z');
		this.svg.appendChild(path);
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
	public checkCenterSpace(stageX: number, stageY: number): boolean {
		return true;
	}
	public createInstance(): IP9TPointRender {
		return new AnchorRender_Rotation();
	}
	private _rotation: number = 0;
	public set rotation(v: number) {
		this._rotation = v;
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
	private size: number = 24;
	public container: HTMLElement;
	public root: HTMLDivElement;
	private svg: SVGSVGElement;
	public render(container: HTMLElement): void {
		this.container = container;
		this.container.appendChild(this.root);
		this.updateStyle();
	}
	protected updateStyle(): void {
		if (this.root) {
			this.root.style.left = (this._x - this.size / 2) + 'px';
			this.root.style.top = (this._y - this.size / 2) + 'px';
			this.root.hidden = !this._visible;
			this.svg.style.transform = 'rotate(' + this._rotation + 'deg)';
		}
	}
	public removeFromParent(): void {
		this.root.remove();
	}
}