/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

/**
 * Extracted from json.ts to keep json nls free.
 */
import { ParseErrorCode } from './json';

export function getParseErrorMessage(errorCode: ParseErrorCode): string {
	switch (errorCode) {
		case ParseErrorCode.InvalidSymbol: return 'Invalid symbol';
		case ParseErrorCode.InvalidNumberFormat: return 'Invalid number format';
		case ParseErrorCode.PropertyNameExpected: return 'Property name expected';
		case ParseErrorCode.ValueExpected: return 'Value expected';
		case ParseErrorCode.ColonExpected: return 'Colon expected';
		case ParseErrorCode.CommaExpected: return 'Comma expected';
		case ParseErrorCode.CloseBraceExpected: return 'Closing brace expected';
		case ParseErrorCode.CloseBracketExpected: return 'Closing bracket expected';
		case ParseErrorCode.EndOfFileExpected: return 'End of file expected';
		default:
			return '';
	}
}