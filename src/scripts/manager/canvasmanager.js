export default class CanvasManager {
  constructor(hasVisibleCanvas, pageManager, buttonManager) {
    this._hasVisibleCanvas = hasVisibleCanvas;
    this.pageManager = pageManager;
    this.buttonManager = buttonManager;
    this.hasCanvas = false;
    this.canvasWrapper = null;
    this.canvasDiv = null;
  }

  removeCanvas() {
    if (!this.canvasWrapper) return;
    this.canvasWrapper.innerHTML = '';
  }
  /**
   *
   * @returns True if canvas page exists and canvas is not empty.
   */
  hasVisibleCanvas() {
    if (this.hasCanvas == false) return;
    const canvasElements = this.pageManager
      .getPage('canvas')
      .querySelector('.canvas-wrapper');
    if (canvasElements) {
      // True, if There is a canvas page
      for (let item of [...canvasElements.children]) {
        if (item.innerHTML !== '') {
          return true;
        }
      }
      return false;
    }
  }

  /**
   * Add Canvas
   * @param canvasWrapper
   */
  addCanvas(canvasWrapper) {
    this.hasCanvas = true;
    this.canvasWrapper = canvasWrapper;
    this.pageManager.appendChild('canvas', canvasWrapper);

  }

  /**
   * Show canvas page
   */
  showCanvas() {
    if (this.hasCanvas) {
      this.pageManager.showPage('canvas');
    }
  }
}
