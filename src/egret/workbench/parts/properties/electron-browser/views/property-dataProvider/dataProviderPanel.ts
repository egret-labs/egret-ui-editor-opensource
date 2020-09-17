import { InnerBtnWindow } from 'egret/platform/innerwindow/browser/innerWindow';
import { localize } from 'egret/base/localization/nls';
import { SystemButton } from 'egret/base/browser/ui/buttons';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { InnerButtonType } from 'egret/platform/innerwindow/common/innerWindows';
import { addClass } from 'egret/base/common/dom';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { DataProviderEditor } from './dataProviderEditor';
import { NewAttributePanel } from './newAttributePanel';
import { INode, IObject, IArray, IValue } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { EUI } from 'egret/exts/exml-exts/exml/common/project/parsers/core/commons';


export class DataProviderPanel extends InnerBtnWindow {

	private disposables: IDisposable[] = [];
	/**
	 *
	 */
	constructor(private model: IExmlModel, private node: INode) {
		super();
		this.title = localize('DataProviderPanel.title', 'Edit data source');

		// 设置窗体按钮
		this.initButtons(
			{ label: localize('alert.button.confirm', 'Confirm'), closeWindow: false },
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

	private dataEditor: DataProviderEditor;
	/**
	 * 重载父类方法，对窗体进行渲染
	 */
	public render(contentGroup: HTMLElement): void {
		super.render(contentGroup);
		contentGroup.style.width = '560px';
		contentGroup.style.height = '400px';
		contentGroup.style.padding = '12px';
		contentGroup.style.display = 'flex';
		contentGroup.style.flexDirection = 'column';

		const header = document.createElement('div');
		addClass(header, 'dataprovider-panel');
		header.style.display = 'flex';
		header.style.marginBottom = '12px';
		contentGroup.appendChild(header);

		const addAttributeBtn = new SystemButton(header);
		addAttributeBtn.label = localize('DataProviderPanel.addAttribute', 'Add Attribute');
		addAttributeBtn.onClick(this.addAttribute, this);

		const addItemBtn = new SystemButton(header);
		addItemBtn.label = localize('DataProviderPanel.addItem', 'Add Item Data');
		addItemBtn.style.marginLeft = '12px';
		addItemBtn.onClick(this.addItem, this);

		const editorContainer = document.createElement('div');
		addClass(editorContainer, 'dataprovider-content');
		editorContainer.style.height = '100%';
		editorContainer.style.overflow = 'hidden';
		contentGroup.appendChild(editorContainer);

		this.dataEditor = new DataProviderEditor(editorContainer);
		this.dataEditor.setData(this.getDataProviderEditData());
	}

	private addAttribute(): void {
		const attWindow = new NewAttributePanel((name) => {
			if (name) {
				this.dataEditor.addProperty(name);
			}
		});
		attWindow.open(this, true);
	}

	private addItem(): void {
		this.dataEditor.addItem();
	}
	

	/**获取节点数据源编辑数据
	 * 返回：数组
	*/
	public getDataProviderEditData(): Object[] {
		const array: Object[] = [];
		const node: INode = this.node;
		const dataProvider: IObject = node.getProperty('dataProvider') as IObject;
		if (dataProvider) {
			if (dataProvider.getName() === 'ArrayCollection') {
				const source: IArray = dataProvider.getProperty('source') as IArray;
				if (source) {

					for (let i = 0; i < source.getLength(); i++) {
						const eObject: IObject = source.getValueAt(i) as IObject;
						if (eObject) {
							//todo 暂时只支持一维数据
							const obj = {};
							const keys = eObject.getPropertyList();
							for (var j = 0; j < keys.length; j++) {
								const key: string = keys[j];
								const valueNode: IValue = eObject.getProperty(key);
								const value = valueNode.getInstance();
								if (typeof value === 'string') {
									obj[key] = value;
								} else {
									obj[key] = 'null';
								}
							}
							if (obj) {
								array.push(obj);
							}
						}
					}
				}
			} else if (dataProvider.getName() === 'ObjectCollection') {

			}
		}
		return array;

	}
	/**设置节点数据源编辑数据
	 * 值：数组
	*/
	public setDataProviderEditorData(v: Object[]) {
		const node: INode = this.node;
		const instance = this.model.getExmlConfig().getInstanceById('ArrayCollection', EUI);
		if (instance && v?.length > 0) {
			node.setProperty('dataProvider', this.model.createIObject('ArrayCollection', EUI, instance));
			const arrayCollection: IObject = node.getProperty('dataProvider') as IObject;
			const array: IArray = this.model.createIArray();
			if (v !== null) {
				for (let i = 0; i < v.length; i++) {
					const object: IObject = this.model.createIObject('Object', EUI);
					for (const key in v[i]) {
						object.setString(key, v[i][key]);
					}
					array.push(object);
				}
			}
			arrayCollection.setProperty('source', array);
		} else {
			node.setProperty('dataProvider', null);
		}
	}

	private save() {
		this.setDataProviderEditorData(this.dataEditor.getData());
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