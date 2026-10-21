import packageJson from '../../../package.json';

/**
 * Resolves the pinned CDN version for a package from its devDependency entry
 * in package.json, so the version used to build/test locally and the
 * version fetched from a CDN at runtime cannot drift apart.
 *
 * Only applies to packages that are both bundled/tested via a local
 * devDependency and loaded from a CDN at runtime (blockly, jszip, marked,
 * marked-alert). Packages loaded from a CDN only (e.g. dompurify, mermaid)
 * are not covered since there is no local version to derive from.
 * @param {string} packageName Package name as listed in devDependencies.
 * @param {object} [options] Resolution options.
 * @param {Record<string, string>} [options.devDependencies] devDependencies
 *   map to resolve from. Defaults to this library's own package.json; pass
 *   another library's devDependencies here to reuse this resolver for a
 *   package pinned in that library's package.json instead.
 * @param {boolean} [options.exact] When true, require the devDependency to
 *   already be an exact pin (no semver range prefix) and throw otherwise,
 *   instead of silently stripping the prefix. Use this when a caller derives
 *   a content hash or Git ref from the version and a drifting range would
 *   silently resolve to a different build than the one tested locally.
 * @returns {string} Exact version string, with any semver range prefix stripped.
 */
export function getCdnPackageVersion(packageName, options = {}) {
  const devDependencies = options.devDependencies || packageJson.devDependencies;
  const range = devDependencies?.[packageName];

  if (!range) {
    throw new Error(`No devDependency version found for "${packageName}".`);
  }

  if (options.exact && !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.test(range)) {
    throw new Error(`devDependency "${packageName}" must be pinned to an exact version, got "${range}".`);
  }

  return range.replace(/^[^\d]*/, '');
}
