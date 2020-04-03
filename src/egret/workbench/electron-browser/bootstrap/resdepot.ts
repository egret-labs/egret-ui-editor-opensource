import { ResdepotMain } from '../resdepotMain';
import { getStartConfig } from 'egret/platform/environment/common/args';


function main() {
	const main = new ResdepotMain();
	main.startup(getStartConfig()).then(() => {
	}, error => {
		if(error.stack){
			console.log(error.stack);
		}
	});
}
main();