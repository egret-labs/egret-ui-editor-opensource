import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { InnerBtnWindow, InnerWindow } from '../../../platform/innerwindow/browser/innerWindow';
import { InnerButtonType } from '../../../platform/innerwindow/common/innerWindows';
import { CustomWindow } from './window-case/customWindow';
import { PromptWindow } from 'egret/platform/launcher/browser/promptWindow';
import { SearchFilePanel } from 'egret/workbench/parts/searchFile/view/searchFilePanel';
import { SimpleNotificationService } from 'egret/workbench/services/notification/common/notification';

//添加
export const createBtn = (instantionService: IInstantiationService) => {

	/* ----------  一种弹出窗体的实现 ---------- */
	let openWindowBtn = document.createElement('button');
	openWindowBtn.style.left = '500px';
	openWindowBtn.style.zIndex = '1000';
	openWindowBtn.style.top = '50px';
	openWindowBtn.style.position = 'absolute';
	openWindowBtn.innerHTML = '弹出窗体';
	document.body.appendChild(openWindowBtn);

	var index = 0;
	openWindowBtn.addEventListener('click', () => {
		index++;
		var innerWindow = new InnerBtnWindow();
		innerWindow.title = '显示设置尺寸的弹窗 ' + index;
		innerWindow.backgroundColor = '#cccccc';
		innerWindow.width = 500;
		innerWindow.height = 400;

		var contentElement = document.createElement('div');
		contentElement.style.width = '100px';
		contentElement.style.height = '100px';
		contentElement.style.marginLeft = '100px';
		contentElement.style.marginTop = '100px';
		contentElement.style.backgroundColor = '#ff0000';
		contentElement.style.lineHeight = '100px';
		contentElement.style.textAlign = 'center';
		contentElement.innerText = '测试内容';
		innerWindow.contentGroup.appendChild(contentElement);

		innerWindow.initButtons(
			{label:'确认'},
			{label:'弹出子窗体',closeWindow:false},
			{label:'弹出模态子窗体',closeWindow:false}
		);
		innerWindow.open('root', true);
		innerWindow.onButtonClick(type=>{
			if(type == InnerButtonType.FIRST_BUTTON){
				console.log('点击了确认按钮');
			}
			if(type == InnerButtonType.SECOND_BUTTON){
				console.log('点击了弹出子窗体');
				index++;
				var subInnerWindow = new InnerWindow();
				subInnerWindow.title = '非模态弹窗，自动获取父级 '+index;
				subInnerWindow.width = 400;
				subInnerWindow.height = 300;
				subInnerWindow.open();
			}
			if(type == InnerButtonType.THIRD_BUTTON){
				console.log('点击了弹出模态子窗体');
				index++;
				var subInnerWindow = new InnerWindow();
				subInnerWindow.title = '模态弹窗，自动获取父级 '+index;
				subInnerWindow.width = 400;
				subInnerWindow.height = 300;
				subInnerWindow.open(null,true);
			}
		});
	});


	/* ----------  另一种弹出窗体的实现 ---------- */
	openWindowBtn = document.createElement('button');
	openWindowBtn.style.left = '500px';
	openWindowBtn.style.zIndex = '1000';
	openWindowBtn.style.top = '100px';
	openWindowBtn.style.position = 'absolute';
	openWindowBtn.innerHTML = '弹出另一个方式实现的窗体';
	document.body.appendChild(openWindowBtn);
	openWindowBtn.addEventListener('click', () => {
		index++;
		var innerWindow = new CustomWindow();
		innerWindow.open(null, true);
	});

	/* ----------  另一种弹出窗体的实现 ---------- */
	openWindowBtn = document.createElement('button');
	openWindowBtn.style.left = '500px';
	openWindowBtn.style.zIndex = '1000';
	openWindowBtn.style.top = '150px';
	openWindowBtn.style.position = 'absolute';
	openWindowBtn.innerHTML = '无边框内容弹窗';
	document.body.appendChild(openWindowBtn);
	openWindowBtn.addEventListener('click', () => {
		index++;
		// var innerWindow = new SampleWindow();
		// innerWindow.open(null, true);

		var innerWindow = new PromptWindow();
		innerWindow.open(null, true);
	});

	/* ----------  另一种弹出窗体的实现 ---------- */
	openWindowBtn = document.createElement('button');
	openWindowBtn.style.left = '500px';
	openWindowBtn.style.zIndex = '1000';
	openWindowBtn.style.top = '200px';
	openWindowBtn.style.position = 'absolute';
	openWindowBtn.innerHTML = '搜索面板';
	document.body.appendChild(openWindowBtn);
	openWindowBtn.addEventListener('click', () => {
		index++;
		// var innerWindow = new SampleWindow();
		// innerWindow.open(null, true);

		var searchFilePanel = instantionService.createInstance(SearchFilePanel);
		searchFilePanel.open(null, true);
	});






	let btn1 = document.createElement('button');
	btn1.style.left = '500px';
	btn1.style.zIndex = '1000';
	btn1.style.top = '250px';
	btn1.style.position = 'absolute';
	btn1.innerHTML = '测试提示';
	document.body.appendChild(btn1);

	let notification = instantionService.createInstance(SimpleNotificationService);
	btn1.addEventListener('click', () => {
		//弹出我面板
		// -----------------------------------通知测试

		// let config: IPrompt;
		// let btn = <div style={{ display: 'flex', flexDirection: 'row' }}>
		// 	<AntdButton type='primary' onClick={() => {
		// 		console.log('1111111');

		// 	}}>却笑了</AntdButton>
		// 	<AntdButton style={{ marginLeft: 30 }} onClick={() => {
		// 		console.log('2222222');

		// 	}}>确定了</AntdButton>
		// </div>;
		// let desc = `一个桌面应用，要经历怎样的过程，才能抵达用户面前？
		// 一位新人，要经历怎样的成长，才能站在技术之巅？
		// 探寻这里的秘密；
		// 体验这里的挑战；
		// 成为这里的主人；`;

		let content = 'asdflkasdflkjasldkfjlakjsd';
		notification.error({ content });
	});
};

let onClose = () => {
	console.log('我也不清楚～～～～');
};