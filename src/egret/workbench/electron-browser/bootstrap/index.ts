import { Main } from '../main';
import { getStartConfig } from 'egret/platform/environment/common/args';


function main() {
	const main = new Main();
	main.startup(getStartConfig()).then(() => {
	}, error => {
		if(error.stack){
			console.log(error.stack);
		}
	});
}
main();