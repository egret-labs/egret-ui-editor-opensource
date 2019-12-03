import { INode } from '../exml/treeNodes';

/**
 * 节点间的坐标系转换
 * @param position 要转换的位置
 * @param from 起始坐标系
 * @param to 目标坐标系
 */
export function coordinateTransfrom(position: { x: number, y: number }, from: INode, to: INode): { x: number, y: number } {
	if (!from || !to || !position) {
		return null;
	}
	const fromInstance = from.getInstance();
	const toInstance = to.getInstance();
	if (!fromInstance || !toInstance) {
		return null;
	}
	let pos = fromInstance.localToGlobal(position.x, position.y);
	pos = toInstance.globalToLocal(pos.x, pos.y);
	return { x: pos.x, y: pos.y };
}