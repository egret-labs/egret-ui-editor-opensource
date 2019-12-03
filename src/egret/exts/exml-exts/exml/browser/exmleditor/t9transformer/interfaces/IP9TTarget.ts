import {IEventDispatcher} from '../../EventDispatcher';
import { Matrix } from '../../data/Matrix';
import { IRender } from '../../IRender';
/**
 */
export interface IP9TTarget extends IEventDispatcher,IRender {
	localX: number;
	localY: number;
	width: number;
	height: number;
	rotation: number;
	anchorX: number;
	anchorY: number;
	scaleX: number;
	scaleY: number;
	skewX: number;
	skewY: number;

	canResize:boolean;
	canScale:boolean;
	canMove:boolean;
	canRotate:boolean;
	canSetAnchor:boolean;
	getMatrix(): Matrix;
	getStageToParentMatrix(): Matrix;
}