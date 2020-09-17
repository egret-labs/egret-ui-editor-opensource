import * as dom from 'egret/base/common/dom';
import { DomScrollableElement } from 'vs/base/browser/ui/scrollbar/scrollableElement';
import { ScrollbarVisibility } from 'vs/base/common/scrollable';
import { TextInput } from 'egret/base/browser/ui/inputs';
import { IconButton } from 'egret/base/browser/ui/buttons';
import { deepClone } from 'egret/base/common/objects';
import { Label } from 'egret/base/browser/ui/labels';
import { Emitter, Event } from 'egret/base/common/event';
import { keys } from 'egret/base/common/map';

export class DataProviderEditor {
	/**
	 *
	 */
	constructor(private container: HTMLElement) {
		this.render();
	}

	private _properties: string[] = [];
	private _data: Object[] = [];
	public setData(data: Object[]): void {
		if (!data) {
			this._data = [];
		} else {
			// 克隆数据，当取消操作后不会修改原始数据
			this._data = deepClone(data);
		}
		this.clear();
		this.resetProperties();
		this.renderHeader();
		this.renderDataItems();
	}

	public getData(): Object[] {
		return this._data;
	}

	public addItem(): void {
		const item = Object.create(null);
		for (const key of this._properties) {
			item[key] = '';
		}
		this._data.push(item);
		this.dataContainer.appendChild(this.renderItem(item));
		this.updateScroll();
		this.scrollbar.setScrollPosition({
			scrollTop: this.scrollbar.getScrollDimensions().scrollHeight
		});
	}

	public addProperty(name: string): void {
		if (name) {
			if (!this.propertyExist(name)) {
				this._properties.push(name);
				this._dataHeader.update(this._properties);
				for (const [, item] of this.dataMaps) {
					item.update(this._properties);
				}
				this.updateScroll();
				this.scrollbar.setScrollPosition({
					scrollLeft: this.scrollbar.getScrollDimensions().scrollWidth
				});
			}
		}
	}

	private resetProperties(): void {
		for (const item of this._data) {
			for (const key in item) {
				if (!this.propertyExist(key)) {
					this._properties.push(key);
				}
			}
		}
	}

	private propertyExist(name: string): boolean {
		for (const value of this._properties) {
			if (value === name) {
				return true;
			}
		}
		return false;
	}

	private root: HTMLElement;
	private header: HTMLElement;
	private dataContainer: HTMLElement;
	private forceHScrollBanner: HTMLElement;
	private scrollbar: DomScrollableElement;
	private render(): void {
		this.root = document.createElement('div');
		dom.addClass(this.root, 'dataprovider-editor-root');
		this.root.style.height = '100%';
		this.container.appendChild(this.root);

		this.header = document.createElement('div');
		this.header.style.backgroundColor = '#333333';
		this.header.style.minHeight = '24px';
		this.header.style.marginBottom = '6px';
		this.header.style.overflow = 'hidden';
		dom.addClass(this.header, 'dataprovider-header');
		this.root.appendChild(this.header);

		this.dataContainer = document.createElement('div');
		this.dataContainer.style.height = '100%';
		this.dataContainer.style.position = 'relative';
		this.dataContainer.style.paddingBottom = '6px';
		this.dataContainer.style.backgroundColor = '#333333';
		dom.addClass(this.dataContainer, 'dataprovider-data-container');

		this.forceHScrollBanner = document.createElement('div');
		this.forceHScrollBanner.style.height = '1px';
		this.forceHScrollBanner.style.visibility = 'hidden';
		this.forceHScrollBanner.style.position = 'absolute';
		this.forceHScrollBanner.style.left = '0px';
		this.forceHScrollBanner.style.top = '0px';
		this.dataContainer.appendChild(this.forceHScrollBanner);

		this.scrollbar = new DomScrollableElement(this.dataContainer, {
			alwaysConsumeMouseWheel: true,
			horizontal: ScrollbarVisibility.Auto,
			vertical: ScrollbarVisibility.Auto,
			useShadows: false,
			verticalSliderSize: 6,
			verticalScrollbarSize: 6,
			horizontalSliderSize: 6,
			horizontalScrollbarSize: 6
		});
		this.scrollbar.onScroll((e) => {
			if (e.scrollLeftChanged) {
				if (this._dataHeader) {
					this.header.scrollLeft = e.scrollLeft;
				}
				for (const [, item] of this.dataMaps) {
					item.updateDeleteButtonPosition(e.scrollLeft);
				}
			}
		});

		const scrollbarDom = this.scrollbar.getDomNode();
		scrollbarDom.style.height = '100%';
		this.root.appendChild(scrollbarDom);
		// 等UI显示后再刷新
		setTimeout(() => {
			this.updateScroll();
		}, 0);
	}

	private updateScroll(): void {
		const headerScrollWidth = this._dataHeader.getDom().scrollWidth;
		this.forceHScrollBanner.style.width = `${headerScrollWidth}px`;
		this.scrollbar.scanDomNode();
	}

	private _dataHeader: DataHeader;
	private renderHeader(): void {
		this._dataHeader = new DataHeader(this._properties);
		this._dataHeader.onDelete((name) => {
			this.deleteProperty(name);
			this.updateScroll();
		});
		this._dataHeader.onClick((name) => {
			if (this.currentSortInfo.key === name) {
				this.currentSortInfo.isAscending = !this.currentSortInfo.isAscending;
			} else {
				this.currentSortInfo.isAscending = true;
			}
			this.currentSortInfo.key = name;
			this.sort(name, this.currentSortInfo.isAscending);
			this.renderDataItems();
		});
		this.header.appendChild(this._dataHeader.getDom());
	}

	private dataMaps: Map<Object, DataItem> = new Map<Object, DataItem>();
	private renderItem(item: Object): HTMLElement {
		if (this.dataMaps.has(item)) {
			return this.dataMaps.get(item).getDom();
		}
		const dataItem = new DataItem(this._properties, item);
		dataItem.onDelete((target) => {
			this.deleteItem(target);
			this.updateScroll();
		});
		this.dataMaps.set(item, dataItem);
		return dataItem.getDom();
	}

	private deleteItem(item: Object): void {
		const index = this._data.indexOf(item);
		this._data.splice(index, 1);
		this.dataMaps.delete(item);
	}

	public deleteProperty(name: string): void {
		const index = this._properties.indexOf(name);
		if (index >= 0) {
			this._properties.splice(index, 1);
			for (const [, item] of this.dataMaps) {
				item.deleteProperty(name);
			}
		}
		// 属性全部被删除，则清空数据
		if(this._properties.length === 0) {
			this.dataMaps.clear();
			this._data = [];
		}
	}

	private renderDataItems(): void {
		for (const item of this._data) {
			this.dataContainer.appendChild(this.renderItem(item));
		}
		this.updateScroll();
	}

	private currentSortInfo: { key: string; isAscending: boolean } = { key: '', isAscending: true };
	private sort(key: string, isAscending: boolean): void {
		this._data.sort((a, b) => {
			const result = this.compare(a, b, key);
			if (isAscending) {
				return result;
			}
			return -result;
		});
	}

	private compare(first: Object, second: Object, key: string): number {
		if (!(key in first)) {
			return -1;
		}
		if (!(key in second)) {
			return 1;
		}
		if (first[key] > second[key]) {
			return 1;
		} else if (first[key] < second[key]) {
			return -1;
		}
		return 0;
	}

	private clear(): void {
		if (this._dataHeader) {
			this._dataHeader.getDom().remove();
		}
		this._dataHeader = null;
		for (const [, item] of this.dataMaps) {
			item.getDom().remove();
		}
		this.dataMaps.clear();
	}
}

class DataItem {
	/**
	 *
	 */
	constructor(private properties: string[], private item: Object) {
		this.root = document.createElement('div');
		this.root.className = 'dataprovider-data-item';
		this.root.style.backgroundColor = 'transparent';
		this.root.style.display = 'flex';
		this.root.style.position = 'relative';
		this.deleteButtonContainer = document.createElement('div');
		this.deleteButtonContainer.className = 'dataprovider-delete-item';
		this.deleteButtonContainer.style.left = '1px';
		const deleteBtn = new IconButton(this.deleteButtonContainer);
		deleteBtn.size = 24;
		deleteBtn.iconSize = 9;
		deleteBtn.iconClass = 'delete-item';
		deleteBtn.onClick((e) => {
			this.root.remove();
			this._onDelte.fire(this.item);
		});
		this.root.appendChild(this.deleteButtonContainer);
		this.update(properties);
	}
	public get onDelete(): Event<Object> {
		return this._onDelte.event;
	}
	private _onDelte: Emitter<Object> = new Emitter<Object>();


	public getDom(): HTMLElement {
		return this.root;
	}

	public update(properties: string[]): void {
		this.properties = [...properties];
		this.trimProperty();
		this.render();
	}

	public deleteProperty(name: string): void {
		const index = this.properties.indexOf(name);
		if (index >= 0) {
			this.properties.splice(index, 1);
			const element = this.itemMaps.get(name);
			element.remove();
			this.itemMaps.delete(name);
			delete this.item[name];
		}
	}

	public updateDeleteButtonPosition(left: number): void {
		this.deleteButtonContainer.style.left = `${left + 1}px`;
	}

	private trimProperty(): void {
		for (const key in this.item) {
			if (!this.properties.includes(key)) {
				delete this.item[key];
				if (this.itemMaps.has(key)) {
					this.itemMaps.get(key).remove();
					this.itemMaps.delete(key);
				}
			}
		}
		for (const key of this.properties) {
			if (!(key in this.item)) {
				this.item[key] = '';
			}
		}
	}

	private root: HTMLElement;
	private deleteButtonContainer: HTMLElement;
	private itemMaps: Map<string, HTMLElement> = new Map<string, HTMLElement>();
	private render(): void {
		for (const name of this.properties) {
			if (this.itemMaps.has(name)) {
				this.root.appendChild(this.itemMaps.get(name));
			} else {
				const itemRoot = document.createElement('div');
				itemRoot.style.flexGrow = '1';
				const valueInput = new TextInput(itemRoot);
				valueInput.style.minWidth = '100px';
				if (name in this.item) {
					valueInput.text = this.item[name] ?? '';
				}
				valueInput.onValueChanged((value: string) => {
					this.item[name] = value;
				});
				valueInput.onFocusChanged((focused) => {
					if (focused) {
						dom.addClass(this.deleteButtonContainer, 'hidden');
					} else {
						dom.removeClass(this.deleteButtonContainer, 'hidden');
					}
				});
				this.itemMaps.set(name, itemRoot);
				this.root.appendChild(itemRoot);
			}
		}
	}
}

class DataHeader {
	constructor(private properties: string[]) {
		this.root = document.createElement('div');
		this.root.style.display = 'flex';
		this.update(properties);
	}
	public get onDelete(): Event<string> {
		return this._onDelte.event;
	}
	private _onDelte: Emitter<string> = new Emitter<string>();

	public get onClick(): Event<string> {
		return this._onClick.event;
	}
	private _onClick: Emitter<string> = new Emitter<string>();


	public getDom(): HTMLElement {
		return this.root;
	}
	public update(properties: string[]): void {
		this.properties = [...properties];
		this.trimProperty();
		this.render();
	}

	private trimProperty(): void {
		const shouldRemove: string[] = [];
		for (const item of this.itemMaps) {
			if (!this.properties.includes(item[0])) {
				shouldRemove.push(item[0]);
			}
		}
		for (const key of shouldRemove) {
			const item = this.itemMaps.get(key);
			item.remove();
			this.itemMaps.delete(key);
		}
	}

	private root: HTMLElement;
	private itemMaps: Map<string, HTMLElement> = new Map<string, HTMLElement>();
	private render(): void {
		for (const name of this.properties) {
			if (this.itemMaps.has(name)) {
				this.root.appendChild(this.itemMaps.get(name));
			} else {
				const itemRoot = document.createElement('div');
				itemRoot.className = 'dataprovider-item-header';
				itemRoot.style.flexGrow = '1';
				itemRoot.style.minWidth = '102px';
				itemRoot.style.paddingLeft = '6px';
				itemRoot.style.display = 'flex';
				itemRoot.style.cursor = 'pointer';
				itemRoot.addEventListener('click', (e) => {
					this._onClick.fire(name);
				});
				const valueLabel = new Label(itemRoot);
				valueLabel.style.cursor = 'default';
				valueLabel.style.overflow = 'hidden';
				valueLabel.style.flexShrink = '1';
				valueLabel.style.flexGrow = '1';
				valueLabel.style.fontWeight = 'bold';
				valueLabel.style.cursor = 'pointer';
				valueLabel.text = name;
				const deleteBtn = new IconButton(itemRoot);
				deleteBtn.cancelBubble = true;
				deleteBtn.iconSize = 9;
				deleteBtn.style.marginTop = '1px';
				deleteBtn.iconClass = 'delete-property';
				deleteBtn.onClick((e) => {
					itemRoot.remove();
					this.deleteProperty(name);
				});
				this.root.appendChild(itemRoot);
				this.itemMaps.set(name, itemRoot);
			}
		}
	}

	private deleteProperty(name: string): void {
		this.properties.splice(this.properties.indexOf(name), 1);
		this.itemMaps.delete(name);
		this._onDelte.fire(name);
	}
}