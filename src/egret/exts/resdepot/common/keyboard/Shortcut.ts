import types = require('vs/base/common/types');

/**
 * 快捷键管理类， 执行initialize初始化一个全局管理。
 * <br>使用 addBinding 添加一个事件类型 与 按键的绑定
 * <br>使用 addRegister 注册一个监听对象
 * <br>下面是一个简单的使用例子
 * <code>
 *	<br>Shortcut.addBinding('example' , [Keyboard.S , Keyboard.CONTROL]);
 *	<br>Shortcut.addRegister(this , 'example' , onSave);
 * </code>
 */
export class Shortcut extends egret.HashObject {

	public constructor(stage: egret.Stage) {
		super();
		stage.addEventListener(egret.KeyboardEvent.KEY_DOWN, this.onStageKeyDown, this, true, 2000);
		stage.addEventListener(egret.KeyboardEvent.KEY_UP, this.onStageKeyUp, this, true, 2000);
		stage.addEventListener(egret.FocusEvent.FOCUS_OUT, this.onDeactive, this);
	}

	public static instance: Shortcut;
	public static initialize(stage: egret.Stage) {
		if (Shortcut.instance){
			return;
		}
		Shortcut.instance = new Shortcut(stage);
	}

	public static addRegister(target: egret.DisplayObject, type: string, callBack: Function) {
		Shortcut.instance.addRegister(target, type, callBack);
	}

	public static removeRegister(target: egret.DisplayObject, type: string, callBack: Function) {
		Shortcut.instance.removeRegister(target, type, callBack);
	}
	/**
	 * 移除一个对象所有注册的快捷键
	 */
	public static removeTargetRegister(target: egret.DisplayObject) {
		if (Shortcut.instance.targetDic.getItem(target)) {
			var shortcutMapList: Array<any> = <any>Shortcut.instance.targetDic.getItem(target);
			for (var shortcutMap_key_a in shortcutMapList) {
				var shortcutMap: ShortcutMap = shortcutMapList[shortcutMap_key_a];
				Shortcut.instance.removeRegister(target, shortcutMap.type, shortcutMap.callBack);
			}
		}
	}

	public static addBinding(type: string, keyCodeValue: Array<any>) {
		Shortcut.instance.addBinding(type, keyCodeValue);
	}
	/**
	 * 批量添加绑定事件类型 与 按键值的映射
	 * @param data 数据中的每一项格式参照addBinding方法中的参数
	 */
	public static addBindindBatch(data: any) {
		for (var key in data) {
			Shortcut.instance.addBinding(key, data[key]);
		}
	}

	public static removeBinding(type: string) {
		Shortcut.instance.removeBinding(type);
	}
	/**
	 * 移除所有的事件类型
	 */
	public static removeAllBinding() {
		Shortcut.instance.bindingDic = new egret.Dictionary();
	}
	/**
	 * 判断指定键是否按下
	 */
	public static isKeyDown(keyCode: number): boolean {
		return Shortcut.instance.isKeyDown(keyCode);
	}

	/**
	 * 传入一个键盘事件，检测是否符合某一个快捷键，如果符合，则返回这个快捷键的key
	 * @param event
	 * @return
	 *
	 */
	public static test(event: egret.KeyboardEvent): string {
		return Shortcut.instance.test(event);
	}
	//======================== 快捷键相关=====================start=======================

	/**
	 * 监听快捷键的对象 与 持有的注册列表字典
	 */
	private targetDic: egret.Dictionary = new egret.Dictionary(true);
	/**
	 * 事件类型 与 具体按键值的关系映射表
	 */
	private bindingDic: egret.Dictionary = new egret.Dictionary();
	/**
	 * 注册一个监听对象
	 * @param target 监听事件的目标对象
	 * @param type 按键要触发的事件类型
	 * @param callBack 回调函数示例：不含参数 callBack():void
	 * 带一个参数callBack(type:String):void, 带两个参数callBack(type:String, event:KeyboardEvent):void
	 */
	public addRegister(target: egret.DisplayObject, type: string, callBack: Function) {
		if (this.getRegisterIndex(target, type, callBack) >= 0) {
			return;
		}
		if (this.targetDic.getItem(target) === undefined) {
			this.targetDic.setItem(target, []);
			target.addEventListener(egret.KeyboardEvent.KEY_DOWN, this.onKeyDown, this, false, 0);
		}
		var map: ShortcutMap = new ShortcutMap();
		map.type = type;
		map.callBack = callBack;
		this.targetDic.getItem(target).push(map);
	}
	/**
	 * 移除一个监听对象
	 * @param target 监听事件的目标对象
	 * @param type 按键要触发的事件类型
	 * @param callBack 回调函数
	 */
	public removeRegister(target: egret.DisplayObject, type: string, callBack: Function) {
		var registerIndex: number = this.getRegisterIndex(target, type, callBack);
		if (registerIndex >= 0) {
			var shortcutMapList: Array<any> = <any>this.targetDic.getItem(target);
			shortcutMapList.splice(registerIndex, 1);
			if (shortcutMapList.length === 0) {
				target.removeEventListener(egret.KeyboardEvent.KEY_DOWN, this.onKeyDown, this);
				this.targetDic.delItem(target);
			}
		}
	}
	/**
	 * 测试是否注册了指定类型的指定方法，并返回注册的索引
	 */
	private getRegisterIndex(target: egret.DisplayObject, type: string, callBack: Function): number {
		if (this.targetDic.getItem(target)) {
			var shortcutMapList: Array<any> = <any>this.targetDic.getItem(target);
			var shortcutMap: ShortcutMap;
			for (var i: number = 0; i < shortcutMapList.length; i++) {
				shortcutMap = shortcutMapList[i];
				if (shortcutMap.type === type && shortcutMap.callBack === callBack) {
					return i;
				}
			}
		}
		return -1;
	}
	/**
	 * 绑定一个事件类型 与 按键值的映射
	 * @param type  事件类型
	 * @param keyCodeValue 按下的键的对象， 可以是一个数组也可以每一项是一个数组，数组中的元素对应Keyboard中的常量
	 * 	<br/>如果数组的长度等于1，则 按照对应的键值触发事件
	 * <br/>如果数组的长度大于1，则 按照数组中的第一项对应的键值触发事件，其他的键为触发事件需要按下的键
	 * <br/>下面是一些例子
	 * <code>
	 *	<br>[Keyboard.S , Keyboard.CONTROL] 表示 Ctrl+S
	 *	<br>[[Keyboard.BACKSPACE] , [Keyboard.DELETE]] 表示退格或者删除
	 * </code>
	 */
	public addBinding(type: string, keyCodeValue: Array<any>) {
		this.bindingDic.setItem(type, keyCodeValue);
	}

	/**
	 * 移除一个事件类型
	 */
	public removeBinding(type: string) {
		if (this.bindingDic.getItem(type)) {
			this.bindingDic.delItem(type);
		}
	}

	private onKeyDown(event: egret.KeyboardEvent) {
		var shortcutMapList: Array<any> = <any>this.targetDic.getItem(event.currentTarget);
		if (!shortcutMapList || shortcutMapList.length < 1){
			return;
		}
		var shortcutMap: ShortcutMap;
		for (var i: number = 0; i < shortcutMapList.length; i++) {
			shortcutMap = shortcutMapList[i];
			var keyCodeValue: Array<any> = <any>this.bindingDic.getItem(shortcutMap.type);
			var result: boolean = false;
			if (!keyCodeValue || keyCodeValue.length < 1){
				continue;
			}
			if (types.isArray(keyCodeValue[0])) {
				for (var keyCodeArray_key_a in keyCodeValue) {
					var keyCodeArray: any = keyCodeValue[keyCodeArray_key_a];
					if (types.isNumber(keyCodeArray)) {
						result = this.check(event, [keyCodeArray]);
					}
					else {
						result = this.check(event, keyCodeArray);
					}
					if (result) {
						break;
					}
				}
			}
			else {
				result = this.check(event, keyCodeValue);
			}
			if (result) {
				if (shortcutMap.callBack['length'] === 0) {
					shortcutMap.callBack();
				}
				else if (shortcutMap.callBack['length'] === 1) {
					shortcutMap.callBack(shortcutMap.type);
				}
				else if (shortcutMap.callBack['length'] === 2) {
					shortcutMap.callBack(shortcutMap.type, event);
				}
				else {
					shortcutMap.callBack();
				}
			}
		}
	}
	/**
	 * 传入一个键盘事件，检测是否符合某一个快捷键，如果符合，则返回这个快捷键的key
	 * @param event
	 * @return
	 *
	 */
	public test(event: egret.KeyboardEvent): string {
		for (var forinvar__ in this.bindingDic.map) {
			var key = this.bindingDic.map[forinvar__][0];
			var keyCodeValue: Array<any> = <any>this.bindingDic.getItem(key);
			var result: boolean = false;
			if (!keyCodeValue || keyCodeValue.length < 1) {
				continue;
			}
			if (types.isArray(keyCodeValue[0])) {
				for (var keyCodeArray_key_a in keyCodeValue) {
					var keyCodeArray: any = keyCodeValue[keyCodeArray_key_a];
					if (types.isNumber(keyCodeArray)) {
						result = this.check(event, [keyCodeArray]);
					} else {
						result = this.check(event, keyCodeArray);
					}
					if (result) {
						break;
					}
				}
			} else {
				result = this.check(event, keyCodeValue);
			}
			if (result) {
				return key;
			}
		}
		return '';
	}
	/**
	 * 检查事件是否符合指定按键
	 */
	private check(event: egret.KeyboardEvent, keyCodeArray: Array<any>): boolean {
		if (!keyCodeArray || keyCodeArray.length < 0) {
			return false;
		}
		if (event.keyCode === keyCodeArray[0]) {
			if (keyCodeArray.length === 1) {
				return true;
			} else {
				var firstKey: number = (keyCodeArray[0]);
				var hopeKeys: Array<any> = keyCodeArray.concat();
				var allDownkeyCodes: Array<any> = this.compositeKeys(event);
				if (allDownkeyCodes.indexOf(firstKey) < 0) {
					allDownkeyCodes.push(firstKey);
				}
				if (hopeKeys.length !== allDownkeyCodes.length) {
					return false;
				}
				hopeKeys.sort();
				allDownkeyCodes.sort();
				for (var i: number = 0; i < hopeKeys.length; i++) {
					if (hopeKeys[i] !== allDownkeyCodes[i]) {
						return false;
					}
				}
				return true;
			}
		}
		return false;
	}
	/**
	 * 获取按下的组合键
	 */
	private compositeKeys(event: egret.KeyboardEvent): Array<any> {
		var keys: Array<any> = [];
		if (event.altKey) {
			keys.push(egret.Keyboard.ALTERNATE);
		}
		if (event.shiftKey) {
			keys.push(egret.Keyboard.SHIFT);
		}
		if (event.controlKey) {
			keys.push(egret.Keyboard.CONTROL);
		}
		if (event.commandKey) {
			keys.push(egret.Keyboard.COMMAND);
		}
		return keys;
	}
	//======================== 快捷键相关=====================end=======================

	//======================== 全局舞台按键 =====================start=======================

	private onDeactive(event: egret.Event) {
		this.downKeyCodes = new egret.Dictionary();
	}
	/**
	 * 按下的键代码列表
	 */
	private downKeyCodes: egret.Dictionary = new egret.Dictionary();
	private onStageKeyDown(event: egret.KeyboardEvent) {
		// var keyCode:number = event.keyCode;
		// this.downKeyCodes.setItem(keyCode, true);
	}

	private onStageKeyUp(event: egret.KeyboardEvent) {
		// var keyCode:number = event.keyCode;
		// if(this.downKeyCodes.getItem(keyCode))
		//     this.downKeyCodes.delItem(keyCode);
	}
	/**
	 * 是否按下了指定键
	 */
	public isKeyDown(keyCode: number): boolean {
		return types.isBoolean(this.downKeyCodes.getItem(keyCode));
	}
	//======================== 全局舞台按键 =====================end=======================
}

export class ShortcutMap extends egret.HashObject {
	/**
	 * 事件类型
	 */
	public type: string;
	/**
	 * 回调函数
	 */
	public callBack: Function;
}
