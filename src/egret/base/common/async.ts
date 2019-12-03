
export interface ITask<T> {
	(): T;
}

export type ValueCallback<T = any> = (value: T | PromiseLike<T>) => void;

export class Delayer<T> {

	private timeout: number;
	private completionPromise: Promise<any>;
	private onSuccess: ValueCallback;
	private task: ITask<T | Promise<T>>;

	constructor(public defaultDelay: number) {
		this.timeout = null;
		this.completionPromise = null;
		this.onSuccess = null;
		this.task = null;
	}

	public trigger(task: ITask<T | Promise<T>>, delay: number = this.defaultDelay): Promise<T> {
		this.task = task;
		this.cancelTimeout();

		if (!this.completionPromise) {
			this.completionPromise = new Promise((c) => {
				this.onSuccess = c;
			});
		}

		this.timeout = <any>setTimeout(() => {
			this.timeout = null;
			this.onSuccess(null);
		}, delay);

		return this.completionPromise;
	}

	public isTriggered(): boolean {
		return this.timeout !== null;
	}

	public cancel(): void {
		this.cancelTimeout();

		if (this.completionPromise) {
			this.completionPromise = null;
		}
	}

	private cancelTimeout(): void {
		if (this.timeout !== null) {
			clearTimeout(this.timeout);
			this.timeout = null;
		}
	}
}

export class Throttler {

	private activePromise: Promise<any>;
	private queuedPromise: Promise<any>;
	private queuedPromiseFactory: ITask<Promise<any>>;

	constructor() {
		this.activePromise = null;
		this.queuedPromise = null;
		this.queuedPromiseFactory = null;
	}

	public queue<T>(promiseFactory: ITask<Promise<T>>): Promise<T> {
		if (this.activePromise) {
			this.queuedPromiseFactory = promiseFactory;

			if (!this.queuedPromise) {
				const onComplete = () => {
					this.queuedPromise = null;

					const result = this.queue(this.queuedPromiseFactory);
					this.queuedPromiseFactory = null;

					return result;
				};

				this.queuedPromise = new Promise((c, e) => {
					this.activePromise.then(onComplete, onComplete).then(c);
				});
			}

			return new Promise((c, e) => {
				this.queuedPromise.then(c, e);
			});
		}

		this.activePromise = promiseFactory();

		return new Promise((c, e) => {
			this.activePromise.then((result: any) => {
				this.activePromise = null;
				c(result);
			});
		});
	}
}

export class ThrottledDelayer<T> extends Delayer<Promise<T>> {

	private throttler: Throttler;

	constructor(defaultDelay: number) {
		super(defaultDelay);

		this.throttler = new Throttler();
	}

	public trigger(promiseFactory: ITask<Promise<T>>, delay?: number): Promise<any> {
		return super.trigger(() => this.throttler.queue(promiseFactory), delay);
	}
}