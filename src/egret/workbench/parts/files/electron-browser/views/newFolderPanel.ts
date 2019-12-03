import { InnerBtnWindow } from 'egret/platform/innerwindow/browser/innerWindow';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { InnerButtonType, IInnerWindow } from 'egret/platform/innerwindow/common/innerWindows';
import { Label } from 'egret/base/browser/ui/labels';
import { TextInput } from 'egret/base/browser/ui/inputs';
import { IFileService } from 'egret/platform/files/common/files';
import * as path from 'path';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import { IExplorerService } from 'egret/workbench/parts/files/common/explorer';
import { INotificationService } from 'egret/platform/notification/common/notifications';
import URI from 'egret/base/common/uri';
import { localize } from 'egret/base/localization/nls';
import { trim } from 'egret/base/common/strings';

//TODO 这个文件不应该放在这里，和对应的命令放到一起
/**
 * 新建文件夹
 */
export class NewFolderPanel extends InnerBtnWindow {
	// 确认按钮事件
	public confirm: Function;

	// 取消按钮事件
	public cancel: Function;

	// 文件名
	private fileName: string;

	// 命名输入框
	private renameInput: TextInput;

	// 文件路径
	private filePath: string;

	// 要清空数据的集合
	private disposables: IDisposable[] = [];

	constructor(
		@IFileService private fileService: IFileService,
		@IExplorerService private explorerService: IExplorerService,
		@IWorkspaceService private workspaceService: IWorkspaceService,
		@IEgretProjectService private projectService: IEgretProjectService,
		@INotificationService private notificationService: INotificationService
	) {
		super();
		// 设置窗体标题
		this.title = localize('newwFolderPanel.constructor.title', 'New Folder');

		// 初始化数据
		this.initDefaultData();

		// 设置窗体按钮
		this.initButtons(
			{ label: localize('alert.button.confirm', 'Confirm'), closeWindow: false },
			{ label: localize('alert.button.cancel', 'Cancel') },
		);
		// 注册监听事件
		this.registerListeners();
	}

	/**
	 * 初始化默认数据
	 */
	private initDefaultData(): void {
		const defaultFolder = this.explorerService ? this.explorerService.getFirstSelectedFolder() : null;
		this.filePath = '';
		if (defaultFolder) {
			this.filePath = defaultFolder.fsPath;
			const workspacePath: string = this.workspaceService.getWorkspace().uri.fsPath;
			if (this.filePath.indexOf(workspacePath) === 0) {
				this.filePath = this.filePath.slice(workspacePath.length);
			}
		}
	}


	/**
	 * 注册监听事件
	 */
	private registerListeners(): void {
		// 监听按钮点击事件
		const dispose = this.onButtonClick(e => this.handleBtnClick(e));
		this.disposables.push(dispose);
	}

	/**
	 * 打开
	 */
	public open(ownerWindow?: IInnerWindow | 'root', modal?: boolean) {
		super.open(ownerWindow, modal);
		setTimeout(() => {
			this.renameInput.getElement().focus();
		}, 40);
	}

	/**
	 * 按钮点击绑定事件
	 */
	private handleBtnClick(button: InnerButtonType): void {
		switch (button) {
			// 确定按钮
			case InnerButtonType.FIRST_BUTTON:
				this.firstBtnHandle();
				break;
			// 取消按钮
			case InnerButtonType.SECOND_BUTTON:
				break;
			// 左上角关闭按钮
			case InnerButtonType.CLOSE_BUTTON:
				break;
		}
	}

	/**
	 * 确定按钮处理
	 */
	private firstBtnHandle(): void {
		const folderName = trim(this.renameInput.text);
		if (folderName !== '') {
			if (this.projectService.projectModel && this.projectService.projectModel.project && this.projectService.projectModel.project.fsPath) {
				const uri = URI.file(path.join(this.projectService.projectModel.project.fsPath, path.sep, this.filePath, path.sep, folderName));
				this.fileService.createFolder(uri).then(fst => {
					this.notificationService && this.notificationService.info({ content: localize('newFolderPanel.firstBtnHandle.success', 'Successfully created new folder: {0}', fst.resource.fsPath) });
				}).catch(reason => {
					this.notificationService && this.notificationService.info({ content: reason });
				});
			}
		} else {
			this.notificationService && this.notificationService.error({ content: localize('newFolderPanel.firstBtnHandle.folderNotBlank', 'The folder name cannot be empty!') });
		}
		this.close();
	}

	/**
	 * 重载父类方法，对窗体进行渲染
	 */
	public render(contentGroup: HTMLElement): void {
		super.render(contentGroup);
		const attContainer = document.createElement('div');
		attContainer.style.height = '30px';
		attContainer.style.display = 'flex';
		attContainer.style.marginLeft = '10px';
		attContainer.style.marginRight = '10px';
		attContainer.style.marginTop = '10px';
		attContainer.style.alignItems = 'center';
		attContainer.style.width = '400px';
		const label = new Label(attContainer);
		label.text = localize('newFolderPanel.render.folderName', 'Folder Name:');
		label.paddingHorizontal = 6;
		this.renameInput = new TextInput(attContainer);
		this.renameInput.prompt = this.fileName || '';
		this.disposables.push(this.renameInput.onValueChanging(this.reanmeChanging));
		contentGroup.appendChild(attContainer);
		this.renameInput.getElement().addEventListener('keydown',e=>{
			if(e.keyCode == 13){
				this.firstBtnHandle();
			}
		});
	}


	reanmeChanging = (v: string) => {
		// TODO 可以添加动态 路径检查
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