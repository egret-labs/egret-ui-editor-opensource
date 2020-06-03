import { OperateLayer } from './operatelayers/OperateLayer';
import { FocusRectLayer } from './FocusRectLayer';
import { Keyboard } from './data/Keyboard';
/**多点变换层
 * 此层用于处理可视化编辑的交互部分。
 */
export class TransformLayer {
	//操作层
	private operateLayer: OperateLayer;
	constructor(operateLayer: OperateLayer) {
		this.operateLayer = operateLayer;
		this.keyDown_handler = this.keyDown_handler.bind(this);
		this.keyUp_handler = this.keyUp_handler.bind(this);
	}
	//eui节点影射层
	private _focusRectLayer: FocusRectLayer;
	public get focusRectLayer(): FocusRectLayer {
		return this._focusRectLayer;
	}
	public set focusRectLayer(v: FocusRectLayer) {
		this._focusRectLayer = v;
		this.operateLayer.setFocusRectLayer(v);
	}

	private _spaceDown: boolean = false;
	private _dragEnabled: boolean = false;
	public get dragEnabled(): boolean {
		return this._dragEnabled;
	}
	public set dragEnabled(value: boolean) {
		if (this._dragEnabled != value) {
			this._dragEnabled = value;
			this.dragEnabled_handler();
		}
	}

	private _focused: boolean = false;
	/**
	 * 焦点进入
	 */
	public doFocusIn(): void {
		this._focused = true;
		if(this._spaceDown) {		
			this._spaceDown = false;
			this.dragEnabled_handler();
		}
		this.addWindowKeyBordEvent();
	}
	/**
	 * 焦点移出
	 */
	public doFocusOut(): void {
		this._focused = false;
		this.removeWindowKeyBordEvent();
	}

	private container: HTMLElement;
	public render(container: HTMLElement): void {
		this.container = container;
		this.addWindowKeyBordEvent();
		this.operateLayer.render(container);
	}
	
	private _WindowEvent: boolean = false;
	private addWindowKeyBordEvent(): void {
		if (this._focused &&
			!this._WindowEvent) {
			this._WindowEvent = true;
			window.addEventListener('keydown', this.keyDown_handler);
			window.addEventListener('keyup', this.keyUp_handler);
		}
	}

	private removeWindowKeyBordEvent(): void {
		if (this._WindowEvent) {
			this._WindowEvent = false;
			window.removeEventListener('keydown', this.keyDown_handler);
			window.removeEventListener('keyup', this.keyUp_handler);
		}
	}

	private keyDown_handler(e: KeyboardEvent): void {
		if (e.keyCode == Keyboard.SPACE) {
			this._spaceDown = true;
			this.dragEnabled_handler();
		}
	}

	private keyUp_handler(e: KeyboardEvent): void {
		if (e.keyCode == Keyboard.SPACE) {
			this._spaceDown = false;
			this.dragEnabled_handler();
		}
	}

	private dragEnabled_handler(): void {
		if (this._dragEnabled || this._spaceDown) {
			this.operateLayer.operatalbe = false;
			if (this.focusRectLayer) {
				this.focusRectLayer.dragEnabled = true;
			}
		} else {
			this.operateLayer.operatalbe = true;
			if (this.focusRectLayer) {
				this.focusRectLayer.dragEnabled = false;
			}
		}
	}

	public dispose(): void {
		this.operateLayer = null;
		this.removeWindowKeyBordEvent();
		//移除所有标签
		for (let i: number = this.container.children.length - 1; i >= 0; i--) {
			this.container.removeChild(this.container.children[i]);
		}
	}
}