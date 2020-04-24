import { EgretProjectModel } from './exml/common/project/egretProject';

import * as fs from 'fs';
import TemplateTool from '../../workbench/parts/exml/TemplateTool';
import { WingPropertyPanel, validateProperty } from '../../workbench/parts/wingproperty/wingPropertyPanel';
import { IInstantiationService } from '../../platform/instantiation/common/instantiation';
import { localize } from '../../base/localization/nls';
import { INotificationService } from 'egret/platform/notification/common/notifications';

/**
 * Egret检查器
 */
export class EgretChecker {

	constructor(
		@IInstantiationService private instantiationService: IInstantiationService,
		@INotificationService private notificationService: INotificationService
	) {

	}

	private project: EgretProjectModel;
	/**
	 * 检查项目的正确性
	 * @param root 
	 */
	public checkProject(project: EgretProjectModel): Promise<boolean> {
		this.project = project;
		if (project.UILibrary == 'eui') {
			let wingPropertyJson = null;
			//step1 先确保得到一个WingProperty
			if (!fs.existsSync(project.wingPropertiesUri.fsPath)) {
				wingPropertyJson = TemplateTool.getWingProperties();
				writeWingProperty(wingPropertyJson,project.wingPropertiesUri.fsPath);
			} else {
				try {
					const wingPropertyStr = fs.readFileSync(project.wingPropertiesUri.fsPath, 'utf8');
					wingPropertyJson = JSON.parse(wingPropertyStr);
				} catch (error) { }
				if (!wingPropertyJson) {
					wingPropertyJson = TemplateTool.getWingProperties();
					writeWingProperty(wingPropertyJson,project.wingPropertiesUri.fsPath);
				}
			}

			const prompts = validateProperty(wingPropertyJson, project.project.fsPath);
			if (!prompts.isResExist || !prompts.isThemeExist || prompts.prompts.length > 0) {
				return this.promptPanel(wingPropertyJson, project);
				// .then(() => {
				// 	return true;
				// });
			} else {
				return Promise.resolve(true);
			}
		} else {
			this.notificationService.warn({ content: localize('egretChecker.checkProject.euiProjectError','This is not a valid Egret EUI project'), duration: 5 });
			return Promise.resolve(false);
		}
	}

	private wingPanel: WingPropertyPanel;

	private promptPanel(wingProperty: any, project: EgretProjectModel): Promise<boolean> {
		return new Promise((resolve, reject) => {
			//new panel
			//监听panel的关闭事件，
			//调用resove
			if (!this.wingPanel) {
				this.wingPanel = this.instantiationService.createInstance(WingPropertyPanel, wingProperty, project);
				this.wingPanel.forbiddenHeadBtn = true;
				this.wingPanel.onClosed((panel) => {
					this.wingPanel.dispose();
					this.wingPanel = null;
					resolve(true);
				});
				this.wingPanel.open(null, true);
			}

		});

	}

	
}

/**
 * 保存wing配置文件
 * @param property 
 */
export function  writeWingProperty(property: any,rootPath:string): void {
	const wingPropertyStr = JSON.stringify(property, null, 2);
	fs.writeFileSync(rootPath, wingPropertyStr, { encoding: 'utf8' });
}