import { app } from 'electron';
import { ElectronMain } from './egret/code/electron-main/main';
import { parseArgs } from 'egret/platform/environment/node/argv';
import { ParsedArgs } from 'egret/platform/environment/common/args';

app.on('ready', () => {
	// https://github.com/electron/electron/issues/18214
	app.commandLine.appendSwitch('disable-site-isolation-trials');

	let args: ParsedArgs;
	try {
		args = parseArgs(process.argv);
		// args = validatePaths(args);
	} catch (err) {
		console.error(err.message);
		app.exit(1);

		return;
	}

	const main = new ElectronMain();
	main.startup(args);
});