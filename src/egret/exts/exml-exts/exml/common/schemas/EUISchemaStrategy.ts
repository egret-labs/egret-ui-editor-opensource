import { BaseSchemaStrategy } from './BaseSchemaStrategy';
import { ISchemaStrategy } from './ISchemaStrategy';
import { Namespace } from '../sax/Namespace';
import { EUI, W_GUI } from '../project/parsers/core/commons';

/**
 * GUI的exml规范策略
 */
export class EUISchemaStrategy extends BaseSchemaStrategy implements ISchemaStrategy {
	/**
     * 工作的命名空间，具体子类重写
     */
	public get guiNS(): Namespace {
		return EUI;
	}
	/**
     * GUI的命名空间，具体子类重写
     */
	public get workNS(): Namespace {
		return W_GUI;
	}
}
