import { Point, Rectangle } from './common';
import { INode } from './treeNodes';
import * as sax from '../sax/sax';

let _tags: sax.Tag[] = null;
/** 
 * 设置复制的标签
 */
export function setTags(tags: sax.Tag[]): void {
	_tags = tags;
}
/**
 * 得到复制的标签
 */
export function getTags(): sax.Tag[] {
	return _tags;
}



let nodeSize: Point = null;
/**
 * 复制宽度和高度
 */
export function copySizeToClipboard(node: INode): void {
	if (!nodeSize) {
		nodeSize = new Point();
	}
	nodeSize.x = getProperty(node, 'width');
	nodeSize.y = getProperty(node, 'height');
}
/**
 * 粘贴宽度和高度
 */
export function pasteSizeFromClipboard(nodes: INode[]): void {
	if (canPasteSize()) {
		for (let i = 0; i < nodes.length; i++) {
			if (!isNaN(nodeSize.x)) {
				nodes[i].setSize('width', nodeSize.x);
			}
			if (!isNaN(nodeSize.y)) {
				nodes[i].setSize('height', nodeSize.y);
			}
		}
	}
}
/**
 * 是否可以粘贴宽度和高度
 * @return
 */
export function canPasteSize(): boolean {
	return nodeSize !== null;
}

let nodePos: Point = null;
/**
 * 复制位置
 */
export function copyPosToClipboard(node: INode): void {
	if (!nodePos) {
		nodePos = new Point();
	}
	nodePos.x = getProperty(node, 'x');
	nodePos.y = getProperty(node, 'y');
}
/**
 * 粘贴位置
 */
export function pastePosFromClipboard(nodes: INode[]): void {
	if (canPastePos()) {
		for (let i = 0; i < nodes.length; i++) {
			if (!isNaN(nodePos.x)) {
				nodes[i].setNumber('x', nodePos.x);
			}
			if (!isNaN(nodePos.y)) {
				nodes[i].setNumber('y', nodePos.y);
			}
		}
	}
}

/**
 * 是否可以粘贴位置
 * @return
 */
export function canPastePos(): boolean {
	return nodePos !== null;
}

let nodeRestrictRect: Rectangle = null;
let nodeHorizontalCenter: number;
let nodeCerticalCenter: number;

/**
 * 复制约束
 */
export function copyRestrictToClipboard(node: INode): void {
	if (!nodeRestrictRect) {
		nodeRestrictRect = new Rectangle();
	}
	nodeRestrictRect.left = getProperty(node, 'left');
	nodeRestrictRect.right = getProperty(node, 'right');
	nodeRestrictRect.top = getProperty(node, 'top');
	nodeRestrictRect.bottom = getProperty(node, 'bottom');
	nodeHorizontalCenter = getProperty(node, 'horizontalCenter');
	nodeCerticalCenter = getProperty(node, 'verticalCenter');
}
/**
 * 粘贴约束
 */
export function pasteRestrictFromClipboard(nodes: INode[]): void {
	if (canPasteRestrict()) {
		for (let i = 0; i < nodes.length; i++) {
			if (!isNaN(nodeRestrictRect.left)) {
				nodes[i].setNumber('left', nodeRestrictRect.left);
			}
			if (!isNaN(nodeRestrictRect.right)) {
				nodes[i].setNumber('right', nodeRestrictRect.right);
			}
			if (!isNaN(nodeRestrictRect.bottom)) {
				nodes[i].setNumber('bottom', nodeRestrictRect.bottom);
			}
			if (!isNaN(nodeRestrictRect.top)) {
				nodes[i].setNumber('top', nodeRestrictRect.top);
			}
			if (!isNaN(nodeHorizontalCenter)) {
				nodes[i].setNumber('horizontalCenter', nodeHorizontalCenter);
			}
			if (!isNaN(nodeCerticalCenter)) {
				nodes[i].setNumber('verticalCenter', nodeCerticalCenter);
			}
		}
	}
}
/**
 * 是否可以粘贴约束
 * @return
 */
export function canPasteRestrict(): boolean {
	return nodeRestrictRect !== null;
}
/**
 * 将属性从target复制到source上
 * @param source
 * @param target
 */
export function copyPosFormTargetToSource(source: INode, target: INode): void {
	const x: number = getProperty(target, 'x');
	const y: number = getProperty(target, 'y');
	if (!isNaN(x)) {
		source.setNumber('x', x);
	}
	if (!isNaN(y)) {
		source.setNumber('y', y);
	}
}

/**
 * 将属性从target复制到source上
 * @param source
 * @param target
 */
export function copySizeFormTargetToSource(source: INode, target: INode): void {
	const width: number = getProperty(target, 'width');
	const height: number = getProperty(target, 'height');
	if (!isNaN(width)) {
		source.setSize('width', width);
	}
	if (!isNaN(height)) {
		source.setSize('height', height);
	}
}
/**
 * 复制全部属性值
 * @param node
 */
export function copypAllPropertyToClipboard(node: INode): void {
	copyPosToClipboard(node);
	copySizeToClipboard(node);
	copyRestrictToClipboard(node);
}


function getProperty(node: INode, property: string): number {
	let result: number = NaN;
	if (node.getProperty(property)) {
		result = node.getProperty(property).getInstance() as number;
	}
	else if (node.getInstance()) {
		result = node.getInstance()[property];
	}
	else {
		result = NaN;
	}
	return result;
}