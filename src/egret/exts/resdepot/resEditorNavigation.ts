import { Emitter, Event } from 'egret/base/common/event';
import { addClass } from 'egret/base/common/dom';
import { Tabbar, DataSource } from 'egret/base/browser/ui/tabbars';
import { localize } from 'egret/base/localization/nls';
import { IconButton } from 'egret/base/browser/ui/buttons';

export enum ResEditorMode {
	Code = 'codeEditor',
	Design = 'designEditor'
}
/**
 * res编辑器的顶部工具栏
 */
export class ResEditorNavigation {

	private _onEditModeChanged: Emitter<ResEditorMode>;
	private _onSaveClick: Emitter<void>;



	private container: HTMLElement;
	constructor(container: HTMLElement) {
		this._onEditModeChanged = new Emitter<ResEditorMode>();
		this._onSaveClick = new Emitter<void>();

		this.container = container;
		const navigationContainer: HTMLElement = document.createElement('div');
		addClass(navigationContainer, 'exml-editor-navigation');
		this.container.appendChild(navigationContainer);
		this.initView(navigationContainer);
	}
	/** 编辑模式改变了 */
	public get onEditModeChanged(): Event<ResEditorMode> {
		return this._onEditModeChanged.event;
	}
	/** 保存按钮点击 */
	public get onSaveClick(): Event<void> {
		return this._onSaveClick.event;
	}


	private modeTabbar: Tabbar;
	private modeDataSources: DataSource[] = [];
	private saveBtn: IconButton;


	private initView(container: HTMLElement): void {
		this.modeTabbar = new Tabbar(container);
		this.modeDataSources.push({
			label: localize('exml.editor.design', 'Design'),
			iconClass: 'design-icon',
			id: ResEditorMode.Design
		});
		this.modeDataSources.push({
			label: localize('exml.editor.code', 'Code'),
			iconClass: 'code-icon',
			id: ResEditorMode.Code
		});

		this.modeTabbar.dataProvider = this.modeDataSources;
		this.modeTabbar.onSelectedChanged(dataSource => this.modeTabbarChanged_handler(dataSource));
		this.modeTabbarChanged_handler(this.modeTabbar.selection);
		
		this.saveBtn = new IconButton(container);
		this.saveBtn.disable();
		this.saveBtn.iconClass = 'save-icon';
		this.saveBtn.style.marginLeft = '6px';
		this.saveBtn.onClick(e => this.saveClick_handler());

		this.editMode = ResEditorMode.Design;
	}

	private currentSelectionModel: ResEditorMode;
	private modeTabbarChanged_handler(selection: DataSource): void {
		this.currentSelectionModel = selection.id as ResEditorMode;
		this._onEditModeChanged.fire(this.currentSelectionModel);
	}

	private saveClick_handler(): void {
		this._onSaveClick.fire(void 0);
	}

	/**
	 * 编辑模式，修改此值也会派发相关事件。
	 */
	public get editMode(): ResEditorMode {
		return this.currentSelectionModel;
	}
	public set editMode(value: ResEditorMode) {
		if (this.currentSelectionModel != value) {
			this.modeTabbar.selection = this.modeDataSources.filter(data => data.id == value)[0];
			this._onEditModeChanged.fire(value);
		}
	}

	public updateSaveButtonState(enable: boolean): void {
		if (enable) {
			this.saveBtn.enable();
		} else {
			this.saveBtn.disable();
		}
	}
}