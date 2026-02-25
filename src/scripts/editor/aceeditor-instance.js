import ace from 'ace-builds/src-noconflict/ace';
import 'ace-builds/src-noconflict/ext-language_tools'; // Autocomplete etc.
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-markdown';
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/theme-textmate';
import 'ace-builds/src-noconflict/snippets/python';

/**
 * Single Ace editor instance wrapper
 */
export default class AceEditorInstance {
  /**
   * @param {string} uid - ID des DOM-Elements
   * @param {string} content - initialer Code
   * @param {string} codingLanguage - Programmiersprache
   * @param {function} onChangeCallback - Callback bei Codeänderung
   * @param options
   */
  constructor(uid, content = '', codingLanguage, options) {
    this.uid = uid;
    this.content = content;
    this.codingLanguage = codingLanguage;
    this.options = {
      readonly: false,
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      showGutter: true,
      showLineNumbers: true,
      firstLine: 1,
      highlightActiveLine: true,
      minHeightFromContent: true,
      minLines: 1,
      maxLines: 30,
      lineHeightPx: 18,
      resizeActionHandler: () => {
        console.warn('Resize Action not set');
      },
      onChangeCallback: () => { },
      ...options,
    };
    this.onChangeCallback = options?.onChangeCallback || (() => { });
    this.editor = this.createEditor();
  }

  getInitialLineCount() {
    return Math.max(
      this.options.minLines ?? 1,
      this.content ? this.content.split(/\r?\n/).length : 1,
    );
  }

  createEditor() {
    const parent = document.getElementById(this.uid);
    if (!parent) {
      throw new Error(`AceEditorInstance: Element #${this.uid} not found`);
    }

    const editor = ace.edit(parent);
    this.attachResizeObserver(editor);
    editor.setValue(this.content, -1); // -1 setzt den Cursor an den Anfang
    if (this.options?.minHeightFromContent) {
      this.applyMinHeightFromContent(editor);
    }
    editor.setReadOnly(this.options?.readonly ?? false);
    editor.setOptions({
      enableBasicAutocompletion:
        this.options?.enableBasicAutocompletion ?? true,
      enableLiveAutocompletion: this.options?.enableLiveAutocompletion ?? true,
      enableSnippets: true,
      fontSize: '14px',
      showGutter: this.options?.showGutter ?? true,
      showLineNumbers: this.options?.showLineNumbers ?? true,
      theme: 'ace/theme/textmate',
      firstLineNumber: this.options?.firstLine ?? 1,
      highlightActiveLine: this.options?.highlightActiveLine,
    });

    editor.session.setMode(this.getLanguageMode());
    editor.session.on('change', () => this.handleChange());

    // Shortcut für "Run" (Ctrl+Enter / Cmd+Enter)
    editor.commands.addCommand({
      name: 'runCode',
      bindKey: { win: 'Ctrl-Enter', mac: 'Cmd-Enter' },
      exec: () => this.run(),
    });

    return editor;
  }

  getLanguageMode() {
    switch (this.codingLanguage) {
      case 'python':
        return 'ace/mode/python';
      case 'javascript':
        return 'ace/mode/javascript';
      case 'markdown':
        return 'ace/mode/markdown';
      case 'sql':
        return 'ace/mode/sql';
      default:
        return 'ace/mode/plain_text';
    }
  }

  getCode() {
    const code = this.editor.getValue();
    // Ensure it ends with a newline
    return code.endsWith('\n') ? code : code + '\n';
    // @TODO:
    // \n is needed only, when you have
    // multiple codes (e.g. pre-main-and post)
    // code
  }

  setCode(code) {
    this.editor.setValue(code);
  }

  handleChange() {
    this.onChangeCallback(this.getCode());
  }

  run() {
    // Optionaler Hook
    return true;
  }

  destroy() {
    if (this.editor) {
      this.editor.destroy();
      const parent = document.getElementById(this.uid);
      if (parent) parent.innerHTML = '';
      this.editor = null;
    }

    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  applyMinHeightFromContent(editor) {
    const parent = document.getElementById(this.uid);
    if (!parent) return;

    const lineCount = this.getInitialLineCount();
    const maxLines = this.options.maxLines;
    const effectiveLines =
      typeof maxLines === 'number' ? Math.min(lineCount, maxLines) : lineCount;

    const lineHeight = 18;
    const verticalPadding = 16; // Sicherheits-Puffer für Gutter etc.
    const minHeightPx = effectiveLines * lineHeight + verticalPadding;
    parent.style.minHeight = `${minHeightPx}px`;
    editor.resize();
  }

  attachResizeObserver(editor) {
    const parent = document.getElementById(this.uid);
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
}
