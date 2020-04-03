export class CheckEvent extends egret.Event {
	public static ERROR_NUM_CHANGED: string;

	public constructor(type: string, bubbles: boolean = true, cancelable: boolean = false) {
		super(type, bubbles, cancelable);
	}

	public errorNum: number = 0;
	public warningNum: number = 0;
	public clone(): egret.Event {
		var event: CheckEvent = new CheckEvent(this.type, this.bubbles, this.cancelable);
		event.errorNum = (this.errorNum);
		event.warningNum = (this.warningNum);
		return event;
	}

}
CheckEvent.ERROR_NUM_CHANGED = 'errorNumChanged';

