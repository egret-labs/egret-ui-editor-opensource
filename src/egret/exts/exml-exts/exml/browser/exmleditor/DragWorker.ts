import { IExmlModel } from "../../common/exml/models";
import { DragRect } from "./rendercomp/DragRect";
import { ContainerMarkRect } from "./rendercomp/ContainerMarkRect";
import { Namespace } from "egret/exts/exml-exts/exml/common/sax/Namespace";
import { EUI } from "egret/exts/exml-exts/exml/common/project/parsers/core/commons";
import { INode, IViewStack, isInstanceof, IContainer, IScroller } from "egret/exts/exml-exts/exml/common/exml/treeNodes";
import { localize } from "vs/nls";
import { MatrixUtil } from "./t9transformer/util/MatrixUtil";
import { Point } from "./data/Point";
import { FocusRectExt, FocusRectLayer } from "./FocusRectLayer";
import { getNamespaces } from "egret/exts/exml-exts/exml/common/sax/xml-strUtils";
import { IExmlViewContainer } from "../editors";
import { ExmlFileEditor } from "../exmlFileEditor";
import { IClipboardService } from "egret/platform/clipboard/common/clipboardService";
import { IRuntimeAPI } from "egret/exts/exml-exts/exml/runtime/runtime";

/**
 * eui可视化编辑用户拖拽操作层。
 * 此层主要负责从其它面板到eui编辑面板的拖拽操作
 */
export class DragWorker {
	constructor() {
	}
	private _dragEnabled: boolean = true;
	/**是否允许拖拽 */
	public set dragEnabled(v: boolean) {
		this._dragEnabled = v;
	}
	public get dragEnabled(): boolean {
		return this._dragEnabled;
	}
	private exmlModel: IExmlModel;
	private focusRectLayer: FocusRectLayer;
	private container: HTMLElement;
	/**目标容器标记层 */
	private containerRect: ContainerMarkRect;
	/** 拖拽时组件的尺寸预览框框*/
	private dragRect: DragRect;
	private rootContainer: ExmlFileEditor;

	private clipboardService: IClipboardService;

	private runtime: IRuntimeAPI;

	public init(focusRectLayer: FocusRectLayer, container: HTMLElement, rootContainer: IExmlViewContainer, clipboardService: IClipboardService) {
		this.rootContainer = rootContainer as ExmlFileEditor;
		this.focusRectLayer = focusRectLayer;
		this.container = container;
		this.clipboardService = clipboardService;
		this.containerRect = new ContainerMarkRect();
		this.dragRect = new DragRect();
		this.attachEvent();
	}
	public setup(model: IExmlModel, runtime: IRuntimeAPI) {
		this.exmlModel = model;
		this.runtime = runtime;
	}


	private attachEvent(): void {
		this.container.addEventListener('dragenter', this.dragEventHandler);
		this.container.addEventListener('dragover', this.dragEventHandler);
		this.container.addEventListener('drop', this.dragEventHandler);
		this.container.addEventListener('dragleave', this.dragEventHandler, true);
		this.container.addEventListener('dragend', this.dragEventHandler)
	}
	private detachEvent(): void {
		this.container.removeEventListener('dragenter', this.dragEventHandler);
		this.container.removeEventListener('dragover', this.dragEventHandler);
		this.container.removeEventListener('drop', this.dragEventHandler);
		this.container.removeEventListener('dragleave', this.dragEventHandler, true);
		this.container.removeEventListener('dragend', this.dragEventHandler);
	}

	private dragEventHandler = (e: DragEvent) => {

		switch (e.type) {
			case 'dragenter':
				setTimeout(() => {
					this.onDragEnter(e);
				}, 0);
				break;
			case 'dragover':
				this.onDragOver(e);
				break;
			case 'drop':
				this.onDrop(e);
				break;
			case 'dragleave':
				this.onDragLeave(e);
				break;
		}
	}

	//----------------------------------##拖拽相关----------------------------------
	private createNodeFromDrag(nodeData): INode {
		if (!nodeData) {
			return null;
		}
		var id: string = nodeData['id'];
		var type: string = nodeData['type'];
		var ns: Namespace = null;
		if (type === 'custom') {
			var className: string = id;
			var temp: Array<string> = className.split('.');
			id = temp[temp.length - 1];
			ns = this.exmlModel.getExmlConfig().getProjectConfig().createNamespace(className, getNamespaces(this.exmlModel.getText()));
		} else if (type === 'default') {
			if (!nodeData.ns.prefix) {
				ns = new Namespace(nodeData.ns._prefix, nodeData.ns._uri);
			}
			else {
				ns = new Namespace((<Namespace>(nodeData.ns)).prefix, (<Namespace>(nodeData.ns)).uri);
			}
		}
		if (!ns || !id) {
			return null;
		}
		var instance: any = this.exmlModel.getExmlConfig().getInstanceById(id, ns);
		if (!instance) {
			return null;
		}
		var node: INode;
		if (this.exmlModel.getExmlConfig().isInstance(instance, 'eui.ViewStack')) {
			node = this.exmlModel.createIViewStack(id, ns, instance);
		} else if (this.exmlModel.getExmlConfig().isInstance(instance, 'eui.Scroller')) {
			node = this.exmlModel.createIScroller(id, ns, instance);
		} else if (this.exmlModel.getExmlConfig().getDefaultPropById(id, ns) === 'elementsContent') {
			node = this.exmlModel.createIContainer(id, ns, instance);
		} else {
			node = this.exmlModel.createINode(id, ns, instance);
		}
		this.attachInitProperty(node, this.exmlModel, nodeData.data);
		return node;
	}
	private attachInitProperty(node: INode, model: IExmlModel, data: any): void {
		var instance: any = node.getInstance();
		var viewStack: IViewStack = <any>node;
		if (isInstanceof(viewStack, 'eui.IViewStack')) {
			var groupNode: IContainer = model.createIContainer('Group', EUI);
			groupNode.setSize('width', '100%');
			groupNode.setSize('height', '100%');
			groupNode.setString('name', localize('group', "Group"));
			viewStack.addNode(groupNode);
		}

		if (isInstanceof(node, 'eui.IScroller')) {
			(<any>node).setDirectChild(<any>model.createIContainer('Group', EUI));
			node.setSize('width', 200);
			node.setSize('height', 200);
		}
		if (model.getExmlConfig().isInstance(instance, 'eui.EditableText')) {
			node.setSize('width', 100);
			node.setSize('height', 100);
			node.setString('text', localize('label', "Label"));
		}
		else if (model.getExmlConfig().isInstance(instance, 'eui.Group') ||
			model.getExmlConfig().isInstance(instance, 'eui.Scroller')) {
			node.setSize('width', 200);
			node.setSize('height', 200);
		}
		else if (model.getExmlConfig().isInstance(instance, 'eui.Label')) {
			node.setString('text', localize('label', "Label"));
		}
		else if (model.getExmlConfig().isInstance(instance, 'eui.RadioButton')) {
			node.setString('label', localize('radioButton', "RadioButton"));
		}
		else if (model.getExmlConfig().isInstance(instance, 'eui.CheckBox')) {
			node.setString('label', localize('checkBox', "CheckBox"));
		}
		else if (model.getExmlConfig().isInstance(instance, 'eui.ToggleButton')) {
			node.setString('label', localize('toggleButton', "ToggleButton"));
		}
		else if (model.getExmlConfig().isInstance(instance, 'eui.Button')) {
			node.setString('label', localize('button', "Button"));
		}
		else if (model.getExmlConfig().isInstance(instance, 'eui.Image')) {
			if (data && data.source) {
				var source: string = data.source;
				var scale9gridData: string = data.scale9gridData;
				if (source) {
					node.setString('source', source);
				}
				if (scale9gridData) {
					node.setScale9Grid(scale9gridData);
				}
			} else {
				node.setSize('width', 20);
				node.setSize('height', 20);
			}
		} else if (model.getExmlConfig().isInstance(instance, 'eui.Rect')) {
			node.setSize('width', 20);
			node.setSize('height', 20);
		} else if (!instance.width && !instance.height) {
			node.setSize('width', 20);
			node.setSize('height', 20);
		}
	}

	private acceptDrag: boolean = false;
	private otherDragData: any[];

	private drageNode: INode;

	private cacheClipboard: string = '';

	protected onDragEnter(event: DragEvent) {
		this.acceptDrag = false;
		if (!this.dragEnabled || !this.exmlModel || !this.exmlModel.getRootNode()) {
			event.dataTransfer.dropEffect = 'none';
			return;
		}

		this.cacheClipboard = this.clipboardService.readText('eui-node');
		if (this.cacheClipboard) {
			let nodeData: any = null;
			try {
				nodeData = JSON.parse(this.cacheClipboard);
			} catch (error) {

			}
			if (!nodeData) {
				return;
			}

			this.drageNode = this.createNodeFromDrag(nodeData);
			if (isInstanceof(this.drageNode, 'eui.INode')) {
				if (!this.drageNode.getInstance()) {
					return;
				}
			}
		}

		if (event.dataTransfer.types.indexOf['eui-node'] !== -1) {
			if (this.exmlModel.getSelectedNodes().length === 0) {
				this.exmlModel.getRootNode().setSelected(true);
			}

			// 添加到舞台并且设置为不可见
			if (this.runtime.runtimeRootContainer && !this.drageNode.getParent()) {
				this.drageNode.setBoolean('visible', false);
				this.drageNode.addEgretEventlistener('resize', this.onTargetResize, this)
				this.runtime.runtimeRootContainer.addChild(this.drageNode.getInstance());
				if ('validateNow' in this.drageNode.getInstance()) {
					this.drageNode.getInstance().validateNow();
				}
			}

			this.containerRect.render(this.focusRectLayer.rootContainer);
			// this.containerRect.render(this.container);
			//开始标记目标容器
			this.containerRect.startMark();
			this.containerRect.focusRectLayer = this.focusRectLayer;
			this.dragRect.render(this.container);
			event.dataTransfer.dropEffect = 'link';
			this.acceptDrag = true;
		}
	}

	private onTargetResize(event: any = null): void {
		if (this.drageNode && this.drageNode.getInstance()) {
			var element: any = this.drageNode.getInstance();
			// TODO 可以在这里处理缩放
			let widthNode = Math.ceil(element.layoutBoundsWidth * this.focusRectLayer.scale);
			let heightNode = Math.ceil(element.layoutBoundsHeight * this.focusRectLayer.scale);
			if (widthNode !== 0 || heightNode !== 0) {
				let pos: Point = MatrixUtil.globalToLocal(this.container, new Point(event.clientX, event.clientY));
				this.dragRect.setBounds(pos.x, pos.y, widthNode, heightNode);
			}
		}
	}

	private onDragOver(event: DragEvent): void {
		if (!this.acceptDrag) {
			return;
		}
		//这里要设置为false,要不然不会触发drop事件
		event.returnValue = false;
		var pos: Point = MatrixUtil.globalToLocal(this.container, new Point(event.clientX, event.clientY));
		this.dragRect.setBounds(pos.x, pos.y, this.dragRect.width, this.dragRect.height);
		this.containerRect.findTargetRect(event.clientX, event.clientY);
	}


	private onDragLeave(event: DragEvent): void {
		this.clear();
	}


	private onDrop(event: DragEvent): void {
		if (!this.acceptDrag) {
			return;
		}
		//停止标记目标容器
		let targetRect: FocusRectExt = this.containerRect.stopMark();
		if (targetRect) {
			//注意:只有在drop事件中才能获取到拖拽数据
			let dragData = event.dataTransfer.getData('eui-node');
			var nodeData: any = JSON.parse(dragData);
			this.otherDragData = nodeData.otherDragData;
			//创建节点
			var node: INode = this.createNodeFromDrag(nodeData);
			var container: IContainer = targetRect.targetNode as IContainer;
			if (node && node.getInstance() && container) {
				for (var i = 0; i < this.exmlModel.getSelectedNodes().length; i++) {
					var selectNode: INode = this.exmlModel.getSelectedNodes()[i];
					selectNode.setSelected(false);
				}
				if (isInstanceof(container, 'eui.IScroller')) {
					if (this.exmlModel.getExmlConfig().isInstance(node.getInstance(), 'eui.IViewport')) {
						this.setDragNode(node, container, event);
						if (this.otherDragData) {
							this.otherDragData.forEach(nodeData => {
								var node: INode = this.createNodeFromDrag(nodeData);
								this.setDragNode(node, container, event);
							});
						}
					}
				} else {
					this.setDragNode(node, container, event);
					if (this.otherDragData) {
						this.otherDragData.forEach(nodeData => {
							var node: INode = this.createNodeFromDrag(nodeData);
							this.setDragNode(node, container, event);
						});
					}
				}

				this.rootContainer.focus();
			}
		}

		this.clear();
		this.clipboardService.clear('eui-node');
	}

	private setDragNode(dragNode: INode, container: IContainer, event: DragEvent) {
		if (isInstanceof(container, 'eui.IScroller')) {
			dragNode.setProperty('width', null);
			dragNode.setProperty('height', null);
			(<IScroller>container).setDirectChild(dragNode);
		}
		else {
			container.addNode(dragNode);
			var pos: Point = MatrixUtil.globalToLocalForEgret(container.getInstance(), new Point(event.clientX, event.clientY));
			pos.x = Math.round(pos.x);
			pos.y = Math.round(pos.y);
			if (pos.x !== 0) {
				dragNode.setNumber('x', Math.floor(pos.x * 1000000) / 1000000);
			}
			if (pos.y !== 0) {
				dragNode.setNumber('y', Math.floor(pos.y * 1000000) / 1000000);
			}
		}
		//todo 查找为什么addNode之后的instance的visible的属性是false
		setTimeout(() => {
			dragNode.setSelected(true);
		}, 100);
	}


	private removeDragingNode(): void {
		if (this.drageNode && this.drageNode.getInstance() && this.drageNode.getInstance().parent) {
			this.drageNode.getInstance().parent.removeChild(this.drageNode.getInstance());
		}
		this.drageNode && this.drageNode.removeEgretEventlistener('resize', this.onTargetResize, this)
		this.drageNode = null;
	}
	private clear(): void {
		//停止标记目标容器
		this.removeDragingNode();
		this.containerRect.stopMark();
		this.containerRect.removeFromParent();
		this.dragRect.removeFromParent();
	}
	public disopose(): void {
		if (this.container) {
			this.detachEvent();
			this.clear();
			this.clipboardService = null;
		}
	}
}

