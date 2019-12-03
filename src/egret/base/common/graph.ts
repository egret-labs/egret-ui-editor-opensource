'use strict';

import { isEmptyObject } from './types';

/**
 * An interface for a JavaScript object that
 * acts a dictionary. The keys are strings.
 */
export interface IStringDictionary<V> {
	[name: string]: V;
}

/**
 * An interface for a JavaScript object that
 * acts a dictionary. The keys are numbers.
 */
export interface INumberDictionary<V> {
	[idx: number]: V;
}
/**
 * Iterates over each entry in the provided set. The iterator allows
 * to remove elements and will stop when the callback returns {{false}}.
 */
function forEach<T>(from: IStringDictionary<T> | INumberDictionary<T>, callback: (entry: { key: any; value: T; }, remove: Function) => any): void {
	for (const key in from) {
		if (Object.prototype.hasOwnProperty.call(from, key)) {
			const result = callback({ key: key, value: (from as any)[key] }, function () {
				delete (from as any)[key];
			});
			if (result === false) {
				return;
			}
		}
	}
}

export interface Node<T> {
	data: T;
	incoming: { [key: string]: Node<T> };
	outgoing: { [key: string]: Node<T> };
}

function newNode<T>(data: T): Node<T> {
	return {
		data: data,
		incoming: Object.create(null),
		outgoing: Object.create(null)
	};
}

export class Graph<T> {

	private _nodes: { [key: string]: Node<T> } = Object.create(null);

	constructor(private _hashFn: (element: T) => string) {
		// empty
	}

	roots(): Node<T>[] {
		const ret: Node<T>[] = [];
		forEach(this._nodes, entry => {
			if (isEmptyObject(entry.value.outgoing)) {
				ret.push(entry.value);
			}
		});
		return ret;
	}

	traverse(start: T, inwards: boolean, callback: (data: T) => void): void {
		const startNode = this.lookup(start);
		if (!startNode) {
			return;
		}
		this._traverse(startNode, inwards, Object.create(null), callback);
	}

	private _traverse(node: Node<T>, inwards: boolean, seen: { [key: string]: boolean }, callback: (data: T) => void): void {
		const key = this._hashFn(node.data);
		if (seen[key]) {
			return;
		}
		seen[key] = true;
		callback(node.data);
		const nodes = inwards ? node.outgoing : node.incoming;
		forEach(nodes, (entry) => this._traverse(entry.value, inwards, seen, callback));
	}

	insertEdge(from: T, to: T): void {
		const fromNode = this.lookupOrInsertNode(from),
			toNode = this.lookupOrInsertNode(to);

		fromNode.outgoing[this._hashFn(to)] = toNode;
		toNode.incoming[this._hashFn(from)] = fromNode;
	}

	removeNode(data: T): void {
		const key = this._hashFn(data);
		delete this._nodes[key];
		forEach(this._nodes, (entry) => {
			delete entry.value.outgoing[key];
			delete entry.value.incoming[key];
		});
	}

	lookupOrInsertNode(data: T): Node<T> {
		const key = this._hashFn(data);
		let node = this._nodes[key];

		if (!node) {
			node = newNode(data);
			this._nodes[key] = node;
		}

		return node;
	}

	lookup(data: T): Node<T> {
		return this._nodes[this._hashFn(data)];
	}

	get length(): number {
		return Object.keys(this._nodes).length;
	}

	toString(): string {
		const data: string[] = [];
		forEach(this._nodes, entry => {
			data.push(`${entry.key}, (incoming)[${Object.keys(entry.value.incoming).join(', ')}], (outgoing)[${Object.keys(entry.value.outgoing).join(',')}]`);
		});
		return data.join('\n');
	}
}
