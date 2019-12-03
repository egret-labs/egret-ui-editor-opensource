// import {IP9TTarget} from './../interfaces/IP9TTarget';
// /**
//  */
// export class P9TUtil {
// 	public static getMatrixForIP9TTarget(v: IP9TTarget): egret.Matrix {
// 		var skewM: egret.Matrix = new egret.Matrix();
// 		skewM.a = Math.cos(v.skewY / 180 * Math.PI);
// 		skewM.b = Math.sin(v.skewY / 180 * Math.PI);
// 		skewM.c = -Math.sin(v.skewX / 180 * Math.PI);
// 		skewM.d = Math.cos(v.skewX / 180 * Math.PI);

// 		var m: egret.Matrix = new egret.Matrix();
// 		m.translate(-v.width * v.anchorX, -v.height * v.anchorY);
// 		m.scale(v.scaleX, v.scaleY);
// 		m.concat(skewM);
// 		m.rotate(v.rotation / 180 * Math.PI);
// 		m.translate(v.localX, v.localY);
// 		return m;
// 	}
// 	public static getStageToParentMatrix(v:egret.DisplayObject):egret.Matrix{
// 		if (!v) {
// 			return null;
// 		}
// 		var tmpTarget: egret.DisplayObject = v;
// 		var parentList: any[] = [];
// 		while (tmpTarget.parent) {
// 			if (tmpTarget.parent instanceof egret.Stage) {
// 				break;
// 			}
// 			else {
// 				parentList.push(tmpTarget.parent);
// 				tmpTarget = tmpTarget.parent;
// 			}
// 		}
// 		var m: egret.Matrix;
// 		for (var i: number = 0; i < parentList.length; i++) {
// 			if (!m) {
// 				m = (<egret.DisplayObject>parentList[i]).matrix.clone();
// 			}

// 			else {
// 				m.concat((<egret.DisplayObject>parentList[i]).matrix);
// 			}
// 		}
// 		return m;
// 	}
// }