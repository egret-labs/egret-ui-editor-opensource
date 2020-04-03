import {FileUtil} from 'egret/exts/resdepot/common/utils/FileUtil';

export class MusicDisplay extends eui.Group {

	public constructor() {
		super();
	}

	private _url: string;
	public setUrl(url: string) {
		this._url = FileUtil['path2Url'](url);
		if (this.chanel) {
			this.chanel.stop();
		}
		try {
			this.sound.close();
		}
		catch (error)
		{ }
		// this.sound = new flash.Sound();
		// try {
		//     this.sound.load(new egret.URLRequest(this._url));
		// }
		// catch (error)
		// { }
		this.time = (0);
		this.timeShow.text = '';
		if (this.autoPlay.selected) {
			this.play();
		}
		// this.graphics.clear();

	}

	private playBtn: eui.Button = new eui.Button();
	private pauseBtn: eui.Button = new eui.Button();
	private stopBtn: eui.Button = new eui.Button();
	private autoPlay: eui.CheckBox = new eui.CheckBox();
	private timeShow: eui.Label = new eui.Label();
	// private waveShape: egret.Shape = new egret.Shape();
	protected createChildren() {
		super.createChildren();
		var soundBtnGroup: eui.Group = new eui.Group();
		var hL: eui.HorizontalLayout = new eui.HorizontalLayout();
		hL.verticalAlign = egret.VerticalAlign.MIDDLE;
		soundBtnGroup.layout = hL;
		this.addChild(soundBtnGroup);
		soundBtnGroup.bottom = 5;
		soundBtnGroup.horizontalCenter = 0;
		this.playBtn.skinName = 'skins.IconButtonSkin';
		this.playBtn.icon = 'play_png';
		// this.playBtn.toolTip = (egret.utils.tr('Publish.PublishWindow.Play.Tip'));
		this.addChild(this.playBtn);
		this.playBtn.addEventListener(egret.TouchEvent.TOUCH_TAP, this.playClick_handler, this);
		// this.pauseBtn.skinName = code.module.view.skins.ButtonSkin;
		this.pauseBtn.icon = 'pause_png';
		this.pauseBtn.skinName = 'skins.IconButtonSkin';
		// this.pauseBtn.toolTip = (egret.utils.tr('Publish.PublishWindow.Pause.Tip'));
		this.pauseBtn.addEventListener(egret.TouchEvent.TOUCH_TAP, this.pauseClick_handler, this);
		this.addChild(this.pauseBtn);
		this.pauseBtn.enabled = false;
		// this.stopBtn.skinName = code.module.view.skins.ButtonSkin;
		this.stopBtn.icon = 'stop_png';
		this.stopBtn.skinName = 'skins.IconButtonSkin';
		// this.stopBtn.toolTip = (egret.utils.tr('Publish.PublishWindow.Stop.Tip'));
		this.stopBtn.addEventListener(egret.TouchEvent.TOUCH_TAP, this.stopClick_handler, this);
		this.stopBtn.enabled = false;
		this.addChild(this.stopBtn);
		// this.autoPlay.label = (egret.utils.tr('Publish.PublishWindow.AutoPlay'));
		this.addChild(this.autoPlay);
		this.timeShow.top = 5;
		this.timeShow.left = 5;
		this.addChild(this.timeShow);
	}

	protected playClick_handler(event: egret.MouseEvent) {
		this.play();
	}

	protected pauseClick_handler(event: egret.MouseEvent) {
		this.pause();
	}

	protected stopClick_handler(event: egret.MouseEvent) {
		this.stop();
	}

	private sound: any;//flash.Sound
	private chanel: any;//flash.SoundChannel
	private time: number = 0;
	public stop() {
		if (this.chanel) {
			this.chanel.stop();
		}
		this.time = (0);
		this.chanel = null;
		this.removeEventListener(egret.Event.ENTER_FRAME, this.updateHandler, this);
		// this.graphics.clear();
		this.timeShow.text = '';
		this.playBtn.enabled = true;
		this.pauseBtn.enabled = false;
		this.stopBtn.enabled = false;
	}

	public play() {
		try {
			this.chanel = this.sound.play(this.time);
			this.playBtn.enabled = false;
			this.pauseBtn.enabled = true;
			this.stopBtn.enabled = true;
		}
		catch (error)
		{ }
		this.addEventListener(egret.Event.ENTER_FRAME, this.updateHandler, this);
	}

	public pause() {
		if (this.chanel) {
			this.time = (this.chanel.position);
			this.chanel.stop();
			this.playBtn.enabled = true;
			this.pauseBtn.enabled = false;
			this.stopBtn.enabled = true;
		}
		this.removeEventListener(egret.Event.ENTER_FRAME, this.updateHandler, this);
	}

	// private bytes: egret.ByteArray = new egret.ByteArray();
	protected updateHandler(event: egret.Event) {
		// this.graphics.clear();
		if (!this.chanel) {
			return;
		}
		// var past:flash.As3Date = new flash.As3Date(this.chanel.position);
		// var sum:flash.As3Date = new flash.As3Date(this.sound.length);
		// this.timeShow.text = past.minutes + ':' + past.seconds + '/' + sum.minutes + ':' + sum.seconds;
		// SoundMixer.computeSpectrum(this.bytes,false,0);
		// var chanelLength:number = this.bytes.length / 8;
		// var plotHeight:number = this.layout.target.scrollV / 2;//layoutBoundsHeight
		// var scaleRate:number = <any>1;
		// scaleRate = this.layout.target.scrollH / chanelLength;
		// var g:egret.Graphics = this.graphics;
		// g.lineStyle(0,0x1b2025);
		// g.beginFill(0x1b2025,0.5);
		// g.moveTo(0,plotHeight);
		// var n:number = <any>0;
		// for(var i:number = (0);i < chanelLength; i++)
		// {
		// 	n = (this.bytes.readFloat() * plotHeight);
		// 	g.lineTo(i * scaleRate,plotHeight - n);
		// }
		// g.lineTo(chanelLength * scaleRate,plotHeight);
		// g.endFill();
		// g.lineStyle(0,0x006ed7);
		// g.beginFill(0x006ed7,0.5);
		// g.moveTo(chanelLength * scaleRate,plotHeight);
		// for(i = (chanelLength); i > 0; i--)
		// {
		// 	n = (this.bytes.readFloat() * plotHeight);
		// 	g.lineTo(i * scaleRate,plotHeight - n);
		// }
		// g.lineTo(0,plotHeight);
		// g.endFill();
	}

}

