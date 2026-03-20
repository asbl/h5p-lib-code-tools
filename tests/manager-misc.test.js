import { beforeEach, describe, expect, it, vi } from 'vitest';

const { CodeMirrorInstanceMock, codeMirrorInstances } = vi.hoisted(() => {
  const codeMirrorInstances = [];
  const CodeMirrorInstanceMock = vi.fn().mockImplementation((target, content, language, options = {}) => {
    const instance = {
      target,
      content,
      language,
      options,
      currentCode: content,
      editorView: { dom: document.createElement('div') },
      getCode: vi.fn(() => instance.currentCode),
      setCode: vi.fn((code) => {
        instance.currentCode = code;
      }),
      destroy: vi.fn(),
      setFixedLines: vi.fn(),
      restoreDynamicHeight: vi.fn(),
      setTheme: vi.fn(),
    };
    codeMirrorInstances.push(instance);
    return instance;
  });

  return { CodeMirrorInstanceMock, codeMirrorInstances };
});

const { BlocklyEditorInstanceMock, blocklyInstances } = vi.hoisted(() => {
  const blocklyInstances = [];
  const BlocklyEditorInstanceMock = vi.fn().mockImplementation((target, content, language, options = {}) => {
    const instance = {
      target,
      content,
      language,
      options,
      getCode: vi.fn(() => '# generated'),
      setCode: vi.fn(),
      destroy: vi.fn(),
      setFixedLines: vi.fn(),
      restoreDynamicHeight: vi.fn(),
      setTheme: vi.fn(),
    };
    blocklyInstances.push(instance);
    return instance;
  });

  return { BlocklyEditorInstanceMock, blocklyInstances };
});

vi.mock('../src/scripts/editor/codemirror-instance', () => ({
  default: CodeMirrorInstanceMock,
}));

vi.mock('@scripts/editor/codemirror-instance.js', () => ({
  default: CodeMirrorInstanceMock,
}));

vi.mock('../src/scripts/editor/blockly-instance.js', () => ({
  default: BlocklyEditorInstanceMock,
}));

import CanvasManager from '../src/scripts/manager/canvasmanager.js';
import ConsoleManager from '../src/scripts/manager/consolemanager.js';
import EditorManager from '../src/scripts/manager/editormanager.js';
import InstructionsManager from '../src/scripts/manager/instructionsmanager.js';

describe('EditorManager', () => {
  beforeEach(() => {
    CodeMirrorInstanceMock.mockClear();
    codeMirrorInstances.length = 0;
    BlocklyEditorInstanceMock.mockClear();
    blocklyInstances.length = 0;
  });

  it('creates a CodeMirror editor and forwards updates to it', async () => {
    const manager = new EditorManager(
      'print(1)',
      'python',
      'before\n',
      'after',
      true,
      5,
      'editor',
      'pre',
      'post',
      vi.fn(),
      vi.fn(),
      'dark'
    );

    manager.getDOM();
    await manager.setupEditors();

    expect(CodeMirrorInstanceMock).toHaveBeenCalledTimes(1);
    expect(CodeMirrorInstanceMock.mock.calls[0][3].theme).toBe('dark');

    manager._editorInstance = {
      setCode: vi.fn(),
      setFixedLines: vi.fn(),
      restoreDynamicHeight: vi.fn(),
      setTheme: vi.fn(),
    };

    manager.setCode('print(2)');
    manager.setFullscreenLines(20);
    manager.restoreDynamicHeight();
    manager.setTheme('light');

    expect(manager._editorInstance.setCode).toHaveBeenCalledWith('before\nprint(2)\nafter');
    expect(manager._editorInstance.setFixedLines).toHaveBeenCalledWith(20);
    expect(manager._editorInstance.restoreDynamicHeight).toHaveBeenCalled();
    expect(manager._editorInstance.setTheme).toHaveBeenCalledWith('light');
  });

  it('decodes HTML entities and proxies getCode()', async () => {
    const manager = new EditorManager('&lt;a&gt;', 'python', '', '', true, 5, 'editor', 'pre', 'post');
    manager._editorInstance = {
      getCode: vi.fn(() => 'decoded\n'),
    };

    expect(manager.defaultCode).toBe('<a>');
    expect(manager.getCode()).toBe('decoded\n');
  });

  it('renders additional source files as tabs and stores per-file code', async () => {
    const manager = new EditorManager(
      'print(1)',
      'python',
      '',
      '',
      true,
      5,
      'editor',
      'pre',
      'post',
      vi.fn(),
      vi.fn(),
      'light',
      {
        enabled: true,
        entryFileName: 'main.py',
        sourceFiles: [
          { name: 'helper.py', code: 'VALUE = 1', visible: true, editable: true },
          { name: 'secret.py', code: 'TOKEN = 1', visible: false, editable: false },
        ],
      },
    );

    const dom = manager.getDOM();
    document.body.appendChild(dom);
    await manager.setupEditors();

    expect(manager.getVisibleFiles().map((file) => file.name)).toEqual(['main.py', 'helper.py']);
    expect(Array.from(document.querySelectorAll('.editor-file-tab')).map((button) => button.textContent)).toEqual(['main.py', 'helper.py']);

    manager.setActiveFile('helper.py');
    manager._editorInstance = {
      getCode: vi.fn(() => 'VALUE = 2'),
    };
    const snapshot = manager.getWorkspaceSnapshot();

    expect(snapshot.files.find((file) => file.name === 'helper.py')?.code).toBe('VALUE = 2');
    expect(snapshot.files.find((file) => file.name === 'secret.py')?.code).toBe('TOKEN = 1');
  });

  it('shows file tabs and a "+" button when allowAddingFiles is enabled', async () => {
    const manager = new EditorManager(
      'print(1)',
      'python',
      '',
      '',
      true,
      5,
      'editor',
      'pre',
      'post',
      vi.fn(),
      vi.fn(),
      'light',
      {
        enabled: true,
        entryFileName: 'main.py',
        allowAddingFiles: true,
      },
    );

    const dom = manager.getDOM();
    document.body.appendChild(dom);
    await manager.setupEditors();

    expect(manager.getVisibleFiles().map((file) => file.name)).toEqual(['main.py']);
    expect(manager._tabsElement.hidden).toBe(false);
    const tabTexts = Array.from(manager._tabsElement.querySelectorAll('button')).map((b) => b.textContent);
    expect(tabTexts).toEqual(['main.py', '+']);
  });

  it('hides file tabs when only one file is visible and adding files is disabled', async () => {
    const manager = new EditorManager(
      'print(1)',
      'python',
      '',
      '',
      true,
      5,
      'editor-single-file',
      'pre-single-file',
      'post-single-file',
      vi.fn(),
      vi.fn(),
      'light',
      {
        enabled: true,
        entryFileName: 'main.py',
        allowAddingFiles: false,
      },
    );

    const dom = manager.getDOM();
    document.body.appendChild(dom);
    await manager.setupEditors();

    expect(manager.getVisibleFiles().map((file) => file.name)).toEqual(['main.py']);
    expect(manager._tabsElement.hidden).toBe(true);
  });

  it('shows file tabs without "+" button when multiple files are visible', async () => {
    const manager = new EditorManager(
      'print(1)',
      'python',
      '',
      '',
      true,
      5,
      'editor2',
      'pre2',
      'post2',
      vi.fn(),
      vi.fn(),
      'light',
      {
        enabled: true,
        entryFileName: 'main.py',
        allowAddingFiles: false,
        sourceFiles: [
          { name: 'helper.py', code: 'VALUE = 1', visible: true, editable: true },
        ],
      },
    );

    const dom = manager.getDOM();
    document.body.appendChild(dom);
    await manager.setupEditors();

    expect(manager.getVisibleFiles().map((file) => file.name)).toEqual(['main.py', 'helper.py']);
    expect(manager._tabsElement.hidden).toBe(false);
    const tabTexts = Array.from(manager._tabsElement.querySelectorAll('button')).map((b) => b.textContent);
    expect(tabTexts).toEqual(['main.py', 'helper.py']);
  });

  it('exposes the file manager as standalone DOM and routes open/close via callbacks', async () => {
    const onOpenFileManager = vi.fn();
    const onCloseFileManager = vi.fn();
    const manager = new EditorManager(
      'print(1)',
      'python',
      '',
      '',
      true,
      5,
      'editor-files',
      'pre-files',
      'post-files',
      vi.fn(),
      vi.fn(),
      'light',
      {
        enabled: true,
        entryFileName: 'main.py',
        allowAddingFiles: true,
        onOpenFileManager,
        onCloseFileManager,
      },
    );

    const dom = manager.getDOM();
    document.body.appendChild(dom);
    await manager.setupEditors();

    const fileManagerDom = manager.getFileManagerDOM();

    expect(fileManagerDom).toBeInstanceOf(HTMLElement);
    expect(manager._wrapperElement.contains(fileManagerDom)).toBe(false);

    manager.openFileManager();
    expect(onOpenFileManager).toHaveBeenCalledTimes(1);
    expect(manager._isFileManagerActive).toBe(true);

    manager.closeFileManager();
    expect(onCloseFileManager).toHaveBeenCalledTimes(1);
    expect(manager._isFileManagerActive).toBe(false);
  });

  it('uses CodeMirrorInstance when editorMode is "code" (default)', async () => {
    const manager = new EditorManager(
      'print(1)', 'python', '', '', true, 5, 'editor', 'pre', 'post',
      vi.fn(), vi.fn(), 'light',
      { editorMode: 'code' },
    );
    manager.getDOM();
    await manager.setupEditors();

    expect(CodeMirrorInstanceMock).toHaveBeenCalledTimes(1);
    expect(BlocklyEditorInstanceMock).not.toHaveBeenCalled();
    expect(manager.editorMode).toBe('code');
  });

  it('uses CodeMirrorInstance when editorMode is omitted (backward compat)', async () => {
    const manager = new EditorManager(
      'print(1)', 'python', '', '', true, 5, 'editor', 'pre', 'post',
    );
    manager.getDOM();
    await manager.setupEditors();

    expect(CodeMirrorInstanceMock).toHaveBeenCalledTimes(1);
    expect(BlocklyEditorInstanceMock).not.toHaveBeenCalled();
    expect(manager.editorMode).toBe('code');
  });

  it('uses BlocklyEditorInstance when editorMode is "blocks"', async () => {
    const manager = new EditorManager(
      'print(1)', 'python', '', '', true, 5, 'editor', 'pre', 'post',
      vi.fn(), vi.fn(), 'light',
      { editorMode: 'blocks' },
    );
    manager.getDOM();
    await manager.setupEditors();

    expect(BlocklyEditorInstanceMock).toHaveBeenCalledTimes(1);
    expect(CodeMirrorInstanceMock).not.toHaveBeenCalled();
    expect(BlocklyEditorInstanceMock.mock.calls[0][3].editorMode).toBe('blocks');
  });

  it('uses BlocklyEditorInstance with editorMode "both" in both-panel mode', async () => {
    const manager = new EditorManager(
      'print(1)', 'python', '', '', true, 5, 'editor', 'pre', 'post',
      vi.fn(), vi.fn(), 'light',
      { editorMode: 'both' },
    );
    manager.getDOM();
    await manager.setupEditors();

    expect(BlocklyEditorInstanceMock).toHaveBeenCalledTimes(1);
    expect(CodeMirrorInstanceMock).not.toHaveBeenCalled();
    expect(BlocklyEditorInstanceMock.mock.calls[0][3].editorMode).toBe('both');
  });

  it('rejects unknown editorMode and falls back to "code"', async () => {
    const manager = new EditorManager(
      'print(1)', 'python', '', '', true, 5, 'editor', 'pre', 'post',
      vi.fn(), vi.fn(), 'light',
      { editorMode: 'unknown_value' },
    );
    manager.getDOM();
    await manager.setupEditors();

    expect(manager.editorMode).toBe('code');
    expect(CodeMirrorInstanceMock).toHaveBeenCalledTimes(1);
    expect(BlocklyEditorInstanceMock).not.toHaveBeenCalled();
  });

  it('passes blocklyCategories through to BlocklyEditorInstance', async () => {
    const categories = { variables: true, logic: true, loops: false, math: false, text: true, lists: false, functions: false };
    const manager = new EditorManager(
      'print(1)', 'python', '', '', true, 5, 'editor', 'pre', 'post',
      vi.fn(), vi.fn(), 'light',
      { editorMode: 'blocks', blocklyCategories: categories },
    );
    manager.getDOM();
    await manager.setupEditors();

    expect(BlocklyEditorInstanceMock).toHaveBeenCalledTimes(1);
    expect(BlocklyEditorInstanceMock.mock.calls[0][3].blocklyCategories).toBe(categories);
  });

  it('passes null blocklyCategories when not specified', async () => {
    const manager = new EditorManager(
      'print(1)', 'python', '', '', true, 5, 'editor', 'pre', 'post',
      vi.fn(), vi.fn(), 'light',
      { editorMode: 'blocks' },
    );
    manager.getDOM();
    await manager.setupEditors();

    expect(BlocklyEditorInstanceMock).toHaveBeenCalledTimes(1);
    expect(BlocklyEditorInstanceMock.mock.calls[0][3].blocklyCategories).toBeNull();
  });

  it('passes blocklyPackages through to BlocklyEditorInstance', async () => {
    const blocklyPackages = ['numpy', 'pandas'];
    const manager = new EditorManager(
      'print(1)', 'python', '', '', true, 5, 'editor', 'pre', 'post',
      vi.fn(), vi.fn(), 'light',
      { editorMode: 'blocks', blocklyPackages },
    );
    manager.getDOM();
    await manager.setupEditors();

    expect(BlocklyEditorInstanceMock).toHaveBeenCalledTimes(1);
    expect(BlocklyEditorInstanceMock.mock.calls[0][3].blocklyPackages).toEqual(blocklyPackages);
  });

  it('passes empty blocklyPackages when not specified', async () => {
    const manager = new EditorManager(
      'print(1)', 'python', '', '', true, 5, 'editor', 'pre', 'post',
      vi.fn(), vi.fn(), 'light',
      { editorMode: 'blocks' },
    );
    manager.getDOM();
    await manager.setupEditors();

    expect(BlocklyEditorInstanceMock).toHaveBeenCalledTimes(1);
    expect(BlocklyEditorInstanceMock.mock.calls[0][3].blocklyPackages).toEqual([]);
  });
});

describe('ConsoleManager', () => {
  beforeEach(() => {
    CodeMirrorInstanceMock.mockClear();
    codeMirrorInstances.length = 0;
  });

  it('returns null DOM and does not throw when console is disabled', async () => {
    const manager = new ConsoleManager(false, 'console-disabled', { console: 'Console' });

    expect(manager.getDOM()).toBeNull();
    await manager.setupConsole();

    expect(() => manager.showConsole()).not.toThrow();
    expect(CodeMirrorInstanceMock).not.toHaveBeenCalled();
  });

  it('creates a console editor and forwards console operations', async () => {
    const resizeActionHandler = vi.fn();
    const requestAnimationFrameMock = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        callback();
        return 1;
      });
    const cancelAnimationFrameMock = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => { });

    const manager = new ConsoleManager(
      true,
      'console',
      { console: 'Console' },
      'codemirror',
      resizeActionHandler,
    );

    manager.setTheme('dark');
    manager.getDOM();
    await manager.setupConsole();

    expect(CodeMirrorInstanceMock).toHaveBeenCalledTimes(1);
    expect(CodeMirrorInstanceMock.mock.calls[0][3].theme).toBe('dark');

    manager._consoleInstance = {
      getCode: vi.fn(() => ''),
      setCode: vi.fn(),
      setFixedLines: vi.fn(),
      restoreDynamicHeight: vi.fn(),
      setTheme: vi.fn(),
    };

    manager.write('hello', 'runner');
    expect(manager._consoleInstance.setCode).toHaveBeenCalledWith('[runner] > hello\n');

    manager.clearConsole();
    manager.setFullscreenLines(12);
    manager.restoreConsoleHeight();
    manager.setTheme('light');

    expect(manager._consoleInstance.setCode).toHaveBeenCalledWith('');
    expect(manager._consoleInstance.setFixedLines).toHaveBeenCalledWith(12);
    expect(manager._consoleInstance.restoreDynamicHeight).toHaveBeenCalled();
    expect(manager._consoleInstance.setTheme).toHaveBeenCalledWith('light');
    expect(resizeActionHandler).toHaveBeenCalled();

    requestAnimationFrameMock.mockRestore();
    cancelAnimationFrameMock.mockRestore();
  });
});

describe('CanvasManager', () => {
  it('adds, detects, and shows a canvas page', () => {
    const canvasWrapper = document.createElement('div');
    canvasWrapper.className = 'canvas-wrapper';
    const child = document.createElement('div');
    child.innerHTML = '<canvas></canvas>';
    canvasWrapper.appendChild(child);

    const page = document.createElement('div');
    page.appendChild(canvasWrapper);

    const pageManager = {
      appendChild: vi.fn(),
      getPage: vi.fn(() => page),
      showPage: vi.fn(),
    };

    const manager = new CanvasManager(true, pageManager, {});
    manager.addCanvas(canvasWrapper);

    expect(pageManager.appendChild).toHaveBeenCalledWith('canvas', canvasWrapper);
    expect(manager.hasVisibleCanvas()).toBe(true);

    manager.showCanvas();
    expect(pageManager.showPage).toHaveBeenCalledWith('canvas');

    manager.removeCanvas();
    // Verify that the wrapper is removed from DOM and reference is cleared
    expect(manager.canvasWrapper).toBeNull();
    // hasCanvas may still be true until a new canvas is attached
  });
});

describe('InstructionsManager', () => {
  it('renders markdown instructions and optional images', () => {
    globalThis.H5P.Markdown = class Markdown {
      constructor(text) {
        this.text = text;
      }

      getMarkdownDiv() {
        const div = document.createElement('div');
        div.textContent = this.text;
        return div;
      }
    };
    globalThis.H5P.getPath = vi.fn(() => '/resolved/image.png');

    const manager = new InstructionsManager(
      7,
      'Read this',
      { path: 'image.png', copyright: { title: 'Alt text' } },
      {},
      {},
      {}
    );

    const dom = manager.getDOM();
    const nodes = Array.from(dom.querySelector('.instructions-panel__body').childNodes);

    expect(nodes[0].textContent).toBe('Read this');
    expect(dom.classList.contains('instructions-panel')).toBe(true);
    expect(dom.classList.contains('instructions-container')).toBe(false);
    expect(nodes[1].tagName).toBe('FIGURE');
    expect(nodes[1].querySelector('img').src).toContain('/resolved/image.png');
    expect(nodes[1].querySelector('img').alt).toBe('Alt text');
    expect(manager.getHTMLClasses()).toBe(' has_instructions');
  });

  it('renders markdown-only instructions when no image path is present', () => {
    globalThis.H5P.Markdown = class Markdown {
      constructor(text) {
        this.text = text;
      }

      getMarkdownDiv() {
        const div = document.createElement('div');
        div.textContent = this.text;
        return div;
      }
    };

    const manager = new InstructionsManager(
      7,
      'Read this',
      { copyright: { title: 'Unused alt text' } },
      {},
      {},
      {}
    );

    const dom = manager.getDOM();

    expect(dom?.querySelector('.instructions-panel__markdown')?.textContent).toBe('Read this');
    expect(dom?.querySelector('.instructions-panel__media')).toBeNull();
  });

  it('returns null when no instructions are available', () => {
    const manager = new InstructionsManager(1, '', null, {}, {}, {});

    expect(manager.getDOM()).toBeNull();
    expect(manager.getHTMLClasses()).toBe(' not_has_instructions');
  });
});