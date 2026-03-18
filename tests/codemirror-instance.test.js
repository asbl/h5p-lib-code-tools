import { describe, expect, it, vi } from 'vitest';

import CodeMirrorInstance from '../src/scripts/editor/codemirror-instance.js';

describe('CodeMirrorInstance', () => {
  it('returns language extensions for supported languages', () => {
    const pythonInstance = Object.create(CodeMirrorInstance.prototype);
    pythonInstance.codingLanguage = 'python';

    const unknownInstance = Object.create(CodeMirrorInstance.prototype);
    unknownInstance.codingLanguage = 'text';

    expect(pythonInstance.getLanguageExtension()).toBeTruthy();
    expect(unknownInstance.getLanguageExtension()).toEqual([]);
  });

  it('reconfigures the theme compartment when setTheme is called', () => {
    const effect = Symbol('effect');
    const instance = Object.create(CodeMirrorInstance.prototype);
    instance.options = { theme: 'light' };
    instance.themeCompartment = { reconfigure: vi.fn(() => effect) };
    instance.getThemeExtension = vi.fn(() => 'theme-extension');
    instance.editorView = { dispatch: vi.fn() };

    instance.setTheme('dark');

    expect(instance.options.theme).toBe('dark');
    expect(instance.themeCompartment.reconfigure).toHaveBeenCalledWith('theme-extension');
    expect(instance.editorView.dispatch).toHaveBeenCalledWith({ effects: effect });
  });

  it('returns normalized code text and updates parent sizing helpers', () => {
    const parent = document.createElement('div');
    const instance = Object.create(CodeMirrorInstance.prototype);
    instance.parentElement = parent;
    instance.uid = null;
    instance.editorView = {
      requestMeasure: vi.fn(),
      state: {
        doc: {
          toString: () => 'print(1)'
        }
      }
    };
    instance.options = {
      minLines: 2,
      maxLines: 5,
      lineHeightPx: 18,
    };

    expect(instance.getCode()).toBe('print(1)\n');

    instance.setFixedLines(8);
    expect(parent.style.height).toBe('160px');

    instance.restoreDynamicHeight();
    expect(parent.style.height).toBe('auto');
    expect(instance.options.minLines).toBe(1);
    expect(instance.editorView.requestMeasure).toHaveBeenCalledTimes(2);
  });

  it('resolves its parent element from the DOM by uid', () => {
    const element = document.createElement('div');
    element.id = 'editor-target';
    document.body.appendChild(element);

    const instance = Object.create(CodeMirrorInstance.prototype);
    instance.parentElement = null;
    instance.uid = 'editor-target';

    expect(instance.getParentElement()).toBe(element);
  });
});