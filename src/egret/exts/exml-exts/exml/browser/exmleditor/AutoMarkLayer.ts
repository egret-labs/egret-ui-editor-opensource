import { OperateLayer } from './operatelayers/OperateLayer';
import { ContainerMarkRect } from './rendercomp/ContainerMarkRect';
import { IDisposable } from 'egret/base/common/lifecycle';
import { P9TTargetAdapterEventContext } from './t9transformer/adapter/P9TTargetAdapterEventContext';
import { P9TTargetAdapterEvent } from './t9transformer/adapter/events/P9TTargetAdapterEvent';
import { P9TTargetAdapterSyncOperateDefine } from './t9transformer/adapter/P9TTargetAdapterSyncOperateDefine';
import { FocusRectExt, FocusRectLayer } from './FocusRectLayer';
import { Rectangle } from './data/Rectangle';
import { Point } from './data/Point';
import { IContainer, isInstanceof, INode, IScroller } from '../../common/exml/treeNodes';
import { MatrixUtil } from './t9transformer/util/MatrixUtil';
import { localize } from 'egret/base/localization/nls';
import { IExmlModel } from '../../common/exml/models';

/**
 * 目标容器的自动表示层，可以控制是拖入到指定容易还是平行拖拽。
 */
export class AutoMarkLayer implements IDisposable {
	private operateLayer: OperateLayer;
	private container: HTMLElement;
	private focusRectLayer: FocusRectLayer;
	constructor(operateLayer: OperateLayer, focusRectLayer: FocusRectLayer, container: HTMLElement) {
		this.operateLayer = operateLayer;
		this.focusRectLayer = focusRectLayer;
		this.container = container;

		this.initView();

		this.enalbed = true;
		this.autoMark = true;
	}
	private _enalbed: boolean = true;
	/**
	 * 是否启用自动标示 
	 */
	public get enalbed(): boolean {
		return this._enalbed;
	}
	public set enalbed(value: boolean) {
		if (value) {
			this.attachAutoMarkContainerEvents();
		} else {
			this.dettachAutoMarkContainerEvents();
			this.containerMarkRect.stopMark();
			this.isStartMark = false;
		}
	}

	private _autoMark: boolean = false;
	private hideUserTipFlag = null;
	/**
	 * 自动标记容器
	 */
	public get autoMark(): boolean {
		return this._autoMark;
	}
	public set autoMark(value: boolean) {
		if (this._autoMark != value) {
			this._autoMark = value;
			if (!value) {
				this.containerMarkRect.stopMark();
				this.isStartMark = false;
			}
		}
	}

	/**
	 * 提示
	 */
	public promptTips(): void {
		if(!this.enalbed){
			return;
		}
		if(this.hideUserTipFlag){
			clearTimeout(this.hideUserTipFlag);
			this.hideUserTipFlag = null;
		}
		this.showUserTip();
		this.hideUserTipFlag = setTimeout(() => {
			this.hideUserTip();
		}, 3 * 1000);
	}

	//目标容器识别组件
	private containerMarkRect: ContainerMarkRect;
	//用户提示标示
	private tipDisplay: HTMLElement;

	private initView(): void {
		this.containerMarkRect = new ContainerMarkRect();
		this.containerMarkRect.render(this.focusRectLayer.rootContainer);
		this.containerMarkRect.focusRectLayer = this.focusRectLayer;


		this.tipDisplay = document.createElement('div');
		this.tipDisplay.innerText = localize('aouomarkLayer.initView.desc','Move between containers - Alt');
		this.tipDisplay.style.position = 'absolute';
		this.tipDisplay.style.padding = '10px 20px';
		this.tipDisplay.style.background = 'rgba(0,0,0,0.5)';
		this.tipDisplay.style.transform = 'translate(-50%,0)';
		this.tipDisplay.style.borderRadius = '5px';
		this.tipDisplay.style.left = '50%';
		this.tipDisplay.style.bottom = '5%';
	}

	
	private exmlModel: IExmlModel;
	public setup(exmlModel: IExmlModel) {
		this.detachEventListener();
		this.exmlModel = exmlModel;
		this.attachEventListener();
	}

	private listenerList: IDisposable[] = [];
	private attachEventListener(): void {
		if (this.exmlModel) {
			this.listenerList.push(this.exmlModel.onDesignConfigChanged(this.exmlModelConfigChangeHandle, this));
		}
	}
	private detachEventListener(): void {
		if (this.exmlModel) {
			this.listenerList.forEach(v => { v.dispose() });
			this.listenerList = [];
		}
	}

	private exmlModelConfigChangeHandle(): void {
		let userAutoLayerMark: boolean = this.exmlModel.getDesignConfig().globalAutoLayerMarkEnable;
		if (!userAutoLayerMark) {
			this.containerMarkRect.stopMark();
			this.isStartMark = false;
		}
		// if (this.userTip.stage) {
		// 	this.showUserTip();
		// }
	}

	cacheStageX: number;
	cacheStageY: number;
	//添加容器自动识别事件
	private attachAutoMarkContainerEvents(): void {
		P9TTargetAdapterEventContext.addEventListener(P9TTargetAdapterEvent.BEGINTRANSFORM, this.P9TEventHandle, this);
		P9TTargetAdapterEventContext.addEventListener(P9TTargetAdapterEvent.UPDATETRANSFORM, this.P9TEventHandle, this);
		P9TTargetAdapterEventContext.addEventListener(P9TTargetAdapterEvent.ENDTRANSFORM, this.P9TEventHandle, this);

	}
	//移除容器自动识别事件
	private dettachAutoMarkContainerEvents(): void {
		P9TTargetAdapterEventContext.removeEventListener(P9TTargetAdapterEvent.BEGINTRANSFORM, this.P9TEventHandle, this);
		P9TTargetAdapterEventContext.removeEventListener(P9TTargetAdapterEvent.UPDATETRANSFORM, this.P9TEventHandle, this);
		P9TTargetAdapterEventContext.removeEventListener(P9TTargetAdapterEvent.ENDTRANSFORM, this.P9TEventHandle, this);
	}

	private isStartMark: boolean = false;
	private cacheOffset: Point;
	private isFirstTransform: boolean = true;//一个变换周期中是否第一次触发UPDATETRANSFORM；
	//拖动代理时自动容器识别逻辑
	private P9TEventHandle(e: P9TTargetAdapterEvent): void {
		if (!e.data || e.data['key'] !== P9TTargetAdapterSyncOperateDefine.MOVE) {
			return;
		}
		let cacheMouseEvent: MouseEvent = e.data['mouseEvent'] as MouseEvent;

		//由于P9TTargetAdapterEventContext的事件是总线事件，当多个文档同时打开时，操作一个文档的变换其它文档也会收到事件
		//所以判断一下发生变换的代理对象是否属于自身
		let adapters = this.operateLayer.getAllUsefulAdapter().concat();
		//去掉根节点
		for (var i: number = adapters.length - 1; i >= 0; i--) {
			if ((adapters[i].operateTarget as FocusRectExt).targetNode.getIsRoot()) {
				adapters.splice(i, 1);
			}
		}
		let find: boolean = false;
		adapters.forEach(adapter => {
			if (e.targetAdapter === adapter) {
				find = true;
			}
		});
		//如果操作目标不可以动则直接返回
		if (!e.targetAdapter.operateTarget.canMove) {
			return;
		}
		if (find) {
			//let mosueEvent: egret.MouseEvent = e.data['mouseEvent'] as egret.MouseEvent;
			switch (e.type) {
				case P9TTargetAdapterEvent.BEGINTRANSFORM:
					this.containerMarkRect.stopMark();
					this.hideUserTip();
					this.isFirstTransform = true;

					var cacheAABB: Rectangle = this.focusRectLayer.getFocusRectBounds(e.targetAdapter.operateTarget as FocusRectExt);

					var mouseEvent: MouseEvent = e.data['mouseEvent'];
					this.cacheOffset = new Point(mouseEvent.clientX - cacheAABB.x, mouseEvent.clientY - cacheAABB.y);

					break;
				case P9TTargetAdapterEvent.UPDATETRANSFORM:
					this.showUserTip();
					if (this.hideUserTipFlag) {
						clearTimeout(this.hideUserTipFlag);
						this.hideUserTipFlag = null;
					}
					if (this.autoMark) {
						if (!this.isStartMark) {
							this.containerMarkRect.startMark(adapters);
							this.isStartMark = true;
						}
					} else {
						if (this.isStartMark) {
							this.containerMarkRect.stopMark();
							this.isStartMark = false;
						}
					}
					var mouseEvent: MouseEvent = e.data['mouseEvent'];
					this.containerMarkRect.findTargetRect(mouseEvent.clientX, mouseEvent.clientY);
					break;
				case P9TTargetAdapterEvent.ENDTRANSFORM:
					this.hideUserTip();
					this.isFirstTransform = true;
					if (this.isStartMark) {
						this.isStartMark = false;
						var target: FocusRectExt = this.containerMarkRect.stopMark();
						if (target) {
							var container: IContainer = target.targetNode as IContainer;
							if (container && isInstanceof(container, 'eui.IContainer')) {
								adapters.forEach((adapter) => {
									let targetParent: IContainer = (<FocusRectExt><any>adapter.operateTarget).targetNode.getParent();
									if (container !== targetParent) {
										this.cacheStageX = cacheMouseEvent.clientX - this.cacheOffset.x;
										this.cacheStageY = cacheMouseEvent.clientY - this.cacheOffset.y;
										setTimeout(() => {
											this.setDragNode((<FocusRectExt><any>adapter.operateTarget).targetNode, container);
										}, 20);
									}
								});
							}
						}
					}
					break;
			}
		}
	}

	private showUserTip(): void {
		if (!this.container) {
			return;
		}
		this.container.appendChild(this.tipDisplay);
		this.tipDisplay.innerText = this.getTipText();
	}
	private hideUserTip(): void {
		this.tipDisplay.remove();
	}
	private getTipText(): string {
		if (this.autoMark) {
			return "自动拖入容器 - Alt";
		}
		return "当前容器层移动 - Alt";
	}

	private setDragNode(dragNode: INode, container: IContainer) {
		if (isInstanceof(container, 'eui.IScroller')) {
			dragNode.setProperty('width', null);
			dragNode.setProperty('height', null);
			(<IScroller>container).setDirectChild(dragNode);
		}
		else {
			//todo fuck 这里对于进行了约束的节点，在切换层级的时候，没有对约束进行兼容。
			container.addNode(dragNode);
			var pos: Point = MatrixUtil.globalToLocalForEgret(container.getInstance(), new Point(this.cacheStageX, this.cacheStageY));
			pos.x = Math.round(pos.x);
			pos.y = Math.round(pos.y);
			if (pos.x !== 0) {
				dragNode.setProperty('left', null);
				dragNode.setProperty('right', null);
				dragNode.setProperty('horizontalCenter', null);
				dragNode.setNumber('x', Math.floor(pos.x * 1000000) / 1000000);
			}
			if (pos.y !== 0) {
				dragNode.setProperty('top', null);
				dragNode.setProperty('bottom', null);
				dragNode.setProperty('verticalCenter', null);
				dragNode.setNumber('y', Math.floor(pos.y * 1000000) / 1000000);
			}
		}
		dragNode.setSelected(true);
	}



	/**
	 * 释放
	 */
	public dispose(): void {
		this.operateLayer = null;
		this.container = null;
		this.focusRectLayer = null;
		this.tipDisplay.remove()
		this.containerMarkRect.stopMark();
		this.containerMarkRect.removeFromParent();
		this.containerMarkRect.focusRectLayer = null;
	}
}