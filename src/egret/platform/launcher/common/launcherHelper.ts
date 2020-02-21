import { shell, remote } from 'electron';
import { LauncherErrorCode, EgretWebsite } from './launcherDefines';
import { localize } from 'egret/base/localization/nls';

/**
 * openExternal 打开一个连接
 * @param url
 */
export function openExternal(url: string): boolean {
	shell.openExternal(url);
	return true;
}

/**
 * onLauncherTask 处理 Launcher 情况的错误情况
 * @param promise Launcher 请求返回的 promise
 */
export function onLauncherTask<T>(promise: Promise<T>, opName?: string) {
	return promise.catch((error) => {
		let errorMsg: string = localize('engineInfo.innerError', 'Inner error');
		if (error) {
			switch (error.code) {
				case LauncherErrorCode.NotFound:
					errorMsg = localize('engineInfo.NotFound', 'Please install Egret Launcher');
					break;
				case LauncherErrorCode.VersionNotMatch:
					errorMsg = localize('engineInfo.VersionNotMatch', 'Version of Egret Launcher should not be lower than {0}', error.minVersion);
					break;
			}
		}
		opName = opName || localize('engineInfo.defaultOperation', 'Operation');
		remote.dialog.showMessageBox(
			remote.getCurrentWindow(),
			{
				type: 'error',
				message: localize('engineInfo.OperationFailed', '{0} failed: {1}', opName, errorMsg),
				buttons: [
					localize('alert.button.ok', 'Ok'),
					localize('engineInfo.ToEgretWebsite', 'Go to download at official website：{0}', EgretWebsite),
				],
			},
		).then((result) => {
			if (result.response === 1) {
				// 去官网
				openExternal(EgretWebsite);
			}
		});
	});
}