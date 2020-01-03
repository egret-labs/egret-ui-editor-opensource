import { PropertyBasePart } from '../core/PropertyDetailParts';
import { localize } from 'egret/base/localization/nls';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { AccordionGroup } from 'egret/base/browser/ui/accordionGroup';
import { BasePart } from '../parts/basePart';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { FramePart } from './parts/framePart';
import { TweenPart } from './parts/tweenPart';
import { IAnimationService } from 'egret/workbench/parts/animation/common/animation';
import { IDisposable } from 'egret/base/common/lifecycle';

/**
 * 动画部分
 */
export class PropertyFramePart extends PropertyBasePart {
	constructor(owner: AccordionGroup,
		@IInstantiationService private instantiationService: IInstantiationService,
		@IAnimationService private animationService: IAnimationService
	) {
		super(owner);

		this.parts = [];
		this.framePart = this.instantiationService.createInstance(FramePart, null);
		this.tweenPart = this.instantiationService.createInstance(TweenPart, null);

		this.init('sizePosition', localize('propertyView.render.frame', 'Frame'), [], false);
		this.attachListener();
	}

	private itemDispose: IDisposable;
	private attachListener(): void {
		this.toDisposes.push(this.animationService.onDidNodeSelectChange(() => {
			this.attachItemListener();
			this.updateState();
		}, this));
		this.toDisposes.push(this.animationService.onDidTimeChange(this.updateState, this));
		this.attachItemListener();
		this.updateState();
	}

	private attachItemListener(): void {
		if (this.itemDispose) {
			this.itemDispose.dispose();
		}
		const animation = this.animationService.animation;
		const item = animation && animation.getSelectedItem();
		if (item) {
			this.itemDispose = item.onDidPathsChange(() => {
				this.updateState();
			});
		}
	}

	protected doSetModel(value: IExmlModel): void {
		super.doSetModel(value);
		for (let i = 0; i < this.parts.length; i++) {
			this.parts[i].model = value;
		}
	}

	private updateState(): void {
		const animation = this.animationService.animation;
		const node = animation && animation.getSelectedNode();
		for (let i = 0; i < this.parts.length; i++) {
			this.parts[i].doRelatePropsChanged(node ? [node] : []);
		}
		this.owner.layout();
	}

	/**
	 * 关联的属性发生了改变
	 * @param nodes 
	 */
	protected relatePropsChanged_handler(nodes: INode[]): void {
		this.updateState();
	}

	private parts: BasePart[];
	private framePart: FramePart;
	private tweenPart: TweenPart;
	/**
	 * 渲染
	 * @param container 
	 */
	protected render(container: HTMLElement): void {
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.padding = '4px 10px 4px 10px';

		this.framePart.create(container);
		this.tweenPart.create(container);

		this.parts.push(this.framePart);
		this.parts.push(this.tweenPart);
	}

	
	/**
	 * 释放
	 */
	public dispose(): void {
		super.dispose();
		if(this.itemDispose){
			this.itemDispose.dispose();
			this.itemDispose = null;
		}
	}
}