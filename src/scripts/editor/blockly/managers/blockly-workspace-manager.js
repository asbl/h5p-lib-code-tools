import { getBlocklyRuntime } from '../blockly-runtime.js';

/**
 * Owns Blockly workspace lifecycle and resize behavior.
 */
export default class BlocklyWorkspaceManager {
  constructor(codingLanguage, languageManager, options = {}) {
    this.codingLanguage = codingLanguage;
    this.languageManager = languageManager;
    this.options = {
      readonly: false,
      blocklyCategories: null,
      blocklyPackages: [],
      blocklyWorkspaceState: null,
      initialCode: '',
      blocklyContext: {},
      onCodeChange: () => { },
      resizeActionHandler: () => { },
      ...options,
    };
    this.options.blocklyPackages = Array.isArray(this.options.blocklyPackages)
      ? this.options.blocklyPackages
      : [];

    this.workspace = null;
    this.parentElement = null;
    this.blocklyDiv = null;
    this.resizeObserver = null;
  }

  /**
   * Injects Blockly and wires listeners.
   * @param {HTMLElement|null} blocklyDiv Workspace container.
   * @param {HTMLElement|null} parentElement Host container.
   * @param {Blockly.Theme} theme Workspace theme.
   */
  mount(blocklyDiv, parentElement, theme) {
    if (!blocklyDiv) {
      return;
    }

    const Blockly = getBlocklyRuntime();
    this.languageManager.registerBlocks(Blockly);

    this.blocklyDiv = blocklyDiv;
    this.parentElement = parentElement;

    const toolbox = this.languageManager.buildToolbox(
      this.options.blocklyCategories,
      this.options.blocklyContext,
    );

    this.workspace = Blockly.inject(this.blocklyDiv, {
      toolbox,
      theme,
      readOnly: this.options.readonly,
      move: {
        scrollbars: true,
        drag: true,
        wheel: true,
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2,
      },
      trashcan: true,
    });

    this._loadInitialWorkspaceState(Blockly);
    this._selectInitialToolboxCategory();

    this.workspace.addChangeListener((event) => {
      if (event.isUiEvent) {
        return;
      }

      this.options.onCodeChange(this.getCode());
    });

    this._attachResizeObserver();
  }

  /**
   * Generates current source code from blocks.
   * @returns {string} Generated source code.
   */
  getCode() {
    return this.languageManager.generateCode(this.workspace);
  }

  /**
   * Returns a serializable snapshot of the current workspace state.
   * @returns {object|null} Workspace state object, or null if unavailable.
   */
  getWorkspaceState() {
    if (!this.workspace) {
      return null;
    }

    try {
      const Blockly = getBlocklyRuntime();
      return Blockly.serialization?.workspaces?.save?.(this.workspace) ?? null;
    }
    catch {
      return null;
    }
  }

  /**
   * Updates workspace theme.
   * @param {Blockly.Theme} theme Workspace theme.
   */
  setTheme(theme) {
    if (!this.workspace) {
      return;
    }

    this.workspace.setTheme(theme);
  }

  /** Resizes SVG workspace. */
  resize() {
    if (!this.workspace) {
      return;
    }

    const Blockly = getBlocklyRuntime();
    Blockly.svgResize(this.workspace);
  }

  /** Focuses the Blockly workspace container for keyboard interaction. */
  focus() {
    if (!this.blocklyDiv) {
      return;
    }

    if (!this.blocklyDiv.hasAttribute('tabindex')) {
      this.blocklyDiv.tabIndex = 0;
    }

    this.blocklyDiv.focus();
  }

  /** Disposes observers and workspace instance. */
  destroy() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.workspace) {
      this.workspace.dispose();
      this.workspace = null;
    }

    this.parentElement = null;
    this.blocklyDiv = null;
  }

  _attachResizeObserver() {
    if (!this.parentElement || !window.ResizeObserver) {
      return;
    }

    this.resizeObserver?.disconnect();

    let lastCall = 0;
    this.resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        return;
      }

      const now = performance.now();
      if (now - lastCall < 400) {
        return;
      }

      lastCall = now;
      this.resize();
      this.options.resizeActionHandler();
    });
    this.resizeObserver.observe(this.parentElement);
  }

  _loadInitialWorkspaceState(Blockly) {
    const rawState = this.options.blocklyWorkspaceState;
    const parsedState = this._parseWorkspaceState(rawState);
    const shouldUseFallback = !parsedState || this._isEmptyWorkspaceState(parsedState);
    const fallbackState = shouldUseFallback
      ? this.languageManager.createWorkspaceStateFromCode?.(this.options.initialCode)
      : null;
    const state = fallbackState || parsedState;

    if (!state) {
      return;
    }

    try {
      Blockly.serialization?.workspaces?.load?.(state, this.workspace);
      this.options.onCodeChange(this.getCode());
    }
    catch {
      // Ignore malformed author-provided starter blocks and leave an empty workspace.
    }
  }

  _parseWorkspaceState(rawState) {
    if (!rawState) {
      return null;
    }

    try {
      return typeof rawState === 'string' ? JSON.parse(rawState) : rawState;
    }
    catch {
      return null;
    }
  }

  _isEmptyWorkspaceState(state) {
    const blocks = state?.blocks?.blocks;
    return !Array.isArray(blocks) || blocks.length === 0;
  }

  _selectInitialToolboxCategory() {
    const toolbox = this.workspace?.getToolbox?.();
    toolbox?.clearSelection?.();
  }
}
