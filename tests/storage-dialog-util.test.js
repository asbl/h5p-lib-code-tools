import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fire } = vi.hoisted(() => ({
  fire: vi.fn(),
}));

vi.mock('sweetalert2-uncensored', () => ({
  default: { fire }
}));

import DialogQueue from '../src/scripts/dialog-queue.js';
import StorageManager from '../src/scripts/manager/storagemanager.js';
import Util from '../src/scripts/services/util.js';

describe('DialogQueue', () => {
  beforeEach(() => {
    fire.mockReset();
  });

  it('escapes alert text and runs dialogs sequentially', async () => {
    let firstResolve;
    fire
      .mockImplementationOnce(() => new Promise((resolve) => {
        firstResolve = resolve;
      }))
      .mockResolvedValueOnce({ value: 'typed value' });

    const queue = new DialogQueue();
    const first = queue.enqueueAlert('<tag>\n&');
    const second = queue.enqueueInput('Prompt');

    await Promise.resolve();
    expect(fire).toHaveBeenCalledTimes(1);
    expect(fire).toHaveBeenNthCalledWith(1, expect.objectContaining({
      html: '&lt;tag&gt;<br/>&amp;',
      confirmButtonText: '…continue',
      showCancelButton: true,
    }));

    firstResolve({});
    await first;
    expect(await second).toBe('typed value');
    expect(fire).toHaveBeenCalledTimes(2);
    expect(fire).toHaveBeenNthCalledWith(2, expect.objectContaining({
      title: 'Prompt',
      input: 'text',
      confirmButtonText: 'OK',
      showCancelButton: false,
    }));
  });

  it('returns an empty string for dismissed input dialogs', async () => {
    fire.mockResolvedValue({});

    const queue = new DialogQueue();

    await expect(queue.enqueueInput('Name')).resolves.toBe('');
  });
});

describe('StorageManager', () => {
  let codeContainer;
  let editorManager;
  let storage;

  const selectFile = (input, file) => {
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: file ? [file] : [],
    });
    input.dispatchEvent(new Event('change'));
  };

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => storage[key] ?? null),
      setItem: vi.fn((key, value) => {
        storage[key] = String(value);
      }),
      clear: vi.fn(() => {
        storage = {};
      }),
    });

    editorManager = {
      getCode: vi.fn(() => 'print(1)'),
      setCode: vi.fn(),
      getWorkspaceSnapshot: vi.fn(() => ({
        entryFileName: 'main.py',
        activeFileName: 'main.py',
        files: [
          {
            name: 'main.py',
            code: 'print(1)',
            visible: true,
            editable: true,
            isEntry: true,
          },
        ],
      })),
    };
    codeContainer = {
      getCode: vi.fn(() => 'print(1)'),
      getEditorManager: vi.fn(() => editorManager),
      setCode: vi.fn(),
      supportsProjectStorage: vi.fn(() => false),
      getProjectBundle: vi.fn(() => null),
      applyProjectBundle: vi.fn(() => false),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('saves to and loads from localStorage', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const manager = new StorageManager(codeContainer, { localStorageKey: 'code-key' });

    manager.saveToLocalStorage();
    expect(localStorage.getItem('code-key')).toBe('print(1)');

    localStorage.setItem('code-key', 'print(2)');
    expect(manager.loadFromLocalStorage()).toBe('print(2)');
    expect(editorManager.setCode).toHaveBeenCalledWith('print(2)');
    expect(log).toHaveBeenCalled();
  });

  it('downloads code via a blob URL', () => {
    const click = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const createElement = vi.spyOn(document, 'createElement');

    createElement.mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        element.click = click;
      }
      return element;
    });

    const manager = new StorageManager(codeContainer, { downloadFilename: 'example.py' });
    manager.downloadCode();

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('loads code from a selected file', async () => {
    const originalCreateElement = document.createElement.bind(document);
    const createElement = vi.spyOn(document, 'createElement');

    vi.stubGlobal('FileReader', class FileReader {
      readAsText() {
        this.onload({ target: { result: 'print(3)' } });
      }
    });

    createElement.mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'input') {
        element.click = () => {
          selectFile(element, { name: 'sample.py' });
        };
      }
      return element;
    });

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const manager = new StorageManager(codeContainer);

    await expect(manager.loadFile()).resolves.toBe('print(3)');
    expect(codeContainer.setCode).toHaveBeenCalledWith('print(3)');
    expect(editorManager.setCode).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
  });

  it('resolves to null when the user cancels loading', async () => {
    const originalCreateElement = document.createElement.bind(document);
    const createElement = vi.spyOn(document, 'createElement');

    createElement.mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'input') {
        element.click = () => {
          element.dispatchEvent(new Event('cancel'));
        };
      }
      return element;
    });

    const manager = new StorageManager(codeContainer);

    await expect(manager.loadFile()).resolves.toBeNull();
    expect(codeContainer.setCode).not.toHaveBeenCalled();
    expect(editorManager.setCode).not.toHaveBeenCalled();
    expect(codeContainer.applyProjectBundle).not.toHaveBeenCalled();
  });

  it('downloads a project bundle when the project contains additional files', () => {
    const click = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const createElement = vi.spyOn(document, 'createElement');

    createElement.mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        element.click = click;
      }
      return element;
    });

    codeContainer.supportsProjectStorage.mockReturnValue(true);
    codeContainer.getProjectBundle.mockReturnValue({
      type: 'h5p-python-question-project',
      version: 1,
      sourceFiles: [],
      images: [],
      sounds: [],
    });

    const manager = new StorageManager(codeContainer, {
      projectDownloadFilename: 'project.h5pproject',
    });

    manager.downloadCode();

    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('loads a project bundle and applies it to the container', async () => {
    const originalCreateElement = document.createElement.bind(document);
    const createElement = vi.spyOn(document, 'createElement');

    codeContainer.supportsProjectStorage.mockReturnValue(true);
    codeContainer.applyProjectBundle.mockReturnValue(true);

    vi.stubGlobal('FileReader', class FileReader {
      readAsText() {
        this.onload({
          target: {
            result: JSON.stringify({
              type: 'h5p-python-question-project',
              version: 1,
              sourceFiles: [
                {
                  name: 'main.py',
                  code: 'print(4)',
                  visible: true,
                  editable: true,
                  isEntry: true,
                },
              ],
              images: [],
              sounds: [],
            }),
          },
        });
      }
    });

    createElement.mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'input') {
        element.click = () => {
          selectFile(element, { name: 'project.h5pproject' });
        };
      }
      return element;
    });

    const manager = new StorageManager(codeContainer);

    await expect(manager.loadFile()).resolves.toEqual(expect.objectContaining({
      type: 'h5p-python-question-project',
      version: 1,
    }));
    expect(codeContainer.applyProjectBundle).toHaveBeenCalledTimes(1);
    expect(editorManager.setCode).not.toHaveBeenCalled();
  });

  it('rejects invalid project bundles instead of loading them as plain text', async () => {
    const originalCreateElement = document.createElement.bind(document);
    const createElement = vi.spyOn(document, 'createElement');

    codeContainer.supportsProjectStorage.mockReturnValue(true);

    vi.stubGlobal('FileReader', class FileReader {
      readAsText() {
        this.onload({
          target: {
            result: JSON.stringify({
              type: 'h5p-python-question-project',
              version: 1,
              sourceFiles: [],
            }),
          },
        });
      }
    });

    createElement.mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'input') {
        element.click = () => {
          selectFile(element, { name: 'project.h5pproject' });
        };
      }
      return element;
    });

    const manager = new StorageManager(codeContainer);

    await expect(manager.loadFile()).rejects.toEqual(
      expect.objectContaining({ code: 'load_invalid_project_bundle' })
    );
    expect(codeContainer.applyProjectBundle).not.toHaveBeenCalled();
    expect(codeContainer.setCode).not.toHaveBeenCalled();
    expect(editorManager.setCode).not.toHaveBeenCalled();
  });
});

describe('Util', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('deeply extends objects', () => {
    expect(Util.extend({ a: { b: 1 }, c: 2 }, { a: { d: 3 } }, { e: 4 })).toEqual({
      a: { b: 1, d: 3 },
      c: 2,
      e: 4,
    });
  });

  it('runs callbacks when the document is already ready', async () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'interactive',
    });

    Util.setupOnDocumentReady(callback);
    await vi.advanceTimersByTimeAsync(500);
    await Promise.resolve();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('waits for DOMContentLoaded when the document is still loading', async () => {
    const callback = vi.fn();
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'loading',
    });

    Util.setupOnDocumentReady(callback);
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await Promise.resolve();

    expect(callback).toHaveBeenCalledTimes(1);
  });
});