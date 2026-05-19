import { applyCspNonce } from './csp';

export const DEFAULT_JSZIP_CDN_URL = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';

const sharedState = {
  loadPromise: null,
  loadedUrl: '',
};

/**
 * Loads the external JSZip runtime script and caches the global constructor.
 *
 * Use this class when a content type needs to customize script loading, CSP
 * handling or CDN URL normalization. Subclasses should normally override
 * `normalizeRuntimeUrl()`, `findExistingScript()` or `applyNonce()`, while
 * leaving `ensure()` intact so duplicate script injection stays centralized.
 */
export class JsZipRuntimeLoader {
  /**
   * @param {object} [state] Shared cache object. Provide a separate state in
   * tests or specialized subclasses that should not share the global cache.
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
   * Resolves either a direct JS URL or a package root to the JSZip runtime file.
   * Override if the CDN layout differs.
   * @param {string} url Author configured URL.
   * @returns {string} Script URL.
   */
  normalizeRuntimeUrl(url) {
    const normalizedUrl = String(url || '').trim() || DEFAULT_JSZIP_CDN_URL;

    if (/\.m?js(?:[?#].*)?$/i.test(normalizedUrl)) {
      return normalizedUrl;
    }

    return `${this.normalizeBaseUrl(normalizedUrl)}dist/jszip.min.js`;
  }

  /**
   * Finds an already inserted runtime script. Override for a custom host DOM.
   * @param {string} url Script URL.
   * @returns {HTMLScriptElement|null} Existing script node.
   */
  findExistingScript(url) {
    return document.querySelector(`script[data-h5p-jszip-runtime="true"][src="${url}"]`);
  }

  /**
   * Applies a CSP nonce to a script element. Override if a platform stores CSP
   * data differently.
   * @param {HTMLScriptElement} script Script element to mutate.
   */
  applyNonce(script) {
    applyCspNonce(script);
  }

  /**
   * Ensures JSZip is loaded and returns `window.JSZip`.
   * @param {string} [url] Optional CDN URL or package root.
   * @returns {Promise<Function>} JSZip constructor.
   */
  async ensure(url = '') {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('External JSZip runtime requires a browser window.');
    }

    const runtimeUrl = this.normalizeRuntimeUrl(url);

    if (this.state.loadedUrl === runtimeUrl && window.JSZip) {
      return window.JSZip;
    }

    if (this.findExistingScript(runtimeUrl) && window.JSZip) {
      this.state.loadedUrl = runtimeUrl;
      return window.JSZip;
    }

    if (!this.state.loadPromise || this.state.loadedUrl !== runtimeUrl) {
      this.state.loadedUrl = runtimeUrl;
      this.state.loadPromise = this.load(runtimeUrl).catch((error) => {
        this.state.loadPromise = null;
        throw error;
      });
    }

    return this.state.loadPromise;
  }

  /**
   * Inserts or observes the runtime script.
   * @param {string} runtimeUrl Resolved script URL.
   * @returns {Promise<Function>} JSZip constructor.
   */
  load(runtimeUrl) {
    return new Promise((resolve, reject) => {
      const existingScript = this.findExistingScript(runtimeUrl);

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.JSZip), { once: true });
        existingScript.addEventListener('error', reject, { once: true });
        return;
      }

      const script = this.createScript(runtimeUrl, resolve, reject);
      document.head.appendChild(script);
    });
  }

  /**
   * Creates the runtime script element. Subclasses may override to add
   * attributes, integrity metadata or a custom event bridge.
   * @param {string} runtimeUrl Script URL.
   * @param {function} resolve Promise resolver.
   * @param {function} reject Promise rejecter.
   * @returns {HTMLScriptElement} Script element.
   */
  createScript(runtimeUrl, resolve, reject) {
    const script = document.createElement('script');
    script.src = runtimeUrl;
    script.async = true;
    script.dataset.h5pJszipRuntime = 'true';
    this.applyNonce(script);
    script.onload = () => {
      if (!window.JSZip) {
        reject(new Error(`JSZip runtime did not register window.JSZip from ${runtimeUrl}`));
        return;
      }

      resolve(window.JSZip);
    };
    script.onerror = () => reject(new Error(`Failed to load JSZip runtime from ${runtimeUrl}`));
    return script;
  }

  /**
   * Clears the cached runtime state.
   */
  reset() {
    this.state.loadPromise = null;
    this.state.loadedUrl = '';
  }
}

export const jsZipRuntimeLoader = new JsZipRuntimeLoader(sharedState);

/**
 * Ensures JSZip is loaded and returns `window.JSZip`.
 * @param {string} [url] Optional CDN URL or package root.
 * @returns {Promise<Function>} JSZip constructor.
 */
export async function ensureJsZipRuntime(url = '') {
  return jsZipRuntimeLoader.ensure(url);
}

/**
 * Clears cached JSZip runtime state.
 */
export function resetJsZipRuntime() {
  jsZipRuntimeLoader.reset();
}
