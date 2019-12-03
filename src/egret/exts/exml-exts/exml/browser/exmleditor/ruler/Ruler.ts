import { RulerMotor } from './RulerMotor';
import { HtmlElementResizeHelper } from '../HtmlElementResizeHelper';
import { MatrixUtil } from '../t9transformer/util/MatrixUtil';
import { FocusRectLayer, FocusRectLayerEvent } from '../FocusRectLayer';
import { Point } from '../data/Point';
import { IRender } from '../IRender';
/**
 */
export class Ruler implements IRender {
	public static TYPE_HORIZONTAL: string = 'type_horizontal';
	public static TYPE_VERTICAL: string = 'type_vertical';
	private type: string;
	public root: HTMLElement;
	constructor(type: string) {
		this.type = type;
		this.updateDisplay = this.updateDisplay.bind(this);
		this.focusRectlayerEventHandle = this.focusRectlayerEventHandle.bind(this);
		this.documentEventHandle = this.documentEventHandle.bind(this);
		this.rulerMotor = new RulerMotor();

		this.root = document.createElement('div');
		this.root.style.minHeight = this.root.style.minWidth =
			this.root.style.height = this.root.style.width = '0px';
			
		this.canvas = document.createElement('canvas');
		this.root.appendChild(this.canvas);

		this.mouseTag = document.createElement('div');
		this.root.appendChild(this.mouseTag);
		this.mouseTag.style.backgroundColor = '#0d62af';
		this.mouseTag.style.position = 'absolute';
	}
	private rulerMotor: RulerMotor;
	public container: HTMLElement;
	private containerParent:HTMLElement;
	private canvas: HTMLCanvasElement;
	private mouseTag: HTMLElement;

	public render(container: HTMLElement): void {
		this.container = container;
		this.containerParent=container.parentElement;
		HtmlElementResizeHelper.watch(this.container);
		this.container.addEventListener('resize', this.updateDisplay);
		this.container.appendChild(this.root);
		this.updateMouseTag();
		this.containerParent.addEventListener('mousemove', this.documentEventHandle);
	}
	private _focusRectLayer: FocusRectLayer;
	public set focusRectLayer(v: FocusRectLayer) {
		this._focusRectLayer = v;
		this._focusRectLayer.addEventListener(FocusRectLayerEvent.VIEWCHANGED, this.focusRectlayerEventHandle, this);
		this.focusRectlayerEventHandle();
	}
	private anchorPoint: Point = new Point();
	private focusRectlayerEventHandle(): void {
		let p: Point = MatrixUtil.localToGlobal(this._focusRectLayer.getRootFocusRect().root, new Point(0, 0));
		this.anchorPoint = MatrixUtil.globalToLocal(this.container, p);
		this.rulerMotor.scale = this._focusRectLayer.scale;
		this.updateDisplay();
	}


	// 鼠标偏移量
	private offset = {offsetX:2,offsetY:4};
	private documentEventHandle(e: MouseEvent): void {
		let p: Point = MatrixUtil.globalToLocal(this.container, new Point(e.clientX, e.clientY));
		switch (this.type) {
			case Ruler.TYPE_HORIZONTAL:
				this.mouseTag.style.left = p.x-this.offset.offsetX + 'px';
				this.mouseTag.style.top = '0px';
				break;
			case Ruler.TYPE_VERTICAL:
				this.mouseTag.style.left = '0px';
				this.mouseTag.style.top = p.y-this.offset.offsetY + 'px';
				break;
		}
	}
	private updateMouseTag(): void {
		switch (this.type) {
			case Ruler.TYPE_HORIZONTAL:
				this.mouseTag.style.width = '1px';
				this.mouseTag.style.height = this.canvas.height + 'px';
				break;
			case Ruler.TYPE_VERTICAL:
				this.mouseTag.style.width = this.canvas.width + 'px';
				this.mouseTag.style.height = '1px';
				break;
		}
	}
	private updateDisplay(): void {
		//更新canvas的尺寸
		this.canvas.width = this.container.offsetWidth;
		this.canvas.height = this.container.offsetHeight;
		let valueGap: number = this.rulerMotor.currentMarkNum;
		let markGap: number = this.rulerMotor.currentMarkLength / 10;
		this.updateMouseTag();

		let context = this.canvas.getContext('2d');
		//绘制背景
		context.fillStyle = "#2d2d2e";
		context.fillRect(0, 0, this.canvas.width, this.canvas.height);
		context.beginPath();
		context.strokeStyle = '#888888';
		switch (process.platform) {
			case "win32":
				context.font = "11px '宋体'";
				break;
			case "darwin":
				context.font = "11px 'SourceHanSansSC-Light'";
				break;
		}
		context.fillStyle = "#888888";
		switch (this.type) {
			case Ruler.TYPE_HORIZONTAL:
				// //绘制直线
				context.moveTo(0, this.canvas.height);
				context.lineTo(this.canvas.width, this.canvas.height);
				//原点右侧刻度
				let raseX: number = this.anchorPoint.x;
				let finalX: number = Math.round(raseX) + 0.5;
				context.moveTo(raseX, this.canvas.height);
				let lineCount: number = 0;
				while (raseX < this.canvas.width) {
					if (lineCount % 10 === 0) {
						context.moveTo(finalX, this.canvas.height - 1); context.lineTo(finalX, 3);
						context.fillText((lineCount / 10 * valueGap).toString(), raseX + 2, 11);
					}
					else if (lineCount % 2 === 0) { context.moveTo(finalX, this.canvas.height - 1); context.lineTo(finalX, this.canvas.height - 6); }
					else { context.moveTo(finalX, this.canvas.height - 1); context.lineTo(finalX, this.canvas.height - 4); }
					raseX += markGap;
					finalX = Math.round(raseX) + 0.5;
					lineCount++;
				}
				//原点左侧刻度
				raseX = this.anchorPoint.x;
				finalX = Math.round(raseX) + 0.5;
				context.moveTo(raseX, this.canvas.height);
				lineCount = 0;
				while (raseX > 0) {
					if (lineCount % 10 === 0) {
						context.moveTo(finalX, this.canvas.height - 1); context.lineTo(finalX, 3);
						context.fillText((lineCount / 10 * valueGap).toString(), raseX + 2, 11);
					}
					else if (lineCount % 2 === 0) { context.moveTo(finalX, this.canvas.height); context.lineTo(finalX, this.canvas.height - 6); }
					else { context.moveTo(finalX, this.canvas.height); context.lineTo(finalX, this.canvas.height - 4); }
					raseX -= markGap;
					finalX = Math.round(raseX) + 0.5;
					lineCount++;
				}
				break;
			case Ruler.TYPE_VERTICAL:
				//绘制直线
				context.moveTo(this.canvas.width, 0);
				context.lineTo(this.canvas.width, this.canvas.height);
				//原点下侧刻度
				let raseY: number = this.anchorPoint.y;
				let finalY: number = Math.round(raseY) + 0.5;
				lineCount = 0;
				while (raseY < this.canvas.height) {
					if (lineCount % 10 === 0) {
						context.moveTo(this.canvas.width - 1, finalY); context.lineTo(3, finalY);
						let text: string = (lineCount / 10 * valueGap).toString();
						for (let i: number = 0; i < text.length; i++) {
							context.fillText(text[i], 5, raseY + 11 + i * 11);
						}
					}
					else if (lineCount % 2 === 0) { context.moveTo(this.canvas.width - 1, finalY); context.lineTo(this.canvas.width - 6, finalY); }
					else { context.moveTo(this.canvas.width - 1, finalY); context.lineTo(this.canvas.width - 4, finalY); }
					raseY += markGap;
					finalY = Math.round(raseY) + 0.5;
					lineCount++;
				}
				//原点左侧刻度
				raseY = this.anchorPoint.y;
				finalY = Math.round(raseY) + 0.5;
				lineCount = 0;
				while (raseY > 0) {
					if (lineCount % 10 === 0) {
						context.moveTo(this.canvas.width - 1, finalY); context.lineTo(3, finalY);
						let text: string = (lineCount / 10 * valueGap).toString();
						for (let i: number = 0; i < text.length; i++) {
							context.fillText(text[i], 5, raseY + 11 + i * 11);
						}
					}
					else if (lineCount % 2 === 0) { context.moveTo(this.canvas.width - 1, finalY); context.lineTo(this.canvas.width - 6, finalY); }
					else { context.moveTo(this.canvas.width - 1, finalY); context.lineTo(this.canvas.width - 4, finalY); }
					raseY -= markGap;
					finalY = Math.round(raseY) + 0.5;
					lineCount++;
				}
				break;
		}
		context.stroke();
	}
	public removeFromParent(): void {
		this.root.remove();
	}
	/**释放资源 */
	public dispose(): void {
		if (this._focusRectLayer) {
			this._focusRectLayer.removeEventListener(FocusRectLayerEvent.VIEWCHANGED, this.focusRectlayerEventHandle, this);
		}
		if(this.container){
			HtmlElementResizeHelper.unWatch(this.container);
			this.container.removeEventListener('resize', this.updateDisplay);
		}
		if(this.containerParent){
			this.containerParent.removeEventListener('mousemove', this.documentEventHandle);
		}
		this.containerParent = null;
		//移除所有内容
		this.removeFromParent();
	}
}