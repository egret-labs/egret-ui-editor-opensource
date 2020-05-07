import { BasePart } from '../../parts/basePart';
import { DivideLine } from 'egret/base/browser/ui/dividelines';
import { localize } from 'egret/base/localization/nls';
import { HGroup } from 'egret/base/browser/ui/containers';
import { NumberInput } from 'egret/base/browser/ui/inputs';
import { ComboBox } from 'egret/base/browser/ui/comboboxs';
import { ColorPicker } from 'egret/base/browser/ui/colorPicker';
import { ToggleIconButton } from 'egret/base/browser/ui/buttons';
import { addClass } from 'egret/base/common/dom';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { IDropDownTextDataSource } from 'egret/base/browser/ui/dropdowns';
import { EgretProjectModel } from 'egret/exts/exml-exts/exml/common/project/egretProject';
import { IUIBase } from 'egret/base/browser/ui/common';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { toHexString, UserValue, getProperty, getSameKeyValue, DefaultValue, toHexNumber, setPropertyStr, setPropertyNum, setPropertyBool } from 'egret/workbench/parts/properties/common/properties';

import '../../media/propertyView.css';
import '../../media/propertyViewStyle.css';
import { HSVaColor } from 'egret/base/browser/ui/pickr/pickr';

let fonts: IDropDownTextDataSource[] = null;
function getFonts(project: EgretProjectModel): IDropDownTextDataSource[] {
	if (!fonts) {
		if (project && project.fonts) {
			const sourceFonts = project.fonts;
			fonts = [];
			for (let i = 0; i < sourceFonts.length; i++) {
				fonts.push({
					id: sourceFonts[i],
					data: sourceFonts[i]
				});
			}
		} else {
			fonts = [
				{ data: 'Arial', id: 'Arial' },
				{ data: 'DFKai-SB(标楷体)', id: 'DFKai-SB' },
				{ data: 'FangSong(仿宋)', id: 'FangSong' },
				{ data: 'FangSong_GB2312(仿宋_GB2312)', id: 'FangSong_GB2312' },
				{ data: 'Georgia', id: 'Georgia' },
				{ data: 'Helvetica', id: 'Helvetica' },
				{ data: 'KaiTi(楷体)', id: 'KaiTi' },
				{ data: 'KaiTi_GB2312(楷体_GB2312)', id: 'KaiTi_GB2312' },
				{ data: 'Lucida Family', id: 'Lucida Family' },
				{ data: 'Microsoft YaHei(微软雅黑)', id: 'Microsoft YaHei' },
				{ data: 'Microsoft JhengHei(微软正黑体)', id: 'Microsoft JhengHei' },
				{ data: 'MingLiU(明细体)', id: 'MingLiU' },
				{ data: 'NSimSun(新宋体)', id: 'NSimSun' },
				{ data: 'PMingLiU(新明细体)', id: 'PMingLiU' },
				{ data: 'SimHei(黑体)', id: 'SimHei' },
				{ data: 'SimSun(宋体)', id: 'SimSun' },
				{ data: 'Tahoma', id: 'Tahoma' },
				{ data: 'Times', id: 'Times' },
				{ data: 'Trebuchet MS', id: 'Trebuchet MS' },
				{ data: 'Verdana', id: 'Verdana' }
			];
		}
	}
	return fonts;
}

enum PropertyTypes {
	TEXT_COLOR = 'textColor',
	FONT_FAMILY = 'fontFamily',
	SIZE = 'size',
	BOLD = 'bold',
	ITALIC = 'italic',
	VERTICAL_ALIGN = 'verticalAlign',
	TEXT_ALIGN = 'textAlign'
}



/**
 * 标签部分
 */
export class LabelPart extends BasePart {

	constructor(container: HTMLElement | IUIBase = null,
		@IEgretProjectService private egretProjectService: IEgretProjectService
	) {
		super(container);
	}

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
			if (this.model.getExmlConfig().isInstance(node.getInstance(), 'egret.TextField')) {
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
				case PropertyTypes.TEXT_COLOR:
					if (value.user != null) {
						this.colorPicker.setColor(toHexString(value.user as any,'#'));
					} else if (value.default != null) {
						this.colorPicker.setColor(toHexString(value.default as any,'#'));
					} else {
						this.colorPicker.setColor(null);
					}
					break;
				case PropertyTypes.FONT_FAMILY:
					if (value.user != null) {
						this.getFonts(value.user as any).then(datas => {
							this.fontCombobx.setDatas(datas);
							this.fontCombobx.setSelection(value.user as string);
						});
					} else if (value.default != null) {
						this.getFonts().then(datas => {
							this.fontCombobx.setDatas(datas);
							this.fontCombobx.setSelection(null);
							this.fontCombobx.prompt = value.default as string;
						});
					} else {
						this.getFonts().then(datas => {
							this.fontCombobx.setDatas(datas);
							this.fontCombobx.setSelection(null);
							this.fontCombobx.prompt = '-';
						});
					}
					break;
				case PropertyTypes.SIZE:
					if (value.user != null) {
						this.sizeInput.text = value.user as any;
					} else if (value.default != null) {
						this.sizeInput.text = null;
						this.sizeInput.prompt = value.default as string;
					} else {
						this.sizeInput.text = null;
						this.sizeInput.prompt = '-';
					}
					break;
				case PropertyTypes.BOLD:
					if (value.user != null) {
						this.boldButton.selected = value.user as boolean;
					} else if (value.default != null) {
						this.boldButton.selected = value.default as boolean;
					} else {
						this.boldButton.selected = false;
					}
					break;
				case PropertyTypes.ITALIC:
					if (value.user != null) {
						this.italicsButton.selected = value.user as boolean;
					} else if (value.default != null) {
						this.italicsButton.selected = value.default as boolean;
					} else {
						this.italicsButton.selected = false;
					}
					break;
				case PropertyTypes.TEXT_ALIGN:
					this.alignLeftButton.selected = false;
					this.alignCenterButton.selected = false;
					this.alignRightButton.selected = false;
					if (value.user != null) {
						if (value.user == 'left') {
							this.alignLeftButton.selected = true;
						} else if (value.user == 'center') {
							this.alignCenterButton.selected = true;
						} else if (value.user == 'right') {
							this.alignRightButton.selected = true;
						}
					} 
					break;
				case PropertyTypes.VERTICAL_ALIGN:
					this.valignTopButton.selected = false;
					this.valignCenterButton.selected = false;
					this.valignBottomButton.selected = false;
					this.valignjustifyButton.selected = false;
					if (value.user != null) {
						if (value.user == 'top') {
							this.valignTopButton.selected = true;
						} else if (value.user == 'middle') {
							this.valignCenterButton.selected = true;
						} else if (value.user == 'bottom') {
							this.valignBottomButton.selected = true;
						} else if (value.user == 'justify') {
							this.valignjustifyButton.selected = true;
						}
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
		//颜色
		result[PropertyTypes.TEXT_COLOR] = getProperty(node, 'textColor');
		//字体
		result[PropertyTypes.FONT_FAMILY] = getProperty(node, 'fontFamily');
		//字号
		result[PropertyTypes.SIZE] = getProperty(node, 'size');
		//粗体
		result[PropertyTypes.BOLD] = getProperty(node, 'bold');
		//斜体
		result[PropertyTypes.ITALIC] = getProperty(node, 'italic');
		//纵向对齐
		result[PropertyTypes.VERTICAL_ALIGN] = getProperty(node, 'verticalAlign');
		//水平对齐
		result[PropertyTypes.TEXT_ALIGN] = getProperty(node, 'textAlign');
		return result;
	}


	private getFonts(currentFont: string = ''): Promise<IDropDownTextDataSource[]> {
		return this.egretProjectService.ensureLoaded().then(() => {
			if (typeof currentFont != 'string') {
				currentFont = '';
			}
			const project = this.egretProjectService.projectModel;
			let fonts = getFonts(project);
			let has = false;
			if (!currentFont) {
				has = true;
			} else {
				for (let i = 0; i < fonts.length; i++) {
					if (fonts[i].id == currentFont) {
						has = true;
						break;
					}
				}
			}
			if (!has) {
				fonts = fonts.concat();
				fonts.push({ id: currentFont, data: currentFont });
			}
			return fonts;
		});
	}


	private colorPicker = new ColorPicker();
	private sizeInput = new NumberInput();
	private fontCombobx = new ComboBox();

	private boldButton = new ToggleIconButton();
	private italicsButton = new ToggleIconButton();

	private valignTopButton = new ToggleIconButton();
	private valignCenterButton = new ToggleIconButton();
	private valignBottomButton = new ToggleIconButton();
	private valignjustifyButton = new ToggleIconButton();

	private alignLeftButton = new ToggleIconButton();
	private alignCenterButton = new ToggleIconButton();
	private alignRightButton = new ToggleIconButton();

	/**
	 * 渲染
	 * @param el 
	 */
	protected render(container: HTMLElement): void {
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.padding = '4px 0 4px 0';

		const line = new DivideLine(container);
		line.text = localize('property.style.title.label', 'Label');
		line.style.marginBottom = '6px';

		var hGroup = new HGroup(container);
		addClass(hGroup.getElement(), 'property-attribute-item');

		this.colorPicker.create(hGroup);
		this.toDisposes.push(this.colorPicker.onDisplay(()=>this.colorDisplay_handler()));
		this.toDisposes.push(this.colorPicker.onChanged(e=>this.colorChanged_handler(e)));
		this.toDisposes.push(this.colorPicker.onSaved(e=>this.colorSaved_handler(e)));
		this.toDisposes.push(this.colorPicker.onCanceled(()=>this.colorCanceled_handler()));

		this.sizeInput.create(hGroup);
		this.sizeInput.style.maxWidth = '40px';
		this.sizeInput.style.marginLeft = '6px';
		this.toDisposes.push(this.sizeInput.onValueChanging(e=>this.sizeChanging_handler(Number.parseFloat(e))));
		this.toDisposes.push(this.sizeInput.onValueChanged(e=>this.sizeChanged_handler(e ? Number.parseFloat(e) : null)));
		this.fontCombobx.create(hGroup);
		this.fontCombobx.style.flexGrow = '1';
		this.fontCombobx.style.flexShrink = '1';
		this.fontCombobx.style.marginLeft = '6px';
		this.toDisposes.push(this.fontCombobx.onSelectChanged(e=>this.fontChanegd_handler(this.fontCombobx.getSelection())));


		var hGroup = new HGroup(container);
		hGroup.style.flexWrap = 'wrap';
		addClass(hGroup.getElement(), 'property-attribute-item');

		this.boldButton.create(hGroup);
		this.boldButton.iconClass = 'font_bold';
		this.toDisposes.push(this.boldButton.onSelectedChanged(()=>this.boldChanged_handler()));
		this.italicsButton.create(hGroup);
		this.italicsButton.iconClass = 'font_italics';
		this.italicsButton.style.marginLeft = '2px';
		this.italicsButton.style.marginRight = '12px';
		this.toDisposes.push(this.italicsButton.onSelectedChanged(()=>this.italicsChanged_handler()));

		this.valignTopButton.create(hGroup);
		this.valignTopButton.iconClass = 'font_valign_top';
		this.valignTopButton.style.marginLeft = '0px';
		this.toDisposes.push(this.valignTopButton.onSelectedChanged(e=>{setTimeout(() => {
			this.valignChanged_handler(e);
		}, 1);}));
		this.valignCenterButton.create(hGroup);
		this.valignCenterButton.iconClass = 'font_valign_center';
		this.valignCenterButton.style.marginLeft = '2px';
		this.toDisposes.push(this.valignCenterButton.onSelectedChanged(e=>{setTimeout(() => {
			this.valignChanged_handler(e);
		}, 1);}));
		this.valignBottomButton.create(hGroup);
		this.valignBottomButton.iconClass = 'font_valign_bottom';
		this.valignBottomButton.style.marginLeft = '2px';
		this.toDisposes.push(this.valignBottomButton.onSelectedChanged(e=>{setTimeout(() => {
			this.valignChanged_handler(e);
		}, 1);}));
		this.valignjustifyButton.create(hGroup);
		this.valignjustifyButton.iconClass = 'font_valign_justify';
		this.valignjustifyButton.style.marginLeft = '2px';
		this.valignjustifyButton.style.marginRight = '12px';
		this.toDisposes.push(this.valignjustifyButton.onSelectedChanged(e=>{setTimeout(() => {
			this.valignChanged_handler(e);
		}, 1);}));

		this.alignLeftButton.create(hGroup);
		this.alignLeftButton.iconClass = 'font_align_left';
		this.alignLeftButton.style.marginLeft = '0px';
		this.toDisposes.push(this.alignLeftButton.onSelectedChanged(e=>{setTimeout(() => {
			this.alignChanged_handler(e);
		}, 1);}));
		this.alignCenterButton.create(hGroup);
		this.alignCenterButton.iconClass = 'font_align_center';
		this.alignCenterButton.style.marginLeft = '2px';
		this.toDisposes.push(this.alignCenterButton.onSelectedChanged(e=>{setTimeout(() => {
			this.alignChanged_handler(e);
		}, 1);}));
		this.alignRightButton.create(hGroup);
		this.alignRightButton.iconClass = 'font_align_right';
		this.alignRightButton.style.marginLeft = '2px';
		this.toDisposes.push(this.alignRightButton.onSelectedChanged(e=>{setTimeout(() => {
			this.alignChanged_handler(e);
		}, 1);}));
	}

	private colorChanged_handler(color:HSVaColor):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			node.setInstanceValue('textColor',toHexNumber(color.toHEXA().toString()));
		}
	}
	private colorSaved_handler(color:HSVaColor):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			if(color){
				setPropertyStr(node,'textColor',toHexString(color.toHEXA().toString(),'0x'));
				node.setInstanceValue('textColor',toHexNumber(color.toHEXA().toString()));
			}else{
				setPropertyStr(node,'textColor','0xffffff');
				setPropertyStr(node,'textColor',null);
			}
		}
	}
	private colorCaches:any[] = [];
	private colorDisplay_handler():void{
		this.colorCaches.length = 0;
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			if(node.getInstance()){
				const color = node.getInstance()['textColor'];
				this.colorCaches.push(color);
			}else{
				this.colorCaches.push(null);
			}
		}
	}
	private colorCanceled_handler():void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			node.setInstanceValue('textColor',this.colorCaches[i]);
		}
	}

	private sizeChanging_handler(value:number):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			node.setInstanceValue('size',value);
		}
	}
	private sizeChanged_handler(value:number):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			setPropertyNum(node,'size',value);
		}
	}
	private fontChanegd_handler(value:IDropDownTextDataSource):void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			setPropertyStr(node,'fontFamily',value ? value.id : null);
		}
	}

	private boldChanged_handler():void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			setPropertyBool(node,'bold',this.boldButton.selected ? true : null);
		}
	}
	private italicsChanged_handler():void{
		if(!this.currentNodes){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			setPropertyBool(node,'italic',this.italicsButton.selected ? true : null);
		}
	}

	private valignChanged_handler(target:ToggleIconButton):void{
		if(!this.currentNodes){
			return;
		}
		let value:string = null;
		if(target == this.valignTopButton && target.selected){
			value = 'top';
		}else if(target == this.valignCenterButton && target.selected){
			value = 'middle';
		}else if(target == this.valignBottomButton && target.selected){
			value = 'bottom';
		}else if(target == this.valignjustifyButton && target.selected){
			value = 'justify';
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			setPropertyStr(node,'verticalAlign',value);
		}
	}
	private alignChanged_handler(target:ToggleIconButton):void{
		if(!this.currentNodes){
			return;
		}
		let value:string = null;
		if(target == this.alignLeftButton && target.selected){
			value = 'left';
		}else if(target == this.alignCenterButton && target.selected){
			value = 'center';
		}else if(target == this.alignRightButton && target.selected){
			value = 'right';
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			setPropertyStr(node,'textAlign',value);
		}
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		super.dispose();
		this.egretProjectService = null;
	}
}