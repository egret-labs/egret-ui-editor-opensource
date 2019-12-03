import { app } from 'electron';
import { ElectronMain } from './egret/code/electron-main/main';

import { IEnvironmentService, ParsedArgs } from 'egret/platform/environment/common/environment';
// import { validatePaths } from 'egret/code/node/paths';
import { parseArgs } from 'egret/platform/environment/node/argv';

app.on('ready', () => {

	let args: ParsedArgs;
	try {
		args = parseArgs(process.argv);
		// args = validatePaths(args);
	} catch (err) {
		console.error(err.message);
		app.exit(1);

		return;
	}

	const main = new ElectronMain(args);
});