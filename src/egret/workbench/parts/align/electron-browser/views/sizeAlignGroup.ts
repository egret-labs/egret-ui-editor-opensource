import { INode, IContainer, IObject } from 'egret/exts/exml-exts/exml/common/exml/treeNodes';
import { PropertyResource as PR } from 'egret/workbench/parts/properties_old/electron-browser/react/resource/propertyResource';
import { SizeAndPosGroupLogicRunner } from 'egret/workbench/parts/align/electron-browser/views/sizeAndPosGroupLogicRunner';
import { IconButton } from 'egret/base/browser/ui/buttons';
import { IDisposable } from 'egret/base/common/lifecycle';
import { DivideLine } from 'egret/base/browser/ui/dividelines';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { localize } from 'egret/base/localization/nls';
import { voluationToStyle } from 'egret/base/common/dom';


/**
 * 大小和位置
 */
export class SizeAlignGroup {

	private runner: SizeAndPosGroupLogicRunner;

	constructor(_runner: SizeAndPosGroupLogicRunner,
		@IInstantiationService private instantiationService: IInstantiationService
	) {
		this.runner = _runner;
		_runner.updateDisplay = () => this.updateDisplay();
	}
	private get selectedNodes(): INode[] {
		return this.runner.selectedNodes;
	}
	private updateDisplay(): void {
		this.commitDisplay()
			.then(() => {
				return this.commitValue();
			}).then(() => {
				// this.setState(this.state);
			});
	}

	///
	///显示相关
	private showAlignPart: boolean = false;
	private showSpreadPart: boolean = false;
	private showSpacePart: boolean = false;
	private showFrontPart: boolean = false;

	private commitDisplay(): Promise<any> {
		return new Promise<any>((complete: Function) => {
			if (this.selectedNodes.length === 0) {
				this.showAlignPart = false;
				this.showSpreadPart = false;
				this.showSpacePart = false;
				this.showFrontPart = false;
				complete();
				return;
			}
			this.showAlignPart = this.showSpreadPart = this.showSpacePart = this.getASPartDisplayState();
			this.showFrontPart = this.getFrontPartDisplayState();
			complete();
		});
	}

	//是否显示分布和对齐
	private getASPartDisplayState(): boolean {
		let show: boolean = false;
		if (this.selectedNodes.length > 1) {
			let parent: IContainer;
			parent = this.selectedNodes[0].getParent();
			let inSameCotainer = false;
			for (let i = 0; i < this.selectedNodes.length; ++i) {
				const node = this.selectedNodes[i];
				if (node.getParent() !== parent) {
					inSameCotainer = true;
					break;
				}
			}
			if (!inSameCotainer) {
				show = true;

				const layoutValue: IObject = parent.getProperty('layout') as IObject;
				if(layoutValue){
					const exmlConfig = layoutValue.getExmlConfig();
					if(exmlConfig && exmlConfig.isInstance(layoutValue.getInstance(),'eui.BasicLayout')){
						show = false;
					}
				}
			}
		}
		return show;

	}
	//是否显示排列
	private getFrontPartDisplayState(): boolean {
		let show: boolean = true;
		let parent: IContainer;
		if (this.selectedNodes.length > 0) {
			for (let i = 0; i < this.selectedNodes.length; ++i) {
				const node = this.selectedNodes[i];
				parent = node.getParent();
				if (!parent) {
					show = false;
					break;
				}
			}
		}
		return show;
	}

	private commitValue(): Promise<any> {
		return new Promise<any>((complete: Function) => {
			setTimeout(() => {
				if (this.selectedNodes.length === 0) {
					complete();
				}
			}, 4);
		});
	}

	//设置对齐
	private align(tag: string): void {
		switch (tag) {
			case 'top':
				this.runner.alignTop();
				break;
			case 'vcenter':
				this.runner.alignVecticalCenter();
				break;
			case 'bottom':
				this.runner.alignBottom();
				break;
			case 'left':
				this.runner.alignLeft();
				break;
			case 'hcenter':
				this.runner.alignHorizontalCenter();
				break;
			case 'right':
				this.runner.alignRight();
				break;
		}
	}
	//设置分布
	private spread(tag: string): void {
		switch (tag) {
			case 'top':
				this.runner.spreadTopAvg();
				break;
			case 'vcenter':
				this.runner.spreadVerticalCenterAvg();
				break;
			case 'bottom':
				this.runner.spreadBottomAvg();
				break;
			case 'left':
				this.runner.spreadLeftAvg();
				break;
			case 'hcenter':
				this.runner.spreadHorizontalCenterAvg();
				break;
			case 'right':
				this.runner.spreadRightAvg();
				break;
			case 'spaceh':
				this.runner.spaceCutHorizontal();
				break;
			case 'spacev':
				this.runner.spaceCutVertical();
				break;
		}
	}
	//设置间隔
	private spaceSplit(tag: string): void {
		switch (tag) {
			case 'spaceh':
				this.runner.spaceCutHorizontal();
				break;
			case 'spacev':
				this.runner.spaceCutVertical();
				break;
		}
	}
	//设置排列
	private changedepth(tag: string): void {
		switch (tag) {
			case 'front':
				this.runner.frontArg();
				break;
			case 'forward':
				this.runner.forwardArg();
				break;
			case 'back':
				this.runner.backArg();
				break;
			case 'backward':
				this.runner.backwardArg();
				break;
		}
	}

	render(container: HTMLElement): void {
		this.doRender(container);
	}

	private alignPart: AlignPart;
	private spreadPart: SpreadPart;
	private spacePart: SpacePart;
	private frontPart: FrontPart;
	/**
	 * 清理
	 */
	public dispose(): void {

		this.alignPart.dispose();
		this.spreadPart.dispose();
		this.spacePart.dispose();
		this.frontPart.dispose();


	}
	private doRender(container: HTMLElement): void {
		const top = document.createElement('div');
		top.style.height = '100%';
		container.appendChild(top);

		this.alignPart = this.instantiationService.createInstance(AlignPart, (tag: string) => { this.align(tag); });
		this.alignPart.render(top);

		this.spreadPart = this.instantiationService.createInstance(SpreadPart, (tag: string) => { this.spread(tag); });
		this.spreadPart.render(top);

		this.spacePart = this.instantiationService.createInstance(SpacePart, (tag: string) => { this.spaceSplit(tag); });
		this.spacePart.render(top);

		this.frontPart = this.instantiationService.createInstance(FrontPart, (tag: string) => { this.changedepth(tag); });
		this.frontPart.render(top);
	}
}
//对齐
interface IAlignPartPros {
	show: boolean;
	callback: (aligntag: string) => void;
}

class AlignPart {

	private callback: Function;

	constructor(_callback: Function) {

		this.callback = _callback;
		this.iconDisposes = new Array<IDisposable>();
	}

	private _show: boolean;
	public set show(_s: boolean) {
		this._show = _s;
		this.freshTopStyle(this._show);
	}
	public get show(): boolean {
		return this._show;
	}

	private container: HTMLDivElement;

	private iconDisposes: Array<IDisposable>;


	dispose() {
		if (this.iconDisposes) {
			this.iconDisposes.forEach(v => v.dispose());
			this.iconDisposes = null;
		}
	}

	setStyle(iconButton: IconButton, iconClass: string = '', title: string = ''): void {
		iconButton.iconClass = `icon-button ${iconClass}`;
		iconButton.toolTip = title;
		const element: HTMLElement = iconButton.getElement();
		element.style.marginLeft = '5px';
		element.style.marginTop = '5px';
		element.style.marginBottom = '5px';
	}

	aligntop(): void {
		this.callback('top');
	}
	alignvcenter(): void {
		this.callback('vcenter');
	}
	alignbottom(): void {
		this.callback('bottom');
	}
	alignleft(): void {
		this.callback('left');
	}
	alignhcenter(): void {
		this.callback('hcenter');
	}
	alignright(): void {
		this.callback('right');
	}

	private top: HTMLElement;
	render(_container: HTMLElement): void {
		this.doRender(_container);
	}

	doRender(_container: HTMLElement) {

		this.top = document.createElement('div');
		_container.appendChild(this.top);
		const divideLine = new DivideLine(this.top);
		divideLine.updateTxt(localize('alignPart.doRender.align','Align'));

		this.container = document.createElement('div');
		voluationToStyle(this.container.style, { display: 'flex', alignItems: 'center', flexWrap: 'wrap' });

		this.top.appendChild(this.container);

		let iconButton: IconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.ALIGN_TOP, 'TOPALIGN');

		this.iconDisposes.push(iconButton.onClick(() => this.aligntop()));

		iconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.ALIGN_VCENTER, 'VERTICALCENTERALIGN');
		this.iconDisposes.push(iconButton.onClick(() => this.alignvcenter()));

		iconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.ALGIN_BOTTOM, 'BOTTOMALIGN');
		this.iconDisposes.push(iconButton.onClick(() => this.alignbottom()));

		iconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.ALIGN_LEFT, 'LEFTALIGN');
		this.iconDisposes.push(iconButton.onClick(() => this.alignleft()));

		iconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.ALIGN_HCENTER, 'HORIZONTALCENTERALIGN');
		this.iconDisposes.push(iconButton.onClick(() => this.alignhcenter()));

		iconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.ALIGN_RIGHT, 'RIGHTALIGN');
		this.iconDisposes.push(iconButton.onClick(() => this.alignright()));
	}

	freshTopStyle(_show): void {
		if (_show) {
			this.top.style.display = '';
		} else {
			this.top.style.display = 'block';
		}
	}
}
//分布
interface ISpreadPartProps {
	show: boolean;
	callback: (tag: string) => void;
}
class SpreadPart {

	private callback: Function;
	constructor(_callback: Function) {
		this.callback = _callback;
		this.iconDisposes = new Array<IDisposable>();
	}

	private container: HTMLDivElement;

	private iconDisposes: Array<IDisposable>;


	setStyle(iconButton: IconButton, iconClass: string = '', title: string = ''): void {
		iconButton.iconClass = `icon-button ${iconClass}`;
		iconButton.toolTip = title;
		const element: HTMLElement = iconButton.getElement();
		element.style.marginLeft = '5px';
		element.style.marginTop = '5px';
		element.style.marginBottom = '5px';
	}

	aligntop(): void {
		this.callback('top');
	}
	alignvcenter(): void {
		this.callback('vcenter');
	}
	alignbottom(): void {
		this.callback('bottom');
	}
	alignleft(): void {
		this.callback('left');
	}
	alignhcenter(): void {
		this.callback('hcenter');
	}
	alignright(): void {
		this.callback('right');
	}
	spaceh(): void {
		this.callback('spaceh');
	}
	spacev(): void {
		this.callback('spacev');
	}

	/**
	 * 清理
	 */
	public dispose(): void {
		if (this.iconDisposes) {
			this.iconDisposes.forEach(v => v.dispose());
			this.iconDisposes = null;
		}
		this.container = null;
	}
	render(container: HTMLElement): void {
		this.doRender(container);
	}

	private top: HTMLElement;
	doRender(_container: HTMLElement) {

		this.top = document.createElement('div');
		_container.appendChild(this.top);
		const divideLine = new DivideLine(this.top);
		divideLine.updateTxt(localize('spreadPart.doRender.spread','Spread'));

		this.container = document.createElement('div');
		voluationToStyle(this.container.style, { display: 'flex', alignItems: 'center', flexWrap: 'wrap' });

		this.top.appendChild(this.container);
		let iconButton: IconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.SPREAD_TOP, 'TOPDISTRIBUTION');
		this.iconDisposes.push(iconButton.onClick(() => this.aligntop()));

		iconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.SPREAD_VCENTER, 'VERTICALCENTEREDDISTRIBUTION');
		this.iconDisposes.push(iconButton.onClick(() => this.alignvcenter()));

		iconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.SPREAD_BOTTOM, 'BOTTOMDISTRIBUTION');
		this.iconDisposes.push(iconButton.onClick(() => this.alignbottom()));

		iconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.SPREAD_LEFT, 'LEFTDISTRIBUTION');
		this.iconDisposes.push(iconButton.onClick(() => this.alignleft()));

		iconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.SPREAD_HCENTER, 'HORIZONTALCENTEREDDISTRIBUTION');
		this.iconDisposes.push(iconButton.onClick(() => this.alignhcenter()));

		iconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.SPREAD_RIGHT, 'RIGHTDISTRIBUTION');
		this.iconDisposes.push(iconButton.onClick(() => this.aligntop()));

		iconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.SPREAD_SPACEH, 'SPACECUTHORIZONTAL');
		this.iconDisposes.push(iconButton.onClick(() => this.spaceh()));

		iconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.SPREAD_SPACEV, 'SPACECUTVERTICAL');
		this.iconDisposes.push(iconButton.onClick(() => this.spacev()));
	}
}
//间隔

class SpacePart {

	private callback: Function;
	constructor(_callback: Function) {

		this.callback = _callback;

		this.iconDisposes = new Array<IDisposable>();
	}

	private container: HTMLDivElement;

	private iconDisposes: Array<IDisposable>;


	dispose() {
		if (this.iconDisposes) {
			this.iconDisposes.forEach(v => v.dispose());
			this.iconDisposes = null;
		}
		this.container = null;
	}

	private top: HTMLElement;
	doRender(_container: HTMLElement) {
		this.top = document.createElement('div');
		_container.appendChild(this.top);
		const divideLine = new DivideLine(this.top);
		divideLine.updateTxt(localize('spacePart.doRender.space','Space'));

		this.container = document.createElement('div');
		voluationToStyle(this.container.style, { display: 'flex', alignItems: 'center', flexWrap: 'wrap' });

		this.top.appendChild(this.container);
		let iconButton: IconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.SPREAD_SPACEH, 'SPACECUTHORIZONTAL');
		this.iconDisposes.push(iconButton.onClick(() => this.spaceh()));

		iconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.SPREAD_SPACEV, 'SPACECUTVERTICAL');
		this.iconDisposes.push(iconButton.onClick(() => this.spacev()));

	}

	setStyle(iconButton: IconButton, iconClass: string = '', title: string = ''): void {
		iconButton.iconClass = `icon-button ${iconClass}`;
		iconButton.toolTip = title;
		const element: HTMLElement = iconButton.getElement();
		element.style.marginLeft = '5px';
		element.style.marginTop = '5px';
		element.style.marginBottom = '5px';
	}


	spaceh(): void {
		this.callback('spaceh');
	}
	spacev(): void {
		this.callback('spacev');
	}
	render(container: HTMLElement) {
		this.doRender(container);
	}
}
//排列

class FrontPart {
	private callback: Function;
	constructor(_callback: Function) {
		this.callback = _callback;
		this.iconDisposes = new Array<IDisposable>();
	}

	private container: HTMLDivElement;

	private iconDisposes: Array<IDisposable>;


	dispose() {
		if (this.iconDisposes) {
			this.iconDisposes.forEach(v => v.dispose());
			this.iconDisposes = null;
		}
		this.container = null;
	}

	private top: HTMLElement;
	doRender(_container: HTMLElement) {

		this.top = document.createElement('div');
		_container.appendChild(this.top);
		const divideLine = new DivideLine(this.top);
		divideLine.updateTxt(localize('frontPart.doRender.rank','Rank'));

		this.container = document.createElement('div');
		voluationToStyle(this.container.style, { display: 'flex', alignItems: 'center', flexWrap: 'wrap' });

		this.top.appendChild(this.container);
		let iconButton: IconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.FRONT_FRONT, 'BRINGTOFRONT');
		this.iconDisposes.push(iconButton.onClick(() => this.front()));

		iconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.FRONT_FORWARD, 'BRINGFORWARD');
		this.iconDisposes.push(iconButton.onClick(() => this.forward()));

		iconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.FRONT_BACK, 'BRINGBACK');
		this.iconDisposes.push(iconButton.onClick(() => this.back()));

		iconButton = new IconButton(this.container);
		this.setStyle(iconButton, PR.FRONT_BACKWARD, 'BRINGTOBOTTOM');
		this.iconDisposes.push(iconButton.onClick(() => this.backward()));

	}

	setStyle(iconButton: IconButton, iconClass: string = '', title: string = ''): void {
		iconButton.iconClass = `icon-button ${iconClass}`;
		iconButton.toolTip = title;
		const element: HTMLElement = iconButton.getElement();
		element.style.marginLeft = '5px';
		element.style.marginTop = '5px';
		element.style.marginBottom = '5px';
	}

	front(): void {
		this.callback('front');
	}
	forward(): void {
		this.callback('forward');
	}
	back(): void {
		this.callback('back');
	}
	backward(): void {
		this.callback('backward');
	}


	render(container: HTMLElement) {
		this.doRender(container);
	}

}