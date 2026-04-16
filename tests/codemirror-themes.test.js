import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/scripts/editor/codemirror/codemirror-runtime.js', () => {
  const runtime = {
    EditorView: {
      theme: vi.fn((spec, options) => ({ spec, options })),
    },
    syntaxHighlighting: vi.fn((style) => ({ style })),
    defaultHighlightStyle: { name: 'default-highlight' },
    oneDark: { name: 'one-dark' },
  };

  return {
    getCodeMirrorRuntime: () => runtime,
  };
});

import { getCodeMirrorThemeExtensions } from '../src/scripts/editor/codemirror/codemirror-themes.js';

describe('CodeMirror themes', () => {
  it('returns a non-empty array of extensions for the light theme', () => {
    const extensions = getCodeMirrorThemeExtensions('light');

    expect(Array.isArray(extensions)).toBe(true);
    expect(extensions.length).toBeGreaterThan(0);
  });

  it('returns a non-empty array of extensions for the dark theme', () => {
    const extensions = getCodeMirrorThemeExtensions('dark');

    expect(Array.isArray(extensions)).toBe(true);
    expect(extensions.length).toBeGreaterThan(0);
  });

  it('returns different extension sets for light and dark', () => {
    const light = getCodeMirrorThemeExtensions('light');
    const dark = getCodeMirrorThemeExtensions('dark');

    expect(light).not.toStrictEqual(dark);
  });

  it('falls back to the light extensions for unknown theme names', () => {
    const light = getCodeMirrorThemeExtensions('light');
    const unknown = getCodeMirrorThemeExtensions('ocean');

    expect(unknown).toStrictEqual(light);
  });

  it('returns the same array reference on repeated calls (stable identity)', () => {
    const first = getCodeMirrorThemeExtensions('dark');
    const second = getCodeMirrorThemeExtensions('dark');

    expect(first).toBe(second);
  });
});
