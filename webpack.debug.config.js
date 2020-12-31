let path = require('path')
let fs = require('fs')
let htmlPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const glob = require('glob');

function getEntry() {
	var entry = {};
	entry['main'] = './main.ts';
	entry['cli'] = './cli.ts';
	entry['egret/workbench/electron-browser/bootstrap/index'] = './egret/workbench/electron-browser/bootstrap/index.ts';
	entry['egret/workbench/electron-browser/bootstrap/resdepot'] = './egret/workbench/electron-browser/bootstrap/resdepot.ts';
	// monaco-editor
	entry['egret/workbench/electron-browser/bootstrap/monaco-editor/monaco-editor'] = './monaco-editor.js';
	entry['egret/workbench/electron-browser/bootstrap/monaco-editor/editor.worker'] = "monaco-editor/esm/vs/editor/editor.worker.js";
	entry['egret/workbench/electron-browser/bootstrap/monaco-editor/json.worker'] = "monaco-editor/esm/vs/language/json/json.worker.js";
	var srcDirName = './src/**/*.node.ts'; //需要获取的文件路径
	glob.sync(srcDirName).forEach(function (name) {
		var target = name;
		var source = name.slice(0, name.length - 3);
		target = '.' + target.slice('./src'.length);
		source = '.' + source.slice('./src'.length);
		entry[source] = target;
	});
	for (var key in entry) {
		console.log(key + ' : ' + entry[key] + '\n');
	}
	return entry;
}

let monacoEditorFontRegex = /node_modules\/monaco-editor\/esm\/vs\/base\/browser\/ui\/codiconLabel\/codicon\/codicon.ttf/;
let externals = _externals();

module.exports = {
	mode: 'development',
	target: 'electron-renderer',
	context: path.join(__dirname, 'src'),
	devtool: 'cheap-module-eval-source-map',//默认source-map调试时无法查看ts源
	resolve: {
		extensions: ['*', '.js', '.jsx', '.ts', '.tsx'],
		modules: [
			path.join(__dirname, './src'),
			"node_modules"
		]
	},
	entry: getEntry(),
	node: {
		__dirname: false
	},
	output: {
		filename: '[name].js',
		path: __dirname + '/out',
		publicPath: '../../../../'
	},
	externals: externals,
	module: {
		rules: [
			{
				test: /\.ts(x?)$/,
				use: 'ts-loader',
				exclude: /node_modules/
			}, {
				test: /\.css$/,
				use: [
					MiniCssExtractPlugin.loader,
					"css-loader"
				]
			}, {
				test: /\.less$/,
				use: [MiniCssExtractPlugin.loader,
					"css-loader",
				{
					loader: "less-loader",
					options: {
						lessOptions: {
							paths: [
								path.resolve(__dirname, "node_modules")
							],
							javascriptEnabled: true
						}
					}
				}]
			}, {
				test: /\.node$/,
				use: 'node-loader',
				exclude: /node_modules/
			}, {
				test: /\.(eot|woff|ttf|png|gif|svg|otf|exe)([\?]?.*)$/,
				use: [{
					loader: 'file-loader',
					options: {
						name: '[path][name].[ext]',
						outputPath: function (url, resourcePath, _context) {
							if (monacoEditorFontRegex.test(resourcePath.replace(/[\\/]/g, "/"))) {
								return `egret/workbench/electron-browser/bootstrap/monaco-editor/codicon.ttf`;
							}
							return url;
						},
						publicPath: function (url, resourcePath, _context) {
							if (monacoEditorFontRegex.test(resourcePath.replace(/[\\/]/g, "/"))) {
								return `../../../../../egret/workbench/electron-browser/bootstrap/monaco-editor/codicon.ttf`;
							}
							return `../../../../${url}`;
						}
					}
				}]
			}
		]
	},
	plugins: [
		new CleanWebpackPlugin({
			cleanStaleWebpackAssets: false,
			protectWebpackAssets: false,
		}),
		new MiniCssExtractPlugin({
			// Options similar to the same options in webpackOptions.output
			// both options are optional
			filename: "[name].css",
			chunkFilename: "[id].css"
		}),
		new htmlPlugin({
			minify: false,
			hash: false,
			filename: './egret/workbench/electron-browser/bootstrap/index.html',
			template: './egret/workbench/electron-browser/bootstrap/index.html',
			chunks: []
		}),
		new htmlPlugin({
			minify: false,
			hash: false,
			filename: './egret/workbench/electron-browser/bootstrap/resdepot.html',
			template: './egret/workbench/electron-browser/bootstrap/resdepot.html',
			chunks: []
		}),
		new CopyWebpackPlugin([
			{ from: '../resources/', to: './egret/workbench/electron-browser/bootstrap/resources/' },
			{ from: './egret/workbench/services/files/watcher/win32/CodeHelper.exe', to: './egret/workbench/services/files/watcher/win32/CodeHelper.exe' }
		]),
	],
	watchOptions: {
		poll: 200,//监测修改的时间(ms)
		aggregateTimeout: 500, //防止重复按键，500毫米内算按键一次
		ignored: /node_modules/,//不监测
	}
}


function _externals() {
	var nameMap = {};
	var pa = fs.readdirSync(path.join(__dirname, 'node_modules'));
	pa.forEach(function (ele, index) {
		if (ele === "typescript") {
			return;
		}
		nameMap[ele] = true;
	})
	let manifest = require('./package.json');
	let dependencies = manifest.dependencies;
	for (let p in dependencies) {
		nameMap[p] = true;
	}

	let externals = {};
	for (let name in nameMap) {
		if (nameMap[name] === true) {
			// console.log('external: ' + 'commonjs ' + name);
			externals[name] = 'commonjs ' + name;
		}
	}
	externals["@egret/eui-compiler"] = 'commonjs ' + "@egret/eui-compiler";

	return externals;
}