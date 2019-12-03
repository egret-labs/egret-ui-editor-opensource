import { IDisposable } from 'egret/base/common/lifecycle';

/**
 * 面板接口
 */
export interface IPanel {
	/**
	 * 对应的dom节点
	 */
	getRoot():HTMLElement;
	/**
	 * 设置显示与隐藏
	 * @param visible 
	 */
	setVisible(visible: boolean): void;
	/**
	 * 这个面板是否可见中
	 */
	isVisible(): boolean;
	/** 
	 * 唯一的ID
	 */
	getId(): string;
	/** 
	 * 显示的标题 
	 */
	getTitle(): string;
	/**
	 * 设置焦点
	 */
	focus(): void;
	/**
	 * 面板关闭
	 */
	shutdown():void;
}


/**
 * 一个面板的内容显示
 */
export interface IPanelContent extends IDisposable{
	/**
	 * 初始化父级
	 */
	initOwner(owner:IPanel):void;
	/**
	 * 尺寸改变
	 * @param width 
	 * @param height 
	 */
	doResize(width: number, height: any):void;
	/**
	 * 渲染头部附加内容
	 * @param container 
	 */
	renderHeaderExt(container:HTMLElement):void;
	/**
	 * 面板被关闭
	 */
	shutdown():void;
	/**
	 * 设置显示与隐藏
	 * @param visible 
	 */
	setVisible(visible: boolean): Promise<void> ;
	/**
	 * 当前是否是显示状态。
	 */
	isVisible(): boolean;
}