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
});