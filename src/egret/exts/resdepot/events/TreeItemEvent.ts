/**
 * 树的项 事件
 */
export class TreeItemEvent extends egret.Event {

	public static TOUCH: string = 'tree_item_touch';

	public static CHANGE: string = 'tree_item_change';
	/**
	 * @language zh_CN
	 * 创建一个作为参数传递给事件侦听器的 Event 对象。
	 * @param type  事件的类型，可以作为 Event.type 访问。
	 * @param bubbles  确定 Event 对象是否参与事件流的冒泡阶段。默认值为 false。
	 * @param cancelable 确定是否可以取消 Event 对象。默认值为 false。
	 * @param data 与此事件对象关联的可选数据。
	 * @version Egret 2.4
	 * @platform Web,Native
	 */
	public constructor(type: string, bubbles?: boolean, cancelable?: boolean, data?: any) {
		super(type, bubbles, cancelable, data);

	}
}