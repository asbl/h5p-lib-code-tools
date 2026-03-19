import ButtonManager from './manager/buttonmanager.js';
import CanvasManager from './manager/canvasmanager.js';
import ConsoleManager from './manager/consolemanager.js';
import EditorManager from './manager/editormanager.js';
import ImageManager from './manager/imagemanager.js';
import InstructionsManager from './manager/instructionsmanager.js';
import Observermanager from './manager/observermanager.js';
import PageManager from './manager/pagemanager.js';
import SoundManager from './manager/soundmanager.js';
import StateManager from './manager/statemanager.js';
import StorageManager from './manager/storagemanager.js';
import UIRegistryManager from './manager/uiregistrymanager.js';
import { createLibCodeToolsL10n } from './services/libcodetools-l10n';


/**
 * CodeContainer class
 */
export default class CodeContainer {
  /**
   * @param {HTMLElement} parent - Host element for the code container.
   * @param {object} options - Container configuration.
   */
  constructor(parent, options) {
    // Localization labels (run button, etc.)
    this.l10n = createLibCodeToolsL10n(options.l10n || {});
    // DOM and H5P references
    this.parent = parent;
    this.options = options;
    this.h5pInstance = options.h5pInstance ?? null;
    this.runtimeFactory = options.runtimeFactory || null;
    this.codingLanguage = options.codingLanguage;

    // Editor state flags
    this.evaluation = options.evaluation ?? true;
    this.height = options.height || null;
    this.theme = options.theme === 'dark' ? 'dark' : 'light';

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
    this.fullscreen = false;
    this._fullscreenExitHandlerRegistered = false;
    this._fullscreenExitHandlerScope = null;

    this.handleFullscreenExit = () => {
      if (!this.fullscreen || typeof this.unsetFullscreen !== 'function') {
        return;
      }

      this.unsetFullscreen({ skipNativeExit: true, source: 'event' });
    };

    this.resizeActionHandler = options.resizeActionHandler || (() => { });
  }

  getStateManager(_parent, _options) {
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

  getStorageManager(_parent, _options) {
    if (this._storageManager) {
      return this._storageManager;
    }

    this._storageManager = new StorageManager(
      this,
      {
        downloadFilename: this.options?.downloadFilename,
        projectDownloadFilename: this.options?.projectDownloadFilename,
        projectBundleType: this.options?.projectBundleType,
      },
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
      undefined,
      false,
      { showStorageButtons: this.hasStorageButtons() },
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
    if (!this._editorManager) {
      this._editorManager = new EditorManager(
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
        this.getTheme(),
        {
          enabled: options?.projectStorageEnabled === true,
          entryFileName: options?.entryFileName || 'main.py',
          allowAddingFiles: options?.allowAddingFiles === true,
          sourceFiles: Array.isArray(options?.sourceFiles) ? options.sourceFiles : [],
          editorMode: options?.editorMode || 'code',
          blocklyCategories: options?.blocklyCategories ?? null,
          onOpenFileManager: () => this.showFileManagerPage(),
          onCloseFileManager: () => this.showCodePage?.() || this.getPageManager().showPage('code'),
        },
      );
    }
    return this._editorManager;
  }

  getConsoleManager(parent, options) {
    if (!this._consoleManager) {
      this._consoleManager = new ConsoleManager(
        options?.hasConsole || true,
        this.consoleUID,
        this.l10n,
        options?.consoleType || 'textarea',
      );
      this._consoleManager.setTheme(this.getTheme());
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

  getImageManager(_parent, options) {
    if (!this._imageManager) {
      this._imageManager = new ImageManager(this, {
        enabled: options?.enableImageUploads === true,
        l10n: this.l10n,
        resizeActionHandler: this.resizeActionHandler,
      });
    }

    return this._imageManager;
  }

  getSoundManager(_parent, options) {
    if (!this._soundManager) {
      this._soundManager = new SoundManager(this, {
        enabled: options?.enableSoundUploads === true,
        l10n: this.l10n,
        resizeActionHandler: this.resizeActionHandler,
      });
    }

    return this._soundManager;
  }

  getObserverManager() {
    if (!this._observerManager) {
      this._observerManager = new Observermanager();
    }
    return this._observerManager;
  }

  getUIRegistryManager() {
    if (!this._uiRegistryManager) {
      this._uiRegistryManager = new UIRegistryManager(this);
    }

    return this._uiRegistryManager;
  }

  getUIRegistrations() {
    return {
      buttons: [
        {
          when: 'hasButtons',
          identifier: 'themeToggle',
          label: '',
          icon: () => this.getThemeToggleIcon(),
          class: 'theme_toggle',
          name: 'theme_toggle',
          ariaLabel: () => this.getThemeToggleLabel(),
          title: () => this.getThemeToggleLabel(),
          weight: 10,
        },
      ],
      pages: [
        {
          when: 'hasFileManagerPage',
          name: 'files',
          content: () => this.getEditorManager().getFileManagerDOM(),
          additionalClass: 'files',
          visible: false,
        },
      ],
      observers: [
        {
          when: 'hasButtons',
          name: 'button:theme:toggle',
          type: 'button-click',
          button: 'themeToggle',
          callback: 'toggleTheme',
        },
      ],
    };
  }

  hasButtons() {
    return this.options?.hasButtons !== false;
  }

  hasStorageButtons() {
    return this.options?.showSaveLoadButtons !== false;
  }

  hasFileManagerPage() {
    return this.options?.allowAddingFiles === true;
  }

  showFileManagerPage() {
    if (!this.hasFileManagerPage()) {
      return;
    }

    this.getPageManager().showPage('files');
  }

  getTheme() {
    return this.theme;
  }

  getThemeClassName() {
    return `theme-${this.getTheme()}`;
  }

  getThemeToggleIcon() {
    return this.getTheme() === 'dark'
      ? 'fa-solid fa-sun'
      : 'fa-solid fa-moon';
  }

  getThemeToggleLabel() {
    return this.getTheme() === 'dark'
      ? this.l10n.switchToLightMode
      : this.l10n.switchToDarkMode;
  }

  toggleTheme() {
    this.setTheme(this.getTheme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme) {
    this.theme = theme === 'dark' ? 'dark' : 'light';
    this.applyTheme();
  }

  applyTheme() {
    const themeClassName = this.getThemeClassName();
    const containerDiv = this.getContainerDiv();
    const fullscreenHost = this.parent.closest('.content-part.fullscreen');
    const h5pContainer = this.fullscreen
      ? this.parent.closest('.h5p-container.h5p-semi-fullscreen, .h5p-container.h5p-fullscreen')
      : null;

    containerDiv.classList.remove('theme-light', 'theme-dark');
    containerDiv.classList.add(themeClassName);
    this.parent.classList.remove('theme-light', 'theme-dark');
    this.parent.classList.add(themeClassName);

    if (fullscreenHost) {
      fullscreenHost.classList.remove('theme-light', 'theme-dark');
      fullscreenHost.classList.add(themeClassName);
    }

    if (h5pContainer) {
      h5pContainer.classList.remove('theme-light', 'theme-dark');
      h5pContainer.classList.add(themeClassName);
    }

    this._editorManager?.setTheme(this.getTheme());
    this._consoleManager?.setTheme(this.getTheme());
    this.updateThemeToggleButton();
  }

  updateThemeToggleButton() {
    if (!this._buttonManager) {
      return;
    }

    this._buttonManager.setButtonIcon('themeToggle', this.getThemeToggleIcon());
    this._buttonManager.setButtonAriaLabel('themeToggle', this.getThemeToggleLabel());
    this._buttonManager.setButtonTitle('themeToggle', this.getThemeToggleLabel());
  }

  registerFullscreenExitHandler() {
    if (this._fullscreenExitHandlerRegistered) {
      return;
    }

    if (this.h5pInstance && typeof H5P.on === 'function') {
      H5P.on(this.h5pInstance, 'exitFullScreen', this.handleFullscreenExit);
      this._fullscreenExitHandlerRegistered = true;
      this._fullscreenExitHandlerScope = 'instance';
      return;
    }

    if (H5P.externalDispatcher?.on) {
      H5P.externalDispatcher.on('exitFullScreen', this.handleFullscreenExit);
      this._fullscreenExitHandlerRegistered = true;
      this._fullscreenExitHandlerScope = 'external';
    }
  }

  unregisterFullscreenExitHandler() {
    if (!this._fullscreenExitHandlerRegistered) {
      return;
    }

    if (this._fullscreenExitHandlerScope === 'instance'
      && this.h5pInstance
      && typeof H5P.off === 'function') {
      H5P.off(this.h5pInstance, 'exitFullScreen', this.handleFullscreenExit);
    }

    if (this._fullscreenExitHandlerScope === 'external'
      && H5P.externalDispatcher?.off) {
      H5P.externalDispatcher.off('exitFullScreen', this.handleFullscreenExit);
    }

    this._fullscreenExitHandlerRegistered = false;
    this._fullscreenExitHandlerScope = null;
  }

  mergeUIRegistrations(...definitions) {
    return definitions.reduce((merged, definition) => ({
      buttons: [...merged.buttons, ...(definition?.buttons ?? [])],
      pages: [...merged.pages, ...(definition?.pages ?? [])],
      observers: [...merged.observers, ...(definition?.observers ?? [])],
    }), {
      buttons: [],
      pages: [],
      observers: [],
    });
  }

  /**
   * Instantiates and caches the shared manager instances used by the container.
   * @returns {void}
   */
  initializeManagers() {
    this._pageManager = this.getPageManager();
    this._buttonManager = this.getButtonManager(this.parent, this.options);
    this._editorManager = this.getEditorManager(this.parent, this.options);
    this._consoleManager = this.getConsoleManager(this.parent, this.options);
    this._canvasManager = this.getCanvasManager(this.parent, this.options);
    this._imageManager = this.getImageManager(this.parent, this.options);
    this._soundManager = this.getSoundManager(this.parent, this.options);
    this._stateManager = this.getStateManager();
    this.instructionsManager = this.getInstructionsManager(this.parent, this.options);
    this._uiRegistryManager = this.getUIRegistryManager();
  }

  /**
   * Complete setup: editors, pages, buttons, observers
   */
  async setup() {
    this.registerFullscreenExitHandler();
    this.initializeManagers();

    // Generate HTML structure

    await this.getPageManager().setupPages();
    await this._buttonManager.setupButtons();
    this._uiRegistryManager.register(this.getUIRegistrations());

    const dom = this.registerDOM();
    this.parent.appendChild(dom);

    await this._consoleManager.setupConsole();
    await this.instructionsManager.setupInstructions();
    this.applyTheme();
    this.getPageManager().showPage('code');
    await this._editorManager.setupEditors();
  }

  /**
   * Returns container element.
   * @returns {HTMLDivElement} Container element.
   */
  getContainerDiv() {
    if (!this.containerDiv) {
      this.containerDiv = document.createElement('div');
      this.containerDiv.id = this.containerUID;
      this.containerDiv.className = `code_container ${this.getContainerClasses()} ${this.getThemeClassName()}`;
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
   * @returns {HTMLElement} Main DOM element.
   */
  getDOM() {
    return this.parent;
  }

  /**
   * Returns the combined entry-file code.
   * @returns {string} Entry file code including fixed sections.
   */
  getCode() {
    return this.getEditorManager().getCode();
  }

  /**
   * Replaces the entry-file code.
   * @param {string} code - Replacement source code.
   * @returns {void}
   */
  setCode(code) {
    this.getEditorManager().setCode(code);
  }

  /**
   * Indicates whether project bundle storage is enabled.
   * @returns {boolean} True if project storage is enabled.
   */
  supportsProjectStorage() {
    return this.options?.projectStorageEnabled === true;
  }

  /**
   * Returns the current workspace snapshot from the editor.
   * @returns {object|null} Current workspace snapshot.
   */
  getWorkspaceSnapshot() {
    return this.getEditorManager().getWorkspaceSnapshot?.() || null;
  }

  /**
   * Returns the author-defined workspace snapshot.
   * @returns {object|null} Default workspace snapshot.
   */
  getDefaultWorkspaceSnapshot() {
    return this.getEditorManager().getDefaultWorkspaceSnapshot?.() || null;
  }

  /**
   * Indicates whether the current project must be stored as a bundle.
   * @returns {boolean} True if the current project contains multiple files.
   */
  hasProjectBundleContents() {
    if (!this.supportsProjectStorage()) {
      return false;
    }

    const editorManager = this.getEditorManager();
    const hasAdditionalSourceFiles = editorManager?.hasAdditionalSourceFiles?.() === true;
    const hasImages = this.getImageManager()?.isEnabled?.() === true
      && this.getImageManager().getFiles().length > 0;
    const hasSounds = this.getSoundManager()?.isEnabled?.() === true
      && this.getSoundManager().getFiles().length > 0;

    return hasAdditionalSourceFiles || hasImages || hasSounds;
  }

  /**
   * Builds a project bundle for download when the project contains multiple files.
   * @returns {object|null} Serializable project bundle or null.
   */
  getProjectBundle() {
    if (!this.hasProjectBundleContents()) {
      return null;
    }

    const workspace = this.getWorkspaceSnapshot();

    if (!workspace) {
      return null;
    }

    return {
      type: this.options?.projectBundleType || 'h5p-python-question-project',
      version: 1,
      entryFileName: workspace.entryFileName,
      activeFileName: workspace.activeFileName,
      sourceFiles: workspace.files.map((file) => ({
        name: file.name,
        code: file.code,
        visible: file.visible !== false,
        editable: file.editable !== false,
        isEntry: file.isEntry === true,
      })),
      images: this.getImageManager()?.isEnabled?.() === true
        ? this.getImageManager().serializeFiles()
        : [],
      sounds: this.getSoundManager()?.isEnabled?.() === true
        ? this.getSoundManager().serializeFiles()
        : [],
    };
  }

  /**
   * Applies a previously exported project bundle.
   * @param {object} projectBundle - Parsed project bundle.
   * @returns {boolean} True if the bundle was applied.
   */
  applyProjectBundle(projectBundle) {
    if (!this.supportsProjectStorage()) {
      return false;
    }

    if (projectBundle?.type !== (this.options?.projectBundleType || 'h5p-python-question-project')) {
      return false;
    }

    if (!Array.isArray(projectBundle?.sourceFiles) || projectBundle.sourceFiles.length === 0) {
      return false;
    }

    const workspaceFiles = Array.isArray(projectBundle?.sourceFiles)
      ? projectBundle.sourceFiles
        .filter((file) => typeof file?.name === 'string' && file.name.trim() !== '')
        .map((file) => ({
          name: file.name,
          code: typeof file.code === 'string' ? file.code : '',
          visible: file.visible !== false,
          editable: file.editable !== false,
          isEntry: file.isEntry === true,
        }))
      : [];

    if (workspaceFiles.length === 0) {
      return false;
    }

    this.getEditorManager().setWorkspaceSnapshot({
      entryFileName: projectBundle.entryFileName || this.options?.entryFileName || 'main.py',
      activeFileName: projectBundle.activeFileName,
      files: workspaceFiles,
    });

    if (this.getImageManager()?.isEnabled?.() === true) {
      this.getImageManager().replaceFiles(Array.isArray(projectBundle.images) ? projectBundle.images : []);
    }

    if (this.getSoundManager()?.isEnabled?.() === true) {
      this.getSoundManager().replaceFiles(Array.isArray(projectBundle.sounds) ? projectBundle.sounds : []);
    }

    return true;
  }

  /**
   * Creates the outer instructions wrapper used above the toolbar.
   * @returns {HTMLDivElement} Instructions wrapper element.
   */
  createInstructionsWrapper() {
    const instructionsWrapper = document.createElement('div');
    instructionsWrapper.className = 'instructions-container';

    const instructionsDOM = this.getInstructionsManager(
      this.parent,
      this.options,
    ).getDOM();

    if (instructionsDOM) {
      instructionsWrapper.appendChild(instructionsDOM);
    }

    return instructionsWrapper;
  }

  /**
   * Appends editor and console DOM to the shared code page.
   * @returns {void}
   */
  appendCodePageContent() {
    const editorDOM = this.getEditorManager(this.parent, this.options).getDOM();
    const consoleDOM = this.getConsoleManager(this.parent, this.options).getDOM();
    const codePage = this.getPageManager().getPage('code');

    if (editorDOM && codePage) {
      this.getPageManager().appendChild('code', editorDOM);
    }

    if (consoleDOM && codePage) {
      this.getPageManager().appendChild('code', consoleDOM);
    }
  }

  /**
   * Schedules resize notifications after images and late layout changes.
   * @returns {void}
   */
  scheduleResizeAfterRender() {
    this.waitForImages(this.containerDiv).then(() => {
      this.resizeActionHandler();
    });

    // Fallback for layouts that do not depend on images.
    setTimeout(() => this.resizeActionHandler(), 250);
  }

  registerDOM() {
    // Navbar + Spinner
    this.containerDiv = this.getContainerDiv();
    this.containerDiv.innerHTML = '';

    const nav = document.createElement('nav');
    nav.className = 'navbar';

    const spinner = document.createElement('div');
    spinner.className = 'spinner';

    this.containerDiv.appendChild(this.createInstructionsWrapper());

    this.containerDiv.appendChild(nav);

    // Pages-Container
    const pagesDiv = document.createElement('div');
    pagesDiv.className = 'pages';

    const pagesDOM = this.getPageManager().getDOM();

    pagesDiv.appendChild(pagesDOM);

    this.appendCodePageContent();

    // Buttons
    const buttonsDOM = this.getButtonManager(
      this.parent,
      this.options,
    ).getDOM();
    if (buttonsDOM) nav.appendChild(buttonsDOM);

    this.containerDiv.appendChild(pagesDiv);
    this.scheduleResizeAfterRender();

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

  /**
   * Releases observers, editor instances, and uploaded-file object URLs.
   * @returns {void}
   */
  destroy() {
    this._runtime?.stop?.();

    if (this.fullscreen && typeof this.unsetFullscreen === 'function') {
      this.unsetFullscreen({ skipNativeExit: false, source: 'destroy' });
    }

    this._observerManager?.disconnectAll?.();
    this.unregisterFullscreenExitHandler();

    this._imageManager?.destroy?.();
    this._soundManager?.destroy?.();
    this._editorManager?.destroy?.();
    this._consoleManager?.destroy?.();

    this.containerDiv?.remove?.();
    this.containerDiv = null;
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
