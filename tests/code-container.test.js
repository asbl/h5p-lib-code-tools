import { describe, expect, it, vi } from 'vitest';

import CodeContainer from '../src/scripts/code-container.js';

/**
 * Creates a CodeContainer test instance.
 * @param {object} [overrides] Optional constructor overrides for the test instance.
 * @returns {CodeContainer} A configured CodeContainer instance.
 */
function createContainer(overrides = {}) {
  return new CodeContainer(document.createElement('div'), {
    codingLanguage: 'python',
    runtimeFactory: {
      create: () => ({
        setup: () => {},
        run: () => {},
      })
    },
    ...overrides,
  });
}

describe('CodeContainer theme toggle', () => {
  it('registers the shared theme toggle button and observer', () => {
    const container = createContainer();
    const registrations = container.getUIRegistrations();

    expect(registrations.buttons).toHaveLength(1);
    expect(registrations.buttons[0].identifier).toBe('themeToggle');
    expect(registrations.observers).toHaveLength(1);
    expect(registrations.observers[0].button).toBe('themeToggle');
  });

  it('reports save and load visibility through a shared predicate', () => {
    expect(createContainer().hasStorageButtons()).toBe(true);
    expect(createContainer({ showSaveLoadButtons: false }).hasStorageButtons()).toBe(false);
  });

  it('respects explicit hasConsole=false when creating the console manager', () => {
    const container = createContainer({ hasConsole: false });
    const manager = container.getConsoleManager(container.parent, { hasConsole: false });

    expect(manager.hasConsole).toBe(false);
    expect(manager.getDOM()).toBeNull();
  });

  it('registers a dedicated files page when learners may add files', () => {
    const container = createContainer({ allowAddingFiles: true });
    const registrations = container.getUIRegistrations();

    expect(container.hasFileManagerPage()).toBe(true);
    expect(registrations.pages).toEqual([
      expect.objectContaining({ name: 'files' }),
    ]);
  });

  it('switches container, editor and toolbar theme state', () => {
    const container = createContainer();
    const setButtonIcon = vi.fn();
    const setButtonAriaLabel = vi.fn();
    const setButtonTitle = vi.fn();
    const editorManager = { setTheme: vi.fn() };
    const consoleManager = {
      getHTMLClasses: () => ' has_console',
      setTheme: vi.fn(),
    };

    container._buttonManager = {
      getHTMLClasses: () => ' has_buttons',
      setButtonIcon,
      setButtonAriaLabel,
      setButtonTitle,
    };
    container._editorManager = editorManager;
    container._consoleManager = consoleManager;
    container.instructionsManager = {
      getHTMLClasses: () => ' has_instructions',
    };

    const containerDiv = container.getContainerDiv();

    container.setTheme('dark');

    expect(container.getTheme()).toBe('dark');
    expect(containerDiv.classList.contains('theme-dark')).toBe(true);
    expect(editorManager.setTheme).toHaveBeenLastCalledWith('dark');
    expect(consoleManager.setTheme).toHaveBeenLastCalledWith('dark');
    expect(setButtonIcon).toHaveBeenLastCalledWith('themeToggle', 'fa-solid fa-sun');
    expect(setButtonAriaLabel).toHaveBeenLastCalledWith('themeToggle', 'Switch to light mode');
    expect(setButtonTitle).toHaveBeenLastCalledWith('themeToggle', 'Switch to light mode');

    container.toggleTheme();

    expect(container.getTheme()).toBe('light');
    expect(containerDiv.classList.contains('theme-light')).toBe(true);
    expect(setButtonIcon).toHaveBeenLastCalledWith('themeToggle', 'fa-solid fa-moon');
    expect(setButtonAriaLabel).toHaveBeenLastCalledWith('themeToggle', 'Switch to dark mode');
    expect(setButtonTitle).toHaveBeenLastCalledWith('themeToggle', 'Switch to dark mode');
  });

  it('propagates theme state to fullscreen hosts', () => {
    const h5pContainer = document.createElement('div');
    h5pContainer.className = 'h5p-container h5p-semi-fullscreen';

    const contentPart = document.createElement('div');
    contentPart.className = 'content-part fullscreen';

    const parent = document.createElement('div');
    contentPart.appendChild(parent);
    h5pContainer.appendChild(contentPart);

    const container = new CodeContainer(parent, {
      codingLanguage: 'python',
      runtimeFactory: {
        create: () => ({
          setup: () => {},
          run: () => {},
        })
      }
    });
    container._buttonManager = {
      getHTMLClasses: () => ' has_buttons',
      setButtonIcon: vi.fn(),
      setButtonAriaLabel: vi.fn(),
      setButtonTitle: vi.fn(),
    };
    const editorManager = { setTheme: vi.fn() };
    const consoleManager = {
      getHTMLClasses: () => ' has_console',
      setTheme: vi.fn(),
    };
    container.instructionsManager = {
      getHTMLClasses: () => ' has_instructions',
    };

    container._editorManager = editorManager;
    container._consoleManager = consoleManager;
    container.fullscreen = true;

    container.setTheme('dark');

    expect(contentPart.classList.contains('theme-dark')).toBe(true);
    expect(h5pContainer.classList.contains('theme-dark')).toBe(true);
    expect(editorManager.setTheme).toHaveBeenCalledWith('dark');
    expect(consoleManager.setTheme).toHaveBeenCalledWith('dark');
  });

  it('registers fullscreen exit listeners on the H5P instance once', () => {
    const h5pInstance = {};
    H5P.on = vi.fn();

    const container = createContainer({ h5pInstance });

    container.registerFullscreenExitHandler();

    expect(H5P.on).toHaveBeenCalledWith(
      h5pInstance,
      'exitFullScreen',
      container.handleFullscreenExit,
    );

    H5P.on.mockClear();
    container.registerFullscreenExitHandler();

    expect(H5P.on).not.toHaveBeenCalled();
  });

  it('syncs fullscreen state on fullscreen exit events', () => {
    const container = createContainer();
    container.fullscreen = true;
    container.unsetFullscreen = vi.fn();

    container.handleFullscreenExit();

    expect(container.unsetFullscreen).toHaveBeenCalledWith({
      skipNativeExit: true,
      source: 'event',
    });

    container.fullscreen = false;
    container.unsetFullscreen.mockClear();

    container.handleFullscreenExit();

    expect(container.unsetFullscreen).not.toHaveBeenCalled();
  });

  it('unregisters fullscreen exit listeners when destroyed', () => {
    const h5pInstance = {};
    H5P.on = vi.fn();
    H5P.off = vi.fn();

    const container = createContainer({ h5pInstance });
    container.registerFullscreenExitHandler();
    container.destroy();

    expect(H5P.off).toHaveBeenCalledWith(
      h5pInstance,
      'exitFullScreen',
      container.handleFullscreenExit,
    );
  });

  it('releases manager resources and removes the container DOM on destroy', () => {
    const container = createContainer();
    const host = document.createElement('div');
    container.containerDiv = document.createElement('div');
    host.appendChild(container.containerDiv);

    container._observerManager = { disconnectAll: vi.fn() };
    container._imageManager = { destroy: vi.fn() };
    container._soundManager = { destroy: vi.fn() };
    container._editorManager = { destroy: vi.fn() };
    container._consoleManager = { destroy: vi.fn() };

    container.destroy();

    expect(container._observerManager.disconnectAll).toHaveBeenCalledTimes(1);
    expect(container._imageManager.destroy).toHaveBeenCalledTimes(1);
    expect(container._soundManager.destroy).toHaveBeenCalledTimes(1);
    expect(container._editorManager.destroy).toHaveBeenCalledTimes(1);
    expect(container._consoleManager.destroy).toHaveBeenCalledTimes(1);
    expect(host.children).toHaveLength(0);
    expect(container.containerDiv).toBeNull();
  });

  it('leaves fullscreen before teardown when destroy is called in fullscreen mode', () => {
    const container = createContainer();
    container.fullscreen = true;
    container.unsetFullscreen = vi.fn();

    container.destroy();

    expect(container.unsetFullscreen).toHaveBeenCalledWith({
      skipNativeExit: false,
      source: 'destroy',
    });
  });

  it('renders a single instructions wrapper around the instructions panel', () => {
    vi.useFakeTimers();

    const container = createContainer();
    const pageDom = document.createElement('div');
    const navButtons = document.createElement('div');
    const editorDom = document.createElement('div');
    const consoleDom = document.createElement('div');
    const instructionsPanel = document.createElement('section');
    instructionsPanel.className = 'instructions-panel';

    container._pageManager = {
      getDOM: () => pageDom,
      getPage: vi.fn(() => document.createElement('div')),
      appendChild: vi.fn(),
    };
    container._buttonManager = {
      getDOM: () => navButtons,
      getHTMLClasses: () => 'has_buttons',
    };
    container._editorManager = {
      getDOM: () => editorDom,
    };
    container._consoleManager = {
      getDOM: () => consoleDom,
      getHTMLClasses: () => 'has_console',
    };
    container.instructionsManager = {
      getDOM: () => instructionsPanel,
      getHTMLClasses: () => 'has_instructions',
    };
    container.waitForImages = vi.fn(() => Promise.resolve());

    const dom = container.registerDOM();

    expect(dom.querySelectorAll('.instructions-container')).toHaveLength(1);
    expect(dom.querySelectorAll('.instructions-panel')).toHaveLength(1);

    vi.useRealTimers();
  });

  it('shows the dedicated files page through the page manager', () => {
    const container = createContainer({ allowAddingFiles: true });
    const showPage = vi.fn();

    container._pageManager = {
      showPage,
    };

    container.showFileManagerPage();

    expect(showPage).toHaveBeenCalledWith('files');
  });

  it('resolves blockly packages from explicit blocklyPackages option', () => {
    const getPyodidePackages = vi.fn(() => ['numpy']);
    const container = createContainer({
      h5pInstance: { getPyodidePackages },
    });

    const editorManager = container.getEditorManager(container.parent, {
      editorMode: 'blocks',
      blocklyPackages: [' MatPlotLib ', 'numpy', 'NUMPY'],
    });

    expect(editorManager.blocklyPackages).toEqual(['matplotlib', 'numpy']);
    expect(getPyodidePackages).not.toHaveBeenCalled();
  });

  it('falls back to legacy packages option when blocklyPackages is missing', () => {
    const container = createContainer();

    const editorManager = container.getEditorManager(container.parent, {
      editorMode: 'blocks',
      packages: [
        { package: ' NumPy ' },
        { package: { value: 'matplotlib' } },
        { value: 'numpy' },
      ],
    });

    expect(editorManager.blocklyPackages).toEqual(['numpy', 'matplotlib']);
  });

  it('falls back to h5pInstance.getPyodidePackages when options do not provide packages', () => {
    const getPyodidePackages = vi.fn(() => ['numpy', 'scipy']);
    const container = createContainer({
      h5pInstance: { getPyodidePackages },
    });

    const editorManager = container.getEditorManager(container.parent, {
      editorMode: 'blocks',
    });

    expect(getPyodidePackages).toHaveBeenCalledTimes(1);
    expect(editorManager.blocklyPackages).toEqual(['numpy', 'scipy']);
  });

  it('respects explicit empty blocklyPackages without fallback', () => {
    const getPyodidePackages = vi.fn(() => ['numpy']);
    const container = createContainer({
      h5pInstance: { getPyodidePackages },
    });

    const editorManager = container.getEditorManager(container.parent, {
      editorMode: 'blocks',
      blocklyPackages: [],
    });

    expect(editorManager.blocklyPackages).toEqual([]);
    expect(getPyodidePackages).not.toHaveBeenCalled();
  });

  it('preloads configured default images into the image manager', async () => {
    const container = createContainer({
      contentId: 23,
      enableImageUploads: true,
      defaultImages: [
        { path: 'images/background.png', fileName: 'background.png' },
      ],
    });
    const replaceFiles = vi.fn();
    const bytesToBase64 = vi.fn(() => 'AQI=');

    H5P.getPath = vi.fn((path, contentId) => `/resolved/${contentId}/${path}`);
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      headers: { get: () => 'image/png' },
      arrayBuffer: async () => new Uint8Array([1, 2]).buffer,
    }));

    container.getImageManager = vi.fn(() => ({
      isEnabled: () => true,
      getFiles: () => [],
      bytesToBase64,
      replaceFiles,
    }));

    await container.preloadDefaultImages();

    expect(H5P.getPath).toHaveBeenCalledWith('images/background.png', 23);
    expect(globalThis.fetch).toHaveBeenCalledWith('/resolved/23/images/background.png');
    expect(bytesToBase64).toHaveBeenCalledTimes(1);
    expect(replaceFiles).toHaveBeenCalledWith([
      {
        name: 'background.png',
        mimeType: 'image/png',
        size: 2,
        data: 'AQI=',
      },
    ]);
  });

  it('skips default-image preload when image uploads are disabled', async () => {
    const container = createContainer({
      defaultImages: [{ path: 'images/background.png' }],
    });

    globalThis.fetch = vi.fn();
    container.getImageManager = vi.fn(() => ({
      isEnabled: () => false,
      getFiles: () => [],
      bytesToBase64: vi.fn(),
      replaceFiles: vi.fn(),
    }));

    await container.preloadDefaultImages();

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});