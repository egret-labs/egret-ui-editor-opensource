//import {ReactNlsResource} from 'wing/src/common/reactNlsResource';
import './media/IconButton.css';
import {ComponentClassNameArray} from '../../common/ComponentClassNameArray';
import * as Types from 'vs/base/common/types';
import * as React from 'react';

/**
 * 接口
 */
export interface IconButtonProp{
	/**
	 * @description 决定了具体显示什么图标，新的iconClass可以在PropertyResource文件中注册
	 */
	iconClass:string;
	/**
	 * @description 样式对象
	 */
	style?:Object;
	/**
	 * @description 作为单纯按钮时,按下的回调
	 */
	func?:Function;
	/**
	 * @description 是否为toggleButton+
	 */
	isToggleButton?:boolean;
	/**
	 * @description 如果是Toggle Button时,toggle状态改变时的回调事件
	 */
	valueCallBackFunc?:Function;
	/**
	 * @description 是否是button group的item
	 */
	isGroupItem?:boolean;
	/**
	 * @description 作为group的item时的value
	 */
	itemValue?:boolean;
	/**
	 * @description 作为group的item时的回调
	 */
	onClick?:Function;
	/**
	 * @description toggleDown状态
	 */
	toggleDown?:boolean;
	/**
	 * @description tooltip提示信息
	 */
	tooltip?:string;
	/**
	 * @description 是否为仅作显示用的图标
	 */
	bJustIcon?:boolean;
}

/**
 * 接口 IconButtonState
 */
export interface IconButtonState{
	/**
	 * @description 记录是否按下的状态变量
	 */
	down:boolean;

	/**
	 * 按下
	 */
	everClickDown:boolean;
}

export const ICON_BUTTON_CLASSNAME = 'icon-button';
export const ICON_DOWN_CLASSNAME = 'down';

/**
 *
 * IconButton组件，可以是单纯的图标按钮，也可以是类似于checkBox的具备两种状态的toggleButton,也可以作为iconButtonGroup的一个子元素，设计不太合理，集成了太多种对象的抽象
 */
export class IconButton extends React.Component<IconButtonProp, IconButtonState>{
	constructor(props) {
		super(props);

		this.state = {
			down: false,
			everClickDown: false
		};

		this.iconClass = this.props.iconClass ? this.props.iconClass : '';
		this.style = this.props.style ? this.props.style : {};
		this.func = this.props.func ? this.props.func : null;
		this.valueCallBackFunc = this.props.valueCallBackFunc ? this.props.valueCallBackFunc : null;
		this.isToggleButton = Types.isBoolean(this.props.isToggleButton) ? this.props.isToggleButton : false;
		this.isGroupItem = Types.isBoolean(this.props.isGroupItem) ? this.props.isGroupItem : false;
		this.itemValue = Types.isBoolean(this.props.itemValue) ? this.props.itemValue : false;
		this.onClick = this.props.onClick ? this.props.onClick : null;
		this.toggleDown = Types.isBoolean(this.props.toggleDown) ? this.props.toggleDown : false;
		this.tooltip = this.props.tooltip ? this.props.tooltip : '';

		this.iconButtonClassNameArray = new ComponentClassNameArray();

		this.iconButtonClassNameArray.addClassName(ICON_BUTTON_CLASSNAME);
		//this.iconButtonClassNameArray.addClassName(this.state.iconClass);
		this.iconButtonClassNameArray.addClassName(ICON_DOWN_CLASSNAME);
		this.iconButtonClassNameArray.addClassName(IconButton.JUST_ICON_CLASSNAME,false);

		this.handleMouseDown = this.handleMouseDown.bind(this);
		this.handleMouseUp = this.handleMouseUp.bind(this);
		//this.onKeyDown = this.onKeyDown.bind(this);
	}

	private iconClass:string;
	private style: Object;
	private func: Function;
	private valueCallBackFunc: Function;
	private isToggleButton: boolean;
	private isGroupItem: boolean;
	private itemValue: boolean;
	private onClick: Function;
	private toggleDown: boolean;
	private tooltip: string;

	private iconRef:HTMLDivElement;

	static JUST_ICON_CLASSNAME:string = 'just-icon';

	componentWillReceiveProps(nextProps:IconButtonProp){
		if (nextProps.iconClass !== this.iconClass) {
			this.iconClass = nextProps.iconClass;
			this.setState(this.state);
		}
		if (nextProps.style !== this.style) {
			this.style = nextProps.style;
			this.setState(this.state);
		}
		if (nextProps.func !== this.func) {
			this.func = nextProps.func;
			this.setState(this.state);
		}
		if (nextProps.valueCallBackFunc !== this.valueCallBackFunc) {
			this.valueCallBackFunc = nextProps.valueCallBackFunc;
			this.setState(this.state);
		}
		if (nextProps.isToggleButton !== this.isToggleButton) {
			this.isToggleButton = nextProps.isToggleButton;
			this.setState(this.state);
		}
		if (nextProps.isGroupItem !== this.isGroupItem) {
			this.isGroupItem = nextProps.isGroupItem;
			this.setState(this.state);
		}
		if (nextProps.itemValue !== this.itemValue) {
			this.itemValue = nextProps.itemValue;
			this.setState(this.state);
		}
		if (nextProps.onClick !== this.onClick) {
			this.onClick = nextProps.onClick;
			this.setState(this.state);
		}
		if (nextProps.toggleDown !== this.toggleDown) {
			this.toggleDown = nextProps.toggleDown;
			this.setState(this.state);
		}
		if (nextProps.tooltip !== this.tooltip) {
			this.tooltip = nextProps.tooltip;
			this.setState(this.state);
		}

		if(nextProps.isGroupItem){
			if(this.props.itemValue !== nextProps.itemValue){
				this.setState({down:nextProps.itemValue});
			}
		}
		else if (nextProps.isToggleButton){
			if(nextProps.toggleDown!== undefined){
				this.setState({down:nextProps.toggleDown});
			}
		}
	}

	handleMouseDown(event){
		document.addEventListener('mouseup', this.handleMouseUp, false);
		if (this.isGroupItem) {
		}
		else {
			if (this.isToggleButton) {
				// this.state.everClickDown = true;
				// this.state.down = !this.state.down;
				this.setState({down:!this.state.down,everClickDown:true});
			}
			else {
				// this.state.down = true;
				this.setState({down:true});

			}
			// this.setState(this.state);
		}
	}

	handleMouseUp(event) {
		document.removeEventListener('mouseup', this.handleMouseUp, false);
		if (this.isGroupItem) {

		}
		else {
			if (!this.isToggleButton) {
				if (this.state.down) {
					// this.state.down = false;
					this.setState({down:false});
					if (this.func) {
						this.func();
					}
				}
			}
			else {
				if (this.state.everClickDown) {
					// this.state.everClickDown = false;
					if (this.valueCallBackFunc) {
						this.valueCallBackFunc(this.state.down);
					}
					this.setState({everClickDown:false});
				}
			}
		}
	}

	updateClassName(){
		if (this.props.bJustIcon!==undefined && this.props.bJustIcon){
			this.iconButtonClassNameArray.deactiveClassName(ICON_DOWN_CLASSNAME);
			this.iconButtonClassNameArray.activeClassName(IconButton.JUST_ICON_CLASSNAME);
			return this.iconClass+' '+this.iconButtonClassNameArray.buildClassName();
		}
		if (this.state.down){
			this.iconButtonClassNameArray.activeClassName(ICON_DOWN_CLASSNAME);
		}
		else{
			this.iconButtonClassNameArray.deactiveClassName(ICON_DOWN_CLASSNAME);
		}
		return this.iconClass+' '+this.iconButtonClassNameArray.buildClassName();
	}

	render() {
		return (
			<div
			title={this.tooltip}
			ref={(ref)=>{this.iconRef = ref;}}
			onMouseDown={this.handleMouseDown}
			className={this.updateClassName()}
			style={this.style}
			onClick={(e)=>
				{
					if(this.onClick){
						this.onClick();
					}
				}}>
			</div>);
	}

	private iconButtonClassNameArray: ComponentClassNameArray;
}