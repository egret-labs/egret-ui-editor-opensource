import URI from 'egret/base/common/uri';
import * as paths from 'path';
import { localize } from '../../../base/localization/nls';

const MAX_CONFIRM_FILES = 10;
/**
 * 得到确认信息
 * @param start 
 * @param resourcesToConfirm 
 */
export function getConfirmMessage(start: string, resourcesToConfirm: URI[]): string {
	const message = [start];
	message.push('');
	message.push(...resourcesToConfirm.slice(0, MAX_CONFIRM_FILES).map(r => paths.basename(r.fsPath)));

	if (resourcesToConfirm.length > MAX_CONFIRM_FILES) {
		if (resourcesToConfirm.length - MAX_CONFIRM_FILES === 1) {
			message.push(localize('getConfirmMessage.hiddenOne','...hidden display of 1 file'));
		} else {
			message.push(localize('getConfirmMessage.hiddenSome','...hidden display of {0} files',(resourcesToConfirm.length - MAX_CONFIRM_FILES)));
		}
	}

	message.push('');
	return message.join('\n');
}