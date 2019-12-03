import childProcess = require('child_process');

/**
 * 执行命令
 * @param command 要被执行的命令
 */
export function exec(command: string): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		childProcess.exec(command, (error, stdout, stderr) => {
			if (error) {
				reject(error);
			} else if (stderr) {
				reject(stderr);
			} else {
				resolve(stdout);
			}
		});
	});
}
