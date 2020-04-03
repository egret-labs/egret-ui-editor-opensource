import * as path from 'path';
import * as os from 'os';
import configuration from './package';

export function getAppDataPath(platform: string): string {
	switch (platform) {
		case 'win32': return process.env['APPDATA'] || path.join(process.env['USERPROFILE']!, 'AppData', 'Roaming');
		case 'darwin': return path.join(os.homedir(), 'Library', 'Application Support');
		case 'linux': return process.env['XDG_CONFIG_HOME'] || path.join(os.homedir(), '.config');
		default: throw new Error('Platform not supported');
	}
}

/**
 * Get user foler path.
 * @example1 `Windows` %USERPROFILE%\ -> C:\Users\username
 * @example1 `macOS` ~/ -> /Users/username
 * @example1 `Linux` ~/ -> /Users/username
 * @param platform 
 */
export function getUserPath(platform: string): string{
	switch (platform) {
		case 'win32': return process.env['USERPROFILE']!;
		case 'darwin': return os.homedir();
		case 'linux': return os.homedir();
		default: throw new Error('Platform not supported');
	}
}

export function getDefaultUserDataPath(platform: string) {
	return path.join(getAppDataPath(platform), configuration.name);
}