import { Component } from 'react';
import { InstantiationService } from '../../instantiation/common/instantiationService';

/**
 * 具有实例化服务的React组件的Prop
 */
export interface InstantiationProps {
	/**
	 * 参数
	 */
	args?: any[];
	/**
	 * 实例化服务
	 */
	instantiationService?: InstantiationService;
}

/**
 * 具有实例化服务的React组件扩展接口
 */
export interface IComponentEX<P = InstantiationProps, S = {}> {
	/**
	 * 启动组件
	 * @param args 
	 */
	startup(...args): void;
}

/**
 * 具有实例化服务的React组件
 */
export abstract class ComponentEX extends Component<InstantiationProps, any> implements IComponentEX {
	constructor(props?: InstantiationProps, context?: any) {
		super(props, context);
		const instantiationService = this.props.instantiationService;
		if (instantiationService) {
			const args = this.props.args ? this.props.args : [];
			instantiationService.invokeServiceDependenciesFunc(this.startup, this, args);
		}
	}
	/**
	 * 启动抽象方法，继承自此类开发的React组件，必须实现该方法
	 * @param args 
	 */
	public abstract startup(...args): void;
	/**
	 * 尺寸改变
	 * @param width 
	 * @param height 
	 */
	public abstract doResize(width: number, height: any):void;
}