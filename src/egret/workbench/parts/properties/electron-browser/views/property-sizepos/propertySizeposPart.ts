import { PropertyBasePart } from '../core/PropertyDetailParts';
import { localize } from 'egret/base/localization/nls';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { AccordionGroup } from 'egret/base/browser/ui/accordionGroup';
import { BasePart } from '../parts/basePart';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { SizePosPart } from './parts/sizeposPart';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { ConstraintFastPart } from './parts/constraintFastPart';
import { ConstraintDetailPart } from './parts/constraintDetailPart';

/**
 * 位置和大小属性部分
 */
export class PropertySizeposPart extends PropertyBasePart {
	constructor(owner: AccordionGroup,
		@IInstantiationService private instantiationService: IInstantiationService
		) {
		super(owner);

		this.parts = [];
		this.sizeposPart = this.instantiationService.createInstance(SizePosPart,null);
		this.constraintFastPart = this.instantiationService.createInstance(ConstraintFastPart,null);
		this.constraintDetailPart = this.instantiationService.createInstance(ConstraintDetailPart,null);

		this.init('sizePosition', localize('propertyView.render.sizeAndLocation', 'Size & Position'), [
			'width', 'height', 'x', 'y', 'left', 'right', 'top', 'bottom',
			'horizontalCenter', 'verticalCenter', 'scaleX', 'scaleY', 'anchorOffsetX', 'anchorOffsetY']);
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
		for (let i = 0; i < this.parts.length; i++) {
			this.parts[i].doRelatePropsChanged(nodes);
		}
		this.owner.layout();
	}

	private parts: BasePart[];
	private sizeposPart:SizePosPart;
	private constraintFastPart:ConstraintFastPart;
	private constraintDetailPart:ConstraintDetailPart;
	/**
	 * 渲染
	 * @param container 
	 */
	protected render(container: HTMLElement): void {
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.padding = '4px 10px 4px 10px';

		this.sizeposPart.create(container);
		this.constraintFastPart.create(container);
		this.constraintDetailPart.create(container);

		this.parts.push(this.sizeposPart);
		this.parts.push(this.constraintFastPart);
		this.parts.push(this.constraintDetailPart);
	}
}