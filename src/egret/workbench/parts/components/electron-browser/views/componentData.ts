import { EUIExmlConfig } from 'egret/exts/exml-exts/exml/common/project/exmlConfigs';
import { ComponentStat } from '../../common/componentModel';
import { IEgretProjectService } from 'egret/exts/exml-exts/project';
import { localize } from 'egret/base/localization/nls';

/**
 * 创建组件数据
 */
export class ComponentSourceDataCreater{

	constructor(
		@IEgretProjectService private egretProjectService :IEgretProjectService
	){
	}
	/**
	 * 获得组件数据
	 */
	public getRoot() :Promise<ComponentStat>{
		return this.egretProjectService.ensureLoaded().then(()=>{
			if(!this.egretProjectService.exmlConfig){
				return Promise.resolve(new ComponentStat());
			}
			return this.egretProjectService.exmlConfig.ensureLoaded().then( () =>{
	
				const customClass = this.egretProjectService.exmlConfig.getCustomClasses();
				const defaultComponents = (this.egretProjectService.exmlConfig as EUIExmlConfig).getDefaultComponentsDirect();
				const defaultContainers =(this.egretProjectService.exmlConfig as EUIExmlConfig).getDefaultContainersDriect();
	
				const rootInput:ComponentStat = new ComponentStat();
				rootInput.isFolder = true;
	
				const customFolder:ComponentStat = new ComponentStat();
				customFolder.isFolder = true;
				customFolder.name = localize('componentSourceDataCreater.getRoot.custom', 'Custom');
				customFolder.id = 'custom';
				for (let index: number = 0; index < customClass.length; index++) {
					if (
						this.egretProjectService.exmlConfig.isInstanceOf(customClass[index].fullName, 'eui.UIComponent') ||
						this.egretProjectService.exmlConfig.isInstanceOf(customClass[index].fullName, 'eui.IViewport')
					){					
						const data:ComponentStat = new ComponentStat();
						data.isFolder = false;
						data.name = customClass[index].fullName;
						data.id = customClass[index].fullName;
						data.parent = customFolder;
						data.isCustom = true;
						customFolder.children.push(data);
					}
				}
	
				const componentFolder:ComponentStat = new ComponentStat();
				componentFolder.isFolder = true;
				componentFolder.name = localize('componentSourceDataCreater.getRoot.component', 'Component');
				componentFolder.id = 'component';
				defaultComponents.forEach(component=>{
					const data:ComponentStat = new ComponentStat();
					data.isFolder = false;
					data.name = component.id;
					data.id = component.id;
					data.parent = componentFolder;
					data.target = component;
					componentFolder.children.push(data);
				});
	
				const containerFolder:ComponentStat = new ComponentStat();
				containerFolder.isFolder = true;
				containerFolder.name = localize('componentSourceDataCreater.getRoot.container','Container');
				containerFolder.id = 'container';
				defaultContainers.forEach(component=>{
					const data:ComponentStat = new ComponentStat();
					data.isFolder = false;
					data.name = component.id;
					data.id = component.id;
					data.parent = containerFolder;
					data.target = component;
					containerFolder.children.push(data);
				});
	
				rootInput.children.push(customFolder);
				rootInput.children.push(componentFolder);
				rootInput.children.push(containerFolder);
	
				return rootInput;
			});
		});
	}
}