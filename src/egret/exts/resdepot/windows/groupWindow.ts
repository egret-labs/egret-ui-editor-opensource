import { InnerWindow } from 'egret/platform/innerwindow/browser/innerWindow';
import { localize } from 'egret/base/localization/nls';
import { IInnerWindow } from 'egret/platform/innerwindow/common/innerWindows';
import { GroupPanel } from './GroupPanel';

export class GroupWindow extends InnerWindow {
	constructor(
		private confirmCallback: Function) {
		super();
		this.title = localize('res.editor.NewResourceGroup', 'New Resource Group');
	}
	
	private groupPanel: GroupPanel;
	/**
	 * 重载父类方法，对窗体进行渲染
	 */
	public render(contentGroup: HTMLElement): void {
		super.render(contentGroup);
		this.initialize(contentGroup);
	}

	private initialize(parent: HTMLElement): void {	
		this.groupPanel = new GroupPanel(this.okHandler, this.cancelHandler);
		this.groupPanel.render(parent);
	}

	private okHandler = (value: string): void => {
		if(this.confirmCallback){
			this.confirmCallback(value);
		}
		this.close();
	}

	private cancelHandler = (): void => {
		this.close();
	}

	/**
	 * 打开
	 */
	public open(ownerWindow?: IInnerWindow | 'root', modal?: boolean) {
		super.open(ownerWindow, modal);
	}
}