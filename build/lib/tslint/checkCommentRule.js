"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var ts = require("typescript");
var Lint = require("tslint");
/**
 * 注释规则检查
 */
var Rule = /** @class */ (function (_super) {
    __extends(Rule, _super);
    function Rule() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /**
     * 应用
     * @param sourceFile
     */
    Rule.prototype.apply = function (sourceFile) {
        return this.applyWithWalker(new CommentWalker(sourceFile, this.getOptions()));
    };
    return Rule;
}(Lint.Rules.AbstractRule));
exports.Rule = Rule;
var CommentWalker = /** @class */ (function (_super) {
    __extends(CommentWalker, _super);
    function CommentWalker() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CommentWalker.prototype.contentChinese = function (str) {
        for (var i = 0; i < str.length; i++) {
            if (/^[\u3220-\uFA29]+$/.test(str.charAt(i))) {
                return true;
            }
        }
        return false;
    };
    CommentWalker.prototype.getEnd = function (text) {
        var end = -1;
        var ends = [];
        var end1 = text.indexOf('{');
        ends.push(end1);
        var end2 = text.indexOf(';');
        ends.push(end2);
        var end3 = text.indexOf('\r');
        ends.push(end3);
        var end4 = text.indexOf('\n');
        ends.push(end4);
        for (var i = 0; i < ends.length; i++) {
            if (ends[i] != -1) {
                if (end == -1 || ends[i] < end) {
                    end = ends[i];
                }
            }
        }
        return end;
    };
    CommentWalker.prototype.visitFunctionDeclaration = function (node) {
        var nodeText = node.getText();
        if (nodeText.indexOf('export') == 0) {
            var start = node.getStart();
            var end = this.getEnd(nodeText);
            var commentRanges = ts.getLeadingCommentRanges(node.getSourceFile().getFullText(), node.getFullStart());
            if (commentRanges && commentRanges.length > 0) {
                var commentRange = commentRanges[commentRanges.length - 1];
                var comment = node.getSourceFile().getFullText().slice(commentRange.pos, commentRange.end);
                if (!comment) {
                    this.addFailure(this.createFailure(start, end, 'export方法注释的内容不得为空'));
                }
                else if (!this.contentChinese(comment)) {
                    this.addFailure(this.createFailure(start, end, 'export方法注释的内容必须包含中文'));
                }
            }
            var memberText = node.getText();
            if (!commentRanges || commentRanges.length == 0) {
                this.addFailure(this.createFailure(start, end, 'export方法必须添加Doc注释'));
            }
        }
        _super.prototype.visitFunctionDeclaration.call(this, node);
    };
    CommentWalker.prototype.visitEnumDeclaration = function (node) {
        var nodeText = node.getText();
        if (nodeText.indexOf('export') == 0) {
            var start = node.getStart();
            var end = this.getEnd(nodeText);
            var jsdocs = ts.getJSDocTags(node);
            if (jsdocs && jsdocs.length > 0) {
                var jsdocTag = jsdocs[0];
                var jsDoc = jsdocTag.parent;
                var comment = jsDoc.comment;
                if (!comment) {
                    this.addFailure(this.createFailure(start, end, '枚举的Doc注释的内容不得为空'));
                }
                else if (!this.contentChinese(comment)) {
                    this.addFailure(this.createFailure(start, end, '枚举的Doc注释的内容必须包含中文'));
                }
            }
        }
        _super.prototype.visitEnumDeclaration.call(this, node);
    };
    CommentWalker.prototype.visitInterfaceDeclaration = function (node) {
        var _this = this;
        var nodeText = node.getText();
        if (nodeText.indexOf('export') == 0) {
            var start = node.getStart();
            var end = this.getEnd(nodeText);
            var jsdocs = ts.getJSDocTags(node);
            if (jsdocs && jsdocs.length > 0) {
                var jsdocTag = jsdocs[0];
                var jsDoc = jsdocTag.parent;
                var comment = jsDoc.comment;
                if (!comment) {
                    this.addFailure(this.createFailure(start, end, '接口的Doc注释的内容不得为空'));
                }
                else if (!this.contentChinese(comment)) {
                    this.addFailure(this.createFailure(start, end, '接口的Doc注释的内容必须包含中文'));
                }
                var ignoreMember = false;
                if (jsDoc.tags) {
                    for (var i = 0; i < jsDoc.tags.length; i++) {
                        if (jsDoc.tags[i].tagName && jsDoc.tags[i].tagName.escapedText && jsDoc.tags[i].tagName.escapedText.toString() === 'tslint') {
                            if (jsDoc.tags[i].comment == 'false') {
                                ignoreMember = true;
                            }
                        }
                    }
                }
            }
            if (!ignoreMember) {
                var members = node.members;
                var checkedMember = {};
                members.forEach(function (member) {
                    var commentRanges = ts.getLeadingCommentRanges(member.getSourceFile().getFullText(), member.getFullStart());
                    if (commentRanges && commentRanges.length > 0) {
                        var commentRange = commentRanges[commentRanges.length - 1];
                        var comment = member.getSourceFile().getFullText().slice(commentRange.pos, commentRange.end);
                        if (!comment) {
                            _this.addFailure(_this.createFailure(member.getStart(), member.getEnd() - member.getStart(), '接口注释的内容不得为空'));
                        }
                        else if (!_this.contentChinese(comment)) {
                            _this.addFailure(_this.createFailure(member.getStart(), member.getEnd() - member.getStart(), '接口注释的内容必须包含中文'));
                        }
                    }
                    var memberText = member.getText();
                    var name = memberText.split('(')[0].split('<')[0].split(':')[0];
                    var has = false;
                    if (name in checkedMember) {
                        has = true;
                    }
                    else {
                        checkedMember[name] = true;
                    }
                    if ((!commentRanges || commentRanges.length == 0) && memberText.length > 0 && memberText.charAt(0) != '_' && !has) {
                        _this.addFailure(_this.createFailure(member.getStart(), member.getEnd() - member.getStart(), '接口中所有的方法或属性都必须添加Doc注释'));
                    }
                });
            }
        }
        _super.prototype.visitInterfaceDeclaration.call(this, node);
    };
    CommentWalker.prototype.visitClassDeclaration = function (node) {
        var _this = this;
        var nodeText = node.getText();
        if (nodeText.indexOf('export') == 0) {
            var start = node.getStart();
            var end = this.getEnd(nodeText);
            var jsdocs = ts.getJSDocTags(node);
            if (jsdocs && jsdocs.length > 0) {
                var jsdocTag = jsdocs[0];
                var jsDoc = jsdocTag.parent;
                var comment = jsDoc.comment;
                if (!comment) {
                    this.addFailure(this.createFailure(start, end, '类的Doc注释的内容不得为空'));
                }
                else if (!this.contentChinese(comment)) {
                    this.addFailure(this.createFailure(start, end, '类的Doc注释的内容必须包含中文'));
                }
                var ignoreMember = false;
                if (jsDoc.tags) {
                    for (var i = 0; i < jsDoc.tags.length; i++) {
                        if (jsDoc.tags[i].tagName && jsDoc.tags[i].tagName.escapedText && jsDoc.tags[i].tagName.escapedText.toString() === 'tslint') {
                            if (jsDoc.tags[i].comment == 'false') {
                                ignoreMember = true;
                            }
                        }
                    }
                }
            }
            if (!ignoreMember) {
                var members = node.members;
                var checkedMember = {};
                members.forEach(function (member) {
                    var commentRanges = ts.getLeadingCommentRanges(member.getSourceFile().getFullText(), member.getFullStart());
                    if (commentRanges && commentRanges.length > 0) {
                        var commentRange = commentRanges[commentRanges.length - 1];
                        var comment = member.getSourceFile().getFullText().slice(commentRange.pos, commentRange.end);
                        if (!comment) {
                            _this.addFailure(_this.createFailure(member.getStart(), member.getEnd() - member.getStart(), 'Doc注释的内容不得为空'));
                        }
                        else if (!_this.contentChinese(comment)) {
                            _this.addFailure(_this.createFailure(member.getStart(), member.getEnd() - member.getStart(), 'Doc注释的内容必须包含中文'));
                        }
                    }
                    var memberText = member.getText();
                    if (memberText.indexOf('public') === 0) {
                        var name = memberText.split('(')[0].split('<')[0].split(':')[0];
                        var nameTmpArr = name.split(' ');
                        if (nameTmpArr.length > 0) {
                            name = nameTmpArr[nameTmpArr.length - 1];
                        }
                        var has = false;
                        if (name in checkedMember) {
                            has = true;
                        }
                        else {
                            checkedMember[name] = true;
                        }
                        if ((!commentRanges || commentRanges.length == 0) && name.charAt(0) != '_' && !has) {
                            var words = memberText.split(' ');
                            //为set方法做特殊处理
                            if (words.length > 1 && words[1].replace(/(^\s*)|(\s*$)/g, '') == 'set') {
                            }
                            else {
                                _this.addFailure(_this.createFailure(member.getStart(), member.getEnd() - member.getStart(), '所有公开方法或属性都必须添加Doc注释'));
                            }
                        }
                    }
                });
            }
        }
        _super.prototype.visitClassDeclaration.call(this, node);
    };
    return CommentWalker;
}(Lint.RuleWalker));
