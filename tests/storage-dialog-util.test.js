import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fire, ensureSweetAlertRuntime, ensureJsZipRuntime } = vi.hoisted(() => ({
  fire: vi.fn(),
  ensureSweetAlertRuntime: vi.fn(),
  ensureJsZipRuntime: vi.fn(),
}));

vi.mock('../src/scripts/services/sweetalert-runtime.js', () => ({
  ensureSweetAlertRuntime,
  resetSweetAlertRuntime: vi.fn(),
}));

vi.mock('../src/scripts/services/jszip-runtime.js', () => ({
  ensureJsZipRuntime,
  resetJsZipRuntime: vi.fn(),
}));

import DialogQueue from '../src/scripts/dialog-queue.js';
import StorageManager from '../src/scripts/manager/storagemanager.js';
import Util from '../src/scripts/services/util.js';
import JSZip from 'jszip';

async function createProjectZip(entries = {}) {
  const zip = new JSZip();

  Object.entries(entries).forEach(([path, value]) => {
    zip.file(path, value);
  });

  return zip.generateAsync({ type: 'uint8array' });
}

describe('DialogQueue', () => {
  beforeEach(() => {
    fire.mockReset();
    ensureSweetAlertRuntime.mockReset();
    ensureSweetAlertRuntime.mockResolvedValue({ fire });
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
    ensureJsZipRuntime.mockReset();
    ensureJsZipRuntime.mockResolvedValue(JSZip);
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
      getImageManager: vi.fn(() => ({
        extensions: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.avif'],
      })),
      getSoundManager: vi.fn(() => ({
        extensions: ['.wav', '.mp3', '.ogg', '.oga', '.m4a', '.aac', '.flac', '.mid', '.midi', '.weba'],
      })),
      setCode: vi.fn(),
      supportsProjectStorage: vi.fn(() => false),
      getProjectBundle: vi.fn(() => null),
      applyProjectBundle: vi.fn(() => false),
      options: { entryFileName: 'main.py' },
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
    expect(ensureJsZipRuntime).not.toHaveBeenCalled();
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

  it('downloads a project bundle as a zip archive when the project contains additional files', async () => {
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
      sourceFiles: [
        { name: 'main.py', code: 'print(1)' },
        { name: 'helper.py', code: 'VALUE = 2' },
      ],
      images: [
        { name: 'bg.png', mimeType: 'image/png', size: 2, data: 'AQI=' },
      ],
      sounds: [
        { name: 'beep.wav', mimeType: 'audio/wav', size: 2, data: 'AwQ=' },
      ],
    });

    const manager = new StorageManager(codeContainer, {
      projectDownloadFilename: 'project.zip',
    });

    await manager.downloadCode();

    expect(click).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(ensureJsZipRuntime).toHaveBeenCalledTimes(1);

    const [blob] = URL.createObjectURL.mock.calls[0];
    const zip = await JSZip.loadAsync(blob);

    await expect(zip.file('main.py').async('string')).resolves.toBe('print(1)');
    await expect(zip.file('helper.py').async('string')).resolves.toBe('VALUE = 2');
    await expect(zip.file('images/bg.png').async('uint8array')).resolves.toEqual(new Uint8Array([1, 2]));
    await expect(zip.file('sounds/beep.wav').async('uint8array')).resolves.toEqual(new Uint8Array([3, 4]));
  });

  it('loads a zip project bundle and applies it to the container', async () => {
    const originalCreateElement = document.createElement.bind(document);
    const createElement = vi.spyOn(document, 'createElement');

    codeContainer.supportsProjectStorage.mockReturnValue(true);
    codeContainer.applyProjectBundle.mockReturnValue(true);

    const zipPayload = await createProjectZip({
      'main.py': 'print(4)',
      'helper.py': 'VALUE = 4',
      'images/background.png': new Uint8Array([1, 2, 3]),
      'sounds/beep.wav': new Uint8Array([4, 5, 6]),
    });

    vi.stubGlobal('FileReader', class FileReader {
      readAsArrayBuffer() {
        this.onload({
          target: {
            result: zipPayload.buffer.slice(
              zipPayload.byteOffset,
              zipPayload.byteOffset + zipPayload.byteLength,
            ),
          },
        });
      }
    });

    createElement.mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'input') {
        element.click = () => {
          selectFile(element, { name: 'project.zip' });
        };
      }
      return element;
    });

    const manager = new StorageManager(codeContainer);

    await expect(manager.loadFile()).resolves.toEqual(expect.objectContaining({
      type: 'h5p-python-question-project',
      version: 1,
    }));
    expect(ensureJsZipRuntime).toHaveBeenCalledTimes(1);
    expect(codeContainer.applyProjectBundle).toHaveBeenCalledTimes(1);
    expect(codeContainer.applyProjectBundle).toHaveBeenCalledWith(expect.objectContaining({
      entryFileName: 'main.py',
      sourceFiles: expect.arrayContaining([
        expect.objectContaining({ name: 'main.py', code: 'print(4)', isEntry: true }),
        expect.objectContaining({ name: 'helper.py', code: 'VALUE = 4', isEntry: false }),
      ]),
      images: [expect.objectContaining({ name: 'background.png', size: 3 })],
      sounds: [expect.objectContaining({ name: 'beep.wav', size: 3 })],
    }));
    expect(editorManager.setCode).not.toHaveBeenCalled();
  });

  it('loads a legacy JSON project bundle and applies it to the container', async () => {
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
  });

  it('rejects invalid zip project structures instead of loading them as plain text', async () => {
    const originalCreateElement = document.createElement.bind(document);
    const createElement = vi.spyOn(document, 'createElement');

    codeContainer.supportsProjectStorage.mockReturnValue(true);

    const zipPayload = await createProjectZip({
      'nested/helper.py': 'VALUE = 1',
      'images/background.png': new Uint8Array([1]),
    });

    vi.stubGlobal('FileReader', class FileReader {
      readAsArrayBuffer() {
        this.onload({
          target: {
            result: zipPayload.buffer.slice(
              zipPayload.byteOffset,
              zipPayload.byteOffset + zipPayload.byteLength,
            ),
          },
        });
      }
    });

    createElement.mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'input') {
        element.click = () => {
          selectFile(element, { name: 'project.zip' });
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