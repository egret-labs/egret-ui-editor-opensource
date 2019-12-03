'use strict';

import * as Types from 'egret/base/common/types';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { ELink, ESize, EValue } from 'egret/exts/exml-exts/exml/common/exml/treeNodesImpls';
import { cleanRelatvieProps } from 'egret/exts/exml-exts/exml/common/exml/exmlModel';
import { INode, IValue } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { EUI } from 'egret/exts/exml-exts/exml/common/project/parsers/core/commons';
import { AutoRefresher } from 'egret/workbench/parts/properties_old/util/AutoRefresher';
import { DataBindingUtil } from 'egret/workbench/parts/properties_old/util/DataBindingUtil';
import { FormatUtil } from 'egret/workbench/parts/properties_old/util/formatUtil';
import { Rectangle } from 'egret/workbench/parts/properties_old/util/Rectangle';
/**
 * 大小和位置
 */
export class SizeAndPosGroupLogicRunner {
	regexp = new RegExp('^[\\+\\-]?[0-9]+$|^[\\+\\-]?[0-9]+\\.[0-9]+$');
	private refresher: AutoRefresher;
	constructor() {
		this.refresher = new AutoRefresher(
			['width', 'height', 'x', 'y', 'left', 'right', 'top', 'bottom',
				'horizontalCenter', 'verticalCenter', 'scaleX', 'scaleY', 'anchorOffsetX', 'anchorOffsetY'],
			(list) => { this.refreshAll(list); }
		);
	}

	private static _instance: SizeAndPosGroupLogicRunner;
	/**
	 * 获取逻辑Runner
	 */
	public static getInstance(): SizeAndPosGroupLogicRunner {
		if (!this._instance) {
			this._instance = new SizeAndPosGroupLogicRunner();
		}
		return this._instance;
	}

	/**更新回调 */
	public updateDisplay: Function;

	private _model: IExmlModel;
	/**
	 * 选中的IExmlModel
	 */
	public get model(): IExmlModel {
		return this._model;
	}

	public set model(value: IExmlModel) {
		if (value === this._model) {
			return;
		}
		this._model = value;
		this.refresher.model = value;
	}

	/**
	 * 因为绑定的存在，单独某种属性的设置方法意义越来越模糊，所以有了这个兼容了绑定情况的设置属性的方法
	 * todo 还没写好，先不用
	 */
	public setProperty(v, prop: string) {
		const sum = v;

		for (let index = 0; index < this.selectedNodes.length; index++) {
			const node = this.selectedNodes[index];
			if (!sum) {
				node.setProperty(prop, null);
				continue;
			}
			let dValue = node.getProperty(prop);
			if (!dValue || (dValue && dValue instanceof ELink)) {
				dValue = this.model.createIValue('string', EUI, sum);
			}
			else if (DataBindingUtil.isBinding(v)) {
				dValue = this.model.createILink(v.slice(1, v.length - 1));
			}
			dValue.setInstance(sum);
			node.setProperty(prop, dValue);
			node.getInstance()[prop] = sum;
			// dValue = null;
		}
	}
	/**设置x锚点
	 * 值：number
	 */
	public setAnchorOffsetX(v: any): void {
		
		this.setPercentageProperty(v, 'anchorOffsetX', false);
	}

	/**设置y锚点
	 * 值：number
	 */
	public setAnchorOffsetY(v: any): void {

		this.setPercentageProperty(v, 'anchorOffsetY', false);
	}
	/**
	 * 设置x锚点
	 */
	public setScaleX(v: any): void {

		this.setPercentageProperty(v, 'scaleX', false);
	}

	/**
	 * 设置y锚点
	 */
	public setScaleY(v: any): void {
	
		this.setPercentageProperty(v, 'scaleY', false);
	}

	/**
	 * 设置宽度
	 * 值：string 可以是带‘％’的数字字符串
	 */
	public setWidth(v: any): void {

		this.setPercentageProperty(v, 'width');
		if (Types.isString(v) && FormatUtil.judgePercent(v)) {
			this.selectedNodes.forEach(node => {
				node.setProperty('right', null);
			});
		}
	}
	/**
	 * 设置高度
	 * 值：string 可以是带‘％’的数字字符串、
	 */
	public setHeight(v: any): void {
		
		this.setPercentageProperty(v, 'height');
		if (Types.isString(v) && FormatUtil.judgePercent(v)) {
			this.selectedNodes.forEach(node => {
				node.setProperty('bottom', null);
			});
		}
	}

	/**
	 * 设置变形H高
	 * @param v 
	 */
	public setEllipseHeight(v: any): void {
		
		this.setPercentageProperty(v, 'ellipseHeight', false);
	}
	/**
	 * 设置变形H宽
	 * @param v 
	 */
	public setEliipseWidth(v: any): void {
		
		this.setPercentageProperty(v, 'ellipseWidth', false);
	}
	/**设置x
	 * 值：number
	 */
	public setX(v: any): void {
		this.setPercentageProperty(v, 'x', false);
	}
	/**设置y
	 * 值：number
	 */
	public setY(v: any): void {
		this.setPercentageProperty(v, 'y', false);
	}

	/**
	 * 设置百分比属性
	 * @param v 
	 * @param prop 
	 * @param isSupportPercentage 
	 */
	public setPercentageProperty(v, prop: string, isSupportPercentage = true) {
		let sum = null;
		let isNumber: boolean = false;
		if (DataBindingUtil.judgeIsBindingData(v)) {
			sum = v;
		}
		else if (Types.isString(v) && FormatUtil.judgePercent(v) && isSupportPercentage) {
			sum = v;
		}
		else if (Types.isNumber(v)) {
			sum = (v as Number).toString();
			isNumber = true;
		}
		else if (this.regexp.test(v)) {
			sum = v;
			isNumber = true;
		}
		for (let index = 0; index < this.selectedNodes.length; index++) {
			const node = this.selectedNodes[index];
			if (!sum) {
				node.setProperty(prop, null);
				continue;
			}
			let dValue = node.getProperty(prop);
			if (!dValue || (dValue && dValue instanceof ELink)) {
				dValue = this.model.createIValue('string', EUI, sum);
			}
			else if (DataBindingUtil.isBinding(v) && dValue instanceof ESize) {
				dValue = this.model.createILink(v.slice(1, v.length - 1));
			}
			else if (DataBindingUtil.isBinding(v) && dValue instanceof EValue) {
				dValue = this.model.createILink(v.slice(1, v.length - 1));
			}
			dValue.setInstance(sum);
			node.setProperty(prop, dValue);
			if (isNumber) {
				if (prop === 'width') {
					if (node.getInstance()['percentWidth'] !== NaN) {
						node.getInstance()['percentWidth'] = NaN;
					}
				}
				else if (prop === 'height') {
					if (node.getInstance()['percentHeight'] !== NaN) {
						node.getInstance()['percentHeight'] = NaN;
					}
				}
			}
			//node.getInstance()[prop] = sum;
			// dValue = null;
		}
	}
	/**
	 * 设置left
	 * @param v 
	 */
	public setLeft(v: any): void {
		this.setPercentageProperty(v, 'left');
	}
	/**
	 * 设置right
	 * @param v 
	 */
	public setRight(v: any): void {
		this.setPercentageProperty(v, 'right');
	}
	/**
	 * 设置top
	 * @param v 
	 */
	public setTop(v: any): void {
		this.setPercentageProperty(v, 'top');
	}
	/**
	 * 设置bottom
	 * @param v 
	 */
	public setBottom(v: any): void {
		this.setPercentageProperty(v, 'bottom');
	}

	/**
	 * 设置水平居中
	 * @param v 
	 */
	public setHorizontalCenter(v: any): void {
		this.setPercentageProperty(v, 'horizontalCenter');
	}
	/**
	 * 设置垂直居中
	 * @param v 
	 */
	public setVerticalCenter(v: any): void {
		this.setPercentageProperty(v, 'verticalCenter');
	}
	//----------------元素对齐
	public alignTop(): void {
		let minY = Number.MAX_VALUE;
		this.selectedNodes.forEach(node => {
			if (node.getInstance() !== null) {
				minY = Math.min(node.getInstance().y, minY);
			}
		});
		minY = Math.round(minY);
		this.selectedNodes.forEach(node => {
			cleanRelatvieProps(node);
			node.setNumber('y', minY);
		});
	}
	/**
	 * 左对齐
	 */
	public alignLeft(): void {
		let minX = Number.MAX_VALUE;
		this.selectedNodes.forEach(node => {
			if (node.getInstance()) {
				minX = Math.min(node.getInstance().x, minX);
			}
		});
		minX = Math.round(minX);
		this.selectedNodes.forEach(node => {
			cleanRelatvieProps(node);
			node.setNumber('x', minX);
		});
	}
	/**
	 * 底对齐
	 */
	public alignBottom(): void {
		let maxY = -10000;
		this.selectedNodes.forEach(node => {
			const instance = node.getInstance();
			if (instance) {
				maxY = Math.max(instance.y + instance.height * instance.scaleY, maxY);
			}
		});
		this.selectedNodes.forEach(node => {
			const instance = node.getInstance();
			if (instance) {
				cleanRelatvieProps(node);
				let y = maxY - instance.height * instance.scaleY;
				y = Math.round(y);
				node.setNumber('y', y);
			}
		});
	}
	/**
	 * 右对齐
	 */
	public alignRight(): void {
		let maxX = -10000;
		this.selectedNodes.forEach(node => {
			const instance = node.getInstance();
			if (instance) {
				maxX = Math.max(instance.x + instance.width * instance.scaleX, maxX);
			}
		});
		this.selectedNodes.forEach(node => {
			const instance = node.getInstance();
			if (instance) {
				cleanRelatvieProps(node);
				let x = maxX - instance.width * instance.scaleX;
				x = Math.round(x);
				node.setNumber('x', x);
			}
		});
	}

	/**
	 * 垂直居中对齐
	 */
	public alignVecticalCenter(): void {
		let minY = Number.MAX_VALUE;
		let maxY = -10000;
		this.selectedNodes.forEach(node => {
			const instance = node.getInstance();
			if (instance) {
				minY = Math.min(instance.y, minY);
				maxY = Math.max(instance.y + instance.height * instance.scaleY, maxY);
			}
		});
		const vcPos = (minY + maxY) * 0.5;
		this.selectedNodes.forEach(node => {
			const instance = node.getInstance();
			if (instance) {
				cleanRelatvieProps(node);
				let y = vcPos - instance.height * instance.scaleY * 0.5;
				y = Math.round(y);
				node.setNumber('y', y);
			}
		});
	}

	/**
	 * 水平居中
	 */
	public alignHorizontalCenter(): void {
		let minX = Number.MAX_VALUE;
		let maxX = -10000;
		this.selectedNodes.forEach(node => {
			const instance = node.getInstance();
			if (instance) {
				minX = Math.min(instance.x, minX);
				maxX = Math.max(instance.x + instance.width * instance.scaleX, maxX);
			}
		});
		const hcPos = (minX + maxX) * 0.5;
		this.selectedNodes.forEach(node => {
			const instance = node.getInstance();
			if (instance) {
				cleanRelatvieProps(node);
				let x = hcPos - instance.width * instance.scaleX * 0.5;
				x = Math.round(x);
				node.setNumber('x', x);
			}
		});
	}
	//------------------------分布
	public spreadTopAvg(): void {
		let minY = Number.MAX_VALUE;
		let maxY = -10000;
		this.selectedNodes.sort((a: INode, b: INode) => {
			if (!a.getInstance() || !b.getInstance()) {
				return 0;
			}
			return a.getInstance().y - b.getInstance().y;
		});
		this.selectedNodes.forEach(node => {
			const instance = node.getInstance();
			if (instance) {
				minY = Math.min(instance.y, minY);
				maxY = Math.max(instance.y, maxY);
			}
		});
		const length = this.selectedNodes.length;
		const gap = (maxY - minY) / (length - 1);
		let pos = minY;
		let roundOff = 0;
		for (let i = 1; i < length - 1; i++) {
			const node = this.selectedNodes[i];
			cleanRelatvieProps(node);
			const newPos = Math.round(pos + gap + roundOff);
			roundOff += pos + gap - newPos;
			pos = newPos;
			node.setNumber('y', Math.round(pos));
		}
	}

	/**
	 * 垂直
	 */
	public spreadVerticalCenterAvg(): void {

		let minY = Number.MAX_VALUE;
		let maxY = -10000;
		this.selectedNodes.sort((a: INode, b: INode) => {
			if (!a.getInstance() || !b.getInstance()) {
				return 0;
			}
			const aPos = a.getInstance().y + a.getInstance().height * a.getInstance().scaleY * 0.5;
			const bPos = b.getInstance().y + b.getInstance().height * b.getInstance().scaleY * 0.5;
			return aPos - bPos;
		});
		this.selectedNodes.forEach(node => {
			const instance = node.getInstance();
			if (instance) {
				const yPos = instance.y + instance.height * instance.scaleY * 0.5;
				minY = Math.min(yPos, minY);
				maxY = Math.max(yPos, maxY);
			}
		});
		const length = this.selectedNodes.length;
		const gap = (maxY - minY) / (this.selectedNodes.length - 1);
		let pos = minY;
		let roundOff = 0;
		for (let i = 1; i < length - 1; i++) {
			const node = this.selectedNodes[i];
			const instance = node.getInstance();
			const newPos = Math.round(pos + gap + roundOff);
			roundOff += pos + gap - newPos;
			pos = newPos;
			if (instance) {
				const h = instance.height * instance.scaleY * 0.5;
				cleanRelatvieProps(node);
				node.setNumber('y', Math.round(pos - h));
			}
		}
	}

	/**
	 * 底部
	 */
	public spreadBottomAvg(): void {

		let minY = Number.MAX_VALUE;
		let maxY = -10000;
		this.selectedNodes.sort((a: INode, b: INode) => {
			if (!a.getInstance() || !b.getInstance()) {
				return 0;
			}
			const aPos = a.getInstance().y + a.getInstance().height * a.getInstance().scaleY;
			const bPos = b.getInstance().y + b.getInstance().height * b.getInstance().scaleY;
			return aPos - bPos;
		});
		this.selectedNodes.forEach(node => {
			const instance = node.getInstance();
			if (instance) {
				const yPos = instance.y + instance.height * instance.scaleY;
				minY = Math.min(yPos, minY);
				maxY = Math.max(yPos, maxY);
			}
		});
		const length = this.selectedNodes.length;
		const gap = (maxY - minY) / (length - 1);
		let pos = minY;
		let roundOff = 0;
		for (let i = 1; i < length - 1; i++) {
			const node = this.selectedNodes[i];
			const instance = node.getInstance();
			const newPos = Math.round(pos + gap + roundOff);
			roundOff += pos + gap - newPos;
			pos = newPos;
			if (instance) {
				const h = instance.height * instance.scaleY;
				cleanRelatvieProps(node);
				node.setNumber('y', Math.round(pos - h));
			}
		}
	}

	/**
	 * 左
	 */
	public spreadLeftAvg(): void {

		let minX = Number.MAX_VALUE;
		let maxX = -10000;
		this.selectedNodes.sort((a: INode, b: INode) => {
			if (!a.getInstance() || !b.getInstance())
			{ return 0; }
			return a.getInstance().x - b.getInstance().x;
		});
		this.selectedNodes.forEach(node => {
			const instance = node.getInstance();
			if (instance) {
				minX = Math.min(instance.x, minX);
				maxX = Math.max(instance.x, maxX);
			}
		});
		const length = this.selectedNodes.length;
		const gap = (maxX - minX) / (this.selectedNodes.length - 1);
		let pos = minX;
		let roundOff = 0;
		for (let i = 1; i < length - 1; i++) {
			const node = this.selectedNodes[i];
			cleanRelatvieProps(node);
			const newPos = Math.round(pos + gap + roundOff);
			roundOff += pos + gap - newPos;
			pos = newPos;
			node.setNumber('x', Math.round(pos));
		}
	}

	/**
	 * 水平
	 */
	public spreadHorizontalCenterAvg(): void {
		let minX = Number.MAX_VALUE;
		let maxX = -10000;
		this.selectedNodes.sort((a: INode, b: INode) => {
			if (!a.getInstance() || !b.getInstance()) {
				return 0;
			}
			const aPos = a.getInstance().x + a.getInstance().width * a.getInstance().scaleX * 0.5;
			const bPos = b.getInstance().x + b.getInstance().width * b.getInstance().scaleX * 0.5;
			return aPos - bPos;
		});
		this.selectedNodes.forEach(node => {
			const instance = node.getInstance();
			if (instance) {
				const xPos = instance.x + instance.width * instance.scaleX * 0.5;
				minX = Math.min(xPos, minX);
				maxX = Math.max(xPos, maxX);
			}
		});
		const length = this.selectedNodes.length;
		const gap = (maxX - minX) / (this.selectedNodes.length - 1);
		let pos = minX;
		let roundOff = 0;
		for (let i = 1; i < length - 1; i++) {
			const node = this.selectedNodes[i];
			const instance = node.getInstance();
			const newPos = Math.round(pos + gap + roundOff);
			roundOff += pos + gap - newPos;
			pos = newPos;
			if (instance) {
				const w = instance.width * instance.scaleX * 0.5;
				cleanRelatvieProps(node);
				node.setNumber('x', Math.round(pos - w));
			}

		}
	}

	/**
	 * 右
	 */
	public spreadRightAvg(): void {
		let minX = Number.MAX_VALUE;
		let maxX = -10000;
		this.selectedNodes.sort((a: INode, b: INode) => {
			if (!a.getInstance() || !b.getInstance()) {
				return 0;
			}
			const aPos = a.getInstance().x + a.getInstance().width * a.getInstance().scaleX;
			const bPos = b.getInstance().x + b.getInstance().width * b.getInstance().scaleX;
			return aPos - bPos;
		});
		this.selectedNodes.forEach(node => {
			const instance = node.getInstance();
			if (instance) {
				const xPos = instance.x + instance.width * instance.scaleX;
				minX = Math.min(xPos, minX);
				maxX = Math.max(xPos, maxX);
			}
		});
		const length = this.selectedNodes.length;
		const gap = (maxX - minX) / (this.selectedNodes.length - 1);
		let pos = minX;
		let roundOff = 0;
		for (let i = 1; i < length - 1; i++) {
			const node = this.selectedNodes[i];
			const instance = node.getInstance();
			const newPos = Math.round(pos + gap + roundOff);
			roundOff += pos + gap - newPos;
			pos = newPos;
			if (instance) {
				const w = instance.width * instance.scaleX;
				cleanRelatvieProps(node);
				node.setNumber('x', Math.round(pos - w));
			}
		}
	}
	//------------------------------排列
	public frontArg(): void {
		const tmpSelectList: INode[] = [];
		for (var i = 0; i < this.selectedNodes.length; i++) {
			tmpSelectList.push(this.selectedNodes[i]);
		}
		for (i = 0; i < tmpSelectList.length; i++) {
			tmpSelectList[i].getParent().addNode(tmpSelectList[i]);
		}
	}

	/**
	 * 向上
	 */
	public forwardArg(): void {
		const tmpSelectList: INode[] = [];
		for (var i = 0; i < this.selectedNodes.length; i++) {
			tmpSelectList.push(this.selectedNodes[i]);
		}
		for (i = 0; i < tmpSelectList.length; i++) {
			let index = tmpSelectList[i].getParent().getNodeIndex(tmpSelectList[i]);
			index++;
			if (index > tmpSelectList[i].getParent().getNumChildren() - 1) {
				index = tmpSelectList[i].getParent().getNumChildren() - 1;
			}
			tmpSelectList[i].getParent().addNodeAt(tmpSelectList[i], index);
		}
	}
	/**
	 * 向后
	 */
	public backwardArg(): void {
		const tmpSelectList: INode[] = [];
		for (var i = 0; i < this.selectedNodes.length; i++) {
			tmpSelectList.push(this.selectedNodes[i]);
		}
		for (i = tmpSelectList.length - 1; i >= 0; i--) {
			let index = tmpSelectList[i].getParent().getNodeIndex(tmpSelectList[i]);
			index--;
			if (index < 0) {
				index = 0;
			}
			tmpSelectList[i].getParent().addNodeAt(tmpSelectList[i], index);
		}
	}

	/**
	 * 向下
	 */
	public backArg(): void {
		const tmpSelectList: INode[] = [];
		for (var i = 0; i < this.selectedNodes.length; i++) {
			tmpSelectList.push(this.selectedNodes[i]);
		}
		for (i = tmpSelectList.length - 1; i >= 0; i--) {
			tmpSelectList[i].getParent().addNodeAt(tmpSelectList[i], 0);
		}
	}
	//-----------------------------空间分布
	public spaceCutHorizontal(): void {
		if (this.selectedNodes.length < 2) {
			return;
		}
		const nodes: INode[] = this.selectedNodes.concat();
		nodes.sort((a: INode, b: INode): number => {
			return a.getInstance()['x'] - b.getInstance()['x'];
		});
		let tmpElement: egret.DisplayObject = nodes.shift().getInstance();
		const firstAABB: Rectangle = this.getAABB(tmpElement, tmpElement.parent);
		tmpElement = nodes.pop().getInstance();
		const lastAABB: Rectangle = this.getAABB(tmpElement, tmpElement.parent);
		const space: number = lastAABB.x - firstAABB.x - firstAABB.width;
		if (space < 0) {
			return;
		}
		let contentSize: number = 0;
		for (let i: number = 0; i < nodes.length; i++) {
			tmpElement = nodes[i].getInstance();
			contentSize += this.getAABB(tmpElement, tmpElement.parent).width;
		}
		const gap: number = (space - contentSize) / (nodes.length + 1);
		let riseNum: number = firstAABB.x + firstAABB.width;
		let tmpAABB:Rectangle;
		let tmpNode: INode;
		while (nodes.length > 0) {
			tmpNode = nodes.shift();
			riseNum += gap;
			tmpElement = tmpNode.getInstance();
			tmpAABB = this.getAABB(tmpElement, tmpElement.parent);
			const vx: number = riseNum - tmpAABB.x;
			const newX: number = tmpElement.x + vx;
			tmpNode.setNumber('x', newX);
			riseNum += tmpAABB.width;
		}
	}

	/**
	 * 垂直
	 */
	public spaceCutVertical(): void {
		if (this.selectedNodes.length < 2) {
			return;
		}
		const nodes: INode[] = this.selectedNodes.concat();
		nodes.sort((a: INode, b: INode): number => {
			return a.getInstance()['y'] - b.getInstance()['y'];
		});
		let tmpElement: egret.DisplayObject = nodes.shift().getInstance();
		const firstAABB: Rectangle = this.getAABB(tmpElement, tmpElement.parent);
		tmpElement = nodes.pop().getInstance();
		const lastAABB: Rectangle = this.getAABB(tmpElement, tmpElement.parent);
		const space: number = lastAABB.y - firstAABB.y - firstAABB.height;
		if (space < 0) {
			return;
		}
		let contentSize: number = 0;
		for (let i: number = 0; i < nodes.length; i++) {
			tmpElement = nodes[i].getInstance();
			contentSize += this.getAABB(tmpElement, tmpElement.parent).height;
		}
		const gap: number = (space - contentSize) / (nodes.length + 1);
		let riseNum: number = firstAABB.y + firstAABB.height;
		let tmpAABB: Rectangle;
		let tmpNode: INode;
		while (nodes.length > 0) {
			tmpNode = nodes.shift();
			riseNum += gap;
			tmpElement = tmpNode.getInstance();
			tmpAABB = this.getAABB(tmpElement, tmpElement.parent);
			const vy: number = riseNum - tmpAABB.y;
			const newY: number = tmpElement.y + vy;
			tmpNode.setNumber('y', newY);
			riseNum += tmpAABB.height;
		}
	}
	//-----------------------------设置约束 组
	public setLayout(tag: string): void {

		if (tag === 'top' || tag === 'bottom' || tag === 'verticalCenter') {
			this.setTop(NaN);
			// node.setNumber('top', NaN);
			this.setBottom(NaN);
			// node.setNumber('bottom', NaN);
			this.setVerticalCenter(NaN);
			// node.setNumber('verticalCenter', NaN);
			this.setY(NaN);
			// node.setNumber('y', NaN);
			if (tag === 'top') {
				this.setTop(0);
			}
			else if (tag === 'bottom') {
				this.setBottom(0);
				// node.setNumber(iconName, 0);
			}
			else if (tag === 'verticalCenter') {
				this.setVerticalCenter(0);
			}
			else {
				this.selectedNodes.forEach((node: INode) => {
					if (node.getInstance() !== null) {
						node.setInstanceValue('y', 0);
					}
				});
			}

		}
		else if (tag === 'left' || tag === 'right' || tag === 'horizontalCenter') {
			this.setLeft(NaN);
			// node.setNumber('left', NaN);
			this.setRight(NaN);
			// node.setNumber('right', NaN);
			this.setHorizontalCenter(NaN);
			// node.setNumber('horizontalCenter', NaN);
			this.setX(NaN);
			// node.setNumber('x', NaN);
			if (tag === 'left') {
				this.setLeft(0);
			}
			else if (tag === 'right') {
				this.setRight(0);
				// node.setNumber(iconName, 0);
			}
			else if (tag === 'horizontalCenter') {
				this.setHorizontalCenter(0);
			}
			else {
				this.selectedNodes.forEach((node: INode) => {
					if (node.getInstance() !== null) {
						node.setInstanceValue('x', 0);
					}
				});
			}
		}
		else if (tag === 'leftAndRight') {
			this.setX(NaN);
			// node.setNumber('x', NaN);
			this.setWidth(NaN);
			// node.setNumber('width', NaN);
			this.setHorizontalCenter(NaN);
			// node.setNumber('horizontalCenter', NaN);
			this.setLeft(0);
			// node.setNumber('left', 0);
			this.setRight(0);
			// node.setNumber('right', 0);
		}
		else if (tag === 'topAndBottom') {
			this.setY(NaN);
			// node.setNumber('y', NaN);
			this.setHeight(NaN);
			// node.setNumber('height', NaN);
			this.setVerticalCenter(NaN);
			// node.setNumber('verticalCenter', NaN);
			this.setTop(0);
			// node.setNumber('top', 0);
			this.setBottom(0);
			// node.setNumber('bottom', 0);
		}
		else if (tag === 'all') {
			this.setX(NaN);
			// node.setNumber('x', NaN);
			this.setWidth(NaN);
			// node.setNumber('width', NaN);
			this.setHorizontalCenter(NaN);
			// node.setNumber('horizontalCenter', NaN);
			this.setLeft(0);
			// node.setNumber('left', 0);
			this.setRight(0);
			// node.setNumber('right', 0);
			this.setY(NaN);
			// node.setNumber('y', NaN);
			this.setHeight(NaN);
			// node.setNumber('height', NaN);
			this.setVerticalCenter(NaN);
			// node.setNumber('verticalCenter', NaN);
			this.setTop(0);
			// node.setNumber('top', 0);
			this.setBottom(0);
			// node.setNumber('bottom', 0);
		}
	}
	//-----------------------------设置约束 单控件
	public setRestraint(key: string, selected: boolean): void {
		if (this.selectedNodes.length === 0) {
			return;
		}
		let value = NaN;
		let node: INode;
		let parentWidth: number;
		let parentHeight: number;
		let widthValue: IValue;
		let heightValue: IValue;
		let xValue: IValue;
		let yValue: IValue;
		let leftValue: IValue;
		let rightValue: IValue;
		let hCValue: IValue;
		let topValue: IValue;
		let bottomValue: IValue;
		let vCValue: IValue;
		let AABB: Rectangle;

		for (let i = 0; i < this.selectedNodes.length; i++) {
			node = this.selectedNodes[i];
			const element = node.getInstance();
			if (!element || !element.parent) {
				continue;
				// return;
			}

			parentWidth = element.parent.width;
			parentHeight = element.parent.height;
			widthValue = node.getProperty('width');
			heightValue = node.getProperty('height');
			xValue = node.getProperty('x');
			yValue = node.getProperty('y');
			leftValue = node.getProperty('left');
			rightValue = node.getProperty('right');
			hCValue = node.getProperty('horizontalCenter');
			topValue = node.getProperty('top');
			bottomValue = node.getProperty('bottom');
			vCValue = node.getProperty('verticalCenter');
			switch (key) {
				case 'left':
					if (selected) {
						AABB = this.getAABB(element, element.parent);
						value = AABB.x;
						node.setNumber('left', value);
						node.setProperty('x', null);
						if (rightValue) {
							node.setProperty('width', null);
						}
					}
					else {
						if (rightValue) {
							node.setSize('width', element.width);
						}
						else if (!hCValue) {
							node.setNumber('x', element.x);
						}
						node.setProperty('left', null);
					}
					break;
				case 'horizontalCenter':
					if (selected) {
						AABB = this.getAABB(element, element.parent);
						value = AABB.x + AABB.width * 0.5 - parentWidth * 0.5;
						node.setNumber('horizontalCenter', value);
						node.setProperty('x', null);
					}
					else {
						if (!leftValue && !rightValue) {
							node.setNumber('x', element.x);
						}
						node.setProperty('horizontalCenter', null);
					}
					break;
				case 'right':
					if (selected) {
						AABB = this.getAABB(element, element.parent);
						value = parentWidth - AABB.x - AABB.width;
						node.setProperty('x', null);
						node.setNumber('right', value);
						if (leftValue) {
							node.setProperty('width', null);
						}
					}
					else {
						if (leftValue) {
							node.setSize('width', element.width);
						}
						else if (!hCValue) {
							node.setNumber('x', element.x);
						}
						node.setProperty('right', null);
					}
					break;
				case 'top':
					if (selected) {
						AABB = this.getAABB(element, element.parent);
						value = AABB.y;
						node.setNumber('top', value);
						node.setProperty('y', null);
						if (bottomValue) {
							node.setProperty('height', null);
						}
					}
					else {
						if (bottomValue) {
							node.setSize('height', element.height);
						}
						else if (!vCValue) {
							node.setNumber('y', element.y);
						}
						node.setProperty('top', null);
					}
					break;
				case 'verticalCenter':
					if (selected) {
						AABB = this.getAABB(element, element.parent);
						value = AABB.y + AABB.height * 0.5 - parentHeight * 0.5;
						node.setNumber('verticalCenter', value);
						node.setProperty('y', null);
					}
					else {
						if (!topValue && !bottomValue) {
							node.setNumber('y', element.y);
						}
						node.setProperty('verticalCenter', null);
					}
					break;
				case 'bottom':
					if (selected) {
						AABB = this.getAABB(element, element.parent);
						value = parentHeight - AABB.y - AABB.height;
						node.setProperty('y', null);
						node.setNumber('bottom', value);
						if (topValue) {
							node.setProperty('height', null);
						}
					}
					else {
						if (topValue) {
							node.setSize('height', element.height);
						}
						else if (!vCValue) {
							node.setNumber('y', element.y);
						}
						node.setProperty('bottom', null);
					}
					break;
			}
		}
	}

	private getAABB(target: egret.DisplayObject, host: egret.DisplayObject): Rectangle {
		let p1: egret.Point = target.localToGlobal(0, 0);
		let p2: egret.Point = target.localToGlobal(target.width, 0);
		let p3: egret.Point = target.localToGlobal(target.width, target.height);
		let p4: egret.Point = target.localToGlobal(0, target.height);
		p1 = host.globalToLocal(p1.x, p1.y);
		p2 = host.globalToLocal(p2.x, p2.y);
		p3 = host.globalToLocal(p3.x, p3.y);
		p4 = host.globalToLocal(p4.x, p4.y);

		let minx: number = p1.x;
		let maxx: number = p1.x;
		let miny: number = p1.y;
		let maxy: number = p1.y;
		[p2, p3, p4].forEach(element => {
			minx = Math.min(minx, element.x);
			maxx = Math.max(maxx, element.x);
			miny = Math.min(miny, element.y);
			maxy = Math.max(maxy, element.y);
		});
		const rect: Rectangle = new Rectangle(minx, miny, maxx - minx, maxy - miny);
		rect.x = Math.round(rect.x);
		rect.y = Math.round(rect.y);
		rect.width = Math.round(rect.width);
		rect.height = Math.round(rect.height);
		return rect;
	}



	/**
	 * 格式化
	 * @param text 
	 */
	public formatValue(text: string): number {
		const index = text.indexOf('%');
		let num: number;
		if (index === -1) {
			num = <any>text;
		}
		else {
			num = <any>text.substr(0, index);
		}
		if (isNaN(num))
		{ num = 0; }
		return num;
	}


	/**
	 * 选中的节点列表
	 */
	public selectedNodes: INode[] = [];
	private refreshAll(list: INode[]): void {
		this.selectedNodes = list;
		if (this.updateDisplay) {
			this.updateDisplay();
		}
	}

	/**
	 * 释放资源
	 */
	public destory(): void {
		this.selectedNodes = null;
		this._model = null;
		this.refresher.destory();
	}
}