import { PropertyBasePart } from '../core/PropertyDetailParts';
import { localize } from 'egret/base/localization/nls';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { AccordionGroup } from 'egret/base/browser/ui/accordionGroup';
import { BasePart } from '../parts/basePart';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { AttributeItemGroup } from 'egret/base/browser/ui/containers';
import { addClass, removeClass } from 'egret/base/common/dom';
import { ComboBox } from 'egret/base/browser/ui/comboboxs';
import { IDropDownTextDataSource } from 'egret/base/browser/ui/dropdowns';
import { UserValue, DefaultValue, getSameKeyValue, getProperty } from '../../../common/properties';
import { HVPart } from './parts/hvPart';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { TilePart } from './parts/tilePart';
import { EUI } from 'egret/exts/exml-exts/exml/common/project/parsers/core/commons';


import '../media/propertyView.css';

enum PropertyTypes {
	LAYOUT = 'layout'
}

/**
 * 布局属性部分
 */
export class PropertyLayoutPart extends PropertyBasePart {
	constructor(owner: AccordionGroup,
		@IInstantiationService private instantiationService: IInstantiationService
		) {
		super(owner);
		this.parts = [];
		this.hvPart = this.instantiationService.createInstance(HVPart,null);
		this.tilePart = this.instantiationService.createInstance(TilePart,null);


		this.init('layout', localize('propertyView.render.layout', 'Layout'), [
			'layout', 'useVirtualLayout', 'horizontalGap', 'verticalGap', 'columnCount',
			'requestedColumnCount', 'rowCount', 'requestedRowCount', 'columnWidth', 'rowHeight',
			'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'horizontalAlign',
			'verticalAlign', 'columnAlign', 'rowAlign', 'orientation', 'gap']);
	}

	protected doSetModel(value: IExmlModel): void {
		super.doSetModel(value);
		for (let i = 0; i < this.parts.length; i++) {
			this.parts[i].model = value;
		}
	}

	private currentNodes: INode[] = null;
	/**
	 * 关联的属性发生了改变
	 * @param nodes 
	 */
	protected relatePropsChanged_handler(nodes: INode[]): void {
		this.currentNodes = null;
		this.hide();
		if (!this.model) {
			this.owner.layout();
			return;
		}
		const targetNodes: INode[] = [];
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			const className = this.model.getExmlConfig().getClassNameById(node.getName(), node.getNs());
			//Skin的getInstance()会被解析成Group，但是Skin不能设置布局
			if (className !== 'eui.Skin' && this.model.getExmlConfig().isInstance(node.getInstance(), 'eui.Group')) {
				targetNodes.push(node);
			}
		}
		nodes = targetNodes;
		if (nodes.length == 0) {
			this.owner.layout();
			return;
		}
		this.currentNodes = nodes;

		let keyValue: {
			[type: string]: {
				user: UserValue;
				default: DefaultValue;
			};
		} = {};

		if (nodes.length > 0) {
			const keyvalues: { [type: string]: { user: UserValue, default: string } }[] = [];
			for (var i = 0; i < nodes.length; i++) {
				keyvalues.push(this.getDisplayKeyValue(nodes[i]));
			}
			keyValue = getSameKeyValue(keyvalues);
		}
		for (const type in keyValue) {
			const value = keyValue[type];
			switch (type) {
				case PropertyTypes.LAYOUT:
					if (value.user != null) {
						this.layoutCombobox.setSelection(value.user as string);
						this.show(value.user as string);
					} else if (value.default != null) {
						this.layoutCombobox.setSelection(null);
						this.layoutCombobox.prompt = value.default as string;
						this.show(value.default as string);
					} else {
						this.layoutCombobox.setSelection(null);
						this.layoutCombobox.prompt = '-';
						this.show(null);
					}
					break;
				default:
					break;
			}
		}

		for (var i = 0; i < this.parts.length; i++) {
			this.parts[i].doRelatePropsChanged(nodes);
		}
		this.owner.layout();
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
		result[PropertyTypes.LAYOUT] = getProperty(node, PropertyTypes.LAYOUT, this.model);
		return result;
	}

	private show(type:string): void {
		removeClass(this.layoutAttribute.getItemElement(), 'invisible');
		switch (type) {
			case 'eui.HorizontalLayout':
			case 'eui.VerticalLayout':
				this.hvPart.show();
				break;
			case 'eui.TileLayout':
				this.tilePart.show();
				break;
			default:
				break;
		}
	}

	private hide(): void {
		addClass(this.layoutAttribute.getItemElement(), 'invisible');
		for(let i = 0;i<this.parts.length;i++){
			this.parts[i].hide();
		}
	}

	
	private layoutAttribute = new AttributeItemGroup();
	private layoutCombobox = new ComboBox();

	private parts: BasePart[];
	private hvPart:HVPart;
	private tilePart:TilePart;

	/**
	 * 渲染
	 * @param container 
	 */
	protected render(container: HTMLElement): void {
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.padding = '4px 10px 4px 10px';

		this.layoutAttribute.create(container);
		this.layoutAttribute.label = localize('property.layout.layout', 'Layout:');
		this.layoutCombobox.create(this.layoutAttribute);
		this.layoutCombobox.setDatas([
			{ id: 'eui.BasicLayout', data: 'eui.BasicLayout' },
			{ id: 'eui.HorizontalLayout', data: 'eui.HorizontalLayout' },
			{ id: 'eui.VerticalLayout', data: 'eui.VerticalLayout' },
			{ id: 'eui.TileLayout', data: 'eui.TileLayout' }]);
		this.toDisposes.push(this.layoutCombobox.onSelectChanged(t => this.layoutChanged_handler(t.getSelection())));
		this.initAttributeStyle(this.layoutAttribute);

		this.hvPart.create(container);
		this.tilePart.create(container);

		this.parts.push(this.hvPart);
		this.parts.push(this.tilePart);
	}

	private initAttributeStyle(attribute: AttributeItemGroup): void {
		attribute.labelWidth = 50;
		addClass(attribute.getItemElement(), 'property-attribute-item');
	}

	private layoutChanged_handler(value: IDropDownTextDataSource): void {
		if(!this.currentNodes || !this.model){
			return;
		}
		for(let i = 0;i<this.currentNodes.length;i++){
			const node = this.currentNodes[i];
			if(!value){
				node.setProperty(PropertyTypes.LAYOUT, null);
			}else{
				if(value.id.indexOf('eui.') == 0){
					const id = value.id.slice(4);
					const instance = this.model.getExmlConfig().getInstanceById(id, node.getNs());
					if (instance) {
						node.setProperty(PropertyTypes.LAYOUT, this.model.createIObject(id, EUI, instance));
					}
				}
			}
		}
	}
}