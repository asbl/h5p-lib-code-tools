import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceAutosave from '../src/scripts/services/workspace-autosave.js';

describe('WorkspaceAutosave', () => {
  beforeEach(() => {
    const store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
      setItem: vi.fn((key, value) => store.set(key, String(value))),
      removeItem: vi.fn((key) => store.delete(key)),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('clear() removes the stored snapshot and cancels a pending save', async () => {
    vi.useFakeTimers();
    const autosave = new WorkspaceAutosave('task-1', { debounceMs: 700 });

    await autosave.save({ files: [{ name: 'main.py', code: 'old' }] });
    expect(await autosave.load()).toEqual({ files: [{ name: 'main.py', code: 'old' }] });

    autosave.schedule({ files: [{ name: 'main.py', code: 'pending' }] });
    await autosave.clear();
    await vi.runAllTimersAsync();

    expect(await autosave.load()).toBeNull();
  });
});
