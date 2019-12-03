import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IExmlModel } from 'egret/exts/exml-exts/exml/common/exml/models';
import { addClass } from 'egret/base/common/dom';
import { IDisposable, dispose } from 'egret/base/common/lifecycle';
import { StateItemRenderer, StateItemDataSource } from './stateItem';
import { CreateStatePanel } from './createStatePanel';
import { IconButton } from '../../../base/browser/ui/buttons';
import { localize } from '../../../base/localization/nls';

import './media/stateBar.css';

//TODO dispose
/**
 * 状态栏
 */
export class StateBar {
	constructor(
		container: HTMLElement,
		@IInstantiationService private instantiationService: IInstantiationService) {
		this.initView(container);
	}


	private stateBarContainer: HTMLElement;
	/** 状态列表容器 */
	private stateItemsList: HTMLElement;
	private initView(container: HTMLElement): void {
		//状态栏的根节点
		this.stateBarContainer = document.createElement('div');
		addClass(this.stateBarContainer, 'state-bar-container');
		container.appendChild(this.stateBarContainer);

		//标题
		const titleElement = document.createElement('div');
		addClass(titleElement, 'title-display');
		titleElement.innerText = localize('stateBar.initView.status','Status');
		this.stateBarContainer.appendChild(titleElement);

		//分割线
		var gapLine = document.createElement('div');
		addClass(gapLine, 'title-gapline');
		this.stateBarContainer.appendChild(gapLine);

		//添加状态按钮
		const addStateBtn = new IconButton(this.stateBarContainer);
		addStateBtn.iconClass = 'add-state';
		addStateBtn.onClick(target=>this.addStateClick_handler());

		//分割线
		var gapLine = document.createElement('div');
		addClass(gapLine, 'state-gapline');
		this.stateBarContainer.appendChild(gapLine);

		//项容器
		this.stateItemsList = document.createElement('div');
		addClass(this.stateItemsList, 'state-items-list');
		this.stateBarContainer.appendChild(this.stateItemsList);
	}

	private addStateClick_handler(): void {
		if (!this.model || !this.model.getSupportState()) {
			return;
		}
		const innerWindow = this.instantiationService.createInstance(CreateStatePanel, this.model.getStates());
		innerWindow.onConfirm = (name: string, copyFrom: string, setStart: boolean) => {
			this.model.createNewState(name, copyFrom);
			if (setStart) {
				this.model.setStartState(name);
			}
			this.model.setCurrentState(name);
		};
		innerWindow.open(null, true);
	}

	private model: IExmlModel;
	private modelListenersDisposables: IDisposable[] = [];
	/** 设置当前视图的exml数据层 */
	public setModel(model: IExmlModel): void {
		//释放已有的监听
		dispose(this.modelListenersDisposables);
		if (!model) {
			return;
		}
		this.model = model;
		this.modelListenersDisposables.push(this.model.onStateChanged(e => this.stateChanged_handler()));
		this.doUpdateStates();
	}
	private stateChanged_handler(): void {
		this.doUpdateStates();
	}


	private items: StateItemRenderer[] = [];
	private itemListeners: IDisposable[] = [];
	private doUpdateStates(): void {
		//释放掉已有的所有项目
		dispose(this.items);
		dispose(this.itemListeners);
		if (!this.model) {
			return;
		}

		const states = this.model.getStates();
		const dataSources: StateItemDataSource[] = [];
		//所有状态项
		dataSources.push({ name: '', allState: true });
		//其他状态项
		states.forEach(state => {
			dataSources.push({ name: state, allState: false });
		});

		const startState = this.model.getStartState();
		const currentState = this.model.getCurrentState();
		dataSources.forEach(dataSource => {
			const renderer = new StateItemRenderer(this.stateItemsList);
			renderer.setData(dataSource);
			renderer.selected = dataSource.name == currentState;
			renderer.default = dataSource.name == startState;
			this.itemListeners.push(renderer.onClick(e => this.itemClick_handler(e)));
			this.itemListeners.push(renderer.onDefaultClick(e => this.itemDefaultClick_handler(e)));
			this.itemListeners.push(renderer.onDeleteClick(e => this.itemDeleteClick_handler(e)));
			this.itemListeners.push(renderer.onStateInput(e => this.itemNameInput_handler(e.oldName, e.newName)));
			this.items.push(renderer);
		});
	}

	private itemClick_handler(item: StateItemRenderer): void {
		if (!this.model) {
			return;
		}
		this.model.setCurrentState(item.dataSource.name);
	}
	private itemDefaultClick_handler(item: StateItemRenderer): void {
		if (!this.model) {
			return;
		}
		if (item.default) {
			this.model.setStartState('');
		} else {
			this.model.setStartState(item.dataSource.name);
		}
	}
	private itemDeleteClick_handler(item: StateItemRenderer): void {
		if (!this.model) {
			return;
		}
		this.model.removeState(item.dataSource.name);
	}
	private itemNameInput_handler(oldName: string, newName: string): void {
		if (!this.model) {
			return;
		}
		this.model.changeStateName(oldName, newName);
	}
}