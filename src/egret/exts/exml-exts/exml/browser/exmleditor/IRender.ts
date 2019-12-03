export interface IRender{
	root:HTMLElement;
	container:HTMLElement;
	render(contianer:HTMLElement):void;
	removeFromParent():void;
}