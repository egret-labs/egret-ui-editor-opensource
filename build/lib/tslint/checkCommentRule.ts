import * as ts from 'typescript';
import * as Lint from 'tslint';
import * as fs from 'fs';
import { FileInputRegistry } from 'egret/editor/inputRegistry';

/**
 * 注释规则检查
 */
export class Rule extends Lint.Rules.AbstractRule {
	/**
	 * 应用
	 * @param sourceFile 
	 */
	public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
		return this.applyWithWalker(new CommentWalker(sourceFile, this.getOptions()));
	}
}


class CommentWalker extends Lint.RuleWalker {
	private contentChinese(str: string): boolean {
		for (var i = 0; i < str.length; i++) {
			if (/^[\u3220-\uFA29]+$/.test(str.charAt(i))) {
				return true;
			}
		}
		return false;
	}

	private getEnd(text: string): number {
		var end: number = -1;
		var ends: number[] = [];
		var end1 = text.indexOf('{'); ends.push(end1);
		var end2 = text.indexOf(';'); ends.push(end2);
		var end3 = text.indexOf('\r'); ends.push(end3);
		var end4 = text.indexOf('\n'); ends.push(end4);
		for (var i = 0; i < ends.length; i++) {
			if (ends[i] != -1) {
				if (end == -1 || ends[i] < end) {
					end = ends[i];
				}
			}
		}
		return end;
	}

	protected visitFunctionDeclaration(node: ts.FunctionDeclaration): void {
		let nodeText = node.getText();
		if (nodeText.indexOf('export') == 0) {
			var start = node.getStart();
			var end = this.getEnd(nodeText);

			var commentRanges = ts.getLeadingCommentRanges(node.getSourceFile().getFullText(), node.getFullStart());
			if (commentRanges && commentRanges.length > 0) {
				var commentRange = commentRanges[commentRanges.length - 1];
				var comment = node.getSourceFile().getFullText().slice(commentRange.pos, commentRange.end);
				if (!comment) {
					this.addFailure(this.createFailure(start, end, 'export方法注释的内容不得为空'));
				} else if (!this.contentChinese(comment)) {
					this.addFailure(this.createFailure(start, end, 'export方法注释的内容必须包含中文'));
				}
			}
			let memberText = node.getText();
			if (!commentRanges || commentRanges.length == 0) {
				this.addFailure(this.createFailure(start, end, 'export方法必须添加Doc注释'));
			}
		}
		super.visitFunctionDeclaration(node);
	}

	protected visitEnumDeclaration(node: ts.EnumDeclaration): void {
		let nodeText = node.getText();
		if (nodeText.indexOf('export') == 0) {
			var start = node.getStart();
			var end = this.getEnd(nodeText);
			var jsdocs = ts.getJSDocTags(node);

			if (jsdocs && jsdocs.length > 0) {
				var jsdocTag = jsdocs[0];
				var jsDoc = jsdocTag.parent as ts.JSDoc;
				var comment = jsDoc.comment;
				if (!comment) {
					this.addFailure(this.createFailure(start, end, '枚举的Doc注释的内容不得为空'));
				} else if (!this.contentChinese(comment)) {
					this.addFailure(this.createFailure(start, end, '枚举的Doc注释的内容必须包含中文'));
				}
			}
		}

		super.visitEnumDeclaration(node);
	}

	protected visitInterfaceDeclaration(node: ts.InterfaceDeclaration): void {
		let nodeText = node.getText();
		if (nodeText.indexOf('export') == 0) {

			var start = node.getStart();
			var end = this.getEnd(nodeText);
			var jsdocs = ts.getJSDocTags(node);

			if (jsdocs && jsdocs.length > 0) {
				var jsdocTag = jsdocs[0];
				var jsDoc = jsdocTag.parent as ts.JSDoc;
				var comment = jsDoc.comment;
				if (!comment) {
					this.addFailure(this.createFailure(start, end, '接口的Doc注释的内容不得为空'));
				} else if (!this.contentChinese(comment)) {
					this.addFailure(this.createFailure(start, end, '接口的Doc注释的内容必须包含中文'));
				}
				var ignoreMember: boolean = false;

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
				let members: ts.NodeArray<ts.Node> = node.members;
				var checkedMember: { [name: string]: boolean } = {};
				members.forEach((member) => {
					var commentRanges = ts.getLeadingCommentRanges(member.getSourceFile().getFullText(), member.getFullStart());
					if (commentRanges && commentRanges.length > 0) {
						var commentRange = commentRanges[commentRanges.length - 1];
						var comment = member.getSourceFile().getFullText().slice(commentRange.pos, commentRange.end);
						if (!comment) {
							this.addFailure(this.createFailure(member.getStart(), member.getEnd() - member.getStart(), '接口注释的内容不得为空'));
						} else if (!this.contentChinese(comment)) {
							this.addFailure(this.createFailure(member.getStart(), member.getEnd() - member.getStart(), '接口注释的内容必须包含中文'));
						}
					}
					let memberText = member.getText();
					var name: string = memberText.split('(')[0].split('<')[0].split(':')[0];
					var has = false;
					if (name in checkedMember) {
						has = true;
					} else {
						checkedMember[name] = true;
					}
					if ((!commentRanges || commentRanges.length == 0) && memberText.length > 0 && memberText.charAt(0) != '_' && !has) {
						this.addFailure(this.createFailure(member.getStart(), member.getEnd() - member.getStart(), '接口中所有的方法或属性都必须添加Doc注释'));
					}
				});
			}
		}
		super.visitInterfaceDeclaration(node);
	}

	protected visitClassDeclaration(node: ts.ClassDeclaration): void {
		let nodeText = node.getText();
		if (nodeText.indexOf('export') == 0) {
			var start = node.getStart();
			var end = this.getEnd(nodeText);
			var jsdocs = ts.getJSDocTags(node);

			if (jsdocs && jsdocs.length > 0) {
				var jsdocTag = jsdocs[0];
				var jsDoc = jsdocTag.parent as ts.JSDoc;
				var comment = jsDoc.comment;
				if (!comment) {
					this.addFailure(this.createFailure(start, end, '类的Doc注释的内容不得为空'));
				} else if (!this.contentChinese(comment)) {
					this.addFailure(this.createFailure(start, end, '类的Doc注释的内容必须包含中文'));
				}
				var ignoreMember: boolean = false;
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

				let members: ts.NodeArray<ts.Node> = node.members;
				var checkedMember: { [name: string]: boolean } = {};


				members.forEach((member) => {
					var commentRanges = ts.getLeadingCommentRanges(member.getSourceFile().getFullText(), member.getFullStart());
					if (commentRanges && commentRanges.length > 0) {
						var commentRange = commentRanges[commentRanges.length - 1];
						var comment = member.getSourceFile().getFullText().slice(commentRange.pos, commentRange.end);
						if (!comment) {
							this.addFailure(this.createFailure(member.getStart(), member.getEnd() - member.getStart(), 'Doc注释的内容不得为空'));
						} else if (!this.contentChinese(comment)) {
							this.addFailure(this.createFailure(member.getStart(), member.getEnd() - member.getStart(), 'Doc注释的内容必须包含中文'));
						}
					}
					let memberText = member.getText();

					if (memberText.indexOf('public') === 0) {
						var name: string = memberText.split('(')[0].split('<')[0].split(':')[0];
						var nameTmpArr = name.split(' ');
						if (nameTmpArr.length > 0) {
							name = nameTmpArr[nameTmpArr.length - 1];
						}
						
						var has = false;
						if (name in checkedMember) {
							has = true;
						} else {
							checkedMember[name] = true;
						}
						if ((!commentRanges || commentRanges.length == 0) && name.charAt(0) != '_' && !has) {
							var words = memberText.split(' ');
							//为set方法做特殊处理
							if (words.length > 1 && words[1].replace(/(^\s*)|(\s*$)/g, '') == 'set') {
							} else {
								this.addFailure(this.createFailure(member.getStart(), member.getEnd() - member.getStart(), '所有公开方法或属性都必须添加Doc注释'));
							}
						}
					}
				});
			}
		}
		super.visitClassDeclaration(node);
	}
}