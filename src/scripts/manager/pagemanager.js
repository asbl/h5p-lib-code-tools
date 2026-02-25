export default class PageManager {
  constructor(containerHTML, l10n, resizeActionHandler, empty = false) {
    this.pages = [];
    this.containerHTML = containerHTML;
    this.empty = empty;
    this.parent = this.getParent();
    this.pageChangeHandlers = [];
    this.resizeActionHandler = resizeActionHandler;
  }

  getParent() {
    if (!this.parent) {
      this.parent = document.createElement('div');
      this.parent.className = 'pages-wrapper';
    }
    return this.parent;
  }

  /**
   * Returns default page structure
   * @returns {[{name: string, content: string, additionalClass: string, visible: boolean, active: boolean},{name: string, content: string, additionalClass: string, visible: boolean, active: boolean}]|*[]} An array with default sites
   */
  getDefaultPages() {
    if (!this.empty) {
      return [
        {
          name: 'code',
          content: '',
          additionalClass: 'code',
          visible: true,
          active: true,
        },
      ];
    }
    else {
      return [];
    }
  }

  setContent(pageName, content) {
    const page = this.getPage(pageName);
    if (page) {
      page.innerHTML = content;
    }
    else {
      const div = document.createElement('div');
      div.innerHTML = content;
      this.appendChild(pageName, div);
    }
  }

  addContent(pageName, content) {
    const page = this.getPage(pageName);
    if (page) {
      page.innerHTML += content;
    }
    else {
      const div = document.createElement('div');
      div.innerHTML = content;
      this.appendChild(pageName, div);
    }
  }

  appendChild(pageName, element) {
    if (!pageName) {
      throw new Error('pageName is required');
    }
    if (!element) {
      throw new Error('element is required');
    }

    const pageObj = this.getPageObj(pageName);

    // Append the element to the page DOM
    pageObj.dom.appendChild(element);

    // Optional: trigger resize handler if needed
    if (typeof this.resizeActionHandler === 'function') {
      this.resizeActionHandler();
    }
  }
  /**
   * Add a Page
   * @param {string} pageName The name of page
   * @param {string|Node} content The content as string
   * @param {string} additionalClass The html-class as string
   * @param {boolean} front Should the page added before other pages?
   * @param {boolean} visible is page visible
   * @returns {HTMLDivElement} div Element with the page-content
   */
  addPage(pageName, content, additionalClass, front = false, visible = true) {
    const pageDiv = document.createElement('div');
    pageDiv.classList.add('page', `page-${pageName}`);
    if (additionalClass) pageDiv.classList.add(additionalClass);

    // Add content
    if (typeof content === 'string') {
      pageDiv.textContent = content;
    }
    else if (content instanceof Node) {
      pageDiv.appendChild(content);
    }
    else {
      console.warn('Unsupported content type for page:', pageName);
    }

    if (visible === false) {
      pageDiv.style.display = 'none';
    }

    // Hide by default
    pageDiv.style.display = 'none';
    // Insert into array pages
    if (!front) {
      this.pages.push({ name: pageName, dom: pageDiv, active: false });
    }
    else {
      this.pages.unshift({ name: pageName, dom: pageDiv, active: false });
    }
    return pageDiv;
  }

  /**
   * Shows the requested page and hides others
   * @param {string} pageName The name of the page as string
   */
  showPage(pageName) {
    const exists = this.pages.some((page) => page.name === pageName);
    if (!exists) return;

    this.pages.forEach((el) => {
      if (!el.dom) return; // fallback
      if (el.name === pageName) {
        el.dom.style.display = 'block';
        el.active = true;
      }
      else {
        el.dom.style.display = 'none';
        el.active = false;
      }
      this.pageChangeHandlers.forEach((el) => el());

    });
    this.resizeActionHandler();
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
      throw new Error('pageName is required');
    }

    const page = this.pages.find((p) => p.name === pageName);

    if (page)
      return page.dom;
    else
      console.warn('page not found', pageName);
    return null;
  }

  /**
   * Returns a page by its name
   * @param {string} pageName The name of the page
   * @returns {HTMLElement|null} The page DOM element or null if not found
   */
  getPageObj(pageName) {

    if (!pageName) {
      throw new Error('pageName is required');
    }
    return this.pages.find((p) => p.name === pageName);
  }

  getPageConfig(pageName) {
    if (!pageName) {
      throw new Error('pageName is required');
    }
    return this.pages.find((p) => p.name === pageName);
  }

  pageIsActive(pageName) {
    const page = this.getPageConfig(pageName);
    return !!page.active;
  }

  /**
   * Returns the parent wrapper with all pages rendered
   * @returns {HTMLElement} The DOM for all pages
   */
  getDOM() {
    const parent = this.getParent();

    // Clear parent first
    parent.innerHTML = '';

    // Append all pages from the internal array
    this.pages.forEach(({ dom }) => parent.appendChild(dom));
    return parent;
  }

  isEmpty(pageName) {
    const page = this.getPageConfig(pageName);
    if (!page || !page.dom) {
      return true;
    }
    return page.dom.childNodes.length === 0 || page.dom.innerHTML.trim() === '';
  }

}
