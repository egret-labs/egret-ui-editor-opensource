/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { FileEditorInput } from 'egret/editor/common/input/editorInput';
import { RES_EDITOR_INPUT_ID, RES_EDITOR_ID } from '../common/consts/ResType';
import { IInstantiationService } from 'egret/platform/instantiation/common/instantiation';
import { IFileModelService } from 'egret/workbench/services/editor/common/models';
import URI from 'egret/base/common/uri';

export class ResEditorInput extends FileEditorInput {
	/**
	 *
	 */
	constructor(
		resource: URI,
		preferredEncoding: string,
		@IInstantiationService instantiationService: IInstantiationService,
		@IFileModelService fileModelService: IFileModelService,
	) {
		super(resource, preferredEncoding, instantiationService, fileModelService);

	}
	public getTypeId(): string {
		return RES_EDITOR_INPUT_ID;
	}

	public getPreferredEditorId(candidates: string[]): string {
		return RES_EDITOR_ID;
	}
}