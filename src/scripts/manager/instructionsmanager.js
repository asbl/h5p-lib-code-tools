/**
 * Manages the read-only instructions panel shown above the coding workspace.
 */
export default class InstructionsManager {
  /**
   * @param {number|string} contentId - H5P content id used to resolve media paths.
   * @param {string} instructions - Markdown instructions text.
   * @param {object|null} instructionsImage - Optional H5P image descriptor.
   * @param {object} pageManager - Reserved for compatibility with existing setup.
   * @param {object} buttonManager - Reserved for compatibility with existing setup.
   * @param {object} l10n - Localization object or proxy.
   */
  constructor(
    contentId,
    instructions,
    instructionsImage,
    pageManager,
    buttonManager,
    l10n,
  ) {
    this.instructions = instructions || '';
    this.instructionsImage = instructionsImage || null;
    this.pageManager = pageManager;
    this.buttonManager = buttonManager;
    this.contentId = contentId;
    this.l10n = l10n;
  }

  /**
   * Hook kept for compatibility with the manager lifecycle.
   * @returns {Promise<void>} Resolves immediately.
   */
  async setupInstructions() { }

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

    const wrapper = document.createElement('section');
    wrapper.classList.add('instructions-panel');

    wrapper.appendChild(this.createPanelBody());

    return wrapper;
  }

  /**
   * Creates the inner instructions layout.
   * @returns {HTMLDivElement} Panel body element.
   */
  createPanelBody() {
    const body = document.createElement('div');
    body.classList.add('instructions-panel__body');

    body.append(this.createMarkdownBlock());

    if (this.instructionsImage?.path) {
      body.classList.add('instructions-panel__body--with-media');
      body.append(this.createMediaFigure());
    }

    return body;
  }

  /**
   * Creates the rendered markdown block.
   * @returns {HTMLElement} Rendered markdown wrapper.
   */
  createMarkdownBlock() {
    const markdownDiv = new H5P.Markdown(this.instructions).getMarkdownDiv();
    markdownDiv.classList.add('instructions-panel__markdown');

    return markdownDiv;
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
