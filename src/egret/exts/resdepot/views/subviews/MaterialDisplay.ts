// @ts-nocheck
import {GraphicsUtil} from 'egret/exts/resdepot/common/utils/GraphicsUtil';

/**
 * 预览区
 * 材质的展示
 *
 */
export class MaterialDisplay extends egret.Sprite {
	private $scale9Grid: egret.Rectangle;

	private $top: egret.Shape;
	private $bottom: egret.Shape;
	private $left: egret.Shape;
	private $right: egret.Shape;

	private $displayBox: egret.Sprite;
	/// 在as版本中是素材包装器UIAsset，现简化为图片 todo sheet的显示
	private $uiAsset: eui.Image;
	// 是否保持素材的宽高比
	private $maintainAspectRatio: boolean = true;
	// 自动否缩放_uiAsset对象，以符合UIAsset的尺寸。默认值true。
	private $autoScale: boolean = true;

	public constructor() {
		super();
		this.$displayBox = new egret.Sprite();
		this.addChild(this.$displayBox);

		this.$uiAsset = new eui.Image();

		this.$displayBox.addChild(this.$uiAsset);
		this.$uiAsset.addEventListener(egret.Event.COMPLETE, this.onLoadAssetComplete, this);

		this.$top = new egret.Shape();
		this.addChild(this.$top);
		this.$bottom = new egret.Shape();
		this.addChild(this.$bottom);
		this.$left = new egret.Shape();
		this.addChild(this.$left);
		this.$right = new egret.Shape();
		this.addChild(this.$right);
	}
	/**
	 * 清空
	 *
	 */
	public clean(): void {
		this.$top.visible = false;
		this.$bottom.visible = false;
		this.$left.visible = false;
		this.$right.visible = false;
		this.$uiAsset.source = null;
	}

	public get height(): number {
		return this.$displayBox.height;
	}

	public set height(value: number) {
		this.$displayBox.height = value;
	}

	public get width(): number {
		return this.$displayBox.width;
	}

	public set width(value: number) {
		this.$displayBox.width = value;
	}

	public get y(): number {
		return this.$displayBox.y;
	}

	public set y(value: number) {
		this.$displayBox.y = value;
	}

	public get x(): number {
		return this.$displayBox.x;
	}

	public set x(value: number) {
		this.$displayBox.x = value;
	}

	/**
	 * @param value 当前主要为图片地址，string类型
	 * 在as版本中传入的是底层资源管理模块RES的图像加载器ImageLoader取得的各种资源类型
	 */
	public set source(value: string | egret.Texture) {
		this.$uiAsset.source = value;
		if (this.$uiAsset.source) {
			this.setAssetPosition();
			this.updateDisplayList();
		}
	}
	/**
	 * 预览图片的大小根据预览区调整
	 */
	public updateDisplayList(): void {
		if (!this.$uiAsset || !this.$uiAsset.texture) {
			return;
		}
		if (this.$autoScale && this.$maintainAspectRatio) {
			// console.log('parent w/h', this.parent.width, this.parent.height);// test
			// console.log('this w/h', this.width, this.height);
			// this._uiAsset.width = this._uiAsset.height = 50;
			// this._uiAsset.height = 50;
			// console.log('uiAsset wh', this._uiAsset.width, this._uiAsset.height);
			// console.log('uiAsset w/h', this._uiAsset.texture.textureWidth, this._uiAsset.texture.textureHeight);

			if (this.$uiAsset.texture.textureWidth > this.$preViewGroupWidth || this.$uiAsset.texture.textureHeight > this.$preViewGroupHeight) {
				var rw: number = this.$preViewGroupWidth / this.$uiAsset.texture.textureWidth;
				var rh: number = this.$preViewGroupHeight / this.$uiAsset.texture.textureHeight;
				var r: number = rw < rh ? rw : rh;
				this.$uiAsset.width = this.$uiAsset.texture.textureWidth * r;
				this.$uiAsset.height = this.$uiAsset.texture.textureHeight * r;
				return;
			}
		}
		this.$uiAsset.width = this.$uiAsset.texture.textureWidth;
		this.$uiAsset.height = this.$uiAsset.texture.textureHeight;
	}

	public setScale9Grid(scale9Grid: egret.Rectangle): void {
		if (this.$scale9Grid === scale9Grid) {
			return;
		}
		this.$scale9Grid = scale9Grid;
		if (this.$scale9Grid && this.$scale9Grid.x === 0 && this.$scale9Grid.y === 0 && this.$scale9Grid.width === 0 && this.$scale9Grid.height === 0) {
			this.$scale9Grid = null;
		}
		this.updateView(this.$preViewGroupWidth, this.$preViewGroupHeight);// 设置九宫后需要刷新页面
	}

	private $preViewGroupWidth: number;
	private $preViewGroupHeight: number;
	/**
	 * 保存预览区的大小，在预览区的显示组件据此定位
	 */
	public savePreViewSize(w: number, h: number): void {
		this.$preViewGroupWidth = w;
		this.$preViewGroupHeight = h;
	}
	/**
	 * 预览区的资源加载完毕后设置预览资源的位置
	 */
	private onLoadAssetComplete(event: egret.Event): void {
		//console.log('onLoadAssetComplete');
		this.setAssetPosition();
	}
	/**
	 * 设置预览资源的位置信息
	 */
	public setAssetPosition() {
		//console.log('setAssetPosition');
		var r: number;
		if (this.$preViewGroupWidth > this.realW && this.$preViewGroupHeight > this.realH) {
			r = 1;
		} else {
			r = Math.max(this.realW / this.$preViewGroupWidth, this.realH / this.$preViewGroupHeight);
		}
		var w: number = this.realW / r;
		var h: number = this.realH / r;
		this.width = w;
		this.height = h;
		this.x = (this.$preViewGroupWidth - this.width) / 2;
		this.y = (this.$preViewGroupHeight - this.height) / 2;
		//console.log(r, w, h, this.realW, this.realH);
	}

	/**
	 * 预览区的9切信息
	 */
	public updateView($width: number = -1, $height: number = -1): void {
		//console.log('updateView');
		if (!this.$scale9Grid) {
			this.$top.visible = false;
			this.$bottom.visible = false;
			this.$left.visible = false;
			this.$right.visible = false;
			return;
		} else {
			this.$top.visible = true;
			this.$bottom.visible = true;
			this.$left.visible = true;
			this.$right.visible = true;
		}

		if ($width === -1) {
			$width = this.$preViewGroupWidth;
		}
		if ($height === -1) {
			$height = this.$preViewGroupHeight;
		}

		this.$top.graphics.clear();
		this.$top.graphics.lineStyle(1, 0x555555, 1, true, 'none');
		GraphicsUtil.drawDash(this.$top.graphics, 0, 0, $width, 0, 4, 2);
		this.$top.graphics.endFill();
		this.$top.graphics.lineStyle(1, 0xffffff, 1, true, 'none');
		GraphicsUtil.drawDash(this.$top.graphics, 3, 0, $width, 0, 4, 2);
		this.$top.graphics.endFill();
		this.$top.y = this.$displayBox.y + this.$scale9Grid.y * this.$displayBox.scaleY;

		this.$bottom.graphics.clear();
		this.$bottom.graphics.lineStyle(1, 0x555555, 1, true, 'none');
		GraphicsUtil.drawDash(this.$bottom.graphics, 0, 0, $width, 0, 4, 2);
		this.$bottom.graphics.endFill();
		this.$bottom.graphics.lineStyle(1, 0xffffff, 1, true, 'none');
		GraphicsUtil.drawDash(this.$bottom.graphics, 3, 0, $width, 0, 4, 2);
		this.$bottom.graphics.endFill();
		this.$bottom.y = this.$displayBox.y + this.$displayBox.height - (this.realH - this.$scale9Grid.y - this.$scale9Grid.height) * this.$displayBox.scaleY;

		this.$left.graphics.clear();
		this.$left.graphics.lineStyle(1, 0x555555, 1, true, 'none');
		GraphicsUtil.drawDash(this.$left.graphics, 0, 0, 0, $height, 4, 2);
		this.$left.graphics.endFill();
		this.$left.graphics.lineStyle(1, 0xffffff, 1, true, 'none');
		GraphicsUtil.drawDash(this.$left.graphics, 0, 3, 0, $height, 4, 2);
		this.$left.graphics.endFill();
		this.$left.x = this.$displayBox.x + this.$scale9Grid.x * this.$displayBox.scaleX;

		this.$right.graphics.clear();
		this.$right.graphics.lineStyle(1, 0x555555, 1, true, 'none');
		GraphicsUtil.drawDash(this.$right.graphics, 0, 0, 0, $height, 4, 2);
		this.$right.graphics.endFill();
		this.$right.graphics.lineStyle(1, 0xffffff, 1, true, 'none');
		GraphicsUtil.drawDash(this.$right.graphics, 0, 3, 0, $height, 4, 2);
		this.$right.graphics.endFill();
		this.$right.x = this.$displayBox.x + this.$displayBox.width - (this.realW - this.$scale9Grid.x - this.$scale9Grid.width) * this.$displayBox.scaleX;
	}

	public get realW(): number {
		// 取素材的真实大小，而不是显示大小
		return (this.$uiAsset && this.$uiAsset.texture) ? this.$uiAsset.texture.textureWidth : 0;//this._uiAsset.width;
	}

	public get realH(): number {
		return (this.$uiAsset && this.$uiAsset.texture) ? this.$uiAsset.texture.textureHeight : 0;//this._uiAsset.height;
	}
}