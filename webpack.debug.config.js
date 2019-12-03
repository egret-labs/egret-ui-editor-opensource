let path = require('path')
let fs = require('fs')
let htmlPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var CopyWebpackPlugin = require('copy-webpack-plugin');
var glob = require('glob');

function getEntry() {
	var entry = {};
	entry['main.js'] = './main.ts';
	entry['./egret/workbench/electron-browser/bootstrap/index.js'] = './egret/workbench/electron-browser/bootstrap/index.ts';
	var srcDirName = './src/**/*.node.ts'; //需要获取的文件路径
	glob.sync(srcDirName).forEach(function (name) {
		var target = name;
		var source = name.slice(0, name.length - 2) + 'js';
		target = '.' + target.slice('./src'.length);
		source = '.' + source.slice('./src'.length);
		entry[source] = target;
	});
	for (var key in entry) {
		console.log(key + ' : ' + entry[key]);
	}
	return entry;
}

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
	output: {
		filename: '[name]',
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
			},{
				test: /\.js(x)$/, 
				exclude: /node_modules/, 
				loader: 'babel' 
			},{
				test: /\.css$/,
				loader: ExtractTextPlugin.extract('css-loader'),
				exclude: /node_modules/
			}, {
				test: /\.less$/,
				loader: ExtractTextPlugin.extract('css-loader!less-loader'),
				exclude: /node_modules/
			}, {
				test: /\.node$/,
				use: 'node-loader',
				exclude: /node_modules/
			}, {
				test: /\.(eot|woff|ttf|png|gif|svg|otf|exe)([\?]?.*)$/,
				loader: 'file-loader?name=[path][name].[ext]',
				exclude: /node_modules/
			}
		]
	},
	plugins: [
		new htmlPlugin({
			minify: false,
			hash: false,
			filename: './egret/workbench/electron-browser/bootstrap/index.html',
			template: './egret/workbench/electron-browser/bootstrap/index.html',
			chunks: []
		}),
		new CopyWebpackPlugin([
			{ from: '../resources/', to: './egret/workbench/electron-browser/bootstrap/resources/' },
			{ from: './egret/workbench/services/files/watcher/win32/CodeHelper.exe', to: './egret/workbench/services/files/watcher/win32/CodeHelper.exe' }


		]),
		new ExtractTextPlugin('[name].css')
	],
	watchOptions: {
		poll: 200,//监测修改的时间(ms)
		aggregateTimeout: 500, //防止重复按键，500毫米内算按键一次
		ignored: /node_modules/,//不监测
	}
}


function _externals() {
	var nameMap = {};
	var pa = fs.readdirSync(path.join(__dirname,'node_modules'));
	pa.forEach(function(ele,index){
		nameMap[ele] = true;
	})
    let manifest = require('./package.json');
    let dependencies = manifest.dependencies;
    for (let p in dependencies) {
		nameMap[p] = true;
	}
	
	let externals = {};
	for(let name in nameMap){
		externals[name] = 'commonjs ' + name;
	}

    return externals;
}