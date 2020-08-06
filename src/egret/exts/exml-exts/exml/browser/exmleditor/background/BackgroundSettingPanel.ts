import { InnerBtnWindow } from 'egret/platform/innerwindow/browser/innerWindow';
import { localize } from 'egret/base/localization/nls';
import { IExmlModel } from '../../../common/exml/models';
import { IDesignConfig } from '../../../common/exml/designConfig';
import { BackgroundType } from '../../../common/exml/designConfigImpl';
import { remote } from 'electron';
import { isMacintosh } from 'egret/base/common/platform';
import { ColorPicker } from 'egret/base/browser/ui/colorPicker';
import { NumberInput } from 'egret/base/browser/ui/inputs';
import { AttributeItemGroup } from 'egret/base/browser/ui/containers';
import { SystemButton } from 'egret/base/browser/ui/buttons';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { InnerButtonType } from 'egret/platform/innerwindow/common/innerWindows';
import { HSVaColor } from 'egret/base/browser/ui/pickr/pickr';

export class BackgroundSettingPanel extends InnerBtnWindow {

	private disposables: IDisposable[] = [];
	private colorPicker = new ColorPicker();
	private defaultRadio: HTMLInputElement = null;
	private customRadio: HTMLInputElement = null;
	private backColorCheckbox: HTMLInputElement = null;
	private backImageCheckbox: HTMLInputElement = null;
	private imageBtn: SystemButton = null;
	private backImage: HTMLImageElement = null;
	private alphaInput: NumberInput = null;
	/**
	 *
	 */
	constructor(model: IExmlModel) {
		super();
		this.title = localize('BackgroundSettingPanel.title', 'Background Setting');
		this.model = model;

		this.backColorCheckHandler = this.backColorCheckHandler.bind(this);
		this.backImageCheckHandler = this.backImageCheckHandler.bind(this);
		this.pickColorChangedHandler = this.pickColorChangedHandler.bind(this);
		this.backImageBtnClick = this.backImageBtnClick.bind(this);
		this.alphaChangeHandler = this.alphaChangeHandler.bind(this);

		this.resetOldConfig = this.resetOldConfig.bind(this);
		this.applyToAllFiles = this.applyToAllFiles.bind(this);
		this.applyToCurrentFile = this.applyToCurrentFile.bind(this);

		this.radioChangehandler = this.radioChangehandler.bind(this);
		this.onLoadImageComplete = this.onLoadImageComplete.bind(this);

		if (this.model) {
			this.designConfig = this.model.getDesignConfig();
			this.designConfig.showTransformBg = true;
		}

		this.oldConfig = {};
		this.initOldData();

		this.initData();

		// 设置窗体按钮
		this.initButtons(
			{ label: localize('BackgroundSettingPanel.button.current', 'Apply to current'), closeWindow: false },
			{ label: localize('BackgroundSettingPanel.button.global', 'Apply to all'), closeWindow: false },
			{ label: localize('alert.button.cancel', 'Cancel') },
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
				this.applyToCurrentFile();
				break;
			// 应用到所有文件
			case InnerButtonType.SECOND_BUTTON:
				this.applyToAllFiles();
				break;
			// 取消
			case InnerButtonType.THIRD_BUTTON:
				this.resetOldConfig();
				break;
			// 左上角关闭按钮
			case InnerButtonType.CLOSE_BUTTON:
				this.resetOldConfig();
				break;
		}
	}

	/**
	 * 重载父类方法，对窗体进行渲染
	 */
	public render(contentGroup: HTMLElement): void {
		super.render(contentGroup);

		contentGroup.style.width = '460px';
		contentGroup.style.padding = '12px';
		contentGroup.style.paddingLeft = '24px';

		const defaultContainer = document.createElement('div');
		defaultContainer.style.display = 'flex';
		defaultContainer.style.alignItems = 'center';
		defaultContainer.style.marginBottom = '6px';
		this.defaultRadio = document.createElement('input');
		this.defaultRadio.style.cursor = 'pointer';
		this.defaultRadio.id = 'defaultDesignBackground'
		this.defaultRadio.type = 'radio';
		this.defaultRadio.name = 'backgroundType';
		this.defaultRadio.value = 'default';
		this.defaultRadio.checked = this.isDefaultSet();
		this.defaultRadio.onchange = this.radioChangehandler;
		defaultContainer.appendChild(this.defaultRadio);
		const defaultLabel = document.createElement('label');
		defaultLabel.style.cursor = 'pointer';
		defaultLabel.style.marginLeft = '3px';
		defaultLabel.htmlFor = 'defaultDesignBackground';
		defaultLabel.textContent = localize('BackgroundSettingPanel.defaultBackground', 'Default Background');
		defaultContainer.appendChild(defaultLabel);
		this.contentGroup.appendChild(defaultContainer);

		const customContainer = document.createElement('div');
		customContainer.style.display = 'flex';
		customContainer.style.alignItems = 'center';
		customContainer.style.marginBottom = '6px';
		this.customRadio = document.createElement('input');
		this.customRadio.style.cursor = 'pointer';
		this.customRadio.id = 'customDesignBackground'
		this.customRadio.type = 'radio';
		this.customRadio.name = 'backgroundType';
		this.customRadio.value = 'custom';
		this.customRadio.checked = !this.isDefaultSet();
		this.customRadio.onchange = this.radioChangehandler;
		customContainer.appendChild(this.customRadio);
		const customLabel = document.createElement('label');
		customLabel.style.cursor = 'pointer';
		customLabel.style.marginLeft = '3px';
		customLabel.htmlFor = 'customDesignBackground';
		customLabel.textContent = localize('BackgroundSettingPanel.customBackground', 'Custom Background');
		customContainer.appendChild(customLabel);
		this.contentGroup.appendChild(customContainer);

		const backColorContainer = document.createElement('div');
		backColorContainer.style.display = 'flex';
		backColorContainer.style.alignItems = 'center';
		backColorContainer.style.marginBottom = '6px';
		backColorContainer.style.marginLeft = '24px';
		this.backColorCheckbox = document.createElement('input');
		this.backColorCheckbox.style.cursor = 'pointer';
		this.backColorCheckbox.id = 'designBackgroundColor'
		this.backColorCheckbox.type = 'checkbox';
		this.backColorCheckbox.disabled = this.isDefaultSet();
		this.backColorCheckbox.checked = this.backColorChecked;
		this.backColorCheckbox.onchange = this.backColorCheckHandler;
		backColorContainer.appendChild(this.backColorCheckbox);
		const backColorLabel = document.createElement('label');
		backColorLabel.style.cursor = 'pointer';
		backColorLabel.style.marginLeft = '3px';
		backColorLabel.htmlFor = 'designBackgroundColor';
		backColorLabel.textContent = localize('BackgroundSettingPanel.backgroundColor', 'Background Color');
		backColorContainer.appendChild(backColorLabel);
		this.contentGroup.appendChild(backColorContainer);

		this.colorPicker.create(backColorContainer, !this.color ? null : this.color);
		this.colorPicker.style.marginLeft = '6px';
		this.colorPicker.onChanged(this.pickColorChangedHandler);
		this.colorPicker.onSaved(this.pickColorChangedHandler);

		const backImageContainer = document.createElement('div');
		backImageContainer.style.display = 'flex';
		backImageContainer.style.alignItems = 'center';
		backImageContainer.style.marginBottom = '6px';
		backImageContainer.style.marginLeft = '24px';
		this.backImageCheckbox = document.createElement('input');
		this.backImageCheckbox.style.cursor = 'pointer';
		this.backImageCheckbox.id = 'designBackgroundImage'
		this.backImageCheckbox.type = 'checkbox';
		this.backImageCheckbox.disabled = this.isDefaultSet();
		this.backImageCheckbox.checked = this.backImageChecked;
		this.backImageCheckbox.onchange = this.backImageCheckHandler;
		backImageContainer.appendChild(this.backImageCheckbox);
		const backImageLabel = document.createElement('label');
		backImageLabel.style.cursor = 'pointer';
		backImageLabel.style.marginLeft = '3px';
		backImageLabel.htmlFor = 'designBackgroundImage';
		backImageLabel.textContent = localize('BackgroundSettingPanel.backgroundImage', 'Background Image');
		backImageContainer.appendChild(backImageLabel);
		this.imageBtn = new SystemButton(backImageContainer);
		this.imageBtn.label = localize('BackgroundSettingPanel.button.addImage', 'Add');
		this.imageBtn.style.marginLeft = '6px';
		this.imageBtn.style.marginRight = '6px';
		this.imageBtn.onClick(this.backImageBtnClick);
		this.backImage = document.createElement('img');
		this.backImage.style.width = '20px';
		this.backImage.style.height = '20px';
		this.backImage.onload = this.onLoadImageComplete;
		this.backImage.src = this.imageUrl;
		this.backImage.style.visibility = (this.imageUrl) ? 'visible' : 'hidden';
		backImageContainer.appendChild(this.backImage);
		this.contentGroup.appendChild(backImageContainer);

		const alphaAttribute = new AttributeItemGroup(contentGroup);
		alphaAttribute.label = localize('BackgroundSettingPanel.backgroundAlpha', 'Alpha:');
		alphaAttribute.style.marginLeft = '24px';
		this.alphaInput = new NumberInput(alphaAttribute);
		this.alphaInput.width = 86;
		this.alphaInput.minValue = 0;
		this.alphaInput.maxValue = 100;
		this.alphaInput.regulateStep = 1;
		this.alphaInput.text = this.alpha.toString();
		this.alphaInput.onValueChanged(e => this.alphaChangeHandler(e));
		this.alphaInput.onValueChanging(e => this.alphaChangeHandler(e));

		this.refreshUI();
	}

	/**
	 * 打开时记录当前的配置，如果用户是点击关闭按钮关掉了此窗口，那么在打开期间的各项设置都将重置回原来的。
	 * 点击应用按钮的话会应用当前选择的设置并关掉窗口
	 */
	private initOldData() {
		if (this.model && this.designConfig) {
			this.oldConfig.backgroundType = this.designConfig.backgroundType;
			this.oldConfig.backgroundColor = this.designConfig.backgroundColor;
			this.oldConfig.backgroundImage = this.designConfig.backgroundImage;
			this.oldConfig.useBgColor = this.designConfig.useBgColor;
			this.oldConfig.useBgImage = this.designConfig.useBgImage;
			this.oldConfig.backgroundX = this.designConfig.backgroundX;
			this.oldConfig.backgroundY = this.designConfig.backgroundY;
			this.oldConfig.backgroundWidth = this.designConfig.backgroundWidth;
			this.oldConfig.backgroundHeight = this.designConfig.backgroundHeight;
			this.oldConfig.backgroundAlpha = this.designConfig.backgroundAlpha;
		}
	}

	private initData() {
		if (this.model && this.designConfig) {
			this.color = this.designConfig.backgroundColor;
			this.alpha = this.designConfig.backgroundAlpha;
			this.imageUrl = this.designConfig.backgroundImage;
			this.backgroundType = this.designConfig.backgroundType;
			this.backColorChecked = this.designConfig.useBgColor;
			this.backImageChecked = this.designConfig.useBgImage;
		}
	}

	private oldConfig: any;

	private model: IExmlModel;
	private designConfig: IDesignConfig;

	private backColorChecked: boolean;
	private backImageChecked: boolean;
	private color: string;
	private alpha: number;
	private imageUrl: string = '';
	private backgroundType: string;

	private refreshUI(): void {
		const isDefualt = this.isDefaultSet();
		this.backColorCheckbox.disabled = isDefualt;
		this.backImageCheckbox.disabled = isDefualt;
		if (isDefualt) {
			this.imageBtn.disable();
			this.colorPicker.style.pointerEvents = 'none';
			this.colorPicker.style.opacity = '0.5';
			this.backImage.style.opacity = '0.5';
			this.alphaInput.readonly = true;
		} else {
			this.imageBtn.enable();
			this.colorPicker.style.pointerEvents = 'auto';
			this.colorPicker.style.opacity = '1';
			this.backImage.style.opacity = '1';
			this.alphaInput.readonly = false;
		}
		this.backImage.style.visibility = (this.imageUrl) ? 'visible' : 'hidden';
	}

	//不同的radio button将触发
	private radioChangehandler(v?: any) {
		if (this.defaultRadio.checked) {
			this.backgroundType = BackgroundType.Null;
			this.model.getDesignConfig().backgroundType = (BackgroundType.Null);
		} else if (this.customRadio.checked) {
			this.backgroundType = BackgroundType.User;
			this.model.getDesignConfig().backgroundType = (BackgroundType.User);
		}
		this.refreshUI();
	}

	//背景颜色的checkbox发生变化时
	private backColorCheckHandler(e: Event) {
		const v = (event.target as HTMLInputElement).checked;
		if (this.backColorChecked !== v) {
			this.backColorChecked = v;
			this.checkboxCheckHandler();
		}
	}
	//背景图片的checkbox发生变化时
	private backImageCheckHandler(e: Event) {
		const v = (event.target as HTMLInputElement).checked;
		if (this.backImageChecked !== v) {
			this.backImageChecked = v;
			this.checkboxCheckHandler();
		}

	}

	private checkboxCheckHandler() {
		this.model.getDesignConfig().setBackgroundOther(this.backColorChecked, this.backImageChecked);
	}

	//背景色 coloricker的回调方法
	private pickColorChangedHandler(value: HSVaColor) {
		let v: string = '';
		if (value) {
			v = value.toHEXA().toString();
		}
		this.model.getDesignConfig().backgroundColor = v;
		this.color = v;

		if (this.customRadio.checked) {
			this.backgroundType = BackgroundType.User;
			this.model.getDesignConfig().backgroundType = (BackgroundType.User);
		}


	}

	private backImageBtnClick() {
		this.getFileOrFolderPaths(paths => {
			if (paths && paths.length) {
				if (this.imageUrl !== paths[0]) {
					this.imageUrl = paths[0];
					this.model.getDesignConfig().backgroundImage = this.imageUrl;
					this.backImage.src = this.imageUrl;
					this.refreshUI();
				}
			}
		});
	}

	private onLoadImageComplete(e: Event) {
		let editmodel = this.model.getDesignConfig();
		editmodel.setBackgroundPosAndSize(editmodel.backgroundX, editmodel.backgroundY, this.backImage.naturalWidth, this.backImage.naturalHeight);
	}

	private getFileOrFolderPaths(clb: (paths: string[]) => void): void {

		let win = remote.BrowserWindow.getFocusedWindow();
		let pickerProperties: ('openFile' | 'openDirectory' | 'multiSelections' | 'createDirectory')[];
		if (isMacintosh) {
			pickerProperties = ['multiSelections', 'openDirectory', 'openFile', 'createDirectory'];
		} else {
			pickerProperties = ['multiSelections', 'openFile', 'createDirectory'];
		}
		
		remote.dialog.showOpenDialog(win, {
			properties: pickerProperties
		}).then((value)=> {
			clb(value.filePaths);
		});
	}

	private alphaChangeHandler(value: string) {
		const v = Number.parseFloat(value);
		if (this.alpha !== v) {
			this.alpha = v;
			this.model.getDesignConfig().backgroundAlpha = this.alpha;
		}
	}

	/**
	 * 选择的是否是默认背景设置
	 */
	private isDefaultSet(): boolean {
		return this.backgroundType === BackgroundType.Null;
	}

	private resetOldConfig() {
		var editModel: IDesignConfig = this.model.getDesignConfig();
		if (editModel) {
			editModel.backgroundType = (this.oldConfig.backgroundType);
			editModel.backgroundColor = (this.oldConfig.backgroundColor);
			editModel.backgroundImage = (this.oldConfig.backgroundImage);
			editModel.setBackgroundPosAndSize(this.oldConfig.backgroundX, this.oldConfig.backgroundY, this.oldConfig.backgroundWidth, this.oldConfig.backgroundHeight);
			editModel.setBackgroundOther(this.oldConfig.useBgColor, this.oldConfig.useBgImage);
			editModel.backgroundAlpha = this.oldConfig.backgroundAlpha;
		}
		this.close();
	}

	private applyToCurrentFile() {
		this.model.getDesignConfig().showTransformBg = false;
		this.close();
	}

	private applyToAllFiles() {
		let editmodel = this.model.getDesignConfig();
		if (this.defaultRadio.checked) {
			editmodel.setglobalBackground('', '');
			editmodel.globalBackgroundAlpha = 100;
			editmodel.setGlobalBackgroundPosAndSize(0, 0, -1, -1);
		} else {
			editmodel.backgroundAlpha = this.alpha;
			editmodel.globalBackgroundAlpha = this.alpha;

			editmodel.setGlobalBackgroundPosAndSize(editmodel.backgroundX, editmodel.backgroundY, editmodel.backgroundWidth, editmodel.backgroundHeight);
			editmodel.setglobalBackground(editmodel.useBgColor ? editmodel.backgroundColor : '', editmodel.useBgImage ? editmodel.backgroundImage : '');
		}
		editmodel.showTransformBg = false;

		this.close();
	}

	/**
	 * 清理
	 */
	public dispose() {
		super.dispose();
		dispose(this.disposables);
	}
}