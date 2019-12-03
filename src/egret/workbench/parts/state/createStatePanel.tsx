import { InnerBtnWindow } from 'egret/platform/innerwindow/browser/innerWindow';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { InnerButtonType, IInnerWindow } from 'egret/platform/innerwindow/common/innerWindows';
import { localize } from '../../../base/localization/nls';
import { INotificationService } from 'egret/platform/notification/common/notifications';

/**
 * 创建空白状态 或 复制已有状态
 */
enum CreateStateFrom {
	COPY = 'copy',
	EMPTY = 'empty'
}


/**
 * 创建状态窗体
 */
export class CreateStatePanel extends InnerBtnWindow {
	/**
	 * 确认回调
	 */
	public onConfirm: (name: string, copyFrom: string, setStart: boolean) => void;
	private existStates: { type: 'all' | 'normal', name: string }[];
	constructor(
		existStates: string[],
		@INotificationService private notificationService: INotificationService
	) {
		super();
		this.title = localize('createStatePanel.constructor.title','Create Status');
		// this.backgroundColor = '#232c33';
		this.initButtons(
			{ label: localize('alert.button.confirm', 'Confirm'), closeWindow: false },
			{ label: localize('alert.button.cancel', 'Cancel') }
		);
		this.existStates = [{
			type: 'all',
			name: localize('createStatePanel.constructor.allStatus','[ All Status ]')
		}];
		if (existStates) {
			existStates.forEach(name => {
				this.existStates.push({
					type: 'normal',
					name: name
				});
			});
		}
		this.registerListeners();
	}

	private disposables: IDisposable[] = [];
	private registerListeners(): void {
		this.disposables.push(this.onButtonClick(e => this.btnClick_handler(e)));
	}

	private btnClick_handler(btnType: InnerButtonType): void {
		if (btnType == InnerButtonType.FIRST_BUTTON) {
			var name: string = this.nameInput.value;
			var copyFrom: string = null;
			if (this.createStateFrom == CreateStateFrom.COPY) {
				if (this.selectedState.type != 'all') {
					copyFrom = this.selectedState.name;
				} else {
					copyFrom = '';
				}
			}
			var setStart = this.setStartCheckBox.checked;

			if (!name) {
				this.notificationService.error({
					content: localize('createStatePanel.btnClick_handler.statusNameCantNull','The status name must not be empty.'), duration: 3
				});
				this.nameInput.focus();
				return;
			}
			for (var i = 0; i < this.existStates.length; i++) {
				if (this.existStates[i].name == name) {
					this.notificationService.error({
						content: localize('createStatePanel.btnClick_handler.duplicateName','Duplicate status name "{0}"',name), duration: 3
					});
					this.nameInput.focus();
					return;
				}
			}
			if (this.onConfirm) {
				this.onConfirm(name, copyFrom, setStart);
			}
			this.close();
		}
	}

	private inlineStyle: any = {
		width: '100%',
		display: 'flex',
		flexDirection: 'row',
		alignItems: 'flex-start',
	};
	private labelStyle: any = {
		width: '80px',
		textAlign: 'right',
		paddingRight: '15px',
		flexShrink: 0,
		height: '23px',
		lineHeight: '23px'
	};

	private nameInput: HTMLInputElement;
	private selectInput: HTMLSelectElement;
	private createFromCopyRadio: HTMLInputElement;
	private createFromEmptyRadio: HTMLInputElement;
	private setStartCheckBox: HTMLInputElement;
	/**
	 * 重载父类的render方法，进行内容渲染
	 * @param contentGroup 
	 */
	public render(contentGroup: HTMLElement): void {
		super.render(contentGroup);
		contentGroup.style.padding = '15px';

		let div = document.createElement('div');
		div.className = 'create-state-content';
		div.style.width = '300px';

		let sub1 = document.createElement('div');
		var content = (
			<div className='create-state-content' style={{ width: '300px' }}>
				<div style={this.inlineStyle}>
					<div style={this.labelStyle} >{localize('createStatePanel.render.name','Name:')}</div>
					<input className='egret-text-input' type='text' style={{ width: '100%', height: '23px' }} ref={impl => this.nameInput = impl}></input>
				</div>
				<div style={Object.assign({}, this.inlineStyle, { marginTop: 8 })}>
					<div style={this.labelStyle} >{localize('createStatePanel.render.create','Create as:')}</div>
					<div style={{ width: '100%' }}>
						<div style={Object.assign({}, this.inlineStyle, { height: '23px', alignItems: 'center' })}>
							<input type='radio' name='createFrom' ref={impl => this.createFromCopyRadio = impl}
								onChange={e => this.createFromRadioChanged_handler(CreateStateFrom.COPY)}
							/>
							<div style={{ marginLeft: 5, height: '23px', lineHeight: '23px' }}>{localize('createStatePanel.render.copy','Copy of the following status')}</div>
						</div>
						<select className='select-input' style={{ marginTop: 8, width: '100%', height: '23px' }} ref={impl => this.selectInput = impl}>
							{this.existStates.map(state => <option key={state.name} value={state.name}>{state.name}</option>)};
						</select>
						<div style={Object.assign({}, this.inlineStyle, { marginTop: 8, height: '23px', alignItems: 'center' })}>
							<input type='radio' name='createFrom' ref={impl => this.createFromEmptyRadio = impl}
								onChange={e => this.createFromRadioChanged_handler(CreateStateFrom.EMPTY)}
							/>
							<div style={{ marginLeft: 5, height: '23px', lineHeight: '23px' }}>{localize('createStatePanel.render.blankStatus','Blank Status')}</div>
						</div>
					</div>
				</div>
				<div style={Object.assign({}, this.inlineStyle, { marginTop: 8 })}>
					<div style={this.labelStyle} >{localize('createStatePanel.render.startStatus','Start Status:')}</div>
					<div style={Object.assign({}, this.inlineStyle, { height: '23px', alignItems: 'center' })}>
						<input type='checkbox' ref={impl => this.setStartCheckBox = impl} />
						<div style={{ marginLeft: 5, height: '23px', lineHeight: '23px' }}>{localize('createStatePanel.render.setStartStatus','Set to start Status')}</div>
					</div>
				</div>
			</div >
		);
		ReactDOM.render(content, contentGroup);
		this.doUpdateRadioSelected(this.createStateFrom);
	}

	/**
	 * 打开窗体
	 * @param ownerWindow 父级窗体，如果设置null，则从当前激活的窗体上打开，如果设置为root则从根窗体打开
	 * @param modal 是否启用模态窗体
	 */
	public open(ownerWindow?: IInnerWindow | 'root', modal?: boolean) {
		super.open(ownerWindow, modal);
		setTimeout(() => {
			this.nameInput.focus();
		}, 1);
	}

	private createFromRadioChanged_handler(active: CreateStateFrom): void {
		this.doUpdateRadioSelected(active);
	}

	private createStateFrom: CreateStateFrom = CreateStateFrom.COPY;
	private doUpdateRadioSelected(active: CreateStateFrom): void {
		this.createStateFrom = active;
		this.createFromCopyRadio.checked = active == CreateStateFrom.COPY;
		this.createFromEmptyRadio.checked = active == CreateStateFrom.EMPTY;
	}

	private get selectedState(): { type: 'all' | 'normal', name: string } {
		return this.existStates[this.selectInput.selectedIndex];
	}
	/**
	 * 释放
	 */
	public dispose() {
		super.dispose();
		dispose(this.disposables);
		this.onConfirm = null;
		this.notificationService = null;
	}
}