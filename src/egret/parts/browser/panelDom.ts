import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IPanelDom, IPanelContentDom } from '../common/panelDom';
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
export class PanelDom extends boxlayout.TabPanel implements IPanelDom, IDisposable {
	private content: any;
	private header: boxlayout.IRender;
	constructor(id: string, title: string, content: new (...args: any[]) => any, icon: string, @IInstantiationService protected instantiationService: IInstantiationService) {
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
	// _focusIn(): void{
	// 	super._focusIn();
	// 	this.resize(this.widthCache,this.heightCache);
	// }

	private widthCache:number = 0;
	private heightCache:number = 0;

	protected resize(newWidth: number, newHeight: any): void {
		super.resize(newWidth, newHeight);
		this.widthCache = newWidth;
		this.heightCache = newHeight;
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

	private contentImpl: IPanelContentDom = null;
	/**
	 * 渲染内容
	 * @param container 
	 */
	public renderContent(container: HTMLElement): void {
		container.tabIndex = 0;
		if (this.content) {

			const impl = this.instantiationService.createInstance(this.content);

			this.contentImpl = impl as IPanelContentDom;
			if ('renderHeaderExt' in this.contentImpl) {
				this.contentImpl.renderHeaderExt(this.header.root);
			}


			if ('initOwner' in this.contentImpl) {
				this.contentImpl.initOwner(this);
			}

			//渲染到panel
			this.contentImpl.render(container);

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
export abstract class PanelContentDom  implements IPanelContentDom {
	private _isVisible: boolean ;
	constructor(instantiationService?: IInstantiationService, args?: any, context?: any) {
		this._isVisible = false;
	}

	/**
	 * 渲染到panel
	 */
	render(container: HTMLElement): void {
		//子类重载实现具体内容
	}
	/**
	 * 初始化父级
	 */
	public initOwner(owner: IPanelDom): void {
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
		return this._isVisible ;
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		//子类重载实现具体内容
	}
}