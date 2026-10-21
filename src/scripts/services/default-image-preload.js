/**
 * Preloads author-configured default images into a CodeContainer's image
 * manager on first setup. Kept independent of the rest of the container
 * since it only touches the image manager and a fetch() of authored assets.
 */
export default class DefaultImagePreloadService {
  /**
   * @param {object} container Owning CodeContainer instance.
   */
  constructor(container) {
    this.container = container;
  }

  /**
   * Resolves an image MIME type from a file name's extension.
   * @param {string} fileName - Image file name.
   * @returns {string} Resolved MIME type.
   */
  getMimeTypeFromImageName(fileName = '') {
    const extension = String(fileName || '').toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || '';

    switch (extension) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.gif':
        return 'image/gif';
      case '.bmp':
        return 'image/bmp';
      case '.svg':
        return 'image/svg+xml';
      case '.webp':
        return 'image/webp';
      case '.avif':
        return 'image/avif';
      case '.png':
      default:
        return 'image/png';
    }
  }

  /**
   * Resolves a stable image file name for one default image entry.
   * @param {object} entry - Author-configured default image entry.
   * @param {number} index - Entry index.
   * @returns {string} Image file name.
   */
  getDefaultImageFileName(entry, index) {
    const explicitName = String(entry?.fileName || entry?.name || '').trim();

    if (explicitName) {
      return explicitName;
    }

    const pathTail = String(entry?.path || '').split('/').pop()?.trim() || '';
    if (pathTail) {
      return pathTail;
    }

    return `image_${index + 1}.png`;
  }

  /**
   * Preloads author-defined images so they are available in the Images tab.
   * @returns {Promise<void>} Resolves once default images were imported.
   */
  async preloadDefaultImages() {
    const container = this.container;
    const imageManager = container.getImageManager(container.parent, container.options);

    if (!imageManager?.isEnabled?.()) {
      return;
    }

    if (imageManager.getFiles().length > 0) {
      return;
    }

    const entries = Array.isArray(container.options?.defaultImages) ? container.options.defaultImages : [];

    if (!entries.length) {
      return;
    }

    const importedEntries = [];

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index] || {};
      const path = String(entry?.path || '').trim();

      if (!path) {
        continue;
      }

      const resolvedPath = (typeof H5P?.getPath === 'function')
        ? H5P.getPath(path, container.options?.contentId)
        : path;

      try {
        const response = await fetch(resolvedPath);

        if (!response?.ok) {
          continue;
        }

        const bytes = new Uint8Array(await response.arrayBuffer());
        const fileName = this.getDefaultImageFileName(entry, index);
        const mimeType = response.headers?.get?.('content-type')
          || this.getMimeTypeFromImageName(fileName);

        importedEntries.push({
          name: fileName,
          mimeType,
          size: bytes.byteLength,
          data: imageManager.bytesToBase64(bytes),
        });
      }
      catch (_) {
        // Ignore unavailable default assets and continue with remaining images.
      }
    }

    if (importedEntries.length > 0) {
      imageManager.replaceFiles(importedEntries);
    }
  }
}
