import { InnerBtnWindow } from 'egret/platform/innerwindow/browser/innerWindow';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { remote } from 'electron';
import { EgretProjectModel } from 'egret/exts/exml-exts/exml/common/project/egretProject';
import { addClass, removeClass } from 'egret/base/common/dom';
import { TextInput } from 'egret/base/browser/ui/inputs';
import { Label } from 'egret/base/browser/ui/labels';
import { IconButton, SystemButton } from 'egret/base/browser/ui/buttons';
import { InnerButtonType } from 'egret/platform/innerwindow/common/innerWindows';
import { AttributeItemGroup } from '../../../base/browser/ui/containers';
import { writeWingProperty } from 'egret/exts/exml-exts/egretChecker';

import * as paths from 'path';
import * as fs from 'fs';

import './media/wingProperty.css';
import { localize } from '../../../base/localization/nls';
import { INotificationService } from 'egret/platform/notification/common/notifications';

/**
 * 新建文件夹
 */
export class WingPropertyPanel extends InnerBtnWindow {
	// 确认按钮事件
	public confirm: Function;
	// 取消按钮事件
	public cancel: Function;


	//点击确定回调
	public submitFun: Function;

	private resInput: TextInput;
	private resBtn: SystemButton;

	private themeInput: TextInput;

	private themeBtn: SystemButton;

	private promptLabel: Label;

	private disposables: IDisposable[] = [];



	constructor(
		private wingProperty: any,
		private projectModel: EgretProjectModel,
		@INotificationService private notificationService: INotificationService
	) {
		super();
		//TODO 这个标题暂时先叫下面这个，未来这个产品可能不叫wing
		this.title = localize('wingPropertyPanel.constructor,title', 'wingProperty.json Setting');

		// 设置窗体按钮
		this.initButtons(
			{ label: localize('alert.button.confirm', 'Confirm'), closeWindow: false },
		);
		// 注册监听事件
		this.registerListeners();
	}



	/**
	 * 注册监听事件
	 */
	private registerListeners(): void {
		// 监听按钮点击事件
		const dispose = this.onButtonClick(e => this.handleBtnClick(e));
		this.disposables.push(dispose);
		this.onClosing((e) => {
			e.veto(false);
		});
	}


	/**
	 * 按钮点击绑定事件
	 */
	private handleBtnClick(button: InnerButtonType): void {
		const validate = validateProperty(this.wingProperty, this.projectModel.project.fsPath);
		switch (button) {
			// 确定按钮
			case InnerButtonType.FIRST_BUTTON:
				if (validate.isResExist && validate.isThemeExist) {
					writeWingProperty(this.wingProperty, paths.join(this.projectModel.project.fsPath, paths.sep, 'wingProperties.json'));
					this.close();
				}

				break;
			// 取消按钮
			case InnerButtonType.SECOND_BUTTON:
				if (validate.isResExist && validate.isThemeExist) {
					this.close();
				}
				break;
			// 左上角关闭按钮
			case InnerButtonType.CLOSE_BUTTON:
				break;
		}
	}

	private container: HTMLElement;
	/**
	 * 重载父类方法，对窗体进行渲染
	 */
	public render(contentGroup: HTMLElement): void {
		super.render(contentGroup);
		this.container = contentGroup;

		//定义跟容器的样式
		contentGroup.style.display = 'flex';
		contentGroup.style.flexDirection = 'column';
		contentGroup.style.alignItems = 'stretch';
		contentGroup.style.position = 'relative';
		contentGroup.style.padding = '15px 15px 0 15px';
		contentGroup.style.width = '400px';

		// TODO 这个需要精确的描述
		// const descriptDisplay = new Label(contentGroup);
		// descriptDisplay.text = localize('wingPropertyPanel.render.description', 'The resource <resourcePlugin.configs> and theme <theme> in the project root directory wingProperties.json are required to display the EUI project.');

		const themeAttItemContainer = new AttributeItemGroup(contentGroup);
		themeAttItemContainer.additionalVisible = true;
		themeAttItemContainer.style.marginTop = '15px';
		themeAttItemContainer.label = localize('wingPropertyPanel.render.topic', 'Theme:');
		this.themeInput = new TextInput(themeAttItemContainer.getElement());
		this.themeInput.readonly = true;
		this.themeInput.prompt = localize('wingPropertyPanel.render.selectTopicFile', 'Select add theme file');
		this.themeBtn = new SystemButton(themeAttItemContainer.getAdditionalElement());
		this.themeBtn.label = localize('wingPropertyPanel.render.browse', 'Browse');

		const resAttItemContainer = new AttributeItemGroup(contentGroup);
		resAttItemContainer.additionalVisible = true;
		resAttItemContainer.style.marginTop = '5px';
		resAttItemContainer.label = localize('wingPropertyPanel.render.resource', 'Resource:');
		this.resInput = new TextInput(resAttItemContainer.getElement());
		this.resInput.prompt = localize('wingPropertyPanel.render.selectSourceFile', 'Select Add resource configuration file');
		this.resInput.readonly = true;
		this.resBtn = new SystemButton(resAttItemContainer.getAdditionalElement());
		this.resBtn.label = localize('wingPropertyPanel.render.browse', 'Browse');


		this.addBtnListener();
		this.init();

	}

	private addErrorLabel(): void {
		this.promptLabel = new Label(this.container);
		this.promptLabel.style.textAlign = 'center';
		this.promptLabel.style.marginTop = '15px';
		this.promptLabel.style.color = '#ff5555';
		this.promptLabel.style.wordWrap = 'break-word';
		this.promptLabel.fontSize = 12;
		this.promptLabel.height = 20;
	}

	private addBtnListener(): void {
		this.disposables.push(this.themeBtn.onClick(this.themeClick.bind(this)));
		this.disposables.push(this.resBtn.onClick(this.resClick.bind(this)));
	}

	private themeClick(e): void {
		remote.dialog.showOpenDialog({
			defaultPath: this.projectModel.project ? this.projectModel.project.fsPath : '',
			properties: ['openFile'], filters: [{
				name: 'Text',
				extensions: ['json']
			}]
		}, (filePaths) => {
			let temp: string;
			if (filePaths) {
				if (filePaths.length === 1) {
					temp = filePaths[0];
					const relativerPath = paths.relative(this.projectModel.project.fsPath, temp);
					if (relativerPath.indexOf('..') === -1) {
						this.themeInput.text = relativerPath.replace(/\\/g, '/');
						this.wingProperty.theme = relativerPath;
						removeClass(this.themeInput.getElement(), 'error');
						this.freshError();
					}
					else {
						this.notificationService.error({ content: localize('wingPropertyPanel.themeClick.notExistCurrectProject', '{0} is not in the current project!', temp), duration: 3 });
					}
				}
			}
		});
	}


	private resClick(e): void {
		remote.dialog.showOpenDialog({
			defaultPath: this.projectModel.project ? this.projectModel.project.fsPath : '',
			properties: ['openFile'], filters: [{
				name: 'Text',
				extensions: ['json']
			}]
		}, (filePaths) => {
			let temp: string;
			if (filePaths) {
				if (filePaths.length === 1) {
					temp = filePaths[0];
					const relativerPath = paths.relative(this.projectModel.project.fsPath, temp);
					//判断是否已经存在
					if (!this.isResExist(temp)) {
						if (relativerPath.indexOf('..') === -1) {
							let folder = '';
							if (relativerPath.split(paths.sep).length > 1) {
								folder = relativerPath.split(paths.sep)[0] + paths.sep;
							}
							const resconfigs = this.wingProperty.resourcePlugin.configs;
							const config = { configPath: relativerPath, relativePath: folder };
							resconfigs.push(config);

							this.wingProperty.resourcePlugin.configs = resconfigs.map(v => { return { configPath: v.configPath.replace(/\\/g, '/'), relativePath: v.relativePath }; });
							this.getItem(config, resconfigs.length);
							this.freshError();
						} else {
							this.notificationService.error({ content: localize('wingPropertyPanel.themeClick.notExistCurrectProject', '{0} is not in the current project!', temp), duration: 3 });
						}
					}
				}
			}
		});
	}

	// 刷新数据
	private init(): void {
		const cp = paths.join(this.projectModel.project.fsPath, paths.sep, this.wingProperty.theme);
		// 如果文件不存在
		if (!fs.existsSync(cp) || this.wingProperty.theme) {
			addClass(this.themeInput.getElement(), 'error');
		}
		if (this.wingProperty.theme) {
			this.themeInput.text = this.wingProperty.theme;
		}

		this.wingProperty.resourcePlugin.configs.forEach((v, index) => {
			this.getItem(v as any, index);
		});

		this.freshError();
	}

	private freshError(): void {
		const errorObj = validateProperty(this.wingProperty, this.projectModel.project.fsPath);
		removeClass(this.themeInput.getElement(), 'error');
		// if (!errorObj.isResExist) {
		// 	errors.push('资源配置文件不存在');
		// }

		if (!errorObj.isThemeExist) {
			addClass(this.themeInput.getElement(), 'error');
		}

		this.promptLabel && this.promptLabel.dispose();

		if (errorObj.prompts.length !== 0) {
			this.addErrorLabel();
			this.promptLabel.text = errorObj.prompts.join('，\n') + '。';
		}

	}

	// 判断资源配置是否存在
	private isResExist(_p): boolean {
		let isExit = false;
		this.wingProperty.resourcePlugin.configs.forEach(v => {
			if (paths.join(this.projectModel.project.fsPath, paths.sep, v.configPath) === _p) {
				isExit = true;
			}
		});
		return isExit;
	}

	// 添加一条资源配置信息
	private getItem(item: any, index: number): void {
		const resAttItemContainer = new AttributeItemGroup(this.container);
		resAttItemContainer.additionalVisible = true;
		resAttItemContainer.style.marginTop = '5px';
		resAttItemContainer.label = '';
		const resInput = new TextInput(resAttItemContainer.getElement());
		resInput.prompt = localize('wingPropertyPanel.render.selectTopicFile', 'Select add theme file');
		resInput.readonly = true;
		const resBtn = new IconButton(resAttItemContainer.getAdditionalElement());
		resBtn.iconClass = 'wingPropertyPanel deleteIcon';
		resInput.text = item.configPath;
		const cp = paths.join(this.projectModel.project.fsPath, paths.sep, item.configPath);

		const exist = fs.existsSync(cp);
		if (!exist) {
			addClass(resInput.getElement(), 'error');
		}

		resBtn.onClick((e) => {
			const resConfigs = this.wingProperty.resourcePlugin.configs;
			resConfigs.forEach((element, index) => {
				if (element['configPath'] === item.configPath && element['relativePath'] === item.relativePath) {
					resConfigs.splice(index, 1);
					// let wing = this.projectModel.getWingProperties();
					this.wingProperty.resourcePlugin.configs = resConfigs.map(v => { return { configPath: v.configPath, relativePath: v.relativePath }; });
					this.freshError();
				}
			});

			resAttItemContainer.dispose();
		});
	}

	/**
	 * 清理
	 */
	public dispose() {
		super.dispose();
		dispose(this.disposables);
		this.cancel = null;
		this.confirm = null;
	}
}


/**
 * 校验 wingProperties.json 中的资源、主题是否存在
 * @param property 
 * @param rootPath 
 */
export function validateProperty(property: any, rootPath: string): { isResExist: boolean, isThemeExist: boolean, prompts: Array<string> } {
	let isThemeExist = false;
	let resourceLen = 0;

	// 表示是否存在正确的配置 如果有可以通过
	let isResExist = true;

	const noExistResourceArr = [];
	const resourcePlugin = property['resourcePlugin'];
	if (resourcePlugin) {
		const configs: any[] = resourcePlugin['configs'];
		if (configs && configs.length > 0) {
			for (let i = 0; i < configs.length; i++) {
				const url: string = configs[i]['url'] || configs[i]['configPath'];
				if (!url) {
					continue;
				}
				resourceLen++;
				const fullPath = paths.join(rootPath, url);
				if (!fs.existsSync(fullPath)) {
					noExistResourceArr.push(fullPath);
					isResExist = false;
				}
			}
		} else {
			isResExist = false;
		}
	}
	const themePath = property['theme'];
	if (themePath) {
		const themeFullPath = paths.join(rootPath, themePath);
		if (fs.existsSync(themeFullPath)) {
			isThemeExist = true;
		}
	}
	let prompts: string[] = [];
	if (!isThemeExist) {
		prompts.push(localize('wingPropertyPanel.validateProperty.configFileNotExist', 'Theme profile does not exist'));
	}
	if (resourceLen === 0) {
		prompts.push(localize('wingPropertyPanel.validateProperty.resourceFileNotExist', 'Need to set the resource configuration file'));
	} else if (noExistResourceArr.length > 0) {
		prompts = prompts.concat(noExistResourceArr.map(v => { return localize('wingPropertyPanel.validateProperty.notExistFile', 'Unable to find file {0}', v); }));
	}
	return { isThemeExist, isResExist, prompts };
}