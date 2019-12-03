import { IRender } from "../IRender";
import { INode } from "egret/exts/exml-exts/exml/common/exml/treeNodes";

/**
 * 拖拽指示矩形
 */
export class DragRect implements IRender {
	public root: HTMLElement;
	constructor() {
		this.root = document.createElement('div');
		this.root.style.position = 'absolute';
		this.root.style.left = '0px';
		this.root.style.top = '0px';
		this.root.style.pointerEvents = 'none';
		this.root.style.border = '1px solid blue';
	}
	public container: HTMLElement;
	public render(container: HTMLElement): void {
		this.container = container;
		this.container.appendChild(this.root);

	}
	private interrupt: number = -1;
	public removeFromParent(): void {
		this.root.remove();
	}
	private x: number;
	private y: number;
	public width: number;
	public height: number;
	public setBounds(x: number, y: number, width: number, height: number): void {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.root.style.left = x + 'px';
		this.root.style.top = y + 'px';
		this.root.style.width = width + 'px';
		this.root.style.height = height + 'px';
	}
}