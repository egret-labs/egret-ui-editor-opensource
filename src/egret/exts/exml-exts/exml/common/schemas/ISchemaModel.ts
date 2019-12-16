import { SchemaDecoder } from '../core/Schema';

import { SchemaContentAssist } from './SchemaContentAssist';
import { ISchemaStrategy } from './ISchemaStrategy';

/**
 * xsd规范校验数据接口
 */
export interface ISchemaModel {
    /**
     * 安装Xsd规范数据层
     * @param schemaStrategy
     */
	install(schemaStrategy: ISchemaStrategy): void;
    /**
     * 卸载Xsd规范数据层
     */
	uninstall(): void;
    /** 
     * xsd解析器 
     */
	schemaDecoder: SchemaDecoder;
    /**
     * 规则内容助手 
     */
	contentAssist: SchemaContentAssist;
}