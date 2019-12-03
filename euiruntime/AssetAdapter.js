var AssetAdapter = (function () {
    function AssetAdapter() {
    }
    var d = __define,c=AssetAdapter,p=c.prototype;
    p.getAsset = function (source, callBack, thisObject) {
        function onGetRes(data) {
            callBack.call(thisObject, data, source);
        }
        if (RES.hasRes(source)) {
            var data = RES.getRes(source);
            if (data) {
                onGetRes(data);
            }
            else {
                RES.getResAsync(source, onGetRes, this);
            }
        }
        else {
            RES.getResByUrl(source, function (data) {
                onGetRes(data);
            }, this);
        }
    };
    return AssetAdapter;
})();
egret.registerClass(AssetAdapter,'AssetAdapter',["eui.IAssetAdapter"]);
