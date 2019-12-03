import { DivideLine } from 'egret/base/browser/ui/dividelines';
import { localize } from 'egret/base/localization/nls';
import { HGroup } from 'egret/base/browser/ui/containers';
import { IUIBase } from 'egret/base/browser/ui/common';
import { BaseLayoutPart } from './basePart';

import '../../media/propertyView.css';
import '../../media/propertyViewStyle.css';

enum PropertyTypes {
	GAP = 'gap',
	HORIZONTAL_ALIGN = 'horizontalAlign',
	VERTICAL_ALIGN = 'verticalAlign',
	PADDING_LEFT = 'paddingLeft',
	PADDING_RIGHT = 'paddingRight',
	PADDING_TOP = 'paddingTop',
	PADDING_BOTTOM = 'paddingBottom'
}

/**
 * 水平或垂直布局
 */
export class HVPart extends BaseLayoutPart {

	constructor(container: HTMLElement | IUIBase = null) {
		super(container);
		this.initTypes(
			PropertyTypes.GAP,
			PropertyTypes.HORIZONTAL_ALIGN,
			PropertyTypes.VERTICAL_ALIGN,
			PropertyTypes.PADDING_LEFT,
			PropertyTypes.PADDING_RIGHT,
			PropertyTypes.PADDING_TOP,
			PropertyTypes.PADDING_BOTTOM
		);
	}

	/**
	 * 渲染
	 * @param el 
	 */
	protected render(container: HTMLElement): void {
		super.render(container);

		let line = new DivideLine(container);
		line.text = localize('property.layout.title.hv.gap', 'Gap');
		line.style.marginBottom = '6px';

		this.createNumberAtt(PropertyTypes.GAP, localize('property.layout.hv.gap', 'Gap:'), container);

		line = new DivideLine(container);
		line.text = localize('property.layout.title.hv.align', 'Align');
		line.style.marginBottom = '6px';

		this.createCombobox(PropertyTypes.HORIZONTAL_ALIGN, localize('property.layout.hv.horizontalAlign', 'Horizontal:'), container,[
			{ id: 'left', data: 'left' },
			{ id: 'center', data: 'center' },
			{ id: 'right', data: 'right' },
			{ id: 'justify', data: 'justify' },
			{ id: 'contentJustify', data: 'contentJustify' }]);

		this.createCombobox(PropertyTypes.VERTICAL_ALIGN, localize('property.layout.hv.verticalAlign', 'Vertical:'), container,[
			{ id: 'top', data: 'top' },
			{ id: 'middle', data: 'middle' },
			{ id: 'bottom', data: 'bottom' },
			{ id: 'justify', data: 'justify' },
			{ id: 'contentJustify', data: 'contentJustify' }]);

		line = new DivideLine(container);
		line.text = localize('property.layout.title.hv.padding', 'Padding');
		line.style.marginBottom = '6px';

		let hgroup = new HGroup(container);
		hgroup.style.flexWrap = 'wrap';
		this.createNumberAtt(PropertyTypes.PADDING_LEFT, localize('property.layout.hv.paddingLeft', 'Left:'), hgroup);
		this.createNumberAtt(PropertyTypes.PADDING_RIGHT, localize('property.layout.hv.paddingRight', 'Right:'), hgroup);

		hgroup = new HGroup(container);
		hgroup.style.flexWrap = 'wrap';
		this.createNumberAtt(PropertyTypes.PADDING_TOP, localize('property.layout.hv.paddingTop', 'Top:'), hgroup);
		this.createNumberAtt(PropertyTypes.PADDING_BOTTOM, localize('property.layout.hv.paddingBottom', 'Bottom:'), hgroup);
	}
}