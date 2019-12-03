import { InnerBtnWindow } from 'egret/platform/innerwindow/browser/innerWindow';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { InnerButtonType, IInnerWindow } from 'egret/platform/innerwindow/common/innerWindows';
import { ExmlStat, ExmlComponentDataSource, ExmlComponentRenderer, ExmlComponentDragAndDrop, ExmlComponentController, ExmlComponentTreeFilter } from 'egret/workbench/parts/exml/ExmlComponentViewer';
import { TextInput } from 'egret/base/browser/ui/inputs';
import { Tree } from 'vs/base/parts/tree/browser/treeImpl';
import { IHost } from 'egret/exts/exml-exts/exml/common/project/exmlConfigs';
import { localize } from '../../../base/localization/nls';
/**
 * 新建Exml
 */
export class ExmlComponentPanel extends InnerBtnWindow {
	// 确认按钮事件
	public confirm: Function;
	// 取消按钮事件
	public cancel: Function;

	private cacheExmlStat: ExmlStat;

	private toDisposes: IDisposable[] = [];

	

	private treeFilter: ExmlComponentTreeFilter;

	constructor(euiHost: Array<any>) {
		super();
		this.listFocus_handler = this.listFocus_handler.bind(this);
		this.keyDown_handler = this.keyDown_handler.bind(this);
		// 设置窗体标题
		this.title = localize('exmlComponentPanel.constructor.title', 'Select Host Component');

		this.euiHost = euiHost;
		// 设置窗体按钮
		this.initButtons(
			{ label: localize('alert.button.confirm', 'Confirm') },
			{ label: localize('alert.button.cancel', 'Cancel') },
		);
		// 注册监听事件
		this.registerListeners();
	}


	private _euiHost: Array<any>;
	public set euiHost(_euiHost) {
		this._euiHost = _euiHost;
	}

	public get euiHost(): Array<any> {
		return this._euiHost;
	}

	/**
	 * 弹出界面
	 * @param ownerWindow 
	 * @param modal 
	 */
	public open(ownerWindow?: IInnerWindow | 'root', modal?: boolean) {
		super.open(ownerWindow, modal);
		this.tree.layout();
		setTimeout(() => {
			this.input.getElement().focus();
		}, 40);
	}

	/**
	 * 注册监听事件
	 */
	private registerListeners(): void {
		// 监听按钮点击事件
		const dispose = this.onButtonClick(e => this.handleBtnClick(e));
		this.toDisposes.push(dispose);
	}

	/**
	 * 按钮点击绑定事件
	 */
	private handleBtnClick(button: InnerButtonType): void {
		switch (button) {
			// 确定按钮
			case InnerButtonType.FIRST_BUTTON:
				if (this.cacheExmlStat) {
					this.confirm(this.cacheExmlStat);
				}
				this.close();
				break;
			// 取消按钮
			case InnerButtonType.SECOND_BUTTON:
				break;
			// 左上角关闭按钮
			case InnerButtonType.CLOSE_BUTTON:
				break;
		}
	}


	doubleClick = (stat: ExmlStat) => {
		this.cacheExmlStat = stat;
		this.confirm(stat);
		this.close();
	}



	click = (stat: ExmlStat) => {
		this.cacheExmlStat = stat;
	}


	private input:TextInput = new TextInput();
	private tree: Tree;
	/**
	 * 重载父类方法，对窗体进行渲染
	 */
	public render(contentGroup: HTMLElement): void {
		super.render(contentGroup);

		contentGroup.style.display = 'flex';
		contentGroup.style.flexDirection = 'column';


		const container: HTMLDivElement = document.createElement('div');
		container.style.width = '420px';
		container.style.height = '300px';
		contentGroup.appendChild(container);
		this.input = new TextInput(container);
		container.style.margin = '10px';

		const treeContainer: HTMLDivElement = document.createElement('div');
		treeContainer.style.width = '100%';
		treeContainer.style.height = '95%';
		treeContainer.style.marginTop = '6px';
		container.appendChild(treeContainer);

		const dataSource: ExmlComponentDataSource = new ExmlComponentDataSource();
		const renderer: ExmlComponentRenderer = new ExmlComponentRenderer();
		const dnd: ExmlComponentDragAndDrop = new ExmlComponentDragAndDrop();
		const controller: ExmlComponentController = new ExmlComponentController(this.doubleClick, this.click);
		this.treeFilter = new ExmlComponentTreeFilter();
		this.tree = new Tree(treeContainer, { dataSource: dataSource, renderer: renderer, filter: this.treeFilter, controller, dnd }, { twistiePixels: 23 });

		const inputData: ExmlStat = this.initData();
		this.tree.setInput(inputData).then(() => {
			this.tree.layout();
			this.tree.selectNext();
		});

		this.tree.getHTMLElement().addEventListener('focus',this.listFocus_handler);
		this.input.getElement().addEventListener('keydown',this.keyDown_handler);
		this.tree.getHTMLElement().addEventListener('keydown',this.keyDown_handler);
		this.toDisposes.push(this.input.onValueChanging(value => this.textChanged_handler(value)));
	}
	private listFocus_handler(e:Event):void{
		this.input.getElement().focus();
	}

	private keyDown_handler(e:KeyboardEvent):void{
		if(e.keyCode == 13){
			if (this.cacheExmlStat) {
				this.confirm(this.cacheExmlStat);
			}
			this.close();
		}
		if(e.keyCode != 38 && e.keyCode != 40){
			return;
		}
		e.stopImmediatePropagation();
		e.stopPropagation();
		e.preventDefault();
		if(this.tree.getSelection().length == 0){
			this.tree.selectNext();
		}
		if(e.keyCode == 38){//上
			this.tree.selectPrevious();
		}else if(e.keyCode == 40){//下
			this.tree.selectNext();
		}
		const curSelections = this.tree.getSelection();
		let curSelection = null;
		if(curSelections.length > 0){
			curSelection = curSelections[0];
		}
		if(curSelection){
			this.tree.reveal(curSelection);
		}
		this.cacheExmlStat = curSelection;
	}

	private textChanged_handler(text:string):void{
		this.treeFilter.filterText = text;
		this.refreshList();
	}


	initData() {
		const root: ExmlStat = new ExmlStat();
		root.id = 'root';
		root.children = [];

		if (this.euiHost) {
			(this.euiHost as Array<IHost>).forEach(item => {
				const subStat = new ExmlStat();
				subStat.id = item.id + ' - ' + item.module;
				subStat.data = item;
				subStat.parent = root;
				root.children.push(subStat);
			});
		}
		return root;
	}

	private refreshList():void{
		this.tree.refresh();
		let existSelections = this.tree.getSelection();
		let existSelection:ExmlStat = null;
		if(existSelections.length == 0){
			this.tree.selectNext();
			existSelections = this.tree.getSelection();
			if(existSelections.length > 0){
				existSelection = existSelections[0];
			}
			if(existSelection){
				this.tree.reveal(existSelection);
			}
		}else{
			existSelection = existSelections[0];
		}
		this.cacheExmlStat = existSelection;
	}

	/**
	 * 释放资源
	 */
	public dispose() {
		super.dispose();
		dispose(this.toDisposes);
		dispose(this.tree);

		this.treeFilter = null;
		this.tree = null;
		this.cancel = null;
		this.confirm = null;
	}

}