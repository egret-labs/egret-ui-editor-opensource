/**
 * 判断是否是需要被忽略的exml文件
 * @param resource 
 */
export function isIgnore(filename: string): boolean {
	if(!filename){
		return true;
	}
	filename = filename.replace(/\\/g,'/');
	if (filename.indexOf('bin-debug/') === 0 || filename.indexOf('bin-release/') === 0) {
		return true;
	}
	if (filename.indexOf('node_modules/') != -1) {
		return true;
	}
	return false;
}
