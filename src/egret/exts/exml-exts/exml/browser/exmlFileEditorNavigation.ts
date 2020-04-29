import { EditMode, PreviewConfig } from './commons';
import { Emitter, Event } from 'egret/base/common/event';
import { addClass } from 'egret/base/common/dom';
import { Tabbar, DataSource } from 'egret/base/browser/ui/tabbars';
import { IconButton, ToggleButton, ToggleIconButton } from 'egret/base/browser/ui/buttons';
import { localize } from 'egret/base/localization/nls';
import { Select, SelectDataSource } from 'egret/base/browser/ui/selects';
import { HGroup } from 'egret/base/browser/ui/containers';
import { Label } from 'egret/base/browser/ui/labels';

import './media/exmlFileEditor.css';

/**
 * Exml编辑器的顶部工具栏
 */
export class ExmlFileEditorNavigation {

	private _onEditModeChanged: Emitter<EditMode>;
	private _onPreviewOptionChanged: Emitter<void>;
	private _onRefreshClick: Emitter<void>;
	private _onBackgroundClick: Emitter<void>;
	private _onZoomInClick: Emitter<void>;
	private _onZoomOutClick: Emitter<void>;
	private _onShowAllClick: Emitter<void>;
	private _onNoScaleClick: Emitter<void>;

	private _onGrabChanged: Emitter<boolean>;
	private _onLockGroupChanged: Emitter<boolean>;
	private _onAdsortChanged: Emitter<boolean>;



	private container: HTMLElement;
	constructor(container: HTMLElement) {
		this._onEditModeChanged = new Emitter<EditMode>();
		this._onRefreshClick = new Emitter<void>();
		this._onPreviewOptionChanged = new Emitter<void>();
		this._onZoomInClick = new Emitter<void>();
		this._onZoomOutClick = new Emitter<void>();
		this._onShowAllClick = new Emitter<void>();
		this._onNoScaleClick = new Emitter<void>();
		this._onGrabChanged = new Emitter<boolean>();
		this._onLockGroupChanged = new Emitter<boolean>();
		this._onAdsortChanged = new Emitter<boolean>();
		this._onBackgroundClick = new Emitter<void>();

		this.container = container;
		const navigationContainer: HTMLElement = document.createElement('div');
		addClass(navigationContainer, 'exml-editor-navigation');
		this.container.appendChild(navigationContainer);
		this.initView(navigationContainer);
	}
	/** 编辑模式改变了 */
	public get onEditModeChanged(): Event<EditMode> {
		return this._onEditModeChanged.event;
	}
	/** 预览设置改变了 */
	public get onPreviewOptionChanged(): Event<void> {
		return this._onPreviewOptionChanged.event;
	}
	/** 刷新按钮点击 */
	public get onRefreshClick(): Event<void> {
		return this._onRefreshClick.event;
	}
	/** 参考图按钮点击 */
	public get onBackgroundClick(): Event<void> {
		return this._onBackgroundClick.event;
	}
	/** 缩小点击 */
	public get onZoomInClick(): Event<void> {
		return this._onZoomInClick.event;
	}
	/** 放大点击 */
	public get onZoomOutClick(): Event<void> {
		return this._onZoomOutClick.event;
	}
	/** 显示全部点击 */
	public get onShowAllClick(): Event<void> {
		return this._onShowAllClick.event;
	}
	/** 无缩放点击 */
	public get onNoScaleClick(): Event<void> {
		return this._onNoScaleClick.event;
	}
	/** 吸附改变 */
	public get onAdsortChanged(): Event<boolean> {
		return this._onAdsortChanged.event;
	}
	/** 锁定图层移动改变 */
	public get onLockGroupChanged(): Event<boolean> {
		return this._onLockGroupChanged.event;
	}
	/** 使用🤚移动场景 */
	public get onGrabChanged(): Event<boolean> {
		return this._onGrabChanged.event;
	}



	private modeTabbar: Tabbar;
	private modeDataSources: DataSource[] = [];
	private refreshBtn: IconButton;

	private mobileFitContainer: HGroup;
	private deviceSelect: Select;
	private deviceDataProvider: SelectDataSource[] = [];
	private scaleSelect: Select;
	private scaleDataProvider: SelectDataSource[] = [];
	private fitContentButton: ToggleButton;

	private funcContainer: HGroup;
	private grabBtn: ToggleIconButton;
	private lockGroupBtn: ToggleIconButton;
	private adsorbBtn: ToggleIconButton;
	private backgroundBtn: IconButton;


	private zoomContainer: HGroup;
	private zoominBtn: IconButton;
	private zoomoutBtn: IconButton;
	private fitBtn: IconButton;
	private zoomLabel: Label;

	/**
	 * 预览尺寸
	 */
	public get previewConfig(): PreviewConfig {
		return {
			screenWidth: this.deviceSelect.selection.data.w,
			screenHeight: this.deviceSelect.selection.data.h,
			screenScale: this.scaleSelect.selection.data,
			fitContent: this.fitContentButton.selected
		};
	}


	private initView(container: HTMLElement): void {
		this.modeTabbar = new Tabbar(container);
		this.modeDataSources.push({
			label: localize('exml.editor.design', 'Design'),
			iconClass: 'design-icon',
			id: EditMode.DESIGN
		});
		this.modeDataSources.push({
			label: localize('exml.editor.animation', 'Animation'),
			iconClass: 'animation-icon',
			id: EditMode.ANIMATION
		});
		this.modeDataSources.push({
			label: localize('exml.editor.preview', 'Preview'),
			iconClass: 'preview-icon',
			id: EditMode.PREVIEW
		});
		this.modeDataSources.push({
			label: localize('exml.editor.code', 'Code'),
			iconClass: 'code-icon',
			id: EditMode.CODE
		});

		this.modeTabbar.dataProvider = this.modeDataSources;
		this.modeTabbar.onSelectedChanged(dataSource => this.modeTabbarChanged_handler(dataSource));
		this.modeTabbarChanged_handler(this.modeTabbar.selection);

		this.refreshBtn = new IconButton(container);
		this.refreshBtn.iconClass = 'refresh-icon';
		this.refreshBtn.style.marginLeft = '6px';
		this.refreshBtn.onClick(e => this.refreshClick_handler());

		this.mobileFitContainer = new HGroup(container);
		this.mobileFitContainer.style.marginLeft = '10px';

		this.fitContentButton = new ToggleButton(this.mobileFitContainer);
		this.fitContentButton.label = localize('exml.editor.adaptContent', 'Fit Content');
		this.fitContentButton.selected = false;
		this.fitContentButton.onSelectedChanged(e => { this._onPreviewOptionChanged.fire(); });

		this.deviceSelect = new Select(this.mobileFitContainer);
		this.deviceSelect.style.marginLeft = '5px';
		this.deviceDataProvider.push({ label: localize('exml.editor.noDevice', 'No Device'), id: localize('exml.editor.noDevice', 'No Device'), data: { w: 0, h: 0 } });
		this.deviceDataProvider.push({ label: 'Galaxy S5', id: 'Galaxy S5', data: { w: 360, h: 640 } });
		this.deviceDataProvider.push({ label: 'Pixel 2', id: 'Pixel 2', data: { w: 411, h: 731 } });
		this.deviceDataProvider.push({ label: 'Pixel 2 XL', id: 'Pixel 2 XL', data: { w: 411, h: 823 } });
		this.deviceDataProvider.push({ label: 'iPhone 5/SE', id: 'iPhone 5/SE', data: { w: 320, h: 568 } });
		this.deviceDataProvider.push({ label: 'iPhone 5/7/8', id: 'iPhone 5/7/8', data: { w: 375, h: 667 } });
		this.deviceDataProvider.push({ label: 'iPhone 5/7/8 Plus', id: 'iPhone 5/7/8 Plus', data: { w: 414, h: 736 } });
		this.deviceDataProvider.push({ label: 'iPhone X', id: 'iPhone X', data: { w: 375, h: 812 } });
		this.deviceDataProvider.push({ label: 'iPad', id: 'iPad', data: { w: 768, h: 1024 } });
		this.deviceDataProvider.push({ label: 'iPad Pro', id: 'iPad Pro', data: { w: 1024, h: 1366 } });
		this.deviceSelect.dataProvider = this.deviceDataProvider;
		this.deviceSelect.onSelectedChanged(() => { this._onPreviewOptionChanged.fire(); });

		this.scaleSelect = new Select(this.mobileFitContainer);
		this.scaleSelect.style.marginLeft = '5px';
		this.scaleDataProvider.push({ label: localize('exml.editor.adaptivewindow', 'Fit Screen'), id: 'fitWindows', data: 0 });
		this.scaleDataProvider.push({ label: '25%', id: '25%', data: 0.25 });
		this.scaleDataProvider.push({ label: '50%', id: '50%', data: 0.5 });
		this.scaleDataProvider.push({ label: '75%', id: '75%', data: 0.75 });
		this.scaleDataProvider.push({ label: '100%', id: '100%', data: 1 });
		this.scaleDataProvider.push({ label: '125%', id: '125%', data: 1.25 });
		this.scaleDataProvider.push({ label: '150%', id: '150%', data: 1.5 });
		this.scaleSelect.dataProvider = this.scaleDataProvider;
		this.scaleSelect.onSelectedChanged(() => this._onPreviewOptionChanged.fire());
		this.editMode = EditMode.DESIGN;

		const space = new HGroup(container);
		space.style.flexGrow = '2';

		this.funcContainer = new HGroup(container);
		this.funcContainer.style.marginRight = '30px';

		this.grabBtn = new ToggleIconButton(this.funcContainer);
		this.grabBtn.iconClass = 'grab-icon';
		this.grabBtn.onSelectedChanged(() => this._onGrabChanged.fire(this.grabBtn.selected));

		this.lockGroupBtn = new ToggleIconButton(this.funcContainer);
		this.lockGroupBtn.iconClass = 'lockgroup-icon';
		this.lockGroupBtn.onSelectedChanged(() => this._onLockGroupChanged.fire(this.lockGroupBtn.selected));

		this.adsorbBtn = new ToggleIconButton(this.funcContainer);
		this.adsorbBtn.iconClass = 'adsorb-icon';
		this.adsorbBtn.style.marginLeft = '3px';
		this.adsorbBtn.onSelectedChanged(() => this._onAdsortChanged.fire(this.adsorbBtn.selected));
		
		this.backgroundBtn = new IconButton(this.funcContainer);
		this.backgroundBtn.iconClass = 'background-icon';
		this.backgroundBtn.style.marginLeft = '3px';
		this.backgroundBtn.onClick(e => this.backgroundClick_handler());

		this.zoomContainer = new HGroup(container);
		this.zoomContainer.style.marginRight = '10px';

		this.zoomoutBtn = new IconButton(this.zoomContainer);
		this.zoomoutBtn.iconClass = 'zoomout-icon';
		this.zoomoutBtn.onClick(() => { this._onZoomOutClick.fire(); });

		this.zoomLabel = new Label(this.zoomContainer);
		this.zoomLabel.text = '100%';
		this.zoomLabel.style.marginLeft = '3px';
		this.zoomLabel.style.minWidth = '50px';
		this.zoomLabel.style.maxWidth = '50px';
		this.zoomLabel.style.textAlign = 'center';

		this.zoominBtn = new IconButton(this.zoomContainer);
		this.zoominBtn.iconClass = 'zoomin-icon';
		this.zoominBtn.style.marginLeft = '3px';
		this.zoominBtn.onClick(() => { this._onZoomInClick.fire(); });

		this.fitBtn = new IconButton(this.zoomContainer);
		this.fitBtn.iconClass = 'max-icon';
		this.fitBtn.style.marginLeft = '3px';
		this.fitBtn.onClick(() => this.fitClick_handler());
	}
	private currentFitType = 'noScale';
	private fitClick_handler(): void {
		if (this.currentFitType == 'noScale') {
			this.currentFitType = 'showAll';
			this.fitBtn.iconClass = 'min-icon';
			this._onShowAllClick.fire();
		} else {
			this.currentFitType = 'noScale';
			this.fitBtn.iconClass = 'max-icon';
			this._onNoScaleClick.fire();
		}
	}
	/**
	 * 更新显示比例
	 * @param scale 
	 */
	public updateZoomDisplay(scale: number): void {
		scale *= 100;
		this.zoomLabel.text = Math.round(scale * 10) / 10 + '%';
	}

	private currentSelectionModel: EditMode;
	private modeTabbarChanged_handler(selection: DataSource): void {
		this.currentSelectionModel = selection.id as EditMode;
		this.updateExmlOptionVisible();
		this._onEditModeChanged.fire(this.currentSelectionModel);
	}

	/**
	 * 编辑模式，修改此值也会派发相关事件。
	 */
	public get editMode(): EditMode {
		return this.currentSelectionModel;
	}
	public set editMode(value: EditMode) {
		if (this.currentSelectionModel != value) {
			this.modeTabbar.selection = this.modeDataSources.filter(data => data.id == value)[0];
			this._onEditModeChanged.fire(value);
		}
		this.updateExmlOptionVisible();
	}
	/**
	 * 是否开启了吸附
	 */
	public get adsorbed(): boolean {
		return this.adsorbBtn.selected;
	}
	public set adsorbed(value: boolean) {
		this.adsorbBtn.selected = value;
	}
	/**
	 * 是否开启了锁定图层移动
	 */
	public get lockGroup(): boolean {
		return this.lockGroupBtn.selected;
	}
	public set lockGroup(value: boolean) {
		this.lockGroupBtn.selected = value;
	}

	private updatePreviewOptionVisible(): void {
		if (this.mobileFitContainer) {
			if (this.currentSelectionModel == EditMode.PREVIEW) {
				this.mobileFitContainer.visible = true;
			} else {
				this.mobileFitContainer.visible = false;
			}
		}
	}

	private updateExmlOptionVisible(): void {
		if (this.currentSelectionModel === EditMode.CODE) {
			if (this.refreshBtn) {
				this.refreshBtn.style.display = 'none';
			}
			if (this.mobileFitContainer) {
				this.mobileFitContainer.visible = false;
			}
			if (this.funcContainer) {
				this.funcContainer.visible = false;
			}
			if (this.zoomContainer) {
				this.zoomContainer.visible = false;
			}
		} else {
			if (this.refreshBtn) {
				this.refreshBtn.style.display = 'block';
			}
			this.updatePreviewOptionVisible();
			if (this.funcContainer) {
				this.funcContainer.visible = true;
			}
			if (this.zoomContainer) {
				this.zoomContainer.visible = true;
			}
		}
	}

	private refreshClick_handler(): void {
		this._onRefreshClick.fire(void 0);
	}

	private backgroundClick_handler(): void {
		this._onBackgroundClick.fire(void 0);
	}
}