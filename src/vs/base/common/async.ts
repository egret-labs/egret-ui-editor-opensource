/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as platform from 'vs/base/common/platform';
import { Disposable } from 'vs/base/common/lifecycle';

export class TimeoutTimer extends Disposable {
	private _token: platform.TimeoutToken;

	constructor() {
		super();
		this._token = -1;
	}

	dispose(): void {
		this.cancel();
		super.dispose();
	}

	cancel(): void {
		if (this._token !== -1) {
			platform.clearTimeout(this._token);
			this._token = -1;
		}
	}

	cancelAndSet(runner: () => void, timeout: number): void {
		this.cancel();
		this._token = platform.setTimeout(() => {
			this._token = -1;
			runner();
		}, timeout);
	}

	setIfNotSet(runner: () => void, timeout: number): void {
		if (this._token !== -1) {
			// timer is already set
			return;
		}
		this._token = platform.setTimeout(() => {
			this._token = -1;
			runner();
		}, timeout);
	}
}

export class IntervalTimer extends Disposable {


	private _token: platform.IntervalToken;

	constructor() {
		super();
		this._token = -1;
	}

	dispose(): void {
		this.cancel();
		super.dispose();
	}

	cancel(): void {
		if (this._token !== -1) {
			platform.clearInterval(this._token);
			this._token = -1;
		}
	}

	cancelAndSet(runner: () => void, interval: number): void {
		this.cancel();
		this._token = platform.setInterval(() => {
			runner();
		}, interval);
	}
}

export class RunOnceScheduler {

	private timeoutToken: platform.TimeoutToken;
	private runner: () => void;
	private timeout: number;
	private timeoutHandler: () => void;

	constructor(runner: () => void, timeout: number) {
		this.timeoutToken = -1;
		this.runner = runner;
		this.timeout = timeout;
		this.timeoutHandler = this.onTimeout.bind(this);
	}

	/**
	 * Dispose RunOnceScheduler
	 */
	dispose(): void {
		this.cancel();
		this.runner = null;
	}

	/**
	 * Cancel current scheduled runner (if any).
	 */
	cancel(): void {
		if (this.isScheduled()) {
			platform.clearTimeout(this.timeoutToken);
			this.timeoutToken = -1;
		}
	}

	/**
	 * Replace runner. If there is a runner already scheduled, the new runner will be called.
	 */
	setRunner(runner: () => void): void {
		this.runner = runner;
	}

	/**
	 * Cancel previous runner (if any) & schedule a new runner.
	 */
	schedule(delay = this.timeout): void {
		this.cancel();
		this.timeoutToken = platform.setTimeout(this.timeoutHandler, delay);
	}

	/**
	 * Returns true if scheduled.
	 */
	isScheduled(): boolean {
		return this.timeoutToken !== -1;
	}

	private onTimeout() {
		this.timeoutToken = -1;
		if (this.runner) {
			this.runner();
		}
	}
}