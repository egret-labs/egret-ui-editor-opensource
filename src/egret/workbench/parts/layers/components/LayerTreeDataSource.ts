import WinJS = require('vs/base/common/winjs.base');
import { IDataSource, ITree, /*IDragAndDropData,*/ } from 'vs/base/parts/tree/browser/tree';
import { INode, isInstanceof, IContainer } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { LayerPanelUtil } from 'egret/workbench/parts/layers/components/LayerPanelUtil';

/**
 * 数据源
 */
export class DomLayerTreeDataSource implements IDataSource {
	getId(tree: ITree, element: INode): string {
		if (!element) {
			return 'null';
		}
		return element.hashCode.toString();
	}

	hasChildren(tree: ITree, element: INode): boolean {
		if (isInstanceof(element, 'eui.IContainer')) {
			return true;
		}
		else {
			return false;
		}
	}

	getChildren(tree: ITree, element: INode): WinJS.Promise {
		if (LayerPanelUtil.isContainer(element)) {
			const childrenLength = (element as IContainer).getNumChildren();
			const children = [];
			for (let index = 0; index < childrenLength; index++) {
				children.push((element as IContainer).getNodeAt(index));
			}
			return WinJS.TPromise.as(children);
		}
		else{
			return WinJS.TPromise.as(null);
		}
	}

	getParent(tree: ITree, element: INode): WinJS.Promise {
		return WinJS.TPromise.as(element.getParent());
	}
}