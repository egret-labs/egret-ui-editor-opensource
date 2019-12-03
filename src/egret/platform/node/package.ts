

import * as path from 'path';
import * as fsextra from 'fs-extra';
import uri from 'egret/base/common/uri';

export interface IPackageConfiguration {
	name: string;
	version: string;
}
;
const configuration = fsextra.readJsonSync('./package.json') as IPackageConfiguration

export default configuration;