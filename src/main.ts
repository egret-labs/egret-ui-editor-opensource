import { app } from 'electron';
import { ElectronMain } from './egret/code/electron-main/main';
import { parseArgs } from 'egret/platform/environment/node/argv';
import { ParsedArgs } from 'egret/platform/environment/common/args';

// macOS: 当拖拽文件到未运行的UI Editor dock图标时，open-file事件将会在ready事件之前触发。
// 此时记住拖拽的文件，以便应用启动完成打开
app.on('open-file', (event: Event, path: string) => {
	global['macOpenFile'] = path;
});

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