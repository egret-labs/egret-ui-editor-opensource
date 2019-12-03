var RuntimeRootContainer = (function (_super) {
    __extends(RuntimeRootContainer, _super);
    function RuntimeRootContainer() {
        _super.apply(this, arguments);
    }
    var d = __define,c=RuntimeRootContainer;p=c.prototype;
    p.childrenCreated = function () {
        _super.prototype.childrenCreated.call(this);
        this.stage.registerImplementation("eui.IAssetAdapter", new AssetAdapter());
    };
    return RuntimeRootContainer;
})(eui.Group);
egret.registerClass(RuntimeRootContainer,"RuntimeRootContainer");
