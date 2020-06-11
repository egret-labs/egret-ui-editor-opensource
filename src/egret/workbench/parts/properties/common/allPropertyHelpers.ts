import { IObject, INode, isInstanceof, IValue } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { getSameKeyValue } from './properties';

/**
 * 类型
 */
export enum PropertyType {
	Boolean = 'boolean',
	String = 'string',
	Number = 'number',
	NumberWithPercent = 'numberWithPercent',
	Color = 'color',
	Any = 'any'
}

/**
 * 一个属性
 */
export interface IProperty {
	/** 属性名 */
	name: string;
	/** 当前值 */
	user: string;
	/** 用户设置值 */
	default: string;
	/** 属性类型 */
	type: PropertyType;
	/** 可用的值 */
	available: string[];
	/** 最小值 */
	minValue: number;
	/** 最大值 */
	maxValue: number;
	/** 步数 */
	step: number;
}

/**
 * 根据多个节点得到属性列表
 * @param node 
 */
export function getPropertiesByNodes(nodes: IObject[], model: IExmlModel): IProperty[] {
	const propertyMaps: { [name: string]: IProperty }[] = [];
	nodes.forEach(node => {
		const properties = getPropertiesByNode(node, model);
		propertyMaps.push(properties);
	});
	const targetMap = getSameKeyValue(propertyMaps) as { [name: string]: IProperty };
	const targetList: IProperty[] = [];
	for (const name in targetMap) {
		targetList.push(targetMap[name]);
	}
	targetList.sort((a, b) => {
		return a.name < b.name ? -1 : 1;
	});
	return targetList;
}



/**
 * 根据一个节点得到属性列表
 * @param node 
 */
function getPropertiesByNode(node: IObject, model: IExmlModel): { [name: string]: IProperty } {
	let propertyMap: { [name: string]: IProperty } = {};
	const className = model.getExmlConfig().getClassNameById(node.getName(), node.getNs());
	if (className) {
		propertyMap = getPropertyList(className, node, model);
	}
	return propertyMap;
}

const filterNames = ['accessibilityImplementation', 'accessibilityProperties',
	'blendShader', 'contextMenu', 'initialized', 'opaqueBackground', 'elementsContent',
	'owner', 'updateCompletePendingFlag', 'percentWidth', 'percentHeight', 'id', 'hashCode',
	'hasState', 'states', 'skinParts', 'matrix', 'parent', 'stage', 'textFlow', 'explicitHeight', 'explicitWidth', 'layout'];

const percentSupportProps = ['width', 'height', 'top', 'right', 'bottom', 'left', 'horizontalCenter', 'verticalCenter'];

const colorPropertyList = ['fillColor', 'strokeColor', 'textColor', 'backgroundColor', 'borderColor', 'promptColor'];

function getPropertyList(className: string, node: IObject, model: IExmlModel): { [name: string]: IProperty } {
	const propertyMap: { [name: string]: IProperty } = {};
	const property = model.getExmlConfig().getProjectConfig().getProps(className);
	property.forEach(p => {
		if (filterNames.indexOf(p.name) === -1) {
			let value = p.value;
			if (value == 'null') {
				value = '';
			} else if (value == '""') {
				value = '';
			} else if (value = '\'\'') {
				value = '';
			}
			if (!value && node.getInstance()) {
				const instanceValue = node.getInstance()[p.name];
				if (instanceValue != null) {
					value = instanceValue.toString();
				}
			}
			let minValue: number = null;
			let maxValue: number = null;
			let step: number = 0.1;
			let type: PropertyType = PropertyType.Any;
			if (percentSupportProps.indexOf(p.name) != -1) {
				type = PropertyType.NumberWithPercent;
				if (!value) {
					value = 'NaN';
				}
			} else if (colorPropertyList.indexOf(p.name) != -1) {
				type = PropertyType.Color;
			} else {
				if (p.type == 'string') {
					type = PropertyType.String;
				} else if (p.type == 'number') {
					type = PropertyType.Number;
					if (!value) {
						value = '0';
					}
					if (p.name == 'alpha') {
						minValue = 0;
						maxValue = 1;
						step = 0.01;
					}
				} else if (p.type == 'boolean') {
					type = PropertyType.Boolean;
					if (!value) {
						value = 'false';
					}
				}
			}
			const prop: IProperty = {
				name: p.name,
				user: null,
				default: value,
				type: type,
				available: p.available,
				minValue: minValue,
				maxValue: maxValue,
				step: step
			};
			let userValue: string = '';
			const valueUser = node.getProperty(p.name);
			if (valueUser) {
				if (isInstanceof(valueUser, 'eui.ILink')) {
					userValue = valueUser.toString();
				} else {
					const uvalue = valueUser.getInstance();
					if (p.type === 'egret.Rectangle') {
						if (typeof valueUser === 'string') {
							userValue = valueUser;
						} else {
							userValue = `${uvalue['x']},${uvalue['y']},${uvalue['width']},${uvalue['height']}`;
						}
					} else {
						userValue = uvalue.toString();
					}
				}
			}
			if (userValue) {
				prop.user = userValue;
			}
			propertyMap[prop.name] = prop;
		}
	});
	return propertyMap;
}