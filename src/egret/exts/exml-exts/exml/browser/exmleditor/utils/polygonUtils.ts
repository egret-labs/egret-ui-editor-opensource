
export interface Point2D {
	x: number;
	y: number;
}

function plus(left: Point2D, right: Point2D): Point2D {
	return { x: left.x + right.x, y: left.y + right.y };
}
function sub(left: Point2D, right: Point2D): Point2D {
	return { x: left.x - right.x, y: left.y - right.y };
}
function mul1(left: Point2D, right: Point2D): number {
	return left.x * right.x + left.y * right.y;
}
function mul2(left: Point2D, value: number): Point2D {
	return { x: left.x * value, y: left.y * value }
}
function cross(left: Point2D, right: Point2D): number {
	return left.x*right.y - left.y*right.x
}

export function fitPixel(points:Point2D[]):Point2D[]{
	var results:Point2D[] = [];
	for(var i = 0;i<points.length;i++){
		results.push(doFitPixel(points[i]));
	}
	return results;
}

function doFitPixel(point:Point2D):Point2D{
	var result = {x:point.x,y:point.y}
	result.x = Math.round(result.x*2)/2;
	if(result.x.toString().indexOf('.') == -1){
		result.x += 0.5;
	}
	result.y = Math.round(result.y*2)/2;
	if(result.y.toString().indexOf('.') == -1){
		result.y += 0.5;
	}
	return result;
}

function equals(a:Point2D,b:Point2D):boolean{
	return a.x == b.x && a.y == b.y;
}

export function expandPolygon(points: Point2D[], dist: number): Point2D[] {
	if(points.length == 4 && 
		equals(points[0],points[1]) && equals(points[0],points[1]) && equals(points[0],points[2]) && equals(points[0],points[3])
		){
			points[0].x = points[0].x+dist;
			points[0].y = points[0].y+dist;

			points[1].x = points[1].x-dist;
			points[1].y = points[1].y+dist;

			points[2].x = points[2].x-dist;
			points[2].y = points[2].y-dist;

			points[3].x = points[3].x+dist;
			points[3].y = points[3].y-dist;

			return points;
		}
	// 初始化顶点队列
	var pList: Point2D[] = points;	// 原始顶点坐标， 在initPList函数当中初始化赋值
	var dpList: Point2D[] = [];		// 边向量dpList［i＋1］－ dpLIst［i］ 在 initDPList函数当中计算后赋值
	var ndpList: Point2D[] = []; 	// 单位化的边向量， 在initNDPList函数当中计算后肤质，实际使用的时候，完全可以用dpList来保存他们
	var newList: Point2D[] = [];  	// 新的折线顶点，在compute函数当中，赋值

	// 初始化dpList  两顶点间向量差
	for (var index = 0; index < pList.length; ++index) {
		dpList.push(sub(pList[index == pList.length - 1 ? 0 : index + 1], pList[index]));
	}

	//避免出现0向量，TODO 这部分还能优化。  应该取和临近两个向量的平均向量垂直的向量才对。
	for(var i = 0;i<dpList.length;i++){
		if(dpList[i].x == 0 && dpList[i].y == 0){
			if(i == 0 && dpList.length > 0){
				dpList[i].x = dpList[i+1].y/Math.abs(dpList[i+1].y);
				if(isNaN(dpList[i].x)){
					dpList[i].x = 0;
				}
				dpList[i].y = dpList[i+1].x/Math.abs(dpList[i+1].x);
				if(isNaN(dpList[i].y)){
					dpList[i].y = 0;
				}
			}else{
				dpList[i].x = dpList[i-1].y/Math.abs(dpList[i-1].y);
				if(isNaN(dpList[i].x)){
					dpList[i].x = 0;
				}
				dpList[i].y = dpList[i-1].x/Math.abs(dpList[i-1].x);
				if(isNaN(dpList[i].y)){
					dpList[i].y = 0;
				}
			}
		}
	}

	// 初始化ndpList，单位化两顶点向量差
	for (var index = 0; index < dpList.length; ++index) {
		ndpList.push(mul2(dpList[index], (1.0 / Math.sqrt(mul1(dpList[index], dpList[index])))));
	}

	// console.log("开始计算新顶点")
	let count = pList.length;
	for (var index = 0; index < count; ++index) {
		var point: Point2D;
		let startIndex = index == 0 ? count - 1 : index - 1;
		let endIndex = index;
		let sina = cross(ndpList[startIndex] , ndpList[endIndex]);
		let length = dist / sina;
		let vector = sub(ndpList[endIndex] , ndpList[startIndex]);
		point = plus(pList[index] ,mul2(vector , length));
		newList.push(point);
	}

	return newList;
}

