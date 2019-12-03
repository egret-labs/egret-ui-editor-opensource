import { BasePart } from '../../parts/basePart';
import { DivideLine } from 'egret/base/browser/ui/dividelines';
import { localize } from 'egret/base/localization/nls';
import { AttributeItemGroup, HGroup } from 'egret/base/browser/ui/containers';
import { addClass } from 'egret/base/common/dom';
import { ColorPicker } from 'egret/base/browser/ui/colorPicker';
import { NumberInput } from 'egret/base/browser/ui/inputs';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { UserValue, DefaultValue, getSameKeyValue, getProperty, toHexString, toHexNumber, setPropertyStr, setPropertyNum } from 'egret/workbench/parts/properties/common/properties';
import { HSVaColor } from 'egret/base/browser/ui/pickr/pickr';

import '../../media/propertyView.css';
import '../../media/propertyViewStyle.css';

enum PropertyTypes {
	FILL_COLOR = 'fillColor',
	FILL_ALPHA = 'fillAlpha',
	STROKE_COLOR = 'strokeColor',
	STROKE_ALPHA = 'strokeAlpha',
	STROKE_WEIGHT = 'strokeWeight',
	ELLIPSE_WIDTH = 'ellipseWidth',
	ELLIPSE_HEIGHT = 'ellipseHeight'
}

/**
 * 标签部分
 */
export class RectPart extends BasePart {


	private currentNodes: INode[] = null;
	/**
	 * 关联的属性发生了改变
	 * @param nodes 
	 */
	public doRelatePropsChanged(nodes: INode[]): void {
		this.currentNodes = null;
		this.hide();
		if (!this.model) {
			return;
		}
		const targetNodes: INode[] = [];
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			if (this.model.getExmlConfig().isInstance(node.getInstance(), 'eui.Rect')) {
				targetNodes.push(node);
			}
		}
		nodes = targetNodes;
		if (nodes.length == 0) {
			return;
		}
		this.show();
		this.currentNodes = nodes;

		let keyValue: {
			[type: string]: {
				user: UserValue;
				default: DefaultValue;
			};
		} = {};

		if (nodes.length > 0) {
			const keyvalues: { [type: string]: { user: UserValue, default: string } }[] = [];
			for (let i = 0; i < nodes.length; i++) {
				keyvalues.push(this.getDisplayKeyValue(nodes[i]));
			}
			keyValue = getSameKeyValue(keyvalues);
		}

		for (const type in keyValue) {
			const value = keyValue[type];
			switch (type) {
				case PropertyTypes.FILL_COLOR:
					if (value.user != null) {
						this.fillColorPicker.setColor(toHexString(value.user as any,'#'));
					} else if (value.default != null) {
						this.fillColorPicker.setColor(toHexString(value.default as any,'#'));
					} else {
						this.fillColorPicker.setColor(null);
					}
					break;
				case PropertyTypes.FILL_ALPHA:
					if (value.user != null) {
						this.fillAlphaInput.text = value.user as string;
					} else if (value.default != null) {
						this.fillAlphaInput.text = null;
						this.fillAlphaInput.prompt = value.default as string;
					} else {
						this.fillAlphaInput.text = null;
						this.fillAlphaInput.prompt = '-';
					}
					break;
				case PropertyTypes.STROKE_COLOR:
					if (value.user != null) {
						this.strokeColorPicker.setColor(toHexString(value.user as any,'#'));
					} else if (value.default != null) {
						this.strokeColorPicker.setColor(toHexString(value.default as any,'#'));
					} else {
						this.strokeColorPicker.setColor(null);
					}
					break;
				case PropertyTypes.STROKE_ALPHA:
					if (value.user != null) {
						this.strokeAlphaInput.text = value.user as string;
					} else if (value.default != null) {
						this.strokeAlphaInput.text = null;
						this.strokeAlphaInput.prompt = value.default as string;
					} else {
						this.strokeAlphaInput.text = null;
						this.strokeAlphaInput.prompt = '-';
					}
					break;
				case PropertyTypes.STROKE_WEIGHT:
					if (value.user != null) {
						this.strokeWeightInput.text = value.user as string;
					} else if (value.default != null) {
						this.strokeWeightInput.text = null;
						this.strokeWeightInput.prompt = value.default as string;
					} else {
						this.strokeWeightInput.text = null;
						this.strokeWeightInput.prompt = '-';
					}
					break;
				case PropertyTypes.ELLIPSE_WIDTH:
					if (value.user != null) {
						this.ellipseWidthInput.text = value.user as string;
					} else if (value.default != null) {
						this.ellipseWidthInput.text = null;
						this.ellipseWidthInput.prompt = value.default as string;
					} else {
						this.ellipseWidthInput.text = null;
						this.ellipseWidthInput.prompt = '-';
					}
					break;
				case PropertyTypes.ELLIPSE_HEIGHT:
					if (value.user != null) {
						this.ellipseHeightInput.text = value.user as string;
					} else if (value.default != null) {
						this.ellipseHeightInput.text = null;
						this.ellipseHeightInput.prompt = value.default as string;
					} else {
						this.ellipseHeightInput.text = null;
						this.ellipseHeightInput.prompt = '-';
					}
					break;
				default:
					break;
			}
		}
	}

	private getDisplayKeyValue(node: INode): {
		[type: string]: {
			user: UserValue,
			default: string
		}
	} {
		const result: {
			[type: string]: {
				user: UserValue,
				default: string
			}
		} = {};
		if (!this.model) {
			return result;
		}
		result[PropertyTypes.FILL_COLOR] = getProperty(node, PropertyTypes.FILL_COLOR);
		result[PropertyTypes.FILL_ALPHA] = getProperty(node, PropertyTypes.FILL_ALPHA);
		result[PropertyTypes.STROKE_COLOR] = getProperty(node, PropertyTypes.STROKE_COLOR);
		result[PropertyTypes.STROKE_ALPHA] = getProperty(node, PropertyTypes.STROKE_ALPHA);
		result[PropertyTypes.STROKE_WEIGHT] = getProperty(node, PropertyTypes.STROKE_WEIGHT);
		result[PropertyTypes.ELLIPSE_WIDTH] = getProperty(node, PropertyTypes.ELLIPSE_WIDTH);
		result[PropertyTypes.ELLIPSE_HEIGHT] = getProperty(node, PropertyTypes.ELLIPSE_HEIGHT);
		return result;
	}


	private fillColorPicker = new ColorPicker();
	private fillAlphaInput = new NumberInput();

	private strokeColorPicker = new ColorPicker();
	private strokeAlphaInput = new NumberInput();
	private strokeWeightInput = new NumberInput();

	private ellipseWidthInput = new NumberInput();
	private ellipseHeightInput = new NumberInput();


	/**
	 * 渲染
	 * @param el 
	 */
	protected render(container: HTMLElement): void {
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.padding = '4px 0 4px 0';


		let line = new DivideLine(container);
		line.text = localize('property.style.title.rect.fill', 'Fill');
		line.style.marginBottom = '6px';

		var hgroup = new HGroup(container);
		hgroup.style.flexWrap = 'wrap';
		var attribute = new AttributeItemGroup(hgroup);
		this.initAttributeStyle(attribute);
		attribute.style.marginRight = '6px';
		attribute.label = localize('property.style.rect.fill.color', 'Color:');
		attribute.labelWidth = 60;
		this.fillColorPicker.create(attribute);
		this.fillColorPicker.style.marginRight = '28px';
		this.toDisposes.push(this.fillColorPicker.onDisplay(()=>this.fillColorDisplay_handler()));
		this.toDisposes.push(this.fillColorPicker.onChanged(e=>this.fillColorChanged_handler(e)));
		this.toDisposes.push(this.fillColorPicker.onSaved(e=>this.fillColorSaved_handler(e)));
		this.toDisposes.push(this.fillColorPicker.onCanceled(()=>this.fillColorCanceled_handler()));



		var attribute = new AttributeItemGroup(hgroup);
		this.initAttributeStyle(attribute);
		attribute.label = localize('property.style.rect.fill.alpha', 'Alpha:');
		attribute.labelWidth = 60;
		this.fillAlphaInput.create(attribute);
		this.fillAlphaInput.style.maxWidth = '50px';
		this.fillAlphaInput.minValue = 0;
		this.fillAlphaInput.maxValue = 1;
		this.fillAlphaInput.regulateStep = 0.01;
		this.toDisposes.push(this.fillAlphaInput.onValueChanging(e=>this.fillAlphaChanging_handler(Number.parseFloat(e))));
		this.toDisposes.push(this.fillAlphaInput.onValueChanged(e=>this.fillAlphaChanged_handler(e ? Number.parseFloat(e) : null)));


		line = new DivideLine(container);
		line.text = localize('property.style.title.rect.stroke', 'Stroke');
		line.style.marginBottom = '6px';



		var hgroup = new HGroup(container);
		hgroup.style.flexWrap = 'wrap';
		var attribute = new AttributeItemGroup(hgroup);
		this.initAttributeStyle(attribute);
		attribute.style.marginRight = '6px';
		attribute.label = localize('property.style.rect.stroke.color', 'Color:');
		attribute.labelWidth = 60;
		this.strokeColorPicker.create(attribute);
		this.strokeColorPicker.style.marginRight = '28px';
		this.toDisposes.push(this.strokeColorPicker.onDisplay(()=>this.strokeColorDisplay_handler()));
		this.toDisposes.push(this.strokeColorPicker.onChanged(e=>this.strokeColorChanged_handler(e)));
		this.toDisposes.push(this.strokeColorPicker.onSaved(e=>this.strokeColorSaved_handler(e)));
		this.toDisposes.push(this.strokeColorPicker.onCanceled(()=>this.strokeColorCanceled_handler()));



		var attribute = new AttributeItemGroup(hgroup);
		this.initAttributeStyle(attribute);
		attribute.style.marginRight = '6px';
		attribute.label = localize('property.style.rect.stroke.alpha', 'Alpha:');
		attribute.labelWidth = 60;
		this.strokeAlphaInput.create(attribute);
		this.strokeAlphaInput.style.maxWidth = '50px';
		this.strokeAlphaInput.minValue = 0;
		this.strokeAlphaInput.maxValue = 1;
		this.strokeAlphaInput.regulateStep = 0.01;
		this.toDisposes.push(this.strokeAlphaInput.onValueChanging(e=>this.strokeAlphaChanging_handler(Number.parseFloat(e))));
		this.toDisposes.push(this.strokeAlphaInput.onValueChanged(e=>this.strokeAlphaChanged_handler(e ? Number.parseFloat(e) : null)));


		var attribute = new AttributeItemGroup(hgroup);
		this.initAttributeStyle(attribute);
		attribute.label = localize('property.style.rect.stroke.weight', 'Weight:');
		attribute.labelWidth = 60;
		this.strokeWeightInput.create(attribute);
		this.strokeWeightInput.style.maxWidth = '50px';
		this.toDisposes.push(this.strokeWeightInput.onValueChanging(e=>this.strokeWeightChanging_handler(Number.parseFloat(e))));
		this.toDisposes.push(this.strokeWeightInput.onValueChanged(e=>this.strokeWeightChanged_handler(e ? Number.parseFloat(e) : null)));

		line = new DivideLine(container);
		line.text = localize('property.style.title.rect.ellipse', 'Ellipse');
		line.style.marginBottom = '6px';


		var hgroup = new HGroup(container);
		hgroup.style.flexWrap = 'wrap';
		var attribute = new AttributeItemGroup(hgroup);
		this.initAttributeStyle(attribute);
		attribute.style.marginRight = '6px';
		attribute.label = localize('property.style.rect.ellipse.width', 'Ellipse Width:');
		attribute.labelWidth = 60;
		this.ellipseWidthInput.create(attribute);
		this.ellipseWidthInput.style.maxWidth = '50px';
		this.ellipseWidthInput.regulateStep = 1;
		this.toDisposes.push(this.ellipseWidthInput.onValueChanging(e=>this.ellipseWidthChanging_handler(Number.parseFloat(e))));
		this.toDisposes.push(this.ellipseWidthInput.onValueChanged(e=>this.ellipseWidthChanged_handler(e ? Number.parseFloat(e) : null)));



		var attribute = new AttributeItemGroup(hgroup);
		this.initAttributeStyle(attribute);
		attribute.style.marginRight = '6px';
		attribute.label = localize('property.style.rect.ellipse.height', 'Ellipse Height:');
		attribute.labelWidth = 60;
		this.ellipseHeightInput.create(attribute);
		this.ellipseHeightInput.style.maxWidth = '50px';
		this.ellipseHeightInput.regulateStep = 1;
		this.toDisposes.push(this.ellipseHeightInput.onValueChanging(e=>this.ellipseHeightChanging_handler(Number.parseFloat(e))));
		this.toDisposes.push(this.ellipseHeightInput.onValueChanged(e=>this.ellipseHeightChanged_handler(e ? Number.parseFloat(e) : null)));

	}

	private initAttributeStyle(attribute: AttributeItemGroup): void {
		attribute.labelWidth = 60;
		addClass(attribute.getItemElement(), 'property-attribute-item');
	}

	private fillColorChanged_handler(color:HSVaColor):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			node.setInstanceValue('fillColor',toHexNumber(color.toHEX().toString()));
		}
	}
	private fillColorSaved_handler(color:HSVaColor):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			if(color){
				setPropertyStr(node,'fillColor',toHexString(color.toHEX().toString(),'0x'));
				node.setInstanceValue('fillColor',toHexNumber(color.toHEX().toString()));
			}else{
				setPropertyStr(node,'fillColor','0xffffff');
				setPropertyStr(node,'fillColor',null);
			}
		}
	}
	private fillColorCaches:any[] = [];
	private fillColorDisplay_handler():void{
		this.fillColorCaches.length = 0;
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			if(node.getInstance()){
				const color = node.getInstance()['fillColor'];
				this.fillColorCaches.push(color);
			}else{
				this.fillColorCaches.push(null);
			}
		}
	}
	private fillColorCanceled_handler():void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			node.setInstanceValue('fillColor',this.fillColorCaches[i]);
		}
	}

	private fillAlphaChanging_handler(value:number):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			node.setInstanceValue('fillAlpha',value);
		}
	}
	private fillAlphaChanged_handler(value:number):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			setPropertyNum(node,'fillAlpha',value);
		}
	}






	private strokeColorChanged_handler(color:HSVaColor):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			node.setInstanceValue('strokeColor',toHexNumber(color.toHEX().toString()));
		}
	}
	private strokeColorSaved_handler(color:HSVaColor):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			if(color){
				setPropertyStr(node,'strokeColor',toHexString(color.toHEX().toString(),'0x'));
				node.setInstanceValue('strokeColor',toHexNumber(color.toHEX().toString()));
			}else{
				setPropertyStr(node,'strokeColor','0xffffff');
				setPropertyStr(node,'strokeColor',null);
			}
		}
	}
	private strokeColorCaches:any[] = [];
	private strokeColorDisplay_handler():void{
		this.strokeColorCaches.length = 0;
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			if(node.getInstance()){
				const color = node.getInstance()['strokeColor'];
				this.strokeColorCaches.push(color);
			}else{
				this.strokeColorCaches.push(null);
			}
		}
	}
	private strokeColorCanceled_handler():void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			node.setInstanceValue('strokeColor',this.fillColorCaches[i]);
		}
	}

	private strokeAlphaChanging_handler(value:number):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			node.setInstanceValue('strokeAlpha',value);
		}
	}
	private strokeAlphaChanged_handler(value:number):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			setPropertyNum(node,'strokeAlpha',value);
		}
	}

	private strokeWeightChanging_handler(value:number):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			node.setInstanceValue('strokeWeight',value);
		}
	}
	private strokeWeightChanged_handler(value:number):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			setPropertyNum(node,'strokeWeight',value);
		}
	}



	private ellipseWidthChanging_handler(value:number):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			node.setInstanceValue('ellipseWidth',value);
		}
	}
	private ellipseWidthChanged_handler(value:number):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			setPropertyNum(node,'ellipseWidth',value);
		}
	}



	private ellipseHeightChanging_handler(value:number):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			node.setInstanceValue('ellipseHeight',value);
		}
	}
	private ellipseHeightChanged_handler(value:number):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			setPropertyNum(node,'ellipseHeight',value);
		}
	}
}