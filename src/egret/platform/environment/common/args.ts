
/**
 * 命令行参数
 */
export interface ParsedArgs {
	_: string[];
	folder?: string | string[];
	status?: boolean;
}

function parseURLQueryArgs():any {
	const search = window.location.search || '';
	return search.split(/[?&]/)
		.filter(function (param) { return !!param; })
		.map(function (param) { return param.split('='); })
		.filter(function (param) { return param.length === 2; })
		.reduce(function (r, param) { r[param[0]] = decodeURIComponent(param[1]); return r; }, {});
}
/**
 * 得到启动参数
 */
export function getStartConfig():any{
	const args = parseURLQueryArgs();
	const configuration = JSON.parse(args['config'] || '{}') || {};
	return configuration;
}
