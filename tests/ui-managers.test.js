import { describe, expect, it, vi } from 'vitest';

import ButtonManager from '../src/scripts/manager/buttonmanager.js';
import PageManager from '../src/scripts/manager/pagemanager.js';

describe('ButtonManager', () => {
  it('orders buttons by weight and preserves stable ordering within the same weight', async () => {
    const manager = new ButtonManager(document.createElement('div'), true, {
      run: 'Run',
      stop: 'Stop',
      showCode: 'Code',
      save: 'Save',
      load: 'Load',
    });

    await manager.setupButtons();
    manager.addButton({
      identifier: 'images',
      label: 'Images',
      class: 'images',
      weight: 0,
    });

    const orderedIds = Array.from(manager.getDOM().children).map((button) => button.id);

    expect(orderedIds).toEqual([
      'runButton',
      'stopButton',
      'showCodeButton',
      'images',
      'saveButton',
      'loadButton',
    ]);
  });

  it('tracks the active button explicitly', async () => {
    const manager = new ButtonManager(document.createElement('div'), true, {
      run: 'Run',
      stop: 'Stop',
      showCode: 'Code',
      save: 'Save',
      load: 'Load',
    });

    await manager.setupButtons();
    manager.setActive('runButton');

    expect(manager.isButtonActive('runButton')).toBe(true);
    expect(manager.isButtonActive('loadButton')).toBe(false);
  });

  it('can omit save and load buttons when storage actions are disabled', async () => {
    const manager = new ButtonManager(document.createElement('div'), true, {
      run: 'Run',
      stop: 'Stop',
      showCode: 'Code',
      save: 'Save',
      load: 'Load',
    }, undefined, false, { showStorageButtons: false });

    await manager.setupButtons();

    expect(manager.getButton('saveButton')).toBeNull();
    expect(manager.getButton('loadButton')).toBeNull();
  });

  it('rejects duplicate button registrations', async () => {
    const manager = new ButtonManager(document.createElement('div'), true, {
      run: 'Run',
      stop: 'Stop',
      showCode: 'Code',
      save: 'Save',
      load: 'Load',
    });

    await manager.setupButtons();

    expect(() => manager.addButton({
      identifier: 'runButton',
      label: 'Run again',
      class: 'run_code',
    })).toThrow('Button \'runButton\' is already registered.');
  });

  it('updates button icons without recreating the button', async () => {
    const manager = new ButtonManager(document.createElement('div'), true, {
      run: 'Run',
      stop: 'Stop',
      showCode: 'Code',
      save: 'Save',
      load: 'Load',
      switchToDarkMode: 'Dark mode',
      switchToLightMode: 'Light mode',
    });

    manager.addButton({
      identifier: 'themeToggle',
      label: '',
      class: 'theme_toggle',
      icon: 'fa-solid fa-moon',
      ariaLabel: 'Switch to dark mode',
    });

    manager.setButtonIcon('themeToggle', 'fa-solid fa-sun');
    manager.setButtonAriaLabel('themeToggle', 'Switch to light mode');
    manager.setButtonTitle('themeToggle', 'Switch to light mode');

    const button = manager.getButton('themeToggle');

    expect(button.querySelector('.button-icon i.fa-sun')).not.toBeNull();
    expect(button.querySelector('.button-icon i.fa-moon')).toBeNull();
    expect(button.getAttribute('aria-label')).toBe('Switch to light mode');
    expect(button.title).toBe('Switch to light mode');
  });

  it('applies shared visibility logic when buttons are shown and hidden', async () => {
    const manager = new ButtonManager(document.createElement('div'), true, {
      run: 'Run',
      stop: 'Stop',
      showCode: 'Code',
      save: 'Save',
      load: 'Load',
    });

    await manager.setupButtons();

    manager.hideButton('runButton');
    expect(manager.getButton('runButton')?.style.display).toBe('none');
    expect(manager.getButton('runButton')?.style.visibility).toBe('hidden');

    manager.showButton('runButton');
    expect(manager.getButton('runButton')?.style.display).toBe('block');
    expect(manager.getButton('runButton')?.style.visibility).toBe('visible');
  });

  it('creates no buttons when configured empty', async () => {
    const manager = new ButtonManager(document.createElement('div'), true, {}, undefined, true);

    await manager.setupButtons();

    expect(manager.getDOM().children).toHaveLength(0);
  });

  it('does not create buttons when hasButtons is false', async () => {
    const manager = new ButtonManager(document.createElement('div'), false, {
      run: 'Run', stop: 'Stop', showCode: 'Code', save: 'Save', load: 'Load',
    });

    await manager.setupButtons();
    expect(manager.addButton({ identifier: 'extra', label: 'Extra', class: 'extra' })).toBeUndefined();
    expect(manager.getDOM().children).toHaveLength(0);
  });

  it('falls back to a humanized aria-label for icon-only buttons without an explicit one', () => {
    const manager = new ButtonManager(document.createElement('div'), true, {});

    const button = manager.addButton({
      identifier: 'runButton',
      name: 'run_button',
      label: '',
      class: 'run_code',
      icon: 'fa-solid fa-play',
    });

    expect(button.getAttribute('aria-label')).toBe('run button');
  });

  it('clears the active state from all buttons', async () => {
    const manager = new ButtonManager(document.createElement('div'), true, {
      run: 'Run', stop: 'Stop', showCode: 'Code', save: 'Save', load: 'Load',
    });

    await manager.setupButtons();
    manager.setActive('runButton');
    manager.clearActiveButton();

    expect(manager.isButtonActive('runButton')).toBe(false);
    expect(manager.getButton('runButton').classList.contains('active')).toBe(false);
  });

  it('reports HTML classes based on whether buttons are enabled', () => {
    expect(new ButtonManager(document.createElement('div'), true, {}).getHTMLClasses()).toBe('has_buttons');
    expect(new ButtonManager(document.createElement('div'), false, {}).getHTMLClasses()).toBe('not_has_buttons');
  });
});

describe('PageManager', () => {
  it('shows the requested page and updates active state', async () => {
    const resizeActionHandler = vi.fn();
    const manager = new PageManager(document.createElement('div'), {}, resizeActionHandler);

    await manager.setupPages();
    manager.addPage('images', document.createElement('div'), 'images', false, false);
    manager.showPage('images');

    expect(manager.activePageName).toBe('images');
    expect(manager.pageIsActive('images')).toBe(true);
    expect(manager.pageIsActive('code')).toBe(false);
    expect(manager.getPage('images').classList.contains('active')).toBe(true);
    expect(resizeActionHandler).toHaveBeenCalled();
  });

  it('marks a page as non-empty after content is appended', async () => {
    const manager = new PageManager(document.createElement('div'), {}, vi.fn());

    await manager.setupPages();
    manager.appendChild('code', document.createElement('div'));

    expect(manager.isEmpty('code')).toBe(false);
  });

  it('rejects duplicate page registrations', async () => {
    const manager = new PageManager(document.createElement('div'), {}, vi.fn());

    await manager.setupPages();

    expect(() => manager.addPage('code', '', 'code')).toThrow('Page \'code\' is already registered.');
  });

  it('registers no default pages when created empty', async () => {
    const manager = new PageManager(document.createElement('div'), {}, vi.fn(), true);

    await manager.setupPages();

    expect(manager.getDOM().children).toHaveLength(0);
  });

  it('reports inactive for a page that does not exist', async () => {
    const manager = new PageManager(document.createElement('div'), {}, vi.fn());

    await manager.setupPages();

    expect(manager.pageIsActive('does-not-exist')).toBe(false);
  });

  it('returns null and warns when a requested page does not exist', () => {
    const manager = new PageManager(document.createElement('div'), {}, vi.fn());
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(manager.getPage('does-not-exist')).toBeNull();
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });

  it('inserts a page before others when registered as front', async () => {
    const manager = new PageManager(document.createElement('div'), {}, vi.fn());

    await manager.setupPages();
    manager.addPage('files', document.createElement('div'), 'files', true);

    expect(manager.pages.map((page) => page.name)).toEqual(['files', 'code']);
  });

  it('replaces existing page content with a string or a DocumentFragment', async () => {
    const manager = new PageManager(document.createElement('div'), {}, vi.fn());

    await manager.setupPages();
    manager.setContent('code', '<span>first</span>');
    expect(manager.getPage('code').innerHTML).toBe('<span>first</span>');

    const fragment = document.createDocumentFragment();
    fragment.appendChild(document.createElement('em'));
    manager.setContent('code', fragment);
    expect(manager.getPage('code').innerHTML).toBe('<em></em>');
  });

  it('creates a new page through setContent when it does not exist yet', () => {
    const manager = new PageManager(document.createElement('div'), {}, vi.fn());

    manager.setContent('log', 'hello');

    expect(manager.getPage('log').innerHTML).toBe('<div>hello</div>');
  });

  it('throws for unsupported setContent payloads', async () => {
    const manager = new PageManager(document.createElement('div'), {}, vi.fn());

    await manager.setupPages();

    expect(() => manager.setContent('code', 42)).toThrow(TypeError);
  });

  it('appends HTML to existing page content via addContent', async () => {
    const manager = new PageManager(document.createElement('div'), {}, vi.fn());

    await manager.setupPages();
    manager.setContent('code', '<span>a</span>');
    manager.addContent('code', '<span>b</span>');

    expect(manager.getPage('code').innerHTML).toBe('<span>a</span><span>b</span>');
  });

  it('creates the target page on demand when appending a child element', () => {
    const resizeActionHandler = vi.fn();
    const manager = new PageManager(document.createElement('div'), {}, resizeActionHandler);

    manager.appendChild('files', document.createElement('span'));

    expect(manager.getPageObj('files')).toBeDefined();
    expect(resizeActionHandler).toHaveBeenCalled();
  });
});
