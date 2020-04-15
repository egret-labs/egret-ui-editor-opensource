
import * as minimist from 'minimist';
import { ParsedArgs } from '../common/args';

const options: minimist.Opts = {
	string: [
		'locale',
		'user-data-dir',
	],
	boolean: [
	],
	alias: {
	}
};
/**
 * 利用此方法解析命令行参数，例如`--verbose --wait`
 */
export function parseArgs(args: string[]): ParsedArgs {
	return minimist(args, options) as ParsedArgs;
}
