
/**
 * 鼠标over显示操作条
 */
export class ResGroupBar extends eui.Group{
	
	private static _instance:ResGroupBar;
	public static instance():ResGroupBar{
		if(!ResGroupBar._instance){
			ResGroupBar._instance = new ResGroupBar();
		}
		return ResGroupBar._instance;
	}
	/**当前目标的引用 ResGroupGridItemRender */
	public curTarget:any;
	
	
	private delButton:eui.Button;
	
	public constructor(){
		super();
		this.delButton = new eui.Button();
		this.delButton.width = 40;
		this.delButton.height = 40;
		this.addChild(this.delButton);
		this.delButton.addEventListener(egret.MouseEvent.CLICK, this.onClickDelButton, this);
	}
	
	public showDelButton(){
		
	}
	
	private onClickDelButton(event:egret.MouseEvent){
		this.curTarget;
		
	}
	

}