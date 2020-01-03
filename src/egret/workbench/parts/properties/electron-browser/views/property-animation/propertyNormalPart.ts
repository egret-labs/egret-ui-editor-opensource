import { PropertyBasePart } from '../core/PropertyDetailParts';
import { localize } from 'egret/base/localization/nls';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { AccordionGroup } from 'egret/base/browser/ui/accordionGroup';
import { BasePart } from '../parts/basePart';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IAnimationService } from 'egret/workbench/parts/animation/common/animation';
import { NormalPart } from './parts/normalPart';

/**
 * 
 */
export class PropertyNormalPart extends PropertyBasePart {
	constructor(owner: AccordionGroup,
		@IInstantiationService private instantiationService: IInstantiationService,
		@IAnimationService private animationService: IAnimationService
		) {
		super(owner);

		this.parts = [];
		this.normalPart = this.instantiationService.createInstance(NormalPart,null);

		this.init('sizePosition', localize('propertyView.render.normal', 'Normal'), [
			'width', 'height', 'x', 'y', 'scaleX', 'scaleY', 'alpha', 'rotation']);
	}

	protected doSetModel(value: IExmlModel): void {
		super.doSetModel(value);
		for (let i = 0; i < this.parts.length; i++) {
			this.parts[i].model = value;
		}
	}

	/**
	 * 关联的属性发生了改变
	 * @param nodes 
	 */
	protected relatePropsChanged_handler(nodes: INode[]): void {
		const animation = this.animationService.animation;
		const node = animation && animation.getSelectedNode();
		for (let i = 0; i < this.parts.length; i++) {
			this.parts[i].doRelatePropsChanged(node ? [node] : []);
		}
		this.owner.layout();
	}

	private parts: BasePart[];
	private normalPart:NormalPart;
	/**
	 * 渲染
	 * @param container 
	 */
	protected render(container: HTMLElement): void {
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.padding = '4px 10px 4px 10px';

		this.normalPart.create(container);

		this.parts.push(this.normalPart);
	}
}