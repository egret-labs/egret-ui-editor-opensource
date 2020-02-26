import { ITree } from 'vs/base/parts/tree/browser/tree';
import { INode, IContainer, isInstanceof } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { EScroller } from 'egret/exts/exml-exts/exml/common/exml/treeNodesImpls';

/**
 * layer 工具
 */
export class LayerPanelUtil {
	/**
	 *判断是容器
	 */
	static isContainer(element: INode): element is IContainer {
		if (isInstanceof(element, 'eui.IContainer')) {
			return true;
		}
		else {
			return false;
		}
	}
	/**
	 * 从一个node开始向下层遍历得到包含它本身在内的子树的所有node
	 */
	static getNodeListByANode(node: INode): INode[] {
		if (!LayerPanelUtil.isContainer(node)) {
			return [node];
		}
		else {
			const result: INode[] = [];
			result.push(node);
			let currentParentList: INode[] = [];
			let hasNextLevel = false;
			for (let index = 0; index < node.getNumChildren(); index++) {
				const thatNode = node.getNodeAt(index);
				result.push(thatNode);
				currentParentList.push(thatNode);
			}
			if (currentParentList.length === 0) {
				return result;
			}

			do {
				const tempList: INode[] = [];
				for (let index = 0; index < currentParentList.length; index++) {
					const item = currentParentList[index];
					if (!LayerPanelUtil.isContainer(item)) {
						continue;
					}
					else {
						for (let index = 0; index < item.getNumChildren(); index++) {
							const thatNode = item.getNodeAt(index);
							result.push(thatNode);
							tempList.push(thatNode);
						}
					}
				}
				if (tempList.length === 0) {
					hasNextLevel = false;
				}
				else {
					hasNextLevel = true;
				}
				currentParentList = tempList;
			} while (hasNextLevel);
			return result;
		}
	}
	/**
	 *移动节点
	 */
	static moveNodeForwardOtherNode(node: INode, otherNode: INode, model: IExmlModel): boolean {
		//判断是否是同元素，如果是则为不合法操作,return
		if (node === otherNode) {
			return false;
		}

		//判断是否是包含关系
		if (isInstanceof(node, 'eui.IContainer')) {
			if ((<IContainer>node).contains(otherNode)) {
				return false;
			}
		}
		//scroller 不合法
		if (otherNode.getParent() && otherNode.getParent().getName() === 'Scroller') {
			return false;
		}
		//
		model.isChangeNodeFloor(true);
		//将node从树先移除
		if (node.getParent()) {
			node.getParent().removeNode(node);
		}
		//获得otherNode的index
		if (otherNode.getParent()) {
			const index = otherNode.getParent().getNodeIndex(otherNode);
			//将node放入正确位置
			otherNode.getParent().addNodeAt(node, index);
		}
		model.isChangeNodeFloor(false);
		return true;
	}
	static moveNodeBehindOtherNode(node: INode, otherNode: INode, model: IExmlModel): boolean {
		//判断是否是同元素，如果是则为不合法操作,return
		if (node === otherNode) {
			return false;
		}

		//判断是否是包含关系
		if (isInstanceof(node, 'eui.IContainer')) {
			if ((<IContainer>node).contains(otherNode)) {
				return false;
			}
		}
		//scroller 不合法
		if (otherNode.getParent() && otherNode.getParent().getName() === 'Scroller') {
			return false;
		}
		//
		model.isChangeNodeFloor(true);
		//将node从树先移除
		if (node.getParent()) {
			node.getParent().removeNode(node);
		}
		//获得otherNode的index
		if (otherNode.getParent()) {
			let index = otherNode.getParent().getNodeIndex(otherNode);
			index += 1;
			//将node放入正确位置
			otherNode.getParent().addNodeAt(node, index);
		} else if (otherNode.getIsRoot()) {
			const otherNodeContainer = otherNode as IContainer;
			otherNodeContainer.addNodeAt(node, otherNodeContainer.getNumChildren());
		}
		model.isChangeNodeFloor(false);
		return true;
	}
	static moveNodeIntoOtherNode(node: INode, targetNode: INode, model: IExmlModel): boolean {
		model.isChangeNodeFloor(true);
		if (isInstanceof(targetNode, 'eui.IScroller')) {
			const num = (targetNode as IContainer).getNumChildren();
			const tempContainer: IContainer = targetNode as IContainer;


			if (num === 1) {
				const sub = tempContainer.getNodeAt(0);
				if (isInstanceof(tempContainer, 'eui.IContainer')) {
					LayerPanelUtil.switchNodeparent(node, sub.getInstance());
					node.getParent().removeNode(node);
					(sub as IContainer).addNode(node);
				}
			} else if (num === 0) {
				if (model.getExmlConfig().isInstance(node.getInstance(), 'eui.IViewport')) {
					node.getParent().removeNode(node);
					(tempContainer as EScroller).setDirectChild(node);
				}
			}
		} else {
			if (isInstanceof(targetNode, 'eui.IContainer')) {
				LayerPanelUtil.switchNodeparent(node, targetNode.getInstance());
				node.getParent().removeNode(node);
				(<IContainer>targetNode).addNode(node);
			}

		}

		model.isChangeNodeFloor(false);
		return true;
	}
	static switchNodeparent(node: INode, disParent: any) {
		const nodeInstance: egret.DisplayObject = node.getInstance();
		let pos: egret.Point = nodeInstance.localToGlobal(0, 0);
		let newPos = disParent.globalToLocal(pos.x, pos.y);
		let oldParentScaleX: number = 1;
		let oldParentScaleY: number = 1;
		let tempDis: any = nodeInstance.parent;
		while (tempDis && tempDis.parent)//遍历至stage倒数第二层
		{
			oldParentScaleX *= tempDis.scaleX;
			oldParentScaleY *= tempDis.scaleY;
			tempDis = tempDis.parent;
		}

		let newParentScaleX: number = 1;
		let newParentScaleY: number = 1;

		tempDis = disParent;
		while (tempDis && tempDis.parent) {
			newParentScaleX *= tempDis.scaleX;
			newParentScaleY *= tempDis.scaleY;
			tempDis = tempDis.parent;
		}

		node.setNumber('x', newPos.x);
		node.setNumber('y', newPos.y);
		node.setNumber('scaleX', nodeInstance.scaleX * oldParentScaleX / newParentScaleX);
		node.setNumber('scaleY', nodeInstance.scaleY * oldParentScaleY / newParentScaleY);
	}

	/**
	 * 获取节点个数
	 * @param node 
	 */
	public static getPathByNode(node: INode): number[] {
		const sum = [];
		while (node.getParent()) {
			sum.push(node.getParent().getNodeIndex(node));
			node = node.getParent();
		}
		return sum.reverse();
	}

	/**
	 * 根据路径获得IContainer
	 * @param rootNode 
	 * @param path 
	 */
	public static getNodeByPath(rootNode: INode, path: number[]): INode {
		let current = rootNode;
		for (let index = 0; index < path.length; index++) {
			let newCurrent = current;
			if (LayerPanelUtil.isContainer(current)) {
				newCurrent = current.getNodeAt(path[index]);
				//current = newCurrent;
			}
			current = newCurrent;
		}
		return current;
	}
	static compare(tree: ITree, element: INode, otherElement: INode): number {
		const depth = element.getNestLevel();
		const otherDepth = otherElement.getNestLevel();
		//排序需要分类讨论,如果是根节点，就一定靠前，不参与排序
		if (depth === 0) {
			return -1;
		}
		else if (otherDepth === 0) {
			return 1;
		}
		else if (depth === otherDepth) {
			if (element.getParent() === otherElement.getParent()) {
				//谁在children数组的次序靠前谁就在先
				const childIndex = element.getParent().getNodeIndex(element);
				const otherChildIndex = otherElement.getParent().getNodeIndex(otherElement);
				if (childIndex > otherChildIndex) {
					return 1;
				}
				else if (childIndex === otherChildIndex) {
					console.log('temp assert: should never show');
					return 0;
				}
				else if (childIndex < otherChildIndex) {
					return -1;
				}
			}
			//同深度不同父亲
			else {
				//谁的父亲在先谁就在先
				const parentIndex = element.getParent().getParent().getNodeIndex(element.getParent());
				const otherParentIndex = otherElement.getParent().getParent().getNodeIndex(otherElement.getParent());
				if (parentIndex > otherParentIndex) {
					return 1;
				}
				else if (parentIndex === otherParentIndex) {
					console.log('temp assert: should never show');
					return 0;
				}
				else if (parentIndex < otherParentIndex) {
					return -1;
				}
			}
		}
		//不同深度
		else {
			let lowerElement: INode = null;
			let higherElement: INode = null;
			let deltaDepth: number = 0;
			let isElementLower: boolean = false;
			//获得高深度在低深度那层的祖辈，和低深度元素比较谁在children数组的次序靠前
			if (depth > otherDepth) {
				lowerElement = element;
				higherElement = otherElement;
				deltaDepth = depth - otherDepth;
				isElementLower = true;
			}
			else {
				lowerElement = otherElement;
				higherElement = element;
				deltaDepth = otherDepth - depth;
				isElementLower = true;
			}
			//if root
			if (!lowerElement.getParent()) {
				if (isElementLower) {
					return -1;
				}
				else {
					return 1;
				}
			}
			let sameDepthParent: INode = higherElement;
			for (let index = 0; index < deltaDepth; index++) {
				sameDepthParent = sameDepthParent.getParent();
			}
			const sameDepthIndex = sameDepthParent.getParent().getNodeIndex(sameDepthParent);
			const lowerIndex = lowerElement.getParent().getNodeIndex(lowerElement);
			if (sameDepthIndex > lowerIndex) {
				if (isElementLower) {
					return -1;
				}
				else {
					return 1;
				}
			}
			else if (sameDepthIndex === lowerIndex) {
				console.log('temp assert: should never show');
				return 0;
			}
			else if (sameDepthIndex < lowerIndex) {
				if (isElementLower) {
					return 1;
				}
				else {
					return -1;
				}
			}
		}
		return 0;
	}
}