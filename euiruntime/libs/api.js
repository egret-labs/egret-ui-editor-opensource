var pauseGlobalFlag = true;
var callbackCache = null;
var resumeOnceFlag = false;

var requestAnimationFrameCache = window["requestAnimationFrame"] ||
	window["webkitRequestAnimationFrame"] ||
	window["mozRequestAnimationFrame"] ||
	window["oRequestAnimationFrame"] ||
	window["msRequestAnimationFrame"];
if (!requestAnimationFrameCache) {
	requestAnimationFrameCache = function (callback) {
		return window.setTimeout(callback, 1000 / 60);
	};
}

window["requestAnimationFrame"] = function (callback) {
	if (pauseGlobalFlag && resumeOnceFlag) { //如果暂停了，并且标记了需要运行一次
		resumeOnceGlobalTimes++;
		if(resumeOnceGlobalTimes == 200){
			resumeOnceFlag = false; //取消标记
		}
		return requestAnimationFrameCache(callback);
	}
	resumeOnceFlag = false; 
	if (pauseGlobalFlag) {
		callbackCache = callback;
		return -1;
	} else {
		return requestAnimationFrameCache(callback);
	}
}


var pauseGlobal = function () {
	pauseGlobalFlag = true;
}
var resumeGlobal = function () {
	pauseGlobalFlag = false;
	if (callbackCache) {
		callbackCache();
		callbackCache = null;
	}
}



var resumeOnceGlobalTimes = 0;
var resumeOnceGlobal = function () {
	if (!pauseGlobalFlag) { //如果没有暂停，则不存在仅运行一次的可能
		return;
	}
	resumeOnceGlobalTimes = 0;
	resumeOnceFlag = true;
	if (callbackCache) {
		callbackCache();
	}
}

var oldDefineProperty = Object.defineProperty;
Object.defineProperty = function(host, property, data){
	if(host && typeof host == 'object'){
		oldDefineProperty(host,property,data);
	}
}
var oldRegisterBindable = eui.registerBindable;
eui.registerBindable = function(host, property){
	if(host && typeof host == 'object'){
		oldRegisterBindable(host,property);
	}
}
var oldReset = eui.Watcher.prototype.reset;
Object.defineProperty(eui.Watcher.prototype, 'reset', {
	configurable: true,
	value: function (newHost) {
		if(newHost && typeof newHost == 'object'){
			oldReset.call(this,newHost);
		}
	}
});


//将显示对象绘制成data:URL的字符串
var drawDisplayObject = function (dragImageObject) {
	var forEachChild = function (displayObject, callback) {
		var containter = displayObject;
		if (containter.$children) {
			containter.$children.forEach(function (it, idx) { return forEachChild(it, callback); });
		}
		callback(displayObject);
	}

	try {
		var tempDisplayList = egret.sys.DisplayList.create(dragImageObject);
		var bounds = dragImageObject.getTransformedBounds(dragImageObject.stage);
		var rootMatrix = new egret.Matrix(1, 0, 0, 1, -bounds.x, -bounds.y);
		tempDisplayList.setClipRect(Math.abs(bounds.x) + bounds.width, Math.abs(bounds.y) + bounds.height);
		forEachChild(dragImageObject, function (it) { return it.$renderRegion && tempDisplayList.markDirty(it); });
		tempDisplayList.$update();
		forEachChild(dragImageObject, function (it) { return rootMatrix.$preMultiplyInto(it.$renderMatrix, it.$renderMatrix); });
		tempDisplayList.drawToSurface();
		rootMatrix.invert();
		forEachChild(dragImageObject, function (it) { return rootMatrix.$preMultiplyInto(it.$renderMatrix, it.$renderMatrix); });
		var imageData = tempDisplayList.surface.toDataURL();
		egret.sys.DisplayList.release(tempDisplayList);
		return imageData;
	} catch (e) {
		return null;
	}
}

//检查exml是否有xml语法错误
var validate = function (text) {
	try {
		egret.XML.parse(text);
		return null;
	} catch (e) {
		return e.message;
	}
}

var parse = function (text) {
	try {
		return EXML.parse(text);
	} catch (e) {
		return e.message;
	}
}

var registerTheme = function (getSkin, getStyle) {
	egret_stages[0].registerImplementation("eui.Theme", new Theme(getSkin, getStyle));
}

var registerTSClass = function (className, classData, propertyData) {
	var superClassName = classData ? classData["super"] : null;
	var moduleList = className.split(".");
	var classShortName = moduleList.pop();
	var moduleLength = moduleList.length;
	var moduleName;
	var classString = "";
	for (var i = 0; i < moduleLength; i++) {
		moduleName = moduleList[i];
		classString += "var " + moduleName + ";\n";
		classString += "(function (" + moduleName + ") {\n";
	}
	classString += "var " + classShortName + " = (function (" + (superClassName ? "_super" : "") + ") {\n";
	if (superClassName)
		classString += "__extends(" + classShortName + ", _super);\n";
	classString += "function " + classShortName + "(){\n";
	if (superClassName)
		classString += "_super.call(this);\n";

	//添加属性
	if (classData) {
		for (var prop in classData) {
			if (prop != "super" && prop != "implements") {
				var defaultValue = propertyData[prop];
				var type = classData[prop];
				if (type == 'string' || type == 'number' || type == 'boolean') {
					defaultValue = defaultValue ? defaultValue : "\"\"";
				} else {
					defaultValue = "\"\"";
				}
				classString += "this." + prop + " = " + defaultValue + ";\n";
			}
		}
	}

	classString += "}\n";
	classString += "return " + classShortName + ";\n";
	if (superClassName)
		classString += "})(" + superClassName + ");\n";
	else
		classString += "})();\n";
	if (moduleLength > 0)
		classString += moduleList[moduleLength - 1] + "." + classShortName + " = " + classShortName + ";\n";
	if (classData.implements) {
		var implements = '[';
		for (i = 0; i < classData.implements.length; i++) {
			var currentInterface = classData.implements[i];
			implements += '\"' + currentInterface + '\"';
			if (i != classData.implements.length - 1) {
				implements += ',';
			}
		}
		implements += ']';
		classString += "egret.registerClass(" + classShortName + ",\"" + className + "\"," + implements + ");\n";
	} else {
		classString += "egret.registerClass(" + classShortName + ",\"" + className + "\");\n";
	}

	for (i = moduleLength - 1; i >= 0; i--) {
		moduleName = moduleList[i];
		var lookupModuleName = (i == 0) ? "" : moduleList[i - 1];
		if (lookupModuleName) {
			var comboModuleName = lookupModuleName + "." + moduleName;
			classString += "})(" + moduleName + " = " + comboModuleName + " || (" + comboModuleName + " = {}))\n";
		} else {
			classString += "})(" + moduleName + " || (" + moduleName + " = {}))\n";
		}
	}
	delete className;
	egret.cleanCache();
	try {
		window.eval(classString);
	} catch (e) {
	}
}

egret.$error = function (code) {
	var text = egret.sys.tr.apply(null, arguments);
	console.warn(text);
};

//覆盖$getVirtualUrl，确保不是从浏览器缓存加载资源
RES.$getVirtualUrl = function (url) {
	return url + "?" + Math.random();
}

egret.toColorString = function (value) {
	if (!value)
		value = 0;
	if (value < 0)
		value = 0;
	if (value > 16777215)
		value = 16777215;
	var color = value.toString(16).toUpperCase();
	while (color.length > 6) {
		color = color.slice(1, color.length);
	}
	while (color.length < 6) {
		color = "0" + color;
	}
	return "#" + color;
}

window.document.addEventListener("mousemove", function (event) {
	dispatchParentMouseEvent(event);
}, false);
window.document.addEventListener("mouseup", function (event) {
	dispatchParentMouseEvent(event);
}, false);
function dispatchParentMouseEvent(event) {
	if (window.iframe) {
		var offsetX = window.iframe.getBoundingClientRect().left;
		var offsetY = window.iframe.getBoundingClientRect().top;
		window.iframe.parentElement.parentElement
		var mouseMoveEvent = document.createEvent("MouseEvents");
		mouseMoveEvent.initMouseEvent(
			event.type,
			event.cancelBubble, //canBubble
			event.cancelable, //cancelable
			document.defaultView, //event's AbstractView : should be window
			1, // detail : Event's mouse click count
			event.screenX, // screenX
			event.screenY, // screenY
			event.pageX + offsetX, // clientX
			event.pageY + offsetY, // clientY
			event.ctrlKey, // ctrlKey
			event.altKey, // altKey
			event.shiftKey, // shiftKey
			event.metaKey, // metaKey
			event.button, // button : 0 = click, 1 = middle button, 2 = right button
			null // relatedTarget : Only used with some event types (e.g. mouseover and mouseout). In other cases, pass null.
		);
		window.iframe.parentElement.parentElement.parentElement.dispatchEvent(mouseMoveEvent)
	}
}

//覆盖cacheAsBitmap方法。 该方法在该版本引擎里有bug。
Object.defineProperty(egret.DisplayObject.prototype, "cacheAsBitmap", {
	get: function () {
		if (!this.$DisplayObject) {
			this.$DisplayObject = {};
		}
		return this.$DisplayObject[11 /* cacheAsBitmap */];
	},
	set: function (value) {
		value = !!value;
		if (!this.$DisplayObject) {
			this.$DisplayObject = {};
		}
		this.$DisplayObject[11 /* cacheAsBitmap */] = value;
	}
})


Object.defineProperty(egret.web.WebHttpRequest.prototype, 'onReadyStateChange', {
	configurable: true,
	value: function () {
		var xhr = this._xhr;
		if (xhr.readyState == 4) {
			var ioError = (xhr.status >= 400);
			var url = this._url;
			var self = this;
			window.setTimeout(function () {
				if (ioError) {
					if (DEBUG && !self.hasEventListener(egret.IOErrorEvent.IO_ERROR)) {
						egret.$error(1011, url);
					}
					self.dispatchEventWith(egret.IOErrorEvent.IO_ERROR);
				}
				else {
					self.dispatchEventWith(egret.Event.COMPLETE);
				}
			}, 0);
		}
	}
});

Object.defineProperty(egret.web.WebImageLoader.prototype, 'loadImage', {
	configurable: true,
	value: function (src) {
		var image = null
		try {
			image = new Image();
		} catch (error) { }
		this.data = null;
		if (image) {
			this.currentImage = image;
			if (this._hasCrossOriginSet) {
				if (this._crossOrigin) {
					image.crossOrigin = this._crossOrigin;
				}
			}
			else {
				if (egret.web.WebImageLoader.crossOrigin) {
					image.crossOrigin = egret.web.WebImageLoader.crossOrigin;
				}
			}
			image.onload = this.onImageComplete.bind(this);
			image.onerror = this.onLoadError.bind(this);
			image.src = src;
		}
	}
});