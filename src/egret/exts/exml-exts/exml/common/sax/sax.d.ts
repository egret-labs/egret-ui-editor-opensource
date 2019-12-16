// Type definitions for sax js
// Project: https://github.com/isaacs/sax-js
// Definitions by: Asana <https://asana.com>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

    export var EVENTS: string[];

    interface SAXOptions {
        trim?: boolean;
        normalize?: boolean;
        lowercase?: boolean;
        xmlns?: boolean;
        noscript?: boolean;
        position?: boolean;
        messagePos?:boolean;
    }

    export const enum Type {
        Tag,
        CData,
        Text,
        Attribute,
        Comment,
        ProcessingInstruction,
    }

    export interface Node {
        name: string;
        line?: number;
        column?: number;
        start: number;
        end:number;
        nodeType?:Type;
    }

    export interface Attribute extends Node {
        value:string;
        parent?:Tag;
    }
    export interface Comment extends Node {
    }

    export interface TextNode extends Node {
    }

    export interface Error extends Node {
        message:string;
    }

    export interface ProcessingInstruction extends Node {
        body: string;
    }

    export interface Tag extends Node {
        attributes: { [key: string]: string };
        attributeNodes:Attribute[];
        text:string;
        namespace:string;
        localName:string;
        children?:Tag[];
        parent?:Tag;
        closed?:boolean;
        error: Error;
        errors: Error[];
        comments?: Comment[];
        processingInstructions?: ProcessingInstruction[];
        textNodes?: TextNode[];
        roots?: Tag[];
        isSelfClosing: boolean;
        startTagEnd: number;
        endTagStart: number;

        // Available if opt.xmlns
        ns?: { [key: string]: string };
        prefix?: string;
        local?: string;
        uri?: string;
    }

    export function parser(strict: boolean, opt?: SAXOptions): SAXParser;
    export class SAXParser {
        constructor(strict: boolean, opt: SAXOptions);

        // Methods
        end(): void;
        write(s: string): SAXParser;
        resume(): SAXParser;
        close(): SAXParser;
        flush(): void;

        // Members
        line: number;
        column: number;
        error: Error;
        position: number;
        startTagPosition: number;
        startAttribPosition: number;
        startCommentPosition: number;
        startProcInstPosition: number;
        startTextPosition: number;
        startCDataPosition: number;
        whitespacesSawInAttribute: number;
        endTagStart: number;
        closed: boolean;
        strict: boolean;
        opt: SAXOptions;
        tag: string;

        // Events
        onerror(e: Error): void;
        ontext(t: string): void;
        ondoctype(doctype: string): void;
        onprocessinginstruction(node: { name: string; body: string }): void;
        onopentag(tag: Tag): void;
        onclosetag(tagName: string): void;
        onattribute(attr: { name: string; value: string; closed?:boolean }): void;
        oncomment(comment: string): void;
        onopencdata(): void;
        oncdata(cdata: string): void;
        onclosecdata(): void;
        onopennamespace(ns: { prefix: string; uri: string }): void;
        onclosenamespace(ns: { prefix: string; uri: string }): void;
        onend(): void;
        onready(): void;
        onscript(script: string): void;
    }

    import * as stream from "stream";
    export function createStream(strict: boolean, opt: SAXOptions): SAXStream;
    export class SAXStream extends stream.Duplex {
        constructor(strict: boolean, opt: SAXOptions);
        private _parser: SAXParser;
    }


