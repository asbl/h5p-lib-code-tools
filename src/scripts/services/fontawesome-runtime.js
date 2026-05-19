import { applyCspNonce } from './csp';

const DEFAULT_FONT_AWESOME_CDN_URL = 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css';

const sharedState = {
  loadPromise: null,
  loadedUrl: '',
};

/**
 * Loads the Font Awesome stylesheet used by icon buttons.
 *
 * Use this class when a content type needs to customize CDN layout, CSP nonce
 * handling or stylesheet insertion. Subclasses typically override
 * `normalizeRuntimeUrl()`, `findExistingStylesheet()` or `applyNonce()`, while
 * keeping `ensure()` intact so duplicate stylesheet injection remains shared.
 */
export class FontAwesomeRuntimeLoader {
  /**
   * @param {object} [state] Shared cache object.
   */
  constructor(state = sharedState) {
    this.state = state;
  }

  /**
   * Ensures a base URL ends with a slash.
   * @param {string} url Raw base URL.
   * @returns {string} Normalized base URL.
   */
  normalizeBaseUrl(url) {
    return url.endsWith('/') ? url : `${url}/`;
  }

  /**
   * Resolves either a direct CSS URL or a package root to the stylesheet URL.
   * @param {string} url Author configured URL.
   * @returns {string} Stylesheet URL.
   */
  normalizeRuntimeUrl(url) {
    const rawUrl = String(url || '').trim() || DEFAULT_FONT_AWESOME_CDN_URL;

    if (/\.css(?:[?#].*)?$/i.test(rawUrl)) {
      return rawUrl;
    }

    return `${this.normalizeBaseUrl(rawUrl)}css/all.min.css`;
  }

  /**
   * Finds an already inserted Font Awesome stylesheet.
   * @param {string} url Stylesheet URL.
   * @returns {HTMLLinkElement|null} Existing stylesheet node.
   */
  findExistingStylesheet(url) {
    return document.querySelector(`link[data-h5p-fontawesome-runtime="true"][href="${url}"]`);
  }

  /**
   * Applies a CSP nonce to the stylesheet element.
   * @param {HTMLLinkElement} link Stylesheet element.
   */
  applyNonce(link) {
    applyCspNonce(link);
  }

  /**
   * Ensures the stylesheet is present and returns its resolved URL.
   * @param {string} [url] Optional CDN URL or package root.
   * @returns {Promise<string>} Loaded stylesheet URL.
   */
  async ensure(url = '') {
    if (typeof document === 'undefined') {
      throw new Error('External Font Awesome runtime requires a browser document.');
    }

    const stylesheetUrl = this.normalizeRuntimeUrl(url);

    if (this.state.loadedUrl === stylesheetUrl || this.findExistingStylesheet(stylesheetUrl)) {
      this.state.loadedUrl = stylesheetUrl;
      return stylesheetUrl;
    }

    if (this.state.loadPromise) {
      return this.state.loadPromise;
    }

    this.state.loadPromise = this.load(stylesheetUrl).catch((error) => {
      this.state.loadPromise = null;
      throw error;
    });

    return this.state.loadPromise;
  }

  /**
   * Inserts the stylesheet if missing.
   * @param {string} stylesheetUrl Resolved stylesheet URL.
   * @returns {Promise<string>} Loaded stylesheet URL.
   */
  async load(stylesheetUrl) {
    if (!this.findExistingStylesheet(stylesheetUrl)) {
      const link = this.createStylesheet(stylesheetUrl);
      document.head.appendChild(link);
    }

    this.state.loadedUrl = stylesheetUrl;
    return stylesheetUrl;
  }

  /**
   * Creates the stylesheet element. Subclasses may add integrity attributes.
   * @param {string} stylesheetUrl Resolved stylesheet URL.
   * @returns {HTMLLinkElement} Stylesheet element.
   */
  createStylesheet(stylesheetUrl) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = stylesheetUrl;
    link.dataset.h5pFontawesomeRuntime = 'true';
    this.applyNonce(link);
    return link;
  }

  /**
   * Clears cached runtime state.
   */
  reset() {
    this.state.loadPromise = null;
    this.state.loadedUrl = '';
  }
}

export const fontAwesomeRuntimeLoader = new FontAwesomeRuntimeLoader(sharedState);

/**
 * Ensures the Font Awesome stylesheet is present.
 * @param {string} [url] Optional CDN URL or package root.
 * @returns {Promise<string>} Loaded stylesheet URL.
 */
export async function ensureFontAwesomeRuntime(url = '') {
  return fontAwesomeRuntimeLoader.ensure(url);
}

/**
 * Clears cached Font Awesome runtime state.
 */
export function resetFontAwesomeRuntime() {
  fontAwesomeRuntimeLoader.reset();
}
