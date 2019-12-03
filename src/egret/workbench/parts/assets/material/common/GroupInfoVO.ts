import {ResInfoVO} from './ResInfoVO';
/**
 * 组的资源包
 *
 */
export class GroupInfoVO  {
	// 资源组名字
	public groupName: string = '';
	private _childList: Array<ResInfoVO>;

	//是否重名
	public isSameName: boolean = false;

	public constructor() {
		this._childList = new Array<ResInfoVO>();
	}

	/**
	 * 组 childList
	 */
	public get childList(): Array<ResInfoVO> {
		return this._childList;
	}
	/**
	 * 添加一个资源包
	 * @param resInfoVO
	 *
	 */
	public addResInfoVO(resInfoVO: ResInfoVO):boolean {
		let has: boolean = false;
		for (let i: number = 0; i < this._childList.length; i++) {
			if (this._childList[i] === resInfoVO) {
				has = true;
				break;
			}
		}
		if (has === false) {
			this._childList.push(resInfoVO);
		}
		return has;
	}
	/**
	 * 移除一个资源包
	 * @param url
	 *
	 */
	public removeResInfoVO(resInfoVO: ResInfoVO) {
		const index: number = this._childList.indexOf(resInfoVO);
		if (index !== -1) {
			this._childList.splice(index, 1);
		}
	}

	/**
	 * 释放资源
	 */
	public dispose() {
		while (this._childList.length > 0) {
			this._childList.pop();
		}
		this._childList = null;
	}
}