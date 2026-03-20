import CodeMirrorInstance from '@scripts/editor/codemirror/codemirror-instance.js';

/**
 * Manages the console output component.
 */
export default class ConsoleManager {

  /**
   * @param {boolean} hasConsole
   * @param {string} consoleUID
   * @param {object} l10n
   * @param {string} consoleType
   * @param {Function} resizeActionHandler
   */
  constructor(hasConsole, consoleUID, l10n, consoleType = 'codemirror', resizeActionHandler = () => { }) {
    this.hasConsole = hasConsole ?? true;
    this.consoleUID = consoleUID;
    this.l10n = l10n || {};
    this.consoleType = consoleType;
    this.resizeActionHandler = typeof resizeActionHandler === 'function'
      ? resizeActionHandler
      : () => { };
    this.theme = 'light';

    /** @type {CodeMirrorInstance|null} */
    this._consoleInstance = null;

    /** @type {DocumentFragment|null} */
    this._domFragment = null;

    /** @type {HTMLElement|null} */
    this._consoleElement = null;

    this._resizeFrame = null;
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
    wrapper.className = 'console_wrapper console-wrapper';

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
        theme: this.theme,
        resizeActionHandler: () => this.triggerResizeAction(),
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
    this.triggerResizeAction();
  }

  showConsole() {
    if (!this.hasConsole) {
      return;
    }

    const consoleElement = document.getElementById(this.consoleUID);
    const wrapper = consoleElement?.parentElement;

    if (!wrapper) {
      return;
    }

    wrapper.classList.remove('hidden');
    this.triggerResizeAction();
  }

  /**
   * Clears console
   */
  clearConsole() {
    if (!this._consoleInstance) return;
    this._consoleInstance.setCode('');
    this.triggerResizeAction();
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
    this.triggerResizeAction();
  }

  /**
   * Restore console dynamic height
   */
  restoreConsoleHeight() {
    this._consoleInstance?.restoreDynamicHeight();
    this.triggerResizeAction();
  }

  /**
   * Schedules one resize callback on the next animation frame.
   * @returns {void}
   */
  triggerResizeAction() {
    if (typeof window?.requestAnimationFrame !== 'function') {
      this.resizeActionHandler();
      return;
    }

    if (this._resizeFrame !== null) {
      window.cancelAnimationFrame(this._resizeFrame);
    }

    this._resizeFrame = window.requestAnimationFrame(() => {
      this._resizeFrame = null;
      this.resizeActionHandler();
    });
  }

  /**
   * Disposes the console editor instance.
   * @returns {void}
   */
  destroy() {
    if (this._resizeFrame !== null && typeof window?.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(this._resizeFrame);
      this._resizeFrame = null;
    }

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