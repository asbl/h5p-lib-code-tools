/**
 * Creates and attaches the shared canvas surface used by visual runtimes.
 *
 * Language runtimes should use this manager when they need a visible canvas
 * page. It deliberately knows nothing about Python, Java, p5, SDL, or TeaVM:
 * subclasses or owning runtimes can override `createCanvasClasses` or attach
 * additional runtime-specific nodes after `setup`.
 */
export default class CanvasRuntimeManager {
  /**
   * @param {object} host CodeContainer, CodeTester, or CanvasManager-like host.
   * @param {object|null} [runner] Optional language runner.
   */
  constructor(host, runner = null) {
    this.host = host;
    this.runner = runner;
    this.canvasWrapper = null;
    this.canvasDiv = null;
    this.loadingOverlay = null;
    this.loadingLabel = null;
  }

  /**
   * Returns the CSS classes for the canvas mount node.
   * @param {string} [type] Canvas type.
   * @returns {string[]} CSS class list.
   */
  createCanvasClasses(type = 'canvas') {
    const classes = ['canvas-content'];
    if (type) {
      classes.push(`${type}-content`);
    }
    return classes;
  }

  /**
   * Creates the canvas wrapper and mount node.
   * @param {string} [type] Canvas type.
   * @param {string|number} [identifier] Stable-ish identifier fragment.
   * @returns {[HTMLElement, HTMLElement]} Wrapper and mount node.
   */
  setup(type = 'canvas', identifier = 'default') {
    const wrapperId = `canvas-wrapper_${type}_${identifier}_${H5P.createUUID()}`;
    const canvasId = `canvas_div_${type}_${identifier}_${H5P.createUUID()}`;

    this.canvasWrapper = document.createElement('div');
    this.canvasWrapper.id = wrapperId;
    this.canvasWrapper.classList.add('canvas-wrapper');

    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.classList.add('canvas-loading');
    this.loadingOverlay.hidden = true;
    this.loadingOverlay.style.display = 'none';

    const loadingSpinner = document.createElement('span');
    loadingSpinner.classList.add('canvas-loading__spinner');
    loadingSpinner.setAttribute('aria-hidden', 'true');
    this.loadingOverlay.appendChild(loadingSpinner);

    this.loadingLabel = document.createElement('span');
    this.loadingLabel.classList.add('canvas-loading__label');
    this.loadingOverlay.appendChild(this.loadingLabel);

    this.canvasWrapper.appendChild(this.loadingOverlay);

    this.canvasDiv = document.createElement('div');
    this.canvasDiv.id = canvasId;
    this.canvasDiv.classList.add(...this.createCanvasClasses(type));
    this.canvasWrapper.appendChild(this.canvasDiv);

    return [this.canvasWrapper, this.canvasDiv];
  }

  getWrapper() {
    return this.canvasWrapper;
  }

  getDiv() {
    return this.canvasDiv;
  }

  /**
   * Attaches the canvas to the host and shows the canvas page when available.
   * @param {string} [type] Canvas type.
   * @param {string|number} [identifier] Canvas identifier.
   * @returns {HTMLElement|null} Canvas mount node.
   */
  attachCanvas(type = 'canvas', identifier = 'default') {
    if (!this.canvasWrapper || !this.canvasDiv) {
      this.setup(type, identifier);
    }

    if (typeof this.host?.addCanvas === 'function') {
      this.host.addCanvas(this.canvasWrapper, type, identifier);
    }

    if (typeof this.host?.showCanvas === 'function') {
      this.host.showCanvas();
    }

    if (typeof this.runner?.addCanvas === 'function') {
      this.runner.addCanvas(this.getWrapper(), this.getDiv(), this);
    }

    return this.getDiv();
  }

  /**
   * Updates the loading overlay.
   * @param {boolean} isLoading Loading state.
   * @param {string} [message] Loading label.
   * @returns {void}
   */
  setLoading(isLoading, message = '') {
    if (!this.loadingOverlay) {
      return;
    }

    this.loadingOverlay.hidden = !isLoading;
    this.loadingOverlay.style.display = isLoading ? 'flex' : 'none';
    this.loadingOverlay.classList.toggle('is-visible', isLoading);

    if (this.loadingLabel) {
      this.loadingLabel.textContent = message;
    }
  }

  /**
   * Removes the canvas and clears local references.
   * @returns {void}
   */
  removeCanvas() {
    if (this.host && typeof this.host.removeCanvas === 'function') {
      this.host.removeCanvas(this.canvasDiv);
    }

    this.setLoading(false);
    this.canvasWrapper = null;
    this.canvasDiv = null;
    this.loadingOverlay = null;
    this.loadingLabel = null;
  }
}

