import { IDataSource, ITree, IRenderer, IController, ContextMenuEvent } from 'vs/base/parts/tree/browser/tree';
import { ExmlFileStat } from '../common/searchFileModel';
import { TPromise } from 'vs/base/common/winjs.base';
import { addClass } from 'egret/base/common/dom';
import { IWorkspaceService } from 'egret/platform/workspace/common/workspace';
import { DefaultController } from 'vs/base/parts/tree/browser/treeDefaults';
import { Tree } from 'vs/base/parts/tree/browser/treeImpl';
import { IMouseEvent } from 'vs/base/browser/mouseEvent';

import './media/searchFile.css';
import { IMatch } from 'egret/base/common/filters';
import { expand, escape } from 'egret/base/common/strings';

/**
 * Exml文件搜索源
 */
export class SearchFileDataSource implements IDataSource{
	/**
	 * 得到给定元素的唯一id标识。
	 * @param tree 
	 * @param element 
	 */
	public getId(tree: ITree, stat: ExmlFileStat): string {
		return stat.getId();
	}

	/**
	 * 返回此元素是否具有子项
	 * @param tree 
	 * @param element 
	 */
	public hasChildren(tree: ITree, stat: ExmlFileStat): boolean {
		return stat instanceof ExmlFileStat && stat.children.length > 0;
	}

	/**
	 * 异步返回元素的子项
	 * @param tree 
	 * @param element 
	 */
	public getChildren(tree: ITree, stat: ExmlFileStat): TPromise<ExmlFileStat[]> {
		return new TPromise<ExmlFileStat[]>((resolve, reject) => {
			resolve(stat.children);
		});

	}
	/**
	 * 异步返回一个元素的父级
	 * @param tree 
	 * @param element 
	 */
	public getParent(tree: ITree, stat: ExmlFileStat): TPromise<ExmlFileStat> {
		if (stat instanceof ExmlFileStat && stat.parent) {
			return TPromise.as(stat.parent);
		}
		return TPromise.as(null);
	}
}

/**
 * 组件模板数据接口
 */
export interface ISearchFileItemTemplateData {
	/**
	 * 容器
	 */
	container: HTMLElement;
	/**
	 * 图标显示
	 */
	iconDisplay:HTMLElement;
	/**
	 * 文件名显示
	 */
	fileNameDisplay:HTMLElement;
	/**
	 * 类名显示
	 */
	classNameDisplay:HTMLElement;
	/**
	 * 路径显示
	 */
	pathDisplay:HTMLElement;
}

/**
 * 组件项的渲染器
 */
export class SearchFileItemRenderer implements IRenderer {
	private static readonly ITEM_HEIGHT = 22;
	private static readonly FILE_TEMPLATE_ID = 'SearchFileItem';
	/**
	 * 返回一个元素在树中的高度，单位是像素
	 * @param tree 
	 * @param element 
	 */
	public getHeight(tree: ITree, element: any): number {
		return SearchFileItemRenderer.ITEM_HEIGHT;
	}
	/**
	 * 返回给定元素的模板id。
	 * @param tree 
	 * @param element 
	 */
	public getTemplateId(tree: ITree, element: any): string {
		return SearchFileItemRenderer.FILE_TEMPLATE_ID;
	}
	/**
	 * 在DOM节点中渲染一个模板。 这个方法需要渲染元素的所有DOM结构。返回的内容将在 `renderElement` 方法中进行数据填充。
	 * 需要再这个方法中构建高所有的DOM元素，这个方法仅被调用有点次数。
	 * @param tree 
	 * @param templateId 
	 * @param container 
	 */
	public renderTemplate(tree: ITree, templateId: string, container: HTMLElement): ISearchFileItemTemplateData {
		addClass(container,'searchfile-item-container');
		const iconDisplay = document.createElement('div');
		addClass(iconDisplay,'searchfile-icon-display');
		const fileNameDisplay = document.createElement('div');
		addClass(fileNameDisplay,'searchfile-name-display');
		const classNameDisplay = document.createElement('div');
		addClass(classNameDisplay,'searchfile-class-display');
		const pathDisplay = document.createElement('div');
		addClass(pathDisplay,'searchfile-path-display');

		container.appendChild(iconDisplay);
		container.appendChild(fileNameDisplay);
		container.appendChild(classNameDisplay);
		container.appendChild(pathDisplay);

		const template:ISearchFileItemTemplateData = {
			container,
			iconDisplay,
			fileNameDisplay,
			classNameDisplay,
			pathDisplay
		};
		return template;
	}

	/**
	 * 通过 `renderTemplate` 渲染的模板，在这个方法中将被塞入数据渲染成一个真正的项。
	 * 尽可能保证这个方法足够的轻量，因为他会被经常调用。
	 * @param tree 
	 * @param element 
	 * @param templateId 
	 * @param templateData 
	 */
	public renderElement(tree: ITree, stat: ExmlFileStat, templateId: string, templateData: ISearchFileItemTemplateData): void {
		templateData.iconDisplay.className = 'searchfile-icon-display';
		addClass(templateData.iconDisplay,'exml-icon');
		templateData.fileNameDisplay.innerHTML = this.renderHighlightSpans(stat.fileName,stat.fileName_highlights ? stat.fileName_highlights : []);
		templateData.classNameDisplay.innerHTML = '<span>(</span>'+this.renderHighlightSpans(stat.className,stat.className_highlights ? stat.className_highlights : [])+'<span>)</span>';
		templateData.pathDisplay.innerHTML = this.renderHighlightSpans(stat.path,stat.path_highlights ? stat.path_highlights : []);
	}

	private renderHighlightSpans(text:string,highlights:IMatch[]):string{
		const htmlContent:string[] = [];
		let highlight:IMatch;
		let pos = 0;
		for (let i = 0; i < highlights.length; i++) {
			highlight = highlights[i];
			if (highlight.end === highlight.start) {
				continue;
			}
			if (pos < highlight.start) {
				htmlContent.push('<span>');
				htmlContent.push(this.renderOcticons(text.substring(pos, highlight.start)));
				htmlContent.push('</span>');
				pos = highlight.end;
			}
			htmlContent.push('<span class="highlight">');
			htmlContent.push(this.renderOcticons(text.substring(highlight.start, highlight.end)));
			htmlContent.push('</span>');
			pos = highlight.end;
		}

		if (pos < text.length) {
			htmlContent.push('<span>');
			htmlContent.push(this.renderOcticons(text.substring(pos)));
			htmlContent.push('</span>');
		}
		return htmlContent.join('');
	}

	private renderOcticons(label: string): string {
		return expand(escape(label));
	}

	/**
	 * 释放一个模板
	 * @param tree 
	 * @param templateId 
	 * @param templateData 
	 */
	public disposeTemplate(tree: ITree, templateId: string, templateData: ISearchFileItemTemplateData): void {
		templateData.iconDisplay.className = 'searchfile-icon-display';
		templateData.fileNameDisplay.innerText = '';
		templateData.classNameDisplay.innerText = '';
		templateData.pathDisplay.innerText = '';
	}
}


/**
 * 处理用户交互
 */
export class SearchFileController extends DefaultController implements IController {
	private openOnSingleClick: boolean = true;

	constructor() {
		super({keyboardSupport:true});
	}

	/**
	 * 左键点击的时候
	 * @param tree 
	 * @param stat 
	 * @param event 
	 * @param origin 
	 */
	public onLeftClick(tree: Tree, stat: ExmlFileStat, event: IMouseEvent, origin: string = 'mouse'): boolean {
		const payload = { origin: origin };
		const isDoubleClick = (origin === 'mouse' && event.detail === 2);
		if (isDoubleClick || this.openOnSingleClick) {
			tree.toggleExpansion(stat);
		}
		tree.setFocus(stat, payload);
		if (isDoubleClick) {
			event.preventDefault();
		}
		tree.setSelection([stat], payload);
		return true;
	}
	/**
	 * 请求菜单内容的时候
	 * @param tree 
	 * @param stat 
	 * @param event 
	 */
	public onContextMenu(tree: ITree, stat: ExmlFileStat, event: ContextMenuEvent): boolean {
		return true;
	}
}