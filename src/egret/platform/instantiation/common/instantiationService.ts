'use strict';

import { Graph } from '../../../base/common/graph';
import { SyncDescriptor } from './descriptors';
import { ServiceIdentifier, IInstantiationService, ServicesAccessor, _util, optional } from './instantiation';
import { ServiceCollection } from './serviceCollection';
import { Component, ComponentState } from 'react';

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { InstantiationProps } from '../../react/common/component';
/**
 * Creates a new object of the provided class and will call the constructor with
 * any additional argument supplied.
 */
function create(ctor: Function, ...args: any[]): any {
	const obj = Object.create(ctor.prototype);
	ctor.apply(obj, args);

	return obj;
}

/**
 * 实例化服务
 */
export class InstantiationService implements IInstantiationService {
	_serviceBrand: any;

	private _services: ServiceCollection;
	private _strict: boolean;

	constructor(services: ServiceCollection = new ServiceCollection(), strict: boolean = false) {
		//取消冻结方法，为了构造react
		Object.freeze = <T>(f: T) => { return f; };

		this._services = services;
		this._strict = strict;

		this._services.set(IInstantiationService, this);
	}

	/**
	 * 添加一个服务到当前的实例化服务
	 * @param id 
	 * @param instanceOrDescriptor 
	 */
	public addService<T>(id: ServiceIdentifier<T>, instanceOrDescriptor: T | SyncDescriptor<T>):void{
		this._services.set(id,instanceOrDescriptor);
	}

	createChild(services: ServiceCollection): IInstantiationService {
		this._services.forEach((id, thing) => {
			if (services.has(id)) {
				return;
			}
			// If we copy descriptors we might end up with
			// multiple instances of the same service
			if (thing instanceof SyncDescriptor) {
				thing = this._createAndCacheServiceInstance(id, thing);
			}
			services.set(id, thing);
		});
		return new InstantiationService(services, this._strict);
	}


	invokeFunction<R>(signature: (accessor: ServicesAccessor, ...more: any[]) => R, ...args: any[]): R {
		let accessor: ServicesAccessor;
		try {
			accessor = {
				get: <T>(id: ServiceIdentifier<T>, isOptional?: typeof optional) => {
					const result = this._getOrCreateServiceInstance(id);
					if (!result && isOptional !== optional) {
						throw new Error(`[invokeFunction] unkown service '${id}'`);
					}
					return result;
				}
			};
			return signature.apply(undefined, [accessor].concat(args));
		} finally {
			accessor.get = function () {
				throw new Error('service accessor is only valid during the invocation of its target method');
			};
		}
	}


	createInstance(param: any, ...rest: any[]): any {

		if (param instanceof SyncDescriptor) {
			// sync
			return this._createInstance(param, rest);

		} else {
			// sync, just ctor
			return this._createInstance(new SyncDescriptor(param), rest);
		}
	}

	private _createInstance<T>(desc: SyncDescriptor<T>, args: any[]): T {

		// arguments given by createInstance-call and/or the descriptor
		let staticArgs = desc.staticArguments.concat(args);

		// arguments defined by service decorators
		const serviceDependencies = _util.getServiceDependencies(desc.ctor).sort((a, b) => a.index - b.index);
		const serviceArgs: any[] = [];
		for (const dependency of serviceDependencies) {
			const service = this._getOrCreateServiceInstance(dependency.id);
			if (!service && this._strict && !dependency.optional) {
				throw new Error(`[createInstance] ${desc.ctor.name} depends on UNKNOWN service ${dependency.id}.`);
			}
			serviceArgs.push(service);
		}

		const firstServiceArgPos = serviceDependencies.length > 0 ? serviceDependencies[0].index : staticArgs.length;

		// check for argument mismatches, adjust static args if needed
		if (staticArgs.length !== firstServiceArgPos) {
			console.warn(`[createInstance] First service dependency of ${desc.ctor.name} at position ${
				firstServiceArgPos + 1} conflicts with ${staticArgs.length} static arguments`);

			const delta = firstServiceArgPos - staticArgs.length;
			if (delta > 0) {
				staticArgs = staticArgs.concat(new Array(delta));
			} else {
				staticArgs = staticArgs.slice(0, firstServiceArgPos);
			}
		}

		// // check for missing args
		// for (let i = 0; i < serviceArgs.length; i++) {
		// 	if (!serviceArgs[i]) {
		// 		console.warn(`${desc.ctor.name} MISSES service dependency ${serviceDependencies[i].id}`, new Error().stack);
		// 	}
		// }

		// now create the instance
		const argArray = [desc.ctor];
		argArray.push(...staticArgs);
		argArray.push(...serviceArgs);

		return <T>create.apply(null, argArray);
	}

	private _getOrCreateServiceInstance<T>(id: ServiceIdentifier<T>): T {
		const thing = this._services.get(id);
		if (thing instanceof SyncDescriptor) {
			return this._createAndCacheServiceInstance(id, thing);
		} else {
			return thing;
		}
	}

	private _createAndCacheServiceInstance<T>(id: ServiceIdentifier<T>, desc: SyncDescriptor<T>): T {
		if (!(this._services.get(id) instanceof SyncDescriptor)) {
			throw new Error('Assertion Failed');
		}

		const graph = new Graph<{ id: ServiceIdentifier<any>, desc: SyncDescriptor<any> }>(data => data.id.toString());

		function throwCycleError() {
			const err = new Error('[createInstance] cyclic dependency between services');
			err.message = graph.toString();
			throw err;
		}

		let count = 0;
		const stack = [{ id, desc }];
		while (stack.length) {
			const item = stack.pop();
			graph.lookupOrInsertNode(item);

			// TODO@joh use the graph to find a cycle
			// a weak heuristic for cycle checks
			if (count++ > 100) {
				throwCycleError();
			}

			// check all dependencies for existence and if the need to be created first
			const dependencies = _util.getServiceDependencies(item.desc.ctor);
			for (const dependency of dependencies) {

				const instanceOrDesc = this._services.get(dependency.id);
				if (!instanceOrDesc) {
					console.warn(`[createInstance] ${id} depends on ${dependency.id} which is NOT registered.`);
				}

				if (instanceOrDesc instanceof SyncDescriptor) {
					const d = { id: dependency.id, desc: instanceOrDesc };
					graph.insertEdge(item, d);
					stack.push(d);
				}
			}
		}

		while (true) {
			const roots = graph.roots();

			// if there is no more roots but still
			// nodes in the graph we have a cycle
			if (roots.length === 0) {
				if (graph.length !== 0) {
					throwCycleError();
				}
				break;
			}

			for (const root of roots) {
				// create instance and overwrite the service collections
				const instance = this._createInstance(root.data.desc, []);
				this._services.set(root.data.id, instance);
				graph.removeNode(root.data);
			}
		}

		return <T>this._services.get(id);
	}


	// tslint:disable-next-line:check-comment
	public renderReact<P extends InstantiationProps>(element: React.ReactElement<P>, container: Element | null, ...rest: any[]): Promise<Component<P, ComponentState> | Element | void> {
		return new Promise<Component<P, ComponentState> | Element | void>((resolve, reject) => {
			element.props.instantiationService = this;
			if (rest && rest.length > 0) {
				if (!element.props.args) {
					element.props.args = [];
				}
				for (let i = 0; i < rest.length; i++) {
					element.props.args.push(rest[i]);
				}
			}
			ReactDOM.render(element, container, function () {
				resolve(this);
			});
		});
	}


	// tslint:disable-next-line:check-comment
	public invokeServiceDependenciesFunc(func: Function, owner: any, rest: any[]): void {
		const serviceDependencies = _util.getServiceDependencies(func);
		let serviceArgs: any[] = [];
		for (const dependency of serviceDependencies) {
			const service = this._getOrCreateServiceInstance(dependency.id);
			if (!service && this._strict && !dependency.optional) {
				throw new Error(`[createInstance] ${owner} depends on UNKNOWN service ${dependency.id}.`);
			}
			serviceArgs.push(service);
		}
		serviceArgs = serviceArgs.reverse();
		const argArray = [];
		argArray.push(...rest);
		argArray.push(...serviceArgs);
		func.apply(owner, argArray);
	}


}