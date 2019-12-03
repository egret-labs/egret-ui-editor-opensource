import { ISorter, ITree } from 'vs/base/parts/tree/browser/tree';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { LayerPanelUtil } from 'egret/workbench/parts/layers/components/LayerPanelUtil';

/**
 * 排序
 */
export class DomLayerTreeSorter implements ISorter {
	constructor() {
	}
	compare(tree: ITree, element: INode, otherElement: INode): number {
		return LayerPanelUtil.compare(tree,element,otherElement);
	}
}