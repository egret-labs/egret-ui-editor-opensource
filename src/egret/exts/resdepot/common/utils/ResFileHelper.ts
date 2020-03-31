import { GroupInfoVO } from 'egret/exts/resdepot/common/model/GroupInfoVO';
import { ResInfoVO } from 'egret/exts/resdepot/common/model/ResInfoVO';
import { ResType } from 'egret/exts/resdepot/common/consts/ResType';
import { SheetSubVO } from 'egret/exts/resdepot/common/model/SheetSubVO';

/**
 * 资源json文件的操作类。
 *
 */
export class ResFileHelper {
	/**
	 * 导出一个json
	 * @param resList
	 * @param groupList
	 * @return
	 */
	public static exportJson(resList: Array<ResInfoVO>, groupList: Array<GroupInfoVO>): string {
		var jsonObject: any = ResFileHelper.exportJsonObject(resList, groupList);
		var json: string = JSON.stringify(jsonObject, null, '\t');
		return json;
	}
	/**
	 * 导出一个json
	 * @param resList
	 * @param groupList
	 * @return
	 */
	public static exportJsonObject(resList: Array<ResInfoVO>, groupList: Array<GroupInfoVO>): any {
		var resArr: Array<any> = [];
		var j: number = 0;
		for (var i: number = 0; i < resList.length; i++) {
			var url: string = resList[i].showUrl;
			url = url.replace(/\\/g, '/');
			if (url.charAt(0) === '/') {
				url = url.slice(1, url.length);
			}
			var resObj: any;
			if (resList[i].type === 'image' && (resList[i].x !== 0 || resList[i].y !== 0 || resList[i].w !== 0 || resList[i].h !== 0)) {
				resObj = { url: url, type: resList[i].type, name: resList[i].name, scale9grid: resList[i].x + ',' + resList[i].y + ',' + resList[i].w + ',' + resList[i].h };
			} else if (resList[i].type === 'sound' && resList[i].other) {
				resObj = { url: url, type: resList[i].type, name: resList[i].name, soundType: resList[i].other };
			} else {
				resObj = { url: url, type: resList[i].type, name: resList[i].name };
			}
			if (resList[i].type === ResType.TYPE_SHEET) {
				if (resList[i].subList) {
					var subkeys: string = '';
					for (j = 0; j < resList[i].subList.length; j++) {
						subkeys += resList[i].subList[j].name + ',';
					}
					if (subkeys.charAt(subkeys.length - 1) === ',') {
						subkeys = subkeys.slice(0, subkeys.length - 1);
					}
					resObj['subkeys'] = subkeys;
				}
			}
			resArr.push(resObj);
		}
		var groupArr: Array<any> = [];
		for (i = 0; i < groupList.length; i++) {
			var tmpKeys: string = '';
			for (j = 0; j < groupList[i].childList.length; j++) {
				tmpKeys += groupList[i].childList[j].name + ',';
			}
			if (tmpKeys.length > 0) {
				tmpKeys = tmpKeys.slice(0, tmpKeys.length - 1);
			}
			var groupObj: any = { keys: tmpKeys, name: groupList[i].groupName };
			groupArr.push(groupObj);
		}
		var jsonObject: any = { groups: groupArr, resources: resArr };
		return jsonObject;
	}

	public static importJson(json: string): { resList: Array<ResInfoVO>, groupList: Array<GroupInfoVO>, groupDuplicate: boolean } {
		try {
			var jsonObj: any = JSON.parse(json);
			return ResFileHelper.importJsonData(jsonObj);
		} catch (err) {
			console.error(err);
		}
		return null;
	}
	/**
	 * 导入一个json数据
	 * @param jsonObj
	 * @return
	 *
	 */
	public static importJsonData(jsonObj: any): { resList: Array<ResInfoVO>, groupList: Array<GroupInfoVO>, groupDuplicate: boolean } {
		var obj: any;
		var resArr: Array<any> = jsonObj.resources;
		var groupArr: Array<any> = jsonObj.groups;
		if (!resArr || !resArr.length) {
			resArr = [];
		}
		if (!groupArr || !groupArr.length) {
			groupArr = [];
		}
		var resList: Array<ResInfoVO> = [];
		var groupList: Array<GroupInfoVO> = [];
		var j: number = 0;
		for (var i: number = 0; i < resArr.length; i++) {
			var resInfoVO: ResInfoVO = new ResInfoVO();
			resInfoVO.name = resArr[i].name;
			resInfoVO.showUrl = resArr[i].url;
			resInfoVO.type = resArr[i].type;
			if (resArr[i].scale9grid && resArr[i].type === 'image') {
				var scale9grid: Array<any> = resArr[i].scale9grid.split(',');
				resInfoVO.x = parseInt(scale9grid[0]);
				resInfoVO.y = parseInt(scale9grid[1]);
				resInfoVO.w = parseInt(scale9grid[2]);
				resInfoVO.h = parseInt(scale9grid[3]);
				resInfoVO.other = '' + resArr[i].scale9grid + '';
			}
			if (resArr[i].soundType && resArr[i].type === 'sound') {
				resInfoVO.other = resArr[i].soundType;
			}
			if (resArr[i].subkeys && resArr[i].type === 'sheet') {
				var subkeys: string = resArr[i].subkeys;
				var subkeyArr: Array<any> = subkeys.split(',');
				var subList: Array<SheetSubVO> = new Array<SheetSubVO>();
				for (j = 0; j < subkeyArr.length; j++) {
					var subVO: SheetSubVO = new SheetSubVO();
					subVO.isSameName = false;
					subVO.name = subkeyArr[j];
					subList.push(subVO);
				}
				resInfoVO.subList = subList;
			}
			resList.push(resInfoVO);
		}
		let groupDuplicate: boolean = false;//组内是否有重复资源，有的话需要重新保存res.json
		for (i = 0; i < groupArr.length; i++) {
			var groupInfoVO: GroupInfoVO = new GroupInfoVO();
			groupInfoVO.groupName = groupArr[i].name;
			var keyList: string = groupArr[i].keys;
			var keyArr: Array<any> = keyList.split(',');
			for (j = 0; j < keyArr.length; j++) {
				var key: string = keyArr[j];
				for (var k: number = 0; k < resList.length; k++) {
					if (resList[k].name === key) {
						if (groupInfoVO.addResInfoVO(resList[k])) {
							groupDuplicate = true;//剔除重复的key
						}
						break;
					}
				}
			}
			groupList.push(groupInfoVO);
		}
		obj = { resList: resList, groupList: groupList, groupDuplicate: groupDuplicate };
		return obj;
	}

	public static importJsonNew(json: string): any {
		try {
			var jsonObj: any = JSON.parse(json);
			var resList: ResInfoVO[] = [];
			var resources = jsonObj['resources'];
			ResFileHelper.importJsonDataNew(resources, resList);
			return { resList: resList, groupList: [], groupDuplicate: false };
		} catch (err) {
			console.error(err);
		}
		return null;
	}

	/**
	 * 导入一个json数据
	 * @param jsonObj
	 * @return
	 */
	public static importJsonDataNew(jsonObj: any, resList: ResInfoVO[]): void {
		for (var key in jsonObj) {
			var data = jsonObj[key];
			if ('url' in data && 'name' in data && 'type' in data) {
				var resInfoVO: ResInfoVO = new ResInfoVO();
				resInfoVO.name = data['name'];
				resInfoVO.showUrl = data['url'];
				resInfoVO.type = data['type'];
				resList.push(resInfoVO);
			} else {
				ResFileHelper.importJsonDataNew(data, resList);
			}
		}
	}
}