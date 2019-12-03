import { SheetSubVO } from './SheetSubVO';

/**
 * 资源数据包
 */
export class ResInfoVO {

	private _name: string = '';
	/**资源类型 从ResType中取值*/
	public type: string = '';
	public _url: string = '';
	/**真实资源路径*/
	public get url(): string {
		return this._url;
	}
	public set url(value: string) {
		this._url = value;
	}
	/**
	 * 本地路径，该路径是去除了路径参数的，只用于做加载用，并不参与resource.json的处理
	 */
	public get locolUrl(): string {
		const index: number = this.url.indexOf('?');
		if (index !== -1) {
			return this.url.slice(0, index);
		}
		return this.url;
	}

	private _showUrl: string = '';

	//是否已经创建
	public isCreated: boolean = false;
	private _isSameName: boolean = false;
	/**其他项错误*/
	public otherError: boolean = false;
	/**
	 * 九宫格或者声音类型
	 */
	public other: string = '';


	//ID 资源
	public id: number = 0;
	/**九宫格基本数据*/
	public x: number = 0;

	//九宫y
	public y: number = 0;
	//九宫w
	public w: number = 0;
	//九宫h
	public h: number = 0;
	/**文件错误，不存在、文件内容解析失败（暂时也放这里）*/
	public fileError: boolean = false;
	// /**文件错误，文件内容解析失败*/
	// public fileContentError: boolean = false;
	/**并不是每一项都有这个，只有sheet类型有这个东西。*/
	public subList: Array<SheetSubVO>;

	public constructor() {
	}

	/**
	 * 资源名字
	 */
	public get name(): string {
		return this._name;
	}

	public set name(value: string) {
		this._name = value;
	}

	/**
	 * 是否有重名
	 */
	public get isSameName(): boolean {
		return this._isSameName;
	}
	/**是否有重名*/
	public set isSameName(value: boolean) {
		this._isSameName = value;
	}

	/**
	 * 获取URL
	 */
	public get showUrl(): string {
		return this._showUrl;
	}

	public set showUrl(value: string) {
		this._showUrl = value;
	}
	/**
	 * 二级是否错误
	 * @return
	 *
	 */
	public get subError(): boolean {
		if (this.subList) {
			for (let i: number = 0; i < this.subList.length; i++) {
				if (this.subList[i].isSameName === true) {
					return true;
				}
			}
		}
		return false;
	}

	public toString(): string {
		return '[name:' + this.name + ', id:' + this.id + ', type:' + this.type + ', url:' + this.url + ', showUrl:' + this.showUrl + ']';
	}
	//////////以下部分仅为渲染列表的时候使用，不是真正的数据，是为了渲染性能而写的////
	public inCurrentGroup: boolean = false;
}