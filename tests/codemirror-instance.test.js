import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/scripts/editor/codemirror/codemirror-runtime.js', () => ({
  getCodeMirrorRuntime: () => ({
    Compartment: class Compartment {
      reconfigure(value) {
        return value;
      }
    },
    StateEffect: { define: () => ({ of: (value) => value }) },
    python: () => ({ language: 'python' }),
    javascript: () => ({ language: 'javascript' }),
    markdown: () => ({ language: 'markdown' }),
    SQLite: { name: 'sqlite' },
    sql: (config) => ({ language: 'sql', config }),
    RangeSetBuilder: class RangeSetBuilder {
      constructor() {
        this.entries = [];
      }

      add(from, to, value) {
        this.entries.push({ from, to, value });
      }

      finish() {
        return this.entries;
      }
    },
    Decoration: {
      mark: (config) => ({ type: 'mark', config }),
      line: (config) => ({ type: 'line', config }),
    },
    StateField: { define: (config) => config },
    EditorView: {
      decorations: { from: (value) => value },
      scrollIntoView: (value) => value,
      domEventHandlers: (handlers) => handlers,
    },
    EditorState: {
      transactionFilter: { of: (value) => value },
      changeFilter: { of: (value) => value },
    },
    Transaction: { userEvent: { of: (value) => value } },
  }),
}));

import CodeMirrorInstance from '../src/scripts/editor/codemirror/codemirror-instance.js';

describe('CodeMirrorInstance', () => {
  it('returns language extensions for supported languages', () => {
    const pythonInstance = Object.create(CodeMirrorInstance.prototype);
    pythonInstance.codingLanguage = 'python';
    pythonInstance.options = {};

    const unknownInstance = Object.create(CodeMirrorInstance.prototype);
    unknownInstance.codingLanguage = 'text';
    unknownInstance.options = {};

    const sqlInstance = Object.create(CodeMirrorInstance.prototype);
    sqlInstance.codingLanguage = 'sql';
    sqlInstance.options = {
      languageConfig: {
        schema: { world: ['name'] },
        upperCaseKeywords: true,
      },
    };

    expect(pythonInstance.getLanguageExtension()).toBeTruthy();
    expect(sqlInstance.getLanguageExtension()).toEqual({
      language: 'sql',
      config: {
        dialect: { name: 'sqlite' },
        schema: { world: ['name'] },
        upperCaseKeywords: true,
      },
    });
    expect(unknownInstance.getLanguageExtension()).toEqual([]);
  });

  it('reconfigures the language compartment when SQL config changes', () => {
    const effect = Symbol('language-effect');
    const instance = Object.create(CodeMirrorInstance.prototype);
    instance.options = { languageConfig: null };
    instance.isConsole = false;
    instance.languageCompartment = { reconfigure: vi.fn(() => effect) };
    instance.getLanguageExtension = vi.fn(() => 'sql-extension');
    instance.editorView = { dispatch: vi.fn() };

    instance.setLanguageConfig({ schema: { world: ['name'] } });

    expect(instance.options.languageConfig).toEqual({ schema: { world: ['name'] } });
    expect(instance.languageCompartment.reconfigure).toHaveBeenCalledWith('sql-extension');
    expect(instance.editorView.dispatch).toHaveBeenCalledWith({ effects: effect });
  });

  it('reconfigures the completion compartment when completion config changes', () => {
    const effect = Symbol('completion-effect');
    const instance = Object.create(CodeMirrorInstance.prototype);
    instance.options = { completionConfig: null };
    instance.isConsole = false;
    instance.completionCompartment = { reconfigure: vi.fn(() => effect) };
    instance.getCompletionExtension = vi.fn(() => 'completion-extension');
    instance.editorView = { dispatch: vi.fn() };

    instance.setCompletionConfig({ override: [() => null] });

    expect(instance.completionCompartment.reconfigure).toHaveBeenCalledWith('completion-extension');
    expect(instance.editorView.dispatch).toHaveBeenCalledWith({ effects: effect });
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

  it('detects console error markers for red error line styling', () => {
    const instance = Object.create(CodeMirrorInstance.prototype);

    expect(instance.isConsoleErrorLine('[!>] > boom')).toBe(true);
    expect(instance.isConsoleErrorLine('!> boom')).toBe(true);
    expect(instance.isConsoleErrorLine('[runner] > ok')).toBe(false);
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

  it('stops printable keypress events from bubbling out of the editor', () => {
    const contentDOM = document.createElement('div');
    const event = new KeyboardEvent('keypress', { key: 'x', bubbles: true });
    const stopPropagation = vi.spyOn(event, 'stopPropagation');
    const instance = Object.create(CodeMirrorInstance.prototype);

    instance.options = { readonly: false };
    instance.isConsole = false;
    instance.editorView = { contentDOM };

    instance.shieldPrintableKeypresses();
    contentDOM.dispatchEvent(event);

    expect(stopPropagation).toHaveBeenCalledTimes(1);
  });

  it('does not stop bubbling for modified keypress events', () => {
    const contentDOM = document.createElement('div');
    const event = new KeyboardEvent('keypress', { key: 'x', ctrlKey: true, bubbles: true });
    const stopPropagation = vi.spyOn(event, 'stopPropagation');
    const instance = Object.create(CodeMirrorInstance.prototype);

    instance.options = { readonly: false };
    instance.isConsole = false;
    instance.editorView = { contentDOM };

    instance.shieldPrintableKeypresses();
    contentDOM.dispatchEvent(event);

    expect(stopPropagation).not.toHaveBeenCalled();
  });
});