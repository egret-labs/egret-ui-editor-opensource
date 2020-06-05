import { InnerBtnWindow } from 'egret/platform/innerwindow/browser/innerWindow';
import { localize } from 'egret/base/localization/nls';
import { IExmlModel } from '../../../common/exml/models';
import { IDesignConfig } from '../../../common/exml/designConfig';
import { BackgroundType } from '../../../common/exml/designConfigImpl';
import { remote } from 'electron';
import { isMacintosh } from 'egret/base/common/platform';
import { NumberInput } from 'egret/base/browser/ui/inputs';
import { AttributeItemGroup } from 'egret/base/browser/ui/containers';
import { SystemButton } from 'egret/base/browser/ui/buttons';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { InnerButtonType } from 'egret/platform/innerwindow/common/innerWindows';
import { Tabbar } from 'egret/base/browser/ui/tabbars';
import { addClass } from 'egret/base/common/dom';
import { DataBindingEditor, IBindingData } from './databindingEditor';
import { IconButton } from 'egret/base/browser/ui/buttons';


export class DataBindingPanel extends InnerBtnWindow {

	private disposables: IDisposable[] = [];
	/**
	 *
	 */
	constructor(model: IExmlModel) {
		super();
		this.title = localize('DataBindingPanel.title', 'Binding test data settings');
		this.model = model;

		if (this.model) {
			this.designConfig = this.model.getDesignConfig();
		}

		// 设置窗体按钮
		this.initButtons(
			{ label: localize('alert.button.save', 'Save'), closeWindow: false },
			{ label: localize('alert.button.cancel', 'Cancel') }
		);

		this.registerListeners();
	}

	/**
	 * 注册监听事件
	 */
	private registerListeners(): void {
		// 监听按钮点击事件
		this.disposables.push(this.onButtonClick(e => this.handleBtnClick(e)));
	}

	/**
	 * 按钮点击绑定事件
	 */
	private handleBtnClick(button: InnerButtonType): void {
		switch (button) {
			// 应用到当前文件
			case InnerButtonType.FIRST_BUTTON:
				this.save();
				break;
			// 左上角关闭按钮
			case InnerButtonType.CLOSE_BUTTON:
				break;
		}
	}

	private tabbar: Tabbar;
	private currentDataEditor: DataBindingEditor;
	private globalDataEditor: DataBindingEditor;
	/**
	 * 重载父类方法，对窗体进行渲染
	 */
	public render(contentGroup: HTMLElement): void {
		super.render(contentGroup);
		contentGroup.style.width = '560px';
		contentGroup.style.height = '400px'
		contentGroup.style.padding = '12px';
		contentGroup.style.paddingRight = '0px';
		contentGroup.style.display = 'flex';
		contentGroup.style.flexDirection = 'column';

		const header = document.createElement('div');
		addClass(header, 'databinding-panel')
		header.style.display = 'flex';
		contentGroup.appendChild(header);

		this.tabbar = new Tabbar(header);
		this.tabbar.dataProvider = [
			{ iconClass: '', label: localize('DataBindingPanel.initTab.current', 'Current file data'), id: 'current', style: 'tab-item', size: 25 },
			{ iconClass: '', label: localize('DataBindingPanel.initTab.all', 'Global data'), id: 'all', style: 'tab-item', size: 25 }
		];
		addClass(this.tabbar.getElement(), 'databinding-tabbar');
		this.tabbar.onSelectedChanged(() => this.tabbarChanged_handler());

		const addBtn = new IconButton(header);
		addBtn.style.marginLeft = '12px';
		addBtn.iconClass = 'add-data';
		addBtn.onClick(this.addItem, this);

		const editorContainer = document.createElement('div');
		addClass(editorContainer, 'databinding-content')
		editorContainer.style.height = '100%';
		editorContainer.style.overflow = 'hidden';
		contentGroup.appendChild(editorContainer);

		this.currentDataEditor = new DataBindingEditor(editorContainer);
		this.globalDataEditor = new DataBindingEditor(editorContainer);
		this.globalDataEditor.hide();
		this.initData();
	}

	private addItem(): void {
		if (this.tabbar.selection.id == 'current') {
			this.currentDataEditor.addItem();
		} else if (this.tabbar.selection.id === 'all') {
			this.globalDataEditor.addItem();
		}
	}

	private tabbarChanged_handler(): void {
		if (this.tabbar.selection.id == 'current') {
			this.currentDataEditor.show();
			this.globalDataEditor.hide();

		} else if (this.tabbar.selection.id === 'all') {
			this.currentDataEditor.hide();
			this.globalDataEditor.show();
		}
	}

	private initData() {
		if (this.model && this.designConfig) {
			let currentData: IBindingData[] = this.designConfig.bindingDataTestObj;
			if (!currentData) {
				currentData = [];
			}
			this.currentDataEditor.setData(currentData);
			let globalData: IBindingData[] = this.designConfig.globalBindingDataTestObj;
			if (!globalData) {
				globalData = [];
			}
			this.globalDataEditor.setData(globalData);
		}
	}

	private model: IExmlModel;
	private designConfig: IDesignConfig;

	private save() {
		if(!this.currentDataEditor.isInputValid()){
			this.tabbar.selectedIndex = 0;
			this.currentDataEditor.show();
			this.globalDataEditor.hide();
			return;
		}
		if(!this.globalDataEditor.isInputValid()) {
			this.tabbar.selectedIndex = 1;
			this.currentDataEditor.hide();
			this.globalDataEditor.show();
			return;
		}
		this.designConfig.bindingDataTestObj = this.currentDataEditor.getData();
		this.designConfig.globalBindingDataTestObj = this.globalDataEditor.getData();
		this.model.refreshTree();
		this.close();
	}

	/**
	 * 清理
	 */
	public dispose() {
		super.dispose();
		dispose(this.disposables);
	}
}