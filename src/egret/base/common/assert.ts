'use strict';
/**
 * 断言
 * @param value 断言的值
 * @param message 断言的消息
 */
export function ok(value?: any, message?: string) {
	if (!value || value === null) {
		throw new Error(message ? 'Assertion failed (' + message + ')' : 'Assertion Failed');
	}
}
