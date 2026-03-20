import { Decoration, EditorView, keymap, lineNumbers } from '@codemirror/view';
import { Compartment, EditorState, Transaction, StateField, RangeSetBuilder } from '@codemirror/state';
import { defaultKeymap, history } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { sql } from '@codemirror/lang-sql';
import { bracketMatching } from '@codemirror/language';
import { closeBrackets, autocompletion } from '@codemirror/autocomplete';
import { getCodeMirrorThemeExtensions } from './codemirror-themes.js';

/**
 * Wrapper class for a single CodeMirror 6 editor instance
 */
export default class CodeMirrorInstance {
  constructor(target, content = '', codingLanguage, options = {}) {
    this.uid = typeof target === 'string' ? target : target?.id;
    this.parentElement = target instanceof HTMLElement ? target : null;
    this.codingLanguage = codingLanguage;
    this.options = {
      readonly: false,
      showLineNumbers: true,
      firstLine: 1,
      highlightActiveLine: true,
      minHeightFromContent: true,
      minLines: 1,
      maxLines: 30,
      lineHeightPx: 18,
      resizeActionHandler: () => { },
      onChangeCallback: () => { },
      theme: 'light',
      isConsole: false,
      preCode: '',
      postCode: '',
      ...options
    };

    this.isConsole = this.options.isConsole;
    this.editorView = null;
    this._resizeObserver = null;
    this.themeCompartment = new Compartment();

    // Normalize preCode, mainCode (content), postCode with newlines
    this.preCode = this.options.preCode === '' || this.options.preCode.endsWith('\n')
      ? this.options.preCode
      : this.options.preCode + '\n';

    this.mainCode = content;

    this.postCode = this.options.postCode === '' || this.options.postCode.startsWith('\n')
      ? this.options.postCode
      : '\n' + this.options.postCode;

    // Correct lengths
    this.preCodeLength = this.preCode.length;
    this.mainCodeLength = this.mainCode.length;
    this.postCodeLength = this.postCode.length;

    this.createEditor();
  }

  /** --- Language / Theme --- */
  getLanguageExtension() {
    switch (this.codingLanguage) {
      case 'python': return python();
      case 'javascript': return javascript();
      case 'markdown': return markdown();
      case 'sql': return sql();
      default: return [];
    }
  }

  getThemeExtension() {
    return getCodeMirrorThemeExtensions(this.options.theme);
  }

  getInitialLineCount() {
    return Math.max(
      this.options.minLines ?? 1,
      this.mainCode ? this.mainCode.split(/\r?\n/).length : 1
    );
  }

  /** --- Editor creation --- */
  createEditor() {
    const parent = this.getParentElement();
    if (!parent) throw new Error(`Element #${this.uid} not found`);

    const fullDoc = `${this.preCode}${this.mainCode}${this.postCode}`;

    const state = EditorState.create({
      doc: fullDoc,
      extensions: [
        this.options.showLineNumbers ? lineNumbers() : [],
        bracketMatching(),
        closeBrackets(),
        history(),
        !this.isConsole ? this.getLanguageExtension() : [],
        this.themeCompartment.of(this.getThemeExtension()),
        keymap.of(defaultKeymap),
        autocompletion(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !this.isConsole) this.handleChange();
        }),
        EditorView.editable.of(!this.options.readonly && !this.isConsole),
        this.createReadonlyDecorations(),
        ...(this.isConsole ? [this.createConsoleErrorLineDecorations()] : []),
        ...this.readOnlyRangesExtension()
      ]
    });

    this.editorView = new EditorView({ state, parent });

    if (this.options.minHeightFromContent) this.applyMinHeightFromContent();
    this.attachResizeObserver();
    if (!this.isConsole) this.setupRunShortcut();
  }

  /**
   * --- Readonly Ranges Methods ---
   * @param state
   */
  getReadOnlyRanges(state) {
    const preLength = this.preCode.length;
    const mainLength = state.doc.length - preLength - this.postCode.length;

    return [
      { from: 0, to: preLength },                             // preCode
      { from: preLength + mainLength, to: state.doc.length }  // postCode
    ];
  }

  smartDelete() {
    return EditorState.transactionFilter.of((tr) => {
      if (!tr.isUserEvent('delete.selection')) return tr;
      const ranges = tr.startState.selection.ranges;
      const readOnlyRanges = this.getReadOnlyRanges(tr.startState);

      for (let sel of ranges) {
        for (let ro of readOnlyRanges) {
          if (sel.from < ro.to && sel.to > ro.from) {
            return []; // cancel deletion
          }
        }
      }
      return tr;
    });
  }

  preventModifyTargetRanges() {
    return EditorState.changeFilter.of((tr) => {
      const rangesBefore = this.getReadOnlyRanges(tr.startState);
      const rangesAfter = this.getReadOnlyRanges(tr.state);

      for (let i = 0; i < rangesBefore.length; i++) {

        const fromBefore = rangesBefore[i].from ?? 0;
        const toBefore = rangesBefore[i].to ?? tr.startState.doc.length;

        const fromAfter = rangesAfter[i].from ?? 0;
        const toAfter = rangesAfter[i].to ?? tr.state.doc.length;

        if (fromBefore >= toBefore) continue;

        const beforeText = tr.startState.sliceDoc(fromBefore, toBefore);
        const afterText = tr.state.sliceDoc(fromAfter, toAfter);

        if (beforeText !== afterText) {
          return false;
        }
      }

      return true;
    });
  }

  smartPaste() {
    return EditorView.domEventHandlers({
      paste: (event, view) => {
        const clipboardData = event.clipboardData || window.clipboardData;
        const pastedData = clipboardData.getData('Text');
        const sel = view.state.selection.main;
        const readOnlyRanges = this.getReadOnlyRanges(view.state);

        for (let ro of readOnlyRanges) {
          if (sel.from < ro.to && sel.to > ro.from) {
            event.preventDefault();
            return true; // block paste
          }
        }

        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: pastedData },
          annotations: Transaction.userEvent.of('input.paste.smart')
        });
        event.preventDefault();
        return true;
      }
    });
  }

  readOnlyRangesExtension() {
    return [
      this.smartDelete(),
      this.preventModifyTargetRanges(),
      this.smartPaste()
    ];
  }

  /**
   * --- Utility Methods ---
   * @param text
   */
  appendCode(text) {
    if (!this.editorView) return;
    const docLength = this.editorView.state.doc.length;
    this.editorView.dispatch({
      changes: { from: docLength, insert: text.endsWith('\n') ? text : text + '\n' }
    });
    this.scrollToBottom();
  }

  scrollToBottom() {
    if (!this.editorView) return;
    this.editorView.dispatch({
      effects: EditorView.scrollIntoView(this.editorView.state.doc.length)
    });
  }

  applyMinHeightFromContent() {
    const parent = this.getParentElement();
    if (!parent) return;

    const lineCount = this.getInitialLineCount();
    const maxLines = this.options.maxLines;
    const effectiveLines = typeof maxLines === 'number' ? Math.min(lineCount, maxLines) : lineCount;
    const minHeightPx = effectiveLines * this.options.lineHeightPx + 16;
    parent.style.minHeight = `${minHeightPx}px`;
    this.editorView.requestMeasure();
  }

  attachResizeObserver() {
    const parent = this.getParentElement();
    if (!parent || !window.ResizeObserver) return;

    let lastCall = 0;
    this._resizeObserver = new ResizeObserver(() => {
      const now = performance.now();
      if (now - lastCall > 400) {
        lastCall = now;
        this.options.resizeActionHandler();
      }
    });
    this._resizeObserver.observe(parent);
  }

  setupRunShortcut() {
    this.editorView.dom.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.run();
      }
    });
  }

  handleChange() {
    this.options.onChangeCallback(this.getCode());
  }

  getCode() {
    const code = this.editorView.state.doc.toString();
    return code.endsWith('\n') ? code : code + '\n';
  }

  setCode(code) {
    const transaction = this.editorView.state.update({
      changes: { from: 0, to: this.editorView.state.doc.length, insert: code }
    });
    this.editorView.update([transaction]);
    if (this.isConsole) this.scrollToBottom();
  }

  /**
   * Updates the editor theme without rebuilding the editor instance.
   * @param {string} theme Theme variant.
   */
  setTheme(theme) {
    this.options.theme = theme === 'dark' ? 'dark' : 'light';

    if (!this.editorView) {
      return;
    }

    this.editorView.dispatch({
      effects: this.themeCompartment.reconfigure(this.getThemeExtension())
    });
  }

  run() {
    return true;
  }

  destroy() {
    if (this.editorView) {
      this.editorView.destroy();
      const parent = this.getParentElement();
      if (parent) parent.innerHTML = '';
      this.editorView = null;
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  setFixedLines(lines) {
    this.options.minLines = lines;
    this.options.maxLines = lines;
    const lineHeightPx = this.options.lineHeightPx || 18;
    const newHeight = lines * lineHeightPx + 16;
    const parent = this.getParentElement();
    if (parent) parent.style.height = `${newHeight}px`;
    this.editorView?.requestMeasure();
  }

  restoreDynamicHeight() {
    const parent = this.getParentElement();
    if (parent) parent.style.height = 'auto';
    this.options.minLines = 1;
    this.options.maxLines = this.options.maxLines ?? 30;
    this.editorView?.requestMeasure();
  }

  getParentElement() {
    if (this.parentElement?.isConnected || this.parentElement) {
      return this.parentElement;
    }

    if (!this.uid) {
      return null;
    }

    this.parentElement = document.getElementById(this.uid);
    return this.parentElement;
  }

  createReadonlyDecorations() {
    const readonlyMark = Decoration.mark({
      class: 'cm-readonly-range'
    });

    return StateField.define({
      create: (state) => this.buildReadonlyDecorations(state, readonlyMark),

      update: (decorations, tr) => {
        if (!tr.docChanged) return decorations;
        return this.buildReadonlyDecorations(tr.state, readonlyMark);
      },

      provide: (f) => EditorView.decorations.from(f)
    });
  }

  createConsoleErrorLineDecorations() {
    const errorLineDecoration = Decoration.line({ class: 'cm-console-error-line' });

    return StateField.define({
      create: (state) => this.buildConsoleErrorLineDecorations(state, errorLineDecoration),

      update: (decorations, tr) => {
        if (!tr.docChanged) return decorations;
        return this.buildConsoleErrorLineDecorations(tr.state, errorLineDecoration);
      },

      provide: (f) => EditorView.decorations.from(f)
    });
  }

  isConsoleErrorLine(text = '') {
    const normalizedText = String(text || '').trimStart();
    return normalizedText.startsWith('[!>] >') || normalizedText.startsWith('!>');
  }

  buildConsoleErrorLineDecorations(state, lineDecoration) {
    const builder = new RangeSetBuilder();

    for (let lineNumber = 1; lineNumber <= state.doc.lines; lineNumber += 1) {
      const line = state.doc.line(lineNumber);

      if (this.isConsoleErrorLine(line.text)) {
        builder.add(line.from, line.from, lineDecoration);
      }
    }

    return builder.finish();
  }

  buildReadonlyDecorations(state, mark) {
    const builder = new RangeSetBuilder();

    const docLength = state.doc.length;

    const preEnd = this.preCodeLength;
    const postStart = docLength - this.postCodeLength;

    if (this.preCodeLength > 0) {
      builder.add(0, preEnd, mark);
    }

    if (this.postCodeLength > 0) {
      builder.add(postStart, docLength, mark);
    }

    return builder.finish();
  }
}