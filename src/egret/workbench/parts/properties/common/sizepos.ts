import { setPropertyNumPro } from './properties';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { isString } from 'egret/base/common/types';
import { judgePercent } from './formats';

/**
 * 设置left
 * @param v 
 */
export function setLeft(nodes: INode[], value: number, model: IExmlModel): void {
	setPropertyNumPro(nodes, 'left', value, model, false);
}
/**
 * 设置right
 * @param v 
 */
export function setRight(nodes: INode[], value: number, model: IExmlModel): void {
	setPropertyNumPro(nodes, 'right', value, model, false);
}
/**
 * 设置top
 * @param v 
 */
export function setTop(nodes: INode[], value: number, model: IExmlModel): void {
	setPropertyNumPro(nodes, 'top', value, model, false);
}
/**
 * 设置bottom
 * @param v 
 */
export function setBottom(nodes: INode[], value: number, model: IExmlModel): void {
	setPropertyNumPro(nodes, 'bottom', value, model, false);
}

/**
 * 设置水平居中
 * @param v 
 */
export function setHorizontalCenter(nodes: INode[], value: number, model: IExmlModel): void {
	setPropertyNumPro(nodes, 'horizontalCenter', value, model, false);
}

/**
 * 设置垂直居中
 * @param v 
 */
export function setVerticalCenter(nodes: INode[], value: number, model: IExmlModel): void {
	setPropertyNumPro(nodes, 'verticalCenter', value, model, false);
}

/**
 * 设置x值：number
 */
export function setX(nodes: INode[], value: number, model: IExmlModel): void {
	setPropertyNumPro(nodes, 'x', value, model, false);
}
/**
 * 设置y值：number
 */
export function setY(nodes: INode[], value: number, model: IExmlModel): void {
	setPropertyNumPro(nodes, 'y', value, model, false);
}

/**
 * 设置宽度
 * 值：string 可以是带‘％’的数字字符串
 */
export function setWidth(nodes: INode[], value: number, model: IExmlModel): void {

	setPropertyNumPro(nodes, 'width', value, model, true);
	if (isString(value) && judgePercent(value)) {
		this.selectedNodes.forEach(node => {
			node.setProperty('right', null);
		});
	}
}
/**
 * 设置高度
 * 值：string 可以是带‘％’的数字字符串、
 */
export function setHeight(nodes: INode[], value: number, model: IExmlModel): void {
	setPropertyNumPro(nodes, 'height', value, model, true);
	if (isString(value) && judgePercent(value)) {
		this.selectedNodes.forEach(node => {
			node.setProperty('bottom', null);
		});
	}
}
