import { IOutputService } from './output';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import { OutputView } from '../browser/outputView';

export class OutPutService implements IOutputService {
	_serviceBrand: undefined;

	private _impl: IOutputService = null;
	private _scrollLock: boolean = false;
	/**
	 *
	 */
	constructor(
		@IWorkspaceService private workspaceService: IWorkspaceService) {
		
	}
	init(impl: IOutputService): void {
		this._impl = impl;
	}
	get scrollLock(): boolean {
		if(this._impl) {
			return this._impl.scrollLock;
		}
		return this._scrollLock;
	}
	set scrollLock(value: boolean) {
		if(this._impl) {
			this._impl.scrollLock = value;
		}
		this._scrollLock = value;
	}

	private openOutput(): void {
		const panelId = OutputView.ID;
		const panels = this.workspaceService.boxlayout.getAllOpenPanels();
		let existPanel: boxlayout.ITabPanel = null;
		for (let i = 0; i < panels.length; i++) {
			if (panels[i].getId() == panelId) {
				existPanel = panels[i];
				break;
			}
		}
		if (existPanel) {
			existPanel.focus();
		} else {
			this.workspaceService.boxlayout.openPanelById(panelId, true);
		}
	}
	append(output: string): void {
		this.openOutput();
		if(this._impl) {
			this._impl.append(output);
		}
	}
	clear(): void {
		if(this._impl) {
			this._impl.clear();
		}
	}
}