var Theme = (function () {
    function Theme(parseSkinName,getStyle) {
        this.parseSkinName = parseSkinName;
        this.getStyle = getStyle;
    }
    var d = __define,c=Theme;p=c.prototype;
    p.getSkinName = function (client) {
        return this.parseSkinName(client);
    };
    p.$getStyleConfig = function (style){
        return this.getStyle(style);
    }
    return Theme;
})();
egret.registerClass(Theme,"Theme");
