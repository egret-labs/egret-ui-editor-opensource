import { IWingNodeModel, IDesignConfig, IGuideLineInfo } from './designConfig';
import { IExmlModel } from './models';
import * as sax from '../sax/sax';
import * as xmlStrUtil from '../sax/xml-strUtils';
import { W_EUI } from '../project/parsers/core/commons';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { EgretProjectModel } from '../project/egretProject';
import { Event, Emitter } from 'egret/base/common/event';
import { trim } from '../utils/strings';


export class WingNodeModel implements IWingNodeModel {

	private owner: IExmlModel;
	public init(owner: IExmlModel): void {
		this.owner = owner;
	}

	protected getOwner(): IExmlModel {
		return this.owner;
	}

	private getWingNode(nodeName: string): sax.Tag {
		var contentTag = this.getOwner().getContentTag();
		if (!contentTag) {
			return null;
		}
		for (var i = 0; i < contentTag.children.length; i++) {
			if (contentTag.children[i].localName === nodeName && contentTag.children[i].namespace === W_EUI.uri) {
				return contentTag.children[i];
			}
		}
		return null;
	}

	//todo 缓存机制 尝试改成不要急于文本的方式
	private setWingNode(nodeName: string, valueName: string, value: string): void {
		if (!value) {
			value = '';
		}
		var nss = xmlStrUtil.getNamespaces(this.getOwner().getText());
		var hasWingNs: boolean = false;
		var wingPrefix: string = '';
		for (var i = 0; i < nss.length; i++) {
			if (nss[i].uri === W_EUI.uri) {
				hasWingNs = true;
				wingPrefix = nss[i].prefix;
				break;
			}
		}
		if (!hasWingNs) {
			wingPrefix = W_EUI.prefix;
		}

		var index: number = this.getOwner().getText().indexOf('<' + wingPrefix + ':' + nodeName);
		var range: number[];
		if (index === -1) {
			range = xmlStrUtil.findRangeByPath(this.getOwner().getText(), [0], '', this.getOwner().getStates());
			if (range[2] === range[3]) {
				var subStr: string = this.getOwner().getText().substr(range[0] + 1);
				index = subStr.indexOf(' ');
				var prefiex: string = subStr.substring(0, index);
				this.getOwner().insertText('>\n</' + prefiex + '>', range[1] - 1, range[1] + 1);
				range[1]--;
			}
			else if (range[1] + 1 === range[2]) {
				this.getOwner().insertText('\n', range[1] + 1, range[2]);
			}
			if (!hasWingNs) {
				var key: string = 'xmlns:' + W_EUI.prefix + '=\"' + W_EUI.uri + '\"';
				this.getOwner().insertText(' ' + key, range[1], range[1]);
				range[1] += key.length + 1;
			}
			if (valueName) {
				this.getOwner().insertText('\n\t<' + wingPrefix + ':' + nodeName + ' ' + valueName + '=\"' + value + '\"/>', range[1] + 1, range[1] + 1);
			} else {
				this.getOwner().insertText('\n\t<' + wingPrefix + ':' + nodeName + '/>', range[1] + 1, range[1] + 1);
			}
		}
		else if (valueName) {
			var path: number[] = xmlStrUtil.findPathAtPos(this.getOwner().getText(), index, '', this.getOwner().getStates());
			range = xmlStrUtil.findRangeByPath(this.getOwner().getText(), path, '', this.getOwner().getStates());
			var nodeText: string = this.getOwner().getText().substring(range[0], range[1] + 1);
			var valueRange: number[] = xmlStrUtil.getValueIndex(nodeText, valueName);
			if (valueRange) {
				var oldValue: string = this.getOwner().getText().substring(range[0] + valueRange[1], range[0] + valueRange[2]);
				if (value !== oldValue) {
					this.getOwner().insertText(value, range[0] + valueRange[1], range[0] + valueRange[2]);
				}
			}
			else {
				var valueStr: string = ' ' + valueName + '=\"' + value + '\"';
				if (range[2] === range[3]) {
					this.getOwner().insertText(valueStr, range[1] - 1, range[1] - 1);
				}
				else {
					this.getOwner().insertText(valueStr, range[1], range[1]);
				}
			}
		}
	}

	public getConfigId(): string {
		var configNode = this.getWingNode('Config');
		if (configNode) {
			return trim(String(configNode.attributes['id']));
		}
		return '';
	}
	public setConfigId(value: string): void {
		this.setWingNode('Config', 'id', value);
	}

	public getHostComponent(): string {
		var configNode = this.getWingNode('HostComponent');
		if (configNode) {
			return trim(String(configNode.attributes['name']));
		}
		return '';
	}
	public setHostComponent(value: string): void {
		this.setWingNode('HostComponent', 'name', value);
	}
}

export class BackgroundType {
	public static User: string = 'user';
	public static Null: string = 'null';
}

/**
 * Design config implement
 */
export class DesignConfig implements IDesignConfig {
	private _onDesignConfigChanged: Emitter<void>;
	/**
	 * 设计配置变更，比如背景色更改
	 */
	public get onDesignConfigChanged(): Event<void> {
		return this._onDesignConfigChanged.event;
	}
	private _onDesignBackgroundChanged: Emitter<void>;
	/**
	 * 设计配置的背景设置变更，背景色、参考图等
	 */
	public get onDesignBackgroundChanged(): Event<void> {
		return this._onDesignBackgroundChanged.event;
	}

	/**
	 *
	 */
	constructor(
		@IEgretProjectService private egretProjectService: IEgretProjectService) {

		this._onDesignConfigChanged = new Emitter<void>();
		this._onDesignBackgroundChanged = new Emitter<void>();
	}

	private owner: IExmlModel;
	public init(owner: IExmlModel): void {
		this.owner = owner;
	}

	protected getOwner(): IExmlModel {
		return this.owner;
	}

	//Do not use this param to get a config id.
	private configId: string = '';

	private getConfigId(): string {
		const configId = this.getOwner().getWingNodeModel().getConfigId();
		if(configId) {
			this.configId = configId;
		}
		//Create a new config id and set it to exml
		if (!this.configId) {
			var data = new Date();
			this.configId = data.getTime().toString(16);
		}
		return this.configId;
	}

	private get project(): EgretProjectModel {
		return this.egretProjectService.projectModel;
	}

	private getConfig(): any {
		var configId = this.getConfigId();
		var config = this.project.getExmlConfig(configId);
		return config;
	}
	private saveConfig(): void {
		this.getOwner().getWingNodeModel().setConfigId(this.getConfigId());
		this.project.setExmlConfig(this.getConfigId(), this.getConfig());
	}

	public get backgroundX(): number {
		var config = this.getConfig();
		if (!('backgroundX' in config)) {
			return 0;
		}
		return config['backgroundX'];
	}

	public get backgroundY(): number {
		var config = this.getConfig();
		if (!('backgroundY' in config)) {
			return 0;
		}
		return config['backgroundY'];
	}

	public get backgroundWidth(): number {
		var config = this.getConfig();
		if (!('backgroundWidth' in config)) {
			return -1;
		}
		return config['backgroundWidth'];
	}

	public get backgroundHeight(): number {
		var config = this.getConfig();
		if (!('backgroundHeight' in config)) {
			return -1;
		}
		return config['backgroundHeight'];
	}

	public get backgroundAlpha(): number {
		var config = this.getConfig();
		if (!('backgroundAlpha' in config)) {
			return 100;
		}
		return config['backgroundAlpha'];
	}

	public set backgroundAlpha(value: number) {
		var config = this.getConfig();
		config['backgroundAlpha'] = value;
		this.saveConfig();
		this._onDesignConfigChanged.fire();
	}

	public setBackgroundPosAndSize(x: number, y: number, width: number, height: number): void {
		var config = this.getConfig();
		config['backgroundX'] = x;
		config['backgroundY'] = y;
		config['backgroundWidth'] = width;
		config['backgroundHeight'] = height;
		this.saveConfig();
		this._onDesignConfigChanged.fire();
	}

	private _showTransformBg: boolean = false;
	public get showTransformBg(): boolean {
		return this._showTransformBg;
	}

	public set showTransformBg(value: boolean) {
		if (this._showTransformBg === value) {
			return;
		}
		this._showTransformBg = value;
		this._onDesignBackgroundChanged.fire();
	}

	public get useBgImage(): boolean {
		var config = this.getConfig();
		if (!('useBgImage' in config)) {
			return false;
		}
		return config['useBgImage'];
	}

	public get useBgColor(): boolean {
		var config = this.getConfig();
		if (!('useBgColor' in config)) {
			return false;
		}
		return config['useBgColor'];
	}

	public get guideLines(): IGuideLineInfo[] {
		var config = this.getConfig();
		if (!('guideLines' in config)) {
			return [];
		}
		return config['guideLines'];
	}

	public set guideLines(value: IGuideLineInfo[]) {
		var config = this.getConfig();
		config['guideLines'] = value;
		this.saveConfig();
	}

	public get guideLinesEnabled(): boolean {
		var config = this.getConfig();
		if (!('guideLinesEnabled' in config)) {
			return false;
		}
		return config['guideLinesEnabled'];
	}

	public set guideLinesEnabled(value: boolean) {
		var config = this.getConfig();
		config['guideLinesEnabled'] = value;
		this.saveConfig();
	}


	public setBackgroundOther(useBgColor: boolean, useBgImage: boolean): void {
		var config = this.getConfig();
		config['useBgImage'] = useBgImage;
		config['useBgColor'] = useBgColor;
		this.saveConfig();
		this._onDesignConfigChanged.fire();
		this._onDesignBackgroundChanged.fire();
	}




	/**
	 * Default is BackgroundType.Null.
	 */
	public get backgroundType(): string {
		var config = this.getConfig();
		if (!('backgroundType' in config)) {
			return BackgroundType.Null;
		}
		return config['backgroundType'];
	}
	public set backgroundType(value: string) {
		if (this.backgroundType === value) {
			return;
		}
		var config = this.getConfig();
		config['backgroundType'] = value;
		this.saveConfig();
		this._onDesignConfigChanged.fire();
		this._onDesignBackgroundChanged.fire();
	}

	/**
	 * Default is ''
	 */
	public get backgroundImage(): string {
		var config = this.getConfig();
		if (!('backgroundImage' in config)) {
			return '';
		}
		return config['backgroundImage'];
	}
	public set backgroundImage(value: string) {
		if (this.backgroundImage === value) {
			return;
		}
		var config = this.getConfig();
		config['backgroundImage'] = value;
		this.saveConfig();
		this._onDesignConfigChanged.fire();
		this._onDesignBackgroundChanged.fire();
	}
	/**
	 * Default is #ffffff
	 */
	public get backgroundColor(): string {
		var config = this.getConfig();
		if (!('backgroundColor' in config)) {
			return '#ffffff';
		}
		return config['backgroundColor'];
	}
	public set backgroundColor(value: string) {
		if (this.backgroundColor === value) {
			return;
		}
		var config = this.getConfig();
		config['backgroundColor'] = value;
		this.saveConfig();
		this._onDesignConfigChanged.fire();
	}
	/** data binding test */
	public get bindingDataTestObj(): { key: string, value: string }[] {
		var config = this.getConfig();
		if (!('bindingDataTestObj' in config)) {
			return null;
		}

		return config['bindingDataTestObj'];
	}

	public set bindingDataTestObj(value: { key: string, value: string }[]) {
		if (this.bindingDataTestObj === value) {
			return;
		}
		var config = this.getConfig();
		config['bindingDataTestObj'] = value;
		this.saveConfig();
		this._onDesignConfigChanged.fire();
	}


	public get zoomValue(): number {
		var config = this.getConfig();
		if (!('zoomValue' in config)) {
			return 100;
		}
		return config['zoomValue'];
	}
	public set zoomValue(value: number) {
		if (this.zoomValue === value) {
			return;
		}
		var config = this.getConfig();
		config['zoomValue'] = value;
		this.saveConfig();
		this._onDesignConfigChanged.fire();
	}

	//==================================全局属性==============================
	private getGlobalConfig(): any {
		return this.project.getExmlConfig('global');
	}

	private saveGlobalConfig(): void {
		this.project.setExmlConfig('global', this.getGlobalConfig());
	}

	public get globalBackgroundColor(): string {
		var config = this.getGlobalConfig();
		if (!('globalBackgroundColor' in config)) {
			return '';
		}
		return config['globalBackgroundColor'];
	}

	public get globalBackgroundImage(): string {
		var config = this.getGlobalConfig();
		if (!('globalBackgroundImage' in config)) {
			return '';
		}
		return config['globalBackgroundImage'];
	}

	public setglobalBackground(color: string, image: string) {
		var config = this.getGlobalConfig();
		config['globalBackgroundColor'] = color;
		config['globalBackgroundImage'] = image;
		this.saveGlobalConfig();
		this._onDesignConfigChanged.fire();
	}

	public get globalBackgroundX(): number {
		var config = this.getGlobalConfig();
		if (!('globalBackgroundX' in config)) {
			return 0;
		}
		return config['globalBackgroundX'];
	}

	public get globalBackgroundY(): number {
		var config = this.getGlobalConfig();
		if (!('globalBackgroundY' in config)) {
			return 0;
		}
		return config['globalBackgroundY'];
	}

	public get globalBackgroundWidth(): number {
		var config = this.getGlobalConfig();
		if (!('globalBackgroundWidth' in config)) {
			return -1;
		}
		return config['globalBackgroundWidth'];
	}

	public get globalBackgroundHeight(): number {
		var config = this.getGlobalConfig();
		if (!('globalBackgroundHeight' in config)) {
			return -1;
		}
		return config['globalBackgroundHeight'];
	}

	public setGlobalBackgroundPosAndSize(x: number, y: number, width: number, height: number): void {
		var config = this.getGlobalConfig();
		config['globalBackgroundX'] = x;
		config['globalBackgroundY'] = y;
		config['globalBackgroundWidth'] = width;
		config['globalBackgroundHeight'] = height;
		this.saveGlobalConfig();
		this._onDesignConfigChanged.fire();
	}


	public get globalGridSize(): number {
		var config = this.getGlobalConfig();
		if (!('gridSize' in config)) {
			return 20;
		}
		return config['gridSize'];
	}
	public set globalGridSize(value: number) {
		var config = this.getGlobalConfig();
		config['gridSize'] = value;
		this.saveGlobalConfig();
	}

	public get globalBackgroundAlpha(): number {
		var config = this.getGlobalConfig();
		if (!('globalBackgroundAlpha' in config)) {
			return 100;
		}
		return config['globalBackgroundAlpha'];
	}
	public set globalBackgroundAlpha(value: number) {
		var config = this.getGlobalConfig();
		config['globalBackgroundAlpha'] = value;
		this.saveGlobalConfig();
	}


	public get globalGridEnabled(): boolean {
		var config = this.getGlobalConfig();
		if (!('gridEnabled' in config)) {
			return false;
		}
		return config['gridEnabled'];
	}
	public set globalGridEnabled(value: boolean) {
		var config = this.getGlobalConfig();
		config['gridEnabled'] = value;
		this.saveGlobalConfig();
	}

	public get globalGridColor(): number {
		var config = this.getGlobalConfig();
		if (!('gridColor' in config)) {
			return 0x808080;
		}
		return config['gridColor'];
	}
	public set globalGridColor(value: number) {
		var config = this.getGlobalConfig();
		config['gridColor'] = value;
		this.saveGlobalConfig();
	}

	/**吸附开关 */
	public get globalAdsorbEnable(): boolean {
		var config = this.getGlobalConfig();
		if (!('globalAdsorbEnable' in config)) {
			return true;
		}
		return config['globalAdsorbEnable'];
	}

	public set globalAdsorbEnable(value: boolean) {
		var config = this.getGlobalConfig();
		config['globalAdsorbEnable'] = value;
		this.saveGlobalConfig();
	}
	/**标尺开关 */
	public get globalRulerEnable(): boolean {
		var config = this.getGlobalConfig();
		if (!('globalRulerEnable' in config)) {
			return true;
		}
		return config['globalRulerEnable'];
	}

	public set globalRulerEnable(value: boolean) {
		var config = this.getGlobalConfig();
		config['globalRulerEnable'] = value;
		this.saveGlobalConfig();
	}

	/**图层自动识别开关 */
	public get globalAutoLayerMarkEnable(): boolean {
		var config = this.getGlobalConfig();
		if (!('globalAutoLayerMarkEnable' in config)) {
			return true;
		}
		return config['globalAutoLayerMarkEnable'];
	}

	public set globalAutoLayerMarkEnable(value: boolean) {
		var config = this.getGlobalConfig();
		config['globalAutoLayerMarkEnable'] = value;
		this.saveGlobalConfig();
		this._onDesignConfigChanged.fire();
	}

	/** global data binding test */
	public get globalBindingDataTestObj(): { key: string, value: string }[] {
		var config = this.getGlobalConfig();
		if (!('globalBindingDataTestObj' in config)) {
			return null;
		}
		return config['globalBindingDataTestObj'];
	}

	public set globalBindingDataTestObj(value: { key: string, value: string }[]) {
		var config = this.getGlobalConfig();
		config['globalBindingDataTestObj'] = value;
		this.saveGlobalConfig();
	}
}