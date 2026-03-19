import * as Blockly from 'blockly';
import { getLanguagePack, buildFilteredToolbox } from './blockly-language-packs.js';

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
      ...options,
    };

    this._workspace = null;
    this._resizeObserver = null;
    this._codePreviewEl = null;
    this._toggleBtn = null;
    this._blocklyDiv = null;
    this._previewVisible = false;

    this._languagePack = getLanguagePack(codingLanguage);
    this._createEditor();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /** Returns Blockly-generated source code (always a string). */
  getCode() {
    if (!this._workspace) return '';
    return this._languagePack.generate(this._workspace) || '';
  }

  /**
   * No-op. Blockly blocks cannot be reconstructed from source code.
   * Callers that load saved code will silently keep the current workspace.
   */
  setCode(/* code */) {
    // intentionally empty – see class comment
  }

  /** Updates the Blockly workspace theme. */
  setTheme(theme) {
    if (!this._workspace) return;
    const newTheme = theme === 'dark' ? this._makeDarkTheme() : Blockly.Themes.Zelos;
    this._workspace.setTheme(newTheme);
    this._applyContainerTheme(theme);
  }

  /** Resizes the workspace container to a fixed line-based height. */
  setFixedLines(lines) {
    if (!this._blocklyDiv) return;
    const px = Math.max(lines, 5) * (this.options.lineHeightPx || 18) + 16;
    this._blocklyDiv.style.height = `${px}px`;
    if (this._workspace) Blockly.svgResize(this._workspace);
  }

  /** Restores automatic height after leaving fullscreen. */
  restoreDynamicHeight() {
    if (!this._blocklyDiv) return;
    this._blocklyDiv.style.height = '';
    if (this._workspace) Blockly.svgResize(this._workspace);
  }

  /** Disposes the Blockly workspace and removes all DOM nodes. */
  destroy() {
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    if (this._workspace) {
      this._workspace.dispose();
      this._workspace = null;
    }
    if (this.parentElement) {
      this.parentElement.innerHTML = '';
    }
  }

  // ─── Setup ──────────────────────────────────────────────────────────────────

  _createEditor() {
    if (!this.parentElement) return;

    this.parentElement.innerHTML = '';
    this.parentElement.classList.add('blockly-editor-host');

    const editorMode = this.options.editorMode;

    if (editorMode === 'both') {
      this._buildBothLayout();
    } else {
      this._buildBlocksOnlyLayout();
    }

    this._injectBlockly();
    this._attachResizeObserver();

    if (!this._languagePack.supported) {
      this._showUnsupportedMessage();
    }
  }

  _buildBlocksOnlyLayout() {
    const blocklyDiv = document.createElement('div');
    blocklyDiv.className = 'blockly-workspace blockly-workspace--blocks-only';
    this.parentElement.appendChild(blocklyDiv);
    this._blocklyDiv = blocklyDiv;
  }

  _buildBothLayout() {
    // Toggle bar
    const bar = document.createElement('div');
    bar.className = 'blockly-toggle-bar';

    const blocksBtn = document.createElement('button');
    blocksBtn.type = 'button';
    blocksBtn.className = 'blockly-toggle-btn is-active';
    blocksBtn.textContent = 'Blöcke';
    blocksBtn.dataset.panel = 'blocks';

    const codeBtn = document.createElement('button');
    codeBtn.type = 'button';
    codeBtn.className = 'blockly-toggle-btn';
    codeBtn.textContent = 'Code';
    codeBtn.dataset.panel = 'code';

    bar.appendChild(blocksBtn);
    bar.appendChild(codeBtn);
    this.parentElement.appendChild(bar);

    // Blockly workspace
    const blocklyDiv = document.createElement('div');
    blocklyDiv.className = 'blockly-workspace blockly-workspace--both';
    this.parentElement.appendChild(blocklyDiv);
    this._blocklyDiv = blocklyDiv;

    // Code preview panel
    const preview = document.createElement('pre');
    preview.className = 'blockly-code-preview';
    preview.hidden = true;
    preview.setAttribute('aria-label', 'Generierter Code (nur lesen)');
    this.parentElement.appendChild(preview);
    this._codePreviewEl = preview;

    // Toggle logic
    [blocksBtn, codeBtn].forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = btn.dataset.panel;
        blocksBtn.classList.toggle('is-active', panel === 'blocks');
        codeBtn.classList.toggle('is-active', panel === 'code');
        blocklyDiv.hidden = panel !== 'blocks';
        preview.hidden = panel !== 'code';
        if (panel === 'code') {
          this._refreshCodePreview();
        }
        if (panel === 'blocks' && this._workspace) {
          Blockly.svgResize(this._workspace);
        }
      });
    });
  }

  _injectBlockly() {
    if (!this._blocklyDiv) return;

    const theme = this.options.theme === 'dark'
      ? this._makeDarkTheme()
      : Blockly.Themes.Zelos;

    const toolbox = buildFilteredToolbox(
      this._languagePack.toolbox,
      this.options.blocklyCategories,
      this._languagePack.categoryFieldMap ?? {},
    );

    this._workspace = Blockly.inject(this._blocklyDiv, {
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

    this._workspace.addChangeListener((event) => {
      if (event.isUiEvent) return;
      const code = this.getCode();
      this._refreshCodePreview(code);
      this.options.onChangeCallback(code);
    });

    // The div is freshly inserted into the DOM and has not yet been laid out.
    // Schedule a resize after the browser's first layout pass so Blockly gets
    // the correct canvas dimensions without requiring a manual window resize.
    requestAnimationFrame(() => {
      if (this._workspace) Blockly.svgResize(this._workspace);
    });
  }

  _refreshCodePreview(code) {
    if (!this._codePreviewEl) return;
    const text = code ?? this.getCode();
    this._codePreviewEl.textContent = text;
  }

  _attachResizeObserver() {
    if (!this.parentElement || !window.ResizeObserver) return;
    let lastCall = 0;
    this._resizeObserver = new ResizeObserver(() => {
      const now = performance.now();
      if (now - lastCall < 400) return;
      lastCall = now;
      if (this._workspace) Blockly.svgResize(this._workspace);
      this.options.resizeActionHandler();
    });
    this._resizeObserver.observe(this.parentElement);
  }

  _applyContainerTheme(theme) {
    if (!this.parentElement) return;
    this.parentElement.classList.toggle('blockly-theme-dark', theme === 'dark');
    this.parentElement.classList.toggle('blockly-theme-light', theme !== 'dark');
  }

  _showUnsupportedMessage() {
    const msg = document.createElement('div');
    msg.className = 'blockly-unsupported-msg';
    msg.textContent =
      `Blockly-Blöcke sind für die Sprache "${this.codingLanguage}" noch nicht verfügbar. ` +
      'Bitte wechsle in den Code-Modus.';
    this.parentElement.insertBefore(msg, this._blocklyDiv);
  }

  /** Creates a minimal dark theme for Blockly. */
  _makeDarkTheme() {
    return Blockly.Theme.defineTheme('dark', {
      base: Blockly.Themes.Zelos,
      componentStyles: {
        workspaceBackgroundColour: '#1e1e1e',
        toolboxBackgroundColour: '#2d2d2d',
        toolboxForegroundColour: '#ccc',
        flyoutBackgroundColour: '#252526',
        flyoutForegroundColour: '#ccc',
        insertionMarkerColour: '#fff',
        insertionMarkerOpacity: 0.3,
        scrollbarColour: '#555',
        scrollbarOpacity: 0.7,
      },
    });
  }
}
