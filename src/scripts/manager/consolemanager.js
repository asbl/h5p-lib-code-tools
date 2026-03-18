import CodeMirrorInstance from '@scripts/editor/codemirror-instance.js';

/**
 * Manages the console output component.
 */
export default class ConsoleManager {

  /**
   * @param {boolean} hasConsole
   * @param {string} consoleUID
   * @param {object} l10n
   * @param {string} consoleType
   */
  constructor(hasConsole, consoleUID, l10n, consoleType = 'codemirror') {
    this.hasConsole = hasConsole ?? true;
    this.consoleUID = consoleUID;
    this.l10n = l10n || {};
    this.consoleType = consoleType;
    this.theme = 'light';

    /** @type {CodeMirrorInstance|null} */
    this._consoleInstance = null;

    /** @type {DocumentFragment|null} */
    this._domFragment = null;

    /** @type {HTMLElement|null} */
    this._consoleElement = null;
  }

  /**
   * Creates console DOM (same pattern as EditorManager)
   * @returns {DocumentFragment|null}
   */
  getDOM() {
    if (!this.hasConsole) return null;
    if (this._domFragment) return this._domFragment;

    const fragment = document.createDocumentFragment();

    const wrapper = document.createElement('div');
    wrapper.className = 'console_wrapper console-wrapper hidden';

    const header = document.createElement('div');
    header.className = 'console-header';
    header.textContent = this.l10n.console;

    const body = document.createElement('div');
    body.id = this.consoleUID;
    body.className = 'console console-body';
    this._consoleElement = body;

    wrapper.appendChild(header);
    wrapper.appendChild(body);
    fragment.appendChild(wrapper);

    this._domFragment = fragment;

    return fragment;
  }

  /**
   * Initializes the console editor (after DOM is attached)
   */
  async setupConsole() {
    if (!this.hasConsole) return;
    if (this._consoleInstance) return;

    this._consoleInstance = new CodeMirrorInstance(
      this._consoleElement ?? this.consoleUID,
      '',
      'text',
      {
        readonly: true,
        isConsole: true,
        highlightActiveLine: false,
        showLineNumbers: false,
        theme: this.theme
      }
    );
  }

  /**
  * Returns the CodeMirror editor DOM
  * @returns {HTMLElement|null}
  */
  getConsole() {
    if (this._consoleInstance) {
      return this._consoleInstance.editorView.dom;
    }
    return null;
  }

  /**
   * Writes text to console
   * @param {string} text
   * @param {string} identifier
   */
  write(text, identifier = '') {
    if (!this._consoleInstance) return;

    const line = identifier
      ? `[${identifier}] > ${text.trim()}\n`
      : `> ${text.trim()}\n`;

    const oldCode = this._consoleInstance.getCode();
    this._consoleInstance.setCode(oldCode + line);
  }

  showConsole() {
    const el = document.getElementById(this.consoleUID).parentElement;
    el.classList.remove('hidden');
  }

  /**
   * Clears console
   */
  clearConsole() {
    if (!this._consoleInstance) return;
    this._consoleInstance.setCode('');
  }

  /**
   * Returns CSS classes
   * @returns {string}
   */
  getHTMLClasses() {
    return this.hasConsole ? ' has_console' : ' not_has_console';
  }
  /**
   * Fix console height (fullscreen)
   * @param {number} lines
   */
  setFullscreenLines(lines) {
    this._consoleInstance?.setFixedLines(lines);
  }

  /**
   * Restore console dynamic height
   */
  restoreConsoleHeight() {
    this._consoleInstance?.restoreDynamicHeight();
  }

  /**
   * Disposes the console editor instance.
   * @returns {void}
   */
  destroy() {
    this._consoleInstance?.destroy?.();
    this._consoleInstance = null;

    if (this._consoleElement) {
      this._consoleElement.innerHTML = '';
    }
  }

  /**
   * Applies a new console theme.
   * @param {string} theme Theme variant.
   */
  setTheme(theme) {
    this.theme = theme === 'dark' ? 'dark' : 'light';
    this._consoleInstance?.setTheme(this.theme);
  }


}