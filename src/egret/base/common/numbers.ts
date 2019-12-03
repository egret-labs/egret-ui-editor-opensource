
'use strict';
/**
 * @description 判断点是否在矩形范围内
 * @param x 点x坐标
 * @param y 点y坐标
 * @param rectX 矩形左下x坐标
 * @param rectY 矩形左下y坐标
 * @param width 矩形宽度
 * @param height 矩形高度
 */
export function pointInRect(x: number, y: number, rectX: number, rectY: number, width: number, height: number): boolean {
	return ((x >= rectX) && (x <= (rectX + width)) && (y <= rectY) && (y >= (rectY - height)));
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export function rot(index: number, modulo: number): number {
	return (modulo + (index % modulo)) % modulo;
}

export function sin(value: number): number {
	const valueFloor = Math.floor(value);
	const valueCeil = valueFloor + 1;
	const resultFloor = sinInt(valueFloor);
	if (valueFloor == value) {
		return resultFloor;
	}
	const resultCeil = sinInt(valueCeil);
	return (value - valueFloor) * resultCeil + (valueCeil - value) * resultFloor;
}
export function sinInt(value: number): number {
	value = value % 360;
	if (value < 0) {
		value += 360;
	}
	return Math.sin(value);
}
export function cos(value: number): number {
	const valueFloor = Math.floor(value);
	const valueCeil = valueFloor + 1;
	const resultFloor = cosInt(valueFloor);
	if (valueFloor == value) {
		return resultFloor;
	}
	const resultCeil = cosInt(valueCeil);
	return (value - valueFloor) * resultCeil + (valueCeil - value) * resultFloor;
}
export function cosInt(value: number): number {
	value = value % 360;
	if (value < 0) {
		value += 360;
	}
	return Math.cos(value);
}