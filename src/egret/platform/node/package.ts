

import * as path from 'path';
import * as fsextra from 'fs-extra';
import { app, remote } from 'electron';

export interface IPackageConfiguration {
	name: string;
	version: string;
}

const rootPath: string = app ? app.getAppPath() : remote.app.getAppPath();
const packageJsonPath = path.join(rootPath, 'package.json');
console.log(packageJsonPath);
const configuration = fsextra.readJsonSync(packageJsonPath) as IPackageConfiguration;

export default configuration;