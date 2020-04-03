import { AttributeItemGroup } from 'egret/base/browser/ui/containers';
import { localize } from 'egret/base/localization/nls';
import { TextInput } from 'egret/base/browser/ui/inputs';
import { SystemButton } from 'egret/base/browser/ui/buttons';


export class GroupPanel {
	constructor(
		confirmCallback: Function,
		cancelCallback: Function) {

		this.textValue = '';

		this.okCallback = confirmCallback;
		this.cancelCallback = cancelCallback;

		this.textValueChanged = this.textValueChanged.bind(this);
		this.okHandler = this.okHandler.bind(this);
		this.cancelHandler = this.cancelHandler.bind(this);
	}

	private okCallback: Function;
	private cancelCallback: Function;


	private textValue: string;

	private textValueChanged(v: string) {
		this.textValue = v;
	}

	private okHandler() {
		this.okCallback(this.textValue);
	}

	private cancelHandler() {
		this.cancelCallback();
	}

	render(container: HTMLElement) {
		const root = document.createElement('div');
		root.style.display = 'flex';
		root.style.flexDirection = 'column';
		root.style.width = '310px';
		root.style.height = '160px';

		const attribute = new AttributeItemGroup(root);
		attribute.style.alignSelf = 'center';
		attribute.style.marginTop = '24px';
		attribute.label = localize('res.editor.newGroupPanel.addGroup', 'Group Name');
		attribute.labelWidth = 60;
		const input = new TextInput(attribute);
		input.style.position = 'flex';
		input.style.height = '26px';
		input.style.width = '120px';
		input.onValueChanged(this.textValueChanged);

		const buttonContainer = document.createElement('div');
		buttonContainer.style.display = 'flex';
		buttonContainer.style.position = 'relative';
		buttonContainer.style.justifyContent = 'center';
		buttonContainer.style.marginTop = '48px';
		root.appendChild(buttonContainer);

		const cancelButton = new SystemButton(buttonContainer);
		cancelButton.style.width = '50px';
		cancelButton.label = localize('alert.button.cancel', 'Cancle');
		const okButton = new SystemButton(buttonContainer);
		okButton.style.width = '50px';
		okButton.style.marginLeft = '24px';
		okButton.isDefault = true;
		okButton.label = localize('alert.button.confirm', 'Confirm');
		okButton.onClick(this.okHandler);
		cancelButton.onClick(this.cancelHandler);

		container.appendChild(root);
	}
}


