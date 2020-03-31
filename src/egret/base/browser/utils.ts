import { EntryBase } from 'egret/base/browser/entry';
var entryId = 0;

export interface WebPlayer {
	/**
    * 更新播放器视口尺寸
    */
	updateScreenSize(direct: boolean): void;

	updateScreenSize(): void;

	stage: egret.Stage;

	loaded: boolean;
}

export function setupStage(target: HTMLElement, options?: PlayerOption): WebPlayer {
	options = options || { entryClass: EntryBase };
	setContainerAttrs(target, options);
	let player: WebPlayer = target['egret-player'];
	if (player) {
		player.loaded = true;
	} else {
		egret.initPlayer(target);
		player = target['egret-player'];
		player.stage.addEventListener('loaded', () => {
			player.loaded = true;
		}, this);
	}
	return player;
}

function setContainerAttrs(target: HTMLElement, options: PlayerOption) {
	var name = `entryClass_` + entryId++;
	global[name] = options.entryClass;
	target.setAttribute('data-entry-class', name);
	target.setAttribute('data-frame-rate', String(60));
	target.setAttribute('data-show-paint-rect', String(options.showPaintRect || false));
}

export interface PlayerOption {
	/**
     * 入口类完整类名
     */
	entryClass: { new(): any };
	/**
     * 是否显示重绘区域
     */
	showPaintRect?: boolean;
}