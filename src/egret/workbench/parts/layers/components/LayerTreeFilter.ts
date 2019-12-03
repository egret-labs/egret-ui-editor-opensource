import { ITree, IFilter } from 'vs/base/parts/tree/browser/tree';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { LayerPanelUtil } from 'egret/workbench/parts/layers/components/LayerPanelUtil';

/**
 * 文件过滤
 */
export class DomLayerTreeFilter implements IFilter {

	/**过滤文本 */
	public filterText = '';

	constructor() {

	}

	isVisible(tree: ITree, element: INode): boolean {
		if (this.filterText === '') {
			return true;
		}
		else {
			if (element.getLocked()) {
				const elementName = element.getName();
				let text = elementName;
				if (element.getId()) {
					text += ' - ' + element.getId();
				}
				if (text.toUpperCase().indexOf(this.filterText.toUpperCase()) !== -1) {
					return true;
				}
				else {
					return false;
				}
			}
			else if (LayerPanelUtil.isContainer(element)) {
				const subNodeList = LayerPanelUtil.getNodeListByANode(element);
				for (let index = 0; index < subNodeList.length; index++) {
					const each = subNodeList[index];
					const eachName = each.getName();
					let text = eachName;
					if (each.getId()) {
						text += ' - ' + each.getId();
					}
					if (text.toUpperCase().indexOf(this.filterText.toUpperCase()) !== -1) {
						tree.expand(element);
						return true;
					}
				}
				return false;
			}
			else {
				const elementName = element.getName();
				let text = elementName;
				if (element.getId()) {
					text += ' - ' + element.getId();
				}
				if (text.toUpperCase().indexOf(this.filterText.toUpperCase()) !== -1) {
					return true;
				}
				else {
					return false;
				}
			}
		}
	}
}