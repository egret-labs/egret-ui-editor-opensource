export class ResGroupErrorBar extends eui.Group {

	public blockHeight:number = 6;
	public blockList:{color:number,index:number}[]=[];
	public bg:egret.Shape = new egret.Shape();
	public shape:egret.Shape = new egret.Shape();
	public itemHeight:number;
	public itemTotal:number;
	public scrollCB:(per:number)=>void;
	public constructor() {
		super();
		this.touchChildren = false;
		this.touchEnabled =  true;
		this.addChild(this.bg);
		this.addChild(this.shape);
		this.addEventListener(egret.Event.RESIZE,this.render,this);
		this.addEventListener(egret.TouchEvent.TOUCH_TAP,this.callScroll,this);
		this.addEventListener(egret.TouchEvent.TOUCH_MOVE,this.callScroll,this);
	}
	private callScroll(e:egret.TouchEvent):void{
		var per:number = (e.localY - this.blockHeight)/this.height;
		per = Math.min(1,Math.max(0,per));
		if(this.scrollCB){
			this.scrollCB(per*this.itemHeight*this.itemTotal);
		}
	}

	public clear():void{
		this.blockList.length = 0;
	}


	public pushItem(item:{color:number,index:number}){
		this.blockList.push(item);
	}

	public render():void{
		this.shape.graphics.clear();
		this.bg.graphics.clear();
		this.bg.graphics.beginFill(0,0.3);
		this.bg.graphics.drawRect(0,0,this.width,this.height);
		var tempH:number = this.height - this.blockHeight;
		// console.log(this.x,this.y,this.width,this.height);
		var total:number = Math.max(this.itemTotal,this.height/this.itemHeight);
		this.blockList.forEach(item=>{
			this.shape.graphics.beginFill(item.color);
			this.shape.graphics.drawRect(0,tempH*item.index/total,this.width,this.blockHeight);
			this.shape.graphics.endFill();
		});
	}
}