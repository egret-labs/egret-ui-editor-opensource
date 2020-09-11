import { Event } from 'egret/base/common/event';
import { IDisposable } from 'egret/base/common/lifecycle';

/* tslint:disable */
/**
 * 内部接口，用户不要使用
 */
export interface _IInnerWindowCore {
	/**
	 * 窗体的dom节点
	 */
	readonly windowElement: HTMLElement;
	/**
	 * 子窗体的容器
	 */
	readonly subWindowsContainer: HTMLElement;
	/**
	 * 子窗口列表
	 */
	readonly subWindowsList: IInnerWindow[];
	/**
	 * 窗体是否已被激活
	 */
	readonly actived: boolean;
	/**
	 * 设置父级窗体
	 * @param owner
	 */
	setOwnerWindow(owner: IInnerWindow | IInnerWindowRoot): void;
	/**
	 * 派发打开窗体事件
	 */
	doOpen(): void;
	/**
	 * 执行激活窗体
	 */
	doActivate(): void;
	/**
	 * 执行失活窗体
	 */
	doDeactivate(): void;
	/**
	 * 派发即将关闭窗体事件
	 */
	doClosing(): Promise<boolean> ;
	/**
	 * 派发关闭窗体事件
	 */
	doClose(): void;
	/**
	 * 执行esc
	 */
	doEsc():void;
	/**
	 * 执行esc
	 */
	doEnter():void;
	/**
	 * 自己尺寸改变
	 */
	doSelfResize():void;
	/**
	 * 所在父级的局部坐标X位置
	 */
	readonly localX: number;
	/**
	 * 所在父级的局部坐标Y位置
	 */
	readonly localY: number;
}
/**
 * 模态控制器,内部接口，用户不要使用
 */
export interface _IModal {
	/**
	 * 是否启用父级的遮蔽效果。
	 */
	readonly modal: boolean;
	/**
	 * 作为父级窗体的时候，启动当前窗体的被模态的效果，该方法不需要用户手动调用。
	 */
	enableModal(): void;
	/**
	 * 作为父级窗体的时候，失效当前窗体的被模态的效果，该方法不需要用户手动调用。
	 */
	disableModal(): void;
	/**
	 * 播放父级窗体触发模态之后，当前窗体的可视提示
	 */
	modalNotif(): void;
}
export interface _IInnerWindow extends _IInnerWindowCore, _IModal, IInnerWindow {}
export interface _IInnerWindowRoot extends _IInnerWindowCore,_IModal,IInnerWindowRoot{}

/* tslint:enable */


/**
 * 窗体的根
 */
export interface IInnerWindowRoot {
	/**
	 * 窗体的x坐标
	 */
	readonly x: number;
	/**
	 * 窗体的y坐标
	 */
	readonly y: number;
	/**
	 * 窗体的宽度
	 */
	readonly width: number;
	/**
	 * 窗体的高度
	 */
	readonly height: number;
}

/**
 * 内部窗体的即将关闭事件
 */
export interface InnerWindowClosingEvent{
	/**
	 * 是否拒绝本次关闭请求
	 */
	veto(value: boolean | Promise<boolean>): void;
	/**
	 * 对应的窗体
	 */
	relativeWindow:IInnerWindow;
}

/**
 * 内部窗体接口
 */
export interface IInnerWindow extends IDisposable {
	/**
	 * 即将关闭，可以阻止
	 */
	readonly onClosing: Event<InnerWindowClosingEvent>;
	/**
	 * 窗口关闭事件
	 */
	readonly onClosed: Event<this>;
	/**
	 * 窗口打开事件
	 */
	readonly onOpend: Event<this>;
	/**
	 * 窗口激活事件
	 */
	readonly onActivated: Event<this>;
	/**
	 * 窗口失活事件
	 */
	readonly onDeactivated: Event<this>;
	/**
	 * 窗体是否已被激活
	 */
	readonly actived: boolean;

	/**
	 * 窗体的x坐标
	 */
	x: number;
	/**
	 * 窗体的y坐标
	 */
	y: number;
	/**
	 * 是否水平居中
	 */
	horizontalCenter: boolean;
	/**
	 * 是否纵向居中
	 */
	verticalCenter: boolean;
	/**
	 * 窗体的宽度
	 */
	width: number;
	/**
	 * 窗体的高度
	 */
	height: number;
	/**
	 * 窗体的标题
	 */
	title: string;
	/**
	 * 背景色
	 */
	backgroundColor:string;
	/**
	 * 标题栏显示
	 */
	titleBarVisible:boolean;
	/**
	 * 父级窗体，如果是根窗口则父级是html节点，否则为窗体接口
	 */
	readonly ownerWindow: IInnerWindowRoot | IInnerWindow;
	/**
	 * 打开窗体
	 * @param ownerWindow 父级窗体，如果设置null，则从当前激活的窗体上打开，如果设置为root则从根窗体打开
	 * @param modal 是否启用模态窗体
	 */
	open(ownerWindow?: IInnerWindow | 'root', modal?: boolean): void;
	/**
	 * 关闭窗口
	 */
	close(): void;
	/**
	 * 子类可以重载此方法以实现渲染内容
	 * @param contentGroup
	 */
	render(contentGroup:HTMLElement):void;
	/**
	 * 内容容器，用户窗体内容绘制在这个容器里
	 */
	readonly contentGroup: HTMLElement;
}

/**
 * 内部按钮的激活状态结果
 */
export enum InnerButtonType {
	/** 激活激活了关闭按钮 */
	CLOSE_BUTTON,
	/** 激活了第一个按钮 */
	FIRST_BUTTON,
	/** 激活了第二个按钮 */
	SECOND_BUTTON,
	/** 激活了第三个按钮 */
	THIRD_BUTTON
}
/**
 * 按钮描述
 */
export interface InnerButtonDescription{
	/**
	 * 按钮文本
	 */
	label:string;
	/**
	 * 是否自动执行关闭窗体，默认为true
	 */
	closeWindow?:boolean;
}

/**
 * 具有按钮组的内部窗体接口
 */
export interface IInnerBtnWindow extends IInnerWindow {
	/**
	 * 窗口关闭事件
	 */
	readonly onButtonClick: Event<InnerButtonType>;

	/**
	 * 禁止使用头按钮关闭
	 */
	forbiddenHeadBtn:boolean;
	/**
	 * 初始化按钮
	 * @param button 按钮文本，该按钮为按回车时候默认激活的按钮
	 */
	initButtons(button: InnerButtonDescription): void;
	/**
	 * 初始化按钮
	 * @param button1 第一个按钮的文本，该按钮为按回车时候默认激活的按钮
	 * @param button2 第二个按钮的文本
	 */
	initButtons(button1: InnerButtonDescription, button2: InnerButtonDescription): void;
	/**
	 * 初始化按钮
	 * @param button1 第一个按钮的文本，该按钮为按回车时候默认激活的按钮
	 * @param button2 第二个按钮的文本
	 * @param button3 第三个按钮的文本
	 */
	initButtons(button1: InnerButtonDescription, button2: InnerButtonDescription, button3: InnerButtonDescription): void;
}