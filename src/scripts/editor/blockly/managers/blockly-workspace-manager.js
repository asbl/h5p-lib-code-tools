import * as Blockly from 'blockly';
import {
  buildFilteredToolbox,
  buildPackageToolbox,
} from '../blockly-language-packs.js';

/**
 * Owns Blockly workspace lifecycle and resize behavior.
 */
export default class BlocklyWorkspaceManager {
  constructor(codingLanguage, languagePack, options = {}) {
    this.codingLanguage = codingLanguage;
    this.languagePack = languagePack;
    this.options = {
      readonly: false,
      blocklyCategories: null,
      blocklyPackages: [],
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

    this.blocklyDiv = blocklyDiv;
    this.parentElement = parentElement;

    const packageToolbox = buildPackageToolbox(
      this.languagePack.toolbox,
      this.codingLanguage,
      this.options.blocklyPackages,
    );

    const toolbox = buildFilteredToolbox(
      packageToolbox,
      this.options.blocklyCategories,
      this.languagePack.categoryFieldMap ?? {},
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
    if (!this.workspace) {
      return '';
    }

    return this.languagePack.generate(this.workspace) || '';
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

    Blockly.svgResize(this.workspace);
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
}
