import { getLibCodeToolsL10nValue } from '../services/libcodetools-l10n';

/**
 * @typedef {object} UploadedFileEntry
 * @property {string} id - Stable client-side identifier.
 * @property {string} name - Display name and runtime file name.
 * @property {string} mimeType - MIME type reported by the browser.
 * @property {number} size - File size in bytes.
 * @property {Uint8Array} bytes - Raw file contents for runtime integration.
 * @property {string} objectUrl - Blob URL used for preview rendering.
 */

/**
 * @typedef {object} FileManagerLocalizationKeys
 * @property {string} [title] - Localization key for the section title.
 * @property {string} [description] - Localization key for the section description.
 * @property {string} [help] - Localization key for the usage hint.
 * @property {string} [upload] - Localization key for the upload button label.
 * @property {string} [empty] - Localization key for the empty-state text.
 * @property {string} [fileName] - Localization key for the rename label.
 * @property {string} [renameAriaLabel] - Localization key for the rename aria label.
 * @property {string} [remove] - Localization key for the remove button label.
 * @property {string} [defaultName] - Localization key for generated fallback names.
 */

/**
 * @typedef {object} FileManagerOptions
 * @property {boolean} [enabled] - Whether uploads are enabled.
 * @property {object} [l10n] - Localization object or proxy.
 * @property {function} [resizeActionHandler] - Resize callback.
 * @property {string} [className] - Root CSS class.
 * @property {string} [accept] - Native file input accept value.
 * @property {string[]} [mimePrefixes] - Accepted MIME prefixes.
 * @property {string[]} [extensions] - Accepted file extensions.
 * @property {string} [variableName] - Runtime registry variable name.
 * @property {string} [relativeDirectory] - Runtime-relative directory.
 * @property {string} [defaultExtension] - Fallback extension.
 * @property {FileManagerLocalizationKeys} [l10nKeys] - Localization keys used by the manager.
 */

/**
 * Shared base class for upload managers that expose files to code runtimes.
 */
export default class FileManager {
  /**
   * @param {object} codeContainer - Owning code container instance.
    * @param {FileManagerOptions} [options] - Manager options.
   */
  constructor(codeContainer, options = {}) {
    this.codeContainer = codeContainer;
    this.enabled = options.enabled === true;
    this.l10n = options.l10n || {};
    this.resizeActionHandler = options.resizeActionHandler || (() => {});

    this.className = options.className || 'file-manager';
    this.accept = options.accept || '*/*';
    this.mimePrefixes = [...(options.mimePrefixes || [])];
    this.extensions = (options.extensions || []).map((extension) => String(extension).toLowerCase());
    this.variableName = options.variableName || 'h5p_files';
    this.relativeDirectory = options.relativeDirectory || 'files';
    this.defaultExtension = options.defaultExtension || '.bin';
    this.l10nKeys = {
      title: 'filesTitle',
      description: 'filesDescription',
      help: 'filesHelp',
      upload: 'filesUpload',
      empty: 'filesEmpty',
      fileName: 'filesFileName',
      renameAriaLabel: 'filesRenameAriaLabel',
      remove: 'filesRemove',
      defaultName: 'filesDefaultName',
      ...(options.l10nKeys || {}),
    };

    /** @type {UploadedFileEntry[]} */
    this.files = [];

    this.dom = null;
    this.emptyState = null;
    this.fileInput = null;
    this.fileList = null;
  }

  /**
   * Indicates whether the manager should be rendered for the current content.
   * @returns {boolean} True if uploads are enabled.
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Returns the root DOM element for the manager.
   * @returns {HTMLElement|null} Root element or null if uploads are disabled.
   */
  getDOM() {
    if (!this.isEnabled()) {
      return null;
    }

    if (!this.dom) {
      this.dom = this.createDOM();
      this.renderFileList();
    }

    return this.dom;
  }

  /**
   * Returns all uploaded files in their current order.
   * @returns {UploadedFileEntry[]} Uploaded file entries.
   */
  getFiles() {
    return this.files;
  }

  /**
   * Serializes all current file entries for project download.
   * @returns {object[]} Serializable file entries.
   */
  serializeFiles() {
    return this.files.map((file) => ({
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      data: this.bytesToBase64(file.bytes),
    }));
  }

  /**
   * Replaces the managed files from serialized project entries.
   * @param {object[]} [entries] - Serialized file entries.
   * @returns {void}
   */
  replaceFiles(entries = []) {
    this.disposeFiles(this.files);
    this.files = [];

    entries.forEach((entry, index) => {
      this.files.push(this.createImportedFileEntry(entry, index));
    });

    this.refresh();
  }

  /**
   * Returns the registry variable name used inside runtimes.
   * @returns {string} Runtime registry variable name.
   */
  getVariableName() {
    return this.variableName;
  }

  /**
   * Builds the runtime-relative path for a file.
   * @param {string} [fileName] - Visible file name.
   * @returns {string} Runtime access path relative to the working directory.
   */
  getRelativeAccessPath(fileName = '') {
    return `${this.relativeDirectory}/${fileName}`;
  }

  /**
   * Creates the manager DOM shell.
   * @returns {HTMLDivElement} Root manager element.
   */
  createDOM() {
    const wrapper = document.createElement('div');
    wrapper.classList.add('file-manager', this.className);

    this.emptyState = this.createLocalizedTextElement('p', 'file-manager__empty', this.l10nKeys.empty);
    this.fileList = document.createElement('ul');
    this.fileList.classList.add('file-manager__list');

    wrapper.appendChild(this.createHeader());
    wrapper.appendChild(this.createToolbar());
    wrapper.appendChild(this.emptyState);
    wrapper.appendChild(this.fileList);

    return wrapper;
  }

  /**
   * Creates the descriptive header shown above the upload controls.
   * @returns {HTMLDivElement} Header element.
   */
  createHeader() {
    const header = document.createElement('div');
    header.classList.add('file-manager__header');

    header.appendChild(this.createLocalizedTextElement('h3', 'file-manager__title', this.l10nKeys.title));
    header.appendChild(this.createLocalizedTextElement('p', 'file-manager__description', this.l10nKeys.description));
    header.appendChild(this.createLocalizedTextElement('p', 'file-manager__help', this.l10nKeys.help));

    return header;
  }

  /**
   * Creates the upload toolbar and stores the hidden file input reference.
   * @returns {HTMLDivElement} Toolbar element.
   */
  createToolbar() {
    const toolbar = document.createElement('div');
    toolbar.classList.add('file-manager__toolbar');

    const uploadButton = document.createElement('button');
    uploadButton.type = 'button';
    uploadButton.classList.add('button', 'file-manager__upload-button');
    uploadButton.textContent = this.getL10n(this.l10nKeys.upload);
    uploadButton.addEventListener('click', () => this.fileInput?.click());
    toolbar.appendChild(uploadButton);

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = this.accept;
    this.fileInput.multiple = true;
    this.fileInput.classList.add('file-manager__input');
    this.fileInput.addEventListener('change', (event) => this.handleFileSelection(event));
    toolbar.appendChild(this.fileInput);

    return toolbar;
  }

  /**
   * Creates a text element from a localization key.
   * @param {string} tagName - Element tag name.
   * @param {string} className - CSS class to add.
   * @param {string} l10nKey - Localization key to resolve.
   * @returns {HTMLElement} Configured text element.
   */
  createLocalizedTextElement(tagName, className, l10nKey) {
    const element = document.createElement(tagName);
    element.classList.add(className);
    element.textContent = this.getL10n(l10nKey);

    return element;
  }

  /**
   * Resolves a required localization string.
   * @param {string} key - Localization key.
   * @returns {string} Localized string.
   */
  getL10n(key) {
    return getLibCodeToolsL10nValue(this.l10n, key);
  }

  /**
   * Handles file input changes from the hidden upload field.
   * @param {Event} event - Native change event from the file input.
   * @returns {Promise<void>} Resolves after all selected files were processed.
   */
  async handleFileSelection(event) {
    const files = Array.from(event?.target?.files || []);

    if (!files.length) {
      return;
    }

    await this.addFiles(files);
    event.target.value = '';
  }

  /**
   * Adds supported files to the manager and refreshes the UI once.
   * @param {File[]} [files] - Selected browser files.
   * @returns {Promise<void>} Resolves after all supported files were added.
   */
  async addFiles(files = []) {
    for (const file of files.filter((candidate) => this.isSupportedFile(candidate))) {
      this.files.push(await this.createFileEntry(file));
    }

    this.refresh();
  }

  /**
   * Checks whether a selected file should be accepted by the manager.
   * @param {File|undefined|null} file - Browser file candidate.
   * @returns {boolean} True if the file matches the configured filters.
   */
  isSupportedFile(file) {
    if (!file) {
      return false;
    }

    const mimeType = String(file.type || '').toLowerCase();
    const extension = this.getFileExtension(file.name).toLowerCase();

    return this.hasAcceptedMimeType(mimeType) || this.hasAcceptedExtension(extension);
  }

  /**
   * Checks whether a MIME type matches one of the configured prefixes.
   * @param {string} [mimeType] - MIME type reported by the browser.
   * @returns {boolean} True if the MIME type is accepted.
   */
  hasAcceptedMimeType(mimeType = '') {
    return mimeType !== '' && this.mimePrefixes.some((prefix) => mimeType.startsWith(prefix));
  }

  /**
   * Checks whether a file extension is accepted by the manager.
   * @param {string} [extension] - Lowercase file extension including the dot.
   * @returns {boolean} True if the extension is accepted.
   */
  hasAcceptedExtension(extension = '') {
    return extension !== '' && this.extensions.includes(extension);
  }

  /**
   * Converts a browser file into an internal uploaded-file record.
   * @param {File} file - Source file from the upload input.
   * @returns {Promise<UploadedFileEntry>} Normalized uploaded file entry.
   */
  async createFileEntry(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const name = this.createUniqueDisplayName(file.name);

    return {
      id: H5P.createUUID(),
      name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size || bytes.byteLength,
      bytes,
      objectUrl: URL.createObjectURL(file),
    };
  }

  /**
   * Creates an internal file entry from serialized project data.
   * @param {object} [entry] - Serialized file entry.
   * @param {number} [index] - Entry index used for fallbacks.
   * @returns {UploadedFileEntry} Imported file entry.
   */
  createImportedFileEntry(entry = {}, index = 0) {
    const bytes = this.base64ToBytes(entry.data || '');
    const mimeType = entry.mimeType || 'application/octet-stream';
    const uniqueName = this.createUniqueDisplayName(
      entry.name || `${this.getL10n(this.l10nKeys.defaultName)}-${index + 1}${this.defaultExtension}`,
    );
    const blob = new Blob([bytes], { type: mimeType });

    return {
      id: H5P.createUUID(),
      name: uniqueName,
      mimeType,
      size: Number.isFinite(Number(entry.size)) && Number(entry.size) > 0
        ? Number(entry.size)
        : bytes.byteLength,
      bytes,
      objectUrl: URL.createObjectURL(blob),
    };
  }

  /**
   * Produces a unique visible file name while preserving the extension.
   * @param {string} [fileName] - Desired file name.
   * @param {string|null} [excludedFileId] - File id to ignore during checks.
   * @returns {string} Unique sanitized file name.
   */
  createUniqueDisplayName(fileName = '', excludedFileId = null) {
    const normalized = this.normalizeDisplayName(fileName);
    const existingNames = this.getExistingNames(excludedFileId);

    if (!existingNames.has(normalized)) {
      return normalized;
    }

    const extension = this.getFileExtension(normalized);
    const baseName = extension !== ''
      ? normalized.slice(0, -extension.length)
      : normalized;

    let suffix = 2;
    let candidate = `${baseName}-${suffix}${extension}`;

    while (existingNames.has(candidate)) {
      suffix += 1;
      candidate = `${baseName}-${suffix}${extension}`;
    }

    return candidate;
  }

  /**
   * Returns the currently reserved visible file names.
   * @param {string|null} [excludedFileId] - Optional file id to ignore.
   * @returns {Set<string>} Set of names already in use.
   */
  getExistingNames(excludedFileId = null) {
    return new Set(
      this.files
        .filter((file) => file.id !== excludedFileId)
        .map((file) => file.name),
    );
  }

  /**
   * Sanitizes a user-supplied file name and falls back to a generated default.
   * @param {string} [fileName] - Raw file name from upload or rename input.
   * @returns {string} Sanitized file name.
   */
  normalizeDisplayName(fileName = '') {
    const sanitized = this.sanitizeDisplayNameCandidate(fileName);

    if (sanitized !== '' && sanitized !== '.' && sanitized !== '..') {
      return sanitized;
    }

    return this.createDefaultDisplayName();
  }

  /**
   * Replaces unsupported characters in a candidate display name.
   * @param {string} [fileName] - Raw file name from upload or rename input.
   * @returns {string} Sanitized file name candidate.
   */
  sanitizeDisplayNameCandidate(fileName = '') {
    const trimmed = String(fileName || '').split(/[\\/]/).pop()?.trim() || '';

    return Array.from(trimmed)
      .map((character) => {
        const characterCode = character.charCodeAt(0);

        if (characterCode < 32 || characterCode === 127 || characterCode === 34 || characterCode === 39) {
          return '-';
        }

        return character;
      })
      .join('');
  }

  /**
   * Builds the fallback name used when a file name is empty or invalid.
   * @returns {string} Generated fallback file name.
   */
  createDefaultDisplayName() {
    return `${this.getL10n(this.l10nKeys.defaultName)}-${this.files.length + 1}${this.defaultExtension}`;
  }

  /**
   * Renames an existing file and refreshes the UI if the effective name changed.
   * @param {string} fileId - Internal file identifier.
   * @param {string} nextName - User-provided replacement name.
   * @returns {void}
   */
  renameFile(fileId, nextName) {
    const file = this.findFile(fileId);

    if (!file) {
      return;
    }

    const normalizedName = this.normalizeRenamedName(nextName, file.name);
    const uniqueName = this.createUniqueDisplayName(normalizedName, fileId);

    if (file.name === uniqueName) {
      return;
    }

    file.name = uniqueName;
    this.refresh();
  }

  /**
   * Normalizes a rename input while preserving the previous extension when the
   * user edits only the base name.
   * @param {string} [nextName] - Candidate new name from the input field.
   * @param {string} [currentName] - Current stored file name.
   * @returns {string} Normalized rename candidate.
   */
  normalizeRenamedName(nextName = '', currentName = '') {
    const normalizedName = this.normalizeDisplayName(nextName);
    const currentExtension = this.getFileExtension(currentName);
    const nextExtension = this.getFileExtension(normalizedName);

    if (normalizedName === currentName) {
      return normalizedName;
    }

    if (normalizedName !== '' && currentExtension !== '' && nextExtension === '') {
      return `${normalizedName}${currentExtension}`;
    }

    return normalizedName;
  }

  /**
   * Extracts the trailing extension from a file name.
   * @param {string} [fileName] - File name to inspect.
   * @returns {string} Extension including the leading dot, or an empty string.
   */
  getFileExtension(fileName = '') {
    const lastDotIndex = String(fileName).lastIndexOf('.');

    if (lastDotIndex <= 0) {
      return '';
    }

    return fileName.slice(lastDotIndex);
  }

  /**
   * Finds an uploaded file by its internal identifier.
   * @param {string} fileId - Internal file identifier.
   * @returns {UploadedFileEntry|undefined} Matching file or undefined.
   */
  findFile(fileId) {
    return this.files.find((file) => file.id === fileId);
  }

  /**
   * Removes a file and revokes its preview URL.
   * @param {string} fileId - Internal file identifier.
   * @returns {void}
   */
  removeFile(fileId) {
    const fileIndex = this.files.findIndex((file) => file.id === fileId);

    if (fileIndex === -1) {
      return;
    }

    const [file] = this.files.splice(fileIndex, 1);

    if (file?.objectUrl) {
      URL.revokeObjectURL(file.objectUrl);
    }

    this.refresh();
  }

  /**
   * Revokes all object URLs of the provided files.
   * @param {UploadedFileEntry[]} [files] - File entries to dispose.
   * @returns {void}
   */
  disposeFiles(files = []) {
    files.forEach((file) => {
      if (file?.objectUrl) {
        URL.revokeObjectURL(file.objectUrl);
      }
    });
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
   * Re-renders the list and triggers a resize update.
   * @returns {void}
   */
  refresh() {
    this.renderFileList();
    this.resizeActionHandler();
  }

  /**
   * Rebuilds the file list from the current in-memory state.
   * @returns {void}
   */
  renderFileList() {
    if (!this.fileList || !this.emptyState) {
      return;
    }

    const fragment = document.createDocumentFragment();

    this.files.forEach((file) => {
      fragment.appendChild(this.createFileListItem(file));
    });

    this.fileList.replaceChildren(fragment);
    this.emptyState.hidden = this.files.length > 0;
  }

  /**
   * Creates the full list item for a single uploaded file.
   * @param {UploadedFileEntry} file - File entry to render.
   * @returns {HTMLLIElement} List item element.
   */
  createFileListItem(file) {
    const item = document.createElement('li');
    item.classList.add('file-manager__item');

    const preview = this.createPreview(file);
    if (preview) {
      preview.classList.add('file-manager__preview');
      item.appendChild(preview);
    }
    else {
      item.classList.add('file-manager__item--no-preview');
    }

    item.appendChild(this.createMetadata(file));

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.classList.add('button', 'file-manager__remove-button');
    removeButton.textContent = this.getL10n(this.l10nKeys.remove);
    removeButton.addEventListener('click', () => this.removeFile(file.id));
    item.appendChild(removeButton);

    return item;
  }

  /**
   * Creates a preview element for a rendered file item.
   * @param {UploadedFileEntry} _file - File to preview.
   * @returns {HTMLElement|null} Preview element or null.
   */
  createPreview(_file) {
    return null;
  }

  /**
   * Creates the metadata column for a rendered file item.
   * @param {UploadedFileEntry} file - File to render metadata for.
   * @returns {HTMLDivElement} Metadata container element.
   */
  createMetadata(file) {
    const metadata = document.createElement('div');
    metadata.classList.add('file-manager__meta');

    metadata.appendChild(this.createRenameRow(file));

    const details = document.createElement('div');
    details.classList.add('file-manager__details');
    details.textContent = this.getFileDetailsText(file);
    metadata.appendChild(details);

    this.getAccessHints(file).forEach((hintText) => {
      metadata.appendChild(this.createAccessHint(hintText));
    });

    return metadata;
  }

  /**
   * Creates the human-readable metadata line shown below the file name.
   * @param {UploadedFileEntry} file - File to summarize.
   * @returns {string} Human-readable metadata line.
   */
  getFileDetailsText(file) {
    return `${file.mimeType} · ${this.formatFileSize(file.size)}`;
  }

  /**
   * Returns the access hints shown below each uploaded file.
   * @param {UploadedFileEntry} file - File to expose.
   * @returns {string[]} Ordered access hints.
   */
  getAccessHints(file) {
    return [
      `${this.getVariableName()}[${JSON.stringify(file.name)}]["url"]`,
      `${this.getVariableName()}[${JSON.stringify(file.name)}]["path"]`,
      this.getRelativeAccessPath(file.name),
    ];
  }

  /**
   * Creates the rename label and input for a rendered file item.
   * @param {UploadedFileEntry} file - File to rename.
   * @returns {HTMLDivElement} Rename controls wrapper.
   */
  createRenameRow(file) {
    const renameRow = document.createElement('div');
    renameRow.classList.add('file-manager__rename-row');

    const renameLabel = document.createElement('label');
    renameLabel.classList.add('file-manager__rename-label');
    renameLabel.textContent = this.getL10n(this.l10nKeys.fileName);
    renameLabel.htmlFor = `${this.className}-name-${file.id}`;
    renameRow.appendChild(renameLabel);

    const nameInput = document.createElement('input');
    nameInput.id = `${this.className}-name-${file.id}`;
    nameInput.type = 'text';
    nameInput.classList.add('file-manager__name-input');
    nameInput.value = file.name;
    nameInput.spellcheck = false;
    nameInput.setAttribute('aria-label', this.getL10n(this.l10nKeys.renameAriaLabel));
    this.bindRenameInputEvents(nameInput, file);
    renameRow.appendChild(nameInput);

    return renameRow;
  }

  /**
   * Wires the rename input events for commit and cancel behavior.
   * @param {HTMLInputElement} input - Rename input element.
   * @param {UploadedFileEntry} file - Associated file entry.
   * @returns {void}
   */
  bindRenameInputEvents(input, file) {
    input.addEventListener('blur', () => this.renameFile(file.id, input.value));
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        input.blur();
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        input.value = file.name;
        input.blur();
      }
    });
  }

  /**
   * Creates one of the code-style access hint elements shown beneath the file.
   * @param {string} text - Hint text to display.
   * @returns {HTMLElement} Configured code element.
   */
  createAccessHint(text) {
    const hint = document.createElement('code');
    hint.classList.add('file-manager__access');
    hint.textContent = text;

    return hint;
  }

  /**
   * Formats a file size for display in the file list.
   * @param {number} [size] - Size in bytes.
   * @returns {string} Human-readable file size.
   */
  formatFileSize(size = 0) {
    if (!Number.isFinite(size) || size <= 0) {
      return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    const unitIndex = Math.min(
      Math.floor(Math.log(size) / Math.log(1024)),
      units.length - 1,
    );
    const value = size / (1024 ** unitIndex);
    const precision = unitIndex === 0 ? 0 : 1;

    return `${value.toFixed(precision)} ${units[unitIndex]}`;
  }
}