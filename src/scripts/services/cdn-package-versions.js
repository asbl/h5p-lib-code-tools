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
 * @returns {string} Exact version string, with any semver range prefix stripped.
 */
export function getCdnPackageVersion(packageName) {
  const range = packageJson.devDependencies?.[packageName];

  if (!range) {
    throw new Error(`No devDependency version found for "${packageName}".`);
  }

  return range.replace(/^[^\d]*/, '');
}
