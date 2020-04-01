import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { Tree } from 'vs/base/parts/tree/browser/treeImpl';
import { ComponentDataSource, ComponentRenderer, ComponentController, ComponentDragAndDrop, ComponentFilter } from './componentViewer';
import { ITreeConfiguration } from 'vs/base/parts/tree/browser/tree';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { ComponentSourceDataCreater } from './componentData';
import { IStorageService, StorageScope } from 'egret/platform/storage/common/storage';
import { ComponentStat } from 'egret/workbench/parts/components/common/componentModel';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { TextInput } from 'egret/base/browser/ui/inputs';
import { IconButton } from 'egret/base/browser/ui/buttons';
import { PanelContentDom } from 'egret/parts/browser/panelDom';
import { IModelRequirePart } from 'egret/exts/exml-exts/models';
import { IDisposable } from 'egret/base/common/lifecycle';
import { localize } from 'egret/base/localization/nls';
import { voluationToStyle } from 'egret/base/common/dom';
import { ClassChangedType } from 'egret/exts/exml-exts/exml/common/project/parsers/parser';


export interface ComponentViewRef {
	test: HTMLDivElement;
}

/**
 * 对象层级面板 
 */
export class ComponentView extends PanelContentDom implements IModelRequirePart {

	private instantiationService: IInstantiationService;
	private storageService: IStorageService;
	private egretProjectService: IEgretProjectService;

	private componentViewer: Tree;
	private treeContainer: HTMLDivElement;
	private searchContainer: HTMLDivElement;
	private iconContainer: HTMLDivElement;
	private componentSourceData: ComponentSourceDataCreater;

	private _disposes: IDisposable[];

	private static COMPONENT_STORAGE_ELEMENTS = 'component_storage_elements_key';
	private static COMPONENT_STORAGE_SCROLLPOS = 'component_storage_scrollPos_key';

	/**
	 * 初始化
	 * @param instantiationService 
	 */
	constructor(
		@IInstantiationService instantiationService: IInstantiationService,
		@IEgretProjectService egretProjectService: IEgretProjectService,
		@IStorageService storageService: IStorageService
	) {
		super(instantiationService);
		this.instantiationService = instantiationService;
		this.storageService = storageService;
		this.egretProjectService = egretProjectService;
		this.componentSourceData = this.instantiationService.createInstance(ComponentSourceDataCreater);
		this._disposes = [];
		this.registerListener();
	}

	setModel(exmlModel: IExmlModel): void {

	}

	private registerListener(): void {
		this.egretProjectService.ensureLoaded().then(() => {
			if (this.egretProjectService.exmlConfig) {
				this._disposes.push(this.egretProjectService.exmlConfig.onCustomClassChanged(e => this.onCustomClassChanged_handler(e)));
			}
			this._disposes.push(this.egretProjectService.onProjectConfigChanged(e => this.onProjectConfigChanged_handler()));
		});
	}

	private unregisterListener(): void {
		this._disposes.map(v => v.dispose());
		this._disposes = [];
	}

	private onProjectConfigChanged_handler(): void {
		this.unregisterListener();
		this.registerListener();
	}

	private onCustomClassChanged_handler(type: ClassChangedType): void {
		if (type !== 'exml') {
			this.create();
		}
	}

	/**
	 * 渲染头部附加内容
	 * @param container 
	 */
	public renderHeaderExt(container: HTMLElement): void {
		//TODO 添加要渲染的头部扩展按钮
	}
	private treeFilter: ComponentFilter;
	// 处理tree
	handleTree() {
		const dataSource = this.instantiationService.createInstance(ComponentDataSource);
		const renderer = this.instantiationService.createInstance(ComponentRenderer);
		const controller = this.instantiationService.createInstance(ComponentController);
		const dnd = this.instantiationService.createInstance(ComponentDragAndDrop);
		this.treeFilter = this.instantiationService.createInstance(ComponentFilter);
		const treeConfiguration: ITreeConfiguration = {
			dataSource: dataSource,
			renderer: renderer,
			controller: controller,
			dnd: dnd,
			filter: this.treeFilter
		};
		this.componentViewer = this.instantiationService.createInstance(Tree, this.treeContainer, treeConfiguration, {});
		this.componentViewer.getHTMLElement().style.position = 'absolute';
		this.create();
		setTimeout(() => {
			if (this.componentViewer) {
				this.componentViewer.layout();
			}
		}, 1);
	}

	private handleSearch(): void {
		const searchInput = new TextInput(this.searchContainer);
		searchInput.prompt = localize('component.search.prompt', 'Search Components');
		searchInput.getElement().style.width = '100%';
		searchInput.onValueChanging((v) => {
			this.changeState(v);
		});

		this.iconContainer = document.createElement('div');
		this.searchContainer.appendChild(this.iconContainer);

		const closeBtn = new IconButton(this.iconContainer);
		this.iconContainer.style.position = 'absolute';
		this.iconContainer.style.width = '100%';
		this.iconContainer.style.pointerEvents = 'none';
		this.iconContainer.style.visibility = 'hidden';
		this.iconContainer.style.marginTop = '2px';
		this.iconContainer.style.paddingRight = '2px';
		closeBtn.iconClass = 'layerview closesearch';

		closeBtn.getElement().style.cssFloat = 'right';
		closeBtn.getElement().style.pointerEvents = 'bounding-box';

		closeBtn.onClick(v => {
			searchInput.text = '';
			this.changeState('');
		});
	}

	private changeState(value) {
		if (value === '') {
			this.setIconDisplay(false);
		} else {
			this.setIconDisplay(true);
		}
		this.searchWithTree(value);
	}

	private setIconDisplay(b: boolean): void {
		this.iconContainer.style.visibility = (b ? 'visible' : 'hidden');
	}

	private searchWithTree(value: string): void {
		this.treeFilter.filterText = value;
		this.componentViewer.refresh();
	}

	/**
	 * 尺寸改变
	 * @param width 
	 * @param height 
	 */
	public doResize(width: number, height: any): void {
		setTimeout(() => {
			if (this.componentViewer) {
				this.componentViewer.layout();
			}
		}, 1);
	}

	/**
	 * 创建
	 */
	public create(): Promise<void> {
		if (this.storageService.get(ComponentView.COMPONENT_STORAGE_ELEMENTS, StorageScope.WORKSPACE) == undefined) {
			return this.componentSourceData.getRoot().then(input => {
				const selected: ComponentStat[] = this.componentViewer.getSelection();
				const expanded: ComponentStat[] = this.componentViewer.getExpandedElements();
				const scrollPos = this.componentViewer.getScrollPosition();
				return this.componentViewer.setInput(input).then(() => {
					return this.componentViewer.expandAll(expanded).then(() => {
						this.componentViewer.setSelection(selected);
						this.componentViewer.setScrollPosition(scrollPos);
					});
				});
			});
		} else {
			const targetsToExpand = JSON.parse(this.storageService.get(ComponentView.COMPONENT_STORAGE_ELEMENTS, StorageScope.WORKSPACE));
			// 从持久化数据中读取需要打开的节点。
			return this.doRefresh(targetsToExpand);
		}
	}

	/**
	 * 恢复上次存储的组件展开折叠状态
	 * @param targetsToExpand 
	 */
	private doRefresh(targetsToExpand: string[] = []): Promise<any> {
		return this.componentSourceData.getRoot().then(input => {
			return this.componentViewer.setInput(input).then(() => {
				//通过id得到对应的componentStat子节点，存入数组statsToExpand
				const statsToExpand: ComponentStat[] = [];
				for (let i = 0; i < targetsToExpand.length; i++) {
					if (targetsToExpand[i] == 'custom') {
						statsToExpand.push(input.children[0]);
					} else if (targetsToExpand[i] == 'component') {
						statsToExpand.push(input.children[1]);
					} else if (targetsToExpand[i] == 'container') {
						statsToExpand.push(input.children[2]);
					}
				}
				this.componentViewer.expandAll(statsToExpand);
				//还原滚动条位置
				const scrollPos = this.storageService.get(ComponentView.COMPONENT_STORAGE_SCROLLPOS, StorageScope.WORKSPACE);
				this.componentViewer.setScrollPosition(parseFloat(scrollPos));
			});
		});
	}

	private get root(): ComponentStat {
		return this.componentViewer ? (this.componentViewer.getInput()) as ComponentStat : null;
	}

	/**
	 * 面板关闭时存储组件状态和滚动条位置
	 */
	public shutdown(): void {
		// Keep list of expanded component folders to restore on next load
		if (this.root) {
			const idSet = new Set<string>();
			const expanded = this.componentViewer.getExpandedElements();
			//记录滚动条位置
			const scrollPos = this.componentViewer.getScrollPosition();
			expanded.forEach(element => {
				idSet.add(element.id);
			});
			this.storageService.store(ComponentView.COMPONENT_STORAGE_ELEMENTS, JSON.stringify(Array.from(idSet)), StorageScope.WORKSPACE);
			this.storageService.store(ComponentView.COMPONENT_STORAGE_SCROLLPOS, scrollPos, StorageScope.WORKSPACE);
		}
	}

	/**
	 * 释放
	 */
	public dispose(): void {
		this._disposes.map(v => v.dispose());
		this._disposes = null;
	}

	render(container: HTMLElement) {

		this.doRender(container);
	}

	doRender(container: HTMLElement) {
		const group = document.createElement('div');
		voluationToStyle(group.style,
			{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' });
		container.appendChild(group);

		this.treeContainer = document.createElement('div');
		voluationToStyle(this.treeContainer.style,
			{ flexGrow: '1', flexShrink: '1', width: '100%', position: 'relative' });
		group.appendChild(this.treeContainer);

		this.searchContainer = document.createElement('div');
		voluationToStyle(this.searchContainer.style,
			{ display: 'flex', 'flex-direction': 'row', width: '100%', flexGrow: '0', flexShrink: '0' });
		group.appendChild(this.searchContainer);

		this.handleTree();
		this.handleSearch();
	}
}

export namespace ComponentView {
	export const ID: string = 'workbench.component';
	export const TITLE: string = localize('componentView.title', 'Component');
}