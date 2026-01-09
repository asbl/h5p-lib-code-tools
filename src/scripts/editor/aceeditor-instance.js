import ace from "ace-builds/src-noconflict/ace";
import "ace-builds/src-noconflict/ext-language_tools"; // Autocomplete etc.
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/mode-sql";
import "ace-builds/src-noconflict/theme-textmate";

/**
 * Single Ace editor instance wrapper
 */
export default class AceEditorInstance {
  /**
   * @param {string} uid - ID des DOM-Elements
   * @param {string} content - initialer Code
   * @param {string} language - Programmiersprache
   * @param {function} onChangeCallback - Callback bei Codeänderung
   */
  constructor(uid, content = "", language, options) {
    this.uid = uid;
    this.content = content;
    this.language = language;
    this.options = options;
    this.editor = this.createEditor();
    this.onChangeCallback = options?.onChangeCallback || (() => {});
  }

  createEditor() {
    const parent = document.getElementById(this.uid);
    if (!parent) {
      throw new Error(`AceEditorInstance: Element #${this.uid} not found`);
    }

    const editor = ace.edit(this.uid);
    editor.setValue(this.content, -1); // -1 setzt den Cursor an den Anfang
    editor.setReadOnly(this.options?.readonly ?? false);
    editor.setOptions({
      enableBasicAutocompletion:
        this.options?.enableBasicAutocompletion ?? true,
      enableLiveAutocompletion: this.options?.enableLiveAutocompletion ?? true,
      enableSnippets: true,
      fontSize: "14px",
      showGutter: this.options?.showGutter ?? true,
      showLineNumbers: this.options?.showLineNumbers ?? true,
      theme: "ace/theme/textmate",
      firstLineNumber: this.options?.firstLine ?? 1,
      highlightActiveLine: this.options?.highlightActiveLine,
    });

    editor.session.setMode(this.getLanguageMode());
    editor.session.on("change", () => this.handleChange());

    // Shortcut für "Run" (Ctrl+Enter / Cmd+Enter)
    editor.commands.addCommand({
      name: "runCode",
      bindKey: { win: "Ctrl-Enter", mac: "Cmd-Enter" },
      exec: () => this.run(),
    });

    return editor;
  }

  getLanguageMode() {
    switch (this.language) {
      case "python":
        return "ace/mode/python";
      case "javascript":
        return "ace/mode/javascript";
      case "markdown":
        return "ace/mode/markdown";
      case "sql":
        return "ace/mode/sql";
      default:
        return "ace/mode/plain_text";
    }
  }

  getCode() {
    const code = this.editor.getValue();
    // Ensure it ends with a newline
    return code.endsWith("\n") ? code : code + "\n";
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
      if (parent) parent.innerHTML = "";
      this.editor = null;
    }
  }
}
