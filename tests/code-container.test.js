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
});