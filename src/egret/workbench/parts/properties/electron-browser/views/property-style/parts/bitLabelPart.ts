import { BasePart } from '../../parts/basePart';
import { DivideLine } from 'egret/base/browser/ui/dividelines';
import { localize } from 'egret/base/localization/nls';
import { AttributeItemGroup } from 'egret/base/browser/ui/containers';
import { addClass } from 'egret/base/common/dom';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { ComboBox } from 'egret/base/browser/ui/comboboxs';
import { UserValue, DefaultValue, getSameKeyValue, getProperty, setPropertyStr } from 'egret/workbench/parts/properties/common/properties';
import { IDropDownTextDataSource } from 'egret/base/browser/ui/dropdowns';
import { ResLibData } from 'egret/workbench/parts/assets/material/common/ResLibData';

import '../../media/propertyView.css';
import '../../media/propertyViewStyle.css';

enum PropertyTypes {
	FONT = 'font',
}

/**
 * 位图文本部分
 */
export class BitmapLabelPart extends BasePart{

	private currentNodes: INode[] = null;
	/**
	 * 关联的属性发生了改变
	 * @param nodes 
	 */
	public doRelatePropsChanged(nodes:INode[]):void{
		this.currentNodes = null;
		this.hide();
		if (!this.model) {
			return;
		}
		const targetNodes: INode[] = [];
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			if (this.model.getExmlConfig().isInstance(node.getInstance(), 'eui.BitmapLabel')) {
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
				case PropertyTypes.FONT:
					if(value.user != null){
						const datas = this.getFonts(value.user as string);
						this.bitFontCombobox.setDatas(datas);
						this.bitFontCombobox.setSelection(value.user as string);
					}else if(value.default != null){
						const datas = this.getFonts();
						this.bitFontCombobox.setDatas(datas);
						this.bitFontCombobox.setSelection(null);
						this.bitFontCombobox.prompt = value.default as string;
					}else{
						const datas = this.getFonts();
						this.bitFontCombobox.setDatas(datas);
						this.bitFontCombobox.setSelection(null);
						this.bitFontCombobox.prompt = '-';
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
		result[PropertyTypes.FONT] = getProperty(node, PropertyTypes.FONT);
		return result;
	}


	private getFonts(currentFont: string = ''): IDropDownTextDataSource[] {
		if (typeof currentFont != 'string') {
			currentFont = '';
		}
		const fonts = ResLibData.getBitmapFonts();
		const datas:IDropDownTextDataSource[] = [];
		let hasExist:boolean = false;
		for(let i = 0;i<fonts.length;i++){
			datas.push({id:fonts[i],data:fonts[i]});
			if(fonts[i] == currentFont){
				hasExist = true;
			}
		}
		if(!hasExist && currentFont){
			datas.push({id:currentFont,data:currentFont});
		}
		return datas;
	}


	private bitFontCombobox = new ComboBox();
	/**
	 * 渲染
	 * @param el 
	 */
	protected render(container:HTMLElement):void{
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.padding = '4px 0 4px 0';
		
		const line = new DivideLine(container);
		line.text = localize('property.style.title.bitmapLabel','Bitmap Label');
		line.style.marginBottom = '6px';

		const attribute = new AttributeItemGroup(container);
		attribute.label = localize('property.style.bitmapLabel.font','Bitmap Font:');
		this.bitFontCombobox.create(attribute);
		this.toDisposes.push(this.bitFontCombobox.onSelectChanged(e=>this.fontChanegd_handler(this.bitFontCombobox.getSelection())));

		this.initAttributeStyle(attribute);
	}

	private initAttributeStyle(attribute: AttributeItemGroup): void {
		attribute.labelWidth = 60;
		addClass(attribute.getItemElement(), 'property-attribute-item');
	}

	private fontChanegd_handler(value:IDropDownTextDataSource):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			setPropertyStr(node,'font',value ? value.id : null);
		}
	}
}