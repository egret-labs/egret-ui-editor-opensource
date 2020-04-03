
/**
 * 窗口关闭事件
 */
export class CloseEvent extends egret.Event {
	public static CLOSE: string;
	/**
	 * 构造函数
	 */
	public constructor(type: string, bubbles: boolean = false, cancelable: boolean = false, detail: any = -1) {
		super(type, bubbles, cancelable);
		this.detail = detail;
	}
	/**
	 * 触发关闭事件的细节。某些窗口组件用此属性来区分窗口中被点击的按钮。
	 */
	public detail: any;
	/**
	 * @inheritDoc
	 */
	public clone(): egret.Event {
		return new CloseEvent(this.type, this.bubbles, this.cancelable, this.detail);
	}
}


CloseEvent.CLOSE = 'close';
