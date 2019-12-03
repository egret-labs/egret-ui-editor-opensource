export class AbsorbLineType{
	public static HORIZONTAIL:string='horizontal';
	public static VERTICAL:string='vertical';
}
export class AbsorbLine{
	constructor(type:string=undefined,value:number=0,detail?:{xFrom?:number,xTo?:number,yFrom?:number,yTo?:number}){
		this.type=type;
		this.value=value;
		this.detail=detail;
	}
	public type:string;
	public value:number;
	public detail:{xFrom?:number,xTo?:number,yFrom?:number,yTo?:number};
}