'use strict';

import URI from 'egret/base/common/uri';
import { nativeSep, normalize, basename as pathsBasename, join, sep } from 'egret/base/common/paths';
import { endsWith, ltrim, equalsIgnoreCase, startsWithIgnoreCase, rtrim, startsWith } from 'egret/base/common/strings';
import { Schemas } from 'egret/base/common/network';
import { isLinux, isWindows, isMacintosh } from 'egret/base/common/platform';



export interface IUserHomeProvider {
	userHome: string;
}


export interface IWorkspaceFolderProvider {
	getWorkspaceFolder(resource: URI): { uri: URI };
	getWorkspace(): {
		folders: { uri: URI }[];
	};
}

export function getPathLabel(resource: URI | string, rootProvider?: IWorkspaceFolderProvider, userHomeProvider?: IUserHomeProvider): string {
	if (!resource) {
		return null;
	}

	if (typeof resource === 'string') {
		resource = URI.file(resource);
	}

	// return early if the resource is neither file:// nor untitled://
	if (resource.scheme !== Schemas.file && resource.scheme !== Schemas.untitled) {
		return resource.with({ query: null, fragment: null }).toString(true);
	}

	// return early if we can resolve a relative path label from the root
	const baseResource = rootProvider ? rootProvider.getWorkspaceFolder(resource) : null;
	if (baseResource) {
		const hasMultipleRoots = rootProvider.getWorkspace().folders.length > 1;

		let pathLabel: string;
		if (isLinux ? baseResource.uri.fsPath === resource.fsPath : equalsIgnoreCase(baseResource.uri.fsPath, resource.fsPath)) {
			pathLabel = ''; // no label if pathes are identical
		} else {
			pathLabel = normalize(ltrim(resource.fsPath.substr(baseResource.uri.fsPath.length), nativeSep), true);
		}

		if (hasMultipleRoots) {
			const rootName = pathsBasename(baseResource.uri.fsPath);
			pathLabel = pathLabel ? join(rootName, pathLabel) : rootName; // always show root basename if there are multiple
		}

		return pathLabel;
	}

	// convert c:\something => C:\something
	if (hasDriveLetter(resource.fsPath)) {
		return normalize(normalizeDriveLetter(resource.fsPath), true);
	}

	// normalize and tildify (macOS, Linux only)
	let res = normalize(resource.fsPath, true);
	if (!isWindows && userHomeProvider) {
		res = tildify(res, userHomeProvider.userHome);
	}

	return res;
}

let normalizedUserHomeCached: { original: string; normalized: string } = Object.create(null);
export function tildify(path: string, userHome: string): string {
	if (isWindows || !path || !userHome) {
		return path; // unsupported
	}

	// Keep a normalized user home path as cache to prevent accumulated string creation
	let normalizedUserHome = normalizedUserHomeCached.original === userHome ? normalizedUserHomeCached.normalized : void 0;
	if (!normalizedUserHome) {
		normalizedUserHome = `${rtrim(userHome, sep)}${sep}`;
		normalizedUserHomeCached = { original: userHome, normalized: normalizedUserHome };
	}

	// Linux: case sensitive, macOS: case insensitive
	if (isLinux ? startsWith(path, normalizedUserHome) : startsWithIgnoreCase(path, normalizedUserHome)) {
		path = `~/${path.substr(normalizedUserHome.length)}`;
	}

	return path;
}

function hasDriveLetter(path: string): boolean {
	return isWindows && path && path[1] === ':';
}

export function normalizeDriveLetter(path: string): string {
	if (hasDriveLetter(path)) {
		return path.charAt(0).toUpperCase() + path.slice(1);
	}

	return path;
}