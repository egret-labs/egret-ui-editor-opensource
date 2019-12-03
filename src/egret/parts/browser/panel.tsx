import * as React from 'react';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IPanel, IPanelContent } from '../common/panel';
import { ComponentEX, InstantiationProps } from 'egret/platform/react/common/component';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';


class HeaderRender implements boxlayout.IRender {
	public miniSize: number = 0;

	public root: HTMLElement;
	constructor() {
		this.root = document.createElement('div');
	}
	public render(container: HTMLElement): void {
		container.appendChild(this.root);
	}
	public removeFromParent(): void {
		this.root.remove();
	}
	public setBounds(x: number, y: number, width: number, height: number): void {
	}

	public minHeight: number = 0;
	public minWidth: number = 0;
}

/**
 * 面板基类
 */
export class Panel extends boxlayout.TabPanel implements IPanel, IDisposable {
	private content: React.ComponentClass;
	private header: boxlayout.IRender;
	constructor(id: string, title: string, content: React.ComponentClass, icon: string = '', @IInstantiationService protected instantiationService: IInstantiationService) {
		super();
		this.setId(id);
		this.setTitle(title);
		this.setIcon(icon);
		this.content = content;
		this.header = new HeaderRender();
	}
	/**
	 * 对应的dom节点
	 */
	public getRoot(): HTMLElement {
		return this.root;
	}

	protected resize(newWidth: number, newHeight: any): void {
		super.resize(newWidth, newHeight);
		if (this.contentImpl && 'doResize' in this.contentImpl) {
			this.contentImpl.doResize(newWidth, newHeight);
		}
	}
	/**
	 * 得到渲染的头附加内容
	 */
	public getHeaderRender(): boxlayout.IRender {
		return this.header;
	}

	private contentImpl: IPanelContent = null;
	/**
	 * 渲染内容
	 * @param container 
	 */
	public renderContent(container: HTMLElement): void {
		container.tabIndex = 0;
		if (this.content) {
			this.instantiationService.renderReact(<this.content ref={impl => {
				var contentImpl: any = (impl as ComponentEX);
				this.contentImpl = contentImpl as IPanelContent;
				if ('renderHeaderExt' in this.contentImpl) {
					this.contentImpl.renderHeaderExt(this.header.root);
				}
				if ('initOwner' in this.contentImpl) {
					this.contentImpl.initOwner(this);
				}
			}} />, container);
			this.setVisible(true);
		}
	}
	/**
	 * 这个面板是否可见中
	 */
	public isVisible(): boolean {
		return this._visible;
	}
	/**
	 * 面板关闭
	 */
	public shutdown(): void {
		if (this.contentImpl) {
			this.contentImpl.shutdown();
		}
	}
	/**
	 * 设置显示与隐藏
	 * @param visible 
	 */
	public setVisible(visible: boolean): void {
		if (this.contentImpl) {
			this.contentImpl.setVisible(visible);
		}
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		dispose(this.contentImpl);
		this.content = null;
	}
}
/**
 * 面板显示内容的抽象基类
 */
export abstract class PanelContent extends ComponentEX implements IPanelContent {
	private _isVisible: boolean;
	constructor(props?: InstantiationProps, context?: any) {
		super(props, context);
		this._isVisible = false;
	}
	/**
	 * 初始化父级
	 */
	public initOwner(owner: IPanel): void {
		//子类重载实现具体内容
	}
	/**
	 * 尺寸改变
	 * @param width 
	 * @param height 
	 */
	public doResize(width: number, height: any): void {
		//子类重载实现具体内容
	}
	/**
	 * 渲染头部附加内容
	 * @param container 
	 */
	public renderHeaderExt(container: HTMLElement): void {
		//子类重载实现具体内容
	}
	/**
	 * 面板被关闭
	 */
	public shutdown(): void {
		//子类重载实现具体内容
	}
	/**
	 * 设置显示与隐藏
	 * @param visible 
	 */
	public setVisible(visible: boolean): Promise<void> {
		if (this._isVisible !== visible) {
			this._isVisible = visible;
		}
		return Promise.resolve(void 0);
	}
	/**
	 * 当前是否是显示状态。
	 */
	public isVisible(): boolean {
		return this._isVisible;
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		//子类重载实现具体内容
	}
}