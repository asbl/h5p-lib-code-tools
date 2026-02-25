import ButtonManager from './manager/buttonmanager.js';
import CanvasManager from './manager/canvasmanager.js';
import ConsoleManager from './manager/consolemanager.js';
import EditorManager from './manager/editormanager.js';
import InstructionsManager from './manager/instructionsmanager.js';
import Observermanager from './manager/observermanager.js';
import PageManager from './manager/pagemanager.js';
import StateManager from './manager/statemanager.js';
import StorageManager from './manager/storagemanager.js';



/**
 * CodeContainer class
 */
export default class CodeContainer {
  constructor(parent, options) {
    // Localization labels (run button, etc.)
    this.l10n = options.l10n || {};
    // DOM and H5P references
    this.parent = parent;
    this.options = options;
    this.runtimeFactory = options.runtimeFactory || null;
    this.codingLanguage = options.codingLanguage;

    // Editor state flags
    this.evaluation = options.evaluation ?? true;
    this.height = options.height || null;

    // Unique IDs for DOM elements
    this.containerUID = `h5p_code_container_${H5P.createUUID()}`;
    this.editorUID = `h5p_editor_container_${H5P.createUUID()}`;
    this.consoleUID = `h5p_console_${H5P.createUUID()}`;
    this.preCodeUID = `h5p_pre_code_${H5P.createUUID()}`;
    this.postCodeUID = `h5p_post_code_${H5P.createUUID()}`;

    // HTML Elements
    this.containerDiv = null;
    // Set CSS class and ID
    this.parent.classList.add('h5p-cm-editor');
    this.parent.id = H5P.createUUID();

    this.resizeActionHandler = options.resizeActionHandler || (() => { });
  }

  getStateManager(parent, options) {
    if (!this._stateManager) {
      this._stateManager = new StateManager(
      );
    }
    return this._stateManager;
  }

  getPageManager(empty = false) {
    if (!this._pageManager) {
      this._pageManager = new PageManager(
        this.getContainerDiv(),
        this.l10n,
        this.resizeActionHandler,
        empty,
      );
    }
    return this._pageManager;
  }

  getStorageManager(parent, options) {
    if (this._storageManager) {
      return this._storageManager;
    }

    this._storageManager = new StorageManager(
      this
    );

    return this._storageManager;
  }

  getButtonManager(parent, options) {
    const hasButtons = options?.hasButtons ?? true;
    if (this._buttonManager) {
      return this._buttonManager;
    }

    this._buttonManager = new ButtonManager(
      this.getContainerDiv(),
      hasButtons,
      this.l10n,
    );

    return this._buttonManager;
  }

  getInstructionsManager(parent, options) {
    if (this.instructionsManager) {
      return this.instructionsManager;
    }
    this.instructionsManager = new InstructionsManager(
      options.contentId,
      options?.instructions || '',
      options?.instructionsImage || '',
      this.getPageManager(),
      this.getButtonManager(),
      this.l10n,
    );
    return this.instructionsManager;
  }

  getEditorManager(parent, options) {
    if (this._editorManager) {
      return this._editorManager;
    }
    else {
      return new EditorManager(
        options?.code || '',
        this.codingLanguage || 'peudocode',
        options?.preCode || '',
        options?.postCode || '',
        options?.fixedSize ?? true,
        options?.lines || 5,
        this.editorUID,
        this.preCodeUID,
        this.postCodeUID,
        options?.onChangeCallback || (() => { }),
        options.resizeActionHandler,
      );
    }
  }

  getConsoleManager(parent, options) {
    if (!this._consoleManager) {
      this._consoleManager = new ConsoleManager(
        options?.hasConsole || true,
        this.consoleUID,
        options?.consoleType || 'textarea',
      );
    }
    return this._consoleManager;
  }

  getCanvasManager(parent, options) {
    if (!this._canvasManager) {
      this._canvasManager = new CanvasManager(
        options?.hasVisibleCanvas || false,
        this.getPageManager(parent, options),
        this.getButtonManager(parent, options),
      );
    }
    return this._canvasManager;
  }

  getObserverManager() {
    if (!this._observerManager) {
      this._observerManager = new Observermanager();
    }
    return this._observerManager;
  }

  /**
   * Complete setup: editors, pages, buttons, observers
   */
  async setup() {
    this._pageManager = this.getPageManager();
    this._buttonManager = this.getButtonManager(this.parent, this.options);
    this._editorManager = this.getEditorManager(this.parent, this.options);
    this._consoleManager = this.getConsoleManager(this.parent, this.options);
    this._canvasManager = this.getCanvasManager(this.parent, this.options);
    this._stateManager = this.getStateManager();

    // Generate HTML structure

    await this.getPageManager().setupPages();
    await this._buttonManager.setupButtons();

    const dom = this.registerDOM();
    this.parent.appendChild(dom);

    await this._editorManager.setupEditors();
    await this.instructionsManager.setupInstructions();
    this.getPageManager().showPage('code');
  }

  /**
   * Returns container element
   */
  getContainerDiv() {
    if (!this.containerDiv) {
      this.containerDiv = document.createElement('div');
      this.containerDiv.id = this.containerUID;
      this.containerDiv.className = `code_container ${this.getContainerClasses()}`;
      return this.containerDiv;
    }
    return this.containerDiv;
  }

  /**
   * Clears console output
   */
  reset() {
    this.getConsoleManager().clearConsole();
  }

  /**
   * Run code via H5P runtime
   */
  run() {
    const runtime = this.runtimeFactory.create();
    runtime.setup(this);
    runtime.run();
  }

  /**
   * Stops running code
   */
  stop() {
    this.stopSignal = true;
  }

  /**
   * Returns main container DOM element
   */
  getDOM() {
    return this.parent;
  }

  registerDOM() {
    // Navbar + Spinner
    this.containerDiv = this.getContainerDiv();
    this.containerDiv.innerHTML = '';

    const nav = document.createElement('nav');
    nav.className = 'navbar';

    const spinner = document.createElement('div');
    spinner.className = 'spinner';

    const instructionsDIV = document.createElement('div');
    instructionsDIV.className = 'instructions-container';

    // Instructions
    const instructionsDOM = this.getInstructionsManager(
      this.parent,
      this.options,
    ).getDOM();
    if (instructionsDOM) instructionsDIV.appendChild(instructionsDOM);

    this.containerDiv.appendChild(instructionsDIV);

    this.containerDiv.appendChild(nav);

    // Pages-Container
    const pagesDiv = document.createElement('div');
    pagesDiv.className = 'pages';

    const pagesDOM = this.getPageManager().getDOM();

    pagesDiv.appendChild(pagesDOM);

    // Append Editor, Buttons and  Console DOM
    // Editor
    const editorDOM = this.getEditorManager(this.parent, this.options).getDOM();

    const codePage = this.getPageManager().getPage('code');
    if (editorDOM && codePage)
      this.getPageManager().appendChild('code', editorDOM);

    // Buttons
    const buttonsDOM = this.getButtonManager(
      this.parent,
      this.options,
    ).getDOM();
    if (buttonsDOM) nav.appendChild(buttonsDOM);

    // Console
    const consoleDOM = this.getConsoleManager(
      this.parent,
      this.options,
    ).getDOM();
    if (consoleDOM) this.getPageManager().appendChild('code', consoleDOM);

    this.containerDiv.appendChild(pagesDiv);

    this.waitForImages(this.containerDiv).then(() => {
      this.resizeActionHandler();
    });

    // Fallback für nicht-Bild-Layouts
    setTimeout(() => this.resizeActionHandler(), 250);

    // Hauptcontainer zurückgeben
    return this.containerDiv;
  }

  getContainerClasses() {
    return [
      this.getButtonManager(this.parent, this.options).getHTMLClasses(),
      this.getConsoleManager(this.parent, this.options).getHTMLClasses(),
      this.getInstructionsManager(this.parent, this.options).getHTMLClasses(),
    ].join(' ');
  }

  waitForImages(root) {
    const images = root.querySelectorAll('img');

    if (!images.length) {
      return Promise.resolve();
    }

    return Promise.all(
      Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      }),
    );
  }
}
