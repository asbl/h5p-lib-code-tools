import { describe, expect, it } from 'vitest';

import { getCdnPackageVersion } from '../src/scripts/services/cdn-package-versions.js';
import packageJson from '../package.json';

describe('getCdnPackageVersion', () => {
  it('strips the semver range prefix from a devDependency version', () => {
    expect(getCdnPackageVersion('blockly')).toBe(
      packageJson.devDependencies.blockly.replace(/^[^\d]*/, '')
    );
  });

  it('throws for a package without a devDependency entry', () => {
    expect(() => getCdnPackageVersion('does-not-exist')).toThrow(/devDependency/);
  });
});

describe('CDN version single source of truth', () => {
  it('keeps the Blockly CDN default in sync with the devDependency version', async () => {
    const { DEFAULT_BLOCKLY_CDN_URL } = await import('../src/scripts/editor/blockly/blockly-runtime.js');
    const version = getCdnPackageVersion('blockly');

    expect(DEFAULT_BLOCKLY_CDN_URL).toBe(`https://cdn.jsdelivr.net/npm/blockly@${version}/`);
  });

  it('keeps the JSZip CDN default in sync with the devDependency version', async () => {
    const { DEFAULT_JSZIP_CDN_URL } = await import('../src/scripts/services/jszip-runtime.js');
    const version = getCdnPackageVersion('jszip');

    expect(DEFAULT_JSZIP_CDN_URL).toBe(`https://cdn.jsdelivr.net/npm/jszip@${version}/dist/jszip.min.js`);
  });
});
