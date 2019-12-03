/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { isLinux } from 'vs/base/common/platform';

export interface Key {
	toString(): string;
}

export interface Entry<K, T> {
	next?: Entry<K, T>;
	prev?: Entry<K, T>;
	key: K;
	value: T;
}

/**
 * A simple Map<T> that optionally allows to set a limit of entries to store. Once the limit is hit,
 * the cache will remove the entry that was last recently added. Or, if a ratio is provided below 1,
 * all elements will be removed until the ratio is full filled (e.g. 0.75 to remove 25% of old elements).
 */
export class BoundedLinkedMap<T> {
	protected map: { [key: string]: Entry<string, T> };
	private head: Entry<string, T>;
	private tail: Entry<string, T>;
	private _size: number;
	private ratio: number;

	constructor(private limit = Number.MAX_VALUE, ratio = 1) {
		this.map = Object.create(null);
		this._size = 0;
		this.ratio = limit * ratio;
	}

	public get size(): number {
		return this._size;
	}

	public set(key: string, value: T): boolean {
		if (this.map[key]) {
			return false; // already present!
		}

		const entry: Entry<string, T> = { key, value };
		this.push(entry);

		if (this._size > this.limit) {
			this.trim();
		}

		return true;
	}

	public get(key: string): T {
		const entry = this.map[key];

		return entry ? entry.value : null;
	}

	public getOrSet(k: string, t: T): T {
		const res = this.get(k);
		if (res) {
			return res;
		}

		this.set(k, t);

		return t;
	}

	public delete(key: string): T {
		const entry = this.map[key];

		if (entry) {
			this.map[key] = void 0;
			this._size--;

			if (entry.next) {
				entry.next.prev = entry.prev; // [A]<-[x]<-[C] = [A]<-[C]
			} else {
				this.head = entry.prev; // [A]-[x] = [A]
			}

			if (entry.prev) {
				entry.prev.next = entry.next; // [A]->[x]->[C] = [A]->[C]
			} else {
				this.tail = entry.next; // [x]-[A] = [A]
			}

			return entry.value;
		}

		return null;
	}

	public has(key: string): boolean {
		return !!this.map[key];
	}

	public clear(): void {
		this.map = Object.create(null);
		this._size = 0;
		this.head = null;
		this.tail = null;
	}

	protected push(entry: Entry<string, T>): void {
		if (this.head) {
			// [A]-[B] = [A]-[B]->[X]
			entry.prev = this.head;
			this.head.next = entry;
		}

		if (!this.tail) {
			this.tail = entry;
		}

		this.head = entry;

		this.map[entry.key] = entry;
		this._size++;
	}

	private trim(): void {
		if (this.tail) {

			// Remove all elements until ratio is reached
			if (this.ratio < this.limit) {
				let index = 0;
				let current = this.tail;
				while (current.next) {

					// Remove the entry
					this.map[current.key] = void 0;
					this._size--;

					// if we reached the element that overflows our ratio condition
					// make its next element the new tail of the Map and adjust the size
					if (index === this.ratio) {
						this.tail = current.next;
						this.tail.prev = null;

						break;
					}

					// Move on
					current = current.next;
					index++;
				}
			}

			// Just remove the tail element
			else {
				this.map[this.tail.key] = void 0;
				this._size--;

				// [x]-[B] = [B]
				this.tail = this.tail.next;
				this.tail.prev = null;
			}
		}
	}
}

// --- trie'ish datastructure

class Node<E> {
	element?: E;
	readonly children = new Map<string, E>();
}
