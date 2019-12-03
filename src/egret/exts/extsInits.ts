import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { initEditorExts as initExmlEditorExts } from './exml-exts/editor';
import { initProject as initExmlProject } from './exml-exts/project';
import { initExmlModel } from './exml-exts/models';


/**
 * 初始化扩展
 * @param instantiationService 
 */
export function initExtensions(instantiationService:IInstantiationService):void{
	/* -------- Exml --------  */
	initExmlEditorExts();
	initExmlProject(instantiationService);
	initExmlModel(instantiationService);
}