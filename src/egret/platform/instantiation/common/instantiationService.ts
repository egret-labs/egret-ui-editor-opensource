import { Graph } from '../../../base/common/graph';
import { SyncDescriptor } from './descriptors';
import { ServiceIdentifier, IInstantiationService, ServicesAccessor, _util, optional } from './instantiation';
import { ServiceCollection } from './serviceCollection';
import { Component, ComponentState } from 'react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { InstantiationProps } from '../../react/common/component';

// TRACING
const _enableTracing = false;

class CyclicDependencyError extends Error {
	constructor(graph: Graph<any>) {
		super('cyclic dependency between services');
		this.message = graph.toString();
	}
}
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
	_serviceBrand: undefined;

	private readonly _services: ServiceCollection;
	private readonly _strict: boolean;
	private readonly _parent?: InstantiationService;

	constructor(services: ServiceCollection = new ServiceCollection(), strict: boolean = false, parent?: InstantiationService) {
		//取消冻结方法，为了构造react
		Object.freeze = <T>(f: T) => { return f; };
		this._services = services;
		this._strict = strict;
		this._parent = parent;

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
		return new InstantiationService(services, this._strict, this);
	}

	invokeFunction<R, TS extends any[] = []>(fn: (accessor: ServicesAccessor, ...args: TS) => R, ...args: TS): R {
		let _trace = Trace.traceInvocation(fn);
		let _done = false;
		try {
			const accessor: ServicesAccessor = {
				get: <T>(id: ServiceIdentifier<T>, isOptional?: typeof optional) => {

					if (_done) {
						throw new Error('service accessor is only valid during the invocation of its target method');
					}

					const result = this._getOrCreateServiceInstance(id, _trace);
					if (!result && isOptional !== optional) {
						throw new Error(`[invokeFunction] unknown service '${id}'`);
					}
					return result;
				}
			};
			return fn(accessor, ...args);
		} finally {
			_done = true;
			_trace.stop();
		}
	}

	createInstance(ctorOrDescriptor: any | SyncDescriptor<any>, ...rest: any[]): any {
		let _trace: Trace;
		let result: any;
		if (ctorOrDescriptor instanceof SyncDescriptor) {
			_trace = Trace.traceCreation(ctorOrDescriptor.ctor);
			result = this._createInstance(ctorOrDescriptor.ctor, ctorOrDescriptor.staticArguments.concat(rest), _trace);
		} else {
			_trace = Trace.traceCreation(ctorOrDescriptor);
			result = this._createInstance(ctorOrDescriptor, rest, _trace);
		}
		_trace.stop();
		return result;
	}

	private _createInstance<T>(ctor: any, args: any[] = [], _trace: Trace): T {

		// arguments defined by service decorators
		let serviceDependencies = _util.getServiceDependencies(ctor).sort((a, b) => a.index - b.index);
		let serviceArgs: any[] = [];
		for (const dependency of serviceDependencies) {
			let service = this._getOrCreateServiceInstance(dependency.id, _trace);
			if (!service && this._strict && !dependency.optional) {
				throw new Error(`[createInstance] ${ctor.name} depends on UNKNOWN service ${dependency.id}.`);
			}
			serviceArgs.push(service);
		}

		let firstServiceArgPos = serviceDependencies.length > 0 ? serviceDependencies[0].index : args.length;

		// check for argument mismatches, adjust static args if needed
		if (args.length !== firstServiceArgPos) {
			console.warn(`[createInstance] First service dependency of ${ctor.name} at position ${
				firstServiceArgPos + 1} conflicts with ${args.length} static arguments`);

			let delta = firstServiceArgPos - args.length;
			if (delta > 0) {
				args = args.concat(new Array(delta));
			} else {
				args = args.slice(0, firstServiceArgPos);
			}
		}

		// now create the instance
		return <T>new ctor(...[...args, ...serviceArgs]);
	}

	private _setServiceInstance<T>(id: ServiceIdentifier<T>, instance: T): void {
		if (this._services.get(id) instanceof SyncDescriptor) {
			this._services.set(id, instance);
		} else if (this._parent) {
			this._parent._setServiceInstance(id, instance);
		} else {
			throw new Error('illegalState - setting UNKNOWN service instance');
		}
	}

	private _getServiceInstanceOrDescriptor<T>(id: ServiceIdentifier<T>): T | SyncDescriptor<T> {
		let instanceOrDesc = this._services.get(id);
		if (!instanceOrDesc && this._parent) {
			return this._parent._getServiceInstanceOrDescriptor(id);
		} else {
			return instanceOrDesc;
		}
	}

	private _getOrCreateServiceInstance<T>(id: ServiceIdentifier<T>, _trace: Trace): T {
		let thing = this._getServiceInstanceOrDescriptor(id);
		if (thing instanceof SyncDescriptor) {
			return this._createAndCacheServiceInstance(id, thing, _trace.branch(id, true));
		} else {
			_trace.branch(id, false);
			return thing;
		}
	}

	private _createAndCacheServiceInstance<T>(id: ServiceIdentifier<T>, desc: SyncDescriptor<T>, _trace: Trace): T {
		type Triple = { id: ServiceIdentifier<any>, desc: SyncDescriptor<any>, _trace: Trace };
		const graph = new Graph<Triple>(data => data.id.toString());

		let cycleCount = 0;
		const stack = [{ id, desc, _trace }];
		while (stack.length) {
			const item = stack.pop()!;
			graph.lookupOrInsertNode(item);

			// a weak but working heuristic for cycle checks
			if (cycleCount++ > 1000) {
				throw new CyclicDependencyError(graph);
			}

			// check all dependencies for existence and if they need to be created first
			for (let dependency of _util.getServiceDependencies(item.desc.ctor)) {

				let instanceOrDesc = this._getServiceInstanceOrDescriptor(dependency.id);
				if (!instanceOrDesc && !dependency.optional) {
					console.warn(`[createInstance] ${id} depends on ${dependency.id} which is NOT registered.`);
				}

				if (instanceOrDesc instanceof SyncDescriptor) {
					const d = { id: dependency.id, desc: instanceOrDesc, _trace: item._trace.branch(dependency.id, true) };
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
				if (!graph.isEmpty()) {
					throw new CyclicDependencyError(graph);
				}
				break;
			}

			for (const { data } of roots) {
				// create instance and overwrite the service collections
				const instance = this._createServiceInstanceWithOwner(data.id, data.desc.ctor, data.desc.staticArguments, data._trace);
				this._setServiceInstance(data.id, instance);
				graph.removeNode(data);
			}
		}

		return <T>this._getServiceInstanceOrDescriptor(id);
	}

	private _createServiceInstanceWithOwner<T>(id: ServiceIdentifier<T>, ctor: any, args: any[] = [], _trace: Trace): T {
		if (this._services.get(id) instanceof SyncDescriptor) {
			return this._createServiceInstance(ctor, args, _trace);
		} else if (this._parent) {
			return this._parent._createServiceInstanceWithOwner(id, ctor, args, _trace);
		} else {
			throw new Error(`illegalState - creating UNKNOWN service instance ${ctor.name}`);
		}
	}

	private _createServiceInstance<T>(ctor: any, args: any[] = [], _trace: Trace): T {
			// eager instantiation
			return this._createInstance(ctor, args, _trace);
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
		let _trace = Trace.traceInvocation(func);
		const serviceDependencies = _util.getServiceDependencies(func);
		let serviceArgs: any[] = [];
		for (const dependency of serviceDependencies) {
			const service = this._getOrCreateServiceInstance(dependency.id, _trace);
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


//#region -- tracing ---

const enum TraceType {
	Creation, Invocation, Branch
}

class Trace {

	private static readonly _None = new class extends Trace {
		constructor() { super(-1, null); }
		stop() { }
		branch() { return this; }
	};

	static traceInvocation(ctor: any): Trace {
		return !_enableTracing ? Trace._None : new Trace(TraceType.Invocation, ctor.name || (ctor.toString() as string).substring(0, 42).replace(/\n/g, ''));
	}

	static traceCreation(ctor: any): Trace {
		return !_enableTracing ? Trace._None : new Trace(TraceType.Creation, ctor.name);
	}

	private static _totals: number = 0;
	private readonly _start: number = Date.now();
	private readonly _dep: [ServiceIdentifier<any>, boolean, Trace?][] = [];

	private constructor(
		readonly type: TraceType,
		readonly name: string | null
	) { }

	branch(id: ServiceIdentifier<any>, first: boolean): Trace {
		let child = new Trace(TraceType.Branch, id.toString());
		this._dep.push([id, first, child]);
		return child;
	}

	stop() {
		let dur = Date.now() - this._start;
		Trace._totals += dur;

		let causedCreation = false;

		function printChild(n: number, trace: Trace) {
			let res: string[] = [];
			let prefix = new Array(n + 1).join('\t');
			for (const [id, first, child] of trace._dep) {
				if (first && child) {
					causedCreation = true;
					res.push(`${prefix}CREATES -> ${id}`);
					let nested = printChild(n + 1, child);
					if (nested) {
						res.push(nested);
					}
				} else {
					res.push(`${prefix}uses -> ${id}`);
				}
			}
			return res.join('\n');
		}

		let lines = [
			`${this.type === TraceType.Creation ? 'CREATE' : 'CALL'} ${this.name}`,
			`${printChild(1, this)}`,
			`DONE, took ${dur.toFixed(2)}ms (grand total ${Trace._totals.toFixed(2)}ms)`
		];

		if (dur > 2 || causedCreation) {
			console.log(lines.join('\n'));
		}
	}
}

//#endregion