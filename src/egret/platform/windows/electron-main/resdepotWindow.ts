import { IWindowConfiguration } from '../common/window';
import { app } from 'electron';
import { parseArgs } from '../../environment/node/argv';
import { assign } from 'egret/base/common/objects';
import { BrowserWindowEx } from './browserWindowEx';
import * as path from 'path';
import { IEnvironmentService } from 'egret/platform/environment/common/environment';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { ResMenu } from 'egret/code/electron-main/menus';

export class ResdepotWindow extends BrowserWindowEx {
	/**
	 *
	 */
	constructor(windowId: string,
		@IInstantiationService private instantiationService: IInstantiationService,
		@IEnvironmentService environmentService: IEnvironmentService) {
		super(windowId, environmentService);
		this.instantiationService.createInstance(ResMenu, this._win);		
	}
	
	protected initWindow(): void {
		super.initWindow();
		this._win.setTitle('Res Editor');
		this._win.removeMenu();
	}
	
	protected getUrl(windowConfiguration: IWindowConfiguration): string {
		windowConfiguration.windowId = this._win.id;
		const environment = parseArgs(process.argv);
		const config = assign(environment, windowConfiguration);
		return `file://${path.join(app.getAppPath(), './out/egret/workbench/electron-browser/bootstrap/resdepot.html')}?config=${encodeURIComponent(JSON.stringify(config))}`;
	}
}