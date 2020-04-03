import {Shortcut} from './Shortcut';
import {ShortcutType} from './ShortcutType';

import types = require('vs/base/common/types');
import { isMacintosh } from 'egret/base/common/platform';

/**
 * 快捷键管理工具
 */
export class ShortcutManager extends egret.HashObject {
	public constructor(){
		super();
	}

	public static initialized:boolean;
	public static initialize(stage:egret.Stage){
		if(ShortcutManager.initialized){
			return ;
		}
		ShortcutManager.initialized = true;
		Shortcut.initialize(stage);
		ShortcutManager.refreshConfig();
	}

	protected static onPropertyChange(event:eui.PropertyChangeEvent){
		if(event.property === 'shortcutMap'){
			ShortcutManager.refreshConfig();
		}
	}
	/**
	 * 刷新配置
	 */
	public static refreshConfig(){
		Shortcut.removeAllBinding();
		Shortcut.addBindindBatch(ShortcutManager.currentShortcut);
	}
	/**
	 * 获取当前的快捷键配置
	 */
	public static get currentShortcut():any{
		var currentMap:any = ShortcutManager.defaultShortcut;
		return currentMap;
	}
	/**
	 * 获取默认配置
	 */
	public static get defaultShortcut():any{
		if(isMacintosh){/// 判断系统 isMacintosh
			return ShortcutManager.defaultMacShortcut;
		}
		else{
			return ShortcutManager.defaultWinShortcut;
		}
	}
	/**
	 * 获取Windows下默认的快捷键配置
	 */
	private static get defaultWinShortcut():any {
		var config:any = {};
		config[ShortcutType.SAVE] = [egret.Keyboard.S, egret.Keyboard.CONTROL];
		config[ShortcutType.SAVE_AS] = [egret.Keyboard.S, egret.Keyboard.CONTROL, egret.Keyboard.SHIFT];
		config[ShortcutType.SELECT_ALL] = [egret.Keyboard.A, egret.Keyboard.CONTROL];
		config[ShortcutType.OPEN] = [egret.Keyboard.O, egret.Keyboard.CONTROL];
		config[ShortcutType.NEW] = [egret.Keyboard.N, egret.Keyboard.CONTROL];
		config[ShortcutType.SEARCH] = [egret.Keyboard.F, egret.Keyboard.CONTROL];
		config[ShortcutType.ROOT] = [egret.Keyboard.R, egret.Keyboard.CONTROL];
		config[ShortcutType.DELETE] = [[egret.Keyboard.BACKSPACE],[egret.Keyboard.DELETE]];
		config[ShortcutType.NEW_GROUP] = [egret.Keyboard.N, egret.Keyboard.CONTROL, egret.Keyboard.SHIFT];
		return config;
	}
	/**
	 * 获取Mac下默认的快捷键配置
	 */
	private static get defaultMacShortcut():any  {
		var config:any = ShortcutManager.defaultWinShortcut;
		config[ShortcutType.SAVE] = [egret.Keyboard.S, egret.Keyboard.CONTROL];
		config[ShortcutType.SAVE_AS] = [egret.Keyboard.S, egret.Keyboard.CONTROL, egret.Keyboard.SHIFT];
		config[ShortcutType.SELECT_ALL] = [egret.Keyboard.A, egret.Keyboard.CONTROL];
		config[ShortcutType.OPEN] = [egret.Keyboard.O, egret.Keyboard.CONTROL];
		config[ShortcutType.NEW] = [egret.Keyboard.N, egret.Keyboard.CONTROL];
		config[ShortcutType.SEARCH] = [egret.Keyboard.F, egret.Keyboard.CONTROL];
		config[ShortcutType.ROOT] = [egret.Keyboard.R, egret.Keyboard.CONTROL];
		config[ShortcutType.DELETE] = [[egret.Keyboard.BACKSPACE],[egret.Keyboard.DELETE]];
		config[ShortcutType.NEW_GROUP] = [egret.Keyboard.N, egret.Keyboard.CONTROL, egret.Keyboard.SHIFT];
		config[ShortcutType.EXIT] = [egret.Keyboard.Q, egret.Keyboard.COMMAND];
		ShortcutManager.control2Command(config);
		return config;
	}

	/**
	 * 将所有的Ctrl键值转换为Command键值
	 */
	private static control2Command(config:any) {
		var convert:Function = function (arr:Array<any>) {
			for(var i in arr) {
				if(types.isArray(arr[i])){
					convert(arr[i]);
				}
				else if(arr[i] === egret.Keyboard.CONTROL){
					arr[i] = egret.Keyboard.COMMAND;
				}
			}
		};
		for(var keyCodes_key_a in config){
			var keyCodes:Array<any> = config[keyCodes_key_a];
			convert(keyCodes);
		}
	}
}

ShortcutManager.initialized = false;
