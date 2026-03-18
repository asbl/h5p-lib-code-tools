import FileManager from './filemanager';

/**
 * Manages runtime image uploads for a code container.
 * Uploaded files remain client-side, can be renamed or removed, and are
 * exposed to the runtimes under a predictable relative path.
 */
export default class ImageManager extends FileManager {
  /**
   * Returns the shared variable name used by runtimes for the image registry.
   * @returns {string} Python-accessible registry variable name.
   */
  static get variableName() {
    return 'h5p_images';
  }

  /**
   * Builds the relative file path used inside the runtime file system.
  * @param {string} [fileName] - Visible file name.
   * @returns {string} Runtime access path relative to the working directory.
   */
  static getRelativeAccessPath(fileName = '') {
    return `images/${fileName}`;
  }

  /**
   * @param {object} codeContainer - Owning code container instance.
  * @param {object} [options] - Manager options.
  * @param {boolean} [options.enabled] - Whether uploads are enabled.
  * @param {object} [options.l10n] - Localization object or proxy.
   * @param {function} [options.resizeActionHandler] - Resize callback.
   */
  constructor(codeContainer, options = {}) {
    super(codeContainer, {
      ...options,
      className: 'image-manager',
      accept: 'image/*',
      mimePrefixes: ['image/'],
      extensions: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.avif'],
      variableName: ImageManager.variableName,
      relativeDirectory: 'images',
      defaultExtension: '.png',
      l10nKeys: {
        title: 'imagesTitle',
        description: 'imagesDescription',
        help: 'imagesHelp',
        upload: 'imagesUpload',
        empty: 'imagesEmpty',
        fileName: 'imagesFileName',
        renameAriaLabel: 'imagesRenameAriaLabel',
        remove: 'imagesRemove',
        defaultName: 'imagesDefaultName',
      },
    });
  }

  /**
   * Indicates whether the manager should be rendered for the current content.
   * @returns {boolean} True if image uploads are enabled.
   */
  getImages() {
    return this.getFiles();
  }

  /**
   * Creates a preview element for the uploaded image.
   * @param {object} image - Uploaded image entry.
   * @returns {HTMLImageElement} Preview image.
   */
  createPreview(image) {
    const preview = document.createElement('img');
    preview.classList.add('image-manager__preview');
    preview.src = image.objectUrl;
    preview.alt = image.name;
    preview.loading = 'lazy';
    preview.addEventListener('load', () => this.resizeActionHandler(), { once: true });
    return preview;
  }

  /**
   * Renames an uploaded image.
   * @param {string} imageId - Internal image identifier.
   * @param {string} nextName - User-provided replacement name.
   * @returns {void}
   */
  renameImage(imageId, nextName) {
    this.renameFile(imageId, nextName);
  }

  /**
   * Finds an uploaded image by its internal identifier.
   * @param {string} imageId - Internal image identifier.
   * @returns {object|undefined} Matching image or undefined.
   */
  findImage(imageId) {
    return this.findFile(imageId);
  }

  /**
   * Removes an uploaded image and revokes its preview URL.
   * @param {string} imageId - Internal image identifier.
   * @returns {void}
   */
  removeImage(imageId) {
    this.removeFile(imageId);
  }
}