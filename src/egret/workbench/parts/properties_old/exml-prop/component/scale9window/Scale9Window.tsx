import * as React from 'react';
import './media/Scale9Window.css';
import { ZoomPanel } from './zoomPanel';
import { localize } from 'egret/base/localization/nls';
import { PropertyResource } from '../../../electron-browser/react/resource/propertyResource';
import { IconButton } from '../iconbutton/IconButton';
import { CheckBox } from '../checkbox/CheckBox';


/**
 * 九宫格Prop参数
 * @export
 * @interface IScale9WindowProps
 */
interface IScale9WindowProps {
	// 图片资源
	imgResource?: string;
	// 切分x值
	x?: number;
	// 切分y值
	y?: number;
	// 切分width值
	width?: number;
	// 切分height值
	height?: number;
	// 是否显示分割线
	axisIsShow?: boolean;

	offsetX: number;

	offsetY: number;

	// 图片宽度
	imageWidth: number;

	// 图片高度
	imageHeight: number;
}

/**
 * 九宫格State属性
 * @export
 * @interface IScale9WindowStates
 */
interface IScale9WindowStates {
	// 舞台stage宽度
	stageWidth: number;
	// 舞台stage高度
	stageHeight: number;

	// 图片缩放倍率
	zoomSize: number;
	// 切分x值
	x: number | string;
	// 切分y值
	y: number | string;
	// 切分width值
	width: number | string;
	// 切分height值
	height: number | string;

	// 分割线显示状态，值由图片决定，需要在初始化中修改其值
	axisIsShow: boolean;

	// 图片宽度
	imageWidth: number;

	// 图片高度
	imageHeight: number;


	// 是否加载
	imageLoaded: boolean;

	offsetX: number;

	offsetY: number;
}

/**
 * 九宫格面板
 * @class Scale9Window
 * @extends {React.Component<IScale9WindowProps, IScale9WindowStates>}
 */
class Scale9Window extends React.Component<IScale9WindowProps, IScale9WindowStates> {
	/**
		* 9宫格分割线位置修正值。
		* 因为线条具有宽度，修正值=(宽度-1)/2
		*/
	private gridLineCorrectionSize: number = 1;
	// reset按钮是否将要置为100%
	private resetIs100: boolean = true;

	//      +                       +
	//      +                       +
	//      +                       +
	// +++++++++++++++++++++++++++++++++++ axisHorizontalLine1Value
	//      +                       +
	//      +                       +
	//      +                       +
	// axisVerticalLine1Value  axisVerticalLine2Value
	//      +                       +
	//      +                       +
	//      +                       +
	// +++++++++++++++++++++++++++++++++++ axisHorizontalLine2Value
	//      +                       +
	//      +                       +
	//      +                       +
	//
	// 以下值，存储或传递的均为原图像素位置
	// 水平切分线-1 位置
	private axisHorizontalLine1Value: number;
	// 水平切分线-2 位置
	private axisHorizontalLine2Value: number;
	// 垂直切分线-1 位置
	private axisVerticalLine1Value: number;
	// 垂直切分线-2 位置
	private axisVerticalLine2Value: number;
	// 引用部分
	private scale9Panel: ZoomPanel;
	private scale9Spirit: HTMLElement;
	private axisHorizontalLine1: HTMLElement;
	private axisHorizontalLine2: HTMLElement;
	private axisVerticalLine1: HTMLElement;
	private axisVerticalLine2: HTMLElement;

	constructor(props) {
		super(props);
		let gridInfo = this.getImageGrid();
		this.axisHorizontalLine1Value = !Number.isNaN(gridInfo.y) ? gridInfo.y : 0;
		this.axisHorizontalLine2Value = (!Number.isNaN(gridInfo.y) && !Number.isNaN(gridInfo.height)) ? (gridInfo.y + gridInfo.height) : 0;
		this.axisVerticalLine1Value = !Number.isNaN(gridInfo.x) ? gridInfo.x : 0;
		this.axisVerticalLine2Value = (!Number.isNaN(gridInfo.x) && !Number.isNaN(gridInfo.width)) ? (gridInfo.x + gridInfo.width) : 0;
		// 设置默认初值
		this.state = {
			offsetX: this.props.offsetX,
			offsetY: this.props.offsetY,
			stageHeight: 300,
			stageWidth: 450,
			zoomSize: 100,
			x: !Number.isNaN(gridInfo.x) ? gridInfo.x : 0,
			y: !Number.isNaN(gridInfo.y) ? gridInfo.y : 0,
			width: !Number.isNaN(gridInfo.width) ? gridInfo.width : 0,
			height: !Number.isNaN(gridInfo.height) ? gridInfo.height : 0,
			imageLoaded: false,
			imageHeight: 0,
			imageWidth: 0,
			axisIsShow: this.props.axisIsShow ? this.props.axisIsShow : false
		};
		// 修改bind绑定
		this.axisToggle = this.axisToggle.bind(this);
		this.handleClickResetBtn = this.handleClickResetBtn.bind(this);
	}

	public componentDidMount() {
		this.initialize();
	}

	public componentWillUnmount() {

	}


	/**
     * 获取资源中的九宫格数据
     */
	private getImageGrid(): {
		x: number;
		y: number;
		width: number
		height: number;
	} {
		// let rStat = this.props.imgResource;
		if (!this.props.axisIsShow) {
			return { x: Number.NaN, y: Number.NaN, height: Number.NaN, width: Number.NaN };
		}
		try {
			return {
				x: this.props.x ? this.props.x : 0,
				y: this.props.y ? this.props.y : 0,
				width: this.props.width ? this.props.width : 0,
				height: this.props.height ? this.props.height : 0,
			};
		} catch (error) {
			console.log(error);
		}
		return { x: Number.NaN, y: Number.NaN, height: Number.NaN, width: Number.NaN };
	}

	private div: HTMLDivElement;
	/**
	 * 初始化
	 * @memberof Scale9Window
	 */
	private initialize() {
		if (typeof this.state.offsetX !== 'undefined') {
			this.div = document.createElement('div');

			this.div.setAttribute('id', 'spirit');
			this.div.style.backgroundImage = `url(${this.props.imgResource})`;
			this.div.setAttribute('id', 'spirit');
			this.div.style.width = this.props.imageWidth + 'px';
			this.div.style.height = this.props.imageHeight + 'px';
			this.div.style.position = 'absolute';
			this.div.style.lineHeight = '0px';
			this.div.style.top = '0px';
			this.div.style.left = '0px';
			this.div.style['imageRendering'] = 'pixelated';
			this.div.style.backgroundPosition = `-${this.props.offsetX}px  -${this.props.offsetY}px`;
			this.div.style.transformOrigin = '0px 0px';
			this.div.style.backgroundRepeat = 'no-repeat';
			this.scale9Spirit.appendChild(this.div);

			// 存储默认图片宽高，用于计算缩放比例
			let imageWidth: number = this.props.imageWidth as any;
			let imageHeight: number = this.props.imageHeight as any;
			this.axisHorizontalLine1Value = this.state.axisIsShow ? this.axisHorizontalLine1Value : Math.round(imageHeight / 3);
			this.axisHorizontalLine2Value = this.state.axisIsShow ? this.axisHorizontalLine2Value : Math.round(imageHeight / 3 * 2);
			this.axisVerticalLine1Value = this.state.axisIsShow ? this.axisVerticalLine1Value : Math.round(imageWidth / 3);
			this.axisVerticalLine2Value = this.state.axisIsShow ? this.axisVerticalLine2Value : Math.round(imageWidth / 3 * 2);
			// 初始化分割线位置
			this.setState({
				imageLoaded: true,
				imageWidth: this.props.imageWidth,
				imageHeight: this.props.imageHeight
			}, () => {
				setTimeout(() => {
					this.scale9Panel.layout();
					this.setAllAxisPosition();

					// 计算分割线属性值
					this.setAxisParams();
					// 绑定移动分割线事件
					this.handleMoveAxis();
				}, 0);
			});

		}
		else {
			// 初始化图片样式
			let img = new Image();
			img.src = this.props.imgResource;
			img.setAttribute('id', 'spirit');
			img.style.width = '100%';
			img.style.height = '100%';
			img.style.position = 'absolute';
			img.style.lineHeight = '0px';
			img.style.top = '0px';
			img.style.left = '0px';
			img.onload = () => {
				// 将图片放置至主舞台
				this.scale9Spirit.appendChild(img);

				// 存储默认图片宽高，用于计算缩放比例
				let imageWidth = img.naturalWidth;
				let imageHeight = img.naturalHeight;
				this.axisHorizontalLine1Value = this.state.axisIsShow ? this.axisHorizontalLine1Value : Math.round(imageHeight / 3);
				this.axisHorizontalLine2Value = this.state.axisIsShow ? this.axisHorizontalLine2Value : Math.round(imageHeight / 3 * 2);
				this.axisVerticalLine1Value = this.state.axisIsShow ? this.axisVerticalLine1Value : Math.round(imageWidth / 3);
				this.axisVerticalLine2Value = this.state.axisIsShow ? this.axisVerticalLine2Value : Math.round(imageWidth / 3 * 2);
				// 初始化分割线位置
				this.setState({
					imageLoaded: true,
					imageWidth: imageWidth,
					imageHeight: imageHeight
				}, () => {
					this.scale9Panel.layout();
					this.setAllAxisPosition();
				});
				// 计算分割线属性值
				this.setAxisParams();
				// 绑定移动分割线事件
				this.handleMoveAxis();
			};
		}

	}

	/**
	 * 根据当前图片缩放值及位置，设置分割线位置
	 * @memberof Scale9Window
	 */
	private setAllAxisPosition() {
		if (!this.scale9Panel) {
			return;
		}
		let h1Top = Math.floor(this.scale9Panel.contentOffsetTop + this.axisHorizontalLine1Value * this.state.zoomSize / 100 - this.gridLineCorrectionSize);
		h1Top = Math.max(this.scale9Panel.contentOffsetTop - this.gridLineCorrectionSize, h1Top);
		h1Top = Math.min(h1Top, this.scale9Panel.contentOffsetTop + this.scale9Panel.contentOffsetHeight - this.gridLineCorrectionSize * 2);
		let h2Top = Math.floor(this.scale9Panel.contentOffsetTop + this.axisHorizontalLine2Value * this.state.zoomSize / 100 - this.gridLineCorrectionSize);
		h2Top = Math.max(this.scale9Panel.contentOffsetTop - this.gridLineCorrectionSize, h2Top);
		h2Top = Math.min(h2Top, this.scale9Panel.contentOffsetTop + this.scale9Panel.contentOffsetHeight - this.gridLineCorrectionSize * 2);
		let v1Left = Math.floor(this.scale9Panel.contentOffsetLeft + this.axisVerticalLine1Value * this.state.zoomSize / 100 - this.gridLineCorrectionSize);
		v1Left = Math.max(this.scale9Panel.contentOffsetLeft - this.gridLineCorrectionSize, v1Left);
		v1Left = Math.min(v1Left, this.scale9Panel.contentOffsetLeft + this.scale9Panel.contentOffsetWidth - this.gridLineCorrectionSize * 2);
		let v2Left = Math.floor(this.scale9Panel.contentOffsetLeft + this.axisVerticalLine2Value * this.state.zoomSize / 100 - this.gridLineCorrectionSize);
		v2Left = Math.max(this.scale9Panel.contentOffsetLeft - this.gridLineCorrectionSize, v2Left);
		v2Left = Math.min(v2Left, this.scale9Panel.contentOffsetLeft + this.scale9Panel.contentOffsetWidth - this.gridLineCorrectionSize * 2);
		this.axisHorizontalLine1.style.top = h1Top + 'px';
		this.axisHorizontalLine2.style.top = h2Top + 'px';
		this.axisVerticalLine1.style.left = v1Left + 'px';
		this.axisVerticalLine2.style.left = v2Left + 'px';
	}

	/**
	 * 设置分割线属性值
     * @param callback
	 * @memberof Scale9Window
	 */
	private setAxisParams(callback?: Function) {
		let x: number = 0;
		let y: number = 0;
		let width: number = 0;
		let height: number = 0;

		// x和y的值由距离上侧或左侧最近的分割线决定
		x = this.axisVerticalLine1Value <= this.axisVerticalLine2Value ? this.axisVerticalLine1Value : this.axisVerticalLine2Value;
		y = this.axisHorizontalLine1Value <= this.axisHorizontalLine2Value ? this.axisHorizontalLine1Value : this.axisHorizontalLine2Value;
		// width和height的值由每组分割线的绝对值决定
		width = Math.abs(this.axisVerticalLine1Value - this.axisVerticalLine2Value);
		height = Math.abs(this.axisHorizontalLine1Value - this.axisHorizontalLine2Value);
		this.setState({
			x: Math.round(x),
			y: Math.round(y),
			width: Math.round(width),
			height: Math.round(height)
		}, () => {
			if (callback) {
				callback.apply(this);
			}
		});
	}

	/**
	 * 绑定分割线移动事件
	 * @memberof Scale9Window
	 */
	private handleMoveAxis() {
		let mouseX: number = 0;
		let mouseY: number = 0;
		let lastH1Value: number = 0;
		let lastH2Value: number = 0;
		let lastV1Value: number = 0;
		let lastV2Value: number = 0;
		// 判断选中分割线是否被激活
		let isActive: boolean = false;
		// 激活的对象
		let activeObj: HTMLElement = null;

		// document 鼠标up事件
		let documentUp = (e: MouseEvent) => {
			e.preventDefault();
			if (e.button === 0) {
				mouseX = 0;
				mouseY = 0;
				lastH1Value = 0;
				lastH2Value = 0;
				lastV1Value = 0;
				lastV2Value = 0;
				if (isActive && activeObj.classList.contains('axis-active')) {
					activeObj.classList.remove('axis-active');
				}
				isActive = false;
				document.removeEventListener('mouseup', documentUp);
				document.removeEventListener('mousemove', documentMove);
			}
		};
		// document 鼠标move事件
		let documentMove = (e: MouseEvent) => {
			e.preventDefault();
			if (e.button === 0) {
				if (isActive) {
					let moveX = Math.round((e.clientX - mouseX) / this.state.zoomSize * 100);
					let moveY = Math.round((e.clientY - mouseY) / this.state.zoomSize * 100);
					let newValue: number = 0;
					if (activeObj === this.axisHorizontalLine1) {
						newValue = lastH1Value + moveY;
					} else if (activeObj === this.axisHorizontalLine2) {
						newValue = lastH2Value + moveY;
					} else if (activeObj === this.axisVerticalLine1) {
						newValue = lastV1Value + moveX;
					} else if (activeObj == this.axisVerticalLine2) {
						newValue = lastV2Value + moveX;
					}
					this.setAxisPosition(activeObj, newValue);
				}
			}
		};
		// 九宫格网格线 鼠标down事件
		let gridLineMouseDown = (e: MouseEvent) => {
			e.preventDefault();
			// 当鼠标左键点击时触发
			if (e.button === 0) {
				mouseX = e.clientX;
				mouseY = e.clientY;
				lastH1Value = this.axisHorizontalLine1Value;
				lastH2Value = this.axisHorizontalLine2Value;
				lastV1Value = this.axisVerticalLine1Value;
				lastV2Value = this.axisVerticalLine2Value;
				isActive = true;
				activeObj = e.target as HTMLElement;
				document.addEventListener('mouseup', documentUp);
				document.addEventListener('mousemove', documentMove);
			}
		};

		this.axisHorizontalLine1.addEventListener('mousedown', gridLineMouseDown);
		this.axisHorizontalLine2.addEventListener('mousedown', gridLineMouseDown);
		this.axisVerticalLine1.addEventListener('mousedown', gridLineMouseDown);
		this.axisVerticalLine2.addEventListener('mousedown', gridLineMouseDown);

	}

	/**
	 * 设置分割线位置
	 * @param {HTMLElement} obj
     * @param newValue 新的位置
	 * @memberof Scale9Window
	 */
	private setAxisPosition(obj: HTMLElement, newValue: number) {
		// 设置对应axis的值
		let axisValue: number = newValue;

		// 设置分割线激活样式
		obj.classList.add('axis-active');
		if (obj.classList.contains('axis-horizontal')) {
			// 防止超过图片边距
			axisValue = axisValue < 0 ? 0 : (axisValue > this.state.imageHeight ? this.state.imageHeight : axisValue);
			// 当该线为水平线时，只允许上下移动
			if (obj === this.axisHorizontalLine1) {
				// 当为第一条水平分割线时
				// 修改对应的值
				this.axisHorizontalLine1Value = axisValue;
				this.setAllAxisPosition();
			} else if (obj === this.axisHorizontalLine2) {
				// 修改对应的值
				this.axisHorizontalLine2Value = axisValue;
				this.setAllAxisPosition();
			}
		} else if (obj.classList.contains('axis-vertical')) {
			// 防止超过图片边距
			axisValue = axisValue < 0 ? 0 : (axisValue > this.state.imageWidth ? this.state.imageWidth : axisValue);
			// console.log('axisValue---', axisValue);

			// 当该线为垂直线时，只允许左右移动
			if (obj === this.axisVerticalLine1) {
				// 当为第一条垂直分割线时
				// 修改对应的值
				this.axisVerticalLine1Value = axisValue;
				this.setAllAxisPosition();
			} else if (obj === this.axisVerticalLine2) {
				// 当为第二条垂直分割线时
				// 修改对应的值
				this.axisVerticalLine2Value = axisValue;
				this.setAllAxisPosition();
			}
		}
		this.setAxisParams();
	}

	/**
	 * 用于切换分割线显示状态
	 * @returns
	 * @memberof Scale9Window
	 */
	private axisToggle() {
		this.setState({
			axisIsShow: !this.state.axisIsShow
		}, () => {
			this.scale9Panel.refreshInitZoomSize();
			if (this.state.axisIsShow) {
				this.scale9Panel.resetZoom();
				this.resetIs100 = true;
				this.setAxisParams();
			} else {

			}
		});
	}

	/**
	 * 绑定重置按钮事件
	 * @memberof Scale9Window
	 */
	private handleClickResetBtn() {
		if (this.resetIs100) {
			this.scale9Panel.zoom(100, true);
		} else {
			this.scale9Panel.resetZoom();
		}
		this.resetIs100 = !this.resetIs100;
	}

	private handleRoomOut = (e): void => {
		if (this.scale9Panel) {
			this.scale9Panel.zoom(this.state.zoomSize * 2);
		}
	}

	private handleRoomIn = (e): void => {
		if (this.scale9Panel) {
			this.scale9Panel.zoom(this.state.zoomSize / 2);
		}
	}

	private handleZoom = (target: ZoomPanel, zoomSize: number): void => {
		if (typeof this.state.offsetX !== 'undefined') {
			this.div.style.transform = `scale(${zoomSize / 100})`;
		}
		this.setState({
			zoomSize: Math.floor(zoomSize*100)/100
		}, () => {
			this.setAllAxisPosition();
		});

	}

	private handleMove = (target: ZoomPanel): void => {
		this.setAllAxisPosition();
	}

	render() {
		let imgContent = <div ref={(scale9Spirit) => { this.scale9Spirit = scale9Spirit; }} style={{ width: '100%', height: '100%' }}></div>;
		return (
			<div
				className='container'
			>
				<p className='prompt-title'>
					{localize('scale9Window.render.description','Mouse Wheel:Scale | Drag:Move | Dotted Line: Edito Scale9Grid')}
				</p>
				<div className='operator-items'>
					<span>
						<CheckBox
							Index='isOpenScale9'
							onChange={this.axisToggle}
							checked={this.state.axisIsShow}
							style={{marginRight:'6px'}}
						/>
						{localize('scale9Window.render.startScale','Enable')}
					</span>
					<span>
						{this.state.zoomSize}%
					</span>
					<span>
						<IconButton
							iconClass={PropertyResource.ZOOM_UP}
							tooltip={localize('scale9Window.render.zoomUp','Zoom In')}
							onClick={this.handleRoomOut}
						/>
						<IconButton
							iconClass={PropertyResource.ZOOM_DOWN}
							tooltip={localize('scale9Window.render.zoomDown','Zoom Out')}
							onClick={this.handleRoomIn}
						/>
						<IconButton
							iconClass={PropertyResource.VIEW_MIN}
							tooltip={localize('alert.button.reset','Reset')}
							onClick={this.handleClickResetBtn}
						/>
					</span>
				</div>
				<ZoomPanel className='scale9-panel'
					ref={(scale9Panel) => { this.scale9Panel = scale9Panel; }}
					contentInitHeight={this.state.imageHeight}
					contentInitWidth={this.state.imageWidth}
					content={imgContent}
					onZoom={this.handleZoom}
					onMove={this.handleMove}>
					<div style={{ display: this.state.imageLoaded && this.state.axisIsShow ? 'block' : 'none' }}>
						<div className='axis-horizontal' ref={(axisHorizontal1) => { this.axisHorizontalLine1 = axisHorizontal1; }}>
							<div className='axis-horizontal-line' style={{ pointerEvents: 'none' }}></div>
						</div>
						<div className='axis-horizontal' ref={(axisHorizontal2) => { this.axisHorizontalLine2 = axisHorizontal2; }}>
							<div className='axis-horizontal-line' style={{ pointerEvents: 'none' }}></div>
						</div>
						<div className='axis-vertical' ref={(axisVertical1) => { this.axisVerticalLine1 = axisVertical1; }}>
							<div className='axis-vertical-line' style={{ pointerEvents: 'none' }}></div>
						</div>
						<div className='axis-vertical' ref={(axisVertical2) => { this.axisVerticalLine2 = axisVertical2; }}>
							<div className='axis-vertical-line' style={{ pointerEvents: 'none' }}></div>
						</div>
					</div>
				</ZoomPanel>
				<div className='image-params'>
					<span>x:{this.state.x}</span>
					<span>y:{this.state.y}</span>
					<span>width:{this.state.width}</span>
					<span>height:{this.state.height}</span>
				</div>
			</div>
		);
	}
}

export { Scale9Window };