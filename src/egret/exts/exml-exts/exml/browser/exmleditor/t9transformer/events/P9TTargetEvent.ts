import {Event} from '../../EventDispatcher';
export class P9TTargetEvent extends Event {
	public static DISPLAYCHANGE: string = 'displayChange';
	constructor(type: string,data:any=null) {
		super(type, data);
	}
}