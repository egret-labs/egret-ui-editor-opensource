
export class GraphicsUtil {

	/**
	 * 绘制虚线
	 * @param graphics 要绘制的图形
	 * @param x1 起始坐标x
	 * @param y1 起始坐标y
	 * @param x2 结束坐标x
	 * @param y2 结束坐标y
	 * @param dash 虚线线段长度
	 * @param ed 虚线间断长度
	 *
	 */
	public static drawDash(graphics: egret.Graphics, x1: number, y1: number, x2: number, y2: number, dash: number = 8, ed: number = 2): void {
		//计算起点终点连续的角度
		var angle: number = Math.atan2(y2 - y1, x2 - x1);
		//步长，每次循环改变的长度
		var step: number = dash + ed;
		//每段实线水平和竖直长度
		var dashx: number = dash * Math.cos(angle);
		var dashy: number = dash * Math.sin(angle);
		//每段虚线水平和竖直长度
		var edx: number = ed * Math.cos(angle);
		var edy: number = ed * Math.sin(angle);
		//每段实线和虚线的水平和垂直长度
		var stepx: number = step * Math.cos(angle);
		var stepy: number = step * Math.sin(angle);
		//起点和终点的距离
		var _length: number = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
		//使用循环，逐段绘制
		for (var i: number = step, px: number = x1, py: number = y1; i < _length; i += step) {
			graphics.moveTo(px + edx, py + edy);
			graphics.lineTo(px + dashx, py + dashy);
			//循环递归
			px += stepx;
			py += stepy;
		}
	}
}