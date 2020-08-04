import { P9TTargetAdapter } from '../t9transformer/adapter/P9TTargetAdapter';
import { IP9TPointRender } from '../t9transformer/adapter/interfaces/IP9TPointRender';
import { P9TPointNameDefine } from '../t9transformer/P9TPointNameDefine';
import { MatrixUtil } from '../t9transformer/util/MatrixUtil';
import { FocusRectLayer, FocusRectExt, FocusRectLayerEvent } from '../FocusRectLayer';
import { Point } from '../data/Point';
import { Rectangle } from '../data/Rectangle';
import { Event } from '../EventDispatcher'
import { INode, isInstanceof } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { EContainer } from '../../../common/exml/treeNodesImpls';

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * 九点变换器操作层
 * 此层用于节点的点选、框选操作以及部署9点变换器
 */
export class OperateLayer {
	constructor() {
		this.mouseEventHandle = this.mouseEventHandle.bind(this);
	}
	private focusRectLayer: FocusRectLayer;
	//设置焦点对象层
	public setFocusRectLayer(v: FocusRectLayer): void {
		this.dettachFocusRectLayerEvents();
		this.focusRectLayer = v;
		this.attachFocusRectLayerEvents();
		//进行一下刷新
		this.reDeplayP9TAdapter();
	}
	//获取所有可用的代理对象
	public getAllUsefulAdapter(): P9TTargetAdapter[] {
		return this.p9tTargetAdapterList;
	}
	private attachFocusRectLayerEvents(): void {
		if (this.focusRectLayer) {
			this.focusRectLayer.addEventListener(FocusRectLayerEvent.SELECTCAHNGED, this.focusRectlayerEventHandle, this);
			this.focusRectLayer.addEventListener(FocusRectLayerEvent.VIEWCHANGED, this.focusRectlayerEventHandle, this);
			this.focusRectLayer.addEventListener(FocusRectLayerEvent.FOUCSRECT_ADDED, this.focusRectlayerEventHandle, this);
			this.focusRectLayer.addEventListener(FocusRectLayerEvent.FOUCSRECT_REMOVED, this.focusRectlayerEventHandle, this);
			this.focusRectLayer.addEventListener(FocusRectLayerEvent.USER_KEYBOARDEVENT, this.focusRectlayerEventHandle, this);
		}
	}
	private dettachFocusRectLayerEvents(): void {
		if (this.focusRectLayer) {
			this.focusRectLayer.removeEventListener(FocusRectLayerEvent.SELECTCAHNGED, this.focusRectlayerEventHandle, this);
			this.focusRectLayer.removeEventListener(FocusRectLayerEvent.VIEWCHANGED, this.focusRectlayerEventHandle, this);
			this.focusRectLayer.removeEventListener(FocusRectLayerEvent.FOUCSRECT_ADDED, this.focusRectlayerEventHandle, this);
			this.focusRectLayer.removeEventListener(FocusRectLayerEvent.FOUCSRECT_REMOVED, this.focusRectlayerEventHandle, this);
			this.focusRectLayer.removeEventListener(FocusRectLayerEvent.USER_KEYBOARDEVENT, this.focusRectlayerEventHandle, this);
		}
	}
	private container: HTMLElement;
	//9点变换器展现层
	private p9tGroup: HTMLElement;
	private selectRangeElement: HTMLElement;
	public render(container: HTMLElement): void {
		this.container = container;
		this.p9tGroup = document.createElement('div');
		this.p9tGroup.style.position = 'absolute';
		this.p9tGroup.style.width = '100%';
		this.p9tGroup.style.height = '100%';
		this.p9tGroup.style.top = '0px';
		this.p9tGroup.style.left = '0px';
		this.container.appendChild(this.p9tGroup);

		this.selectRangeElement = document.createElement('div');
		this.selectRangeElement.style.position = 'absolute';
		this.selectRangeElement.style.backgroundColor = 'rgba(255,255,255,0.1)';
		this.selectRangeElement.style.border = '1px solid #007bff';
		this.selectRangeElement.style.pointerEvents = 'none';
		this.selectRangeElement.hidden = true;
		this.container.appendChild(this.selectRangeElement);
		//添加事件
		this.container.addEventListener("mousedown", this.mouseEventHandle);

	}
	//--------------------------------以下代码块为变换框部署逻辑-------------------------------------
	//当前存在的代理列表;
	private p9tTargetAdapterList: P9TTargetAdapter[] = [];
	//焦点层事件中心
	private focusRectlayerEventHandle(e: Event): void {
		switch (e.type) {
			case FocusRectLayerEvent.SELECTCAHNGED:
				this.reDeplayP9TAdapter();
				break;
			case FocusRectLayerEvent.VIEWCHANGED:
				this.refreshP9TAdapter();
				break;
			case FocusRectLayerEvent.FOUCSRECT_ADDED:
				this.addOneP9TAdapterWidthFcousRectExt(e.data as FocusRectExt);
				break;
			case FocusRectLayerEvent.FOUCSRECT_REMOVED:
				this.removeOneP9TAdapterWidthFcousRectExt(e.data as FocusRectExt);
				break;
			case FocusRectLayerEvent.USER_KEYBOARDEVENT:
				if (this.p9tTargetAdapterList.length > 0) {
					this.p9tTargetAdapterList[0].beginTransformWithKeyBoardEvent(e.data as KeyboardEvent);
				}
				break;
		}
	}

	//重新部署9点变换器代理
	private reDeplayP9TAdapter(): void {
		let selectedList: FocusRectExt[] = this.focusRectLayer.getAllSelectedFocusRect();

		//回收无用代理
		for (var i: number = (this.p9tTargetAdapterList.length - 1); i >= 0; i--) {
			var adapter: P9TTargetAdapter = this.p9tTargetAdapterList[i] as P9TTargetAdapter;
			let index = selectedList.indexOf((adapter.operateTarget as FocusRectExt));
			if (index === -1) {
				adapter.removeFromParent();
				adapter.operateTarget = null;
				this.adapterRecoveryList.push(adapter);
				this.p9tTargetAdapterList.splice(i, 1);
			}
			else {
				selectedList.splice(index, 1);
			}
		}
		//部署(此刻selectedList为需要新添加变换器的列表)
		selectedList.forEach(select => {
			var adapter: P9TTargetAdapter = this.getOneP9TTargetAdapter();
			adapter.visible = true;
			adapter.render(this.p9tGroup);
			this.p9tTargetAdapterList.push(adapter);
			adapter.operateTarget = select;
		});
		//设置变换器状态
		for (let i: number = 0; i < this.p9tTargetAdapterList.length; i++) {
			this.p9tTargetAdapterList[i].renderPoint = true;
		};
	}
	//刷新现有的9点变换器代理
	private refreshP9TAdapter(): void {
		this.p9tTargetAdapterList.forEach(adapter => {
			adapter.refresh();
		});
	}
	//添加一个9点变换器（如果需要）
	private addOneP9TAdapterWidthFcousRectExt(target: FocusRectExt): void {
		if (this.focusRectLayer.getAllSelectedFocusRect().indexOf(target) !== -1) {
			var adapter: P9TTargetAdapter = this.getOneP9TTargetAdapter();
			adapter.visible = true;
			adapter.render(this.p9tGroup);
			this.p9tTargetAdapterList.push(adapter);
			adapter.operateTarget = target;
		}
	}
	//删除一个九点变换器（如果需要）
	private removeOneP9TAdapterWidthFcousRectExt(target: FocusRectExt): void {
		for (var i: number = (this.p9tTargetAdapterList.length - 1); i >= 0; i--) {
			var adapter: P9TTargetAdapter = this.p9tTargetAdapterList[i] as P9TTargetAdapter;
			if (adapter.operateTarget === target) {
				adapter.operateTarget = null;
				adapter.removeFromParent();
				this.p9tTargetAdapterList.splice(i, 1);
				this.adapterRecoveryList.push(adapter);
			}
		}
	}
	//代理回收站
	private adapterRecoveryList: Array<P9TTargetAdapter> = [];
	//获取一个代理实例
	private getOneP9TTargetAdapter(): P9TTargetAdapter {
		var instance: P9TTargetAdapter;
		if (this.adapterRecoveryList.length > 0) {
			instance = this.adapterRecoveryList.pop();
		}
		else {
			instance = new P9TTargetAdapter();
		}
		return instance;
	}
	//--------------------------------以上代码块为变换框部署逻辑-------------------------------------
	//--------------------------------以下代码块为选择逻辑------------------------------------------
	private _operatalbe: boolean = true;
	public get operatalbe(): boolean {
		return this._operatalbe;
	}
	public set operatalbe(value: boolean) {
		this._operatalbe = value;
		this.p9tTargetAdapterList.forEach(adapter => {
			adapter.enable = value;
		});
		if (!value) {
			window.removeEventListener("mousemove", this.mouseEventHandle, true);
			window.removeEventListener("mouseup", this.mouseEventHandle);
			this.stopRangeSelect();
		}
	}

	private rangeSelectMode: boolean = false;//是否正在进行区域性选取
	private multiSelectTag: boolean = false;//多选标记
	private mouseEventHandle(e: MouseEvent): void {
		if (!this.focusRectLayer) {
			return;
		}
		if (!this.operatalbe) {
			return;
		}

		if (e.button !== 0) {
			return;
		}
		switch (e.type) {
			case 'mousedown':
				{
					this.stopRangeSelect();
					this.multiSelectTag = false;
					if (e.ctrlKey || e.metaKey || e.shiftKey) {
						this.multiSelectTag = true;
					}
					this.rangeSelectMode = false;
					this.cacheStartP = new Point(e.clientX, e.clientY);
					if (!this.needDoSelect(e)) {
						return;
					}
					window.addEventListener("mouseup", this.mouseEventHandle);
					if (this.needRangeSelect(e)) {
						window.addEventListener("mousemove", this.mouseEventHandle, true);
					}
				}
				break;
			case 'mousemove':
				{
					//如果进行了区选操作则终止事件的传递，以免下面的变换框响应鼠标事件
					e.stopImmediatePropagation();
					e.preventDefault();
					if (!this.rangeSelectMode) {
						if (Math.abs(this.cacheStartP.x - e.clientX) > 2 || Math.abs(this.cacheStartP.y - e.clientY) > 2) {
							this.rangeSelectMode = true;
							this.beginRangeSelect(e);
							this.doRangeSelect(e);
							this.drawRange();
						}
					}
					else {
						this.doRangeSelect(e);
						this.drawRange();
					}
				}
				break;
			case 'mouseup':
				{
					window.removeEventListener("mousemove", this.mouseEventHandle, true);
					window.removeEventListener("mouseup", this.mouseEventHandle);
					if (this.rangeSelectMode) {
						this.stopRangeSelect();
					}
					else {
						//没有产生区域选择则会产生两种行为，原地点击和拖动，原地点击需要重新选择目标
						if (Math.abs(this.cacheStartP.x - e.clientX) < 2 && Math.abs(this.cacheStartP.y - e.clientY) < 2) {
							this.beginPointSelect(e);
						}
					}
				}
				break;
		}
	}
	/**是否需要进行选择操作 */
	private needDoSelect(e: MouseEvent): boolean {
		for (let i: number = 0; i < this.p9tTargetAdapterList.length; i++) {
			let render: IP9TPointRender = (this.p9tTargetAdapterList[i] as P9TTargetAdapter).getOneOperateItemWidthPoint(e.clientX, e.clientY);
			if (render && render.pname !== P9TPointNameDefine.MOVE && render.pname !== P9TPointNameDefine.TACK) {
				return false;
			}
		}
		return true;
	}
	/**是否需要进行区选操作 */
	private needRangeSelect(e: MouseEvent): boolean {
		for (let i: number = 0; i < this.p9tTargetAdapterList.length; i++) {
			let render: IP9TPointRender = (this.p9tTargetAdapterList[i] as P9TTargetAdapter).getOneOperateItemWidthPoint(e.clientX, e.clientY);
			if (render) {
				return false;
			}
		}
		return true;
	}
	//点选操作
	private beginPointSelect(e: MouseEvent): void {
		if (!this.focusRectLayer) {
			return;
		}
		let setSelect = (list: FocusRectExt[]) => {
			this.focusRectLayer.setSelected(list);
		};
		let selectedList: FocusRectExt[] = this.focusRectLayer.getAllSelectedFocusRect();
		let targetFocusRect: FocusRectExt = this.getFinalTargetFocusRectWithMouseEvent(e);
		if (!targetFocusRect && !this.multiSelectTag) {
			//如果没有选中任何对象则默认选中场景
			setSelect([this.focusRectLayer.getRootFocusRect()]);
			return;
		}
		if (selectedList.indexOf(targetFocusRect) === -1) {
			if (this.multiSelectTag) {
				selectedList.push(targetFocusRect);
				setSelect(selectedList);
			}
			else {
				setSelect([targetFocusRect]);
			}
		}
		else if (this.multiSelectTag) {
			let index = selectedList.indexOf(targetFocusRect);
			selectedList.splice(index, 1);
			setSelect(selectedList);
		}
	}

	/**
	 * 根据鼠标事件获取一个最终要选中的目标矩形
	 */
	private getFinalTargetFocusRectWithMouseEvent(v: MouseEvent): FocusRectExt {
		//获取鼠标下所有的焦点矩形
		var range: Rectangle = new Rectangle(v.clientX, v.clientY, 1, 1);
		var rects: Array<FocusRectExt> = this.focusRectLayer.getAllChildFocusRectWithWindowRange(range, false, false);
		if (rects.length === 0) {
			return null;
		}
		//按照视觉层级关系把焦点矩形进行一下排序
		this.focusRectLayer.sortForDisplay(rects);
		//筛选
		let tmpP: Point = new Point();
		for (let i: number = 0; i < rects.length; i++) {
			const item = rects[i];
			tmpP.x = v.clientX; 
			tmpP.y = v.clientY;
			let matrix = item.getMatrix();
			matrix.concat(item.RootMatrix);
			matrix.concat(MatrixUtil.getMatrixToWindow(item.container));
			matrix.invert();
			tmpP = matrix.transformPoint(tmpP.x, tmpP.y);
			if (tmpP.x < 0 || tmpP.y < 0 || tmpP.x > item.width || tmpP.y > item.height) {
				continue;
			}
			if (item.canSelect) {
				return item;
			}
		}
		return null;
	}
	//////
	//////区域选择方式
	//////
	private cacheStartP: Point;//选区起始点
	private cacheSelectRange: Rectangle;//选择区
	private localOffP: Point = new Point();//选区点相对本地坐标的偏移

	private cacheCurrentSelectList: FocusRectExt[] = [];
	/**准备进行区域性选择 */
	private beginRangeSelect(v: MouseEvent): void {
		//先清除已有的选中节点
		if (!this.multiSelectTag) {
			this.focusRectLayer.setSelected([]);
		}
		else {
			this.cacheCurrentSelectList = this.focusRectLayer.getAllSelectedFocusRect().concat([]);
		}
		this.cacheSelectRange = new Rectangle(this.cacheStartP.x, this.cacheStartP.y, 1, 1);
		this.localOffP = MatrixUtil.localToGlobal(this.container, new Point(0, 0));
		this.selectRangeElement.hidden = false;
	}
	/**处理选区内的选中 */
	private doRangeSelect(v: MouseEvent): void {
		var minx: number = Math.min(this.cacheStartP.x, v.clientX);
		var maxx: number = Math.max(this.cacheStartP.x, v.clientX);
		var miny: number = Math.min(this.cacheStartP.y, v.clientY);
		var maxy: number = Math.max(this.cacheStartP.y, v.clientY);
		this.cacheSelectRange.x = minx;
		this.cacheSelectRange.y = miny;
		this.cacheSelectRange.width = maxx - minx;
		this.cacheSelectRange.height = maxy - miny;

		//搜索选区目标
		var focusRects: Array<FocusRectExt> = this.focusRectLayer.getAllChildFocusRectWithWindowRange(this.cacheSelectRange);//不包含根节点
		//选区内的节点列表
		var list: FocusRectExt[] = [];
		focusRects.forEach(rect => {
			if (this.cacheCurrentSelectList.indexOf(rect) === -1) {
				list.push(rect);
			}
		});
		this.focusRectLayer.setSelected(list.concat(this.cacheCurrentSelectList));
	}
	/**结束区域性选择 */
	private stopRangeSelect(): void {
		this.cacheSelectRange = null;
		this.cacheStartP = null;
		this.selectRangeElement.hidden = true;
	}
	/**绘制选区 */
	private drawRange(): void {
		this.selectRangeElement.style.left = (this.cacheSelectRange.x - this.localOffP.x) + 'px';
		this.selectRangeElement.style.top = (this.cacheSelectRange.y - this.localOffP.y) + 'px';
		this.selectRangeElement.style.width = this.cacheSelectRange.width + 'px';
		this.selectRangeElement.style.height = this.cacheSelectRange.height + 'px';
	}
	public dispose(): void {
		//移除所有代理
		for (var i: number = (this.p9tTargetAdapterList.length - 1); i >= 0; i--) {
			var adapter: P9TTargetAdapter = this.p9tTargetAdapterList[i] as P9TTargetAdapter;
			adapter.removeFromParent();
		}
		this.dettachFocusRectLayerEvents();
		this.container.removeEventListener("mousedown", this.mouseEventHandle);
	}
}