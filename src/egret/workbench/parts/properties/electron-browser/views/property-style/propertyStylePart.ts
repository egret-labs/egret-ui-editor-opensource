import { PropertyBasePart } from '../core/PropertyDetailParts';
import { localize } from 'egret/base/localization/nls';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { AccordionGroup } from 'egret/base/browser/ui/accordionGroup';
import { SourcePart } from './parts/sourcePart';
import { SkinPart } from './parts/skinPart';
import { ButtonSkinPart } from './parts/buttonSkinPart';
import { LabelPart } from './parts/labelPart';
import { RectPart } from './parts/rectPart';
import { BitmapLabelPart } from './parts/bitLabelPart';
import { BasePart } from '../parts/basePart';
import { dispose } from 'egret/base/common/lifecycle';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';

/**
 * 样式属性部分
 */
export class PropertyStylePart extends PropertyBasePart{
	constructor(
		owner:AccordionGroup,
		@IInstantiationService private instantiationService: IInstantiationService,
		){
		super(owner);
		this.parts = [];
		this.sourcePart = this.instantiationService.createInstance(SourcePart,null);
		this.skinPart = this.instantiationService.createInstance(SkinPart,null);
		this.buttonSkinPart = this.instantiationService.createInstance(ButtonSkinPart,null);
		this.labelPart = this.instantiationService.createInstance(LabelPart,null);
		this.rectPart = this.instantiationService.createInstance(RectPart,null);
		this.bitmapLabelPart = this.instantiationService.createInstance(BitmapLabelPart,null);


		this.init('style',localize('propertyView.render.style', 'Style'),['skinName', 'itemRendererSkinName', 'autoScale',
		'textColor', 'bold', 'italic', 'size', 'verticalAlign', 'textAlign', 'fontFamily',
		'fillColor', 'fillAlpha', 'strokeColor', 'strokeAlpha', 'strokeWeight','ellipseWidth','ellipseHeight']);
	}

	protected doSetModel(value: IExmlModel):void{
		super.doSetModel(value);
		for(let i = 0;i<this.parts.length;i++){
			this.parts[i].model = value;
		}
	}

	/**
	 * 关联的属性发生了改变
	 * @param nodes 
	 */
	protected relatePropsChanged_handler(nodes:INode[]):void{
		for(let i = 0;i<this.parts.length;i++){
			this.parts[i].doRelatePropsChanged(nodes);
		}
		this.owner.layout();
	}

	private sourcePart = null;
	private skinPart = null;
	private buttonSkinPart = null;
	private labelPart = null;
	private rectPart = null;
	private bitmapLabelPart = null;

	private parts:BasePart[];

	/**
	 * 渲染
	 * @param container 
	 */
	protected render(container:HTMLElement):void{
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.padding = '4px 10px 4px 10px';
		
		this.sourcePart.create(container);
		this.skinPart.create(container);
		this.buttonSkinPart.create(container);
		this.labelPart.create(container);
		this.rectPart.create(container);
		this.bitmapLabelPart.create(container);

		this.parts.push(this.sourcePart);
		this.parts.push(this.skinPart);
		this.parts.push(this.buttonSkinPart);
		this.parts.push(this.labelPart);
		this.parts.push(this.rectPart);
		this.parts.push(this.bitmapLabelPart);
	}

	/**
	 * 释放
	 */
	public dispose():void{
		super.dispose();
		dispose(this.parts);
	}
}