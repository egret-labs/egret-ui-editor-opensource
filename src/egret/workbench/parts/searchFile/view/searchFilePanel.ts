import { InnerBtnWindow } from 'egret/platform/innerwindow/browser/innerWindow';
import { VGroup } from 'egret/base/browser/ui/containers';
import { Label } from 'egret/base/browser/ui/labels';
import { TextInput } from 'egret/base/browser/ui/inputs';
import { IInnerWindow, InnerButtonType } from 'egret/platform/innerwindow/common/innerWindows';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { SearchFileData } from '../common/searchFileData';
import { SearchFileDataSource, SearchFileItemRenderer, SearchFileController } from './searchFileViewer';
import { ITreeConfiguration } from 'vs/base/parts/tree/browser/tree';
import { Tree } from 'vs/base/parts/tree/browser/treeImpl';
import { addClass } from 'egret/base/common/dom';
import { ExmlFileStat } from '../common/searchFileModel';
import { matchesFuzzy } from 'egret/base/common/filters';
import { stripWildcards } from 'egret/base/common/strings';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { IWorkbenchEditorService } from 'egret/workbench/services/editor/common/ediors';
import { localize } from 'egret/base/localization/nls';

import './media/searchFile.css';

/**
 * 文件搜索面板
 */
export class SearchFilePanel extends InnerBtnWindow{
	private toDisposes:IDisposable[] = [];

	private searchFileData:SearchFileData;
	constructor(
		@IInstantiationService private instantiationService:IInstantiationService,
		@IWorkbenchEditorService private workbenchEditorService:IWorkbenchEditorService
	){
		super();
		this.listFocus_handler = this.listFocus_handler.bind(this);
		this.keyDown_handler = this.keyDown_handler.bind(this);

		this.title = localize('searchFilePanel.title','Quick Open');
		this.initButtons(
			{label:localize('alert.button.open', 'Open'),closeWindow:true},
			{label:localize('alert.button.cancel', 'Cancel'),closeWindow:true});
		this.searchFileData = this.instantiationService.createInstance(SearchFileData);
		this.registerListeners();
	}

	private registerListeners(): void {
		this.toDisposes.push(this.onButtonClick(e => this.btnClick_handler(e)));
	}

	private btnClick_handler(button: InnerButtonType): void {
		if(button == InnerButtonType.FIRST_BUTTON){
			this.openSelectionFile();
		}
	}

	
	private input:TextInput = new TextInput();
	private list:Tree;
	/**
	 * 重载父类的render方法，进行内容渲染
	 * @param contentGroup 
	 */
	public render(contentGroup: HTMLElement): void {
		super.render(contentGroup);
		addClass(contentGroup,'search-file-panel');
		contentGroup.style.padding = '10px';

		const vGroup = new VGroup(contentGroup);
		var label = new Label(vGroup);
		label.text = localize('searchFilePanel.selectFile','Select file to open:');
		
		this.input.create(vGroup);
		this.input.style.marginTop = '5px';

		var label = new Label(vGroup);
		label.text = localize('searchFilePanel.matchedFile','Matched file:');
		label.style.marginTop = '10px';
		//540*260
		const listContainer = document.createElement('div');
		listContainer.style.width = '540px';
		listContainer.style.height = '260px';
		listContainer.style.marginTop = '5px';
		vGroup.getElement().appendChild(listContainer);

		const dataSource = this.instantiationService.createInstance(SearchFileDataSource);
		const renderer = this.instantiationService.createInstance(SearchFileItemRenderer);
		const controller = this.instantiationService.createInstance(SearchFileController);
		const config:ITreeConfiguration = {
			dataSource:dataSource,
			renderer:renderer,
			controller:controller
		};
		this.list = this.instantiationService.createInstance(Tree,listContainer,config,{
			keyboardSupport:true,
			twistiePixels: 0,
			showTwistie: false,
			indentPixels: 0
		});
		this.list.layout();
		addClass(this.list.getHTMLElement(),'search-list-container');

		this.list.getHTMLElement().addEventListener('focus',this.listFocus_handler);
		this.input.getElement().addEventListener('keydown',this.keyDown_handler);
		this.list.getHTMLElement().addEventListener('keydown',this.keyDown_handler);

		this.toDisposes.push(this.input.onValueChanging(e=>this.textChanged_handler(e)));
		this.toDisposes.push(this.input.onValueChanged(e=>this.textChanged_handler(e)));
	}

	private listFocus_handler(e:Event):void{
		this.input.getElement().focus();
	}

	private keyDown_handler(e:KeyboardEvent):void{
		if(e.keyCode == 13){
			this.openSelectionFile();
			this.close();
		}
		if(e.keyCode != 38 && e.keyCode != 40){
			return;
		}
		e.stopImmediatePropagation();
		e.stopPropagation();
		e.preventDefault();
		const root = this.getFilteredRoot();
		if(!root || root.children.length == 0){
			return;
		}
		if(this.list.getSelection().length == 0){
			this.list.setSelection([root.children[0]]);
			return;
		}
		if(e.keyCode == 38){//上
			this.list.selectPrevious();
		}else if(e.keyCode == 40){//下
			this.list.selectNext();
		}
		const curSelections = this.list.getSelection();
		let curSelection = null;
		if(curSelections.length > 0){
			curSelection = curSelections[0];
		}
		if(curSelection){
			this.list.reveal(curSelection);
		}
	}

	private textChanged_handler(text:string):void{
		this.refreshList();
	}


	private root:ExmlFileStat = null;
	/**
	 * 打开窗体
	 * @param ownerWindow 父级窗体，如果设置null，则从当前激活的窗体上打开，如果设置为root则从根窗体打开
	 * @param modal 是否启用模态窗体
	 */
	public open(ownerWindow?: IInnerWindow | 'root', modal?: boolean): void{
		super.open(ownerWindow,modal);
		this.list.layout();
		this.searchFileData.getRoot().then(root=>{
			this.root = root;
			this.refreshList();
		});
		setTimeout(() => {
			this.input.getElement().focus();
		}, 1);
	}

	private filteredRoot:ExmlFileStat = new ExmlFileStat();
	private searchKeyCached:string = null;
	private getFilteredRoot():ExmlFileStat{
		if(!this.root){
			return;
		}
		let searchKey = this.input.text;
		searchKey = stripWildcards(searchKey).toLowerCase();
		if(this.searchKeyCached == searchKey){
			return this.filteredRoot;
		}
		this.searchKeyCached = searchKey;
		if(!this.searchKeyCached){
			this.filteredRoot.children = this.root.children.concat();
			return this.filteredRoot;
		}
		this.filteredRoot.children = this.root.children.filter(e=>{
			e.fileName_highlights = matchesFuzzy(searchKey, e.fileName, true);
			e.className_highlights = matchesFuzzy(searchKey, e.className, true);
			e.path_highlights = matchesFuzzy(searchKey, e.path, true);
			if(!e.fileName_highlights && !e.className_highlights){
				return false;
			}
			return true;
		});

		return this.filteredRoot;
	}

	private inputTextCache:string = null;
	private refreshList():void{
		const root = this.getFilteredRoot();
		if(!root){
			return;
		}
		if(this.inputTextCache == this.input.text){
			return;
		}
		this.inputTextCache = this.input.text;
		const existSelections = this.list.getSelection();
		let existSelection:ExmlFileStat = null;
		if(existSelections.length> 0){
			existSelection = existSelections[0];
		}
		this.list.setInput(root).then(()=>{
			if(existSelection && root.children.indexOf(existSelection) != -1){
				this.list.setSelection([existSelection]);
				this.list.reveal(existSelection);
			}else{
				const selections = this.list.getSelection();
				if(!selections || selections.length == 0){
					if(root.children.length > 0){
						this.list.setSelection([root.children[0]]);
						this.list.reveal(root.children[0]);
					}
				}
			}
		});
	}


	private openSelectionFile():void{
		const selections = this.list.getSelection();
		if(selections && selections.length > 0){
			const selection = selections[0];
			this.workbenchEditorService.openEditor({resource:selection.resource});
		}
	}

	/**
	 * 释放
	 */
	public dispose() {
		super.dispose();
		dispose(this.toDisposes);
		this.list.getHTMLElement().removeEventListener('focus',this.listFocus_handler);
		this.input.getElement().removeEventListener('keydown',this.keyDown_handler);
		this.list.getHTMLElement().removeEventListener('keydown',this.keyDown_handler);
		this.instantiationService = null;
		this.workbenchEditorService = null;
	}
}