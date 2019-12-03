import { trim } from './strings';
import { IDisposable } from './lifecycle';
/**
 * 是否包含
 * @param target 
 * @param container 
 */
export function contains(target: Element, container: Element): boolean {
	let current: Element = target;
	if (target == container) {
		return true;
	}
	while (current.parentElement) {
		current = current.parentElement;
		if (current == container) {
			return true;
		}
	}
	return false;
}


/**
 * 清空节点的所有子节点
 */
export function clearNode(node: HTMLElement) {
	while (node.firstChild) {
		node.removeChild(node.firstChild);
	}
}
/**
 * 判断某一个是否在document的节点树中
 * @param node 
 */
export function isInDOM(node: Node): boolean {
	while (node) {
		if (node === document.body) {
			return true;
		}
		node = node.parentNode;
	}
	return false;
}

/**
 * 判断某一个节点是否具有指定的类名
 * @param node 
 * @param className 
 */
export function hasClass(node: HTMLElement, className: string): boolean {
	let classNames: string[] = node.className.split(' ');
	if (!classNames) {
		classNames = [];
	}
	className = trim(className);
	for (let i = 0; i < classNames.length; i++) {
		let curName = classNames[i];
		curName = trim(curName);
		if (curName && curName == className) {
			return true;
		}
	}
	return false;
}


/**
 * 给某一个节点添加类名
 * @param node 
 * @param className 
 */
export function addClass(node: HTMLElement, className: string): void {
	let classNames: string[] = node.className.split(' ');
	if (!classNames) {
		classNames = [];
	}
	const newClassNames: string[] = [];
	for (var i = 0; i < classNames.length; i++) {
		let curName = classNames[i];
		curName = trim(curName);
		if (curName) {
			newClassNames.push(curName);
		}
	}
	let includeClassNames = className.split(' ');
	if (!includeClassNames) {
		includeClassNames = [];
	}
	for (var i = 0; i < includeClassNames.length; i++) {
		let curClassName = includeClassNames[i];
		curClassName = trim(curClassName);
		if (curClassName && newClassNames.indexOf(curClassName) == -1) {
			newClassNames.push(curClassName);
		}
	}
	node.className = newClassNames.join(' ');
}

/**
 * 移除某一个节点的类名 ,修改支持 ‘aaaa bbbb'
 * @param node 
 * @param className 
 */
export function removeClass(node: HTMLElement, className: string): void {
	let classNames: string[] = node.className.split(' ');
	if (!classNames) {
		classNames = [];
	}
	className = trim(className);
	let includeClassNames: string[] = className.split(' ');
	if (!includeClassNames) {
		includeClassNames = [];
	}
	const newClassNames: string[] = [];
	for (let i = 0; i < classNames.length; i++) {
		let curName = classNames[i];
		curName = trim(curName);
		if (curName && includeClassNames.indexOf(curName) === -1) {
			newClassNames.push(curName);
		}
	}
	node.className = newClassNames.join(' ');
}



class DomResizeChecker {
	constructor() {
		window.addEventListener('resize', e => this.checkDomResizeChange());
		// setInterval(() => this.checkDomResizeChange(), 200);
	}
	private checking = false;
	/**
	 * 标记需要检查
	 */
	public invalidateCheck(): void {
		if (this.checking) {
			return;
		}
		this.checking = true;
		setTimeout(() => {
			this.checking = false;
			this.checkDomResizeChange();
		}, 1);
	}


	private nodes: { cacheX: number, cacheY: number, cacheW: number, cacheH: number, node: HTMLElement }[] = [];
	public watchResizeChange(node: HTMLElement): IDisposable {
		let hasAdd = false;
		for (let i = 0; i < this.nodes.length; i++) {
			if (this.nodes[i].node == node) {
				hasAdd = true;
				break;
			}
		}
		if (hasAdd) {
			return { dispose: () => { } };
		}
		const nodeCage = {
			cacheX: node.offsetLeft,
			cacheY: node.offsetTop,
			cacheW: node.offsetWidth,
			cacheH: node.offsetHeight,
			node: node
		};
		this.nodes.push(nodeCage);
		return {
			dispose: () => {
				const index = this.nodes.indexOf(nodeCage);
				if (index != -1) {
					this.nodes.splice(index, 1);
				}
			}
		};
	}
	private checkDomResizeChange(): void {
		for (let i = 0; i < this.nodes.length; i++) {
			const node = this.nodes[i];
			if (
				node.cacheX != node.node.offsetLeft ||
				node.cacheY != node.node.offsetTop ||
				node.cacheW != node.node.offsetWidth ||
				node.cacheH != node.node.offsetHeight
			) {
				node.cacheX = node.node.offsetLeft;
				node.cacheY = node.node.offsetTop;
				node.cacheW = node.node.offsetWidth;
				node.cacheH = node.node.offsetHeight;
				node.node.dispatchEvent(new Event('resize'));
			}
		}
	}
}

const resizeChecker = new DomResizeChecker();
/**
 * 监听某个
 * @param node 
 */
export function watchResizeChange(node: HTMLElement): IDisposable {
	return resizeChecker.watchResizeChange(node);
}
/**
 * 失效尺寸检查
 */
export function invalidateReisizeCheck(): void {
	resizeChecker.invalidateCheck();
}


/**
 * 为样式赋值
 *
 * @private
 * @param {Object} styleTarget
 * @param {Object} styleSource
 * @memberof LayerView
 */
export function voluationToStyle(styleTarget: Object, styleSource: Object): void {
	for (const key in styleSource) {
		styleTarget[key] = styleSource[key];
	}
}