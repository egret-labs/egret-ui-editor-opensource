import * as React from 'react';

// tslint:disable-next-line:check-comment
export interface ZoomPanelProps {
	/**
     * 内容初始宽度
     */
	contentInitWidth: number;
	/**
     * 内容初始高度
     */
	contentInitHeight: number;
	/**
     * 要缩放的内容
     */
	content?: React.ReactNode;
	/**
     * 最小缩放比，默认值3，即`(3%)`
     */
	minZoom?: number;
	/**
     * 最大缩放比，默认值6400，即`(6400%)`
     */
	maxZoom?: number;

	// tslint:disable-next-line:check-comment
	className?: string;

	// tslint:disable-next-line:check-comment
	onZoom?: (target: ZoomPanel, zoomSize: number) => void;
	// tslint:disable-next-line:check-comment
	onMove?: (target: ZoomPanel) => void;
}

type DefaultZoomPanelProps = {
	minZoom: number;
	maxZoom: Number;
};

// tslint:disable-next-line:check-comment
export class ZoomPanel extends React.Component<ZoomPanelProps, any>  {
	constructor(props) {
		super(props);

	}
	private mouseDownContentOffsetLeft: number = 0;
	private mouseDownContentOffsetTop: number = 0;
	private mouseDownX: number = 0;
	private mouseDownY: number = 0;
	private mouseMoveSpeedX: number = 0;
	private mouseMoveSpeedY: number = 0;
	private lastMouseMoveX: number = Number.NaN;
	private lastMouseMoveY: number = Number.NaN;
	private lastMouseMoveTime: number = 0;
	private contentSlidingFunc;

	private lastSizeWidth: number = Number.NaN;
	private lastSizeHeight: number = Number.NaN;

	/**
     * 是否已经计算过有效的初始缩放大小。
     * *如果未设置初始高宽或者panel大小为零，则为false*
     */
	private initZoomSizeComputed: boolean = false;
	private initZoomSize: number;
	private currentZoomSize: number;

	private rootPanel: HTMLDivElement = null;
	private rootContent: HTMLDivElement = null;
	private ContentContainer: HTMLDivElement = null;

	// tslint:disable-next-line:check-comment
	public static defaultProps: DefaultZoomPanelProps = {
		minZoom: 3,
		maxZoom: 6400
	};

	// tslint:disable-next-line:check-comment
	public get contentOffsetTop(): number {
		if (this.rootContent) {
			return this.rootContent.offsetTop;
		}
		return 0;
	}

	// tslint:disable-next-line:check-comment
	public get contentOffsetLeft(): number {
		if (this.rootContent) {
			return this.rootContent.offsetLeft;
		}
		return 0;
	}

	// tslint:disable-next-line:check-comment
	public get contentOffsetHeight(): number {
		if (this.rootContent) {
			return this.rootContent.offsetHeight;
		}
		return 0;
	}

	// tslint:disable-next-line:check-comment
	public get contentOffsetWidth(): number {
		if (this.rootContent) {
			return this.rootContent.offsetWidth;
		}
		return 0;
	}

	/**
     * 重新计算初始缩放大小
     */
	public refreshInitZoomSize(): void {
		this.initZoomSize = this.getInitZoomSize();
	}

	/**
     * 缩放内容
     * @param zoom 缩放大小 
     * @param isReset 是否重置位置, 将会使内容居中
     */
	public zoom(zoom: number, isReset?: boolean): void {
		this.zoomContent(null, zoom, isReset);
	}

	/**
     * 使内容居中并填充panel
     */
	public resetZoom(): void {
		this.zoomContent(null, this.initZoomSize, true);
	}

	/**
     * 重新渲染
     */
	public layout(): void {
		this.initialize();
	}


	// tslint:disable-next-line:check-comment
	public componentDidMount(): void {
		this.initialize();
		this.addPanelSizeWatch();
	}

	// tslint:disable-next-line:check-comment
	public componentWillUnmount(): void {
		this.removePanelSizeWatch();
	}

	private fireOnZoomCallback(): void {
		if (this.props.onZoom) {
			this.props.onZoom(this, this.currentZoomSize);
		}
	}

	private fireOnMoveCallback(): void {
		if (this.props.onMove) {
			this.props.onMove(this);
		}
	}

	private initialize(): void {
		let panel = this.rootPanel;
		let content = this.rootContent;
		if (!panel || !content) {
			return;
		}
		let initX = 0;
		let initY = 0;
		let zoomSzie = this.getInitZoomSize();
		this.initZoomSize = zoomSzie;
		this.currentZoomSize = zoomSzie;
		// 将图片按照zoomSize进行缩放
		content.style.width = (this.props.contentInitWidth * zoomSzie / 100) + 'px';
		content.style.height = (this.props.contentInitHeight * zoomSzie / 100) + 'px';
		// 垂直居中
		initY = (panel.clientHeight - content.offsetHeight) / 2;
		// 水平居中
		initX = (panel.clientWidth - content.offsetWidth) / 2;
		this.setContentPosition(initX, initY);
		if (this.initZoomSizeComputed) {
			this.fireOnMoveCallback();
			this.fireOnZoomCallback();
		}
	}

	private addPanelSizeWatch(): void {
		let panel = this.rootPanel;
		if (panel) {
			boxlayout.HtmlElementResizeHelper.watch(panel);
			panel.addEventListener('resize', this.onPanelResize);
		}
	}

	private removePanelSizeWatch(): void {
		let panel = this.rootPanel;
		if (panel) {
			boxlayout.HtmlElementResizeHelper.unWatch(panel);
			panel.removeEventListener('resize', this.onPanelResize);
		}
	}

	private onPanelResize = (e: UIEvent): void => {
		console.log('zoompanle resize');
		let panel = this.rootPanel;
		if (panel) {
			if (panel.clientWidth > 0 && panel.clientHeight > 0) {
				if (this.lastSizeHeight !== panel.clientHeight ||
					this.lastSizeWidth !== panel.clientWidth) {
					this.lastSizeHeight = panel.clientHeight;
					this.lastSizeWidth = panel.clientWidth;
					let resetZoomSize = !this.initZoomSizeComputed;
					this.initZoomSize = this.getInitZoomSize();
					this.zoomContent(null, resetZoomSize ? this.initZoomSize : this.currentZoomSize, true);
				}
			}
		}
	}

	/**
     * 通过判断初始宽和高，来计算将内容缩放到填充panel时的缩放值
     */
	private getInitZoomSize(): number {
		let panel = this.rootPanel;
		if (panel) {
			if (this.props.contentInitHeight > 0 &&
				this.props.contentInitWidth > 0 &&
				panel.clientHeight > 0 &&
				panel.clientWidth > 0) {
				this.initZoomSizeComputed = true;
				let xZoomSize = panel.clientWidth / this.props.contentInitWidth * 100;
				let yZoomSize = panel.clientHeight / this.props.contentInitHeight * 100;
				return Math.min(xZoomSize, yZoomSize);
			}
		}
		return 100;
	}

	/**
	 * 防止内容超出最大临界值
	 * 请在移动操作后调用该方法修正位置
	 */
	private preventBeyondBoundary(): { outOfX: boolean; outOfY: boolean; } {
		let panel = this.rootPanel;
		let content = this.rootContent;
		if (!panel || !content) {
			return;
		}
		// 可超出外界的最大临界值
		let marginality: number = .8;
		let outOfX: boolean = false;
		let outOfY: boolean = false;

		// 超过右侧临界值时
		if (content.offsetLeft > panel.clientWidth * marginality) {
			content.style.left = panel.clientWidth * marginality + 'px';
			outOfX = true;
		}
		// 超过左侧临界值时
		if (content.offsetLeft + content.offsetWidth < panel.clientWidth * (1 - marginality)) {
			content.style.left = (panel.clientWidth * (1 - marginality) - content.offsetWidth) + 'px';
			outOfX = true;
		}
		// 超过下侧临界值时
		if (content.offsetTop > panel.clientHeight * marginality) {
			content.style.top = panel.clientHeight * marginality + 'px';
			outOfY = true;
		}
		// 超过上侧临界值时
		if (content.offsetTop + content.offsetHeight < panel.clientHeight * (1 - marginality)) {
			content.style.top = (panel.clientHeight * (1 - marginality) - content.offsetHeight) + 'px';
			outOfY = true;
		}
		return {
			outOfX: outOfX,
			outOfY: outOfY
		};
	}

	private hitTest(target: HTMLElement, x: number, y: number): boolean {
		if (!target) {
			return false;
		}
		let targetBoundingRect = target.getBoundingClientRect();
		if (x >= targetBoundingRect.left &&
			x <= targetBoundingRect.left + targetBoundingRect.width &&
			y >= targetBoundingRect.top &&
			y <= targetBoundingRect.top + targetBoundingRect.height) {
			return true;
		}
		return false;
	}

	/**
     * 缩放
     * @param e 
     * @param zoom 缩放大小
     * @param isReset 是否重置内容位置，ture：内容将会恢复到居中位置
     */
	private zoomContent(e: React.WheelEvent<HTMLDivElement>, zoom?: number, isReset?: boolean) {
		let panel = this.rootPanel;
		let content = this.rootContent;
		if (!panel || !content) {
			return;
		}
		let x: number = (e === null ? (panel.clientWidth / 2) : e.clientX - panel.getBoundingClientRect().left);
		let y: number = (e === null ? (panel.clientHeight / 2) : e.clientY - panel.getBoundingClientRect().top);
		if (e && !this.hitTest(content, e.clientX, e.clientY)) {
			x = content.offsetLeft + content.clientWidth / 2;
			y = content.offsetTop + content.clientHeight / 2;
		}
		let currZoom: number = this.currentZoomSize;
		// 计算缩放比例
		let p = (e === null ? 0 : (-e.deltaY) / 1500);
		// 计算缩放后的值，缩放比例为10%
		currZoom = (e === null ? zoom : Math.ceil(currZoom * (1 + p)));
		if (e && Math.abs(currZoom - this.currentZoomSize) < 1) {
			if (p > 0) {
				currZoom += 1;
			} else {
				currZoom -= 1;
			}
		}
		currZoom = currZoom > this.props.maxZoom ? this.props.maxZoom : currZoom;
		currZoom = currZoom < this.props.minZoom ? this.props.minZoom : currZoom;
		let bgX = content.offsetLeft - (x - content.offsetLeft) * (currZoom / 100 - (this.currentZoomSize / 100)) / (this.currentZoomSize / 100);
		let bgY = content.offsetTop - (y - content.offsetTop) * (currZoom / 100 - (this.currentZoomSize / 100)) / (this.currentZoomSize / 100);
		content.style.width = (this.props.contentInitWidth * currZoom / 100) + 'px';
		content.style.height = (this.props.contentInitHeight * currZoom / 100) + 'px';
		// 恢复默认效果时将图片居中
		content.style.top = isReset ? (panel.clientHeight - content.offsetHeight) / 2 + 'px' : bgY + 'px';
		content.style.left = isReset ? (panel.clientWidth - content.offsetWidth) / 2 + 'px' : bgX + 'px';
		this.syncContentSize();
		// 设置缩放后比例
		this.currentZoomSize = currZoom;
		this.preventBeyondBoundary();
		this.fireOnZoomCallback();
	}

	/**
     * 同步内容大小
     */
	private syncContentSize(): void {
		let contentContainer = this.ContentContainer;
		let content = this.rootContent;
		if (!contentContainer || !content) {
			return;
		}
		contentContainer.style.width = content.style.width;
		contentContainer.style.height = content.style.height;
	}

	/**
	 * 修改位置
	 * @param {number} x
	 * @param {number} y
	 */
	private setContentPosition(x: number, y: number) {
		if (this.rootContent) {
			this.rootContent.style.left = x + 'px';
			this.rootContent.style.top = y + 'px';
		}
	}

	/**
	 * 拖动惯性
	 * @param {number} speedX
	 * @param {number} speedY
	 */
	private slidingContent(speedX: number, speedY: number) {
		let content = this.rootContent;
		if (!content) {
			return;
		}
		// 滑动因数
		let factor: number = .9;
		// console.log('speed', speedX, speedY);
		speedX = Math.max(-100, Math.min(speedX, 100));
		speedY = Math.max(-100, Math.min(speedY, 100));

		clearInterval(this.contentSlidingFunc);
		this.contentSlidingFunc = setInterval(() => {
			speedX *= factor;
			speedY *= factor;
			this.setContentPosition(content.offsetLeft + speedX, content.offsetTop + speedY);
			// 防止图片超出最大临界值
			let outOfBound = this.preventBeyondBoundary();
			if (Math.abs(speedX) < 1) {
				speedX = 0;
			}
			if (Math.abs(speedY) < 1) {
				speedY = 0;
			}
			if (outOfBound.outOfX) {
				speedX = 0;
			}
			if (outOfBound.outOfY) {
				speedY = 0;
			}
			if (speedX === 0 && speedY === 0) {
				clearInterval(this.contentSlidingFunc);
			}
			this.fireOnMoveCallback();
		}, 16);
	}

	private handleMouseWheel = (e: React.WheelEvent<HTMLDivElement>): void => {
		e.preventDefault();
		// console.log(e.deltaX, e.deltaY, e.deltaZ);
		this.zoomContent(e);
	}

	private handleContentMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
		e.preventDefault();
		let content = this.rootContent;
		// 当鼠标左键点击时触发
		if (e.button === 0) {
			this.mouseDownContentOffsetLeft = content.offsetLeft;
			this.mouseDownContentOffsetTop = content.offsetTop;
			this.mouseDownX = e.clientX;
			this.mouseDownY = e.clientY;
			console.log(this.mouseDownX, this.mouseDownY);
			window.addEventListener('mouseup', this.handleContentMouseUp, true);
			window.addEventListener('mousemove', this.handleContentMouseMove, true);
		}
	}
	private handleContentMouseMove = (e: MouseEvent): void => {
		e.preventDefault();
		let content = this.rootContent;
		// 当鼠标左键点击时触发
		if (e.button === 0) {
			let currX: number = e.clientX;
			let currY: number = e.clientY;
			// console.log(currX - this.mouseX, currY - this.mouseY);
			this.lastMouseMoveTime = (new Date()).getTime();
			// 设置图片随鼠标移动而移动
			this.setContentPosition((this.mouseDownContentOffsetLeft + currX - this.mouseDownX), (this.mouseDownContentOffsetTop + currY - this.mouseDownY));
			if (!Number.isNaN(this.lastMouseMoveX)) {
				this.mouseMoveSpeedX = content.offsetLeft - this.lastMouseMoveX;
				if (Math.abs(this.mouseMoveSpeedX) < 5) {
					this.mouseMoveSpeedX = 0;
				}
			}
			if (!Number.isNaN(this.lastMouseMoveY)) {
				this.mouseMoveSpeedY = content.offsetTop - this.lastMouseMoveY;
				if (Math.abs(this.mouseMoveSpeedY) < 5) {
					this.mouseMoveSpeedY = 0;
				}
			}
			this.lastMouseMoveX = content.offsetLeft;
			this.lastMouseMoveY = content.offsetTop;
			// console.log('移动的位置 ', this.lastX, this.lastY, currX, currY);
			// 防止超出最大临界值
			this.preventBeyondBoundary();
			this.fireOnMoveCallback();
		}
	}

	private handleContentMouseUp = (e: MouseEvent): void => {
		window.removeEventListener('mouseup', this.handleContentMouseUp, true);
		window.removeEventListener('mousemove', this.handleContentMouseMove, true);
		e.preventDefault();
		// 当鼠标左键点击时触发
		if (e.button === 0) {
			// 产生惯性
			let dateNow = (new Date()).getTime();
			if (this.lastMouseMoveTime > 0 && dateNow - this.lastMouseMoveTime < 100) {
				this.slidingContent(this.mouseMoveSpeedX, this.mouseMoveSpeedY);
			}
			this.lastMouseMoveTime = 0;
			this.mouseDownContentOffsetLeft = 0;
			this.mouseDownContentOffsetTop = 0;
			this.mouseDownX = 0;
			this.mouseDownY = 0;
			this.lastMouseMoveX = Number.NaN;
			this.lastMouseMoveY = Number.NaN;
			this.mouseMoveSpeedX = 0;
			this.mouseMoveSpeedY = 0;
		}
	}

	// tslint:disable-next-line:check-comment
	public render(): JSX.Element {
		let rootClassName = 'zoom-panel';
		if (this.props.className) {
			rootClassName += (' ' + this.props.className);
		}
		return (
			<div ref={root => this.rootPanel = root} className={rootClassName} onWheel={this.handleMouseWheel} style={{ overflow: 'hidden', position: 'relative' ,width:450,height:300}}>
				<div ref={root => this.rootContent = root} className='zoom-panel-content' style={{ position: 'absolute' }}
					onMouseDown={this.handleContentMouseDown}>
					<div ref={con => this.ContentContainer = con} style={{ position: 'relative',height:'100%',width:'100%' }}>
						{this.props.content}
					</div>
				</div>
				{this.props.children}
			</div>
		);
	}
}