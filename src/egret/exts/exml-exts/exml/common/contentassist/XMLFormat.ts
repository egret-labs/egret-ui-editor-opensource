import * as StringUtil from '../utils/strings';

export type FormatResult = {
	text: string;
	formatedText: string;
	formatedStart: number;
	formatedEnd: number
};

/**
 * xml格式化工具
 */
export class XMLFormatUtil {
	private static instance: XMLFormatUtil = new XMLFormatUtil();
	/**
	 * 格式化xml文本
	 * @param text 完整xml
	 * @param startIndex 要格式化的起始索引
	 * @param endIndex 要格式化的结束索引
	 * @param useTab 使用tab缩进
	 * @param indentNum 缩进数量
	 * @param lineWidth 行宽
	 * @param splitAttribute 分割多个属性，使每个属性位于一个新行上
	 * @param addSpaceToRight 在右空结束标签的前面插入空格
	 * @param lineBreak 换行符
	 * @return {text:string,formatedText:string,formatedStart:number,formatedEnd:number}<p>
	 * 注意，返回的对象有可能是null
	 * <li>text: 格式化完成之后的全部字符串
	 * <li>formatedText: 被格式化的字符串
	 * <li>formatedStart: 被格式化的部分在传入的总字符串中的起始位置
	 * <li>formatedEnd: 被格式化的部分在传入的总字符串中的结束位置
	 */
	public static format(text: string, startIndex: number, endIndex: number,
		useTab: Boolean, indentNum: number, lineWidth: number, splitAttribute: Boolean,
		addSpaceToRight: Boolean, lineBreak: string = '\n'): FormatResult {
		return XMLFormatUtil.instance.format(text, startIndex, endIndex, useTab, indentNum, lineWidth, splitAttribute, addSpaceToRight, lineBreak);
	}

	public static START_NODE: string = 'startNode';
	public static END_NODE: string = 'endNode';
	public static SAMPLE_FULL_NODE: string = 'sampleFullNode';
	public static MUTIL_FULL_NODE: string = 'mutilFullNode';
	public static NOTE: string = 'note';
	public static HEAD: string = 'head';
	public static CDATA: string = 'cdata';
	public static ERROR: string = 'error';
	/**
	 * 格式化xml文本
	 * @param text 完整xml
	 * @param startIndex 要格式化的起始索引
	 * @param endIndex 要格式化的结束索引
	 * @param useTab 使用tab缩进
	 * @param indentNum 缩进数量
	 * @param lineWidth 行宽
	 * @param splitAttribute 分割多个属性，使每个属性位于一个新行上
	 * @param addSpaceToRight 在右空结束标签的前面插入空格
	 * @param lineBreak 换行符
	 * @return {text:string,formatedText:string,formatedStart:number,formatedEnd:number}<p>
	 * 注意，返回的对象有可能是null
	 * <li>text: 格式化完成之后的全部字符串
	 * <li>formatedText: 被格式化的字符串
	 * <li>formatedStart: 被格式化的部分在传入的总字符串中的起始位置
	 * <li>formatedEnd: 被格式化的部分在传入的总字符串中的结束位置
	 */
	public format(text: string, startIndex: number, endIndex: number,
		useTab: Boolean, indentNum: number, lineWidth: number, splitAttribute: Boolean,
		addSpaceToRight: Boolean, lineBreak: string = '\n'): FormatResult {
		if (startIndex === endIndex) { return null; }
		if (endIndex - startIndex === 1) { return null; }

		/*----------1.将region修复到一个正好全中了完整节点的范围。----------*/
		var fixedStart: number = this.getFixedRegionStart(text, startIndex);
		var fixedEnd: number = this.getFixedRegionEnd(text, endIndex);
		//如果得到的修复范围不合法。则直接返回
		if (fixedStart < 0 || fixedEnd < 0 || fixedEnd <= fixedStart) { return null; }

		/*----------2.将修复好的范围的字符串以半个节点为最小单位拆成数组----------*/
		var xmlNodes: string[] = this.sliceXmlToArray(text.slice(fixedStart, fixedEnd));
		if (xmlNodes.length === 0) { return null; }
		//修复由字符串而非子节点组成节点值。
		this.fixXmlNodesValue(xmlNodes);


		/*----------3.计算出要格式化部分的起始缩进字符串----------*/
		var startIndentStr: string = this.getCurrentNodeIndentString(text, fixedStart);

		/*----------4.为数组内每一项内容计算应该的缩进数量----------*/
		this.fixXmlNodesIndent(xmlNodes, useTab, indentNum, startIndentStr);

		/*----------5.格式化数组中每一项的细节----------*/
		for (var i: number = 0; i < xmlNodes.length; i++) {
			xmlNodes[i] = this.fixXmlNodeDetail(xmlNodes[i], lineWidth, splitAttribute, addSpaceToRight, lineBreak);
		}

		/*----------6.将格式化好的字符串拼回原始文本中----------*/
		var newText: string = '';
		for (i = 0; i < xmlNodes.length; i++) {
			if (i === 0) {
				newText += xmlNodes[i];
			} else {
				newText += lineBreak + xmlNodes[i];
			}
		}
		if (newText.indexOf(startIndentStr) === 0 && startIndentStr.length > 0) {
			newText = newText.slice(startIndentStr.length);
		}

		var resultText: string = text.slice(0, fixedStart) + newText + text.slice(fixedEnd);
		var obj: FormatResult = { text: resultText, formatedText: newText, formatedStart: fixedStart, formatedEnd: fixedEnd };
		return obj;
	}

	/**
	 * 得到修复到完整节点位置的区域的起始索引
	 * @param text 全部文本
	 * @param index 当前索引位置
	 * @return
	 */
	private getFixedRegionStart(text: string, index: number): number {
		var flag1: Boolean = false;
		var flag2: Boolean = false;
		//往前找
		for (var i: number = index - 1; i >= 0; i--) {
			if (text.charAt(i) === '>' && !StringUtil.checkInString(text, i)) {
				flag1 = true;
			}
			if (text.charAt(i) === '<' && !StringUtil.checkInString(text, i)) {
				flag2 = true;
			}

			if (flag1) //如果找到的是结束，index已经处在一个节点完结之后，另一个节点起始之前了此时需要向后找到真正的<
			{
				break;
			}
			if (flag2) //如果找到的是起始，证明index是在半个节点中间，则i是这半个起点即“<”的位置。
			{
				return i;
			}
		}
		//如果两个都没找到证明真正的xml部分还没开始。 则向后找
		for (i = index; i < text.length; i++) {
			//找到起点了
			if (text.charAt(i) === '<' && !StringUtil.checkInString(text, i)) {
				return i;
			}
		}
		//到此为止证明这不是一个有效的xml
		return -1;
	}

	/**
	 * 得到修复到完整节点位置的区域的结束索引
	 * @param text 全部文本
	 * @param index 当前索引位置
	 * @return
	 */
	private getFixedRegionEnd(text: string, index: number): number {
		var flag1: Boolean = false;
		var flag2: Boolean = false;
		//往后找
		for (var i: number = index; i < text.length; i++) {
			if (text.charAt(i) === '>' && !StringUtil.checkInString(text, i)) {
				flag1 = true;
			}
			if (text.charAt(i) === '<' && !StringUtil.checkInString(text, i)) {
				flag2 = true;
			}
			if (flag1) //如果找到的是结束，证明index是在半个节点中间，则i是这半个结束即“>”的位置。
			{
				return i + 1;
			}
			if (flag2) //如果找到的是起始，index已经处在一个节点完结之后，另一个节点起始之前了
			{
				break;
			}
		}
		//如果两个都没找到证明真正的xml部分已经结束。 则向前找
		for (i = index - 1; i >= 0; i--) {
			//找到结束节点了
			if (text.charAt(i) === '>' && !StringUtil.checkInString(text, i)) {
				return i + 1;
			}
		}
		//到此为止证明这不是一个有效的xml
		return -1;
	}

	/**
	 * 将一个xml数据以半个节点为最小单位，拆成数组。此方法不负责进行格式化。只负责拆分。
	 * @param text
	 * @return
	 */
	private sliceXmlToArray(text: string): string[] {
		var arr: string[] = [];
		var indexCache: number = 0;
		for (var i: number = 0; i < text.length; i++) {
			if (text.charAt(i) === '>' && !StringUtil.checkInString(text, i)) {
				var nodeStr: string = text.slice(indexCache, i + 1);
				nodeStr = StringUtil.trim(nodeStr);
				arr.push(nodeStr);
				indexCache = i + 1;
			}
		}
		if (indexCache < text.length) {
			var tempText: string = '';
			if (arr.length > 0) {
				tempText = text.slice(indexCache, text.length);
			} else {
				tempText = text;
			}
			arr.push(StringUtil.trim(tempText));
		}
		return arr;
	}

	/**
	 * 修复由字符串而非子节点组成节点值。
	 */
	private fixXmlNodesValue(xmlNodes: string[]): void {
		for (var i: number = 0; i < xmlNodes.length - 1; i++) {
			var type: string = this.getNodeType(xmlNodes[i]);
			if (type === XMLFormatUtil.START_NODE) {
				var nextNode: string = xmlNodes[i + 1];
				var value: string = '';
				var right: string = '';
				var fixed: Boolean = false;
				for (var j: number = 0; j < nextNode.length; j++) {
					if (nextNode.charAt(j) === '<') {
						value = nextNode.slice(0, j);
						right = nextNode.slice(j);
						if (this.getNodeType(right) === XMLFormatUtil.END_NODE) {
							fixed = true;
						}
						break;
					}
				}
				if (fixed) {
					xmlNodes[i] = xmlNodes[i] + StringUtil.trim(value) + StringUtil.trim(right);
					xmlNodes.splice(i + 1, 1);
				}
			}
		}
	}

	/**
	 * 得到当前节点的已经存在的缩进字符串。使用此方法，一定是要经过<code>getFixedRegionStart</code>方法修复了起始位置之后的。
	 * 用于确定需要格式化部分的的一个起始的缩进字符串。
	 * @param text 全部文本
	 * @param index index所在位置可能是指定节点的左尖括号'<'，或者更左的某个位置。
	 * @return
	 */
	private getCurrentNodeIndentString(text: string, index: number): string {
		if (index === 0) {
			return '';
		}
		//从index向右找，找到<
		var leftIndex: number = -1;
		for (var i: number = index; i < text.length; i++) {
			if (text.charAt(i) === '<' && !StringUtil.checkInString(text, i)) {
				leftIndex = i;
				break;
			}
		}
		//从index向右找。找到换行符。
		var startIndex: number = -1;
		for (i = leftIndex - 1; i >= 0; i--) {
			if (text.charAt(i) === '\r' || text.charAt(i) === '\n') {
				startIndex = i + 1;
				break;
			}
		}
		//将两个之间的部分就是缩进字符串
		var str: string = text.slice(startIndex, leftIndex);
		if (StringUtil.trim(str) === '') {
			return str;
		}
		return '';
	}

	/**
	 * 修复每一项内的节点缩进数
	 * @param xmlNodes 要修复的xml节点数组
	 * @param useTab 是否使用制表符，是：使用制表符，否：使用空格
	 * @param IndentNum 缩进数量
	 * @param startIndentStr 起始缩进字符串
	 */
	private fixXmlNodesIndent(xmlNodes: string[], useTab: Boolean, IndentNum: number, startIndentStr: string): void {
		var indent: number = 0;
		for (var i: number = 0; i < xmlNodes.length; i++) {
			var type: string = this.getNodeType(xmlNodes[i]);
			if (type === XMLFormatUtil.END_NODE && i !== 0) {
				indent--;
			}
			var indentStr: string = startIndentStr;
			if (indent >= 0) {
				if (useTab) {
					indentStr += this.getStr(indent * IndentNum, '\t');
				} else {
					indentStr += this.getStr(indent * IndentNum, ' ');
				}
			} else {
				//如果缩进比起始缩进还小，就按照需要缩进的数量往下减字符，直到减为0为止。
				if (indentStr.length > -indent * IndentNum) {
					indentStr = indentStr.slice(0, indentStr.length + indent * IndentNum);
				} else {
					indentStr = '';
				}
			}
			xmlNodes[i] = indentStr + xmlNodes[i];
			if (type === XMLFormatUtil.START_NODE) {
				indent++;
			}
		}
	}

	/**
	 * 修正每一项xml的细节
	 * @param xmlNode
	 * @param lineWidth 行宽
	 * @param splitAttribute 分割多个属性，使每个属性位于一个新行上
	 * @param addSpaceToRight 在右空结束标签的前面插入空格
	 * @param lineBreak 换行符
	 *
	 */
	private fixXmlNodeDetail(xmlNode: string, lineWidth: number, splitAttribute: Boolean, addSpaceToRight: Boolean, lineBreak: string): string {
		var space: string = '';
		var xmlStr: string = '';
		//分离起始缩进和xml文本
		for (var i: number = 0; i < xmlNode.length; i++) {
			if (xmlNode.charAt(i) !== ' ' && xmlNode.charAt(i) !== '\t') {
				space = xmlNode.slice(0, i);
				xmlStr = xmlNode.slice(i);
				break;
			}
		}
		var type: string = this.getNodeType(xmlStr);
		//针对每种类型进行处理
		if (type === XMLFormatUtil.START_NODE || type === XMLFormatUtil.END_NODE || type === XMLFormatUtil.SAMPLE_FULL_NODE) {
			xmlStr = this.removeLineBreak(xmlStr);
			xmlStr = this.removeSampleNodeExtraSpace(xmlStr);
			xmlStr = this.fixSampleNodeLineBreak(space, xmlStr, lineWidth, splitAttribute, addSpaceToRight, lineBreak);
		} else if (type === XMLFormatUtil.NOTE) {
			xmlStr = this.fixNoteSpaceAndLineBreak(space, xmlStr, lineBreak);
		} else if (type === XMLFormatUtil.HEAD || type === XMLFormatUtil.ERROR || type === XMLFormatUtil.CDATA) {
			xmlStr = space + xmlStr;
		} else if (type === XMLFormatUtil.MUTIL_FULL_NODE) {
			xmlStr = this.fixMutilNode(space, xmlStr, lineWidth, splitAttribute, addSpaceToRight, lineBreak);
		} else {
			xmlStr = space + xmlStr;
		}
		return xmlStr;
	}
	/**
	 * 修复复杂节点的换行和细节
	 * @param startSpace
	 * @param xmlStr
	 * @param lineWidth
	 * @param splitAttribute
	 * @param addSpaceToRight
	 * @param lineBreak
	 *
	 */
	private fixMutilNode(startSpace: string, xmlStr: string, lineWidth: number, splitAttribute: Boolean, addSpaceToRight: Boolean, lineBreak: string): string {
		var startNode: string = '';
		var value: string = '';
		var endNode: string = '';
		var rightIndex: number = xmlStr.indexOf('>', 1);
		var leftIndex: number = xmlStr.indexOf('<', 1);

		startNode = xmlStr.slice(0, rightIndex + 1);
		startNode = StringUtil.trim(startNode);
		value = xmlStr.slice(rightIndex + 1, leftIndex);
		value = StringUtil.trim(value);
		endNode = xmlStr.slice(leftIndex);
		endNode = StringUtil.trim(endNode);

		startNode = this.removeLineBreak(startNode);
		startNode = this.removeSampleNodeExtraSpace(startNode);
		startNode = this.fixSampleNodeLineBreak(startSpace, startNode, lineWidth, splitAttribute, addSpaceToRight, lineBreak, true);
		endNode = this.removeLineBreak(endNode);
		endNode = this.removeSampleNodeExtraSpace(endNode);
		endNode = this.fixSampleNodeLineBreak(startSpace, endNode, lineWidth, splitAttribute, addSpaceToRight, lineBreak, true);

		var result: string = startSpace;

		var startNodeLastLineBreakIndex: number = Math.max(startNode.lastIndexOf('\r'), startNode.lastIndexOf('\n'));
		var startNodeLastLine: string = startNode.slice(startNodeLastLineBreakIndex + 1);
		var index1: number = value.indexOf('\r');
		var index2: number = value.indexOf('\n');
		var valueFistLineBreakIndex: number;
		if (index1 === -1 && index2 === -1) { valueFistLineBreakIndex = -1; }
		if (index1 === -1 && index2 !== -1) { valueFistLineBreakIndex = index2; }
		if (index1 !== -1 && index2 === -1) { valueFistLineBreakIndex = index1; }
		if (index1 !== -1 && index2 !== -1) { valueFistLineBreakIndex = Math.min(index1, index2); }
		var valueFistLine: string = valueFistLineBreakIndex === -1 ? value : value.slice(0, valueFistLineBreakIndex);

		if (valueFistLineBreakIndex === -1) {
			if (startNodeLastLine.length + value.length <= lineWidth) {
				result += startNode + value + endNode;
			} else {
				result += startNode + lineBreak + startSpace + value + lineBreak + startSpace + endNode;
			}
		} else {
			if (startNodeLastLine.length + valueFistLine.length <= lineWidth) {
				result += startNode + value + endNode;
			} else {
				result += startNode + lineBreak + startSpace + value + lineBreak + startSpace + endNode;
			}
		}
		return result;
	}

	/**
	 * 修复简单节点的换行和细节
	 * @param startSpace 起始空格
	 * @param xmlStr xml字符串
	 * @param lineWidth 行宽
	 * @param spliAttribute 分割属性
	 * @param addSpaceToRight 右侧添加空格
	 * @param lineBreak 换行符
	 */
	private fixSampleNodeLineBreak(startSpace: string, xmlStr: string, lineWidth: number, splitAttribute: Boolean, addSpaceToRight: Boolean, lineBreak: string, ignoreFirstSpace: Boolean = false): string {
		var start: string = '';
		var middle: string = '';
		var end: string = '';
		var atts: string[] = [];

		var tempIndex1: number = xmlStr.indexOf(' ');
		//如果找不到空格证明连属性都没有，直接返回就行了
		if (tempIndex1 === -1) {
			if (!ignoreFirstSpace) {
				return startSpace + xmlStr;
			}
			return xmlStr;
		}
		start = xmlStr.slice(0, tempIndex1);
		var tempIndex2: number = Math.max(xmlStr.lastIndexOf(' '), xmlStr.lastIndexOf('\"'), xmlStr.lastIndexOf('\''));
		end = xmlStr.slice(tempIndex2 + 1);
		middle = xmlStr.slice(tempIndex1, tempIndex2 + 1);
		middle = StringUtil.trim(middle);
		var startChar: string = '';
		var charIndex: number = -1;
		var previousIndex: number = 0;
		for (var i: number = 0; i < middle.length; i++) {
			if (!startChar && (middle.charAt(i) === '\"' || middle.charAt(i) === '\'') && !StringUtil.checkInString(middle, i)) {
				startChar = middle.charAt(i);
				charIndex = i;
				continue;
			}
			if (startChar && middle.charAt(i) === startChar && !StringUtil.checkInString(middle, i)) {
				var str: string = middle.slice(previousIndex, i + 1);
				var equalitySignIndex: number = str.indexOf('=');
				if (equalitySignIndex !== -1) {
					var key: string = StringUtil.trim(str.slice(0, equalitySignIndex));
					var value: string = StringUtil.trim(str.slice(equalitySignIndex + 1));
					atts.push(key + '=' + value);
				} else {
					atts.push(str);
				}
				previousIndex = i + 1;
				startChar = '';
				charIndex = -1;
			}
		}
		if (previousIndex < middle.length) {
			atts.push(middle.slice(previousIndex));
		}


		var result: string = '';
		if (!ignoreFirstSpace) {
			result += startSpace + start;
		} else {
			result += start;
		}
		if (splitAttribute) {
			for (i = 0; i < atts.length; i++) {
				if (i === 0) {
					result += ' ' + atts[i];
				} else {
					result += lineBreak + startSpace + this.getStr(start.length + 1, ' ') + atts[i];
				}
			}
		} else {
			var currentLineWidth: number = result.length;
			for (i = 0; i < atts.length; i++) {
				if (i === 0) {
					result += ' ' + atts[i];
					currentLineWidth += 1 + atts[i].length;
				} else {
					if (currentLineWidth + atts[i].length + 1 > lineWidth) {
						result += lineBreak + startSpace + this.getStr(start.length, ' ');
						currentLineWidth = startSpace.length + start.length;
					}
					result += ' ' + atts[i];
					currentLineWidth += atts[i].length + 1;
				}
			}
		}
		result += ((addSpaceToRight && end === '/>') ? ' ' : '') + end;
		return result;
	}

	/**
	 * 移除换行符
	 * @param str
	 * @return
	 */
	private removeLineBreak(str: string): string {
		var tempStr: string = '';
		for (var i: number = 0; i < str.length; i++) {
			if (str.charAt(i) !== '\r' && str.charAt(i) !== '\n') {
				tempStr += str.charAt(i);
			}
		}
		return tempStr;
	}

	/**
	 * 移除简单节点多余的空格
	 * @param str
	 * @return
	 */
	private removeSampleNodeExtraSpace(str: string): string {
		var tempStr: string = '';
		for (var i: number = 0; i < str.length; i++) {
			if (str.charAt(i) === ' ' || str.charAt(i) === '\t') {
				if (StringUtil.checkInString(str, i)) {
					tempStr += str.charAt(i);
				} else {
					if (tempStr.length !== 0 && tempStr.charAt(tempStr.length - 1) !== ' ') {
						tempStr += ' ';
					}
				}
			} else {
				tempStr += str.charAt(i);
			}
		}
		return tempStr;
	}

	/**
	 * 修复注释节点的格式
	 * @param space 起始缩进字符串
	 * @param str 节点字符串
	 * @return
	 */
	private fixNoteSpaceAndLineBreak(space: string, str: string, lineBreak: string): string {
		var start: string = '<!--';
		var end: string = '-->';
		if (str.length > 7) {
			if (str.charAt(4) === '-') {
				start = '<!---';
			}
			if (str.length > 8) {
				if (str.charAt(str.length - 4) === '-') {
					end = '--->';
				}
			}
		}

		var middle: string = str.slice(start.length, str.length - end.length);
		middle = StringUtil.trim(middle);

		var middles: string[] = [];
		var rnLines: string[] = middle.split('\r\n');
		for (var i = 0; i < rnLines.length; i++) {
			var rnLine = rnLines[i];
			var rLines: string[] = rnLine.split('\r');
			for (var j = 0; j < rLines.length; j++) {
				var rLine = rLines[j];
				var nLines: string[] = rLine.split('\n');
				for (var k = 0; k < nLines.length; k++) {
					var line = nLines[k];
					line = StringUtil.trim(line);
					middles.push(line);
				}
			}
		}

		var result: string = space + start;
		for (var i: number = 0; i < middles.length; i++) {
			if (i === 0) {
				result += ' ' + middles[i];
			} else {
				result += lineBreak + space + middles[i];
			}
		}
		result += ' ' + end;
		return result;
	}

	/**
	 * 得到一个(半个)xml节点字符串的类型。
	 * @param xmlStr
	 * @return
	 */
	private getNodeType(xmlStr: string): string {
		xmlStr = StringUtil.trim(xmlStr);
		if (xmlStr.charAt(0) === '<' && xmlStr.charAt(xmlStr.length - 1) === '>') {
			var tempStr: string = xmlStr.slice(1, xmlStr.length - 1);
			var tempRight: number = tempStr.indexOf('>');
			var tempLeft: number = tempStr.indexOf('<');
			if (tempRight !== -1 && tempLeft !== -1) {
				tempRight += 1;
				tempLeft += 1;
				if (tempLeft > tempRight) {
					if (xmlStr.charAt(tempLeft + 1) === '/') {
						return XMLFormatUtil.MUTIL_FULL_NODE;
					}
				}
			}
			if (xmlStr.charAt(1) === '/') {
				return XMLFormatUtil.END_NODE;
			}
			if (xmlStr.charAt(xmlStr.length - 2) === '/') {
				return XMLFormatUtil.SAMPLE_FULL_NODE;
			}
			if (xmlStr.charAt(1) === '?' && xmlStr.charAt(xmlStr.length - 2) === '?') {
				return XMLFormatUtil.HEAD;
			}
			if (xmlStr.charAt(1) === '!' && xmlStr.charAt(2) === '-' && xmlStr.charAt(3) === '-' &&
				xmlStr.charAt(xmlStr.length - 2) === '-' && xmlStr.charAt(xmlStr.length - 3) === '-') {
				return XMLFormatUtil.NOTE;
			}
			if (xmlStr.charAt(1) === '!') {
				return XMLFormatUtil.CDATA;
			}
			if (xmlStr.charAt(1) !== '!' && xmlStr.charAt(1) !== '?' && xmlStr.charAt(1) !== '/' &&
				xmlStr.charAt(xmlStr.length - 2) !== '!' && xmlStr.charAt(xmlStr.length - 2) !== '?' && xmlStr.charAt(xmlStr.length - 2) !== '/'
			) {
				return XMLFormatUtil.START_NODE;
			}
			return XMLFormatUtil.ERROR;
		}
		return XMLFormatUtil.ERROR;
	}

	/**
	 * 根据指定位置得到需要补全的节点的后半部分节点，如通过<s:Label id='muId' 得到</s:Label>。
	 * 该方法一般用于输入过程中的自动补全。
	 * @param text 全部文本
	 * @param index 指定字符索引
	 * @return
	 */
	// private getFixedNode(text: string, index: number): string {
	// 	var newText: string = '';
	// 	//从当前索引位置往前找，直到找到“<”为止
	// 	for (var i: number = index - 1; i >= 0; i--) {
	// 		newText = text.charAt(i) + newText;
	// 		if (text.charAt(i) === '<' && !StringUtil.checkInString(text, i)) {
	// 			break;
	// 		}
	// 	}
	// 	//将得到的部分如 <s:Label id='muId' 中从前往后找，得到 <s:Label
	// 	var newText2: string = '';
	// 	for (i = 0; i < newText.length; i++) {
	// 		if (newText.charCodeAt(i) === 9 || newText.charAt(i) === ' ' || newText.charAt(i) === '\r' || newText.charAt(i) === '\n') {
	// 			break;
	// 		} else {
	// 			newText2 += newText.charAt(i);
	// 		}
	// 	}
	// 	//去掉尖括号 得到 s:Label
	// 	newText2 = newText2.slice(1);
	// 	if (newText2 === '') { return ''; }
	// 	//组合成</s:Label>,返回回去
	// 	newText2 = '</' + newText2 + '>';
	// 	return newText2;
	// }

	/**
	 * 得到连续制表符
	 * @param num 制表符数量
	 * @return 连续制表符
	 */
	private getStr(num: number = 1, char: string = '\t'): string {
		var str: string = '';
		for (var i: number = 0; i < num; i++) {
			str += char;
		}
		return str;
	}
}