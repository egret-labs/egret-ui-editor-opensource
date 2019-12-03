/**
 * 编辑模式
 */
export enum EditMode {
	CODE = 'code',
	PREVIEW = 'preview',
	DESIGN = 'design',
	ANIMATION = 'animation'
}

/**
 * 预览配置
 */
export interface PreviewConfig {
	/**
	 * 屏幕宽度
	 */
	screenWidth:number;
	/**
	 * 屏幕高度
	 */
	screenHeight:number;
	/**
	 * 屏幕比例
	 */
	screenScale:number;
	/**
	 * 适应内容尺寸
	 */
	fitContent:boolean;
}