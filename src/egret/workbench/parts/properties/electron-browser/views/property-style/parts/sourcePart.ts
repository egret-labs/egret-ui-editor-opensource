import { BasePart } from '../../parts/basePart';
import { DivideLine } from 'egret/base/browser/ui/dividelines';
import { localize } from 'egret/base/localization/nls';
import { AttributeItemGroup, HGroup } from 'egret/base/browser/ui/containers';
import { TextInput } from 'egret/base/browser/ui/inputs';
import { addClass } from 'egret/base/common/dom';
import { IconButton } from 'egret/base/browser/ui/buttons';
import { ComboBox } from 'egret/base/browser/ui/comboboxs';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { IDropDownTextDataSource } from 'egret/base/browser/ui/dropdowns';
import { Scale9WindowPanel } from 'egret/workbench/parts/properties_old/exml-prop/component/scale9window/Scale9WindowPanel';
import '../../media/propertyView.css';
import '../../media/propertyViewStyle.css';
/**
 * 原数据部分
 */
export class SourcePart extends BasePart {
	private currentNode: INode = null;
	/**
	 * 关联的属性发生了改变
	 * @param nodes 
	 */
	public doRelatePropsChanged(nodes: INode[]): void {
		this.currentNode = null;
		this.hide();
		if (!this.model) {
			return;
		}
		const targetNodes: INode[] = [];
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			if (this.model.getExmlConfig().isInstance(node.getInstance(), 'eui.Image')) {
				targetNodes.push(node);
			}
		}
		nodes = targetNodes;
		if (nodes.length != 1) {
			return;
		}
		this.show();
		const node = nodes[0];
		this.currentNode = node;

		//source
		const sourceValue = node.getProperty('source');
		if (sourceValue) {
			this.sourceInput.text = sourceValue.getInstance();
		} else {
			this.sourceInput.text = '';
		}

		//fillmode
		const fillModeValue = node.getProperty('fillMode');
		const fillModeDefault = node.getInstance()['fillMode'];
		this.fillmodeCombobox.prompt = fillModeDefault;
		if (fillModeValue) {
			this.fillmodeCombobox.setSelection(fillModeValue.getInstance());
		}
	}

	private sourceInput = new TextInput();
	private scale9GridBtn = new IconButton();
	private fillmodeCombobox = new ComboBox();

	/**
	 * 渲染
	 * @param el 
	 */
	protected render(container: HTMLElement): void {
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.padding = '4px 0 4px 0';

		const line = new DivideLine(container);
		line.text = localize('property.style.title.source', 'Asset');
		line.style.marginBottom = '6px';

		let attribute = new AttributeItemGroup(container);
		attribute.label = localize('property.style.source.source', 'Asset Name:');
		const hGroup = new HGroup(attribute);
		this.sourceInput.create(hGroup);
		this.toDisposes.push(this.sourceInput.onValueChanged(e => this.sourceChanged_handler(e)));
		this.scale9GridBtn.create(hGroup);
		this.scale9GridBtn.iconClass = 'scale_9_grid';
		this.scale9GridBtn.style.marginLeft = '4px';
		this.toDisposes.push(this.scale9GridBtn.onClick(() => this.scale9gridClick_handler()));
		this.initAttributeStyle(attribute);

		attribute = new AttributeItemGroup(container);
		attribute.label = localize('property.style.source.fillMode', 'Fill Mode:');
		this.fillmodeCombobox.create(attribute);
		this.fillmodeCombobox.setDatas([
			{ id: 'clip', data: 'clip(裁剪)' },
			{ id: 'repeat', data: 'repeat(重复)' },
			{ id: 'scale', data: 'scale(缩放)' },
		]);
		this.toDisposes.push(this.fillmodeCombobox.onSelectChanged(t => this.fillModeChanged_handler(t.getSelection())));
		this.initAttributeStyle(attribute);
	}


	private initAttributeStyle(attribute: AttributeItemGroup): void {
		attribute.labelWidth = 60;
		addClass(attribute.getItemElement(), 'property-attribute-item');
	}


	private sourceChanged_handler(value: string): void {
		if (!this.currentNode) {
			return;
		}
		if (!value) {
			this.currentNode.setProperty('source', null);
		} else {
			this.currentNode.setString('source', value);
		}
	}

	private scale9gridClick_handler(): void {
		if (!this.currentNode) {
			return;
		}
		if (this.currentNode.getInstance().texture) {
			const nameValue = this.currentNode.getProperty('source');
			const key = nameValue ? nameValue.toString() : '';
			const source = this.currentNode.getInstance().texture._bitmapData ? this.currentNode.getInstance().texture._bitmapData.source : this.currentNode.getInstance().$bitmapData.source;
			if (key && source) {
				const imageObj = {
					// 图片的路径
					src: source.src,
					x: 0,
					y: 0,
					width: this.currentNode.getInstance().texture.textureWidth,
					height: this.currentNode.getInstance().texture.textureHeight,
					imageWidth: this.currentNode.getInstance().texture.textureWidth,
					imageHeight: this.currentNode.getInstance().texture.textureHeight,
					offsetX: this.currentNode.getInstance().texture.$bitmapX,
					offsetY: this.currentNode.getInstance().texture.$bitmapY,
					isSet: false
				};
				const isScale9Grid = this.currentNode.getProperty('scale9Grid');
				// 图片曾经被设置过
				if (isScale9Grid) {
					imageObj.x = isScale9Grid.getInstance().x;
					imageObj.y = isScale9Grid.getInstance().y;
					imageObj.width = isScale9Grid.getInstance().width;
					imageObj.height = isScale9Grid.getInstance().height;
					imageObj.isSet = true;
				}
				const scale9Window = new Scale9WindowPanel(imageObj,
					(v) => {
						if(this.currentNode){
							if (v) {
								this.currentNode.setScale9Grid(v.x + ',' + v.y + ',' + v.width + ',' + v.height);
							} else {
								this.currentNode.setProperty('scale9Grid',null);
							}
						}
					});
				scale9Window.open('root', true);
			}
		}
	}

	private fillModeChanged_handler(value: IDropDownTextDataSource): void {
		if (!this.currentNode) {
			return;
		}
		if (!value) {
			this.currentNode.setProperty('fillMode', null);
		} else {
			this.currentNode.setString('fillMode', value.id);
		}
	}
}