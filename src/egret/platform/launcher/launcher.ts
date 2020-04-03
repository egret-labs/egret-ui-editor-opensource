import { PromptWindow } from './browser/promptWindow';
import Launcher from './common/launcher';
import { AppId } from './common/launcherDefines';
import { onLauncherTask } from './common/launcherHelper';
import { localize } from 'egret/base/localization/nls';

/**
 * 确保已登录
 */
export async function ensureLogin(): Promise<boolean>{
	// const prompt:PromptWindow = new PromptWindow();
	// prompt.open('root',true);

	// let ok: boolean = false;
	// await onLauncherTask(Launcher.loginAsync(AppId.EUIEditor).then((username)=>{
	// 		prompt.close();
	// 		ok = true;
	// }), localize('engineInfo.login', 'Login'));

	// return ok;
	return Promise.resolve(true);
}