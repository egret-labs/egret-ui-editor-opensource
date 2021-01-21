import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import { isLinux } from 'egret/base/common/platform';
import { isString } from 'egret/base/common/types';
import { parseArgs } from 'egret/platform/environment/node/argv';
import { ParsedArgs } from 'egret/platform/environment/common/args';

function addArg(argv: string[], ...args: string[]): string[] {
	const endOfArgsMarkerIndex = argv.indexOf('--');
	if (endOfArgsMarkerIndex === -1) {
		argv.push(...args);
	} else {
		// if the we have an argument "--" (end of argument marker)
		// we cannot add arguments at the end. rather, we add
		// arguments before the "--" marker.
		argv.splice(endOfArgsMarkerIndex, 0, ...args);
	}

	return argv;
}

export async function main(argv: string[]): Promise<any> {
	let args: ParsedArgs;

	try {
		args = parseArgs(argv);
	} catch (err) {
		console.error(err.message);
		return;
	}

		const env: NodeJS.ProcessEnv = {
			...process.env,
			'ELECTRON_NO_ATTACH_CONSOLE': '1'
		};

		delete env['ELECTRON_RUN_AS_NODE'];

		const processCallbacks: ((child: ChildProcess) => Promise<void>)[] = [];

		const verbose = args.status;
		if (verbose) {
			env['ELECTRON_ENABLE_LOGGING'] = '1';

			processCallbacks.push(async child => {
				child.stdout!.on('data', (data: Buffer) => console.log(data.toString('utf8').trim()));
				child.stderr!.on('data', (data: Buffer) => console.log(data.toString('utf8').trim()));

				await new Promise(c => child.once('exit', () => c(void 0)));
			});
		}

		const hasReadStdinArg = args._.some(a => a === '-');
		if (hasReadStdinArg) {
			// remove the "-" argument when we read from stdin
			args._ = args._.filter(a => a !== '-');
			argv = argv.filter(a => a !== '-');
		}

		const jsFlags = args['js-flags'];
		if (isString(jsFlags)) {
			const match = /max_old_space_size=(\d+)/g.exec(jsFlags);
			if (match && !args['max-memory']) {
				addArg(argv, `--max-memory=${match[1]}`);
			}
		}

		const options: SpawnOptions = {
			detached: true,
			env
		};

		if (!verbose) {
			options['stdio'] = 'ignore';
		}

		if (isLinux) {
			addArg(argv, '--no-sandbox'); // Electron 6 introduces a chrome-sandbox that requires root to run. This can fail. Disable sandbox via --no-sandbox
		}

		const child = spawn(process.execPath, argv.slice(2), options);

		return Promise.all(processCallbacks.map(callback => callback(child)));
}

function eventuallyExit(code: number): void {
	setTimeout(() => process.exit(code), 0);
}

main(process.argv)
	.then(() => eventuallyExit(0))
	.then(null, err => {
		console.error(err.message || err.stack || err);
		eventuallyExit(1);
	});
