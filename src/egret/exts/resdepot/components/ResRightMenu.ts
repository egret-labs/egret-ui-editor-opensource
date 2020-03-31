import {shell} from 'electron';
import platform = require('vs/base/common/platform');
import paths = require('egret/base/common/paths');

import {ResInfoVO} from 'egret/exts/resdepot/common/model/ResInfoVO';
import {IResEventService} from 'egret/exts/resdepot/events/ResEventService';
import {ResGlobalEvents} from 'egret/exts/resdepot/events/ResGlobalEvents';
import { localize } from 'egret/base/localization/nls';

/**
 * 右键的基类和定义
 */
export class ResRightMenu extends egret.HashObject {
	/**
	 * 右键的显示项
	 */
	public static LABELS: {
		SCALE9_GRID: string,
		FRESH_SHEET: string,
		DELETE_RES: string,
		DELETE_GROUP: string,
		REMOVE_RES: string,
		OPEN_IN_FOLDER: string
	} = {
		SCALE9_GRID: localize('res.editor.editScale9Grid','Edit Scale9Grid') ,
		FRESH_SHEET:localize('res.editor.refreshSheet','Refresh Sheet'),
		DELETE_RES: localize('res.editor.deleteResource','Delete Resource'),
		DELETE_GROUP:localize('res.editor.deleteResourceGroup','Delete Resource Group'),
		REMOVE_RES:localize('res.editor.removeResource','Remove Resource'),//组内的移除资源
		OPEN_IN_FOLDER: localize('res.editor.displayInManager','Display in resource manager')
	};

	public static IDS: {
		DELETE_RES: string,
		SCALE9_GRID: string,
		FRESH_SHEET: string,
		DELETE_GROUP: string,
		REMOVE_RES: string,
		OPEN_IN_FOLDER: string
	} = {
		DELETE_RES: 'DELETE_RES',
		SCALE9_GRID: 'SCALE9_GRID',
		FRESH_SHEET: 'FRESH_SHEET',
		DELETE_GROUP: 'DELETE_GROUP',
		REMOVE_RES: 'REMOVE_RES',
		OPEN_IN_FOLDER: 'OPEN_IN_FOLDER'
	};

	public rightMenu: egret.NativeMenu = new egret.NativeMenu();
	public data: any;
	public static resourceRoot: string;

	constructor(labels?: string | string[], ids?: string | string[], type: string = 'default', private owner?: any) {
		super();
		ResRightMenu.LABELS.OPEN_IN_FOLDER = platform.isWindows ? localize('res.editor.revealInWindows', 'Reveal in Explorer') : (platform.isMacintosh ? localize('res.editor.revealInMac', 'Reveal in Finder') : localize('res.editor.openContainer', 'Open Containing Folder'));
		this.showMenu(labels, ids, type);
	}
	/**
	 * 显示这几项
	 * @param labels ResRightMenu.LABELS中取值
	 * @param ids ResRightMenu.IDS中取值
	 */
	public showMenu(labels: string | string[], ids: string | string[], type: string = 'default') {
		this.rightMenu.removeAllItems();
		if (!labels || !labels.length || !ids || !ids.length) {
			return;
		}
		if (typeof labels === 'string' && typeof ids === 'string') {//一个菜单项
			this.addRightMenuItem(labels, ids, type);
		} else if (labels instanceof Array && ids instanceof Array) {//多项菜单
			if (labels.length !== ids.length) {//多项菜单这两个数组必须一样长
				return;
			}
			for (let i: number = 0; i < labels.length; i++) {
				this.addRightMenuItem(labels[i], ids[i], type);
			}
		}
	}

	protected addRightMenuItem(label: string, id?: string, type: string = ''): void {
		var item: egret.NativeMenuItem;
		if (label === '') {
			item = new egret.NativeMenuItem(label, true);
			item.data = { type: type };
			this.rightMenu.addItem(item);
		} else {
			item = new egret.NativeMenuItem(label);
			item.data = { id: id, type: type };
			this.rightMenu.addItem(item);
			item.addEventListener(egret.Event.SELECT, this.rightMenuItemSelectHandler, this);
		}
	}
	/**
	 * 返回当前数据中的ResInfoVO数据
	 */
	private getResVO = (): ResInfoVO => {
		let resvo: ResInfoVO;
		if (!this.data) {
			resvo = null;
		} else if (this.data instanceof ResInfoVO) {
			resvo = this.data;
		} else if (this.data.resvo instanceof ResInfoVO) {
			resvo = this.data.resvo;
		}
		return resvo;
	}

	public setResEventService(service: IResEventService): void {
		this._resEventService = service;
	}

	private _resEventService: IResEventService;
	private get resEventService(): IResEventService {
		return this._resEventService;
	}

	protected rightMenuItemSelectHandler(event: egret.Event): void {
		switch (event.target.data.id) {
			case ResRightMenu.IDS.DELETE_RES:
				this.resEventService.sendEvent(ResGlobalEvents.DELETE_RES_IN_TREE, this.data);
				break;
			case ResRightMenu.IDS.FRESH_SHEET:
				this.resEventService.sendEvent(ResGlobalEvents.TO_FRESH_SUBKEY, this.getResVO());
				break;
			case ResRightMenu.IDS.SCALE9_GRID:
				this.resEventService.sendEvent(ResGlobalEvents.OPEN_SCALE9_VIEW, this.getResVO());
				break;
			case ResRightMenu.IDS.DELETE_GROUP:
				this.resEventService.sendEvent(ResGlobalEvents.DELETE_GROUP, this.data.info);
				break;
			case ResRightMenu.IDS.REMOVE_RES:
				this.resEventService.sendEvent(ResGlobalEvents.DELETE_RES_IN_GROUP_GRID, this.data.info);
				break;
			case ResRightMenu.IDS.OPEN_IN_FOLDER:
				let fspath: string = '';
				if (this.data.info instanceof ResInfoVO) {
					fspath = this.data.info.url;
				} else if (this.data.resvo instanceof ResInfoVO) {
					fspath = this.data.resvo.url;
				} else {//打开文件夹，路径拼接
					let pathRoat: string[] = [this.data.label];
					let temp = this.data.parent;
					while (temp && temp.label) {
						pathRoat.unshift(temp.label);
						temp = temp.parent;
					}
					for (let i: number = 0; i < pathRoat.length; i++) {
						fspath = paths.join(fspath, pathRoat[i]);
					}
					fspath = paths.join(ResRightMenu.resourceRoot, fspath);
				}
				if (fspath) {
					shell.showItemInFolder(paths.normalize(fspath, true));
				}
				break;
			default:
				break;
		}
	}
}