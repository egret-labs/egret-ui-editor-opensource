
export class ErrorPosShow extends eui.Group {
	// private LINE_HEIGHT:number = 25;
	public onTurnTo: Function;

	public constructor() {
		super();
		this.width = 5;
		this.touchChildren = true;
		this.touchEnabled = true;
		this.scrollEnabled = true;
		this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.clickHandler, this);
	}

	public clean() {
		while (this.warningLines.length > 0) {
			this.recycleBlock(this.warningLines.pop());
		}
		while (this.errorLines.length > 0) {
			this.recycleBlock(this.errorLines.pop());
		}
	}

	private errorLines: Array<Block> = new Array<Block>();
	private warningLines: Array<Block> = new Array<Block>();
	private numLines: number = -1;
	private numLinesShow: number = -1;
	public setErrorLines($numLines: number, $errorLines: Array<any>, $warningLines: Array<any>) {
		$numLines = ($numLines);
		this.numLines = ($numLines);
		if (this.height / 25 > this.numLines) {
			this.numLinesShow = this.height / 25;
		}
		else {
			this.numLinesShow = (this.numLines);
		}
		var block: Block;
		while (this.warningLines.length > 0) {
			this.recycleBlock(this.warningLines.pop());
		}
		var previousY: number = (-10);
		var currentY: number = (0);
		for (i = (0); i < $warningLines.length; i++) {
			block = this.getBlock('warning');
			block.line = ($warningLines[i]);
			this.warningLines.push(block);
			currentY = this.height * (block.line / this.numLinesShow);
			if (currentY - previousY >= 3) {
				this.addChild(block);
				block.visible = true;
				block.y = (this.height * (block.line / this.numLinesShow));
				previousY = (currentY);
			}
			else {
				block.visible = false;
			}
		}
		while (this.errorLines.length > 0) {
			this.recycleBlock(this.errorLines.pop());
		}
		previousY = (-10);
		for (var i: number = (0); i < $errorLines.length; i++) {
			block = this.getBlock('error');
			block.line = ($errorLines[i]);
			this.errorLines.push(block);
			currentY = ((this.height * (block.line / this.numLinesShow)));
			if (currentY - previousY >= 3) {
				this.addChild(block);
				block.visible = true;
				block.y = (this.height * (block.line / this.numLinesShow));
				previousY = (currentY);
			}
			else {
				block.visible = false;
			}
		}
	}

	protected updateDisplayList(unscaledWidth: number, unscaledHeight: number) {
		// super['updateDisplayList'](unscaledWidth,unscaledHeight);
		super.updateDisplayList(unscaledWidth, unscaledHeight);
		if (this.height / 25 > this.numLines) {
			this.numLinesShow = ((this.height / 25));
		}
		else {
			this.numLinesShow = (this.numLines);
		}
		var previousY: number = (-10);
		var currentY: number = (0);
		for (var i: number = (0); i < this.errorLines.length; i++) {
			currentY = ((this.height * (this.errorLines[i].line / this.numLinesShow)));
			if (currentY - previousY >= 3) {
				if (<any>!this.contains(this.errorLines[i])) {
					this.addChild(this.errorLines[i]);
				}
				this.errorLines[i].visible = true;
				this.errorLines[i].y = (this.height * (this.errorLines[i].line / this.numLinesShow));
				previousY = (currentY);
			}
			else {
				this.errorLines[i].visible = false;
				if (this.contains(this.errorLines[i])) {
					this.removeChild(this.errorLines[i]);
				}
			}
		}
		previousY = (-10);
		currentY = (0);
		for (i = (0); i < this.warningLines.length; i++) {
			currentY = ((this.height * (this.warningLines[i].line / this.numLinesShow)));
			if (currentY - previousY >= 3) {
				if (<any>!this.contains(this.warningLines[i])) {
					this.addChild(this.warningLines[i]);
				}
				this.warningLines[i].visible = true;
				this.warningLines[i].y = (this.height * (this.warningLines[i].line / this.numLinesShow));
				previousY = (currentY);
			}
			else {
				this.warningLines[i].visible = false;
				if (this.contains(this.warningLines[i])) {
					this.removeChild(this.warningLines[i]);
				}
			}
		}
	}

	private blockArr: Array<any> = [];
	private getBlock(type: string): Block {
		var rect: Block;
		if (this.blockArr.length > 0) {
			rect = this.blockArr.pop();
			if (type === 'error') {
				rect.fillColor = (0xfc3030);
				rect.strokeColor = (0xfc3030);
			}
			else {
				rect.fillColor = (0xfca830);
				rect.strokeColor = (0xfca830);
			}
			return rect;
		}
		else {
			rect = new Block();
			if (type === 'error') {
				rect.fillColor = (0xfc3030);
				rect.strokeColor = (0xfc3030);
			}
			else {
				rect.fillColor = (0xfca830);
				rect.strokeColor = (0xfca830);
			}
			rect.height = 4;
			rect.width = 8;
			return rect;
		}
	}

	protected clickHandler(event: egret.MouseEvent) {
		var block: Block = <any>event.target;
		if (block) {
			if (this.onTurnTo) {
				this.onTurnTo(block.line);
			}
		}
	}

	private recycleBlock(block: Block) {
		if (block.parent) {
			this.removeChild(block);
		}
		this.blockArr.push(block);
	}
}

class Block extends eui.Rect {
	public line: number = -1;

	public constructor() {
		super();
		this.touchEnabled = true;
		this.touchChildren = true;
		this.fillAlpha = 0.5;
		this.strokeAlpha = 1;
		this.strokeWeight = 1;
		this.includeInLayout = false;
		this.addEventListener(egret.MouseEvent.ROLL_OVER, this.rollOverHandler, this);
		this.addEventListener(egret.MouseEvent.ROLL_OUT, this.rollOutHandler, this);
	}

	protected rollOutHandler(event: egret.MouseEvent) {
		// if(egret.managers.CursorManager['cursor'] === MouseCursor.BUTTON)
		// 	egret.managers.CursorManager['removeCursor'](MouseCursor.BUTTON);
	}

	protected rollOverHandler(event: egret.MouseEvent) {
		// egret.managers.CursorManager['setCursor'](MouseCursor.BUTTON);
	}
}