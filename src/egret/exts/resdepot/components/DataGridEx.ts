import { IResEventService } from '../events/ResEventService';

/**
 * wing3.0之后的新DataGridEx，处理一些特殊情况
 */
export class DataGridEx extends eui.DataGrid {
	public constructor(
		@IResEventService private resEventService: IResEventService) {
		super();
	}
}