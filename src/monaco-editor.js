// import 'monaco-editor/esm/vs/editor/editor.main.js';
import 'monaco-editor/esm/vs/editor/edcore.main';
import { MenuRegistry } from 'monaco-editor/esm/vs/platform/actions/common/actions';

// (2) Desired languages:
// import 'monaco-editor/esm/vs/language/typescript/monaco.contribution';
// import 'monaco-editor/esm/vs/language/css/monaco.contribution';
import 'monaco-editor/esm/vs/language/json/monaco.contribution';
// import 'monaco-editor/esm/vs/language/html/monaco.contribution';
// import 'monaco-editor/esm/vs/basic-languages/bat/bat.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/coffee/coffee.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/csharp/csharp.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/csp/csp.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/css/css.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/dockerfile/dockerfile.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/fsharp/fsharp.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/go/go.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/handlebars/handlebars.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/html/html.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/ini/ini.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/java/java.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/less/less.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/lua/lua.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/msdax/msdax.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/mysql/mysql.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/objective-c/objective-c.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/pgsql/pgsql.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/php/php.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/postiats/postiats.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/powershell/powershell.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/pug/pug.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/python/python.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/r/r.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/razor/razor.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/redis/redis.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/redshift/redshift.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/ruby/ruby.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/sb/sb.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/scss/scss.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/solidity/solidity.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/sql/sql.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/swift/swift.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/vb/vb.contribution.js';
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution.js';
// import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution.js';

import { remote } from 'electron';

const nls_zh = {
	ChangeAllOccurrences: '修改所有出现的单词',
	formatDocument: '格式化文档',
	formatSelection: '格式化选定代码',
	Cut: '剪切',
	Copy: '复制',
	Paste: '粘贴'
};
const iszh = remote.app.getLocale().startsWith('zh');

MenuRegistry.getMenuItems = function (id) {
	var result = (this._menuItems.get(id) || []).slice(0);
	if (id === 0 /* CommandPalette */ ) {
		// CommandPalette is special because it shows
		// all commands by default
		this._appendImplicitItems(result);
	}
	for (let i = 0; i < result.length; i++) {
		const item = result[i];
		if(!item.command){
			continue;
		}
		// 从右键菜单中移除 Command Palette 和 Go to Symbol...
		// https://github.com/Microsoft/monaco-editor/issues/1237
		if (item.command.id === 'editor.action.quickCommand' ||
			item.command.id === 'editor.action.quickOutline') {
			result.splice(i, 1);
			i--;
		}
		if (iszh) {
			switch (item.command.id) {
				case 'editor.action.clipboardCutAction':
					item.command.title = nls_zh.Cut;
					break;
				case 'editor.action.clipboardCopyAction':
					item.command.title = nls_zh.Copy;
					break;
				case 'editor.action.clipboardPasteAction':
					item.command.title = nls_zh.Paste;
					break;
				case 'editor.action.changeAll':
					item.command.title = nls_zh.ChangeAllOccurrences;
					break;
				case 'editor.action.formatDocument':
					item.command.title = nls_zh.formatDocument;
					break;
				case 'editor.action.formatSelection':
					item.command.title = nls_zh.formatSelection;
					break;
				default:
					break;
			}
			}
	}
	return result;
};

self.MonacoEnvironment = {
	getWorkerUrl: function (moduleId, label) {
		// console.log('getWorkerUrl', moduleId, label);
		if (label === 'json') {
			return './monaco-editor/json.worker.js';
		}
		return './monaco-editor/editor.worker.js';
	}
}