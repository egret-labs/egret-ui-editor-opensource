import { IComponent } from 'egret/exts/exml-exts/exml/common/project/exmlConfigs';


/**
 * 组件数据
 */
export class ComponentStat {
	/**
	 * 名称
	 */
	public name: string;
	/**
	 * 唯一id标识
	 */
	public id: string;
	/**
	 * 是否是文件夹
	 */
	public isFolder: boolean;
	/**
	 * 目标组件
	 */
	public target:IComponent;
	/**
	 * 文件的子节点列表
	 */
	public children: ComponentStat[] = [];
	/**
	 * 父级文件节点
	 */
	public parent: ComponentStat;
	/**
	 * 是否为自定义组件
	 */
	public isCustom: boolean;

}