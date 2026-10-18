import { getCodeMirrorThemeExtensions } from './codemirror-themes.js';
import { getCodeMirrorRuntime } from './codemirror-runtime.js';

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
      languageConfig: null,
      completionConfig: null,
      indentUnit: null,
      tabSize: null,
      preCode: '',
      postCode: '',
      ...options
    };

    this.isConsole = this.options.isConsole;
    this.editorView = null;
    this._resizeObserver = null;
    this.themeCompartment = new (getCodeMirrorRuntime().Compartment)();
    this.languageCompartment = new (getCodeMirrorRuntime().Compartment)();
    this.completionCompartment = new (getCodeMirrorRuntime().Compartment)();
    this.inlineDiagnostics = [];
    this.setInlineDiagnosticsEffect = getCodeMirrorRuntime().StateEffect.define();

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
    const runtime = getCodeMirrorRuntime();

    switch (this.codingLanguage) {
      case 'python': return runtime.python();
      case 'java': return runtime.java();
      case 'javascript': return runtime.javascript();
      case 'markdown': return runtime.markdown();
      case 'sql': {
        const languageConfig = {
          dialect: runtime.SQLite,
          ...(this.options.languageConfig || {}),
        };

        return runtime.sql(languageConfig);
      }
      default: return [];
    }
  }

  getThemeExtension() {
    return getCodeMirrorThemeExtensions(this.options.theme);
  }

  getCompletionExtension() {
    return getCodeMirrorRuntime().autocompletion(this.options.completionConfig || {});
  }

  getInitialLineCount() {
    return Math.max(
      this.options.minLines ?? 1,
      this.mainCode ? this.mainCode.split(/\r?\n/).length : 1
    );
  }

  /** --- Editor creation --- */
  createEditor() {
    const runtime = getCodeMirrorRuntime();
    const {
      EditorView,
      EditorState,
      lineNumbers,
      bracketMatching,
      closeBrackets,
      history,
      historyKeymap,
      indentWithTab,
      keymap,
      defaultKeymap,
      indentUnit,
    } = runtime;

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
        this.getIndentUnitExtension(indentUnit),
        this.getTabSizeExtension(EditorState),
        this.languageCompartment.of(!this.isConsole ? this.getLanguageExtension() : []),
        this.themeCompartment.of(this.getThemeExtension()),
        this.completionCompartment.of(this.getCompletionExtension()),
        keymap.of([
          indentWithTab,
          ...historyKeymap,
          ...defaultKeymap,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !this.isConsole) this.handleChange();
        }),
        EditorView.editable.of(!this.options.readonly && !this.isConsole),
        this.createReadonlyDecorations(),
        this.createInlineDiagnosticsDecorations(),
        this.createInlineDiagnosticsTooltipExtension(),
        ...(this.isConsole ? [this.createConsoleErrorLineDecorations()] : []),
        ...this.readOnlyRangesExtension()
      ]
    });

    this.editorView = new EditorView({ state, parent });

    if (this.options.minHeightFromContent) this.applyMinHeightFromContent();
    this.attachResizeObserver();
    this.attachInlineDiagnosticsScrollHandler();
    this.shieldPrintableKeypresses();
    this.shieldEditorKeyboardShortcuts();
    if (!this.isConsole) this.setupRunShortcut();
  }

  getIndentUnitExtension(indentUnitFacet) {
    const indentSize = Number(this.options.indentUnit);

    if (!Number.isInteger(indentSize) || indentSize < 1) {
      return [];
    }

    return indentUnitFacet.of(' '.repeat(indentSize));
  }

  getTabSizeExtension(EditorState) {
    const tabSize = Number(this.options.tabSize);

    if (!Number.isInteger(tabSize) || tabSize < 1 || !EditorState?.tabSize?.of) {
      return [];
    }

    return EditorState.tabSize.of(tabSize);
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
    return getCodeMirrorRuntime().EditorState.transactionFilter.of((tr) => {
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
    return getCodeMirrorRuntime().EditorState.changeFilter.of((tr) => {
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
    const { EditorView, Transaction } = getCodeMirrorRuntime();

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
    const { EditorView } = getCodeMirrorRuntime();
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

  // Stops editor-relevant Ctrl/Cmd shortcuts from bubbling to the H5P page layer,
  // preventing the host application from intercepting undo, clipboard, etc.
  // Uses stopPropagation only – never preventDefault – so browser clipboard APIs
  // (copy, cut, paste) and CodeMirror's own handlers still execute normally.
  shieldEditorKeyboardShortcuts() {
    if (!this.editorView) return;

    const shielded = new Set(['a', 'c', 'x', 'v', 'z', 'y', '/']);

    this.editorView.dom.addEventListener('keydown', (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.key && shielded.has(event.key.toLowerCase())) {
        event.stopPropagation();
      }
    });
  }

  shieldPrintableKeypresses() {
    if (!this.editorView || this.options.readonly || this.isConsole) {
      return;
    }

    this.editorView.contentDOM.addEventListener('keypress', (event) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (typeof event.key !== 'string') {
        return;
      }

      if (event.key.length === 1 || event.key === 'Enter') {
        event.stopPropagation();
      }
    });
  }

  handleChange() {
    this.hideInlineDiagnosticsTooltip();
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

  setLanguageConfig(languageConfig = null) {
    this.options.languageConfig = languageConfig && typeof languageConfig === 'object'
      ? languageConfig
      : null;

    if (!this.editorView || this.isConsole) {
      return;
    }

    this.editorView.dispatch({
      effects: this.languageCompartment.reconfigure(this.getLanguageExtension())
    });
  }

  setCompletionConfig(completionConfig = null) {
    this.options.completionConfig = completionConfig && typeof completionConfig === 'object'
      ? completionConfig
      : null;

    if (!this.editorView || this.isConsole) {
      return;
    }

    this.editorView.dispatch({
      effects: this.completionCompartment.reconfigure(this.getCompletionExtension())
    });
  }

  focus() {
    this.editorView?.focus();
  }

  focusLine(lineNumber) {
    if (!this.editorView?.state?.doc || !Number.isFinite(Number(lineNumber))) {
      this.focus();
      return;
    }

    const userLine = Math.max(1, Number(lineNumber));
    const preCodeLines = this.preCode ? this.preCode.split(/\r?\n/).length - 1 : 0;
    const documentLine = Math.min(
      Math.max(1, userLine + preCodeLines),
      this.editorView.state.doc.lines,
    );
    const position = this.editorView.state.doc.line(documentLine).from;

    this.editorView.dispatch({
      selection: { anchor: position },
      scrollIntoView: true,
    });
    this.editorView.focus?.();
  }

  setInlineDiagnostics(diagnostics = []) {
    this.inlineDiagnostics = Array.isArray(diagnostics)
      ? diagnostics.filter((diagnostic) => diagnostic && typeof diagnostic.from === 'number' && typeof diagnostic.to === 'number')
        .sort((left, right) => left.from - right.from || left.to - right.to)
      : [];

    this.hideInlineDiagnosticsTooltip();

    if (!this.editorView) {
      return;
    }

    this.editorView.dispatch({
      effects: this.setInlineDiagnosticsEffect.of(this.inlineDiagnostics),
    });
  }

  /**
   * --- Inline diagnostics tooltip ---
   * Shows the diagnostic message on hover (pointer devices) and on click/tap
   * (covers touch devices), so the message text is readable everywhere.
   * @returns {object} CodeMirror DOM event handlers extension.
   */
  createInlineDiagnosticsTooltipExtension() {
    const { EditorView } = getCodeMirrorRuntime();

    return EditorView.domEventHandlers({
      mouseover: (event) => this.handleInlineDiagnosticsMouseOver(event),
      mouseout: (event) => this.handleInlineDiagnosticsMouseOut(event),
      click: (event) => this.handleInlineDiagnosticsClick(event),
    });
  }

  attachInlineDiagnosticsScrollHandler() {
    const scroller = this.editorView?.dom?.querySelector?.('.cm-scroller');
    if (!scroller) return;

    this._inlineDiagnosticsScrollHandler = () => this.hideInlineDiagnosticsTooltip();
    scroller.addEventListener('scroll', this._inlineDiagnosticsScrollHandler);
  }

  supportsHoverInteraction() {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(hover: hover)').matches;
  }

  getInlineDiagnosticFromEvent(event) {
    const target = event?.target;
    if (!target || typeof target.closest !== 'function') {
      return null;
    }

    const mark = target.closest('.cm-inline-diagnostic');
    if (!mark || !this.editorView?.dom?.contains(mark)) {
      return null;
    }

    const message = mark.getAttribute('aria-label') || '';
    if (!message) {
      return null;
    }

    return {
      mark,
      message,
      severity: mark.classList.contains('cm-inline-diagnostic-error') ? 'error' : 'warning',
    };
  }

  handleInlineDiagnosticsMouseOver(event) {
    if (!this.supportsHoverInteraction()) return false;

    const entry = this.getInlineDiagnosticFromEvent(event);
    if (!entry) return false;

    this.showInlineDiagnosticsTooltip(entry);
    return false;
  }

  handleInlineDiagnosticsMouseOut(event) {
    if (!this.supportsHoverInteraction()) return false;

    const mark = event?.target?.closest?.('.cm-inline-diagnostic');
    if (!mark) return false;
    if (mark.contains(event.relatedTarget)) return false;

    this.hideInlineDiagnosticsTooltip();
    return false;
  }

  handleInlineDiagnosticsClick(event) {
    const entry = this.getInlineDiagnosticFromEvent(event);

    if (!entry) {
      this.hideInlineDiagnosticsTooltip();
      return false;
    }

    this.toggleInlineDiagnosticsTooltip(entry);
    return false;
  }

  toggleInlineDiagnosticsTooltip(entry) {
    if (this.inlineDiagnosticsTooltip?.sourceMark === entry.mark) {
      this.hideInlineDiagnosticsTooltip();
      return;
    }

    this.showInlineDiagnosticsTooltip(entry);
  }

  showInlineDiagnosticsTooltip(entry) {
    if (!entry?.mark || !entry.message) return;
    if (this.inlineDiagnosticsTooltip?.sourceMark === entry.mark) return;

    this.hideInlineDiagnosticsTooltip();

    const tooltip = document.createElement('div');
    tooltip.className = `cm-inline-diagnostic-tooltip cm-inline-diagnostic-tooltip-${entry.severity}`;
    tooltip.setAttribute('role', 'tooltip');
    tooltip.textContent = entry.message;
    document.body.appendChild(tooltip);

    const tooltipRect = tooltip.getBoundingClientRect();
    const markRect = entry.mark.getBoundingClientRect();
    const viewportWidth = window.innerWidth || tooltipRect.width;
    const viewportHeight = window.innerHeight || tooltipRect.height;

    let left = markRect.left + markRect.width / 2 - tooltipRect.width / 2;
    left = Math.max(8, Math.min(left, Math.max(8, viewportWidth - tooltipRect.width - 8)));

    let top = markRect.top - tooltipRect.height - 8;
    if (top < 8) {
      top = markRect.bottom + 8;
    }
    top = Math.min(top, Math.max(8, viewportHeight - tooltipRect.height - 8));

    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;

    this.inlineDiagnosticsTooltip = { element: tooltip, sourceMark: entry.mark };
  }

  hideInlineDiagnosticsTooltip() {
    if (!this.inlineDiagnosticsTooltip) return;

    this.inlineDiagnosticsTooltip.element.remove();
    this.inlineDiagnosticsTooltip = null;
  }


  run() {
    return true;
  }

  destroy() {
    this.hideInlineDiagnosticsTooltip();

    if (this._inlineDiagnosticsScrollHandler) {
      const scroller = this.editorView?.dom?.querySelector?.('.cm-scroller');
      scroller?.removeEventListener?.('scroll', this._inlineDiagnosticsScrollHandler);
      this._inlineDiagnosticsScrollHandler = null;
    }

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
    const { Decoration, StateField, EditorView } = getCodeMirrorRuntime();
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

  createInlineDiagnosticsDecorations() {
    const { StateField, EditorView } = getCodeMirrorRuntime();

    return StateField.define({
      create: () => this.buildInlineDiagnosticsDecorations(this.inlineDiagnostics),

      update: (decorations, tr) => {
        const effect = tr.effects.find((candidate) => candidate.is(this.setInlineDiagnosticsEffect));
        if (effect) {
          return this.buildInlineDiagnosticsDecorations(effect.value);
        }

        if (tr.docChanged) {
          return this.buildInlineDiagnosticsDecorations(this.inlineDiagnostics);
        }

        return decorations;
      },

      provide: (field) => EditorView.decorations.from(field)
    });
  }

  createConsoleErrorLineDecorations() {
    const { Decoration, StateField, EditorView } = getCodeMirrorRuntime();
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
    const builder = new (getCodeMirrorRuntime().RangeSetBuilder)();

    for (let lineNumber = 1; lineNumber <= state.doc.lines; lineNumber += 1) {
      const line = state.doc.line(lineNumber);

      if (this.isConsoleErrorLine(line.text)) {
        builder.add(line.from, line.from, lineDecoration);
      }
    }

    return builder.finish();
  }

  buildReadonlyDecorations(state, mark) {
    const builder = new (getCodeMirrorRuntime().RangeSetBuilder)();

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

  buildInlineDiagnosticsDecorations(diagnostics = []) {
    const { RangeSetBuilder, Decoration } = getCodeMirrorRuntime();
    const builder = new RangeSetBuilder();

    diagnostics.forEach((diagnostic) => {
      const from = Math.max(0, diagnostic.from);
      const to = Math.max(from, diagnostic.to);
      const severity = diagnostic.severity === 'error' ? 'error' : 'warning';
      const message = typeof diagnostic.message === 'string' ? diagnostic.message : '';
      const decoration = Decoration.mark({
        class: `cm-inline-diagnostic cm-inline-diagnostic-${severity}`,
        attributes: message ? { 'aria-label': message } : {},
      });

      if (from === to) {
        return;
      }

      builder.add(from, to, decoration);
    });

    return builder.finish();
  }
}
