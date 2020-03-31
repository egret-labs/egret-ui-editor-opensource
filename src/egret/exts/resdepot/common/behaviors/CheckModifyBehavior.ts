import * as fsextra from 'fs-extra';

/**
 * 检测修改
 *
 */
export class CheckModifyBehavior extends egret.HashObject {
	public onLoad: Function;
	public onExist: Function;
	public onClean: Function;

	public constructor() {
		super();
		// xxx.stage.addEventListener(egret.Event.ACTIVATE, this.activateHandler, this);
	}

	protected activateHandler(event: egret.Event) {
		this.checkFile();
	}

	private _modify: boolean = false;
	public setModify(modify: boolean) {
		this._modify = modify;
	}

	private _currentData: string = '';
	private _path: string = '';
	/**
	 * 设置打开的文件地址，用于检测是否文件被其他软件修改了
	 * @param path
	 *
	 */
	public setFilePath(path: string) {
		var _self = this;
		this._path = path;
		fsextra.readFile(path, 'utf-8').then((content: string) => {
			_self._currentData = content;// 以字符串形式读文件
		});
	}
	/**
	 * 当软件获得焦点的时候，调用一下这个方法，检测文件修改
	 *
	 */
	private checkFile() {
		if (!this._path) {
			return;
		}
		var _self = this;
		fsextra.readFile(this._path, 'utf-8').then((content: string) => {
			var fileStr: string = content;
			if (fileStr === '') {
				_self.onFileNoExistHandler();
			} else if (fileStr !== _self._currentData) {
				_self.onFileModifiedHandler(_self._modify);
			}
		});
	}

	private _prompted: boolean = false;
	private onFileModifiedHandler(currentModified: boolean) {
		// var _self__: any = this;
		if (currentModified && !this._prompted) {
			this._prompted = true;
			// eui.Alert['show']((egret.utils.tr('CheckModify.BothModify',this._path)),(egret.utils.tr('CheckModify.Title')),null,function (e:eui.CloseEvent)
			// {
			//     if(e.detail == FIRST_BUTTON)
			//     {
			//         if(_self__.onLoad != null)
			//             _self__.onLoad(_self__._path);
			//     }
			//     _self__._prompted = false;
			// },(egret.utils.tr('Alert.Confirm')),(egret.utils.tr('Alert.Cancel')));
		}
		else if (!currentModified && !this._prompted) {
			this._prompted = true;
			// eui.Alert['show']((egret.utils.tr('CheckModify.Modify',this._path)),(egret.utils.tr('CheckModify.Title')),null,function (e:eui.CloseEvent)
			// {
			//     if(e.detail == FIRST_BUTTON)
			//     {
			//         if(_self__.onLoad != null)
			//             _self__.onLoad(_self__._path);
			//     }
			//     _self__._prompted = false;
			// },(egret.utils.tr('Alert.Confirm')),(egret.utils.tr('Alert.Cancel')));
		}
	}

	private onFileNoExistHandler() {
		// var _self__: any = this;
		if (!this._prompted) {
			this._prompted = true;
			// eui.Alert['show']((egret.utils.tr('CheckModify.Deleted',this._path)),(egret.utils.tr('CheckModify.Title')),null,function (e:eui.CloseEvent)
			// {
			//     if(e.detail == FIRST_BUTTON)
			//     {
			//         if(_self__.onExist != null)
			//             _self__.onExist();
			//         _self__._path = '';
			//     }
			//     else if(e.detail == SECOND_BUTTON)
			//     {
			//         if(_self__.onClean != null)
			//             _self__.onClean();
			//     }
			//     _self__._prompted = false;
			// },(egret.utils.tr('Alert.Yes')),(egret.utils.tr('Alert.No')));
		}
	}

	public dispose() {
		//flash.NativeApplication['nativeApplication'].removeEventListener(egret.Event.ACTIVATE,flash.bind(this.activateHandler,this));
		this.onLoad = null;
		this.onExist = null;
		this.onClean = null;
	}
}
