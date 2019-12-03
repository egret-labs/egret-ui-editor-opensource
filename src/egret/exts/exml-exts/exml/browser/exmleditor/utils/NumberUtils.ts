var egret_sin_map = {};
var egret_cos_map = {};
var DEG_TO_RAD = Math.PI / 180;
for (var NumberUtils_i = 0; NumberUtils_i < 360; NumberUtils_i++) {
	egret_sin_map[NumberUtils_i] = Math.sin(NumberUtils_i * DEG_TO_RAD);
	egret_cos_map[NumberUtils_i] = Math.cos(NumberUtils_i * DEG_TO_RAD);
}
egret_sin_map[90] = 1;
egret_cos_map[90] = 0;
egret_sin_map[180] = 0;
egret_cos_map[180] = -1;
egret_sin_map[270] = -1;
egret_cos_map[270] = 0;
export class NumberUtils {
	/**
	 * @language en_US
	 * Judge whether it is a numerical value
	 * @param value Parameter that needs to be judged
	 * @returns
	 * @version Egret 2.4
	 * @platform Web,Native
	 */
	/**
	 * @language zh_CN
	 * 判断是否是数值
	 * @param value 需要判断的参数
	 * @returns
	 * @version Egret 2.4
	 * @platform Web,Native
	 */
	public static isNumber(value) {
		return typeof (value) === "number" && !isNaN(value);
	};
	/**
	 * @language en_US
	 * Obtain the approximate sin value of the corresponding angle value
	 * @param value {number} Angle value
	 * @returns {number} sin value
	 * @version Egret 2.4
	 * @platform Web,Native
	 */
	/**
	 * @language zh_CN
	 * 得到对应角度值的sin近似值
	 * @param value {number} 角度值
	 * @returns {number} sin值
	 * @version Egret 2.4
	 * @platform Web,Native
	 */
	public static sin(value) {
		var valueFloor = Math.floor(value);
		var valueCeil = valueFloor + 1;
		var resultFloor = NumberUtils.sinInt(valueFloor);
		if (valueFloor == value) {
			return resultFloor;
		}
		var resultCeil = NumberUtils.sinInt(valueCeil);
		return (value - valueFloor) * resultCeil + (valueCeil - value) * resultFloor;
	};
	/**
	 * @private
	 *
	 * @param value
	 * @returns
	 */
	public static sinInt(value) {
		value = value % 360;
		if (value < 0) {
			value += 360;
		}
		return egret_sin_map[value];
	};
	/**
	 * @language en_US
	 * Obtain the approximate cos value of the corresponding angle value
	 * @param value {number} Angle value
	 * @returns {number} cos value
	 * @version Egret 2.4
	 * @platform Web,Native
	 */
	/**
	 * @language zh_CN
	 * 得到对应角度值的cos近似值
	 * @param value {number} 角度值
	 * @returns {number} cos值
	 * @version Egret 2.4
	 * @platform Web,Native
	 */
	public static cos(value) {
		var valueFloor = Math.floor(value);
		var valueCeil = valueFloor + 1;
		var resultFloor = NumberUtils.cosInt(valueFloor);
		if (valueFloor == value) {
			return resultFloor;
		}
		var resultCeil = NumberUtils.cosInt(valueCeil);
		return (value - valueFloor) * resultCeil + (valueCeil - value) * resultFloor;
	};
	/**
	 * @private
	 *
	 * @param value
	 * @returns
	 */
	public static cosInt(value) {
		value = value % 360;
		if (value < 0) {
			value += 360;
		}
		return egret_cos_map[value];
	};
}