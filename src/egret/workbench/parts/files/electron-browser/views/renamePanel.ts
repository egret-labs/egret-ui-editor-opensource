import { InnerBtnWindow } from 'egret/platform/innerwindow/browser/innerWindow';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { InnerButtonType, IInnerWindow } from 'egret/platform/innerwindow/common/innerWindows';
import { FileStat } from 'egret/workbench/parts/files/common/explorerModel';
import { Label } from 'egret/base/browser/ui/labels';
import { TextInput } from 'egret/base/browser/ui/inputs';
import { IFileService } from 'egret/platform/files/common/files';
import * as path from 'path';
import { IWorkbenchEditorService } from 'egret/workbench/services/editor/common/ediors';
import { INotificationService } from 'egret/platform/notification/common/notifications';
import { localize } from 'egret/base/localization/nls';
import { trim } from 'egret/base/common/strings';

//TODO 判断脏
/**
 * 重命名
 */
export class RenamePanel extends InnerBtnWindow {
	// 确认按钮事件
	public confirm: Function;

	// 取消按钮事件
	public cancel: Function;

	// 文件扩展名 
	private extName: string;

	// 文件名
	private fileName: string;

	// 命名输入框
	private renameInput: TextInput;


	// 需要清理数据的集合
	private disposables: IDisposable[] = [];

	constructor(
		private fileStat: FileStat,
		@IFileService private fileService: IFileService,
		@INotificationService private notificationService: INotificationService,
		@IWorkbenchEditorService private workbenchEditorService: IWorkbenchEditorService
	) {
		super();
		// 设置窗体标题
		this.title = localize('renamePanel.constructor.title', 'Rename');

		// 初始化默认数据
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
	 * 处理默认数据
	 */
	private initDefaultData(): void {
		if (!this.fileStat) {
			throw new Error(localize('renamePanel.initDefaultData.error', 'The file that needs to rename does not exist!'));
		}

		if (!this.fileStat.isDirectory) {
			this.extName = path.extname(this.fileStat.resource.fsPath);
			this.fileName = this.fileStat.name.substr(0, this.fileStat.name.lastIndexOf('.exml'));
		} else {
			this.fileName = this.fileStat.name;
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
		}, 10);
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
	private firstBtnHandle(): void {
		let fname = trim(this.renameInput.text);
		if (!this.fileStat.isDirectory) {
			fname += this.extName;
		}
		if (fname !== '') {
			let reOpen: boolean = false;
			const activeInput = this.workbenchEditorService.getActiveEditorInput();
			if (activeInput && activeInput.getResource().fsPath == this.fileStat.resource.fsPath) {
				reOpen = true;
			}
			this.fileService.rename(this.fileStat.resource, fname).then(fst => {
				this.fileStat.rename(fst);
				this.notificationService.info({ content: localize('renamePanel.handleBtnClick.success', 'Rename success:{0}', this.fileStat.resource.fsPath) });
				if (reOpen) {
					this.workbenchEditorService.openEditor({ resource: this.fileStat.resource });
				}
			}).catch(reason => {
				this.notificationService.error({ content: reason });
			});
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
		label.text = localize('renamePanel.render.newName', 'New name:');
		label.paddingHorizontal = 6;
		this.renameInput = new TextInput(attContainer);
		this.renameInput.text = this.fileName || '';
		this.disposables.push(this.renameInput.onValueChanging(this.reanmeChanging));
		contentGroup.appendChild(attContainer);
		this.renameInput.getElement().addEventListener('keydown', e => {
			if (e.keyCode == 13) {
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