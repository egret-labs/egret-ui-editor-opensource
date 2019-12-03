/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import Platform = require('vs/base/common/platform');
import Browser = require('vs/base/browser/browser');
import Lifecycle = require('vs/base/common/lifecycle');
import DOM = require('vs/base/browser/dom');
import Diff = require('vs/base/common/diff/diff');
import strings = require('vs/base/common/strings');
import Model = require('vs/base/parts/tree/browser/treeModel');
import dnd = require('./treeDnd');
import { ArrayIterator, MappedIterator } from 'vs/base/common/iterator';
import { ScrollableElement } from 'vs/base/browser/ui/scrollbar/scrollableElement';
import { ScrollbarVisibility } from 'vs/base/common/scrollable';
import { HeightMap, IViewItem } from 'vs/base/parts/tree/browser/treeViewModel';
import _ = require('vs/base/parts/tree/browser/tree');
import { KeyCode } from 'vs/base/common/keyCodes';
import Event, { Emitter } from 'vs/base/common/event';
import './tree.less';

export interface IRow {
	element: HTMLElement;
	templateId: string;
	templateData: any;
}

function removeFromParent(element: HTMLElement): void {
	try {
		element.parentElement.removeChild(element);
	} catch (e) {
		// this will throw if this happens due to a blur event, nasty business
	}
}

export class RowCache implements Lifecycle.IDisposable {

	private _cache: { [templateId: string]: IRow[]; };

	constructor(private context: _.ITreeContext) {
		this._cache = { '': [] };
	}

	public alloc(templateId: string): IRow {
		let result = this.cache(templateId).pop();

		if (!result) {
			const content = document.createElement('div');
			content.className = 'content';


			const row = document.createElement('div');
			row.appendChild(content);

			result = {
				element: row,
				templateId: templateId,
				templateData: this.context.renderer.renderTemplate(this.context.tree, templateId, content)
			};
		}

		return result;
	}

	public release(templateId: string, row: IRow): void {
		removeFromParent(row.element);
		this.cache(templateId).push(row);
	}

	private cache(templateId: string): IRow[] {
		return this._cache[templateId] || (this._cache[templateId] = []);
	}

	public garbageCollect(): void {
		if (this._cache) {
			Object.keys(this._cache).forEach(templateId => {
				this._cache[templateId].forEach(cachedRow => {
					this.context.renderer.disposeTemplate(this.context.tree, templateId, cachedRow.templateData);
					cachedRow.element = null;
					cachedRow.templateData = null;
				});

				delete this._cache[templateId];
			});
		}
	}

	public dispose(): void {
		this.garbageCollect();
		this._cache = null;
		this.context = null;
	}
}

export interface IViewContext extends _.ITreeContext {
	cache: RowCache;
}

export class ViewItem implements IViewItem {

	private context: IViewContext;

	public model: Model.Item;
	public id: string;
	protected row: IRow;

	public top: number;
	public height: number;
	public onDragStart: (e: DragEvent) => void;

	public needsRender: boolean;
	public uri: string;
	public unbindDragStart: Lifecycle.IDisposable;
	public loadingPromise: Promise<void>;

	public _styles: any;
	private _draggable: boolean;

	constructor(context: IViewContext, model: Model.Item) {
		this.context = context;
		this.model = model;

		this.id = this.model.id;
		this.row = null;

		this.top = 0;
		this.height = model.getHeight();

		this._styles = {};
		model.getAllTraits().forEach(t => this._styles[t] = true);

		if (model.isExpanded()) {
			this.addClass('expanded');
		}
	}

	set expanded(value: boolean) {
		value ? this.addClass('expanded') : this.removeClass('expanded');
	}

	set loading(value: boolean) {
		value ? this.addClass('loading') : this.removeClass('loading');
	}

	set draggable(value: boolean) {
		this._draggable = value;
		this.render(true);
	}

	get draggable() {
		return this._draggable;
	}

	set dropTarget(value: boolean) {
		value ? this.addClass('drop-target') : this.removeClass('drop-target');
	}

	public get element(): HTMLElement {
		return this.row && this.row.element;
	}

	private _templateId: string;
	private get templateId(): string {
		return this._templateId || (this._templateId = (this.context.renderer.getTemplateId && this.context.renderer.getTemplateId(this.context.tree, this.model.getElement())));
	}

	public addClass(name: string): void {
		this._styles[name] = true;
		this.render(true);
	}

	public removeClass(name: string): void {
		delete this._styles[name]; // is this slow?
		this.render(true);
	}

	public render(skipUserRender = false): void {
		if (!this.model || !this.element) {
			return;
		}

		const classes = ['monaco-tree-row'];
		classes.push.apply(classes, Object.keys(this._styles));

		if (this.model.hasChildren()) {
			classes.push('has-children');
		}

		this.element.className = classes.join(' ');
		this.element.draggable = this.draggable;
		this.element.style.height = this.height + 'px';

		// ARIA
		this.element.setAttribute('role', 'treeitem');
		if (this.model.hasTrait('focused')) {
			const base64Id = strings.safeBtoa(this.model.id);
			const ariaLabel = this.context.accessibilityProvider.getAriaLabel(this.context.tree, this.model.getElement());

			this.element.setAttribute('aria-selected', 'true');
			this.element.setAttribute('id', base64Id);
			if (ariaLabel) {
				this.element.setAttribute('aria-label', ariaLabel);
			} else {
				this.element.setAttribute('aria-labelledby', base64Id); // force screen reader to compute label from children (helps NVDA at least)
			}
		} else {
			this.element.setAttribute('aria-selected', 'false');
			this.element.removeAttribute('id');
			this.element.removeAttribute('aria-label');
			this.element.removeAttribute('aria-labelledby');
		}
		if (this.model.hasChildren()) {
			this.element.setAttribute('aria-expanded', String(this.model.isExpanded()));
		} else {
			this.element.removeAttribute('aria-expanded');
		}
		this.element.setAttribute('aria-level', String(this.model.getDepth()));

		if (this.context.options.paddingOnRow) {
			this.element.style.paddingLeft = this.context.options.twistiePixels + ((this.model.getDepth() - 1) * this.context.options.indentPixels) + 'px';
		} else {
			this.element.style.paddingLeft = ((this.model.getDepth() - 1) * this.context.options.indentPixels) + 'px';
			(<HTMLElement>this.row.element.firstElementChild).style.paddingLeft = this.context.options.twistiePixels + 'px';
		}

		const uri = this.context.dnd.getDragURI(this.context.tree, this.model.getElement());

		if (uri !== this.uri) {
			if (this.unbindDragStart) {
				this.unbindDragStart.dispose();
				this.unbindDragStart = null;
			}

			if (uri) {
				this.uri = uri;
				this.draggable = true;
				this.unbindDragStart = DOM.addDisposableListener(this.element, 'dragstart', (e) => {
					this.onDragStart(e);
				});
			} else {
				this.uri = null;
			}
		}

		if (!skipUserRender) {
			this.context.renderer.renderElement(this.context.tree, this.model.getElement(), this.templateId, this.row.templateData);
		}
	}

	public insertInDOM(container: HTMLElement, afterElement: HTMLElement): void {
		if (!this.row) {
			this.row = this.context.cache.alloc(this.templateId);

			// used in reverse lookup from HTMLElement to Item
			(<any>this.element)[TreeView.BINDING] = this;
		}

		if (this.element.parentElement) {
			return;
		}

		if (afterElement === null) {
			container.appendChild(this.element);
		} else {
			try {
				container.insertBefore(this.element, afterElement);
			} catch (e) {
				console.warn('Failed to locate previous tree element');
				container.appendChild(this.element);
			}
		}

		this.render();
	}

	public removeFromDOM(): void {
		if (!this.row) {
			return;
		}

		if (this.unbindDragStart) {
			this.unbindDragStart.dispose();
			this.unbindDragStart = null;
		}

		this.uri = null;

		(<any>this.element)[TreeView.BINDING] = null;
		this.context.cache.release(this.templateId, this.row);
		this.row = null;
	}

	public dispose(): void {
		this.row = null;
		this.model = null;
	}
}

class RootViewItem extends ViewItem {

	constructor(context: IViewContext, model: Model.Item, wrapper: HTMLElement) {
		super(context, model);

		this.row = {
			element: wrapper,
			templateData: null,
			templateId: null
		};
	}

	public render(): void {
		if (!this.model || !this.element) {
			return;
		}

		const classes = ['monaco-tree-wrapper'];
		classes.push.apply(classes, Object.keys(this._styles));

		if (this.model.hasChildren()) {
			classes.push('has-children');
		}

		this.element.className = classes.join(' ');
	}

	public insertInDOM(container: HTMLElement, afterElement: HTMLElement): void {
		// noop
	}

	public removeFromDOM(): void {
		// noop
	}
}

interface IThrottledGestureEvent {
	translationX: number;
	translationY: number;
}

function reactionEquals(one: _.IDragOverReaction, other: _.IDragOverReaction): boolean {
	if (!one && !other) {
		return true;
	} else if (!one || !other) {
		return false;
	} else if (one.accept !== other.accept) {
		return false;
	} else if (one.bubble !== other.bubble) {
		return false;
	} else if (one.effect !== other.effect) {
		return false;
	} else {
		return true;
	}
}

export class TreeView extends HeightMap {

	static BINDING = 'monaco-tree-row';
	static LOADING_DECORATION_DELAY = 800;

	private static currentExternalDragAndDropData: _.IDragAndDropData = null;

	private context: IViewContext;
	private modelListeners: Lifecycle.IDisposable[];
	private model: Model.TreeModel;

	private viewListeners: Lifecycle.IDisposable[];
	private domNode: HTMLElement;
	private wrapper: HTMLElement;
	private rowsContainer: HTMLElement;
	private scrollableElement: ScrollableElement;
	private msGesture: MSGesture;
	private lastPointerType: string;
	private lastClickTimeStamp: number = 0;

	private lastRenderTop: number;
	private lastRenderHeight: number;

	private inputItem: ViewItem;
	private items: { [id: string]: ViewItem; };

	private isRefreshing = false;
	private refreshingPreviousChildrenIds: { [id: string]: string[] } = {};

	private dragAndDropListeners: { (): void; }[];
	private currentDragAndDropData: _.IDragAndDropData;
	private currentDropElement: any;
	private currentDropElementReaction: _.IDragOverReaction;
	private currentDropTarget: ViewItem;
	private shouldInvalidateDropReaction: boolean;
	private currentDropTargets: ViewItem[];
	private currentDropPromise: Promise<void>;
	private dragAndDropScrollInterval: number;
	private dragAndDropScrollTimeout: number;
	private dragAndDropMouseY: number;

	private didJustPressContextMenuKey: boolean;

	private highlightedItemWasDraggable: boolean;
	private onHiddenScrollTop: number;

	private _onDOMFocus: Emitter<void> = new Emitter<void>();
	get onDOMFocus(): Event<void> { return this._onDOMFocus.event; }

	private _onDOMBlur: Emitter<void> = new Emitter<void>();
	get onDOMBlur(): Event<void> { return this._onDOMBlur.event; }

	private loadingPromiseSetTimeOutIds: { [id: string]: any; };
	private currentDropPromiseId: any;

	constructor(context: _.ITreeContext, container: HTMLElement) {
		super();

		this.context = {
			dataSource: context.dataSource,
			renderer: context.renderer,
			controller: context.controller,
			dnd: context.dnd,
			filter: context.filter,
			sorter: context.sorter,
			tree: context.tree,
			accessibilityProvider: context.accessibilityProvider,
			options: context.options,
			cache: new RowCache(context)
		};

		this.modelListeners = [];
		this.viewListeners = [];
		this.dragAndDropListeners = [];

		this.model = null;
		this.items = {};

		//todo:临时解决promise的cacel问题
		this.loadingPromiseSetTimeOutIds = {};

		this.domNode = document.createElement('div');
		this.domNode.className = 'monaco-tree no-focused-item';
		this.domNode.tabIndex = 0;

		//


		// ARIA
		this.domNode.setAttribute('role', 'tree');
		if (this.context.options.ariaLabel) {
			this.domNode.setAttribute('aria-label', this.context.options.ariaLabel);
		}

		if (this.context.options.alwaysFocused) {
			DOM.addClass(this.domNode, 'focused');
		}

		if (!this.context.options.paddingOnRow) {
			DOM.addClass(this.domNode, 'no-row-padding');
		}

		this.wrapper = document.createElement('div');
		this.wrapper.className = 'monaco-tree-wrapper';
		this.scrollableElement = new ScrollableElement(this.wrapper, {
			canUseTranslate3d: false,
			alwaysConsumeMouseWheel: true,
			horizontal: ScrollbarVisibility.Hidden,
			vertical: (typeof context.options.verticalScrollMode !== 'undefined' ? context.options.verticalScrollMode : ScrollbarVisibility.Auto),
			useShadows: context.options.useShadows,
			verticalSliderSize: 6,
			verticalScrollbarSize: 6
		});
		this.scrollableElement.onScroll((e) => {
			this.render(e.scrollTop, e.height);
			if (this.context.controller.onScroll) {
				this.context.controller.onScroll(this.context.tree, e);
			}
			this.emit('scroll', e); // TODO@Joao: is anyone interested in this event?
		});

		if (Browser.isIE) {
			this.wrapper.style.msTouchAction = 'none';
			this.wrapper.style.msContentZooming = 'none';
		} else {

		}

		this.rowsContainer = document.createElement('div');
		this.rowsContainer.className = 'monaco-tree-rows';
		if (context.options.showTwistie) {
			this.rowsContainer.className += ' show-twisties';
		}

		const focusTracker = DOM.trackFocus(this.domNode);
		focusTracker.addFocusListener(() => this.onFocus());
		focusTracker.addBlurListener(() => this.onBlur());
		this.viewListeners.push(focusTracker);

		this.viewListeners.push(DOM.addDisposableListener(this.domNode, 'keydown', (e) => this.onKeyDown(e)));
		this.viewListeners.push(DOM.addDisposableListener(this.domNode, 'keyup', (e) => this.onKeyUp(e)));
		this.viewListeners.push(DOM.addDisposableListener(this.domNode, 'mousedown', (e) => this.onMouseDown(e)));
		this.viewListeners.push(DOM.addDisposableListener(this.domNode, 'mouseup', (e) => this.onMouseUp(e)));
		this.viewListeners.push(DOM.addDisposableListener(this.wrapper, 'click', (e) => this.onClick(e)));
		this.viewListeners.push(DOM.addDisposableListener(this.domNode, 'contextmenu', (e) => this.onContextMenu(e)));

		if (Browser.isIE) {
			this.viewListeners.push(DOM.addDisposableListener(this.wrapper, 'MSPointerDown', (e) => this.onMsPointerDown(e)));

			// these events come too fast, we throttle them
			this.viewListeners.push(DOM.addDisposableThrottledListener<IThrottledGestureEvent>(this.wrapper, 'MSGestureChange', (e) => this.onThrottledMsGestureChange(e), (lastEvent: any, event: any): IThrottledGestureEvent => {
				event.stopPropagation();
				event.preventDefault();

				const result = { translationY: event.translationY, translationX: event.translationX };

				if (lastEvent) {
					result.translationY += lastEvent.translationY;
					result.translationX += lastEvent.translationX;
				}

				return result;
			}));
		}

		this.viewListeners.push(DOM.addDisposableListener(window, 'dragover', (e) => {
			// console.log('dragover',this.id);
			this.onDragOver(e, false);
		}));
		this.viewListeners.push(DOM.addDisposableListener(window, 'drop', (e) => {
			// console.log('drop',this.id);
			this.onDrop(e);
		}));
		this.viewListeners.push(DOM.addDisposableListener(window, 'dragend', (e) => {
			// console.log('dragend',this.id);
			this.onDragEnd(e);
		}));
		this.viewListeners.push(DOM.addDisposableListener(window, 'dragleave', (e) => {
			// console.log('dragleave',this.id);
			this.onDragOver(e, true);
		}
		));

		this.wrapper.appendChild(this.rowsContainer);
		this.domNode.appendChild(this.scrollableElement.getDomNode());
		container.appendChild(this.domNode);

		this.lastRenderTop = 0;
		this.lastRenderHeight = 0;

		this.didJustPressContextMenuKey = false;

		this.currentDropTarget = null;
		this.currentDropTargets = [];
		this.shouldInvalidateDropReaction = false;

		this.dragAndDropScrollInterval = null;
		this.dragAndDropScrollTimeout = null;

		this.onHiddenScrollTop = null;

		this.onRowsChanged();
		this.layout();

		this.setupMSGesture();
	}

	protected createViewItem(item: Model.Item): IViewItem {
		return new ViewItem(this.context, item);
	}

	public getHTMLElement(): HTMLElement {
		return this.domNode;
	}

	public focus(): void {
		this.domNode.focus();
	}

	public isFocused(): boolean {
		return document.activeElement === this.domNode;
	}

	public blur(): void {
		this.domNode.blur();
	}

	public onVisible(): void {
		this.scrollTop = this.onHiddenScrollTop;
		this.onHiddenScrollTop = null;
		this.setupMSGesture();
	}

	private setupMSGesture(): void {
		if ((<any>window).MSGesture) {
			this.msGesture = new MSGesture();
			setTimeout(() => this.msGesture.target = this.wrapper, 100); // TODO@joh, TODO@IETeam
		}
	}

	public onHidden(): void {
		this.onHiddenScrollTop = this.scrollTop;
	}

	private isTreeVisible(): boolean {
		return this.onHiddenScrollTop === null;
	}

	public layout(height?: number): void {
		if (!this.isTreeVisible()) {
			return;
		}

		this.viewHeight = height || DOM.getContentHeight(this.wrapper); // render
	}

	private render(scrollTop: number, viewHeight: number): void {
		let i: number;
		let stop: number;

		const renderTop = scrollTop;
		const renderBottom = scrollTop + viewHeight;
		const thisRenderBottom = this.lastRenderTop + this.lastRenderHeight;

		// when view scrolls down, start rendering from the renderBottom
		for (i = this.indexAfter(renderBottom) - 1, stop = this.indexAt(Math.max(thisRenderBottom, renderTop)); i >= stop; i--) {
			this.insertItemInDOM(<ViewItem>this.itemAtIndex(i));
		}

		// when view scrolls up, start rendering from either this.renderTop or renderBottom
		for (i = Math.min(this.indexAt(this.lastRenderTop), this.indexAfter(renderBottom)) - 1, stop = this.indexAt(renderTop); i >= stop; i--) {
			this.insertItemInDOM(<ViewItem>this.itemAtIndex(i));
		}

		// when view scrolls down, start unrendering from renderTop
		for (i = this.indexAt(this.lastRenderTop), stop = Math.min(this.indexAt(renderTop), this.indexAfter(thisRenderBottom)); i < stop; i++) {
			this.removeItemFromDOM(<ViewItem>this.itemAtIndex(i));
		}

		// when view scrolls up, start unrendering from either renderBottom this.renderTop
		for (i = Math.max(this.indexAfter(renderBottom), this.indexAt(this.lastRenderTop)), stop = this.indexAfter(thisRenderBottom); i < stop; i++) {
			this.removeItemFromDOM(<ViewItem>this.itemAtIndex(i));
		}

		const topItem = this.itemAtIndex(this.indexAt(renderTop));

		if (topItem) {
			this.rowsContainer.style.top = (topItem.top - renderTop) + 'px';
		}

		this.lastRenderTop = renderTop;
		this.lastRenderHeight = renderBottom - renderTop;
	}

	public setModel(newModel: Model.TreeModel): void {
		this.releaseModel();
		this.model = newModel;

		this.modelListeners.push(this.model.addBulkListener2((e) => this.onModelEvents(e)));
	}

	private onModelEvents(events: any[]): void {
		const elementsToRefresh: Model.Item[] = [];

		for (let i = 0, len = events.length; i < len; i++) {
			const event = events[i];
			const data = event.getData();

			switch (event.getType()) {
				case 'refreshing':
					this.onRefreshing();
					break;
				case 'refreshed':
					this.onRefreshed();
					break;
				case 'clearingInput':
					this.onClearingInput(data);
					break;
				case 'setInput':
					this.onSetInput(data);
					break;
				case 'item:childrenRefreshing':
					this.onItemChildrenRefreshing(data);
					break;
				case 'item:childrenRefreshed':
					this.onItemChildrenRefreshed(data);
					break;
				case 'item:refresh':
					elementsToRefresh.push(data.item);
					break;
				case 'item:expanding':
					this.onItemExpanding(data);
					break;
				case 'item:expanded':
					this.onItemExpanded(data);
					break;
				case 'item:collapsing':
					this.onItemCollapsing(data);
					break;
				case 'item:reveal':
					this.onItemReveal(data);
					break;
				case 'item:addTrait':
					this.onItemAddTrait(data);
					break;
				case 'item:removeTrait':
					this.onItemRemoveTrait(data);
					break;
				case 'focus':
					this.onModelFocusChange();
					break;
			}
		}

		if (elementsToRefresh.length > 0) {
			this.onItemsRefresh(elementsToRefresh);
		}
	}

	private onRefreshing(): void {
		this.isRefreshing = true;
	}

	private onRefreshed(): void {
		this.isRefreshing = false;
		this.onRowsChanged();
	}

	private onRowsChanged(scrollTop: number = this.scrollTop): void {
		if (this.isRefreshing) {
			return;
		}

		this.scrollTop = scrollTop;
	}

	public focusNextPage(eventPayload?: any): void {
		let lastPageIndex = this.indexAt(this.scrollTop + this.viewHeight);
		lastPageIndex = lastPageIndex === 0 ? 0 : lastPageIndex - 1;
		const lastPageElement = this.itemAtIndex(lastPageIndex).model.getElement();
		const currentlyFocusedElement = this.model.getFocus();

		if (currentlyFocusedElement !== lastPageElement) {
			this.model.setFocus(lastPageElement, eventPayload);
		} else {
			const previousScrollTop = this.scrollTop;
			this.scrollTop += this.viewHeight;

			if (this.scrollTop !== previousScrollTop) {

				// Let the scroll event listener run
				setTimeout(() => {
					this.focusNextPage(eventPayload);
				}, 0);
			}
		}
	}

	public focusPreviousPage(eventPayload?: any): void {
		let firstPageIndex: number;

		if (this.scrollTop === 0) {
			firstPageIndex = this.indexAt(this.scrollTop);
		} else {
			firstPageIndex = this.indexAfter(this.scrollTop - 1);
		}

		const firstPageElement = this.itemAtIndex(firstPageIndex).model.getElement();
		const currentlyFocusedElement = this.model.getFocus();

		if (currentlyFocusedElement !== firstPageElement) {
			this.model.setFocus(firstPageElement, eventPayload);
		} else {
			const previousScrollTop = this.scrollTop;
			this.scrollTop -= this.viewHeight;

			if (this.scrollTop !== previousScrollTop) {

				// Let the scroll event listener run
				setTimeout(() => {
					this.focusPreviousPage(eventPayload);
				}, 0);
			}
		}
	}

	public get viewHeight() {
		const scrollState = this.scrollableElement.getScrollState();
		return scrollState.height;
	}

	public set viewHeight(viewHeight: number) {
		this.scrollableElement.updateState({
			height: viewHeight,
			scrollHeight: this.getTotalHeight()
		});
	}

	public get scrollTop(): number {
		const scrollState = this.scrollableElement.getScrollState();
		return scrollState.scrollTop;
	}

	public set scrollTop(scrollTop: number) {
		this.scrollableElement.updateState({
			scrollTop: scrollTop,
			scrollHeight: this.getTotalHeight()
		});
	}

	public getScrollPosition(): number {
		const height = this.getTotalHeight() - this.viewHeight;
		return height <= 0 ? 0 : this.scrollTop / height;
	}

	public setScrollPosition(pos: number): void {
		const height = this.getTotalHeight() - this.viewHeight;
		this.scrollTop = height * pos;
	}

	// Events

	private onClearingInput(e: Model.IInputEvent): void {
		const item = <Model.Item>e.item;
		if (item) {
			this.onRemoveItems(new MappedIterator(item.getNavigator(), item => item && item.id));
			this.onRowsChanged();
		}
	}

	private onSetInput(e: Model.IInputEvent): void {
		this.context.cache.garbageCollect();
		this.inputItem = new RootViewItem(this.context, <Model.Item>e.item, this.wrapper);
		this.emit('viewItem:create', { item: this.inputItem.model });
	}

	private timeOut(timeoutMS: number, viewItem?: any): any {
		let id;
		return new Promise((resolve, reject) => {
			if (timeoutMS) {
				if (viewItem) {
					id = setTimeout(resolve(id), timeoutMS);
					this.loadingPromiseSetTimeOutIds[viewItem.id] = id;
				} else {
					this.currentDropPromiseId = setTimeout(resolve(id), timeoutMS);
				}

			} else {
				setImmediate(resolve);
			}
		});
	}

	private onItemChildrenRefreshing(e: Model.IItemChildrenRefreshEvent): void {
		const item = <Model.Item>e.item;
		const viewItem = this.items[item.id];

		if (viewItem) {
			viewItem.loadingPromise = this.timeOut(TreeView.LOADING_DECORATION_DELAY, viewItem).then((id) => {
				viewItem.loadingPromise = null;
				viewItem.loading = true;
			});
		}

		if (!e.isNested) {
			const childrenIds: string[] = [];
			const navigator = item.getNavigator();
			let childItem: Model.Item;

			while (childItem = navigator.next()) {
				childrenIds.push(childItem.id);
			}

			this.refreshingPreviousChildrenIds[item.id] = childrenIds;
		}
	}

	private onItemChildrenRefreshed(e: Model.IItemChildrenRefreshEvent): void {
		const item = <Model.Item>e.item;
		const viewItem = this.items[item.id];

		if (viewItem) {
			if (viewItem.loadingPromise) {
				const id = this.loadingPromiseSetTimeOutIds[viewItem.id];
				if (id) {
					clearTimeout(id);
					delete this.loadingPromiseSetTimeOutIds[viewItem.id];
				}
				viewItem.loadingPromise = null;
			}

			viewItem.loading = false;
		}

		if (!e.isNested) {
			const previousChildrenIds = this.refreshingPreviousChildrenIds[item.id];
			const afterModelItems: Model.Item[] = [];
			const navigator = item.getNavigator();
			let childItem: Model.Item;

			while (childItem = navigator.next()) {
				afterModelItems.push(childItem);
			}

			const skipDiff = Math.abs(previousChildrenIds.length - afterModelItems.length) > 1000;
			let diff: Diff.IDiffChange[];
			let doToInsertItemsAlreadyExist: boolean;

			if (!skipDiff) {
				const lcs = new Diff.LcsDiff({
					getLength: () => previousChildrenIds.length,
					getElementHash: (i: number) => previousChildrenIds[i]
				}, {
						getLength: () => afterModelItems.length,
						getElementHash: (i: number) => afterModelItems[i].id
					}, null);

				diff = lcs.ComputeDiff();

				// this means that the result of the diff algorithm would result
				// in inserting items that were already registered. this can only
				// happen if the data provider returns bad ids OR if the sorting
				// of the elements has changed
				doToInsertItemsAlreadyExist = diff.some(d => {
					if (d.modifiedLength > 0) {
						for (let i = d.modifiedStart, len = d.modifiedStart + d.modifiedLength; i < len; i++) {
							if (this.items.hasOwnProperty(afterModelItems[i].id)) {
								return true;
							}
						}
					}
					return false;
				});
			}

			// 50 is an optimization number, at some point we're better off
			// just replacing everything
			if (!skipDiff && !doToInsertItemsAlreadyExist && diff.length < 50) {
				for (let i = 0, len = diff.length; i < len; i++) {
					const diffChange = diff[i];

					if (diffChange.originalLength > 0) {
						this.onRemoveItems(new ArrayIterator(previousChildrenIds, diffChange.originalStart, diffChange.originalStart + diffChange.originalLength));
					}

					if (diffChange.modifiedLength > 0) {
						let beforeItem = afterModelItems[diffChange.modifiedStart - 1] || item;
						beforeItem = beforeItem.getDepth() > 0 ? beforeItem : null;

						this.onInsertItems(new ArrayIterator(afterModelItems, diffChange.modifiedStart, diffChange.modifiedStart + diffChange.modifiedLength), beforeItem ? beforeItem.id : null);
					}
				}

			} else if (skipDiff || diff.length) {
				this.onRemoveItems(new ArrayIterator(previousChildrenIds));
				this.onInsertItems(new ArrayIterator(afterModelItems), item.getDepth() > 0 ? item.id : null);
			}

			if (skipDiff || diff.length) {
				this.onRowsChanged();
			}
		}
	}

	private onItemsRefresh(items: Model.Item[]): void {
		this.onRefreshItemSet(items.filter(item => this.items.hasOwnProperty(item.id)));
		this.onRowsChanged();
	}

	private onItemExpanding(e: Model.IItemExpandEvent): void {
		const viewItem = this.items[e.item.id];
		if (viewItem) {
			viewItem.expanded = true;
		}
	}

	private onItemExpanded(e: Model.IItemExpandEvent): void {
		const item = <Model.Item>e.item;
		const viewItem = this.items[item.id];
		if (viewItem) {
			viewItem.expanded = true;

			const height = this.onInsertItems(item.getNavigator(), item.id);
			let scrollTop = this.scrollTop;

			if (viewItem.top + viewItem.height <= this.scrollTop) {
				scrollTop += height;
			}

			this.onRowsChanged(scrollTop);
		}
	}

	private onItemCollapsing(e: Model.IItemCollapseEvent): void {
		const item = <Model.Item>e.item;
		const viewItem = this.items[item.id];
		if (viewItem) {
			viewItem.expanded = false;
			this.onRemoveItems(new MappedIterator(item.getNavigator(), item => item && item.id));
			this.onRowsChanged();
		}
	}

	public getRelativeTop(item: Model.Item): number {
		if (item && item.isVisible()) {
			const viewItem = this.items[item.id];
			if (viewItem) {
				return (viewItem.top - this.scrollTop) / (this.viewHeight - viewItem.height);
			}
		}
		return -1;
	}

	private onItemReveal(e: Model.IItemRevealEvent): void {
		const item = <Model.Item>e.item;
		let relativeTop = <number>e.relativeTop;
		const viewItem = this.items[item.id];
		if (viewItem) {
			if (relativeTop !== null) {
				relativeTop = relativeTop < 0 ? 0 : relativeTop;
				relativeTop = relativeTop > 1 ? 1 : relativeTop;

				// y = mx + b
				const m = viewItem.height - this.viewHeight;
				this.scrollTop = m * relativeTop + viewItem.top;
			} else {
				const viewItemBottom = viewItem.top + viewItem.height;
				const wrapperBottom = this.scrollTop + this.viewHeight;

				if (viewItem.top < this.scrollTop) {
					this.scrollTop = viewItem.top;
				} else if (viewItemBottom >= wrapperBottom) {
					this.scrollTop = viewItemBottom - this.viewHeight;
				}
			}
		}
	}

	private onItemAddTrait(e: Model.IItemTraitEvent): void {
		const item = <Model.Item>e.item;
		const trait = <string>e.trait;
		const viewItem = this.items[item.id];
		if (viewItem) {
			viewItem.addClass(trait);
		}
		if (trait === 'highlighted') {
			DOM.addClass(this.domNode, trait);

			// Ugly Firefox fix: input fields can't be selected if parent nodes are draggable
			if (viewItem) {
				this.highlightedItemWasDraggable = !!viewItem.draggable;
				if (viewItem.draggable) {
					viewItem.draggable = false;
				}
			}
		}
	}

	private onItemRemoveTrait(e: Model.IItemTraitEvent): void {
		const item = <Model.Item>e.item;
		const trait = <string>e.trait;
		const viewItem = this.items[item.id];
		if (viewItem) {
			viewItem.removeClass(trait);
		}
		if (trait === 'highlighted') {
			DOM.removeClass(this.domNode, trait);

			// Ugly Firefox fix: input fields can't be selected if parent nodes are draggable
			if (this.highlightedItemWasDraggable) {
				viewItem.draggable = true;
			}
			this.highlightedItemWasDraggable = false;
		}
	}

	private onModelFocusChange(): void {
		const focus = this.model && this.model.getFocus();

		DOM.toggleClass(this.domNode, 'no-focused-item', !focus);

		// ARIA
		if (focus) {
			this.domNode.setAttribute('aria-activedescendant', strings.safeBtoa(this.context.dataSource.getId(this.context.tree, focus)));
		} else {
			this.domNode.removeAttribute('aria-activedescendant');
		}
	}

	// HeightMap "events"

	public onInsertItem(item: ViewItem): void {
		item.onDragStart = (e) => { this.onDragStart(item, e); };
		item.needsRender = true;
		this.refreshViewItem(item);
		this.items[item.id] = item;
	}

	public onRefreshItem(item: ViewItem, needsRender = false): void {
		item.needsRender = item.needsRender || needsRender;
		this.refreshViewItem(item);
	}

	public onRemoveItem(item: ViewItem): void {
		this.removeItemFromDOM(item);

		item.dispose();
		this.emit('viewItem:dispose', { item: this.inputItem.model });

		delete this.items[item.id];
	}

	// ViewItem refresh

	private refreshViewItem(item: ViewItem): void {
		item.render();

		if (this.shouldBeRendered(item)) {
			this.insertItemInDOM(item);
		} else {
			this.removeItemFromDOM(item);
		}
	}

	// DOM Events

	private onClick(e: MouseEvent): void {
		if (this.lastPointerType && this.lastPointerType !== 'mouse') {
			return;
		}

		const event = e;
		const item = this.getItemAround(event.target as HTMLElement);

		if (!item) {
			return;
		}

		if (Browser.isIE && Date.now() - this.lastClickTimeStamp < 300) {
			// IE10+ doesn't set the detail property correctly. While IE10 simply
			// counts the number of clicks, IE11 reports always 1. To align with
			// other browser, we set the value to 2 if clicks events come in a 300ms
			// sequence.
			// event.detail = 2;
		}
		this.lastClickTimeStamp = Date.now();

		this.context.controller.onClick(this.context.tree, item.model.getElement(), event);
	}

	private onMouseDown(e: MouseEvent): void {
		this.didJustPressContextMenuKey = false;

		if (!this.context.controller.onMouseDown) {
			return;
		}

		if (this.lastPointerType && this.lastPointerType !== 'mouse') {
			return;
		}

		const event = e;

		if (event.ctrlKey && Platform.isNative && Platform.isMacintosh) {
			return;
		}

		const item = this.getItemAround(event.target as HTMLElement);

		if (!item) {
			return;
		}

		this.context.controller.onMouseDown(this.context.tree, item.model.getElement(), event);
	}

	private onMouseUp(e: MouseEvent): void {
		if (!this.context.controller.onMouseUp) {
			return;
		}

		if (this.lastPointerType && this.lastPointerType !== 'mouse') {
			return;
		}

		const event = e;

		if (event.ctrlKey && Platform.isNative && Platform.isMacintosh) {
			return;
		}

		const item = this.getItemAround(event.target as HTMLElement);

		if (!item) {
			return;
		}

		this.context.controller.onMouseUp(this.context.tree, item.model.getElement(), event);
	}

	private onContextMenu(keyboardEvent: KeyboardEvent): void;
	private onContextMenu(mouseEvent: MouseEvent): void;
	private onContextMenu(event: KeyboardEvent | MouseEvent): void {
		let resultEvent: _.ContextMenuEvent;
		let element: any;


		if (event instanceof KeyboardEvent || this.didJustPressContextMenuKey) {
			this.didJustPressContextMenuKey = false;

			const keyboardEvent = event;
			element = this.model.getFocus();
			if (!element) {
				return;
			}

			const id = this.context.dataSource.getId(this.context.tree, element);
			const viewItem = this.items[id];
			const position = DOM.getDomNodePagePosition(viewItem.element);

			// resultEvent = new _.KeyboardContextMenuEvent(position.left + position.width, position.top, keyboardEvent);

		} else {
			const mouseEvent = event;
			const item = this.getItemAround(mouseEvent.target as HTMLElement);

			if (!item) {
				return;
			}

			element = item.model.getElement();
			// resultEvent = new _.MouseContextMenuEvent(mouseEvent);
		}

		this.context.controller.onContextMenu(this.context.tree, element, resultEvent);
	}

	private onKeyDown(e: KeyboardEvent): void {
		const event = e;

		this.didJustPressContextMenuKey = event.keyCode === KeyCode.ContextMenu || (event.shiftKey && event.keyCode === KeyCode.F10);

		if (this.didJustPressContextMenuKey) {
			event.preventDefault();
			event.stopPropagation();
		}

		if (event.target && (event.target as HTMLElement).tagName && (event.target as HTMLElement).tagName.toLowerCase() === 'input') {
			return; // Ignore event if target is a form input field (avoids browser specific issues)
		}

		this.context.controller.onKeyDown(this.context.tree, event);
	}

	private onKeyUp(e: KeyboardEvent): void {
		if (this.didJustPressContextMenuKey) {
			this.onContextMenu(e);
		}

		this.didJustPressContextMenuKey = false;
		this.context.controller.onKeyUp(this.context.tree, e);
	}

	private onDragStart(item: ViewItem, e: any): void {
		if (this.model.getHighlight()) {
			return;
		}

		const element = item.model.getElement();
		const selection = this.model.getSelection();
		let elements: any[];

		if (selection.indexOf(element) > -1) {
			elements = selection;
		} else {
			elements = [element];
		}

		e.dataTransfer.effectAllowed = 'copyMove';
		e.dataTransfer.setData('URL', item.uri);
		if (e.dataTransfer.setDragImage) {
			let label: string;

			if (this.context.dnd.getDragLabel) {
				label = this.context.dnd.getDragLabel(this.context.tree, elements);
			} else {
				label = String(elements.length);
			}

			const dragImage = document.createElement('div');
			dragImage.className = 'monaco-tree-drag-image';
			dragImage.textContent = label;
			document.body.appendChild(dragImage);
			e.dataTransfer.setDragImage(dragImage, -10, -10);
			setTimeout(() => document.body.removeChild(dragImage), 0);
		}

		this.currentDragAndDropData = new dnd.ElementsDragAndDropData(elements);
		TreeView.currentExternalDragAndDropData = new dnd.ExternalElementsDragAndDropData(elements);

		this.context.dnd.onDragStart(this.context.tree, this.currentDragAndDropData, e);
	}

	private setupDragAndDropScrollInterval(): void {
		const viewTop = DOM.getTopLeftOffset(this.wrapper).top;

		if (!this.dragAndDropScrollInterval) {
			this.dragAndDropScrollInterval = window.setInterval(() => {
				if (this.dragAndDropMouseY === undefined) {
					return;
				}

				const diff = this.dragAndDropMouseY - viewTop;
				let scrollDiff = 0;
				const upperLimit = this.viewHeight - 35;

				if (diff < 35) {
					scrollDiff = Math.max(-14, 0.2 * (diff - 35));
				} else if (diff > upperLimit) {
					scrollDiff = Math.min(14, 0.2 * (diff - upperLimit));
				}

				this.scrollTop += scrollDiff;
			}, 10);

			this.cancelDragAndDropScrollTimeout();

			this.dragAndDropScrollTimeout = window.setTimeout(() => {
				this.cancelDragAndDropScrollInterval();
				this.dragAndDropScrollTimeout = null;
			}, 1000);
		}
	}

	private cancelDragAndDropScrollInterval(): void {
		if (this.dragAndDropScrollInterval) {
			window.clearInterval(this.dragAndDropScrollInterval);
			this.dragAndDropScrollInterval = null;
		}

		this.cancelDragAndDropScrollTimeout();
	}

	private cancelDragAndDropScrollTimeout(): void {
		if (this.dragAndDropScrollTimeout) {
			window.clearTimeout(this.dragAndDropScrollTimeout);
			this.dragAndDropScrollTimeout = null;
		}
	}

	private onDragOver(e: DragEvent, isFromLevel: boolean): boolean {
		const event = e;

		let viewItem = this.getItemAround(event.target as HTMLElement);
		// console.log('viewItem',this.id,viewItem);
		if (!viewItem || (event.pageX === 0 && event.pageY === 0 && event.type === DOM.EventType.DRAG_LEAVE)) {
			// dragging outside of tree
			this.onDragEnd();
			return false;
		}
		// dragging inside the tree
		this.setupDragAndDropScrollInterval();
		this.dragAndDropMouseY = event.pageY;

		if (!this.currentDragAndDropData) {
			// just started dragging

			if (TreeView.currentExternalDragAndDropData) {
				this.currentDragAndDropData = TreeView.currentExternalDragAndDropData;
			} else {
				if (!event.dataTransfer.types) {
					return false;
				}

				this.currentDragAndDropData = new dnd.DesktopDragAndDropData();
			}
		}
		this.currentDragAndDropData.update(event);

		let element: any;
		let item: Model.Item = viewItem.model;
		let reaction: _.IDragOverReaction;

		// check the bubble up behavior
		// do {
		element = item ? item.getElement() : this.model.getInput();
		reaction = this.context.dnd.onDragOver(this.context.tree, this.currentDragAndDropData, element, event);

		if (reaction && reaction.bubble === _.DragOverBubble.BUBBLE_UP) {
			item = item && item.parent;
		}
		// } while (item);

		if (!item) {
			this.currentDropElement = null;
			return false;
		}

		const canDrop = reaction && reaction.accept;
		let isCopyFile: boolean = false;
		if (canDrop) {
			this.currentDropElement = item.getElement();
			event.preventDefault();
			isCopyFile = reaction.effect === _.DragOverEffect.COPY;
			event.dataTransfer.dropEffect = isCopyFile ? 'copy' : 'move';
		} else {
			this.currentDropElement = null;
		}

		if (isFromLevel && isCopyFile) {
			this.onDragEnd();
			return false;
		}
		// item is the model item where drop() should be called

		// can be null
		const currentDropTarget = item.id === this.inputItem.id ? this.inputItem : this.items[item.id];

		if (this.shouldInvalidateDropReaction || this.currentDropTarget !== currentDropTarget || !reactionEquals(this.currentDropElementReaction, reaction)) {
			this.shouldInvalidateDropReaction = false;

			if (this.currentDropTarget) {
				this.currentDropTargets.forEach(i => i.dropTarget = false);
				this.currentDropTargets = [];

				if (this.currentDropPromise) {
					if (this.currentDropPromiseId) {
						clearTimeout(this.currentDropPromiseId);
					}
					this.currentDropPromise = null;
				}
			}

			this.currentDropTarget = currentDropTarget;
			this.currentDropElementReaction = reaction;
			if (canDrop) {
				// setup hover feedback for drop target

				if (this.currentDropTarget) {
					this.currentDropTarget.dropTarget = true;
					this.currentDropTargets.push(this.currentDropTarget);
				}

				if (reaction.bubble === _.DragOverBubble.BUBBLE_DOWN) {
					const nav = item.getNavigator();
					let child: Model.Item;
					while (child = nav.next()) {
						viewItem = this.items[child.id];
						if (viewItem) {
							viewItem.dropTarget = true;
							this.currentDropTargets.push(viewItem);
						}
					}
				}
				if (reaction.autoExpand) {
					this.currentDropPromise = this.timeOut(500)
						.then(() => this.context.tree.expand(this.currentDropElement))
						.then(() => this.shouldInvalidateDropReaction = true);
				}
			}
		}

		return true;
	}

	private onDrop(e: DragEvent): void {
		if (this.currentDropElement) {
			const event = e;
			event.preventDefault();
			this.currentDragAndDropData.update(event);
			this.context.dnd.drop(this.context.tree, this.currentDragAndDropData, this.currentDropElement, event);
			this.onDragEnd(e);
		}
		this.cancelDragAndDropScrollInterval();
	}

	private onDragEnd(e?: DragEvent): void {
		if (this.currentDropTargets && this.currentDropTargets.length > 0) {
			this.currentDropTargets.forEach(i => i.dropTarget = false);
			this.currentDropTargets = [];
		}

		if (this.currentDropPromise) {
			if (this.currentDropPromiseId) {
				clearTimeout(this.currentDropPromiseId);
			}
			this.currentDropPromise = null;
		}
		this.shouldInvalidateDropReaction = false;
		this.cancelDragAndDropScrollInterval();
		this.currentDragAndDropData = null;
		TreeView.currentExternalDragAndDropData = null;
		this.currentDropElement = null;
		this.currentDropTarget = null;
		this.dragAndDropMouseY = null;
	}

	private onFocus(): void {
		if (!this.context.options.alwaysFocused) {
			DOM.addClass(this.domNode, 'focused');
		}

		this._onDOMFocus.fire();
	}

	private onBlur(): void {
		if (!this.context.options.alwaysFocused) {
			DOM.removeClass(this.domNode, 'focused');
		}

		this.domNode.removeAttribute('aria-activedescendant'); // ARIA

		this._onDOMBlur.fire();
	}

	// MS specific DOM Events

	private onMsPointerDown(event: MSPointerEvent): void {
		if (!this.msGesture) {
			return;
		}

		// Circumvent IE11 breaking change in e.pointerType & TypeScript's stale definitions
		const pointerType = event.pointerType;
		if (pointerType === ((<any>event).MSPOINTER_TYPE_MOUSE || 'mouse')) {
			this.lastPointerType = 'mouse';
			return;
		} else if (pointerType === ((<any>event).MSPOINTER_TYPE_TOUCH || 'touch')) {
			this.lastPointerType = 'touch';
		} else {
			return;
		}

		event.stopPropagation();
		event.preventDefault();

		this.msGesture.addPointer(event.pointerId);
	}

	private onThrottledMsGestureChange(event: IThrottledGestureEvent): void {
		this.scrollTop -= event.translationY;
	}

	// DOM changes
	private insertItemInDOM(item: ViewItem): void {
		let elementAfter: HTMLElement = null;
		const itemAfter = <ViewItem>this.itemAfter(item);

		if (itemAfter && itemAfter.element) {
			elementAfter = itemAfter.element;
		}

		item.insertInDOM(this.rowsContainer, elementAfter);
	}

	private removeItemFromDOM(item: ViewItem): void {
		item.removeFromDOM();
	}

	// Helpers

	private shouldBeRendered(item: ViewItem): boolean {
		// return true;
		return item.top < this.lastRenderTop + this.lastRenderHeight && item.top + item.height > this.lastRenderTop;
	}

	private getItemAround(element: HTMLElement): ViewItem {
		let candidate: ViewItem = this.inputItem;
		do {
			if ((<any>element)[TreeView.BINDING]) {
				candidate = (<any>element)[TreeView.BINDING];
			}

			if (element === this.wrapper || element === this.domNode) {
				return candidate;
			}

			if (element === document.body) {
				return null;
			}
		} while (element = element.parentElement);
		return undefined;
	}

	// Cleanup

	private releaseModel(): void {
		if (this.model) {
			this.modelListeners = Lifecycle.dispose(this.modelListeners);
			this.model = null;
		}
	}

	public dispose(): void {
		// TODO@joao: improve
		this.scrollableElement.dispose();

		this.releaseModel();
		this.modelListeners = null;

		this.viewListeners = Lifecycle.dispose(this.viewListeners);

		this._onDOMFocus.dispose();
		this._onDOMBlur.dispose();

		if (this.domNode.parentNode) {
			this.domNode.parentNode.removeChild(this.domNode);
		}
		this.domNode = null;

		if (this.context.cache) {
			this.context.cache.dispose();
			this.context.cache = null;
		}

		super.dispose();
	}
}
