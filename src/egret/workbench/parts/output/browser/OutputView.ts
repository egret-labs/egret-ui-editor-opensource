import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IOutputService } from '../common/output';
import { voluationToStyle } from 'egret/base/common/dom';
import { PanelContentDom } from 'egret/parts/browser/panelDom';
import { IModelRequirePart } from 'egret/exts/exml-exts/models';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { localize } from 'egret/base/localization/nls';
import { removeAnsiEscapeCodes } from 'egret/base/common/strings';

import './media/output.css';

/**
 * 输出面板
 */
export class OutputView extends PanelContentDom implements IOutputService, IModelRequirePart {
	_serviceBrand: undefined;

	private outputContainer: HTMLDivElement;

	private outputViewer: HTMLDivElement;

	private lockDiv: HTMLDivElement;

	private _content: HTMLTextAreaElement;

	constructor(@IInstantiationService instantiationService: IInstantiationService,
		@IOutputService outpuService: IOutputService) {
		super(instantiationService);
		outpuService.init(this);
	}
	
	setModel(exmlModel: IExmlModel) {

	}

	init(impl: IOutputService): void {
		throw new Error("not supported");
	}


	/**
	 * 尺寸改变
	 * @param width 
	 * @param height 
	 */
	public doResize(width: number, height: any): void {

	}

	private _scrollLock: boolean = false;
	/**
	 * 锁定滚动
	 */
	public get scrollLock(): boolean {
		return this._scrollLock;
	}
	public set scrollLock(value: boolean) {
		this._scrollLock = value;
		//TODO 需要写
	}


	/**
	 * textArea 日志
	 */
	public get content(): HTMLTextAreaElement {
		return this._content;
	}

	/**
	 * 向通道追加输出
	 */
	public append(output: string): void {
		output = removeAnsiEscapeCodes(output);
		if (output) {
			if (!this._content) {
				this._content = document.createElement('textarea');
				this._content.className = 'output-content';
				this._content.wrap = 'true';
				this._content.readOnly = true;
				this._content.style.width = '100%';
				this._content.style.height = '100%';
				this._content.style.border = 'none';
				this._content.style.resize = 'none';
				this._content.style.backgroundColor = 'rgba(0,0,0,0)';
				this._content.style.outline = '0px';
				this.outputViewer.appendChild(this._content);
			}
			this._content.value = this.addWarpToString(output);

			if (!this.scrollLock) {
				this._content.scrollTop = this._content.scrollHeight;
			}
		}

	}

	// 换行
	private addWarpToString(output: string) {
		if (this._content.value !== '') {
			return this._content.value + '\n' + output;
		}
		return output;
	}

	render(container: HTMLElement) {
		this.doRender(container);
	}

	private doRender(container: HTMLElement) {
		this.outputContainer = document.createElement('div');
		voluationToStyle(this.outputContainer.style, { width: '100%', height: '100%' });
		container.appendChild(this.outputContainer);
		this.outputViewer = this.outputContainer;
		this.outputViewer.id = 'outputview';
	}

	/**
	 * 渲染头部附加内容
	 * @param container 
	 */
	public renderHeaderExt(container: HTMLElement): void {
		//TODO 添加要渲染的头部扩展按钮
		const icons = document.createElement('div');
		icons.style.display = 'flex';
		icons.style.flexDirection = 'row';
		container.appendChild(icons);

		const clearDiv = document.createElement('div');
		clearDiv.style.marginRight = '10px';
		clearDiv.style.cursor = 'pointer';
		clearDiv.className = 'output-action clear-output';
		clearDiv.addEventListener('click', () => {
			this.clear();
		});
		icons.appendChild(clearDiv);

		this.lockDiv = document.createElement('div');
		this.lockDiv.style.cursor = 'pointer';
		this.lockDiv.style.marginRight = '5px';
		this.lockDiv.className = 'output-action output-scroll-unlock';
		this.lockDiv.addEventListener('click', () => {
			this.scrollLock = !this.scrollLock;
			if (this.scrollLock) {
				this.lockDiv.className = 'output-action output-scroll-lock';
			} else {
				this.lockDiv.className = 'output-action output-scroll-unlock';
			}
		});

		icons.appendChild(this.lockDiv);
	}


	/**
	 * 清除此通道的所有接收输出
	 */
	public clear(): void {
		if (this._content) {
			this._content.value = '';
		}
	}

	/**
	 * 面板关闭
	 */
	public shutdown(): void {
		//TODO 面板关闭，这里可能需要记录相关的状态
	}
	/**
	 * 释放
	 */
	public dispose(): void {
		//TODO 释放当前组件中的引用和事件监听
	}

}

export namespace OutputView {
	export const ID: string = 'workbench.output';
	export const TITLE: string = localize('outputView.title','Output');
}