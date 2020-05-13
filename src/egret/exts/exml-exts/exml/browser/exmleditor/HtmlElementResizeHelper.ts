export class HtmlElementResizeHelper {

	private static _watched: boolean = false;
	private static _UseNative: boolean = false;
	public static get UseNative(): boolean {
		return this._UseNative;
	}
	/**
	 * 设置是否使用原生方法， 原生方法仅支持 >= chrome 64 或 >= electron 3.0
	 */
	public static set UseNative(v: boolean) {
		if(HtmlElementResizeHelper._watched){
			throw new Error("已经开始监视，禁止修改 UseNative 值");
		}
		this._UseNative = v;
	}
	/**
	 * 监视目标标签，如果尺寸发生变化目标标签将会抛出'resize'事件
	 */
	public static watch(target: HTMLElement): void {
		HtmlElementResizeHelper._watched = true;
		if(HtmlElementResizeHelper.UseNative){
			NativeResizeHelper.watch(target);
		} else {
			LegacyResizeHelper.watch(target);
		}
	}
	public static unWatch(target: HTMLElement): void {
		if(HtmlElementResizeHelper.UseNative){
			NativeResizeHelper.unWatch(target);
		} else {
			LegacyResizeHelper.unWatch(target);
		}
	}
}

class LegacyResizeHelper {
	private static listenList: any[] = [];
	/**
	 * 监视目标标签，如果尺寸发生变化目标标签将会抛出'resize'事件
	 */
	public static watch(target: HTMLElement): void {
		this.listenList.push({ w: target.offsetWidth, h: target.offsetHeight, target: target });
		this.startListen();
	}
	public static unWatch(target: HTMLElement): void {
		for (let i: number = this.listenList.length - 1; i >= 0; i--) {
			if (this.listenList[i]['target'] === target) {
				this.listenList.splice(i, 1);
			}
		}
		if (this.listenList.length === 0) {
			this.stopListen();
		}
	}
	private static intervalTag: any;
	private static startListen(): void {
		this.stopListen();
		this.intervalTag = setInterval(() => { this.checkSize(); }, 1);
	}
	private static stopListen(): void {
		clearInterval(this.intervalTag);
	}
	private static checkSize(): void {
		this.listenList.forEach(element => {
			let target: HTMLElement = element['target'];
			if (target.offsetWidth !== element['w'] || target.offsetHeight !== element['h']) {
				element['w'] = target.offsetWidth;
				element['h'] = target.offsetHeight;
				target.dispatchEvent(new Event('resize'));

			}
		});
	}
}

class NativeResizeHelper {
	private static ro: ResizeObserver = null;
	public static watch(target: HTMLElement): void {
		if (!NativeResizeHelper.ro) {
			NativeResizeHelper.ro = new ResizeObserver(NativeResizeHelper.fireResize);
		}
		NativeResizeHelper.ro.observe(target);
	}
	public static unWatch(target: HTMLElement): void {
		if (NativeResizeHelper.ro) {
			NativeResizeHelper.ro.unobserve(target);
		}
	}


	private static fireResize(entries: ResizeObserverEntry[], observer: ResizeObserver): void {
		entries.forEach(element => {
			let target: Element = element.target;
			target.dispatchEvent(new Event('resize'));
		});
	}
}