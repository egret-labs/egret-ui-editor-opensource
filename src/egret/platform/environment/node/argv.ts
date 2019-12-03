
import * as os from 'os';
import * as minimist from 'minimist';
import * as assert from 'assert';
import { firstIndex } from 'egret/base/common/arrays';
import { ParsedArgs } from '../common/environment';
import { isWindows } from 'egret/base/common/platform';
import product from 'egret/platform/node/product';

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
