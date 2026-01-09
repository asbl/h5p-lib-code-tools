export default class CanvasManager {
  constructor(hasVisibleCanvas, pageManager, buttonManager) {
    this.hasVisibleCanvas = hasVisibleCanvas;
    this.pageManager = pageManager;
    this.buttonManager = buttonManager;
    this.hasCanvas = false;
  }

  /**
   * Setup observers for canvas visibility and canvas button
   */
  setupObservers() {
    const canvasButton = this.buttonManager.getButton("canvasButton");
    const canvas = this.pageManager.getPage("canvas");
    if (!canvas || !canvasButton) return;

    this.buttonManager.hideButton("canvas");

    // Observe canvas content changes
    const canvasObserver = new MutationObserver(() => {
      if (this.hasCanvas && this.hasVisibleCanvas()) {
        this.pageManager.showPage("canvas");
        this.buttonManager.showButton("canvas");
      }
    });
    canvasObserver.observe(canvas, { childList: true, subtree: true });

    // Observe canvas page style changes
    const canvasButtonObserver = new MutationObserver(() => {
      const btn = this.buttonManager.getButton("canvasButton");
      if (!btn) return;

      if (this.hasVisibleCanvas() && this.getPageName() !== "canvas") {
        this.buttonManager.showButton("canvas");
      } else {
        this.buttonManager.hideButton("canvas");
      }
    });
    canvasButtonObserver.observe(canvas, {
      attributes: true,
      attributeFilter: ["style"],
    });
  }

  /**
   *
   * @returns True if canvas page exists and canvas is not empty.
   */
  hasVisibleCanvas() {
    if (this.hasCanvas == false) return;
    const canvasElements = this.pageManager
      .getPage("canvas")
      .querySelector(".canvas-wrapper");
    if (canvasElements) {
      // True, if There is a canvas page
      for (let item of [...canvasElements.children]) {
        if (item.innerHTML !== "") {
          return true;
        }
      }
      return false;
    }
  }

  /**
   * Add Canvas
   */
  addCanvas() {
    this.hasCanvas = true;
  }

  /**
   * Show canvas page
   */
  showCanvas() {
    console.log("show canvas", this.hasCanvas);
    if (this.hasCanvas) {
      this.pageManager.showPage("canvas");
    }
  }
}
