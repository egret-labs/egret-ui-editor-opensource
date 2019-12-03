import { IRender } from "../IRender";
import { FocusRectExt, FocusRectLayer } from "../FocusRectLayer";
import { INode, IValue, isInstanceof, IContainer } from "../../../common/exml/treeNodes";
import { P9TTargetAdapter } from "../t9transformer/adapter/P9TTargetAdapter";
import { Rectangle } from "../data/Rectangle";
import { Point } from "../data/Point";
import { MatrixUtil } from "../t9transformer/util/MatrixUtil";

/**
 * 容器标记矩形
 * 此类用作容器自动识别的标记组件
 */
export class ContainerMarkRect implements IRender {
	public root: HTMLElement;
	private labelDisplay:HTMLElement;
	constructor() {
		this.root = document.createElement('div');
		this.root.style.position = 'absolute';
		this.root.style.left = '0px';
		this.root.style.top = '0px';
		this.root.style.pointerEvents = 'none';
		this.root.style.border = '1px solid #ffffff';
		this.root.hidden = true;
		this.labelDisplay = document.createElement('div');
		this.labelDisplay.style.background = '#ffffff';
		this.labelDisplay.style.display = 'inline-block';
		this.labelDisplay.style.padding = '0px 10px';
		this.labelDisplay.style.borderBottomRightRadius = '6px';
		this.labelDisplay.style.fontSize = '10px';
		this.labelDisplay.style.color = '#ed724a';
		this.labelDisplay.style.position = 'absolute';
		this.root.appendChild(this.labelDisplay);

	}
	private _focusRectLayer: FocusRectLayer;
	public set focusRectLayer(v:FocusRectLayer){
		this._focusRectLayer=v;
	}
	public get focusRectLayer():FocusRectLayer{
		return this._focusRectLayer;
	}
	public container: HTMLElement;
	public render(container: HTMLElement): void {
		this.container = container;
		container.appendChild(this.root)
	}
	public removeFromParent(): void {
		this.root.remove();
	}
	private x: number;
	private y: number;
	private width: number;
	private height: number;
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
	private target: FocusRectExt;
	private setTarget(v: FocusRectExt): void {
		if (this.target === v) {
			return;
		}
		this.target = v;
		if (v) {
			this.labelDisplay.innerText = this.getNodeId(v.targetNode);
		}
		else {
			this.labelDisplay.innerText = '';
		}
		this.updateSelfSizeAndPos();
	}
	//获取节点的id
	private getNodeId(node: INode): string {
		var id: string = '';
		if (node) {
			id = node.getName();
			var idValue: IValue = node.getProperty('id');
			if (idValue) {
				id = idValue.getInstance();
			}
		}
		return id;
	}
	private adapters: P9TTargetAdapter[] = [];
	/**
	 * 开始进行容器自动标记
	 */
	public startMark(adapters: P9TTargetAdapter[] = []): void {
		this.adapters = adapters;
		this.root.hidden = false;
		// console.log('##mark start');
	}
	/**结束容器标记。
	 * 返回标记结果
	 */
	public stopMark(): FocusRectExt {
		this.root.hidden = true;
		let returnTarget: FocusRectExt = this.target;
		this.setTarget(null);
		// console.log('##mark end');
		return returnTarget;

	}
	public findTargetRect(stageX: number, stageY: number): void {
		let focusRects: Array<FocusRectExt> = this.focusRectLayer.getAllChildFocusRectWithWindowRange(new Rectangle(stageX, stageY, 1, 1), true,false);
		this.focusRectLayer.sortForDisplay(focusRects);
		for (let i: number = 0; i < focusRects.length; i++) {
			if (isInstanceof(focusRects[i].targetNode, 'eui.IContainer')) {
				let shouldContinue = false;
				for (let index = 0; index < this.adapters.length; index++) {
					let eachAdapter = this.adapters[index];
					if (eachAdapter.operateTarget) {
						let dragingNode = (<FocusRectExt><any>eachAdapter.operateTarget).targetNode;
						if (isInstanceof(dragingNode, 'eui.IContainer')) {
							let dragingContainer = dragingNode as IContainer;
							if (dragingContainer.contains(focusRects[i].targetNode)) {
								shouldContinue = true;
								break;
							}
						}
					}

				};
				if (shouldContinue) {
					continue;
				}
				this.setTarget(focusRects[i]);
				return;
			}
		}
		this.setTarget(this.focusRectLayer.getRootFocusRect());
	}
	private updateSelfSizeAndPos(): void {
		if (!this.target) {
			return;
		}
		let targetAABB: Rectangle = this.getFocusRectBounds(this.target);
		let selfXY: Point = MatrixUtil.globalToLocal(this.container, new Point(targetAABB.x, targetAABB.y));
		this.setBounds(selfXY.x-1,selfXY.y-1,targetAABB.width+2,targetAABB.height+2);
	}
	private getFocusRectBounds(target: FocusRectExt): Rectangle {
		return this.focusRectLayer.getFocusRectBounds(target);
	}
}