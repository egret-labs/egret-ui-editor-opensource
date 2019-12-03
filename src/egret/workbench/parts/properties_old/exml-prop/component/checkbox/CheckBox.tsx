//import {ReactNlsResource} from 'wing/src/common/reactNlsResource';
import './media/CheckBox.css';
import * as Types from 'vs/base/common/types';
import * as React from 'react';
import { ComponentMacros } from '../../common/ComponentMacros';

export interface CheckBoxProperty {
	/**
	 * @description index信息，会在onChange回调中作为参数传递，用来区分不同的checkBox
	 */
	Index?: string;
	/**
	 * @description 点击改变后的回调
	 */
	onChange?: Function;
	/**
	 * @description style样式对象
	 */
	style?: Object;
	/**
	 * @description 是否checked，可以通过控制该属性来控制checkBox的check状态
	 */
	checked?: boolean;
	/**
	 * @description 是否可响应用户交互
	 */
	disabled?: boolean;

}
export interface CheckBoxState {
}
/**
 * @description CheckBox控件
 */
export class CheckBox extends React.Component<CheckBoxProperty, CheckBoxState>{
	constructor(props) {
		super(props);

		this.state = {
		};

		this.index = this.props.Index ? this.props.Index : null;
		this.onChange = this.props.onChange ? this.props.onChange : null;
		this.style = this.props.style ? this.props.style : null;
		this.checked = this.props.checked;

		this.disabled = Types.isBoolean(this.props.disabled) ? this.props.disabled : false;


		this.handleChange = this.handleChange.bind(this);
	}

	componentWillReceiveProps(nextProps: CheckBoxProperty) {
		if (nextProps.Index !== this.props.Index) {
			this.index = nextProps.Index;
			this.setState(this.state);
		}
		if (nextProps.onChange !== this.props.onChange) {
			this.onChange = nextProps.onChange;
			this.setState(this.state);
		}
		if (nextProps.style !== this.props.style) {
			this.style = nextProps.style;
			this.setState(this.state);
		}

		this.checked = nextProps.checked;
		this.setState(this.state);

		let nextDisabled = Types.isBoolean(nextProps.disabled) ? nextProps.disabled : false;
		if (nextDisabled !== this.props.disabled) {
			this.disabled = nextDisabled;
			this.setState(this.state);
		}

	}

	static CHECK_BOX_CLASSNAME = 'reactCheckBox';

	private index: string;
	private onChange: Function;
	private style: Object;
	private checked: boolean;

	private disabled: boolean;


	handleChange(event) {
		if (event) {
			this.checked = event.target.checked;
			this.setState(this.state);
		}
		if (this.onChange) {
			if (this.index) {
				this.onChange(event.target.checked, this.index);
			}
			else {
				this.onChange(event.target.checked);
			}
		}
	}

	render() {
		return (
			<input
				style={this.style}
				className={CheckBox.CHECK_BOX_CLASSNAME}
				type={ComponentMacros.HTML_CHECK_BOX}
				checked={this.checked}
				onChange={this.handleChange}
				disabled={this.disabled}
				/>
		);
	}
}