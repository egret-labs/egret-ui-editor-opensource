import { DivideLine } from 'egret/base/browser/ui/dividelines';
import { localize } from 'egret/base/localization/nls';
import { HGroup } from 'egret/base/browser/ui/containers';
import { IUIBase } from 'egret/base/browser/ui/common';
import { BaseLayoutPart } from './basePart';

import '../../media/propertyView.css';
import '../../media/propertyViewStyle.css';

enum PropertyTypes {
	ORIENTATION = 'orientation',

	HORIZONTAL_GAP = 'horizontalGap',
	VERTICAL_GAP = 'verticalGap',

	HORIZONTAL_ALIGN = 'horizontalAlign',
	VERTICAL_ALIGN = 'verticalAlign',

	ROW_HEIGHT = 'rowHeight',
	REQUESTED_ROW_COUNT = 'requestedRowCount',
	COLUMN_WIDTH = 'columnWidth',
	REQUESTED_COLUMN_COUNT = 'requestedColumnCount',

	ROW_ALIGN = 'rowAlign',
	COLUMN_ALIGN = 'columnAlign',

	PADDING_LEFT = 'paddingLeft',
	PADDING_RIGHT = 'paddingRight',
	PADDING_TOP = 'paddingTop',
	PADDING_BOTTOM = 'paddingBottom'
}

/**
 * 格子布局
 */
export class TilePart extends BaseLayoutPart {

	constructor(container: HTMLElement | IUIBase = null) {
		super(container);
		this.initTypes(
			PropertyTypes.ORIENTATION,
			PropertyTypes.HORIZONTAL_GAP,
			PropertyTypes.VERTICAL_GAP,
			PropertyTypes.HORIZONTAL_ALIGN,
			PropertyTypes.VERTICAL_ALIGN,
			PropertyTypes.ROW_HEIGHT,
			PropertyTypes.REQUESTED_ROW_COUNT,
			PropertyTypes.COLUMN_WIDTH,
			PropertyTypes.REQUESTED_COLUMN_COUNT,
			PropertyTypes.ROW_ALIGN,
			PropertyTypes.COLUMN_ALIGN,
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
		line.text = localize('property.layout.title.tile.orientation', 'Orientation');
		line.style.marginBottom = '6px';

		this.createCombobox(PropertyTypes.ORIENTATION, localize('property.layout.tile.orientation', 'Orientation:'), container, [
			{ id: 'rows', data: 'rows' },
			{ id: 'columns', data: 'columns' }]);

		line = new DivideLine(container);
		line.text = localize('property.layout.title.tile.gap', 'Gap');
		line.style.marginBottom = '6px';

		let hgroup = new HGroup(container);
		hgroup.style.flexWrap = 'wrap';
		this.createNumberAtt(PropertyTypes.HORIZONTAL_GAP, localize('property.layout.tile.horizontalGap', 'Horizontal:'), hgroup);
		this.createNumberAtt(PropertyTypes.VERTICAL_GAP, localize('property.layout.tile.verticalGap', 'Vertical:'), hgroup);

		line = new DivideLine(container);
		line.text = localize('property.layout.title.tile.align', 'Align');
		line.style.marginBottom = '6px';


		this.createCombobox(PropertyTypes.HORIZONTAL_ALIGN, localize('property.layout.tile.horizontalAlign', 'Horizontal:'), container, [
			{ id: 'left', data: 'left' },
			{ id: 'center', data: 'center' },
			{ id: 'right', data: 'right' },
			{ id: 'justify', data: 'justify' },
			{ id: 'contentJustify', data: 'contentJustify' }]);

		this.createCombobox(PropertyTypes.VERTICAL_ALIGN, localize('property.layout.tile.verticalAlign', 'Vertical:'), container, [
			{ id: 'top', data: 'top' },
			{ id: 'middle', data: 'middle' },
			{ id: 'bottom', data: 'bottom' },
			{ id: 'justify', data: 'justify' },
			{ id: 'contentJustify', data: 'contentJustify' }]);


		line = new DivideLine(container);
		line.text = localize('property.layout.title.tile.row', 'Row');
		line.style.marginBottom = '6px';

		hgroup = new HGroup(container);
		hgroup.style.flexWrap = 'wrap';
		this.createNumberAtt(PropertyTypes.ROW_HEIGHT, localize('property.layout.tile.rowHeight', 'Height:'), hgroup);
		this.createNumberAtt(PropertyTypes.REQUESTED_ROW_COUNT, localize('property.layout.tile.rowCount', 'Count:'), hgroup);

		line = new DivideLine(container);
		line.text = localize('property.layout.title.tile.column', 'Column');
		line.style.marginBottom = '6px';

		hgroup = new HGroup(container);
		hgroup.style.flexWrap = 'wrap';
		this.createNumberAtt(PropertyTypes.COLUMN_WIDTH, localize('property.layout.tile.columnWidth', 'Width:'), hgroup);
		this.createNumberAtt(PropertyTypes.REQUESTED_COLUMN_COUNT, localize('property.layout.tile.columnCount', 'Count:'), hgroup);

		line = new DivideLine(container);
		line.text = localize('property.layout.title.tile.endpoint', 'Endpoint Alignment');
		line.style.marginBottom = '6px';

		this.createCombobox(PropertyTypes.ROW_ALIGN, localize('property.layout.tile.alignBoth.row', 'Row:'), container, [
			{ id: 'top', data: 'top' },
			{ id: 'justifyUsingGap', data: 'justifyUsingGap' },
			{ id: 'left', data: 'justifyUsingHeight' }]);

		this.createCombobox(PropertyTypes.COLUMN_ALIGN, localize('property.layout.tile.alignBoth.column', 'Column:'), container, [
			{ id: 'left', data: 'left' },
			{ id: 'justifyUsingGap', data: 'justifyUsingGap' },
			{ id: 'justifyUsingWidth', data: 'justifyUsingWidth' }]);


		line = new DivideLine(container);
		line.text = localize('property.layout.title.tile.padding', 'Padding');
		line.style.marginBottom = '6px';

		hgroup = new HGroup(container);
		hgroup.style.flexWrap = 'wrap';
		this.createNumberAtt(PropertyTypes.PADDING_LEFT, localize('property.layout.tile.paddingLeft', 'Left:'), hgroup);
		this.createNumberAtt(PropertyTypes.PADDING_RIGHT, localize('property.layout.tile.paddingRight', 'Right:'), hgroup);

		hgroup = new HGroup(container);
		hgroup.style.flexWrap = 'wrap';
		this.createNumberAtt(PropertyTypes.PADDING_TOP, localize('property.layout.tile.paddingTop', 'Top:'), hgroup);
		this.createNumberAtt(PropertyTypes.PADDING_BOTTOM, localize('property.layout.tile.paddingBottom', 'Bottom:'), hgroup);
	}
}