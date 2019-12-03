import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IExmlModelServices, IModelRequirePart } from 'egret/exts/exml-exts/models';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { SizeAlignGroup } from 'egret/workbench/parts/align/electron-browser/views/sizeAlignGroup';
import { SizeAndPosGroupLogicRunner } from 'egret/workbench/parts/align/electron-browser/views/sizeAndPosGroupLogicRunner';
import { DomScrollableElement } from 'vs/base/browser/ui/scrollbar/scrollableElement';
import { ScrollbarVisibility } from 'vs/base/common/scrollable';
import { IFocusablePart } from 'egret/platform/operations/common/operations';
import { IOperationBrowserService } from 'egret/platform/operations/common/operations-browser';
import { SystemCommands } from 'egret/platform/operations/commands/systemCommands';
import { PanelContentDom } from 'egret/parts/browser/panelDom';
import { localize } from 'egret/base/localization/nls';

/**
 * 对齐面板
 */
export class AlignView extends PanelContentDom implements IModelRequirePart, IFocusablePart {

	private sizeAndPosLogicRunner: SizeAndPosGroupLogicRunner;

	/**
	 * 初始化
	 * @param instantiationService
	 */
	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@IOperationBrowserService private operationService: IOperationBrowserService,
		@IExmlModelServices exmlModeService: IExmlModelServices
	) {
		super();
		exmlModeService.registerPart(this);
		this.sizeAndPosLogicRunner = this.instantiationService.createInstance(SizeAndPosGroupLogicRunner);
	}

	/**
	 * 渲染头部附加内容
	 * @param container 
	 */
	public renderHeaderExt(container: HTMLElement): void {
		//TODO 添加要渲染的头部扩展按钮
	}
	/**
	 * 尺寸改变
	 * @param width 
	 * @param height 
	 */
	public doResize(width: number, height: any): void {
		//TODO 面板尺寸改变，更新相应布局

		this.freshScroll();
	}

	/**
	 * 运行一个命令
	 * @param command 要运行的命令
	 */
	public executeCommand<T>(command: string, ...args): Promise<any> {
		if (!this.exmlModel) {
			return Promise.resolve(void 0);
		}
		switch (command) {
			case SystemCommands.UNDO:
				this.exmlModel && this.exmlModel.undo();
				break;
			case SystemCommands.REDO:
				this.exmlModel && this.exmlModel.redo();
				break;
			default:
				break;
		}
		return Promise.resolve(void 0);
	}

	/**
	 * 是否可以运行指定命令
	 * @param command 需要判断的命令
	 */
	public hasCommand(command: string): boolean {
		return [
			SystemCommands.UNDO,
			SystemCommands.REDO
		].indexOf(command as SystemCommands) != -1;
	}

	/**
	 * 得到这个部件对应的Dom节点
	 */
	public getRelativeELement(): HTMLElement {
		return this.container;
	}


	private exmlModel:IExmlModel;
	setModel(exmlModel: IExmlModel): void {
		this.exmlModel = exmlModel;
		this.sizeAndPosLogicRunner.model = exmlModel;
		this.freshScroll();
	}

	private freshScroll = (): void => {
		setTimeout(() => {
			this.scrollElement && this.scrollElement.scanDomNode();
		}, 0);
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
		this.sizeAlignGroup.dispose();

	}

	private container: HTMLDivElement;
	private subDiv: HTMLDivElement;
	private scrollElement: DomScrollableElement;
	private sizeAlignGroup:SizeAlignGroup;

	private handleTree(): void {
		this.scrollElement = new DomScrollableElement(this.subDiv, {
			canUseTranslate3d: false,
			alwaysConsumeMouseWheel: true,
			horizontal: ScrollbarVisibility.Hidden,
			vertical: ScrollbarVisibility.Auto,
			verticalSliderSize: 6,
			verticalScrollbarSize: 6
		});

		this.container.appendChild(this.scrollElement.getDomNode());
		this.scrollElement.getDomNode().style.height = '100%';
		this.scrollElement.scanDomNode();
	}

	render(container:HTMLElement) {
		this.doRender(container);
	}

	private doRender(_container:HTMLElement):void{
		this.container = document.createElement('div');
		_container.appendChild(this.container);
		this.container.style.height = '100%';

		this.subDiv = document.createElement('div');
		this.container.appendChild(this.subDiv);
		this.subDiv.style.height = '100%';

		this.sizeAlignGroup = this.instantiationService.createInstance(SizeAlignGroup,this.sizeAndPosLogicRunner);
		this.sizeAlignGroup.render(this.subDiv);

		this.handleTree();
		this.operationService.registerFocusablePart(this);
	}
}

export namespace AlignView {
	export const ID: string = 'workbench.align';
	export const TITLE: string = localize('alignView.title','Align');
}