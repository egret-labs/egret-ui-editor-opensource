/**
 * Launcher支持的应用ID
 *
 */
export enum AppId {
	Feather = 'EgretFeather',
	EUIEditor = 'EUIEditor',
	ResDepot = 'EgretResDepot',
	TextureMerger = 'TextureMerger',
	EgretCoder = 'EgretCoder'
}

export const EgretWebsite = 'https://egret.com';

/**
 * Launcher 操作产生的错误码
 */
export enum LauncherErrorCode {
	/**
	 * Launcher未安装
	 */
	NotFound,
	/**
	 * Launcher版本号过低
	 */
	VersionNotMatch
}

/**
 * Launcher 操作产生的错误
 */
export class LauncherError {
	constructor(
		private _code: LauncherErrorCode,
		private _message?: string,
		private _minVersion?: string) {
	}

	/**
	 * 错误码
	 */
	public get code(): LauncherErrorCode {
		return this._code;
	}

	/**
	 * 错误消息
	 */
	public get message(): string {
		return this._message;
	}

	/**
	 * Launcher必须大于此版本号
	 */
	public get minVersion(): string {
		return this._minVersion;
	}

	public toString(): string {
		return `Code: ${this._code}, message: ${this.message}`;
	}
}