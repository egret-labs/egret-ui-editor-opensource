import { InnerBtnWindow } from 'egret/platform/innerwindow/browser/innerWindow';
import { localize } from 'egret/base/localization/nls';
import { TextInput } from 'egret/base/browser/ui/inputs';
import { AttributeItemGroup } from 'egret/base/browser/ui/containers';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { InnerButtonType } from 'egret/platform/innerwindow/common/innerWindows';


export class NewAttributePanel extends InnerBtnWindow {

	private disposables: IDisposable[] = [];
	/**
	 *
	 */
	constructor(private callback?: (name: string) => void) {
		super();
		this.title = localize('DataProviderPanel.newAttribute.title', 'Add Attribute');

		// 设置窗体按钮
		this.initButtons(
			{ label: localize('alert.button.confirm', 'Confirm'), closeWindow: false },
			{ label: localize('alert.button.cancel', 'Cancel') }
		);

		this.registerListeners();
	}

	/**
	 * 注册监听事件
	 */
	private registerListeners(): void {
		// 监听按钮点击事件
		this.disposables.push(this.onButtonClick(e => this.handleBtnClick(e)));
	}

	/**
	 * 按钮点击绑定事件
	 */
	private handleBtnClick(button: InnerButtonType): void {
		switch (button) {
			// 应用到当前文件
			case InnerButtonType.FIRST_BUTTON:
				this.save();
				break;
			// 左上角关闭按钮
			case InnerButtonType.CLOSE_BUTTON:
				break;
		}
	}

	private attInput: TextInput;
	/**
	 * 重载父类方法，对窗体进行渲染
	 */
	public render(contentGroup: HTMLElement): void {
		super.render(contentGroup);
		contentGroup.style.width = '370px';
		contentGroup.style.height = '80px';
		contentGroup.style.padding = '12px';
		contentGroup.style.display = 'flex';

		const attItemContainer = new AttributeItemGroup(contentGroup);
		attItemContainer.style.width = '100%';
		attItemContainer.label = localize('DataProviderPanel.newAttribute.name', 'Attribute Name:');
		this.attInput = new TextInput(attItemContainer.getElement(), {
			validation: (value: string) => {
				if(value.match(/^\d/)){
					return { content: localize('DataProviderPanel.validation.attributeNotValid', 'Attribute name cannot start with a number') };
				}
				return null;
			}
		});
	}

	private save() {
		if(!this.attInput.isInputValid()){
			return;
		}
		this.close();
		if(this.callback){
			this.callback(this.attInput.text);
		}
	}

	/**
	 * 清理
	 */
	public dispose() {
		super.dispose();
		dispose(this.disposables);
	}
}