import { IRender } from "../../../IRender";

/**
 */
export interface IP9TPointRender extends IRender {
	checkCenterSpace(stageX: number, stageY: number): boolean;
	pname: string;
	x: number;
	y: number;
	visible:boolean;
}