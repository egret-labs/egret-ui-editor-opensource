import {GroupInfoVO} from 'egret/exts/resdepot/common/model/GroupInfoVO';
import {ResInfoVO} from 'egret/exts/resdepot/common/model/ResInfoVO';

export class ResPanelUtil extends egret.HashObject {
	/**
	 * 通过一个组信息创建一个给列表用的对象
	 * @param groupInfoVO
	 * @return
	 *
	 */
	public static createObjForGroupGrid(groupInfoVO: GroupInfoVO): any {
		var obj: any = {
			'groupName': groupInfoVO.groupName,
			'info': groupInfoVO,
			'error': groupInfoVO.isSameName,
			'fileErrorNum':0
		};
		return obj;
	}
	/**
	 * 通过一个资源信息创建一个给列表用的对象
	 * @param resInfoVO
	 * @return
	 *
	 */
	public static createObjForResGrid(resInfoVO: ResInfoVO): any {
		var obj: any = {
			'itemName': resInfoVO.name,
			'itemUrl': resInfoVO.showUrl,
			'other': resInfoVO.other,
			'otherError': resInfoVO.otherError,
			'subkeys': resInfoVO.subList,
			'info': resInfoVO,
			'error': resInfoVO.isSameName,
			'itemType': resInfoVO.type
		};
		return obj;
	}
	/**
	 * 通过groupInfo更新一个obj
	 * @param obj
	 * @param groupInfoVO
	 *
	 */
	public static updateObjForGroupGrid(obj: any, groupInfoVO: GroupInfoVO) {
		obj.groupName = groupInfoVO.groupName;
		obj.info = groupInfoVO;
		obj.error = groupInfoVO.isSameName;
	}
	/**
	 * 通过resInfo更新一个obj
	 * @param obj
	 * @param resInfoVO
	 *
	 */
	public static updateObjForResGrid(obj: any, resInfoVO: ResInfoVO) {
		if(!resInfoVO){
			debugger;
		}
		obj.itemName = resInfoVO.name;
		obj.itemUrl = resInfoVO.showUrl;
		obj.other = resInfoVO.other;
		obj.otherError = resInfoVO.otherError;
		obj.subkeys = resInfoVO.subList;
		obj.info = resInfoVO;
		obj.error = resInfoVO.isSameName;
		obj.itemType = resInfoVO.type;
	}
}