/**
 * QName 对象表示 XML 元素和属性的限定名。
 */
export class Namespace {
	private _uri: string;
	private _prefix: any;

	constructor(prefix?: any, uri?: string) {
		this._prefix = prefix;
		this._uri = uri;
	}
	/**
	 * 命名空间的URI
	 */
	public get uri(): string {
		return this._uri;
	}
	/**
	 * 命名空间的前缀
	 */
	public get prefix(): any {
		return this._prefix;
	}
}