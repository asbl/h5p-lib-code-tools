import { describe, expect, it } from 'vitest';

import {
  ensureCodeMirrorRuntime,
  getCodeMirrorRuntime,
  resetCodeMirrorRuntime,
} from '../src/scripts/editor/codemirror/codemirror-runtime.js';

describe('CodeMirror runtime', () => {
  it('returns the bundled runtime with all required exports', async () => {
    const runtime = await ensureCodeMirrorRuntime();

    expect(runtime.EditorView).toBeTypeOf('function');
    expect(runtime.EditorState).toBeTypeOf('function');
    expect(runtime.Compartment).toBeTypeOf('function');
    expect(runtime.python).toBeTypeOf('function');
    expect(runtime.javascript).toBeTypeOf('function');
    expect(runtime.markdown).toBeTypeOf('function');
    expect(runtime.sql).toBeTypeOf('function');
    expect(runtime.bracketMatching).toBeTypeOf('function');
    expect(runtime.autocompletion).toBeTypeOf('function');
    expect(runtime.oneDark).toBeTruthy();
  });

  it('returns the same runtime instance on every call regardless of url', async () => {
    const first = await ensureCodeMirrorRuntime();
    const second = await ensureCodeMirrorRuntime('https://esm.sh/');

    expect(first).toBe(second);
  });

  it('getCodeMirrorRuntime returns the bundled runtime synchronously', () => {
    const runtime = getCodeMirrorRuntime();

    expect(runtime.EditorState).toBeTypeOf('function');
  });

  it('resetCodeMirrorRuntime is a no-op and does not break subsequent calls', () => {
    resetCodeMirrorRuntime();

    const runtime = getCodeMirrorRuntime();
    expect(runtime.EditorView).toBeTypeOf('function');
  });

  it('does not inject an importmap into the document', async () => {
    await ensureCodeMirrorRuntime();

    expect(document.head.querySelector('script[type="importmap"]')).toBeNull();
  });
});
