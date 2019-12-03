import { RulerMotor } from './RulerMotor';
import { HtmlElementResizeHelper } from '../HtmlElementResizeHelper';
import { MatrixUtil } from '../t9transformer/util/MatrixUtil';
import { FocusRectLayer, FocusRectLayerEvent } from '../FocusRectLayer';
import { IAbosrbLineProvider } from '../absorb/Absorber';
import { AbsorbLine, AbsorbLineType } from '../absorb/AbsorbLine';
import { Point } from '../data/Point';
import { IRender } from '../IRender';
/**
 */
export class PixGrid implements IAbosrbLineProvider, IRender {
	private rulerMotor: RulerMotor;
	public root: HTMLCanvasElement;
	constructor() {
		this.root = document.createElement('canvas');
		this.rulerMotor = new RulerMotor();
		this.updateDisplay = this.updateDisplay.bind(this);
	}
	public container: HTMLElement;
	public render(container: HTMLElement): void {
		this.container = container;
		HtmlElementResizeHelper.watch(this.container);
		this.container.addEventListener('resize', this.updateDisplay);

		this.container.appendChild(this.root);
	}
	private _focusRectLayer: FocusRectLayer;
	public set focusRectLayer(v: FocusRectLayer) {
		this._focusRectLayer = v;
		this._focusRectLayer.addEventListener(FocusRectLayerEvent.VIEWCHANGED, this.focusRectlayerEventHandle, this);
		this.focusRectlayerEventHandle();
	}
	private _explicityGridSize: number = NaN;
	/**
	 * 明确的网格尺寸 (设置为NaN可恢复默认网格样式)
	 */
	public set explicityGridSize(v: number) {
		this._explicityGridSize = v;
		if (this.root) {
			this.updateDisplay();
		}
	}
	public get explicityGridSize(): number {
		return this._explicityGridSize;
	}
	public getAbsorbLines(): AbsorbLine[] {
		if (!isNaN(this._explicityGridSize)) {
			let offsetP: Point = MatrixUtil.localToGlobal(this.container, new Point());
			let gap: number = this.rulerMotor.currentMarkLength / this.rulerMotor.currentMarkNum * this._explicityGridSize;
			let lines: AbsorbLine[] = [];
			//原点右侧刻度
			let raseX: number = this.anchorPoint.x;
			let finalX: number = Math.round(raseX) + 0.5;
			while (raseX < this.root.width) {
				lines.push(new AbsorbLine(AbsorbLineType.VERTICAL, finalX + offsetP.x, { yFrom: 0 + offsetP.y, yTo: this.root.height + offsetP.y }));
				raseX += gap;
				finalX = Math.round(raseX) + 0.5;
			}
			//原点左侧刻度
			raseX = this.anchorPoint.x;
			finalX = Math.round(raseX) + 0.5;
			while (raseX > 0) {
				lines.push(new AbsorbLine(AbsorbLineType.VERTICAL, finalX + offsetP.x, { yFrom: 0 + offsetP.y, yTo: this.root.height + offsetP.y }));
				raseX -= gap;
				finalX = Math.round(raseX) + 0.5;
			}
			//原点下侧刻度
			let raseY: number = this.anchorPoint.y;
			let finalY: number = Math.round(raseY) + 0.5;
			while (raseY < this.root.height) {
				lines.push(new AbsorbLine(AbsorbLineType.HORIZONTAIL, finalY + offsetP.y, { xFrom: 0 + offsetP.x, xTo: this.root.width + offsetP.x }));
				raseY += gap;
				finalY = Math.round(raseY) + 0.5;
			}
			//原点上侧刻度
			raseY = this.anchorPoint.y;
			finalY = Math.round(raseY) + 0.5;
			while (raseY > 0) {
				lines.push(new AbsorbLine(AbsorbLineType.HORIZONTAIL, finalY + offsetP.y, { xFrom: 0 + offsetP.x, xTo: this.root.width + offsetP.x }));
				raseY -= gap;
				finalY = Math.round(raseY) + 0.5;
			}
			return lines;
		}
		return [];
	}
	private anchorPoint: Point = new Point();
	private focusRectlayerEventHandle(): void {
		let p: Point = MatrixUtil.localToGlobal(this._focusRectLayer.getRootFocusRect().root, new Point(0, 0));
		this.anchorPoint = MatrixUtil.globalToLocal(this.container, p);
		this.rulerMotor.scale = this._focusRectLayer.scale;
		this.updateDisplay();
	}
	private updateDisplay(): void {
		//更新canvas的尺寸
		this.root.width = this.container.offsetWidth;
		this.root.height = this.container.offsetHeight;
		this.root.style.backgroundColor = 'rgba(0,0,0,0.2)'
		let context = this.root.getContext('2d');
		//绘制网格线
		if (isNaN(this._explicityGridSize)) {
			this.drawLine(context, 'rgba(68,68,68,0.2)', this.rulerMotor.currentMarkLength / 5);
			this.drawLine(context, 'rgba(68,68,68,0.5)', this.rulerMotor.currentMarkLength);
		}
		else {
			this.drawLine(context, 'rgba(68,68,68,0.5)', this.rulerMotor.currentMarkLength / this.rulerMotor.currentMarkNum * this._explicityGridSize);
		}
		//绘制坐标轴线
		context.beginPath();
		context.strokeStyle = '#3695FF';
		context.moveTo(0, Math.round(this.anchorPoint.y) + 0.5);
		context.lineTo(this.root.width, Math.round(this.anchorPoint.y) + 0.5);
		context.moveTo(Math.round(this.anchorPoint.x) + 0.5, 0);
		context.lineTo(Math.round(this.anchorPoint.x) + 0.5, this.root.height);
		context.stroke();
	}
	private drawLine(context: CanvasRenderingContext2D, colorStyle: string, gap: number): void {
		context.beginPath();
		//原点右侧刻度
		let raseX: number = this.anchorPoint.x;
		let finalX: number = Math.round(raseX) + 0.5;
		context.moveTo(raseX, this.root.height);
		context.strokeStyle = colorStyle;
		while (raseX < this.root.width) {
			context.moveTo(finalX, this.root.height); context.lineTo(finalX, 0);
			raseX += gap;
			finalX = Math.round(raseX) + 0.5;
		}
		//原点左侧刻度
		raseX = this.anchorPoint.x;
		finalX = Math.round(raseX) + 0.5;
		context.moveTo(raseX, this.root.height);
		while (raseX > 0) {
			context.moveTo(finalX, this.root.height); context.lineTo(finalX, 0);
			raseX -= gap;
			finalX = Math.round(raseX) + 0.5;
		}
		//原点下侧刻度
		let raseY: number = this.anchorPoint.y;
		let finalY: number = Math.round(raseY) + 0.5;
		while (raseY < this.root.height) {
			context.moveTo(this.root.width, finalY); context.lineTo(0, finalY);
			raseY += gap;
			finalY = Math.round(raseY) + 0.5;
		}
		//原点上侧刻度
		raseY = this.anchorPoint.y;
		finalY = Math.round(raseY) + 0.5;
		while (raseY > 0) {
			context.moveTo(this.root.width, finalY); context.lineTo(0, finalY);
			raseY -= gap;
			finalY = Math.round(raseY) + 0.5;
		}
		context.stroke();
	}
	public removeFromParent(): void {
		this.root.remove();
	}
	public dispose(): void {
		if (this._focusRectLayer) {
			this._focusRectLayer.removeEventListener(FocusRectLayerEvent.VIEWCHANGED, this.focusRectlayerEventHandle, this);
		}
		HtmlElementResizeHelper.unWatch(this.container);
		this.container.removeEventListener('resize', this.updateDisplay);
		//移除所有内容
		this.removeFromParent();
	}
}