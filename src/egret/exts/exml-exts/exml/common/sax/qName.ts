/**
 * QName 对象表示 XML 元素和属性的限定名。
 */
export class QName {
	private _localName: string;
	private _uri: any;
	constructor(uri: any, localName: string) {
		this._localName = localName;
		this._uri = uri;
	}
	/**
     * QName 对象的局部名称。
     */
	public get localName(): string {
		return this._localName;
	}

	/**
     * QName 对象的统一资源标识符 (URI)。
     */
	public get uri(): any {
		return this._uri;
	}
}