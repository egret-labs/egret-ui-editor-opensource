'use strict';

import { IDisposable, toDisposable, combinedDisposable, empty as EmptyDisposable } from './lifecycle';
import { LinkedList } from './linkedList';

export interface Event<T> {
	(listener: (e: T) => any, thisArgs?: any, disposables?: IDisposable[]): IDisposable;
}

export namespace Event {
	const _disposable = { dispose() { } };
	export const None: Event<any> = () => { return _disposable; };
}

type Listener = [Function, any] | Function;

export interface EmitterOptions {
	onFirstListenerAdd?: Function;
	onFirstListenerDidAdd?: Function;
	onListenerDidAdd?: Function;
	onLastListenerRemove?: Function;
}

export class Emitter<T> {

	private static readonly _noop = () => { };

	private _event: Event<T>;
	private _listeners: LinkedList<Listener>;
	private _deliveryQueue: [Listener, T][];
	private _disposed: boolean;

	constructor(private _options?: EmitterOptions) {

	}

	/**
	 * For the public to allow to subscribe
	 * to events from this Emitter
	 */
	get event(): Event<T> {
		if (!this._event) {
			this._event = (listener: (e: T) => any, thisArgs?: any, disposables?: IDisposable[]) => {
				if (!this._listeners) {
					this._listeners = new LinkedList();
				}

				const firstListener = this._listeners.isEmpty();

				if (firstListener && this._options && this._options.onFirstListenerAdd) {
					this._options.onFirstListenerAdd(this);
				}

				const remove = this._listeners.push(!thisArgs ? listener : [listener, thisArgs]);

				if (firstListener && this._options && this._options.onFirstListenerDidAdd) {
					this._options.onFirstListenerDidAdd(this);
				}

				if (this._options && this._options.onListenerDidAdd) {
					this._options.onListenerDidAdd(this, listener, thisArgs);
				}

				let result: IDisposable;
				result = {
					dispose: () => {
						result.dispose = Emitter._noop;
						if (!this._disposed) {
							remove();
							if (this._options && this._options.onLastListenerRemove && this._listeners.isEmpty()) {
								this._options.onLastListenerRemove(this);
							}
						}
					}
				};
				if (Array.isArray(disposables)) {
					disposables.push(result);
				}

				return result;
			};
		}
		return this._event;
	}

	/**
	 * To be kept private to fire an event to
	 * subscribers
	 */
	public fire(event?: T): any {
		if (this._listeners) {
			// put all [listener,event]-pairs into delivery queue
			// then emit all event. an inner/nested event might be
			// the driver of this

			if (!this._deliveryQueue) {
				this._deliveryQueue = [];
			}

			for (let iter = this._listeners.iterator(), e = iter.next(); !e.done; e = iter.next()) {
				this._deliveryQueue.push([e.value, event]);
			}

			while (this._deliveryQueue.length > 0) {
				const [listener, event] = this._deliveryQueue.shift();
				if (typeof listener === 'function') {
					listener.call(undefined, event);
				} else {
					listener[0].call(listener[1], event);
				}
			}
		}
	}
	public dispose() {
		if (this._listeners) {
			this._listeners = undefined;
		}
		if (this._deliveryQueue) {
			this._deliveryQueue.length = 0;
		}
		this._disposed = true;
	}
}

export function debounceEvent<T>(event: Event<T>, merger: (last: T, event: T) => T, delay?: number, leading?: boolean): Event<T>;
export function debounceEvent<I, O>(event: Event<I>, merger: (last: O, event: I) => O, delay?: number, leading?: boolean): Event<O>;
export function debounceEvent<I, O>(event: Event<I>, merger: (last: O, event: I) => O, delay: number = 100, leading = false): Event<O> {
	let subscription: IDisposable;
	let output: O = undefined;
	let handle = undefined;
	let numDebouncedCalls = 0;
	const emitter = new Emitter<O>({
		onFirstListenerAdd() {
			subscription = event(cur => {
				numDebouncedCalls++;
				output = merger(output, cur);

				if (leading && !handle) {
					emitter.fire(output);
				}

				clearTimeout(handle);
				handle = setTimeout(() => {
					const _output = output;
					output = undefined;
					handle = undefined;
					if (!leading || numDebouncedCalls > 1) {
						emitter.fire(_output);
					}

					numDebouncedCalls = 0;
				}, delay);
			});
		},
		onLastListenerRemove() {
			subscription.dispose();
		}
	});
	return emitter.event;
}

export function once<T>(event: Event<T>): Event<T> {
	return (listener, thisArgs = null, disposables?) => {
		const result = event(e => {
			result.dispose();
			return listener.call(thisArgs, e);
		}, null, disposables);

		return result;
	};
}

export function filterEvent<T>(event: Event<T>, filter: (e: T) => boolean): Event<T> {
	return (listener, thisArgs = null, disposables?) => event(e => filter(e) && listener.call(thisArgs, e), null, disposables);
}

export interface NodeEventEmitter {
	on(event: string | symbol, listener: Function): this;
	removeListener(event: string | symbol, listener: Function): this;
}

export function fromNodeEventEmitter<T>(emitter: NodeEventEmitter, eventName: string, map: (...args: any[]) => T = id => id): Event<T> {
	const fn = (...args: any[]) => result.fire(map(...args));
	const onFirstListenerAdd = () => emitter.on(eventName, fn);
	const onLastListenerRemove = () => emitter.removeListener(eventName, fn);
	const result = new Emitter<T>({ onFirstListenerAdd, onLastListenerRemove });

	return result.event;
}
