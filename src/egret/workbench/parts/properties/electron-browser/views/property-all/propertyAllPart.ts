import { IUIBase, getTargetElement } from 'egret/base/browser/ui/common';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { AutoRefreshHelper } from '../../../common/autoRefreshers';
import { INode } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { getPropertiesByNodes, IProperty, PropertyType } from '../../../common/allPropertyHelpers';
import { localize } from 'egret/base/localization/nls';
import { ComboBox } from 'egret/base/browser/ui/comboboxs';
import { NumberInput, TextInput } from 'egret/base/browser/ui/inputs';
import { Event, Emitter } from 'egret/base/common/event';
import { ColorPicker } from 'egret/base/browser/ui/colorPicker';
import { toHexString, setPropertyNum, setPropertyNumPro, toHexNumber, setPropertyStr } from '../../../common/properties';
import { IDropDownTextDataSource } from 'egret/base/browser/ui/dropdowns';
import { HSVaColor } from 'egret/base/browser/ui/pickr/pickr';

/**
 * 所有属性部分
 */
export class PropertyAllPart implements IUIBase, IDisposable {

	private container: HTMLElement;
	protected el: HTMLElement;

	protected toDisposes: IDisposable[] = [];
	private autoRefresher: AutoRefreshHelper;

	private _onChanged: Emitter<void>;

	constructor(container: HTMLElement | IUIBase | null) {
		this.el = document.createElement('div');
		this.table = document.createElement('table');
		this._onChanged = new Emitter<void>();
		if (container) {
			this.create(container);
		}

		this.autoRefresher = new AutoRefreshHelper(null);
		this.toDisposes.push(this.autoRefresher.onChanged(e => this.relatePropsChanged_handler(e)));
		this.relatePropsChanged_handler([]);
	}
	/**
	 * 内容改变了
	 */
	public get onChanged(): Event<void> {
		return this._onChanged.event;
	}

	/**
	 * 核心dom对象
	 */
	public getElement(): HTMLElement {
		return this.el;
	}

	private _model: IExmlModel;
	/**
	 * 选中的IExmlModel
	 */
	public get model(): IExmlModel {
		return this._model;
	}
	public set model(value: IExmlModel) {
		this.doSetModel(value);
	}

	protected doSetModel(value: IExmlModel): void {
		this._model = value;
		this.autoRefresher.model = this._model;
		if (this._model) {
			this.relatePropsChanged_handler(this._model.getSelectedNodes());
		} else {
			this.relatePropsChanged_handler([]);
		}
	}
	/**
	 * 创建
	 * @param container 
	 */
	public create(container: HTMLElement | IUIBase): void {
		this.container = getTargetElement(container);
		this.container.appendChild(this.el);
		this.initView();
	}

	private table: HTMLTableElement;
	/**
	 * 初始化内容
	 * @param element 
	 */
	private initView(): void {
		this.el.appendChild(this.table);
	}

	private selectionNodes: INode[] = [];
	/**
	 * 关联的属性发生了改变
	 * @param nodes 
	 */
	private relatePropsChanged_handler(nodes: INode[]): void {
		this.selectionNodes = nodes;
		this.refreshAll();
	}

	private selectedNodesCache: INode[] = [];
	private refreshAll(): void {
		let props: IProperty[] = [];
		if (this.selectionNodes.length > 0 && this.model) {
			props = getPropertiesByNodes(this.selectionNodes, this.model);
		}
		let changed: boolean = false;
		if (this.selectedNodesCache.length != this.selectionNodes.length) {
			changed = true;
		} else {
			for (let i = 0; i < this.selectedNodesCache.length; i++) {
				if (this.selectedNodesCache[i] != this.selectionNodes[i]) {
					changed = true;
					break;
				}
			}
		}
		this.selectedNodesCache = this.selectionNodes.concat();
		if (changed) {
			this.reset(props);
			this._onChanged.fire();
		} else {
			this.update(props);
		}
	}

	private inputDisposables: IDisposable[] = [];
	private currentInputMap: { [propName: string]: IUIBase } = {};
	private reset(props: IProperty[]): void {
		this.table.innerHTML = '';
		this.currentInputMap = {};
		dispose(this.inputDisposables);
		this.doRenderTitle();
		this.doRenderRows(props);
	}

	private update(props: IProperty[]): void {
		this.doUpdateRows(props);
	}

	private doRenderTitle(): void {
		const tr = document.createElement('tr');
		const th1 = document.createElement('th');
		th1.innerText = localize('property.all.title.property', 'Property');
		th1.style.paddingLeft = '6px';
		th1.style.minWidth = '80px';
		th1.style.wordBreak = 'break-all';
		th1.style.whiteSpace = 'nowrap';
		th1.style.cursor = 'default';
		tr.appendChild(th1);
		const th2 = document.createElement('th');
		th2.innerText = localize('property.all.title.value', 'Value');
		th2.style.width = '100%';
		th2.style.wordBreak = 'break-all';
		th2.style.whiteSpace = 'nowrap';
		th2.style.cursor = 'default';
		th2.style.padding = '0 6px';
		tr.appendChild(th2);
		this.table.appendChild(tr);
	}
	private doRenderRows(props: IProperty[]): void {
		props.forEach(prop => {
			const tr = document.createElement('tr');
			const td1 = document.createElement('td');
			td1.style.paddingLeft = '6px';
			td1.style.wordBreak = 'break-all';
			td1.style.whiteSpace = 'nowrap';
			td1.style.cursor = 'default';
			td1.style.height = '28px';
			td1.innerText = prop.name;
			tr.appendChild(td1);
			const td2 = document.createElement('td');
			td2.style.padding = '0 6px';
			const input = this.createInput(prop, td2, null);
			this.currentInputMap[prop.name] = input;
			tr.appendChild(td2);
			this.table.appendChild(tr);
		});
	}
	private doUpdateRows(props: IProperty[]): void {
		props.forEach(prop => {
			const existInput = this.currentInputMap[prop.name];
			this.createInput(prop, null, existInput);
		});
	}

	private createInput(prop: IProperty, container: HTMLElement, existInput: IUIBase): IUIBase {
		switch (prop.type) {
			case PropertyType.Boolean:
				{
					const combobox = existInput ? existInput as ComboBox : new ComboBox(container);
					combobox.setDatas([
						{ id: 'true', data: 'true' },
						{ id: 'false', data: 'false' }
					]);
					if (prop.user != null && prop.user != '') {
						combobox.setSelection(prop.user);
					} else if (prop.default != null && prop.default != '') {
						combobox.setSelection(null);
						combobox.prompt = prop.default;
					} else {
						combobox.setSelection(null);
						combobox.prompt = '-';
					}
					if (!existInput) {
						this.inputDisposables.push(combobox);
						this.inputDisposables.push(combobox.onSelectChanged(t => this.booleanChanged_handler(t.getSelection(), prop)));
					}
					return combobox;
				}
			case PropertyType.Number:
				{
					let numberInput = existInput ? existInput as NumberInput : new NumberInput(container);
					numberInput.supportPercent = false;
					if (prop.minValue != null) {
						numberInput.minValue = prop.minValue;
					}
					if (prop.maxValue != null) {
						numberInput.maxValue = prop.maxValue;
					}
					numberInput.regulateStep = prop.step;
					if (prop.user != null && prop.user != '') {
						numberInput.text = prop.user;
					} else if (prop.default != null && prop.default != '') {
						numberInput.text = null;
						numberInput.prompt = prop.default;
					} else {
						numberInput.text = null;
						numberInput.prompt = '-';
					}
					if (!existInput) {
						this.inputDisposables.push(numberInput);
						this.inputDisposables.push(numberInput.onValueChanging(e => {
							this.numberChanging_handler(e ? Number.parseFloat(e) : null, prop);
						}));
						this.inputDisposables.push(numberInput.onValueChanged(e => {
							this.numberChanged_handler(e ? Number.parseFloat(e) : null, prop);
						}));
					}
					return numberInput;
				}
			case PropertyType.NumberWithPercent:
				{
					let numberInput = existInput ? existInput as NumberInput : new NumberInput(container);
					numberInput.supportPercent = true;
					if (prop.minValue != null) {
						numberInput.minValue = prop.minValue;
					}
					if (prop.maxValue != null) {
						numberInput.maxValue = prop.maxValue;
					}
					numberInput.regulateStep = prop.step;
					if (prop.user != null && prop.user != '') {
						numberInput.text = prop.user;
					} else if (prop.default != null && prop.default != '') {
						numberInput.text = null;
						numberInput.prompt = prop.default;
					} else {
						numberInput.text = null;
						numberInput.prompt = '-';
					}
					if (!existInput) {
						this.inputDisposables.push(numberInput);
						this.inputDisposables.push(numberInput.onValueChanging(e => {
							if (e) {
								if (e.indexOf('%') != -1) {
									const value = e;
									this.numberPercentChanging_handler(value, prop);
								} else {
									const value = Number.parseFloat(e);
									this.numberChanging_handler(value, prop);
								}
							} else {
								this.numberChanging_handler(null, prop);
							}
						}));
						this.inputDisposables.push(numberInput.onValueChanged(e => {
							if (e) {
								if (e.indexOf('%') != -1) {
									const value = e;
									this.numberPercentChanged_handler(value, prop);
								} else {
									const value = Number.parseFloat(e);
									this.numberChanged_handler(value, prop);
								}
							} else {
								this.numberChanged_handler(null, prop);
							}
						}));
					}
					return numberInput;
				}
			case PropertyType.String:
				if (prop.available && prop.available.length > 0) {
					const combobox = existInput ? existInput as ComboBox : new ComboBox(container);
					const datas = [];
					prop.available.forEach(availableValue => {
						datas.push({ id: availableValue, data: availableValue });
					});
					combobox.setDatas(datas);
					if (prop.user != null && prop.user != '') {
						combobox.setSelection(prop.user);
					} else if (prop.default != null && prop.default != '') {
						combobox.setSelection(null);
						combobox.prompt = prop.default;
					} else {
						combobox.setSelection(null);
						combobox.prompt = '-';
					}
					if (!existInput) {
						this.inputDisposables.push(combobox);
						this.inputDisposables.push(combobox.onSelectChanged(t => this.stringsChanged_handler(t.getSelection(), prop)));
					}
					return combobox;
				} else {
					const input = existInput ? existInput as TextInput : new TextInput(container);
					if (prop.user != null) {
						input.text = prop.user;
					} else if (prop.default != null) {
						input.text = null;
						input.prompt = prop.default;
					} else {
						input.text = null;
						input.prompt = '-';
					}
					if (!existInput) {
						this.inputDisposables.push(input);
						this.inputDisposables.push(input.onValueChanged(e => this.stringChanged_handler(e, prop)));
					}
					return input;
				}
			case PropertyType.Color:
				{
					let color: string = null;
					if (prop.user) {
						color = toHexString(prop.user as any, '#');
					} else if (prop.default) {
						color = toHexString(prop.default as any, '#');
					}
					const colorPicker = existInput ? existInput as ColorPicker : new ColorPicker(container, color);
					colorPicker.setColor(color);
					if (!existInput) {
						this.inputDisposables.push(colorPicker);
						this.inputDisposables.push(colorPicker.onDisplay(() => this.colorDisplay_handler(prop)));
						this.inputDisposables.push(colorPicker.onChanged(e => this.colorChanged_handler(e, prop)));
						this.inputDisposables.push(colorPicker.onSaved(e => this.colorSaved_handler(e, prop)));
						this.inputDisposables.push(colorPicker.onCanceled(() => this.colorCanceled_handler(prop)));
					}
					return colorPicker;
				}
			case PropertyType.Any:
				{
					const input = existInput ? existInput as TextInput : new TextInput(container);
					if (prop.user != null) {
						input.text = prop.user;
					} else if (prop.default != null) {
						input.text = null;
						input.prompt = prop.default;
					} else {
						input.text = null;
						input.prompt = '-';
					}
					if (!existInput) {
						this.inputDisposables.push(input);
						this.inputDisposables.push(input.onValueChanged(e => this.anyChanged_handler(e, prop)));
					}
					return input;
				}
			default:
				return null;
		}
	}
	private numberChanging_handler(value: number, prop: IProperty): void {
		if (!this.selectionNodes) {
			return;
		}
		for (let i = 0; i < this.selectionNodes.length; i++) {
			const node = this.selectionNodes[i];
			node.setInstanceValue(prop.name, value);
		}
	}
	private numberChanged_handler(value: number, prop: IProperty): void {
		if (!this.selectionNodes) {
			return;
		}
		for (let i = 0; i < this.selectionNodes.length; i++) {
			const node = this.selectionNodes[i];
			setPropertyNum(node, prop.name, value);
		}
	}

	private numberPercentChanging_handler(value: string, prop: IProperty): void {
		if (!this.selectionNodes) {
			return;
		}
		if (prop.name == 'width' || prop.name == 'height') {
			let propName = '';
			if (prop.name == 'width') {
				propName = 'percentWidth';
			} else {
				propName = 'percentHeight';
			}
			const numValue = Number.parseFloat(value);
			for (var i = 0; i < this.selectionNodes.length; i++) {
				var node = this.selectionNodes[i];
				node.setInstanceValue(propName, numValue);
			}
		} else {
			for (var i = 0; i < this.selectionNodes.length; i++) {
				var node = this.selectionNodes[i];
				node.setInstanceValue(prop.name, value);
			}
		}
	}
	private numberPercentChanged_handler(value: string, prop: IProperty): void {
		if (!this.selectionNodes) {
			return;
		}
		setPropertyNumPro(this.selectionNodes, prop.name, value, this.model, true);
	}
	private booleanChanged_handler(value: IDropDownTextDataSource, prop: IProperty): void {
		if (!this.selectionNodes) {
			return;
		}
		for (let i = 0; i < this.selectionNodes.length; i++) {
			const node = this.selectionNodes[i];
			if (!value) {
				node.setProperty(prop.name, null);
			} else {
				node.setBoolean(prop.name, value.id == 'true' ? true : false);
			}
		}
	}
	private stringsChanged_handler(value: IDropDownTextDataSource, prop: IProperty): void {
		if (!this.selectionNodes) {
			return;
		}
		for (let i = 0; i < this.selectionNodes.length; i++) {
			const node = this.selectionNodes[i];
			if (!value) {
				node.setProperty(prop.name, null);
			} else {
				node.setString(prop.name, value.id);
			}
		}
	}

	private stringChanged_handler(value: string, prop: IProperty): void {
		if (!this.selectionNodes) {
			return;
		}
		for (let i = 0; i < this.selectionNodes.length; i++) {
			const node = this.selectionNodes[i];
			if (!value) {
				node.setProperty(prop.name, null);
			} else {
				node.setString(prop.name, value);
			}
		}
	}

	private anyChanged_handler(value: string, prop: IProperty): void {
		if (!this.selectionNodes) {
			return;
		}
		for (let i = 0; i < this.selectionNodes.length; i++) {
			const node = this.selectionNodes[i];
			if (!value) {
				this.model.setPropertyByString(node, prop.name, null);
			} else {
				this.model.setPropertyByString(node, prop.name, value);
			}
		}
	}

	private colorCacheMap: { [propName: string]: any[] } = {};
	private colorDisplay_handler(prop: IProperty): void {
		if (!(prop.name in this.colorCacheMap)) {
			this.colorCacheMap[prop.name] = [];
		}
		if (!this.selectionNodes) {
			return;
		}
		const list = this.colorCacheMap[prop.name];
		for (let i = 0; i < this.selectionNodes.length; i++) {
			const node = this.selectionNodes[i];
			if (node.getInstance()) {
				const color = node.getInstance()[prop.name];
				list.push(color);
			} else {
				list.push(null);
			}
		}
	}
	private colorCanceled_handler(prop: IProperty): void {
		if (!(prop.name in this.colorCacheMap)) {
			this.colorCacheMap[prop.name] = [];
		}
		if (!this.selectionNodes) {
			return;
		}
		const list = this.colorCacheMap[prop.name];
		for (let i = 0; i < this.selectionNodes.length; i++) {
			const node = this.selectionNodes[i];
			node.setInstanceValue(prop.name, list[i]);
		}
	}

	private colorChanged_handler(color: HSVaColor, prop: IProperty): void {
		if (!this.selectionNodes) {
			return;
		}
		for (let i = 0; i < this.selectionNodes.length; i++) {
			const node = this.selectionNodes[i];
			node.setInstanceValue(prop.name, toHexNumber(color.toHEXA().toString()));
		}
	}

	private colorSaved_handler(color: HSVaColor, prop: IProperty): void {
		if (!this.selectionNodes) {
			return;
		}
		for (let i = 0; i < this.selectionNodes.length; i++) {
			const node = this.selectionNodes[i];
			if (color) {
				setPropertyStr(node, prop.name, toHexString(color.toHEXA().toString(), '0x'));
				node.setInstanceValue(prop.name, toHexNumber(color.toHEXA().toString()));
			} else {
				setPropertyStr(node, prop.name, '0xffffff');
				setPropertyStr(node, prop.name, null);
			}
		}
	}



	/**
	 * 释放
	 */
	public dispose(): void {
		this.el.remove();
		this.container = null;
		dispose(this.toDisposes);
	}
}