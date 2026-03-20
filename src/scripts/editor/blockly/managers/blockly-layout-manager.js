/**
 * Builds and manages Blockly editor DOM layout.
 */
export default class BlocklyLayoutManager {
  constructor(parentElement) {
    this.parentElement = parentElement;
    this.blocklyDiv = null;
    this.codePreviewEl = null;
  }

  /**
   * Initializes the editor layout for the selected mode.
   * @param {'blocks'|'both'} editorMode Editor mode.
   * @param {object} callbacks Layout callbacks.
   * @param {function} callbacks.onShowCode Called when code panel is shown.
   * @param {function} callbacks.onShowBlocks Called when blocks panel is shown.
   * @returns {{ blocklyDiv: HTMLElement|null, codePreviewEl: HTMLElement|null }} Layout nodes.
   */
  initialize(editorMode, callbacks = {}) {
    if (!this.parentElement) {
      return { blocklyDiv: null, codePreviewEl: null };
    }

    this.parentElement.innerHTML = '';
    this.parentElement.classList.add('blockly-editor-host');

    if (editorMode === 'both') {
      this._buildBothLayout(callbacks);
    }
    else {
      this._buildBlocksOnlyLayout();
    }

    return {
      blocklyDiv: this.blocklyDiv,
      codePreviewEl: this.codePreviewEl,
    };
  }

  /**
   * Updates the read-only code preview content.
   * @param {string} text Preview content.
   */
  setCodePreview(text) {
    if (!this.codePreviewEl) {
      return;
    }

    this.codePreviewEl.textContent = text;
  }

  /**
   * Resizes the workspace container to a fixed number of lines.
   * @param {number} lines Number of lines.
   * @param {number} lineHeightPx Height per line in pixels.
   */
  setFixedLines(lines, lineHeightPx = 18) {
    if (!this.blocklyDiv) {
      return;
    }

    const px = Math.max(lines, 5) * lineHeightPx + 16;
    this.blocklyDiv.style.height = `${px}px`;
  }

  /** Restores dynamic container height. */
  restoreDynamicHeight() {
    if (!this.blocklyDiv) {
      return;
    }

    this.blocklyDiv.style.height = '';
  }

  /**
   * Displays a fallback message when a language pack is unsupported.
   * @param {string} codingLanguage Language key.
   */
  showUnsupportedMessage(codingLanguage) {
    if (!this.parentElement || !this.blocklyDiv) {
      return;
    }

    const msg = document.createElement('div');
    msg.className = 'blockly-unsupported-msg';
    msg.textContent =
      `Blockly-Blöcke sind für die Sprache "${codingLanguage}" noch nicht verfügbar. ` +
      'Bitte wechsle in den Code-Modus.';
    this.parentElement.insertBefore(msg, this.blocklyDiv);
  }

  /** Clears editor DOM content and layout references. */
  destroy() {
    if (this.parentElement) {
      this.parentElement.innerHTML = '';
    }

    this.blocklyDiv = null;
    this.codePreviewEl = null;
  }

  _buildBlocksOnlyLayout() {
    const blocklyDiv = document.createElement('div');
    blocklyDiv.className = 'blockly-workspace blockly-workspace--blocks-only';
    this.parentElement.appendChild(blocklyDiv);

    this.blocklyDiv = blocklyDiv;
    this.codePreviewEl = null;
  }

  _buildBothLayout(callbacks) {
    const onShowCode = typeof callbacks.onShowCode === 'function'
      ? callbacks.onShowCode
      : () => { };
    const onShowBlocks = typeof callbacks.onShowBlocks === 'function'
      ? callbacks.onShowBlocks
      : () => { };

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

    const blocklyDiv = document.createElement('div');
    blocklyDiv.className = 'blockly-workspace blockly-workspace--both';
    this.parentElement.appendChild(blocklyDiv);

    const preview = document.createElement('pre');
    preview.className = 'blockly-code-preview';
    preview.hidden = true;
    preview.setAttribute('aria-label', 'Generierter Code (nur lesen)');
    this.parentElement.appendChild(preview);

    [blocksBtn, codeBtn].forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = btn.dataset.panel;
        const showBlocks = panel === 'blocks';

        blocksBtn.classList.toggle('is-active', showBlocks);
        codeBtn.classList.toggle('is-active', !showBlocks);

        blocklyDiv.hidden = !showBlocks;
        preview.hidden = showBlocks;

        if (showBlocks) {
          onShowBlocks();
        }
        else {
          onShowCode();
        }
      });
    });

    this.blocklyDiv = blocklyDiv;
    this.codePreviewEl = preview;
  }
}
