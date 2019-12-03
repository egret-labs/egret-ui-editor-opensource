export interface IEventDispatcher{
	addEventListener(type:string, fun:Function, thisObj: any): void;
	removeEventListener(type:string, fun:Function, thisObj:any): void;
	dispatchEvent(event:Event): void
}
export class EventDispatcher implements IEventDispatcher{
	__z_e_listeners: any = {};
	public constructor() {

	}
	addEventListener(type:string, fun:Function, thisObj: any,level:number=0): void {
		let list:any[] = this.__z_e_listeners[type];
		if (list === undefined) {
			list = [];
			this.__z_e_listeners[type] = list;
		}
		var item = {
			func: fun,
			context: thisObj,
			level:level
		};
		list.push(item);
		list.sort((a,b)=>{
			return b.level-a.level;
		});
	};
	removeEventListener(type:string, fun:Function, thisObj:any): void {
		var list = this.__z_e_listeners[type];
		if (list !== undefined) {
			var size = list.length;
			for (var i = 0; i < size; i++) {
				var obj = list[i];
				if (obj.func === fun && obj.context === thisObj) {
					list.splice(i, 1);
					return;
				}
			}
		}
	};
	dispatchEvent(event:Event): void {
		var list = this.__z_e_listeners[event.type];
		if (list !== undefined) {
			var size = list.length;
			for (var i = 0; i < size; i++) {
				var ef = list[i];
				var fun = ef.func;
				var context = ef.context;
				if (context) {
					fun.call(context, event);
				} else {
					fun(event);
				}
			}
		}
	};
}

export class Event{
	public type:string;
	public data:any;
	public constructor(type: string, data?: any) {
		this.type=type;
		this.data=data;
	}
}