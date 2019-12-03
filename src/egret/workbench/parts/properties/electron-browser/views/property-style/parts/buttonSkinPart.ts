import { BasePart } from '../../parts/basePart';
import { DivideLine } from 'egret/base/browser/ui/dividelines';
import { localize } from 'egret/base/localization/nls';
import { AttributeItemGroup } from 'egret/base/browser/ui/containers';
import { addClass } from 'egret/base/common/dom';
import { INode, IClass, isInstanceof } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { TextInput } from 'egret/base/browser/ui/inputs';
import { parse, setAttribute, deleteAttribute, appendChild } from 'egret/exts/exml-exts/exml/common/sax/xml-tagUtils';
import { EUI } from 'egret/exts/exml-exts/exml/common/project/parsers/core/commons';

import '../../media/propertyView.css';
import '../../media/propertyViewStyle.css';

/**
 * 快速按钮皮肤部分
 */
export class ButtonSkinPart extends BasePart {

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

		this.upInput.text = '';
		this.downInput.text = '';
		this.disableInput.text = '';
		if (nodes.length == 1) {
			const node = nodes[0];
			if (this.model.getExmlConfig().isInstance(node.getInstance(), 'eui.Button')) {
				this.show();
				this.currentNode = node;

				const skinProperty = node.getProperty('skinName');
				const classValue: IClass = skinProperty as any;
				if (classValue && isInstanceof(classValue,'eui.IClass') && classValue.getIsInner()) {
					const buttonXML = classValue.getClassXML();
					if (buttonXML.children.length > 0) {
						const imageXML = buttonXML.children[0];
						if (imageXML.localName === 'Image') {
							let source: string;
							source = imageXML.attributes['source'];
							if (source) {
								this.upInput.text = source;
							}
							source = imageXML.attributes['source.up'];
							if (source) {
								this.upInput.text = source;
							}

							source = imageXML.attributes['source.down'];
							if (source) {
								this.downInput.text = source;
							}

							source = imageXML.attributes['source.disabled'];
							if (source) {
								this.disableInput.text = source;
							}
						}
					}
				}
			}
		}
	}

	private upInput = new TextInput();
	private downInput = new TextInput();
	private disableInput = new TextInput();

	/**
	 * 渲染
	 * @param el 
	 */
	protected render(container: HTMLElement): void {
		container.style.display = 'flex';
		container.style.flexDirection = 'column';
		container.style.padding = '4px 0 4px 0';

		const line = new DivideLine(container);
		line.text = localize('property.style.title.buttonSkin', 'Button Sample Skin');
		line.style.marginBottom = '6px';

		var attribute = new AttributeItemGroup(container);
		attribute.label = localize('property.style.buttonSkin.normal', 'Normal:');
		this.upInput.create(attribute);
		this.toDisposes.push(this.upInput.onValueChanged(e => this.upChanged_handler(e)));
		this.initAttributeStyle(attribute);

		var attribute = new AttributeItemGroup(container);
		attribute.label = localize('property.style.buttonSkin.down', 'Press Down:');
		this.downInput.create(attribute);
		this.toDisposes.push(this.downInput.onValueChanged(e => this.downChanged_handler(e)));
		this.initAttributeStyle(attribute);

		var attribute = new AttributeItemGroup(container);
		attribute.label = localize('property.style.buttonSkin.disable', 'Disable:');
		this.disableInput.create(attribute);
		this.toDisposes.push(this.disableInput.onValueChanged(e => this.disableChanged_handler(e)));
		this.initAttributeStyle(attribute);
	}


	private initAttributeStyle(attribute: AttributeItemGroup): void {
		attribute.labelWidth = 60;
		addClass(attribute.getItemElement(), 'property-attribute-item');
	}


	private upChanged_handler(value: string): void {
		this.updateButtonSkinExml(this.upInput.text, this.downInput.text, this.disableInput.text);
	}
	private downChanged_handler(value: string): void {
		this.updateButtonSkinExml(this.upInput.text, this.downInput.text, this.disableInput.text);
	}
	private disableChanged_handler(value: string): void {
		this.updateButtonSkinExml(this.upInput.text, this.downInput.text, this.disableInput.text);
	}


	/**刷新按钮的皮肤展现
	 * upv:弹起状态资源名，downv:按下状态资源名，disabeldv:禁用状态资源名
	*/
	public updateButtonSkinExml(upv: string, downv: string, disabledv: string): void {
		if (!this.currentNode) {
			return;
		}
		const up = upv;
		const down = downv;
		const disabled = disabledv;

		let oldLabel;

		const classValue = this.currentNode.getProperty('skinName') as IClass;

		if (classValue && classValue.getIsInner()) {
			const buttonXML = classValue.getClassXML();
			if (buttonXML.children.length > 1) {
				const labelXML = buttonXML.children[1];
				if (labelXML.localName === 'Label') {
					oldLabel = labelXML;
				}
			}
		}

		this.currentNode.setProperty('skinName', null);

		if (!up && !down && !disabled) {
			return;
		}

		const xmlTag = parse('<e:Skin xmlns:e = \'' + EUI.uri + '\' states= \'up,down,disabled\' > </e:Skin>');
		const image = parse('<e:Image xmlns:e= \'' + EUI.uri + '\'  width=\'100%\' height=\'100%\'/>');

		if (up) {
			setAttribute(image, 'source', up);
			image.attributes['source'] = up;
			deleteAttribute(image, 'source.up');//up的属性用source
		}
		if (down) {
			setAttribute(image, 'source.down', down);
			image.attributes['source.down'] = down;
		}
		if (disabled) {
			setAttribute(image, 'source.disabled', disabled);
			image.attributes['source.disabled'] = disabled;
		}
		appendChild(xmlTag, image);
		if (oldLabel) {
			appendChild(xmlTag, oldLabel);
		} else {
			appendChild(xmlTag, parse('<e:Label xmlns:e = \'' + EUI.uri + '\' id=\'labelDisplay\' horizontalCenter=\'0\' verticalCenter=\'0\'/>'));
		}
		const skinClass: IClass = this.model.createIClass(null, xmlTag);
		this.currentNode.setProperty('skinName', skinClass);
	}
}