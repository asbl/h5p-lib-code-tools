import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createLibCodeToolsL10n,
  getLibCodeToolsL10nValue,
  LibCodeToolsL10nProvider,
} from '../src/scripts/services/libcodetools-l10n.js';

describe('LibCodeTools localization', () => {
  beforeEach(() => {
    globalThis.H5P.t = vi.fn((key, _params, library) => `[Missing translation ${library}:${key}]`);
  });

  it('prefers explicit content overrides from an l10n object', () => {
    const l10n = createLibCodeToolsL10n({ run: 'Ausführen' });

    expect(l10n.run).toBe('Ausführen');
    expect(H5P.t).not.toHaveBeenCalled();
  });

  it('uses H5P library translations when H5P provides them', () => {
    H5P.t.mockImplementation((key, _params, library) => (
      key === 'run' ? 'Library Run' : `[Missing translation ${library}:${key}]`
    ));

    expect(getLibCodeToolsL10nValue({}, 'run')).toBe('Library Run');
  });

  it('falls back to bundled defaults when H5P reports missing translations', () => {
    // The bundled English default for "run" is "Run"
    expect(getLibCodeToolsL10nValue({}, 'run')).toBe('Run');
  });

  it('throws when the key is missing from all sources', () => {
    expect(() => getLibCodeToolsL10nValue({}, 'nonExistentKey_xyzzy')).toThrow(
      'Missing LibCodeTools language key: nonExistentKey_xyzzy',
    );
  });

  it('prefers the proxy override over the H5P library string', () => {
    H5P.t.mockImplementation((key, _params, library) => (
      key === 'stop' ? 'Library Stop' : `[Missing translation ${library}:${key}]`
    ));

    const l10n = createLibCodeToolsL10n({ stop: 'Halt' });

    expect(l10n.stop).toBe('Halt');
  });

  it('proxy falls back to library translation when override is absent', () => {
    H5P.t.mockImplementation((key, _params, library) => (
      key === 'console' ? 'Console (library)' : `[Missing translation ${library}:${key}]`
    ));

    const l10n = createLibCodeToolsL10n({});

    expect(l10n.console).toBe('Console (library)');
  });

  it('proxy uses bundled default when neither override nor library string exists', () => {
    const l10n = createLibCodeToolsL10n({});

    // "save" has a bundled default of "Save"
    expect(l10n.save).toBe('Save');
  });

  it('proxy throws when the key is unknown everywhere', () => {
    const l10n = createLibCodeToolsL10n({});

    expect(() => l10n.totallyUnknownKey_abc).toThrow('Missing LibCodeTools language key');
  });

  it('supports isolated provider instances with custom defaults', () => {
    const provider = new LibCodeToolsL10nProvider({
      library: 'H5P.CustomTools',
      defaultStrings: {
        run: 'Launch',
      },
    });

    expect(provider.getValue({}, 'run')).toBe('Launch');
    expect(H5P.t).toHaveBeenCalledWith('run', undefined, 'H5P.CustomTools');
  });

  it('allows subclasses to replace the host translation lookup', () => {
    class StaticL10nProvider extends LibCodeToolsL10nProvider {
      translate(key) {
        return key === 'run' ? 'Run from subclass' : null;
      }
    }

    const provider = new StaticL10nProvider({ defaultStrings: {} });

    expect(provider.createProxy({}).run).toBe('Run from subclass');
    expect(H5P.t).not.toHaveBeenCalled();
  });
});
