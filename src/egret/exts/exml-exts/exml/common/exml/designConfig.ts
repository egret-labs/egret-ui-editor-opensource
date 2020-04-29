import { Event } from 'egret/base/common/event';

export interface IGuideLineInfo {
	type: 'h' | 'v';
	pos: number;
}

/**
 * 设计配置，比如参考图、背景色
 */
export interface IDesignConfig {
	/**
	 * 设计配置变更，比如背景色更改
	 */
	readonly onDesignConfigChanged: Event<void>;
	/**
	 * 设计配置的背景设置变更，背景色、参考图等
	 */
	readonly onDesignBackgroundChanged: Event<void>;
	backgroundX: number;
	backgroundY: number;
	backgroundWidth: number;
	backgroundHeight: number;
	backgroundAlpha: number;
	showTransformBg: boolean;
	useBgImage: boolean;
	useBgColor: boolean;
	guideLines: IGuideLineInfo[];
	guideLinesEnabled: boolean;
	backgroundType: string;
	backgroundImage: string;
	backgroundColor: string;
	bindingDataTestObj: { key: string, value: string }[];
	zoomValue: number;
	globalBackgroundColor: string;
	globalBackgroundX: number;
	globalBackgroundY: number;
	globalBackgroundWidth: number;
	globalBackgroundHeight: number;
	globalGridSize: number;
	globalBackgroundAlpha: number;
	globalGridEnabled: boolean;
	globalGridColor: number;
	globalAdsorbEnable: boolean;
	globalRulerEnable: boolean;
	globalBindingDataTestObj: { key: string, value: string }[];
	globalBackgroundImage: string;
	globalAutoLayerMarkEnable: boolean;
	setBackgroundPosAndSize(x: number, y: number, width: number, height: number): void;
	setBackgroundOther(useBgColor: boolean, useBgImage: boolean): void;
	setglobalBackground(color: string, image: string);
	setGlobalBackgroundPosAndSize(x: number, y: number, width: number, height: number): void;
}

export interface IWingNodeModel {
	getConfigId(): string;
	setConfigId(value: string): void;
	getHostComponent(): string;
	setHostComponent(value: string): void;
}