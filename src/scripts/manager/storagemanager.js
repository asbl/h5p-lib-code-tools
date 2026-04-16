import { ensureJsZipRuntime } from '@services/jszip-runtime';

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
  * @param {string} [options.jsZipCdnUrl] - Optional external JSZip runtime URL.
   */
  constructor(codeContainer, options = {}) {
    this.codeContainer = codeContainer;

    // Configuration options
    this.localStorageKey = options.localStorageKey || 'pythonQuestionCode';
    this.downloadFilename = options.downloadFilename || 'sketch.py';
    this.projectDownloadFilename = options.projectDownloadFilename || 'python-project.zip';
    this.projectBundleType = options.projectBundleType || 'h5p-python-question-project';
    this.jsZipCdnUrl = String(options.jsZipCdnUrl || '').trim();
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
      ? '.py,.txt,.zip,.h5pproject,.json,text/plain,application/zip'
      : '.py,.txt,text/plain';
  }

  /**
   * Indicates whether a file should be interpreted as a ZIP project bundle.
   * @param {File|{name?: string}} file - Selected browser file.
   * @returns {boolean} True if the file name represents a ZIP bundle.
   */
  isZipProjectBundleFile(file) {
    const fileName = String(file?.name || '').toLowerCase();
    return fileName.endsWith('.zip');
  }

  /**
   * Indicates whether a file should be interpreted as a project bundle.
   * @param {File|{name?: string}} file - Selected browser file.
   * @returns {boolean} True if the file name represents a project bundle.
   */
  isProjectBundleFile(file) {
    const fileName = String(file?.name || '').toLowerCase();
    return fileName.endsWith('.zip')
      || fileName.endsWith('.h5pproject')
      || fileName.endsWith('.json');
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

    if (this.isZipProjectBundleFile(file)) {
      const projectBundle = await this.readProjectBundleZip(file);

      if (this.codeContainer.applyProjectBundle?.(projectBundle)) {
        console.log(`[StorageManager] Project loaded from ZIP file: ${file.name}`);
        return projectBundle;
      }

      throw this.createLoadError('load_project_apply_failed');
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
      return this.downloadProjectBundle(projectBundle);
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
  async downloadProjectBundle(projectBundle) {
    const blob = await this.createProjectBundleZipBlob(projectBundle);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = this.projectDownloadFilename;
    anchor.click();
    URL.revokeObjectURL(url);
    console.log(`[StorageManager] Project downloaded as file: ${this.projectDownloadFilename}`);
  }

  /**
   * Creates a ZIP blob for the current multi-file project.
   * @param {object} projectBundle - Serializable project bundle.
   * @returns {Promise<Blob>} ZIP archive blob.
   */
  async createProjectBundleZipBlob(projectBundle) {
    const JSZip = await ensureJsZipRuntime(this.jsZipCdnUrl);
    const zip = new JSZip();

    (Array.isArray(projectBundle?.sourceFiles) ? projectBundle.sourceFiles : []).forEach((file) => {
      const name = String(file?.name || '').trim();

      if (!name) {
        return;
      }

      zip.file(name, typeof file.code === 'string' ? file.code : '');
    });

    (Array.isArray(projectBundle?.images) ? projectBundle.images : []).forEach((file) => {
      const name = String(file?.name || '').trim();

      if (!name) {
        return;
      }

      zip.file(`images/${name}`, this.base64ToBytes(file.data || ''));
    });

    (Array.isArray(projectBundle?.sounds) ? projectBundle.sounds : []).forEach((file) => {
      const name = String(file?.name || '').trim();

      if (!name) {
        return;
      }

      zip.file(`sounds/${name}`, this.base64ToBytes(file.data || ''));
    });

    return zip.generateAsync({ type: 'blob' });
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
   * Reads a selected local file as an ArrayBuffer.
   * @param {File} file - Selected file.
   * @returns {Promise<ArrayBuffer>} File bytes.
   */
  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => resolve(event?.target?.result || new ArrayBuffer(0));
      reader.onerror = (error) => reject(error);

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Reads and parses a ZIP project bundle.
   * @param {File} file - Selected ZIP file.
   * @returns {Promise<object>} Parsed project bundle.
   */
  async readProjectBundleZip(file) {
    let content;

    try {
      content = await this.readFileAsArrayBuffer(file);
    }
    catch {
      throw this.createLoadError('load_read_failed');
    }

    try {
      return await this.parseProjectBundleZip(content);
    }
    catch {
      throw this.createLoadError('load_invalid_project_bundle');
    }
  }

  /**
   * Parses a ZIP project bundle into the internal project structure.
   * @param {ArrayBuffer} content - ZIP payload.
   * @returns {Promise<object>} Parsed project bundle.
   */
  async parseProjectBundleZip(content) {
    if (!this.codeContainer.supportsProjectStorage?.()) {
      throw this.createLoadError('load_invalid_project_bundle');
    }

    const JSZip = await ensureJsZipRuntime(this.jsZipCdnUrl);
    const zip = await JSZip.loadAsync(content);
    const sourceFiles = [];
    const images = [];
    const sounds = [];
    const sourceNames = new Set();
    const imageNames = new Set();
    const soundNames = new Set();

    for (const entry of Object.values(zip.files)) {
      if (entry.dir) {
        continue;
      }

      const normalizedPath = this.normalizeProjectZipPath(entry.name);

      if (!normalizedPath || this.shouldIgnoreProjectZipPath(normalizedPath)) {
        continue;
      }

      const descriptor = this.classifyProjectZipEntry(normalizedPath);

      if (!descriptor) {
        throw this.createLoadError('load_invalid_project_bundle');
      }

      if (descriptor.kind === 'source') {
        if (sourceNames.has(descriptor.name)) {
          throw this.createLoadError('load_invalid_project_bundle');
        }

        sourceNames.add(descriptor.name);
        sourceFiles.push({
          name: descriptor.name,
          code: await entry.async('string'),
          visible: true,
          editable: true,
          isEntry: false,
        });
        continue;
      }

      const bytes = await entry.async('uint8array');
      const serializedFile = {
        name: descriptor.name,
        mimeType: this.guessMimeTypeForFileName(descriptor.name, descriptor.kind),
        size: bytes.byteLength,
        data: this.bytesToBase64(bytes),
      };

      if (descriptor.kind === 'image') {
        if (imageNames.has(descriptor.name)) {
          throw this.createLoadError('load_invalid_project_bundle');
        }

        imageNames.add(descriptor.name);
        images.push(serializedFile);
        continue;
      }

      if (soundNames.has(descriptor.name)) {
        throw this.createLoadError('load_invalid_project_bundle');
      }

      soundNames.add(descriptor.name);
      sounds.push(serializedFile);
    }

    if (sourceFiles.length === 0) {
      throw this.createLoadError('load_invalid_project_bundle');
    }

    const entryFileName = this.resolveProjectBundleEntryFileName(sourceFiles);

    sourceFiles.forEach((file) => {
      file.isEntry = file.name === entryFileName;
    });

    return {
      type: this.projectBundleType,
      version: 1,
      entryFileName,
      activeFileName: entryFileName,
      sourceFiles,
      images,
      sounds,
    };
  }

  /**
   * Normalizes ZIP entry paths to a safe slash-delimited relative path.
   * @param {string} path - Raw ZIP entry path.
   * @returns {string|null} Normalized path or null if invalid.
   */
  normalizeProjectZipPath(path) {
    const normalized = String(path || '')
      .replace(/\\/g, '/')
      .replace(/^\/+/, '')
      .replace(/^\.\//, '');

    const segments = normalized.split('/').filter(Boolean);

    if (segments.length === 0 || segments.some((segment) => segment === '.' || segment === '..')) {
      return null;
    }

    return segments.join('/');
  }

  /**
   * Indicates whether a ZIP entry should be ignored during import.
   * @param {string} normalizedPath - Normalized ZIP entry path.
   * @returns {boolean} True for metadata noise entries.
   */
  shouldIgnoreProjectZipPath(normalizedPath) {
    return normalizedPath.startsWith('__MACOSX/')
      || normalizedPath === '.DS_Store'
      || normalizedPath.endsWith('/.DS_Store');
  }

  /**
   * Classifies a normalized ZIP entry path.
   * @param {string} normalizedPath - Normalized ZIP entry path.
   * @returns {{kind: 'source'|'image'|'sound', name: string}|null} Classification result.
   */
  classifyProjectZipEntry(normalizedPath) {
    const segments = normalizedPath.split('/');

    if (segments.length === 1) {
      const name = segments[0];

      if (!name || this.isImageAssetName(name) || this.isSoundAssetName(name)) {
        return null;
      }

      return { kind: 'source', name };
    }

    if (segments.length !== 2) {
      return null;
    }

    const [directory, name] = segments;

    if (!name) {
      return null;
    }

    if (directory === 'images' && this.isImageAssetName(name)) {
      return { kind: 'image', name };
    }

    if (directory === 'sounds' && this.isSoundAssetName(name)) {
      return { kind: 'sound', name };
    }

    return null;
  }

  /**
   * Returns whether a file name looks like a supported image asset.
   * @param {string} fileName - Candidate file name.
   * @returns {boolean} True for supported image assets.
   */
  isImageAssetName(fileName) {
    return this.getSupportedImageExtensions().includes(this.getFileExtension(fileName));
  }

  /**
   * Returns whether a file name looks like a supported sound asset.
   * @param {string} fileName - Candidate file name.
   * @returns {boolean} True for supported sound assets.
   */
  isSoundAssetName(fileName) {
    return this.getSupportedSoundExtensions().includes(this.getFileExtension(fileName));
  }

  /**
   * Returns the supported image extensions from the active image manager.
   * @returns {string[]} Lowercase file extensions including the dot.
   */
  getSupportedImageExtensions() {
    const imageManager = this.codeContainer.getImageManager?.();

    return Array.isArray(imageManager?.extensions)
      ? imageManager.extensions.map((extension) => String(extension).toLowerCase())
      : [];
  }

  /**
   * Returns the supported sound extensions from the active sound manager.
   * @returns {string[]} Lowercase file extensions including the dot.
   */
  getSupportedSoundExtensions() {
    const soundManager = this.codeContainer.getSoundManager?.();

    return Array.isArray(soundManager?.extensions)
      ? soundManager.extensions.map((extension) => String(extension).toLowerCase())
      : [];
  }

  /**
   * Extracts the lowercase extension from a file name.
   * @param {string} fileName - File name to inspect.
   * @returns {string} Lowercase extension including the dot, or an empty string.
   */
  getFileExtension(fileName) {
    const value = String(fileName || '');
    const lastDotIndex = value.lastIndexOf('.');

    if (lastDotIndex <= 0) {
      return '';
    }

    return value.slice(lastDotIndex).toLowerCase();
  }

  /**
   * Resolves the entry file name for an imported ZIP project.
   * @param {Array<{name: string}>} sourceFiles - Imported source files.
   * @returns {string} Entry file name.
   */
  resolveProjectBundleEntryFileName(sourceFiles) {
    const configuredEntryFileName = String(this.codeContainer.options?.entryFileName || '').trim();

    if (configuredEntryFileName && sourceFiles.some((file) => file.name === configuredEntryFileName)) {
      return configuredEntryFileName;
    }

    if (sourceFiles.some((file) => file.name === 'main.py')) {
      return 'main.py';
    }

    return sourceFiles[0].name;
  }

  /**
   * Encodes raw bytes as a base64 string.
   * @param {Uint8Array} [bytes] - Bytes to encode.
   * @returns {string} Base64 encoded payload.
   */
  bytesToBase64(bytes = new Uint8Array()) {
    let binary = '';
    const chunkSize = 0x8000;

    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return globalThis.btoa(binary);
  }

  /**
   * Decodes a base64 string into raw bytes.
   * @param {string} [value] - Base64 encoded payload.
   * @returns {Uint8Array} Decoded bytes.
   */
  base64ToBytes(value = '') {
    if (!value) {
      return new Uint8Array();
    }

    const binary = globalThis.atob(String(value));
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  }

  /**
   * Guesses a MIME type from a stored file name.
   * @param {string} fileName - File name to inspect.
   * @param {'image'|'sound'} kind - Asset category.
   * @returns {string} Best-effort MIME type.
   */
  guessMimeTypeForFileName(fileName, kind) {
    const extension = this.getFileExtension(fileName);

    if (kind === 'image') {
      switch (extension) {
        case '.png': return 'image/png';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.gif': return 'image/gif';
        case '.bmp': return 'image/bmp';
        case '.svg': return 'image/svg+xml';
        case '.webp': return 'image/webp';
        case '.avif': return 'image/avif';
        default: return 'application/octet-stream';
      }
    }

    switch (extension) {
      case '.wav': return 'audio/wav';
      case '.mp3': return 'audio/mpeg';
      case '.ogg':
      case '.oga': return 'audio/ogg';
      case '.m4a': return 'audio/mp4';
      case '.aac': return 'audio/aac';
      case '.flac': return 'audio/flac';
      case '.mid':
      case '.midi': return 'audio/midi';
      case '.weba': return 'audio/webm';
      default: return 'application/octet-stream';
    }
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
    if (download) {
      return this.downloadCode();
    }

    return undefined;
  }
}
