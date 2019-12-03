import URI from 'egret/base/common/uri';
import { IMatch } from 'egret/base/common/filters';


/**
 * exml项的数据层
 */
export class ExmlFileStat{
	/**
	 * 文件名
	 */
	public fileName:string;
	/**
	 * 文件名高亮
	 */
	public fileName_highlights:IMatch[] = [];
	/**
	 * 类名
	 */
	public className:string;
	/**
	 * 类名高亮
	 */
	public className_highlights:IMatch[] = [];
	/**
	 * 文件资源
	 */
	public resource:URI;
	/**
	 * 文件路径
	 */
	public path:string = '';
	/**
	 * 文件路径高亮
	 */
	public path_highlights:IMatch[] = [];
	/**
	 * 父级节点
	 */
	public parent:ExmlFileStat;
	/**
	 * 子节点
	 */
	public children:ExmlFileStat[] = [];

	/**
	 * 文件数据的id
	 */
	public getId(): string {
		if(this.resource){
			return this.resource.toString();
		}
		return '';
	}
}