export default class Observermanager {
  constructor(pageManager, buttonManager) {
    this.pageManager = pageManager;
    this.buttonManager = buttonManager;
  }

  setupObservers() {
    const pageCode = this.pageManager.getPage("code");
    const pageObserver = new MutationObserver(() => {
      const btn = this.buttonManager.getButton("show_code");
      if (!btn) return;

      if (!this.pageManager.pageIsActive("code")) {
        this.buttonManager.showButton("show_code");
      } else {
        this.buttonManager.hideButton("show_code");
      }
    });
    pageObserver.observe(pageCode, {
      attributes: true,
      attributeFilter: ["style"],
    });
  }
}
