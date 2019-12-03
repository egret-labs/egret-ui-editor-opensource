import * as fs from 'fs';
import { ResInfoVO } from 'egret/workbench/parts/assets/material/common/ResInfoVO';
import { GroupInfoVO } from 'egret/workbench/parts/assets/material/common/GroupInfoVO';
import { ResType } from 'egret/workbench/parts/assets/material/common/ResType';

/**
 * res config 配置
 */
export class ResConfig {

	public static _instance: ResConfig;

	/**
	 * 实例
	 */
	public static get instance(): ResConfig {
		if (!ResConfig._instance) {
			ResConfig._instance = new ResConfig();
		}
		return ResConfig._instance;
	}

		/**
	 * 检查重名。其中会比对所有res的名字以及sheet的subkeys。
	 * subkey与resname重名也属于重名，引擎按照res.json的先后顺序读取资源项，并保留最先解析到的resname项。
	 */
	public checkSame(resList: Array<ResInfoVO>) {
		// var time: number = egret.getTimer();
		const m: Map<any,any> = new Map();
		for (let i: number = 0; i < resList.length; i++) {
			resList[i].isSameName = false;
		
			if (m.get(resList[i].name)) {
				m.get(resList[i].name).isSameName = true;
				resList[i].isSameName = true;
			} else {
				m.set(resList[i].name, resList[i]);
			}
			if (resList[i].subList) {
				for (let k: number = 0; k < resList[i].subList.length; k++) {
					resList[i].subList[k].isSameName = false;
					if (m.get(resList[i].subList[k].name)) {
						m.get(resList[i].subList[k].name).isSameName = true;
						resList[i].subList[k].isSameName = true;
					} else {
						m.set(resList[i].subList[k].name, resList[i].subList[k]);
					}
				}
			}
		}
		// console.log('检查资源重名' + resList.length + '个，二级Key重名' + subList.length + '个，耗时' + (egret.getTimer() - time) + '毫秒');
	}


		/**
	 * 检查组的重名
	 * @param groupList
	 *
	 */
	public checkGroupSameName(groupList: Array<GroupInfoVO>) {
		// var time: number = egret.getTimer();
		const mapForGroup: Map<any,any> = new Map();
		for (let i: number = 0; i < groupList.length; i++) {
			groupList[i].isSameName = false;
			if (mapForGroup.get(groupList[i].groupName)) {
				(<GroupInfoVO>(mapForGroup.get(groupList[i].groupName))).isSameName = true;
				groupList[i].isSameName = true;
			} else {
				mapForGroup.set(groupList[i].groupName, groupList[i]);
			}
		}
		// console.log('检查组重名' + groupList.length + '个，耗时' + (egret.getTimer() - time) + '毫秒');
	}


	/**
	 * 检查附加项的错误，目前支持：图片九宫格、声音类型
	 * @param resList
	 */
	public checkOtherError(resList: Array<ResInfoVO>) {
		// var time: number = egret.getTimer();
		// var reg: RegExp = /\[([0-9]*)\,([0-9]*)\,([0-9]*)\,([0-9]*)\]/;
		for (let i: number = 0; i < resList.length; i++) {
			resList[i].otherError = false;
			if (resList[i].type === ResType.TYPE_IMAGE && resList[i].other.length > 0) {
				const scaleArr: Array<any> = resList[i].other.split(',');
				if (scaleArr.length === 4) {
					const x: number = parseInt(scaleArr[0]);
					const y: number = parseInt(scaleArr[1]);
					const w: number = parseInt(scaleArr[2]);
					const h: number = parseInt(scaleArr[3]);
					resList[i].x = x;
					resList[i].y = y;
					resList[i].w = w;
					resList[i].h = h;
					resList[i].other = '' + x + ',' + y + ',' + w + ',' + h + '';
					resList[i].otherError = false;
				} else {
					resList[i].otherError = true;
				}
			} else if (resList[i].type === ResType.TYPE_SOUND) {
				const soundTypes: Array<any> = ResType.SOUND_TYPE;
				let isError: boolean = true;
				if (!resList[i].other) {
					isError = false;
				}
				else {
					for (let j: number = 0; j < soundTypes.length; j++) {
						if (soundTypes[j] === resList[i].other) {
							isError = false;
							break;
						}
					}
				}
				resList[i].otherError = isError;
			} else {
				resList[i].x = 0;
				resList[i].y = 0;
				resList[i].w = 0;
				resList[i].h = 0;
				resList[i].other = '';
			}
		}
		// console.log('检查附加项' + resList.length + '个，耗时' + (egret.getTimer() - time) + '毫秒');
	}

	/**
	 * 检测资源是否存在
	 * @param reslist
	 */
	public checkResExist(resList: ResInfoVO[]): Promise<void> {
		if (!resList.length) {
			return Promise.resolve(null);
		} else {
			const tasks: Promise<void>[] = [];
			// for (let i: number = 0; i < resList.length; i++) {
			// 	let vo = resList[i];
			// 	let task = fs.exists(vo.locolUrl,result => {
			// 		vo.fileError = !result;
			// 		if (!vo.fileError) {
			// 			if (vo.type === ResType.TYPE_SHEET && !vo.subList) {
			// 				vo.fileError = true;//解析失败，subList
			// 			}
			// 		}
			// 	});
			// 	tasks.push(task);
			// }
			// return Promise.all(tasks).then(() => {
				return Promise.resolve(null);
			// });
		}
	}
}