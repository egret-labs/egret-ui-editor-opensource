import {IP9TTargetAdapter} from './../../interfaces/IP9TTargetAdapter';
import {Event} from '../../../EventDispatcher';
/**
 */
export class P9TTargetAdapterEvent extends Event {
	public static BEGINTRANSFORM: string = 'begintransform';
	public static BEGINUPDATETRANSFORM: string = 'beginupdatetransform';
	public static UPDATETRANSFORM: string = 'updatetransform';
	public static ENDTRANSFORM: string = 'endtransform';

	public targetAdapter: IP9TTargetAdapter;
	constructor(type: string, target: IP9TTargetAdapter, data: any= null) {
		super(type,data);
		this.targetAdapter = target;
	}
}