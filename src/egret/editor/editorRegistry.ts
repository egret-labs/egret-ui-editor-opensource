import { IInstantiationService, IConstructorSignature0 } from 'egret/platform/instantiation/common/instantiation';
import { EditorInput } from './common/input/editorInput';
import { SyncDescriptor } from 'egret/platform/instantiation/common/descriptors';
import { BaseEditor } from './browser/baseEditor';
import { isArray } from 'egret/base/common/types';

/**
 * 一个编辑器的描述，用以指定某种input用什么编辑器打开
 */
export interface IEditorDescriptor {
	instantiate(instantiationService: IInstantiationService): BaseEditor;
	getId(): string;
	getName(): string;
	describes(obj: any): boolean;
}

/**
 * 编辑器注册器接口
 */
export interface IEditorRegistry {

	/**
	 * 给指定的input类型注册一种编辑器，或者多种编辑器
	 * @param descriptor 
	 * @param editorInputDescriptor 
	 */
	registerEditor(descriptor: IEditorDescriptor, editorInputDescriptor: SyncDescriptor<EditorInput>): void;
	registerEditor(descriptor: IEditorDescriptor, editorInputDescriptor: SyncDescriptor<EditorInput>[]): void;

	/**
	 * 通过一个input得到一个编辑器描述
	 * @param input 
	 */
	getEditor(input: EditorInput): IEditorDescriptor;
	/**
	 * 通过ID得到一个编辑器描述
	 * @param editorId 编辑器描述，每种编辑器一个id字符串
	 */
	getEditorById(editorId: string): IEditorDescriptor;
	/**
	 * 得到所有注册的编辑器描述
	 */
	getEditors(): IEditorDescriptor[];
}

/**
 * 编辑器描述基本实现
 */
export class EditorDescriptor implements IEditorDescriptor {
	private ctor: IConstructorSignature0<BaseEditor>;
	private id: string;
	private name: string;
	constructor(ctor: IConstructorSignature0<BaseEditor>, id: string, name: string) {
		this.ctor = ctor;
		this.id = id;
		this.name = name;
	}
	/**
	 * 实例化
	 * @param instantiationService 
	 */
	public instantiate(instantiationService: IInstantiationService): BaseEditor {
		return instantiationService.createInstance(this.ctor);
	}
	/**
	 * 当前类型id
	 */
	public getId(): string {
		return this.id;
	}
	/**
	 * 名称
	 */
	public getName(): string {
		return this.name;
	}
	/**
	 * 判断描述
	 * @param obj 
	 */
	public describes(obj: any): boolean {
		return obj instanceof BaseEditor && (<BaseEditor>obj).getEditorId() === this.id;
	}
}


const INPUT_DESCRIPTORS_PROPERTY = '__$inputDescriptors';
/**
 * 编辑器注册器的实现
 */
class EditorRegistryImpl implements IEditorRegistry {
	private editors: EditorDescriptor[];

	constructor() {
		this.editors = [];
	}

	public registerEditor(descriptor: EditorDescriptor, editorInputDescriptor: SyncDescriptor<EditorInput>): void;
	public registerEditor(descriptor: EditorDescriptor, editorInputDescriptor: SyncDescriptor<EditorInput>[]): void;
	public registerEditor(descriptor: EditorDescriptor, editorInputDescriptor: any): void {

		// Support both non-array and array parameter
		let inputDescriptors: SyncDescriptor<EditorInput>[] = [];
		if (!isArray(editorInputDescriptor)) {
			inputDescriptors.push(editorInputDescriptor);
		} else {
			inputDescriptors = editorInputDescriptor;
		}

		// Register (Support multiple Editors per Input)
		descriptor[INPUT_DESCRIPTORS_PROPERTY] = inputDescriptors;
		this.editors.push(descriptor);
	}

	public getEditor(input: EditorInput): EditorDescriptor {
		const findEditorDescriptors = (input: EditorInput, byInstanceOf?: boolean): EditorDescriptor[] => {
			const matchingDescriptors: EditorDescriptor[] = [];

			for (let i = 0; i < this.editors.length; i++) {
				const editor = this.editors[i];
				const inputDescriptors = <SyncDescriptor<EditorInput>[]>editor[INPUT_DESCRIPTORS_PROPERTY];
				for (let j = 0; j < inputDescriptors.length; j++) {
					const inputClass = inputDescriptors[j].ctor;

					// Direct check on constructor type (ignores prototype chain)
					if (!byInstanceOf && input.constructor === inputClass) {
						matchingDescriptors.push(editor);
						break;
					}

					// Normal instanceof check
					else if (byInstanceOf && input instanceof inputClass) {
						matchingDescriptors.push(editor);
						break;
					}
				}
			}

			// If no descriptors found, continue search using instanceof and prototype chain
			if (!byInstanceOf && matchingDescriptors.length === 0) {
				return findEditorDescriptors(input, true);
			}

			if (byInstanceOf) {
				return matchingDescriptors;
			}

			return matchingDescriptors;
		};

		const descriptors = findEditorDescriptors(input);
		if (descriptors && descriptors.length > 0) {

			// Ask the input for its preferred Editor
			const preferredEditorId = input.getPreferredEditorId(descriptors.map(d => d.getId()));
			if (preferredEditorId) {
				return this.getEditorById(preferredEditorId);
			}

			// Otherwise, first come first serve
			return descriptors[0];
		}

		return null;
	}

	public getEditorById(editorId: string): EditorDescriptor {
		for (let i = 0; i < this.editors.length; i++) {
			const editor = this.editors[i];
			if (editor.getId() === editorId) {
				return editor;
			}
		}

		return null;
	}

	public getEditors(): EditorDescriptor[] {
		return this.editors.slice(0);
	}

	public setEditors(editorsToSet: EditorDescriptor[]): void {
		this.editors = editorsToSet;
	}

	public getEditorInputs(): any[] {
		const inputClasses: any[] = [];
		for (let i = 0; i < this.editors.length; i++) {
			const editor = this.editors[i];
			const editorInputDescriptors = <SyncDescriptor<EditorInput>[]>editor[INPUT_DESCRIPTORS_PROPERTY];
			inputClasses.push(...editorInputDescriptors.map(descriptor => descriptor.ctor));
		}

		return inputClasses;
	}
}
/**
 * 编辑器注册器
 */
export const EditorRegistry = new EditorRegistryImpl();