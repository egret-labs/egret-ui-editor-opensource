import { InnerBtnWindow } from 'egret/platform/innerwindow/browser/innerWindow';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { InnerButtonType, IInnerWindow } from 'egret/platform/innerwindow/common/innerWindows';
import { IFileService } from '../../../platform/files/common/files';
import { IWorkbenchEditorService } from 'egret/workbench/services/editor/common/ediors';
import { Label } from '../../../base/browser/ui/labels';
import { NumberInput, TextInput } from 'egret/base/browser/ui/inputs';
import 'egret/base/browser/ui/media/labelContainer.css';
import { remote } from 'electron';
import * as path from 'path';
import { ExmlComponentPanel } from './ExmlComponentPanel';
import TemplateTool from './TemplateTool';
import URI from 'egret/base/common/uri';
import { ExmlStat } from './ExmlComponentViewer';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { IExplorerService } from 'egret/workbench/parts/files/common/explorer';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation';
import { localize } from '../../../base/localization/nls';
import { INotificationService } from 'egret/platform/notification/common/notifications';
import { trim } from 'egret/base/common/strings';
import { SystemButton } from 'egret/base/browser/ui/buttons';
import { AttributeItemGroup } from 'egret/base/browser/ui/containers';
import { addClass, removeClass } from 'egret/base/common/dom';
import { isEqualOrParent, normalize } from 'egret/base/common/paths';

//TODO 这个文件不应该放在这里，  应该放到Exml相关的文件夹里，和对应的命令放到一起
/**
 * 新建Exml
 */
export class NewExmlPanel extends InnerBtnWindow {
	// 确认按钮事件
	public confirm: Function;
	// 取消按钮事件
	public cancel: Function;

	private defaultPath: string;

	// 路径
	private pathInput: TextInput;
	private pathBtn: SystemButton;

	// 名字
	private nameInput: TextInput;

	// 主机组件
	private comInput: TextInput;
	private comBtn: SystemButton;

	// 宽度
	private widthTextInput: NumberInput;

	// 高度
	private heightTextInput: NumberInput;
	private promptLabel: Label;
	private pathIsValid: boolean = true;

	// 主机组件
	private stat: ExmlStat;


	private disposables: IDisposable[] = [];


	constructor(
		_euiHost: any,
		@IFileService private fileService: IFileService,
		@IExplorerService private explorerService: IExplorerService,
		@IEgretProjectService private projectService: IEgretProjectService,
		@IWorkbenchEditorService private editorService: IWorkbenchEditorService,
		@INotificationService private notificationService: INotificationService,
		@IWorkspaceService private workspaceService: IWorkspaceService,
		@IInstantiationService private instantiationService: IInstantiationService
	) {
		super();
		// 设置窗体标题
		this.title = localize('newExmlPanel.constructor.title', 'Create EXML Skin');

		// 初始化默认数据
		this.initDefaultData();


		this.euiHost = _euiHost;

		// 设置窗体按钮
		this.initButtons(
			{ label: localize('alert.button.confirm', 'Confirm'), closeWindow: false },
			{ label: localize('alert.button.cancel', 'Cancel') },
		);

		// 注册监听事件
		this.registerListeners();
	}


	private initDefaultData(): void {
		this.projectPath = '';
		if (this.projectService.projectModel && this.projectService.projectModel.project) {
			this.projectPath = this.projectService.projectModel.project.fsPath;
		}

		let defaultFolder = this.explorerService ? this.explorerService.getFirstSelectedFolder() : null;
		if (!defaultFolder) {
			// 为指定文件夹，使用第一个exmlRoot
			const exmlRoots = this.projectService.projectModel.exmlRoot;
			if(exmlRoots && exmlRoots.length > 0) {
				defaultFolder = exmlRoots[0];
			}
		}

		this.defaultPath = '';
		if (defaultFolder) {
			this.defaultPath = defaultFolder.fsPath;
			const workspacePath: string = this.workspaceService.getWorkspace().uri.fsPath;
			if (this.defaultPath.indexOf(workspacePath) == 0) {
				this.defaultPath = this.defaultPath.slice(workspacePath.length);
			}
		}
	}



	/**
	 * 注册监听事件
	 */
	private registerListeners(): void {
		// 监听按钮点击事件
		this.disposables.push(this.onButtonClick(e => this.handleBtnClick(e)));
		this.disposables.push(this.onActivated(e => this.handleActivated(e)));
	}

	private _euiHost: Array<any>;

	public set euiHost(_euiHost: Array<any>) {
		this._euiHost = _euiHost;
	}

	private _projectPath: string;
	public set projectPath(_projectPath: string) {
		this._projectPath = _projectPath;
	}

	public get projectPath(): string {
		return this._projectPath;
	}

	/**
	 * 主机组件
	 */
	public get euiHost(): Array<any> {
		return this._euiHost;
	}

	/**
	 * 打开
	 */
	public open(ownerWindow?: IInnerWindow | 'root', modal?: boolean) {
		super.open(ownerWindow, modal);
		setTimeout(() => {
			this.nameInput.focus();
		}, 40);
	}

	private handleActivated(e: any): void {
		this.pathValidation();
	}

	/**
	 * 按钮点击绑定事件
	 */
	private handleBtnClick(button: InnerButtonType): void {
		switch (button) {
			// 确定按钮
			case InnerButtonType.FIRST_BUTTON:
				this.createExml();
				break;
			// 取消按钮
			case InnerButtonType.SECOND_BUTTON:
				break;
			// 左上角关闭按钮
			case InnerButtonType.CLOSE_BUTTON:
				break;
		}
	}

	private createExml(): void {
		if (this.validate()) {
			this.doCreateExml(this.fileService, this.editorService);
		}
	}


	private container: HTMLElement;
	/**
	 * 重载父类方法，对窗体进行渲染
	 */
	public render(contentGroup: HTMLElement): void {
		super.render(contentGroup);
		this.container = contentGroup;

		contentGroup.style.display = 'flex';
		contentGroup.style.flexDirection = 'column';
		contentGroup.style.alignItems = 'stretch';
		contentGroup.style.position = 'relative';
		contentGroup.style.padding = '15px 15px 0 15px';
		contentGroup.style.width = '480px';

		const pathAttItemContainer = new AttributeItemGroup(contentGroup);
		pathAttItemContainer.additionalVisible = true;
		pathAttItemContainer.label = localize('newExmlPanel.createExml.path', 'Path:');
		pathAttItemContainer.labelWidth = 70;
		this.pathInput = new TextInput(pathAttItemContainer.getElement());
		this.pathInput.readonly = true;
		this.pathInput.text = this.defaultPath || '';
		this.pathInput.prompt = localize('newExmlPanel.createExml.selectPath', 'Select Path');
		this.pathBtn = new SystemButton(pathAttItemContainer.getAdditionalElement());
		this.pathBtn.label = localize('newExmlPanel.createExml.browser', 'Browser');

		const nameAttItemContainer = new AttributeItemGroup(contentGroup);
		nameAttItemContainer.style.marginTop = '7px';
		nameAttItemContainer.style.marginRight = '90px';
		nameAttItemContainer.labelWidth = 70;
		nameAttItemContainer.label = localize('newExmlPanel.createExml.name', 'Name:');
		this.nameInput = new TextInput(nameAttItemContainer.getElement());
		this.nameInput.prompt = localize('newExmlPanel.createExml.skinName', 'Skin Name');
		this.nameInput.getElement().addEventListener('keydown', e => {
			if (e.keyCode == 13) {
				this.createExml();
			}
		});

		const comAttItemContainer = new AttributeItemGroup(contentGroup);
		comAttItemContainer.additionalVisible = true;
		comAttItemContainer.style.marginTop = '7px';
		comAttItemContainer.labelWidth = 70;
		comAttItemContainer.label = localize('newExmlPanel.createExml.host', 'Host Component:');
		this.comInput = new TextInput(comAttItemContainer.getElement());
		this.comInput.readonly = true;
		this.comInput.text = 'eui.Component';
		this.comInput.prompt = localize('newExmlPanel.createExml.comTitle', 'Select Host Component');
		this.comBtn = new SystemButton(comAttItemContainer.getAdditionalElement());
		this.comBtn.label = localize('newExmlPanel.createExml.browser', 'Browser');

		const sub = document.createElement('div');
		contentGroup.appendChild(sub);
		sub.className = 'labelContainer';
		sub.style.display = 'flex';
		sub.style.flexDirection = 'row';
		sub.style.marginLeft = '0px';
		sub.style.marginRight = '0px';

		let widthLabel = new Label(sub);
		let el = widthLabel.getElement();
		el.style.display = 'inline-block';
		el.style.minWidth = '70px';
		el.style.textAlign = 'right';
		el.style.wordBreak = 'break-all';
		el.style.whiteSpace = 'nowrap';
		el.style.cursor = 'default';
		el.style.flexShrink = '0';
		el.style.fontSize = '13px';
		el.style.marginRight = '10px';
		widthLabel.text = localize('newExmlPanel.createExml.width', 'Width:');

		const defaultSize = this.getDefaultSize();
		this.widthTextInput = new NumberInput(sub);
		let inel = this.widthTextInput.getElement();
		inel.style.flexGrow = '1';
		inel.style.display = 'flex';
		inel.style.alignItems = 'center';
		this.widthTextInput.text = defaultSize.width + '';
		this.widthTextInput.minValue = 0;
		this.widthTextInput.regulateStep = 1;

		widthLabel = new Label(sub);
		el = widthLabel.getElement();
		el.style.display = 'inline-block';
		el.style.minWidth = '50px';
		el.style.textAlign = 'right';
		el.style.wordBreak = 'break-all';
		el.style.whiteSpace = 'nowrap';
		el.style.cursor = 'default';
		el.style.flexShrink = '0';
		el.style.fontSize = '13px';
		el.style.marginRight = '10px';
		widthLabel.text = localize('newExmlPanel.createExml.height', 'Height:');

		this.heightTextInput = new NumberInput(sub);
		this.heightTextInput.minValue = 0;
		this.heightTextInput.regulateStep = 1;
		inel = this.heightTextInput.getElement();
		inel.style.flexGrow = '1';
		inel.style.display = 'flex';
		inel.style.alignItems = 'center';
		this.heightTextInput.text = defaultSize.height + '';

		this.initComponentEvent();
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

	private freshError(): void {
		this.promptLabel && this.promptLabel.dispose();
		if (!this.pathIsValid) {
			this.addErrorLabel();
			const selectPath = path.join(this.projectPath, this.pathInput.text);
			this.promptLabel.text = localize('newExmlPanel.validate.pathInvalid', 'Please add this folder ({0}) as the root directory of the skin files in the EUI project settings.', selectPath);
			addClass(this.pathInput.getElement(), 'error');
		} else {
			removeClass(this.pathInput.getElement(), 'error');
		}
	}

	private getDefaultSize(): { height: number; width: number } {
		let height: number = 300;
		let width: number = 400;
		const design = this.projectService.projectModel.getExmlConfig('design');
		if (design) {
			if (typeof design.height !== 'undefined') {
				height = design.height;
			}
			if (typeof design.width !== 'undefined') {
				width = design.width;
			}
		}
		return {
			height: height,
			width: width
		};
	}

	private saveDefaultSize(height: number | string, width: number | string) {
		const design = this.projectService.projectModel.getExmlConfig('design');
		if (design.height !== height ||
			design.width !== width) {
			design.height = height;
			design.width = width;
			this.projectService.projectModel.setExmlConfig('design', design);
		}
	}

	/**
	 * 初始化按钮事件
	 */
	private initComponentEvent(): void {
		this.disposables.push(this.pathBtn.onClick(this.pathBrowser));
		this.disposables.push(this.comBtn.onClick(this.comHandle));
	}

	private pathBrowser = () => {
		remote.dialog.showOpenDialog(remote.getCurrentWindow(), { defaultPath: this.projectPath, properties: ['openDirectory'] }).then((value)=> {
			this.pathHandle(value.filePaths);
		});
	}

	/**
	 * 弹出主机组件选择框
	 */
	private comHandle = () => {
		const defaultHostName = this.comInput.text;
		const exmlComponentPanel = this.instantiationService.createInstance(ExmlComponentPanel, this.euiHost, defaultHostName);
		exmlComponentPanel.confirm = (v) => {
			this.stat = v;
			this.comInput.text = v.data.className || '';
		};
		exmlComponentPanel.open(null, true);
	}

	private pathValidation(): void {
		this.pathIsValid = false;
		const exmlRoots = this.projectService.projectModel.exmlRoot;
		for (let i = 0; i < exmlRoots.length; i++) {
			const element = exmlRoots[i];
			if (isEqualOrParent(normalize(path.join(this.projectPath, this.pathInput.text)), normalize(path.join(this.projectPath, element.fsPath)))) {
				this.pathIsValid = true;
				break;
			}
		}
		this.freshError();
	}

	/**
	 * 路径选择
	 */
	private pathHandle = (filePaths: any) => {
		let temp: string;
		if (filePaths && filePaths.length === 1) {
			temp = filePaths[0];
			let relativerPath = path.relative(this.projectPath, temp);
			if (relativerPath === '') {
				relativerPath = '.';
			}
			if (relativerPath.indexOf('..') === -1  &&
				isEqualOrParent(normalize(temp), normalize(this.projectService.projectModel.project.fsPath))) {
				this.pathInput.text = relativerPath;
				this.pathValidation();
			}
			else {
				this.notificationService && this.notificationService.error({ content: localize('newExmlPanel.pathHandle.notExistCurrentProject', 'The selection path is not in the current project, please re-select.') });
			}
		} else {
			if (this.defaultPath === '') {
				this.notificationService && this.notificationService.warn({ content: localize('newExmlPanel.pathHandle.path', 'Please select the path.') });
			}
		}
	}

	/**
	 * 生成Exml
	 *
	 * @memberof NewExml
	 */
	public async doCreateExml(fileService: IFileService, editorService: IWorkbenchEditorService) {
		const host: ExmlStat = this.stat ? this.stat : null;
		const state = host ? host.data.state : '';
		const width = trim(this.widthTextInput.text);
		const height = trim(this.heightTextInput.text);
		const templateStr = TemplateTool.createEUIExmlSkin(state, width, height, trim(this.nameInput.text));
		const templateURI = URI.file(path.join(this.projectPath, trim(this.pathInput.text), trim(this.nameInput.text) + 'Skin.exml'));
		const isExist = await fileService.existsFile(templateURI);
		if (!isExist) {
			const stat = await fileService.createFile(templateURI, templateStr, true);
			if (stat) {
				editorService.openEditor({ resource: stat.resource });
				this.notificationService && this.notificationService.info({ content: localize('newExmlPanel.createExml.fileCreateSuccess', 'The file was created successfully: {0}', stat.resource.fsPath) });
				this.saveDefaultSize(height, width);
				this.close();
			}
		} else {
			this.notificationService && this.notificationService.error({ content: localize('newExmlPanel.createExml.fileIsExist', 'The file already exists, please change the name.') });
		}
	}

	/**
 	 * 验证输入有效性
 	 */
	public validate(): boolean {
		if (!this.pathIsValid) {
			return false;
		}
		if (this.pathInput.text === '') {
			this.notificationService && this.notificationService.warn({ content: localize('newExmlPanel.validate.path', 'Please select the path.') });
			return false;
		} else if (trim(this.nameInput.text) === '') {
			this.notificationService && this.notificationService.warn({ content: localize('newExmlPanel.validate.skinName', 'The skin name cannot be empty, please fill in the name.') });
			return false;
		} else if (this.comInput.text === '') {
			this.notificationService && this.notificationService.warn({ content: localize('newExmlPanel.validate.comblank', 'Please select the host component.') });
			return false;
		} else if (trim(this.widthTextInput.text) === '') {
			this.notificationService && this.notificationService.warn({ content: localize('newExmlPanel.validate.widthblank', 'The width cannot be empty.') });
			return false;
		} else if (trim(this.heightTextInput.text) === '') {
			this.notificationService && this.notificationService.warn({ content: localize('newExmlPanel.validate.heightblank', 'The height cannot be empty.') });
			return false;
		} else {
			return true;
		}
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