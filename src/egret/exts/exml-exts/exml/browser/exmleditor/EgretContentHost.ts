
import { EventDispatcher, Event } from './EventDispatcher';
import { TweenLite } from "gsap";

export class EgretContentHostEvent extends Event {
	public static DISPLAYCHANGE: string = 'displaychange';
	constructor(type: string) {
		super(type);
	}
}

/**
 * egret内容承载器。由于场景编辑中egret舞台的状态是无缩放铺满状态，所以场景编辑中的场景移动、缩放等操作必须转移到egret内部
 * 此对象就是为了衔接egret内容和外部编辑器而生
 */
export class EgretContentHost extends EventDispatcher {
	constructor() {
		super();
	}
	private target;
	public setTarget(target) {
		this.target = target;
	}
	public getTarget(): any {
		return this.target;
	}
	// public get target(): any {
	// 	return this._target;
	// }
	public getProperty(): { x: number, y: number, scaleX: number, scaleY: number } {
		return {
			x: this.propertyCache.x,
			y: this.propertyCache.y,
			scaleX: this.propertyCache.scaleX,
			scaleY: this.propertyCache.scaleY
		};
	}

	private _propertyCache: { x: number, y: number, scaleX: number, scaleY: number } = null;
	private get propertyCache(): { x: number, y: number, scaleX: number, scaleY: number } {
		if (!this._propertyCache) {
			this._propertyCache = {
				x: this.target.x,
				y: this.target.y,
				scaleX: this.target.scaleX,
				scaleY: this.target.scaleY
			};
		}
		return this._propertyCache;
	}
	public setProperty(x: number, y: number, scaleX: number, scaleY: number, tween: boolean = false, duration: number = 0.3): void {
		this.propertyCache.x = x;
		this.propertyCache.y = y;
		this.propertyCache.scaleX = scaleX;
		this.propertyCache.scaleY = scaleY;
		if (scaleX == 0 || scaleY == 0) {
			//console.log("")
		}

		TweenLite.killTweensOf(this.target);
		if (tween) {
			TweenLite.to(this.target, duration, {
				x: x, y: y, scaleX: scaleX, scaleY: scaleY, onUpdate: () => {
					this.dispatchEvent(new EgretContentHostEvent(EgretContentHostEvent.DISPLAYCHANGE));
				}, onComplete: () => {
					this.dispatchEvent(new EgretContentHostEvent(EgretContentHostEvent.DISPLAYCHANGE));
				},
			})
		} else {
			this.target.x = x;
			this.target.y = y;
			this.target.scaleX = scaleX;
			this.target.scaleY = scaleY;
			this.dispatchEvent(new EgretContentHostEvent(EgretContentHostEvent.DISPLAYCHANGE));
		}
	}
	public dispose(): void {
	}
}