export default class PageManager {
  constructor(containerHTML, l10n, resizeAction, empty = false) {
    this.pages = [];
    this.containerHTML = containerHTML;
    this.empty = empty;
    this.parent = this.getParent();
    this.pageChangeHandlers = [];
    this.resizeAction = resizeAction;
  }

  getParent() {
    if (!this.parent) {
      this.parent = document.createElement("div");
      this.parent.className = "pages-wrapper";
    }
    return this.parent;
  }

  /**
   * Returns default page structure
   */
  getDefaultPages() {
    if (!this.empty) {
      return [
        {
          name: "code",
          content: "",
          additionalClass: "code",
          visible: true,
          active: true,
        },
        {
          name: "canvas",
          content: "",
          additionalClass: "canvas",
          visible: false,
          active: false,
        },
      ];
    } else {
      return [];
    }
  }

  /**
   * Add a Page
   * @param {string} pageName The name of page
   * @param {string} content The content as string
   * @param {string} additionalClass The html-class as string
   * @param {boolean} front Should the page added before other pages?
   * @returns {HTMLCollection} div Element with the page-content
   */
  addPage(pageName, content, additionalClass, front = false, visible = true) {
    const pageDiv = document.createElement("div");
    pageDiv.classList.add("page", `page-${pageName}`);
    if (additionalClass) pageDiv.classList.add(additionalClass);

    // Add content
    if (typeof content === "string") {
      pageDiv.textContent = content;
    } else if (content instanceof Node) {
      pageDiv.appendChild(content);
    } else {
      console.warn("Unsupported content type for page:", pageName);
    }

    if (visible === false) {
      pageDiv.style.display = "none";
    }

    // Hide by default
    pageDiv.style.display = "none";
    // Insert into array
    if (!front) {
      this.pages.push({ name: pageName, dom: pageDiv, active: false });
    } else {
      this.pages.unshift({ name: pageName, dom: pageDiv, active: false });
    }
    return pageDiv;
  }

  /**
   * Shows the requested page and hides others
   */
  showPage(pageName) {
    const exists = this.pages.some((page) => page.name === pageName);
    if (!exists) return;

    this.pages.forEach((el) => {
      if (!el.dom) return; // fallback
      if (el.name === pageName) {
        el.dom.style.display = "block";
        el.active = true;
      } else {
        el.dom.style.display = "none";
        el.active = false;
      }
      this.pageChangeHandlers.forEach((el) => el());
      this.resizeAction();
    });

    // Trigger resize event once after updating pages
    window.dispatchEvent(new Event("resize"));
  }

  async setupPages() {
    this.getDefaultPages().forEach((el) => {
      this.addPage(el.name, el.content, el.additionalClass, false, el.visible);
    });
  }

  /**
   * Returns a page by its name
   * @param {string} pageName The name of the page
   * @returns {HTMLElement|null} The page DOM element or null if not found
   */
  getPage(pageName) {
    if (!pageName) {
      throw new Error("pageName is required");
    }

    const page = this.pages.find((p) => p.name === pageName);

    return page && page.dom ? page.dom : null;
  }

  getPageConfig(pageName) {
    if (!pageName) {
      throw new Error("pageName is required");
    }

    const page = this.pages.find((p) => p.name === pageName);

    return page;
  }

  pageIsActive(pageName) {
    const page = this.getPageConfig(pageName);
    if (page.active) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Returns the parent wrapper with all pages rendered
   * @returns {HTMLElement}
   */
  getDOM() {
    const parent = this.getParent();

    // Clear parent first
    parent.innerHTML = "";

    // Append all pages from the internal array
    this.pages.forEach(({ dom }) => parent.appendChild(dom));
    return parent;
  }
}
