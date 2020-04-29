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

import * as path from 'path';
import * as fs from 'fs';

import './media/wingProperty.css';
import { localize } from '../../../base/localization/nls';
import { INotificationService } from 'egret/platform/notification/common/notifications';
import URI from 'egret/base/common/uri';
import { isEqual } from 'egret/base/common/resources';
import * as paths from 'egret/base/common/paths';
import { deepClone } from 'egret/base/common/objects';

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
	private resListContainer: HTMLElement;
	private resDomItems: { group: AttributeItemGroup; button: IconButton; }[] = [];

	private themeInput: TextInput;
	private themeBtn: SystemButton;

	private skinInput: TextInput;
	private skinBtn: SystemButton;
	private skinListContainer: HTMLElement;
	private skinDomItems: { group: AttributeItemGroup; button: IconButton; }[] = [];

	private promptLabel: Label;
	private disposables: IDisposable[] = [];
	private cloneWingProperty: any;
	private cloneExmlRoots: URI[] = [];


	constructor(
		wingProperty: any,
		private projectModel: EgretProjectModel,
		@INotificationService private notificationService: INotificationService
	) {
		super();
		this.cloneWingProperty = deepClone(wingProperty);
		this.cloneExmlRoots = [...this.projectModel.exmlRoot];
		this.title = localize('wingPropertyPanel.constructor,title', 'EUI Project Setting');

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
		const validate = validateProperty(this.cloneWingProperty, this.cloneExmlRoots, this.projectModel.project.fsPath);
		switch (button) {
			// 确定按钮
			case InnerButtonType.FIRST_BUTTON:
				if (validate.isResExist && validate.isThemeExist && validate.isExmlRootExist) {
					writeWingProperty(this.cloneWingProperty, path.join(this.projectModel.project.fsPath, 'wingProperties.json'));
					this.projectModel.exmlRoot.splice(0, this.projectModel.exmlRoot.length);
					for (let i = 0; i < this.cloneExmlRoots.length; i++) {
						const element = this.cloneExmlRoots[i];
						this.projectModel.exmlRoot.push(element);
					}
					this.projectModel.saveEgretProperties();
					this.close();
				}

				break;
			// 取消按钮
			case InnerButtonType.SECOND_BUTTON:
				if (validate.isResExist && validate.isThemeExist && validate.isExmlRootExist) {
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
		resAttItemContainer.style.marginTop = '12px';
		resAttItemContainer.label = localize('wingPropertyPanel.render.resource', 'Resource:');
		this.resInput = new TextInput(resAttItemContainer.getElement());
		this.resInput.prompt = localize('wingPropertyPanel.render.selectSourceFile', 'Select Add resource configuration file');
		this.resInput.readonly = true;
		this.resBtn = new SystemButton(resAttItemContainer.getAdditionalElement());
		this.resBtn.label = localize('wingPropertyPanel.render.browse', 'Browse');
		this.resListContainer = document.createElement('div');
		this.container.appendChild(this.resListContainer);

		const skinAttItemContainer = new AttributeItemGroup(contentGroup);
		skinAttItemContainer.additionalVisible = true;
		skinAttItemContainer.style.marginTop = '12px';
		skinAttItemContainer.label = localize('wingPropertyPanel.render.skin', 'Skin:');
		this.skinInput = new TextInput(skinAttItemContainer.getElement());
		this.skinInput.prompt = localize('wingPropertyPanel.render.selectSkinRoot', 'Select Add skins root path');
		this.skinInput.readonly = true;
		this.skinBtn = new SystemButton(skinAttItemContainer.getAdditionalElement());
		this.skinBtn.label = localize('wingPropertyPanel.render.browse', 'Browse');
		this.skinListContainer = document.createElement('div');
		this.container.appendChild(this.skinListContainer);


		this.addBtnListener();
		this.init();

	}

	private addErrorLabel(): void {
		this.promptLabel = new Label(this.container);
		this.promptLabel.style.backgroundColor = '#8c0600';
		this.promptLabel.style.borderRadius = '2px';
		this.promptLabel.style.padding = '6px';
		this.promptLabel.style.marginTop = '15px';
		this.promptLabel.style.color = '#cbcbcb';
		this.promptLabel.style.wordWrap = 'break-word';
		this.promptLabel.fontSize = 12;
		this.promptLabel.height = 20;
	}

	private addBtnListener(): void {
		this.disposables.push(this.themeBtn.onClick(this.themeClick.bind(this)));
		this.disposables.push(this.resBtn.onClick(this.resClick.bind(this)));
		this.disposables.push(this.skinBtn.onClick(this.skinClick.bind(this)));
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
					const relativerPath = this.normalizeAndTrimSep(path.relative(this.projectModel.project.fsPath, temp));
					if (relativerPath.indexOf('..') === -1 &&
						paths.isEqualOrParent(paths.normalize(temp), paths.normalize(this.projectModel.project.fsPath))) {
						this.themeInput.text = relativerPath;
						this.cloneWingProperty.theme = relativerPath;
						removeClass(this.themeInput.getElement(), 'error');
						this.freshError();
					}
					else {
						this.notificationService.error({ content: localize('wingPropertyPanel.themeClick.notExistCurrectProject', '{0} is not in the current project!', temp), duration: 5 });
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
					const relativerPath = path.relative(this.projectModel.project.fsPath, temp);
					//判断是否已经存在
					if (!this.isResExist(temp)) {
						if (relativerPath.indexOf('..') === -1 &&
							paths.isEqualOrParent(paths.normalize(temp), paths.normalize(this.projectModel.project.fsPath))) {
							let folder = '';
							if (relativerPath.split(path.sep).length > 1) {
								folder = relativerPath.split(path.sep)[0] + path.posix.sep;
							}
							const resconfigs = this.cloneWingProperty.resourcePlugin.configs;
							const config = { configPath: this.normalizeAndTrimSep(relativerPath), relativePath: folder };
							resconfigs.push(config);

							this.cloneWingProperty.resourcePlugin.configs = resconfigs.map(v => { return { configPath: this.normalizeAndTrimSep(v.configPath), relativePath: v.relativePath }; });
							this.getResItem(this.resListContainer, config, resconfigs.length);
							this.freshError();
						} else {
							this.notificationService.error({ content: localize('wingPropertyPanel.themeClick.notExistCurrectProject', '{0} is not in the current project!', temp), duration: 5 });
						}
					}
				}
			}
		});
	}

	private skinClick(e): void {
		remote.dialog.showOpenDialog({
			defaultPath: this.projectModel.project ? this.projectModel.project.fsPath : '',
			properties: ['openDirectory']
		}, (filePaths) => {
			let temp: string;
			if (filePaths) {
				if (filePaths.length === 1) {
					temp = filePaths[0];
					let relativerPath = path.relative(this.projectModel.project.fsPath, temp);
					if (relativerPath === '') {
						relativerPath = '.';
					}
					//判断是否已经存在
					if (!this.isExmlRootExist(temp)) {
						if (relativerPath.indexOf('..') === -1 &&
							paths.isEqualOrParent(paths.normalize(temp), paths.normalize(this.projectModel.project.fsPath))) {
							this.cloneExmlRoots.push(URI.file(relativerPath));

							this.getSkinItem(this.skinListContainer, URI.file(relativerPath), this.cloneExmlRoots.length);
							this.freshError();
						} else {
							this.notificationService.error({ content: localize('wingPropertyPanel.themeClick.notExistCurrectProject', '{0} is not in the current project!', temp), duration: 5 });
						}
					}
				}
			}
		});
	}

	// 刷新数据
	private init(): void {
		const cp = path.join(this.projectModel.project.fsPath, this.cloneWingProperty.theme);
		// 如果文件不存在
		if (!fs.existsSync(cp) || this.cloneWingProperty.theme) {
			addClass(this.themeInput.getElement(), 'error');
		}
		if (this.cloneWingProperty.theme) {
			this.themeInput.text = this.cloneWingProperty.theme;
		}

		this.cloneWingProperty.resourcePlugin.configs.forEach((v, index) => {
			this.getResItem(this.resListContainer, v as any, index);
		});

		this.cloneExmlRoots.forEach((item, index) => {
			this.getSkinItem(this.skinListContainer, item, index);
		});

		this.freshError();
	}

	private freshError(): void {
		const errorObj = validateProperty(this.cloneWingProperty, this.cloneExmlRoots, this.projectModel.project.fsPath);
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
		this.cloneWingProperty.resourcePlugin.configs.forEach(v => {
			if (paths.isEqual(paths.normalize(path.join(this.projectModel.project.fsPath, v.configPath)), paths.normalize(_p))) {
				isExit = true;
			}
		});
		return isExit;
	}

	// 添加一条资源配置信息
	private getResItem(container: HTMLElement, item: any, index: number): void {
		const resAttItemContainer = new AttributeItemGroup(container);
		resAttItemContainer.additionalVisible = true;
		resAttItemContainer.style.marginTop = '5px';
		resAttItemContainer.label = '';
		const resInput = new TextInput(resAttItemContainer.getElement());
		resInput.prompt = localize('wingPropertyPanel.render.selectSourceFile', 'Select Add resource configuration file');
		resInput.readonly = true;
		const resBtn = new IconButton(resAttItemContainer.getAdditionalElement());
		resBtn.iconClass = 'wingPropertyPanel deleteIcon';
		resInput.text = this.normalizeAndTrimSep(item.configPath);
		const cp = path.join(this.projectModel.project.fsPath, item.configPath);
		this.addGroupDomItem(this.resDomItems, resAttItemContainer, resBtn);

		const exist = fs.existsSync(cp);
		if (!exist) {
			addClass(resInput.getElement(), 'error');
		}

		resBtn.onClick((e) => {
			const resConfigs = this.cloneWingProperty.resourcePlugin.configs;
			resConfigs.forEach((element, index) => {
				if (element['configPath'] === item.configPath && element['relativePath'] === item.relativePath) {
					resConfigs.splice(index, 1);
					// let wing = this.projectModel.getWingProperties();
					this.cloneWingProperty.resourcePlugin.configs = resConfigs.map(v => { return { configPath: v.configPath, relativePath: v.relativePath }; });
					this.freshError();
				}
			});

			resAttItemContainer.dispose();
			this.removeGroupDomItem(this.resDomItems, resAttItemContainer);
		});
	}

	private removeGroupDomItem(target: { group: AttributeItemGroup; button: IconButton; }[], group: AttributeItemGroup): void {
		const buttonEnable: boolean = target.length > 2;
		for (let i = 0; i < target.length; i++) {
			const element = target[i];
			if (buttonEnable) {
				element.button.enable();
			} else {
				element.button.disable();
			}
			if (element.group === group) {
				target.splice(i, 1);
				i--;
			}
		}
	}

	private addGroupDomItem(target: { group: AttributeItemGroup; button: IconButton; }[], group: AttributeItemGroup, button: IconButton): void {
		const buttonEnable: boolean = target.length >= 1;
		target.push({ group: group, button: button });
		for (let i = 0; i < target.length; i++) {
			const element = target[i];
			if (buttonEnable) {
				element.button.enable();
			} else {
				element.button.disable();
			}
		}
	}

	private normalizeAndTrimSep(value: string): string {
		let result = value.replace(/\\/g, '/');
		if (result.startsWith('/')) {
			result = result.slice(1);
		}
		if (result.endsWith('/')) {
			result = result.slice(0, result.length - 1);
		}
		return result;
	}

	private isExmlRootExist(_p): boolean {
		let isExit = false;
		this.cloneExmlRoots.forEach(v => {
			if (paths.isEqual(paths.normalize(path.join(this.projectModel.project.fsPath, v.fsPath)), paths.normalize(_p))) {
				isExit = true;
			}
		});
		return isExit;
	}

	private getSkinItem(container: HTMLElement, item: URI, index: number): void {
		const skinAttItemContainer = new AttributeItemGroup(container);
		skinAttItemContainer.additionalVisible = true;
		skinAttItemContainer.style.marginTop = '5px';
		skinAttItemContainer.label = '';
		const skinInput = new TextInput(skinAttItemContainer.getElement());
		skinInput.prompt = localize('wingPropertyPanel.render.selectSkinRoot', 'Select Add skins root path');
		skinInput.readonly = true;
		const skinBtn = new IconButton(skinAttItemContainer.getAdditionalElement());
		skinBtn.iconClass = 'wingPropertyPanel deleteIcon';
		skinInput.text = this.normalizeAndTrimSep(item.fsPath);
		const cp = path.join(this.projectModel.project.fsPath, item.fsPath);
		this.addGroupDomItem(this.skinDomItems, skinAttItemContainer, skinBtn);

		const exist = fs.existsSync(cp);
		if (!exist) {
			addClass(skinInput.getElement(), 'error');
		}

		skinBtn.onClick((e) => {
			this.cloneExmlRoots.forEach((element, index) => {
				if (isEqual(element, item)) {
					this.cloneExmlRoots.splice(index, 1);
					this.freshError();
				}
			});

			skinAttItemContainer.dispose();
			this.removeGroupDomItem(this.skinDomItems, skinAttItemContainer);
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
export function validateProperty(property: any, exmlRoot: URI[], rootPath: string): { isResExist: boolean, isThemeExist: boolean, isExmlRootExist: boolean, prompts: Array<string> } {
	let isThemeExist = false;
	let resourceLen = 0;
	let exmlRootLen = 0;

	// 表示是否存在正确的配置 如果有可以通过
	let isResExist = true;
	let isExmlRootExist = true;

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
				const fullPath = path.join(rootPath, url);
				if (!fs.existsSync(fullPath)) {
					noExistResourceArr.push(fullPath);
					isResExist = false;
				}
			}
		} else {
			isResExist = false;
		}
	} else {
		isResExist = false;
	}

	const noExistExmlRootArr = [];
	if (exmlRoot.length > 0) {
		for (let i = 0; i < exmlRoot.length; i++) {
			const url: string = exmlRoot[i].fsPath;
			if (!url) {
				continue;
			}
			exmlRootLen++;
			const fullPath = path.join(rootPath, url);
			if (!fs.existsSync(fullPath)) {
				noExistExmlRootArr.push(fullPath);
				isExmlRootExist = false;
			}
		}
	} else {
		isExmlRootExist = false;
	}

	const themePath = property['theme'];
	if (themePath) {
		const themeFullPath = path.join(rootPath, themePath);
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
	if (exmlRootLen === 0) {
		prompts.push(localize('wingPropertyPanel.validateProperty.skinRootNotExist', 'Need to set the skins root path'));
	} else if (noExistExmlRootArr.length > 0) {
		prompts = prompts.concat(noExistResourceArr.map(v => { return localize('wingPropertyPanel.validateProperty.notExistFolder', 'Unable to find folder {0}', v); }));
	}
	return { isThemeExist, isResExist, isExmlRootExist, prompts };
}