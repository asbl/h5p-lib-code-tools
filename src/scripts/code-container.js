// CodeMirrorEditor.js
import ButtonManager from "./manager/buttonmanager.js";
import CanvasManager from "./manager/canvasmanager.js";
import ConsoleManager from "./manager/consolemanager.js";
import EditorManager from "./manager/editormanager.js";
import InstructionsManager from "./manager/instructionsmanager.js";
import Observermanager from "./manager/observermanager.js";
import PageManager from "./manager/pagemanager.js";

/**
 * CodeMirrorEditor class
 * This is an Advanced CodeMirror Widget with multiple Pages
 */
export default class CodeContainer {
  constructor(parent, options) {
    // Localization labels (run button, etc.)
    this.l10n = options.l10n || {};

    // DOM and H5P references
    this.parent = parent;
    this.options = options;
    this.runtimeFactory = options.runtimeFactory || null;

    // Editor state flags
    this.manualSetup = options.manualSetup || false;
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
    this.parent.classList.add("h5p-cm-editor");
    this.parent.id = H5P.createUUID();

    this.resizeAction = options.resizeAction || (() => {});
  }

  getPageManager(parent, options, empty = false) {
    if (!this.pageManager) {
      this.pageManager = new PageManager(
        this.getContainerDiv(),
        this.l10n,
        this.resizeAction,
        empty,
      );
    }
    return this.pageManager;
  }

  getButtonManager(parent, options) {
    const hasButtons = options?.hasButtons ?? true;
    if (this.buttonManager) {
      return this.buttonManager;
    }

    this.buttonManager = new ButtonManager(
      this.getContainerDiv(),
      hasButtons,
      this.l10n,
      this.handleButtonAction.bind(this),
    );

    return this.buttonManager;
  }

  getInstructionsManager(parent, options) {
    if (this.instructionsManager) {
      return this.instructionsManager;
    }
    this.instructionsManager = new InstructionsManager(
      options.contentId,
      options?.instructions || "",
      options?.instructionsImage || "",
      this.pageManager,
      this.buttonManager,
      this.l10n,
    );
    return this.instructionsManager;
  }

  getEditorManager(parent, options) {
    if (this.editorManager) {
      return this.editorManager;
    } else {
      return new EditorManager(
        options?.code || "",
        options?.preCode || "",
        options?.postCode || "",
        options?.fixedSize ?? true,
        options?.lines || 5,
        this.editorUID,
        this.preCodeUID,
        this.postCodeUID,
        options?.onChangeCallback || (() => {}),
      );
    }
  }

  getConsoleManager(parent, options) {
    if (!this.consoleManager) {
      this.consoleManager = new ConsoleManager(
        options?.hasConsole || true,
        this.consoleUID,
        options?.consoleType || "textarea",
      );
    }
    return this.consoleManager;
  }

  getCanvasManager(parent, options) {
    return new CanvasManager(
      options?.hasVisibleCanvas || false,
      this.getPageManager(parent, options),
      this.getButtonManager(parent, options),
    );
  }

  getObersverManager(parent, options) {
    return new Observermanager(
      this.getPageManager(parent, options),
      this.getButtonManager(parent, options),
    );
  }

  /**
   * Complete setup: editors, pages, buttons, observers
   */
  async setup() {
    this.pageManager = this.getPageManager(this.parent, this.options);
    this.buttonManager = this.getButtonManager(this.parent, this.options);
    this.editorManager = this.getEditorManager(this.parent, this.options);
    this.consoleManager = this.getConsoleManager(this.parent, this.options);
    this.canvasManager = this.getCanvasManager(this.parent, this.options);

    // Generate HTML structure

    await this.pageManager.setupPages();
    await this.buttonManager.setupButtons();

    const dom = this.registerDOM();
    this.parent.appendChild(dom);

    await this.editorManager.setupEditors();
    await this.instructionsManager.setupInstructions();
    await this.canvasManager.setupObservers();
    await this.pageManager.showPage("code");
    await this.getObersverManager(this.parent, this.options).setupObservers();
  }

  /**
   * Returns container element
   */
  getContainerDiv() {
    if (!this.containerDiv) {
      this.containerDiv = document.createElement("div");
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
    this.consoleManager.clearConsole();
  }

  /**
   * Run code via H5P runtime
   */
  run() {
    const runtime = this.runtimeFactory.createManualRuntime(this);
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
    const nav = document.createElement("nav");
    nav.className = "navbar";

    const spinner = document.createElement("div");
    spinner.className = "spinner";

    this.containerDiv = this.getContainerDiv();

    const instructionsDIV = document.createElement("div");
    instructionsDIV.className = "instructions-container";

    // Instructions
    const instructionsDOM = this.getInstructionsManager(
      this.parent,
      this.options,
    ).getDOM();
    if (instructionsDOM) instructionsDIV.appendChild(instructionsDOM);

    this.containerDiv.appendChild(instructionsDIV);

    this.containerDiv.appendChild(nav);

    // Pages-Container
    const pagesDiv = document.createElement("div");
    pagesDiv.className = "pages";

    const pagesDOM = this.getPageManager(this.parent, this.options).getDOM();

    pagesDiv.appendChild(pagesDOM);

    // Append Editor, Buttons and  Console DOM
    // Editor
    const editorDOM = this.getEditorManager(this.parent, this.options).getDOM();

    const codePage = this.pageManager.getPage("code");
    if (editorDOM && codePage)
      this.pageManager.getPage("code").appendChild(editorDOM);

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
    if (consoleDOM) this.pageManager.getPage("code").appendChild(consoleDOM);

    this.containerDiv.appendChild(pagesDiv);

    this.waitForImages(this.containerDiv).then(() => {
      this.resizeAction();
    });

    // Fallback für nicht-Bild-Layouts
    setTimeout(() => this.resizeAction(), 250);

    // Hauptcontainer zurückgeben
    return this.containerDiv;
  }

  handleButtonAction(action, payload) {
    switch (action) {
      case "run":
        this.pageManager.showPage("code");
        this.run();
        break;

      case "showPage":
        this.pageManager.showPage(payload);
        break;

      default:
        console.warn("Unknown button action:", action);
    }
  }

  getContainerClasses() {
    return [
      this.getButtonManager(this.parent, this.options).getHTMLClasses(),
      this.getConsoleManager(this.parent, this.options).getHTMLClasses(),
      this.getInstructionsManager(this.parent, this.options).getHTMLClasses(),
    ].join(" ");
  }

  waitForImages(root) {
    const images = root.querySelectorAll("img");

    if (!images.length) {
      return Promise.resolve();
    }

    return Promise.all(
      Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        });
      }),
    );
  }
}
