import { IExplorerService } from './explorer';
import { FileStat } from './explorerModel';
import URI from 'egret/base/common/uri';

export class ExplorerService implements IExplorerService {
	_serviceBrand: undefined;

	private _impl: IExplorerService = null;
	init(impl: IExplorerService): void {
		this._impl = impl;
	}
	getFileSelection(): FileStat[] {
		if(this._impl) {
			return this._impl.getFileSelection();
		}
		return [];
	}
	getRoot(): URI {
		if(this._impl) {
			return this._impl.getRoot();
		}
		return null;
	}
	getFirstSelectedFolder(): URI {
		if(this._impl) {
			return this._impl.getFirstSelectedFolder();
		}
	}
	select(resource: URI, reveal: boolean): Promise<void> {
		if(this._impl) {
			return this._impl.select(resource, reveal);
		}
		return Promise.resolve();
	}

}