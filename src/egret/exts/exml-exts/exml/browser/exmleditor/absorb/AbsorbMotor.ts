import { AbsorbLine, AbsorbLineType } from './AbsorbLine';
export class AbsorbResult {
	public targetLine: AbsorbLine;
	public baseLine: AbsorbLine;
	constructor(targetLine: AbsorbLine, baseLine: AbsorbLine) {
		this.targetLine = targetLine;
		this.baseLine = baseLine;
	}
}
/**
 */
export class AbsorbMotor {
	constructor() {

	}
	private _baseLines: AbsorbLine[];
	private _absorbFloat: number;
	public setUp(baseLines: AbsorbLine[], absorbFloat: number = 2): void {
		this._baseLines = baseLines;
		this._absorbFloat = absorbFloat;
	}
	public absorb(targetLines: AbsorbLine[]): AbsorbResult[] {
		if (!this._baseLines || this._baseLines.length === 0 || !targetLines || targetLines.length === 0) {
			return [];
		}
		let resultList:AbsorbResult[]=[];
		//归类排序，水平线且值小的排在前面
		targetLines.sort((a, b): number => {
			if (a.type === b.type) { return a.value - b.value; }
			else if (a.type === AbsorbLineType.HORIZONTAIL) { return -1; }
			else if (b.type === AbsorbLineType.HORIZONTAIL) { return 1; }
			return 0;
		});
		let currentLineType:string;
		for(let i:number=0;i<targetLines.length;i++){
			currentLineType=targetLines[i].type;
			b:for(let k:number=0;k<this._baseLines.length;k++){
				if(this._baseLines[k].type===currentLineType&&
				this._baseLines[k].value>=targetLines[i].value-this._absorbFloat&&
				this._baseLines[k].value<=targetLines[i].value+this._absorbFloat){
					resultList.push(new AbsorbResult(targetLines[i],this._baseLines[k]));
					break b;
				}
			}
		}
		return resultList;
	}
}