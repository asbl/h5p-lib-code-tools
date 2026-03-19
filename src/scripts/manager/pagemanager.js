export default class PageManager {
  constructor(containerHTML, l10n, resizeActionHandler, empty = false) {
    this.pages = [];
    this.containerHTML = containerHTML;
    this.empty = empty;
    this.parent = this.getParent();
    this.pageChangeHandlers = [];
    this.resizeActionHandler = resizeActionHandler;
    this.activePageName = null;
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

  /**
   * Sets the content of a page. The content can be provided either as an HTML
   * string or as a DocumentFragment.
   * If the page already exists, its content will be replaced. If it does not
   * exist, a new container element will be created and appended.
   * @param {string} pageName - The identifier of the page.
   * @param {string | DocumentFragment} content - HTML string or DocumentFragment
   *   representing the new page content.
   * @returns {void}
   * @throws {TypeError} If content is neither a string nor a DocumentFragment.
   */
  setContent(pageName, content) {
    const page = this.getPage(pageName);

    const applyContent = (target) => {
      if (typeof content === 'string') {
        target.innerHTML = content;
        return;
      }

      if (content instanceof DocumentFragment) {
        target.replaceChildren(content.cloneNode(true));
        return;
      }

      throw new TypeError(
        'Invalid content: expected a string or DocumentFragment.'
      );
    };

    if (page) {
      applyContent(page);
    }
    else {
      const div = document.createElement('div');
      applyContent(div);
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

    // If page doesn't exist, create it first
    if (!pageObj) {
      this.addPage(pageName, '', '', false, false);
      return this.appendChild(pageName, element); // Recursive call after creation
    }

    // Append the element to the page DOM
    pageObj.dom.appendChild(element);

    // Optional: trigger resize handler if needed
    if (typeof this.resizeActionHandler === 'function') {
      this.resizeActionHandler();
    }
  }

  /**
   * Registers multiple pages in declaration order.
   * @param {object[]} [pageConfigs] - Page definitions.
   * @returns {HTMLDivElement[]} Created page elements.
   */
  addPages(pageConfigs = []) {
    return pageConfigs.map((pageConfig) => this.registerPage(pageConfig));
  }

  /**
   * Registers a page from a configuration object.
   * @param {object} pageConfig - Declarative page definition.
   * @returns {HTMLDivElement} Created page element.
   */
  registerPage(pageConfig = {}) {
    return this.addPage(
      pageConfig.name,
      pageConfig.content,
      pageConfig.additionalClass,
      pageConfig.front,
      pageConfig.visible,
    );
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
    if (!pageName) {
      throw new Error('pageName is required');
    }

    if (this.pages.some((page) => page.name === pageName)) {
      throw new Error(`Page '${pageName}' is already registered.`);
    }

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

    // All pages hidden by default (CSS will control display via .active class)
    // Don't set inline styles to avoid specificity conflicts
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

    this.activePageName = pageName;

    this.pages.forEach((el) => {
      if (!el.dom) return; // fallback
      if (el.name === pageName) {
        el.dom.classList.add('active');
        el.active = true;
      }
      else {
        el.dom.classList.remove('active');
        el.active = false;
      }
    });

    this.pageChangeHandlers.forEach((handler) => handler(pageName));
    this.resizeActionHandler();
  }

  async setupPages() {
    this.addPages(this.getDefaultPages());
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
