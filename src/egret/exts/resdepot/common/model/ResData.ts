import {ResPanel} from 'egret/exts/resdepot/views/ResPanel';

export class ResData extends egret.EventDispatcher {

	public constructor() {
		super();
	}

	public get clazz(): any {
		return ResPanel;
	}

	private _owner: any;
	public get owner(): any {
		return this._owner;
	}

	public set owner(value: any) {
		this._owner = value;
	}

	public get titleToolTip(): string {
		return this.path;
	}

	public get toolTip(): string {
		return this.path;
	}

	private _label: string = '';
	public get label(): string {
		return this._label;
	}

	public set label(value: string) {
		this._label = value;
	}

	private _path: string;
	public get path(): string {
		return this._path;
	}

	public set path(value: string) {
		this._path = value;
	}

	private _data: any;
	public get data(): any {
		return this._data;
	}

	public set data(value: any) {
		this._data = value;
	}

	public updateView() {
		if (this.owner && this.owner.dataProvider) {
			this.owner.dataProvider.itemUpdated(this);
		}
	}

	public get resPanel(): ResPanel {
		if (this.owner) {
			var index: number = this.owner.getDocumentIndex(this);
			return this.owner.getElementAt(index);
		}
		return null;
	}
}