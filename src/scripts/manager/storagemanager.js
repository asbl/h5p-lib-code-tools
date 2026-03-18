/**
 * StorageManager
 *
 * Handles saving and loading code from:
 * - LocalStorage (browser)
 * - Download as file
 * - Loading from a local file
 */
export default class StorageManager {
  /**
   * Creates a new StorageManager instance.
   * @param {object} codeContainer - The object that provides access to the code.
   *   Expected to implement `getCode()` and optionally `setCode(code)`.
   * @param {object} [options] - Optional configuration.
   * @param {string} [options.localStorageKey] - Key for localStorage.
   * @param {string} [options.downloadFilename] - Default filename for download.
   */
  constructor(codeContainer, options = {}) {
    this.codeContainer = codeContainer;

    // Configuration options
    this.localStorageKey = options.localStorageKey || 'pythonQuestionCode';
    this.downloadFilename = options.downloadFilename || 'sketch.py';
    this.projectDownloadFilename = options.projectDownloadFilename || 'python-project.h5pproject';
    this.projectBundleType = options.projectBundleType || 'h5p-python-question-project';
  }

  /**
   * Creates a structured load error.
   * @param {string} code - Stable error code.
   * @returns {Error} Error with a machine-readable code.
   */
  createLoadError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
  }

  /**
   * Returns the accepted file types for the browser picker.
   * @returns {string} Comma-separated accept list.
   */
  getAcceptedFileTypes() {
    return this.codeContainer.supportsProjectStorage?.()
      ? '.py,.txt,.h5pproject,text/plain'
      : '.py,.txt,text/plain';
  }

  /**
   * Indicates whether a file should be interpreted as a project bundle.
   * @param {File|{name?: string}} file - Selected browser file.
   * @returns {boolean} True if the file name represents a project bundle.
   */
  isProjectBundleFile(file) {
    const fileName = String(file?.name || '').toLowerCase();
    return fileName.endsWith('.h5pproject') || fileName.endsWith('.json');
  }

  /**
   * Indicates whether a file should be loaded as plain source code.
   * @param {File|{name?: string}} file - Selected browser file.
   * @returns {boolean} True for plain-code files.
   */
  isPlainCodeFile(file) {
    const fileName = String(file?.name || '').toLowerCase();

    return fileName === ''
      || fileName.endsWith('.py')
      || fileName.endsWith('.txt');
  }

  /**
   * Applies a user-selected file to the editor or workspace.
   * @param {File|{name?: string}} file - Selected browser file.
   * @returns {Promise<object|string|null>} Applied project bundle, plain code, or null.
   */
  async loadSelectedFile(file) {
    if (!file) {
      return null;
    }

    let content;

    try {
      content = await this.readFileAsText(file);
    }
    catch {
      throw this.createLoadError('load_read_failed');
    }

    const projectBundle = this.parseProjectBundle(content);

    if (projectBundle) {
      if (this.codeContainer.applyProjectBundle?.(projectBundle)) {
        console.log(`[StorageManager] Project loaded from file: ${file.name}`);
        return projectBundle;
      }

      throw this.createLoadError('load_project_apply_failed');
    }

    if (this.isProjectBundleFile(file)) {
      throw this.createLoadError('load_invalid_project_bundle');
    }

    if (!this.isPlainCodeFile(file)) {
      throw this.createLoadError('load_unsupported_file_type');
    }

    if (typeof this.codeContainer.setCode === 'function') {
      this.codeContainer.setCode(content);
    }
    else if (typeof this.codeContainer.getEditorManager().setCode === 'function') {
      this.codeContainer.getEditorManager().setCode(content);
    }
    else {
      throw this.createLoadError('load_apply_failed');
    }

    console.log(`[StorageManager] Code loaded from file: ${file.name}`);
    return content;
  }

  /**
   * Save code to localStorage.
   */
  saveToLocalStorage() {
    const code = this.codeContainer.getCode();
    localStorage.setItem(this.localStorageKey, code);
    console.log(`[StorageManager] Code saved to LocalStorage with key: ${this.localStorageKey}`);
  }

  /**
   * Load code from localStorage and set it in the code container.
   */
  loadFromLocalStorage() {
    const code = localStorage.getItem(this.localStorageKey);
    if (code !== null && typeof this.codeContainer.setCode === 'function') {
      this.codeContainer.getEditorManager().setCode(code);
      console.log('[StorageManager] Code loaded from LocalStorage.');
    }
    return code;
  }

  /**
   * Trigger download of the current code as a file.
   */
  downloadCode() {
    const projectBundle = this.codeContainer.getProjectBundle?.();

    if (projectBundle) {
      this.downloadProjectBundle(projectBundle);
      return;
    }

    const code = this.codeContainer.getEditorManager().getCode();
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.downloadFilename;
    a.click();
    URL.revokeObjectURL(url);
    console.log(`[StorageManager] Code downloaded as file: ${this.downloadFilename}`);
  }

  /**
   * Downloads the current project bundle instead of a single source file.
   * @param {object} projectBundle - Serializable project bundle.
   * @returns {void}
   */
  downloadProjectBundle(projectBundle) {
    const payload = JSON.stringify(projectBundle, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = this.projectDownloadFilename;
    anchor.click();
    URL.revokeObjectURL(url);
    console.log(`[StorageManager] Project downloaded as file: ${this.projectDownloadFilename}`);
  }

  /**
   * Load code from a user-selected file.
   * Opens a file picker and reads the file content into codeContainer.
   */
  loadFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = this.getAcceptedFileTypes();
      input.style.display = 'none';

      document.body?.appendChild(input);

      const cleanup = () => {
        input.removeEventListener('change', handleChange);
        input.removeEventListener('cancel', handleCancel);
        input.remove();
      };

      const settle = (callback, value) => {
        cleanup();
        callback(value);
      };

      const handleCancel = () => settle(resolve, null);

      const handleChange = async (event) => {
        const file = event?.target?.files?.[0] || null;

        if (!file) {
          settle(resolve, null);
          return;
        }

        try {
          const loaded = await this.loadSelectedFile(file);
          settle(resolve, loaded);
        }
        catch (error) {
          settle(reject, error);
        }
      };

      input.addEventListener('change', handleChange, { once: true });
      input.addEventListener('cancel', handleCancel, { once: true });

      input.click();
    });
  }

  /**
   * Reads a selected local file as UTF-8 text.
   * @param {File} file - Selected file.
   * @returns {Promise<string>} File contents.
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => resolve(String(event?.target?.result || ''));
      reader.onerror = (error) => reject(error);

      reader.readAsText(file);
    });
  }

  /**
   * Parses a project bundle payload if the file contents match the project schema.
   * @param {string} content - Candidate file contents.
   * @returns {object|null} Parsed project bundle or null.
   */
  parseProjectBundle(content) {
    if (!this.codeContainer.supportsProjectStorage?.()) {
      return null;
    }

    try {
      const parsed = JSON.parse(content);

      return this.isValidProjectBundle(parsed) ? parsed : null;
    }
    catch {
      return null;
    }
  }

  /**
   * Validates the parsed project bundle shape.
   * @param {object} projectBundle - Parsed JSON value.
   * @returns {boolean} True if the bundle can be applied safely.
   */
  isValidProjectBundle(projectBundle) {
    if (projectBundle?.type !== this.projectBundleType || projectBundle?.version !== 1) {
      return false;
    }

    if (!Array.isArray(projectBundle?.sourceFiles) || projectBundle.sourceFiles.length === 0) {
      return false;
    }

    return projectBundle.sourceFiles.some((file) => typeof file?.name === 'string' && file.name.trim() !== '');
  }

  /**
   * Unified save method with options.
   * @param {object} [options] - Options to control where to save.
   * @param {boolean} [options.local] - Save to localStorage.
   * @param {boolean} [options.download] - Trigger download.
   */
  save({ local = true, download = false } = {}) {
    if (local) this.saveToLocalStorage();
    if (download) this.downloadCode();
  }
}
