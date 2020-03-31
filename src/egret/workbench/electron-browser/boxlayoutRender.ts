import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IWorkbenchEditorService } from '../services/editor/common/ediors';
import { BaseEditor } from 'egret/editor/browser/baseEditor';
import URI from '../../base/common/uri';
import { remote } from 'electron';
import * as  electron from 'electron';
import { localize } from '../../base/localization/nls';
import { IEditor } from 'egret/editor/core/editors';
import { addClass, removeClass } from 'egret/base/common/dom';

class EditorCreater {
	constructor(
		@IWorkbenchEditorService private editorService: IWorkbenchEditorService
	) {
	}

	public createEditor(panelInfo: string): boxlayout.ITabPanel {
		return <any>this.editorService.createEditor({ resource: URI.file(panelInfo) }) as boxlayout.ITabPanel;
	}
}

export class DocumentPanelSerialize implements boxlayout.IPanelSerialize {

	private _editorCreater: EditorCreater;
	public get editorCreater(): EditorCreater {
		if (!this._editorCreater) {
			this._editorCreater = this.instantiationService.createInstance(EditorCreater);
		}
		return this._editorCreater;
	}
	constructor(
		@IInstantiationService private instantiationService: IInstantiationService) {
	}
	public serialize(ownerLayout: boxlayout.BoxLayout, panel: boxlayout.ITabPanel): string {
		return panel.getId();
	}
	public unSerialize(ownerLayout: boxlayout.BoxLayout, panelInfo: string): boxlayout.ITabPanel {
		return this.editorCreater.createEditor(panelInfo);
	}
}

enum EditorMenuCommmands {
	close = 'close',
	closeOthers = 'closeOthers',
	closeRight = 'closeRight',
	closeAllSaved = 'closeAllSaved',
	closeAll = 'closeAll',
}

class ClosableTitleRender extends boxlayout.DefaultTitleRender {

	private menu: electron.Menu;
	constructor(
		@IWorkbenchEditorService private editorService: IWorkbenchEditorService
	) {
		super();
		this.mouseDown_handler = this.mouseDown_handler.bind(this);
		this.closeClick_handler = this.closeClick_handler.bind(this);
		this.rootClick_handler = this.rootClick_handler.bind(this);

		const closeBtn = document.createElement('div');
		closeBtn.className = 'close-btn';
		closeBtn.addEventListener('click', this.closeClick_handler);
		this.root.appendChild(closeBtn);
		this.initContextMenu();

	}

	private initContextMenu(): void {
		this.menu = new remote.Menu();
		this.addMenuItem(localize('editor.contextMenu.close', 'Close'), EditorMenuCommmands.close);
		this.addMenuItem(localize('editor.contextMenu.closeOthers', 'Close Others'), EditorMenuCommmands.closeOthers);
		this.addMenuItem(localize('editor.contextMenu.closeRight', 'Close to the Right'), EditorMenuCommmands.closeRight);
		this.addMenuItem(localize('editor.contextMenu.closeAllSaved', 'Close Saved'), EditorMenuCommmands.closeAllSaved);
		this.addMenuItem(localize('editor.contextMenu.closeAll', 'Close All'), EditorMenuCommmands.closeAll);

		this.root.addEventListener('mousedown', this.mouseDown_handler);
		this.root.addEventListener('mouseup', this.rootClick_handler);
	}
	private rootClick_handler(e: MouseEvent): void {
		if (e.which === 2) {
			this.closeSelf();
		}
		const isDoubleClick = (e.detail === 2);
		if (isDoubleClick) {
			const editor = this.panel as BaseEditor;
			if (editor instanceof BaseEditor) {
				editor.setPreview(false);
			}
			this.setPreivew(false);
		}
	}
	private mouseDown_handler(e: MouseEvent): void {
		if (e.button === 2) {
			e.preventDefault();
			e.stopImmediatePropagation();
			e.stopPropagation();
			this.displayContextMenu(e.pageX, e.pageY);
		}
	}

	public updateDisplay(): void {
		super.updateDisplay();
		const editor = this.panel as BaseEditor;
		if (editor instanceof BaseEditor) {
			this.setPreivew(editor.isPreview);
		}
	}

	private setPreivew(isPreview: boolean): void {
		const children = this.root.getElementsByClassName('tabbar-item-title');
		if (children.length > 0) {
			const target = children[0] as HTMLElement;
			if (isPreview) {
				addClass(target, 'preview');
			} else {
				removeClass(target, 'preview');
			}
		}
	}

	/**
	 * 显示上下文菜单
	 * @param displayX 
	 * @param displayY 
	 */
	private displayContextMenu(displayX: number, displayY: number): void {
		setTimeout(() => {
			this.menu.popup({
				window: remote.getCurrentWindow(),
				x: displayX,
				y: displayY
			});
		}, 20);
	}

	private addMenuItem(label: string, id: string): void {
		const option: electron.MenuItemConstructorOptions = { label, id };
		const item = this.createItem(option);
		this.menu.append(item);
	}
	/**
	 * 在上下文菜单中添加一个分割线
	 */
	private addMenuSeparator(): void {
		const option: electron.MenuItemConstructorOptions = { type: 'separator' };
		const item = new remote.MenuItem(option);
		this.menu.append(item);
	}

	private createItem(option: electron.MenuItemConstructorOptions): electron.MenuItem {
		option.click = (item, win) => {
			this.menuItemClick_handler(option.id as EditorMenuCommmands);
		};
		const item = new remote.MenuItem(option);
		return item;
	}

	private menuItemClick_handler(id: EditorMenuCommmands): void {
		switch (id) {
			case EditorMenuCommmands.close:
				this.closeSelf();
				break;
			case EditorMenuCommmands.closeAll:
				this.closeAll();
				break;
			case EditorMenuCommmands.closeAllSaved:
				this.closeAllSaved();
				break;
			case EditorMenuCommmands.closeOthers:
				this.closeOthers();
				break;
			case EditorMenuCommmands.closeRight:
				this.closeRight();
				break;
			default:
				break;
		}
	}

	private closeClick_handler(e: MouseEvent): void {
		this.closeSelf();
	}

	private closeSelf(): void {
		const editor = this.panel as BaseEditor;
		if (editor instanceof BaseEditor) {
			this.editorService.closeEditor(editor);
		}
	}

	private closeAll(): void {
		let panels = this.panel.ownerGroup.panels;
		panels = panels.concat();
		this.closeEditors(<any>panels as IEditor[]);
	}
	private closeAllSaved(): void {
		const panels = this.panel.ownerGroup.panels;
		const editors: IEditor[] = [];
		for (let i = 0; i < panels.length; i++) {
			const editor = panels[i] as BaseEditor;
			if (!editor.input.isDirty()) {
				editors.push(editor);
			}
		}
		this.closeEditors(editors);
	}
	private closeOthers(): void {
		const panels = this.panel.ownerGroup.panels;
		const curPanel = this.panel;
		const editors: IEditor[] = [];
		for (let i = 0; i < panels.length; i++) {
			if (panels[i] != curPanel) {
				editors.push(panels[i] as BaseEditor);
			}
		}
		this.closeEditors(editors);
	}
	private closeRight(): void {
		const panels = this.panel.ownerGroup.panels;
		const curPanel = this.panel;
		const editors: IEditor[] = [];
		let started: boolean = false;
		for (let i = 0; i < panels.length; i++) {
			if (started) {
				editors.push(panels[i] as BaseEditor);
			}
			if (panels[i] == curPanel) {
				started = true;
			}
		}
		this.closeEditors(editors);
	}

	private closeEditors(inputs: IEditor[]): void {
		// var resources:URI[] = [];
		// for(var i = 0;i<inputs.length;i++){
		// 	resources.push(inputs[i].input.getResource());
		// }
		this.editorService.closeEditors(inputs);
		// this.fileModelService.confirmSave(resources).then(result=>{
		// 	if(result == ConfirmResult.SAVE){
		// 		this.fileModelService.saveAll(resources).then(results=>{
		// 			if (!results.some(r => !r.success)) {//没有保存失败的内容
		// 				this.editorService.closeEditors(inputs);
		// 			}else{
		// 				var fails:URI[] = [];
		// 				for(var i = 0;i<results.length;i++){
		// 					var result = results[i];
		// 					if(!result.success){
		// 						fails.push(result.source);
		// 					}
		// 				}
		// 				var message = '';
		// 				if (fails.length == 1) {
		// 					message = localize('editor.contextMenu.saveError','Save the changes made to file {0} fail.',paths.basename(fails[0].fsPath));
		// 				} else {
		// 					message = getConfirmMessage(localize('editor.contextMenu.saveErrors','Save the changes made to the following {0} files fail.',fails.length), fails);
		// 				}
		// 				this.notificationService.error({content:message});
		// 			}
		// 		});
		// 	}else if(result == ConfirmResult.DONT_SAVE){
		// 		this.editorService.closeEditors(inputs);
		// 	}
		// });
	}
}


export class ClosableTitleRenderFactory implements boxlayout.ITitleRenderFactory {
	constructor(@IInstantiationService private instantiationService: IInstantiationService) {
	}

	public createTitleRender(): boxlayout.ITitleRender {
		return this.instantiationService.createInstance(ClosableTitleRender);
	}
}
