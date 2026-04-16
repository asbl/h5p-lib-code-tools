/**
 * Manages the read-only instructions panel shown above the coding workspace.
 */
export default class InstructionsManager {
  /**
   * @param {number|string} contentId H5P content id used to resolve media paths.
   * @param {string} instructions Markdown instructions text.
   * @param {object|null} instructionsImage Optional H5P image descriptor.
   * @param {object} pageManager Reserved for compatibility with existing setup.
   * @param {object} buttonManager Reserved for compatibility with existing setup.
   * @param {object} l10n Localization object or proxy.
   * @param {string} codeMirrorCdnUrl Optional external CodeMirror runtime URL.
   * @param {string} markdownCdnUrl Optional external markdown runtime URL.
   */
  constructor(
    contentId,
    instructions,
    instructionsImage,
    pageManager,
    buttonManager,
    l10n,
    codeMirrorCdnUrl = '',
    markdownCdnUrl = '',
  ) {
    this.instructions = instructions || '';
    this.instructionsImage = instructionsImage || null;
    this.pageManager = pageManager;
    this.buttonManager = buttonManager;
    this.contentId = contentId;
    this.l10n = l10n;
    this.codeMirrorCdnUrl = String(codeMirrorCdnUrl || '').trim();
    this.markdownCdnUrl = String(markdownCdnUrl || '').trim();
    this.markdownDiv = null;
    this.wrapper = null;
    this.body = null;
    this.markdownHost = null;
  }

  /**
   * Hook kept for compatibility with the manager lifecycle.
   * @returns {Promise<void>} Resolves immediately.
   */
  async setupInstructions() {
    if (!this.hasInstructions()) {
      this.markdownDiv = null;
      this.renderMarkdownBlock();
      return;
    }

    this.markdownDiv = await new H5P.Markdown(this.instructions, {
      codeMirrorCdnUrl: this.codeMirrorCdnUrl,
      markdownCdnUrl: this.markdownCdnUrl,
    }).getMarkdownDiv();
    this.markdownDiv.classList.add('instructions-panel__markdown');
    this.renderMarkdownBlock();
  }

  /**
   * Indicates whether the current content has instructions to render.
   * @returns {boolean} True if a non-empty instructions string is available.
   */
  hasInstructions() {
    return this.instructions !== '';
  }

  /**
   * Builds the rendered instructions panel.
   * @returns {HTMLElement|null} Instructions panel or null when no content exists.
   */
  getDOM() {
    if (!this.hasInstructions()) {
      return null;
    }

    if (this.wrapper) {
      return this.wrapper;
    }

    this.wrapper = document.createElement('section');
    this.wrapper.classList.add('instructions-panel');

    this.wrapper.appendChild(this.createPanelBody());

    return this.wrapper;
  }

  /**
   * Creates the inner instructions layout.
   * @returns {HTMLDivElement} Panel body element.
   */
  createPanelBody() {
    if (this.body) {
      return this.body;
    }

    this.body = document.createElement('div');
    this.body.classList.add('instructions-panel__body');

    this.body.append(this.createMarkdownBlock());

    if (this.instructionsImage?.path) {
      this.body.classList.add('instructions-panel__body--with-media');
      this.body.append(this.createMediaFigure());
    }

    return this.body;
  }

  /**
   * Creates the rendered markdown block.
   * @returns {HTMLElement} Rendered markdown wrapper.
   */
  createMarkdownBlock() {
    if (!this.markdownHost) {
      this.markdownHost = document.createElement('div');
      this.markdownHost.classList.add('instructions-panel__markdown');
    }

    this.renderMarkdownBlock();

    return this.markdownHost;
  }

  /**
   * Synchronizes the rendered markdown content into the stable host element.
   * @returns {void}
   */
  renderMarkdownBlock() {
    if (!this.markdownHost) {
      return;
    }

    this.markdownHost.replaceChildren();

    if (this.markdownDiv) {
      this.markdownHost.replaceWith(this.markdownDiv);
      this.markdownHost = this.markdownDiv;
      return;
    }
  }

  /**
   * Creates the optional image figure shown next to the instructions.
   * @returns {HTMLElement} Figure containing the resolved instructions image.
   */
  createMediaFigure() {
    const figure = document.createElement('figure');
    figure.classList.add('instructions-panel__media');

    const img = document.createElement('img');
    img.className = 'description-image instructions-panel__image';
    img.src = H5P.getPath(this.instructionsImage.path, this.contentId);
    img.alt = this.getImageAltText();
    figure.append(img);

    return figure;
  }

  /**
   * Returns the best available alt text for the instructions image.
   * @returns {string} Alt text for the rendered image.
   */
  getImageAltText() {
    return this.instructionsImage?.copyright?.title || '';
  }

  /**
   * Returns the CSS modifier class used by the outer code container.
   * @returns {string} Container modifier class.
   */
  getHTMLClasses() {
    return this.hasInstructions()
      ? ' has_instructions'
      : ' not_has_instructions';
  }
}
