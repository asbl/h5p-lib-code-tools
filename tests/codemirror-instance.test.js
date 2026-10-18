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
    java: () => ({ language: 'java' }),
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
      tabSize: { of: (value) => ({ facet: 'tabSize', value }) },
      transactionFilter: { of: (value) => value },
      changeFilter: { of: (value) => value },
    },
    Transaction: { userEvent: { of: (value) => value } },
    indentUnit: { of: (value) => ({ facet: 'indentUnit', value }) },
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
    const javaInstance = Object.create(CodeMirrorInstance.prototype);
    javaInstance.codingLanguage = 'java';
    javaInstance.options = {};

    expect(javaInstance.getLanguageExtension()).toEqual({ language: 'java' });
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

  it('sorts inline diagnostics before dispatching CodeMirror decorations', () => {
    const effect = Symbol('diagnostics-effect');
    const instance = Object.create(CodeMirrorInstance.prototype);
    instance.setInlineDiagnosticsEffect = { of: vi.fn(() => effect) };
    instance.editorView = { dispatch: vi.fn() };

    instance.setInlineDiagnostics([
      { from: 12, to: 15, severity: 'warning' },
      { from: 4, to: 8, severity: 'warning' },
    ]);

    expect(instance.inlineDiagnostics.map((diagnostic) => diagnostic.from)).toEqual([4, 12]);
    expect(instance.setInlineDiagnosticsEffect.of).toHaveBeenCalledWith(instance.inlineDiagnostics);
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

  it('builds indent and tab-size extensions from numeric options', () => {
    const instance = Object.create(CodeMirrorInstance.prototype);
    instance.options = { indentUnit: 4, tabSize: 4 };

    expect(instance.getIndentUnitExtension({ of: (value) => ({ value }) })).toEqual({ value: '    ' });
    expect(instance.getTabSizeExtension({ tabSize: { of: (value) => ({ value }) } })).toEqual({ value: 4 });
  });

  it('skips indent extensions when options are omitted or invalid', () => {
    const instance = Object.create(CodeMirrorInstance.prototype);
    instance.options = { indentUnit: null, tabSize: 0 };

    expect(instance.getIndentUnitExtension({ of: (value) => ({ value }) })).toEqual([]);
    expect(instance.getTabSizeExtension({ tabSize: { of: (value) => ({ value }) } })).toEqual([]);
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

  it('focuses user code lines with preCode offset applied', () => {
    const dispatch = vi.fn();
    const focus = vi.fn();
    const line = vi.fn((lineNumber) => ({ from: lineNumber * 10 }));
    const instance = Object.create(CodeMirrorInstance.prototype);

    instance.preCode = 'import math\nprint("setup")\n';
    instance.editorView = {
      dispatch,
      focus,
      state: {
        doc: {
          lines: 20,
          line,
        },
      },
    };

    instance.focusLine(3);

    expect(line).toHaveBeenCalledWith(5);
    expect(dispatch).toHaveBeenCalledWith({
      selection: { anchor: 50 },
      scrollIntoView: true,
    });
    expect(focus).toHaveBeenCalledTimes(1);
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

  it('keeps the diagnostic message in the mark attributes for assistive technology', () => {
    const instance = Object.create(CodeMirrorInstance.prototype);

    const decorations = instance.buildInlineDiagnosticsDecorations([
      { from: 0, to: 4, severity: 'error', message: 'Name "prin" is not defined' },
      { from: 8, to: 12, severity: 'warning', message: 'Unused variable' },
    ]);

    expect(decorations[0].value.config.class).toBe('cm-inline-diagnostic cm-inline-diagnostic-error');
    expect(decorations[0].value.config.attributes['aria-label']).toBe('Name "prin" is not defined');
    expect(decorations[1].value.config.class).toBe('cm-inline-diagnostic cm-inline-diagnostic-warning');
    expect(decorations[1].value.config.attributes['aria-label']).toBe('Unused variable');
  });

  const createTooltipInstance = () => {
    const editorDom = document.createElement('div');
    document.body.appendChild(editorDom);

    const mark = document.createElement('span');
    mark.className = 'cm-inline-diagnostic cm-inline-diagnostic-error';
    mark.setAttribute('aria-label', 'Name "prin" is not defined');
    mark.textContent = 'prin';
    editorDom.appendChild(mark);

    const instance = Object.create(CodeMirrorInstance.prototype);
    instance.editorView = { dom: editorDom };
    instance.inlineDiagnosticsTooltip = null;

    return { instance, editorDom, mark };
  };

  it('shows and toggles the diagnostic tooltip on click and tap', () => {
    const { instance, mark } = createTooltipInstance();

    instance.handleInlineDiagnosticsClick({ target: mark });

    const tooltip = document.querySelector('.cm-inline-diagnostic-tooltip');
    expect(tooltip).toBeTruthy();
    expect(tooltip.className).toContain('cm-inline-diagnostic-tooltip-error');
    expect(tooltip.textContent).toBe('Name "prin" is not defined');
    expect(tooltip.getAttribute('role')).toBe('tooltip');

    instance.handleInlineDiagnosticsClick({ target: mark });
    expect(document.querySelector('.cm-inline-diagnostic-tooltip')).toBeNull();
  });

  it('hides the tooltip when clicking outside a diagnostic mark', () => {
    const { instance, editorDom, mark } = createTooltipInstance();

    instance.handleInlineDiagnosticsClick({ target: mark });
    expect(document.querySelector('.cm-inline-diagnostic-tooltip')).toBeTruthy();

    instance.handleInlineDiagnosticsClick({ target: editorDom });
    expect(document.querySelector('.cm-inline-diagnostic-tooltip')).toBeNull();
  });

  it('shows the tooltip on hover for hover-capable devices only', () => {
    const { instance, mark } = createTooltipInstance();

    instance.handleInlineDiagnosticsMouseOver({ target: mark });
    expect(document.querySelector('.cm-inline-diagnostic-tooltip')).toBeNull();

    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));

    instance.handleInlineDiagnosticsMouseOver({ target: mark });
    expect(document.querySelector('.cm-inline-diagnostic-tooltip')).toBeTruthy();

    instance.handleInlineDiagnosticsMouseOut({ target: mark, relatedTarget: document.body });
    expect(document.querySelector('.cm-inline-diagnostic-tooltip')).toBeNull();
  });

  it('ignores mouseout events that stay inside the same mark', () => {
    const { instance, mark } = createTooltipInstance();
    const child = document.createElement('span');
    mark.appendChild(child);

    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));

    instance.handleInlineDiagnosticsMouseOver({ target: mark });
    instance.handleInlineDiagnosticsMouseOut({ target: child, relatedTarget: mark });
    expect(document.querySelector('.cm-inline-diagnostic-tooltip')).toBeTruthy();
  });

  it('hides the tooltip when diagnostics are refreshed', () => {
    const { instance, mark } = createTooltipInstance();

    instance.handleInlineDiagnosticsClick({ target: mark });
    expect(document.querySelector('.cm-inline-diagnostic-tooltip')).toBeTruthy();

    instance.setInlineDiagnosticsEffect = { of: vi.fn() };
    instance.editorView = { dom: instance.editorView.dom, dispatch: vi.fn() };

    instance.setInlineDiagnostics([]);
    expect(document.querySelector('.cm-inline-diagnostic-tooltip')).toBeNull();
  });
});
