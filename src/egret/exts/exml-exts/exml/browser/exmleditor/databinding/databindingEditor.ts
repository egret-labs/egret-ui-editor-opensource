import * as dom from 'egret/base/common/dom';
import { DomScrollableElement } from 'vs/base/browser/ui/scrollbar/scrollableElement';
import { ScrollbarVisibility } from 'vs/base/common/scrollable';
import { TextInput } from 'egret/base/browser/ui/inputs';
import { localize } from 'egret/base/localization/nls';
import { IconButton } from 'egret/base/browser/ui/buttons';
import { deepClone } from 'egret/base/common/objects';

export interface IBindingData {
	key: string;
	value: string;
}

export class DataBindingEditor {
	/**
	 *
	 */
	constructor(private container: HTMLElement) {
		this.render();
	}

	private _data: IBindingData[] = [];
	public setData(data: IBindingData[]): void {
		if(!data) {
			this._data = [];
		} else {
			// 克隆数据，当取消操作后不会修改原始数据
			this._data = deepClone(data);
		}
		this.clear();
		this.renderDataItems();
	}

	public getData(): IBindingData[] {
		return this._data;
	}

	public hide(): void {
		this.root.style.display = 'none';
	}

	public show(): void {
		this.root.style.display = '';
	}

	public addItem(): void {
		let currentIndex = 0;
		let currentKeyName = 'bindingTestKey';
		while (true) {
			if (this.checkIfHasThisKey(this._data, currentKeyName + currentIndex)) {
				currentIndex++;
			}
			else {
				break;
			}
		}
		const item = { key: currentKeyName + currentIndex, value: '' };
		this._data.push(item);
		this.dataContainer.appendChild(this.renderItem(item));
		this.scrollbar.scanDomNode();
	}

	public isInputValid(): boolean {
		for (const [, input] of this.dataMaps) {
			if(!input.isInputValid()) {
				return false;
			}
		}
		return true;
	}

	private checkIfHasThisKey(data: IBindingData[], key: string) {
		if (!data) {
			return false;
		}
		for (const item of data) {
			if (item.key === key) {
				return true;
			}
		}
		return false;
	}

	private root: HTMLElement;
	private dataContainer: HTMLElement;
	private scrollbar: DomScrollableElement;
	private render(): void {
		this.root = document.createElement('div');
		dom.addClass(this.root, 'databingding-editor-root');
		this.root.style.height = '100%';
		this.container.appendChild(this.root);

		const header = document.createElement('div');
		dom.addClass(header, 'databinding-header');
		this.root.appendChild(header);

		const keyHeader = document.createElement('div');
		dom.addClass(keyHeader, 'databinding-header-value');
		keyHeader.textContent = localize('DataBindingEditor.header.key', 'Key');
		header.appendChild(keyHeader);
		const valueHeader = document.createElement('div');
		valueHeader.style.marginLeft = '12px';
		dom.addClass(valueHeader, 'databinding-header-value');
		valueHeader.textContent = localize('DataBindingEditor.header.value', 'Value');
		header.appendChild(valueHeader);
		const deleteHeader = document.createElement('div');
		deleteHeader.style.width = '74px';
		dom.addClass(deleteHeader, 'databinding-header-value delete');
		// deleteHeader.textContent = localize('DataBindingEditor.header.delete', 'Delete');
		header.appendChild(deleteHeader);

		this.dataContainer = document.createElement('div');
		this.dataContainer.style.height = '100%';
		dom.addClass(this.dataContainer, 'databinding-data-container');

		this.scrollbar = new DomScrollableElement(this.dataContainer, {
			alwaysConsumeMouseWheel: true,
			horizontal: ScrollbarVisibility.Hidden,
			vertical: ScrollbarVisibility.Auto,
			verticalSliderSize: 6,
			verticalScrollbarSize: 6
		});

		const scrollbarDom = this.scrollbar.getDomNode();
		scrollbarDom.style.height = '100%';
		this.root.appendChild(scrollbarDom);
	}

	private dataMaps: Map<IBindingData, TextInput> = new Map<IBindingData, TextInput>();
	private renderItem(item: IBindingData): HTMLElement {
		const root = document.createElement('div');
		dom.addClass(root, 'databinding-item');
		const keyInput = new TextInput(root, {
			validation: (value: string) => {
				if (value === '') {
					return { content: localize('DataBindingEditor.validation.keyEmpty', 'Key cannot be empty') };
				}
				for (const element of this._data) {
					if (element !== item) {
						if (element.key === value) {
							return { content: localize('DataBindingEditor.validation.keyExist', 'Key cannot be repeated') };
						}
					}
				}
				return null;
			}
		});
		keyInput.text = item.key;
		keyInput.onValueChanged((value: string) => {
			if (keyInput.isInputValid()) {
				item.key = value;
			}
		});

		const valueInput = new TextInput(root);
		valueInput.style.marginLeft = '6px';
		valueInput.text = item.value;
		valueInput.onValueChanged((value: string) => {
			item.value = value;
		});

		const deleteBtn = new IconButton(root);
		deleteBtn.style.marginLeft = '12px';
		deleteBtn.style.marginRight = '12px';
		deleteBtn.iconClass = 'delete-data';
		deleteBtn.onClick((e) => {
			root.remove();
			this.deleteItem(item);
			this.scrollbar.scanDomNode();
		});

		this.dataMaps.set(item, keyInput);
		return root;
	}

	private deleteItem(item: IBindingData): void {
		const index = this._data.indexOf(item);
		this._data.splice(index, 1);
		this.dataMaps.delete(item);
	}

	private renderDataItems(): void {
		for (const item of this._data) {
			this.dataContainer.appendChild(this.renderItem(item));
		}
		this.scrollbar.scanDomNode();
	}

	private clear(): void {
		this.dataMaps.clear();
		dom.clearNode(this.dataContainer);
	}
}