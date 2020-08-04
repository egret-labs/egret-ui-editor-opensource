import {IP9TTarget, IP9TTargetRender} from './IP9TTarget';
/**
 */
export interface IP9TTargetAdapter extends IP9TTargetRender {
	operateTarget: IP9TTarget;
	refresh():void;
}