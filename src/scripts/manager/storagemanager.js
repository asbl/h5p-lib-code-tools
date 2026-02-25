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
   * Load code from a user-selected file.
   * Opens a file picker and reads the file content into codeContainer.
   */
  loadFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.py,text/plain';

      input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return reject('No file selected');

        const reader = new FileReader();
        reader.onload = (e) => {
          const code = e.target.result;
          if (typeof this.codeContainer.getEditorManager().setCode === 'function') {
            this.codeContainer.getEditorManager().setCode(code);
          }
          console.log(`[StorageManager] Code loaded from file: ${file.name}`);
          resolve(code);
        };
        reader.onerror = (err) => reject(err);

        reader.readAsText(file);
      };

      input.click();
    });
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
