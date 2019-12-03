import { startup } from '../main';
import { getStartConfig } from 'egret/platform/environment/common/args';


function main() {
	startup(getStartConfig()).then(() => {
	}, error => {
		if(error.stack){
			console.log(error.stack);
		}
	});
}
main();