/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as filters from 'vs/base/common/filters';
import { ResUtil } from 'egret/exts/resdepot/common/utils/ResUtil';

/**
 * tree型数据的搜索
 */
export class TreeSearchHelper extends egret.EventDispatcher {
	/** 在搜索时通过键盘up/down移动所选项 */
	public static EVENT_SELECT_ITEM: string = 'event_select_item';
	/** 开关。开启搜索树/组/文件夹，以/开头以匹配文件夹 */
	public enabel_tree_search: boolean = true;
	/**主要用于搜索过滤时的搜索匹配字段，据此搜索类型返回不同的搜索内容。 */
	public searchType: string = 'material';//material/resdepot

	public searchInput: eui.TextInput;
	public treePro: eui.TreePro;
	public treeDp: eui.ObjectCollection;
	// public treeModel: TreeModel;

	constructor() {
		super();
	}

	public init() {
		this.searchInput.addEventListener(egret.Event.CHANGE, this.searchInput_changeHandler, this);
		this.searchInput.addEventListener(egret.KeyboardEvent.KEY_DOWN, this.searchKeyDown_handler, this);
	}

	/// search part start
	public searchKeyDown_handler(event: egret.KeyboardEvent): void {
		switch (event.keyCode) {
			case egret.Keyboard.ENTER:
				this.searchInput.setFocus();
				break;
			case egret.Keyboard.UP:
				let nextSelectedIndex: number = this.treePro.selectedIndex - 1 < 0 ? this.treePro.numElements - 1 : this.treePro.selectedIndex - 1;
				this.treePro.selectedIndex = nextSelectedIndex;
				// this.showPreView(this.treePro.selectedItem);
				this.dispatchEvent(new egret.Event(TreeSearchHelper.EVENT_SELECT_ITEM, false, false, this.treePro.selectedItem));
				event.preventDefault();
				break;
			case egret.Keyboard.DOWN:
				nextSelectedIndex = this.treePro.selectedIndex + 1 >= this.treePro.numElements ? 0 : this.treePro.selectedIndex + 1;
				this.treePro.selectedIndex = nextSelectedIndex;
				// this.showPreView(this.treePro.selectedItem);
				this.dispatchEvent(new egret.Event(TreeSearchHelper.EVENT_SELECT_ITEM, false, false, this.treePro.selectedItem));
				event.preventDefault();
				break;
			default:
				break;
		}
	}

	private treePreviousOpenNodes: Array<any> = [];// 因搜索而打开的nodes，每次搜索之前需要重置打开状态
	public searchInput_changeHandler(event: egret.Event): void {
		for (var i: number = 0; i < this.treePreviousOpenNodes.length; i++) {
			this.treeDp.expandItem(this.treePreviousOpenNodes[i], false);
		}
		this.treePreviousOpenNodes.length = 0;
		// 从树的根节点遍历树，检测搜索的字符串是否在节点上。
		this.filterSearch(this.treeDp.source);
		for (var j: number = 0; j < this.treePreviousOpenNodes.length; j++) {
			var openItem: any = this.treePreviousOpenNodes[j];
			this.treeDp.expandItem(openItem);// 展开含有搜索字符串的项
		}
		this.treeDp.refresh();
	}

	// private itemRendererFunction(item: any): void {
	// 	// console.log(item, item.label);
	// }

	/** 搜索目录 */
	private searchFolder: boolean = false;
	private wordsArr: Array<string>;
	/**
	 * 过滤查询字符串，采用模糊查询
	 * 输入信息有变时，遍历整个数据结构
	 */
	private filterSearch(item: any): void {
		var text: string = this.searchInput.text.trim();// 使用string的trim可以trim掉utf8的空格字符0xC2A0

		// var reg:RegExp = strings.createRegExp(' ', true, false, false, true);// / /gi
		// var searchStr:string = this.searchInput.text.replace(reg, ' ');// C2A0替换为20
		// var text: string = strings.trim(searchStr).toLowerCase();// strings.trim无法trim掉uft8的空格字符0xC2A0

		/// 空字符串也要执行一遍，因为在遍历时需要更改数据内容，需要清空所有更改
		if (!item) {//text === '' ||
			return;
		}

		// clear folder search
		this.searchFolder = false;
		this.wordsArr = null;
		if (this.enabel_tree_search) {
			if (text.length > 0 && text.charAt(0) === '/') {
				text = text.substring(1);
				text = text.trim();

				this.wordsArr = text.split('/');
				for (var i: number = 0; i < this.wordsArr.length; i++) {
					var w: string = this.wordsArr[i];
					w = w.trim();
					this.wordsArr[i] = w;
				}
				this.searchFolder = true;
			}
		}
		if (this.iterCheckStrInChild(text, item)) {
			item.hideOnSearch = false;
		} else {
			item.hideOnSearch = true;
		}
	}
	/**
	 * 在子项中循环检测是否有要搜索的字符串，检测过程中展开枝节点
	 * @param word 要搜索的字符串
	 * @param item 搜索的项
	 * @param folder_opened 父文件夹已经打开了，不需要检查子项的字符匹配了
	 * @return true  str在item或其子项中
	 */
	private iterCheckStrInChild(word: string, item: any, folder_opened?: boolean): boolean {
		var ret: boolean = false;
		if (item) {
			item.textFlow = null;//默认设置为空

			if (!folder_opened || !this.searchFolder) {
				var wordToMatchAgainst: string = ResUtil.getRenderLabel(this.searchType, item);//item.label;
				// console.log('wordToMatchAgainst:  ' + wordToMatchAgainst);
				var textFlow: Array<egret.ITextElement>;
				if (this.wordsArr && this.wordsArr.length > 0) {
					for (var i: number = 0; i < this.wordsArr.length; i++) {
						var w: string = this.wordsArr[i];
						if (w) {
							textFlow = this.checkWordMatch(w, wordToMatchAgainst);
						}
						if (textFlow) {
							break;
						}
					}

				} else {
					textFlow = this.checkWordMatch(word, wordToMatchAgainst);
				}

				item.textFlow = textFlow;
				if (textFlow) {
					ret = true;
					folder_opened = true;
				} else {

				}
			} else {
				ret = true;
			}

			if (item.children) {
				for (var i: number = 0; i < item.children.length; i++) {
					var openItem: any = item.children[i];
					if (this.iterCheckStrInChild(word, openItem, folder_opened) || (this.searchFolder && folder_opened)) {
						openItem.hideOnSearch = false;
						if (openItem.isFolder) {// 展开搜索时遇到的文件夹
							if (word && this.treePreviousOpenNodes.indexOf(openItem) === -1 && this.treeDp.hasChildren(openItem) && !this.treeDp.isItemOpen(openItem)) {
								this.treePreviousOpenNodes.push(openItem);
							}
						}
						ret = true;
					} else {
						openItem.hideOnSearch = true;
					}
				}
			} else {

			}
		}
		return ret;
	}

	private checkWordMatch(word: string, wordToMatchAgainst: string): Array<egret.ITextElement> {
		var textFlow: Array<egret.ITextElement>;
		if (wordToMatchAgainst) {
			var matchArr: Array<any> = filters.matchesFuzzy(word, wordToMatchAgainst.toLowerCase(), true);// 模糊查询
			if (matchArr && matchArr.length > 0) {
				textFlow = new Array<egret.ITextElement>();// 样式文本
				var curIndex: number = 0;//wordToMatchAgainst字串查询进度
				var curStr: string = '';
				var textElement: any;
				for (var matchIndex: number = 0; matchIndex < matchArr.length; matchIndex++) {
					var matchItem: any = matchArr[matchIndex];
					// 拼普通字符串
					textElement = {};
					curStr = wordToMatchAgainst.substring(curIndex, matchItem.start);
					if (curStr) {
						textElement.text = curStr;
						textElement.style = {};
						textFlow.push(textElement);
					}

					// 拼搜索到的字符串
					textElement = {};
					textElement.text = wordToMatchAgainst.substring(matchItem.start, matchItem.end);
					//'textColor': 0x007ACC, 'bold': true, 'size': 14, 'strokeColor': 0x007ACC, 'stroke': 0.5
					textElement.style = { 'textColor': 0x007ACC, 'bold': true, 'italic': true };//'bold': true无效
					textFlow.push(textElement);

					curIndex = matchItem.end;
				}
				textElement = {};
				curStr = wordToMatchAgainst.substring(curIndex);
				if (curStr) {
					textElement.text = curStr;
					textElement.style = {};
					textFlow.push(textElement);
				}
			}
		}
		return textFlow;
	}
	/// search part end
}