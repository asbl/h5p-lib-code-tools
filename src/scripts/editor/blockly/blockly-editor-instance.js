import BlocklyLayoutManager from './managers/blockly-layout-manager.js';
import BlocklyLanguageManager from './managers/blockly-language-manager.js';
import BlocklyThemeManager from './managers/blockly-theme-manager.js';
import BlocklyWorkspaceManager from './managers/blockly-workspace-manager.js';

/**
 * Blockly-based editor instance implementing the EditorAdapter interface
 * used by EditorManager.
 *
 * Interface contract (mirrors CodeMirrorInstance public API):
 *   getCode()            → string (always returns Blockly-generated source)
 *   setCode(code)        → no-op; blocks cannot be reconstructed from code
 *   setTheme(theme)      → updates Blockly theme
 *   setFixedLines(n)     → resizes workspace to n×lineHeightPx
 *   restoreDynamicHeight()
 *   destroy()
 *
 * Modes:
 *   'blocks' – shows only the Blockly workspace
 *   'both'   – shows Blockly workspace + a read-only generated-code preview
 *              with a toggle button the student can use to show/hide the preview
 */
export default class BlocklyEditorInstance {
  constructor(target, _content = '', codingLanguage, options = {}) {
    this.parentElement = target instanceof HTMLElement ? target : null;
    this.codingLanguage = codingLanguage;
    this.options = {
      readonly: false,
      lineHeightPx: 18,
      onChangeCallback: () => {},
      resizeActionHandler: () => {},
      theme: 'light',
      preCode: '',
      postCode: '',
      editorMode: 'blocks',
      blocklyCategories: null,
      blocklyPackages: [],
      codeContainer: null,
      ...options,
    };
    this.options.blocklyPackages = Array.isArray(this.options.blocklyPackages)
      ? this.options.blocklyPackages
      : [];

    this._languageManager = new BlocklyLanguageManager(
      codingLanguage,
      this.options.blocklyPackages,
      undefined,
      this.options.codeContainer,
    );
    this._languagePack = this._languageManager.getLanguagePack();
    this._layoutManager = new BlocklyLayoutManager(this.parentElement);
    this._themeManager = new BlocklyThemeManager(this.parentElement);
    this._workspaceManager = new BlocklyWorkspaceManager(
      this.codingLanguage,
      this._languageManager,
      {
        readonly: this.options.readonly,
        blocklyCategories: this.options.blocklyCategories,
        blocklyPackages: this.options.blocklyPackages,
        onCodeChange: (code) => {
          this._refreshCodePreview(code);
          this.options.onChangeCallback(code);
        },
        resizeActionHandler: this.options.resizeActionHandler,
      },
    );

    this._createEditor();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Returns Blockly-generated source code.
   * @returns {string} Generated source code.
   */
  getCode() {
    return this._workspaceManager.getCode();
  }

  /**
   * No-op. Blockly blocks cannot be reconstructed from source code.
   * Callers that load saved code will silently keep the current workspace.
   */
  setCode(/* code */) {
    // intentionally empty – see class comment
  }

  /**
   * Updates the Blockly workspace and container theme.
   * @param {string} theme Theme variant.
   */
  setTheme(theme) {
    const workspaceTheme = this._themeManager.getWorkspaceTheme(theme);
    this._workspaceManager.setTheme(workspaceTheme);
    this._themeManager.applyContainerTheme(theme);
  }

  /** Focuses the interactive Blockly workspace. */
  focus() {
    this._workspaceManager.focus();
  }

  /**
   * Resizes the workspace container to a fixed line-based height.
   * @param {number} lines Number of lines.
   */
  setFixedLines(lines) {
    this._layoutManager.setFixedLines(lines, this.options.lineHeightPx || 18);
    this._workspaceManager.resize();
  }

  /** Restores automatic height after leaving fullscreen. */
  restoreDynamicHeight() {
    this._layoutManager.restoreDynamicHeight();
    this._workspaceManager.resize();
  }

  /** Disposes the Blockly workspace and removes all DOM nodes. */
  destroy() {
    this._workspaceManager.destroy();
    this._layoutManager.destroy();
  }

  // ─── Setup ──────────────────────────────────────────────────────────────────

  _createEditor() {
    if (!this.parentElement) {
      return;
    }

    const { blocklyDiv } = this._layoutManager.initialize(this.options.editorMode, {
      onShowCode: () => this._refreshCodePreview(),
      onShowBlocks: () => this._workspaceManager.resize(),
    });
    this._themeManager.applyContainerTheme(this.options.theme);

    const workspaceTheme = this._themeManager.getWorkspaceTheme(this.options.theme);
    this._workspaceManager.mount(blocklyDiv, this.parentElement, workspaceTheme);

    if (!this._languagePack.supported) {
      this._layoutManager.showUnsupportedMessage(this.codingLanguage);
    }
  }

  _refreshCodePreview(code) {
    const text = code ?? this.getCode();
    this._layoutManager.setCodePreview(text);
  }
}
