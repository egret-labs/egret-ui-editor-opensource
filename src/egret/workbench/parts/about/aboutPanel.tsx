import { InnerWindow } from 'egret/platform/innerwindow/browser/innerWindow';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { IInnerWindow } from 'egret/platform/innerwindow/common/innerWindows';
import './media/aboutPanel.css';
import { remote, shell } from 'electron';
import React = require('react');
import ReactDOM = require('react-dom');
import { localize } from '../../../base/localization/nls';
import { APPLICATION_NAME } from 'egret/consts/consts';

/**
 * 新建文件夹
 * @export
 * @class Scale9WindowPanel
 * @extends {InnerBtnWindow}
 */
export class AboutPanel extends InnerWindow {
	// 确认按钮事件
	public confirm: Function;

	// 取消按钮事件
	public cancel: Function;

	constructor(
	) {
		super();
		// 设置窗体标题
		this.title = localize('system.about','About {0}',APPLICATION_NAME);
		// this.backgroundColor = '#232c33';

		// 注册监听事件
		this.registerListeners();
	}


	private disposables: IDisposable[] = [];

	/**
	 * 注册监听事件
	 */
	private registerListeners(): void {
		// 监听按钮点击事件
	}

	/**
	 * 打开
	 *
	 * @param {(IInnerWindow | 'root')} [ownerWindow]
	 * @param {boolean} [modal]
	 * @memberof NewExmlPanel
	 */
	public open(ownerWindow?: IInnerWindow | 'root', modal?: boolean) {
		super.open(ownerWindow, modal);
		(this as any).doDeactivate();
	}


	private openSite(url: string) {
		shell.openExternal(url);
	}

	/**
	 * 重载父类方法，对窗体进行渲染
	 */
	public render(contentGroup: HTMLElement): void {
		super.render(contentGroup);

		let divContent = (<div className='aboutPage' style={{ marginBottom: 40 }}>
			<div className='top'>
				<img className='log' src={require('./media/code.svg')} />
				<div className='titlePanel'>
					<div style={{ fontSize: 20, color: '#E4E5E9' }}>{APPLICATION_NAME}</div>
					<div style={{ fontSize: 20, color: '#E4E5E9' }}>{remote.app.getVersion()}</div>
				</div>
			</div>
			<div className='seperate'></div>
			<div className='info'>
				<div className='content'>
					<div className='infoItem linkItem'>
						<div className='infoItemNamePanel'>
							<div className='vline'></div>
							<div className='infoItemName'>{localize('aboutPanel.render.websit','Official Website')}</div>
							<div className='vline'></div>
						</div>
						<div className='infoItemValue'>
							<a onClick={() => this.openSite('http://www.egret.com')}>https://www.egret.com</a>
						</div>
					</div>
					<div className='infoItem linkItem'>
						<div className='infoItemNamePanel'>
							<div className='vline'></div>
							<div className='infoItemName'>{localize('aboutPanel.render.bbs','Community')}</div>
							<div className='vline'></div>
						</div>
						<div className='infoItemValue'>
							<a onClick={() => this.openSite('http://bbs.egret.com')}>http://bbs.egret.com</a>
						</div>
					</div>
					<div className='infoItem'>
						<div className='infoItemNamePanel'>
							<div className='vline'>
							</div>
							<div className='infoItemName'>{localize('aboutPanel.render.qq','QQ Group')}</div>
							<div className='vline'></div>
						</div>
						<div className='infoItemValue'>559384238    474860229</div>
					</div>
					<div className='infoItem no-color'><div className='infoItemNamePanel'><div className='vline'></div><div className='infoItemName'>{localize('aboutPanel.render.suport','Tech-Support')}</div><div className='vline'></div></div><div className='infoItemValue'><a href='mailto:support@egret.com'>support@egret.com</a></div></div>
					<div className='infoItem no-color'><div className='infoItemNamePanel'><div className='vline'></div><div className='infoItemName'>{localize('aboutPanel.render.bd','Business')}</div><div className='vline'></div></div><div className='infoItemValue'><a href='mailto:bd@egret.com'>bd@egret.com</a></div></div>
					<div className='infoItem'><div className='infoItemNamePanel'><div className='vline'></div><div className='infoItemName'>{localize('aboutPanel.render.tel','Tel')}</div><div className='vline'></div></div><div className='infoItemValue'>010-65505713</div></div>
					<div className='infoItem'><div className='infoItemNamePanel'><div className='vline'></div><div className='infoItemName'>{localize('aboutPanel.render.address','Address')}</div><div className='vline'></div></div><div className='infoItemValue'>{localize('aboutPanel.render.address.detail','Chaoyang District, Beijing Wangjing Road on the 9th Ye Qing Building D Block 12')}</div></div>
					<div className='copyRight'>@2014-2018 Egret Technology,Ltd.All rights reserved.</div>
				</div>
			</div>
		</div>);


		// let attContainer = document.createElement('div');
		// attContainer.className = 'aboutPage';

		// let top = document.createElement('div');
		// top.className = 'top';

		// let log = document.createElement('img');
		// log.className = 'log';
		// log.src = './media/128.png';
		// top.appendChild(log);

		// // 名称
		// let titlePanel = document.createElement('div');
		// let titlePanelSub1 = document.createElement('div');
		// titlePanelSub1.style.fontSize = '20';
		// titlePanelSub1.style.color = '#E4E5E9';
		// titlePanelSub1.innerText = 'Egret ResDepot';

		// // 版本
		// let titlePanelSub2 = document.createElement('div');
		// titlePanelSub2.style.fontSize = '20';
		// titlePanelSub2.style.color = '#E4E5E9';
		// titlePanelSub2.innerText = version;


		// titlePanel.appendChild(titlePanelSub1);
		// titlePanel.appendChild(titlePanelSub2);

		// top.appendChild(log);

		// attContainer.appendChild(top);

		// let seperate = document.createElement('div');
		// seperate.className = 'seperate';
		// contentGroup.appendChild(seperate);


		// let info = this.getDiv();
		// info.className = 'info';

		// let content = this.getDiv();
		// content.className = 'content';

		// let infoItem_linkItem = this.getDiv();
		// infoItem_linkItem.className = 'infoItem linkItem';

		// let infoItemNamePanel = this.getDiv();

		// infoItemNamePanel.className = 'infoItemNamePanel';

		// let vline = this.getDiv();
		// vline.className = 'vline';

		// infoItemNamePanel.appendChild(vline);

		// let infoItemName = this.getDiv();
		// infoItemName.className = 'infoItemName';

		// infoItemNamePanel.appendChild(infoItemName);




		// infoItem_linkItem.appendChild(infoItemNamePanel);





		// content.appendChild(infoItem_linkItem);
		// info.appendChild(content);

		// attContainer.appendChild(info);
		// contentGroup.appendChild(attContainer);
		ReactDOM.render(divContent, contentGroup);
	}

	// 获得DIV
	public getDiv(): HTMLDivElement {
		return document.createElement('div');
	}


	/**
	 * 清理
	 */
	public dispose() {
		super.dispose();
		dispose(this.disposables);
		this.cancel = null;
		this.confirm = null;
	}
}