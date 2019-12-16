import * as StringUtil from '../utils/strings';
import * as xmlParser from '../sax/xml-tagUtils';
import * as sax from '../sax/sax';

export function check(xml: string): { info: string, start: number, end: number }[] {
	var errorStart = 0;
	var errorEnd = 0;
	var needCheck: boolean = false;
	var tempXml: string = StringUtil.trim(xml);
	if (tempXml.indexOf('<') === 0) {
		var tmpString = tempXml.slice(1, tempXml.length);
		tmpString = StringUtil.trim(tmpString);
		if (tmpString.indexOf('?') === 0) {
			needCheck = true;
		}
	}
	if (!needCheck) {
		return [];
	}
	var startIndex = xml.indexOf('<');
	var endIndex = xml.indexOf('>', startIndex + 1);
	//开头
	if (startIndex > 0) {
		errorStart = 0;
		errorEnd = startIndex;
		return [{
			start: errorStart+1,
			end: errorEnd+1,
			info: 'Invalid characters'
		}];
	}
	var tmpIndex = xml.indexOf('?', startIndex + 1);
	if (tmpIndex - startIndex !== 1) {
		errorStart = startIndex;
		errorEnd = tmpIndex;
		return [{
			start: errorStart+1,
			end: errorEnd+1,
			info: 'Must be \'<?xml\''
		}];
	}
	tmpIndex = xml.indexOf('x', startIndex + 1);
	if (tmpIndex - startIndex !== 2) {
		errorStart = startIndex+1;
		errorEnd = tmpIndex+1;
		return [{
			start: errorStart,
			end: errorEnd,
			info: 'Must be \'<?xml\''
		}];
	}
	tmpIndex = xml.indexOf('m', startIndex + 1);
	if (tmpIndex - startIndex !== 3) {
		errorStart = startIndex+1;
		errorEnd = tmpIndex+1;
		return [{
			start: errorStart,
			end: errorEnd,
			info: 'Must be \'<?xml\''
		}];
	}
	tmpIndex = xml.indexOf('l', startIndex + 1);
	if (tmpIndex - startIndex !== 4) {
		errorStart = startIndex;
		errorEnd = tmpIndex;
		return [{
			start: errorStart+1,
			end: errorEnd+1,
			info: 'Must be \'<?xml\''
		}];
	}
	var tmpChar = xml.charAt(5);
	if (tmpChar !== ' ' && tmpChar !== '\t' && tmpChar !== '\r' && tmpChar !== '\n') {
		errorStart = startIndex;
		errorEnd = 5;
		return [{
			start: errorStart+1,
			end: errorEnd+1,
			info: 'Must be \'<?xml\''
		}];
	}
	//结尾
	tmpIndex = xml.lastIndexOf('?', endIndex);
	if (endIndex - tmpIndex !== 1) {
		errorStart = tmpIndex ;
		errorEnd = endIndex + 1;
		return [{
			start: errorStart+1,
			end: errorEnd+1,
			info: 'Must be \'?>\''
		}];
	}

	var versionIndex = xml.indexOf('version');
	if (versionIndex === -1 || versionIndex > endIndex) {
		errorStart = startIndex;
		errorEnd = endIndex + 1;
		return [{
			start: errorStart+1,
			end: errorEnd+1,
			info: 'Must have \'version\' attribute.'
		}];
	}

	startIndex += 6;
	endIndex -= 1;

	var str = '<a ' + xml.slice(startIndex, endIndex) + '/>';
	let tmpXml = xmlParser.parse(str, false, false);
	var errors: sax.Error[] = tmpXml.errors;
	if (!errors) {
		errors = [];
	}
	var resultError: { info: string, start: number, end: number }[] = [];
	if (errors.length > 0) {
		for (var i = 0; i < errors.length; i++) {
			resultError.push(
				{
					start: errors[i].start - 3 + startIndex,
					end: errors[i].end - 3 + startIndex,
					info: errors[i].name
				}
			);
		}
		return resultError;
	} else {
		var atts = tmpXml.attributeNodes;
		for (var i = 0; i < atts.length; i++) {
			if (atts[i].name !== 'version' && atts[i].name !== 'encoding' && atts[i].name !== 'standalone') {
				return [{
					start: startIndex+1,
					end: endIndex + 1,
					info: 'Should not have atttibute except \'version\',\'encoding\' or \'standalone\'.'
				}];
			}
			if (atts[i].name === 'version') {
				if (atts[i].value !== '1.0') {
					return [{
						start: startIndex+1,
						end: endIndex + 1,
						info: 'Unsupported version \'' + atts[i].value + '\''
					}];
				}
			}
			if (atts[i].name === 'encoding') {
				var coding = [
					'UTF-8', 'UTF-16', 'ISO-10646-UCS-2', 'ISO-10646-UCS-4', 'ISO-8859-1',
					'ISO-8859-2', 'ISO-8859-3', 'ISO-8859-4', 'ISO-8859-5', 'ISO-8859-6', 'ISO-8859-7', 'ISO-8859-8', 'ISO-8859-9',
					'ISO-2022-JP', 'Shift_JIS', 'EUC-JP'];
				var value = atts[i].value.toLocaleUpperCase();
				if (coding.indexOf(value) === -1) {
					return [{
						start: startIndex+1,
						end: endIndex + 1,
						info: 'Invalid XML encoding name\'' + atts[i].value + '\''
					}];
				}
			}
			if (atts[i].name === 'standalone') {
				var value = atts[i].value;
				if (value !== 'yes' && value !== 'no') {
					return [{
						start: startIndex+1,
						end: endIndex + 1,
						info: 'Standalone accepts only \'yes\' or \'no\''
					}];
				}
			}
		}
	}
	return [];
}