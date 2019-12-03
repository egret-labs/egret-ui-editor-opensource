import {IP9TTarget} from './IP9TTarget';
/**
 */
export interface IP9TTargetAdapter extends IP9TTarget {
	operateTarget: IP9TTarget;
	refresh():void;
}