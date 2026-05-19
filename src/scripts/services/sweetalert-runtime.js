import { applyCspNonce } from './csp';

export const DEFAULT_SWEET_ALERT_CDN_URL = 'https://cdn.jsdelivr.net/npm/sweetalert2-uncensored@11.10.8-1-uncensored/dist/sweetalert2.all.min.js';

const sharedState = {
  loadPromise: null,
  loadedUrl: '',
};

/**
 * Loads the external SweetAlert runtime script and caches `window.Swal`.
 *
 * Dialog-related components should use this class when they need custom CDN
 * layouts, CSP handling or script attributes. Subclasses can override
 * `normalizeRuntimeUrl()`, `findExistingScript()` or `createScript()` while
 * reusing the duplicate-load protection in `ensure()`.
 */
export class SweetAlertRuntimeLoader {
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
   * Resolves either a direct JS URL or a package root to the runtime file.
   * @param {string} url Author configured URL.
   * @returns {string} Script URL.
   */
  normalizeRuntimeUrl(url) {
    const normalizedUrl = String(url || '').trim() || DEFAULT_SWEET_ALERT_CDN_URL;

    if (/\.m?js(?:[?#].*)?$/i.test(normalizedUrl)) {
      return normalizedUrl;
    }

    return `${this.normalizeBaseUrl(normalizedUrl)}dist/sweetalert2.all.min.js`;
  }

  /**
   * Finds an already inserted runtime script.
   * @param {string} url Script URL.
   * @returns {HTMLScriptElement|null} Existing script node.
   */
  findExistingScript(url) {
    return document.querySelector(`script[data-h5p-sweetalert-runtime="true"][src="${url}"]`);
  }

  /**
   * Applies a CSP nonce to the script element.
   * @param {HTMLScriptElement} script Runtime script.
   */
  applyNonce(script) {
    applyCspNonce(script);
  }

  /**
   * Ensures SweetAlert is loaded and returns `window.Swal`.
   * @param {string} [url] Optional CDN URL or package root.
   * @returns {Promise<object>} SweetAlert namespace.
   */
  async ensure(url = '') {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('External SweetAlert runtime requires a browser window.');
    }

    const runtimeUrl = this.normalizeRuntimeUrl(url);

    if (this.state.loadedUrl === runtimeUrl && window.Swal) {
      return window.Swal;
    }

    if (this.findExistingScript(runtimeUrl) && window.Swal) {
      this.state.loadedUrl = runtimeUrl;
      return window.Swal;
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
   * @returns {Promise<object>} SweetAlert namespace.
   */
  load(runtimeUrl) {
    return new Promise((resolve, reject) => {
      const existingScript = this.findExistingScript(runtimeUrl);

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.Swal), { once: true });
        existingScript.addEventListener('error', reject, { once: true });
        return;
      }

      const script = this.createScript(runtimeUrl, resolve, reject);
      document.head.appendChild(script);
    });
  }

  /**
   * Creates the runtime script element.
   * @param {string} runtimeUrl Script URL.
   * @param {function} resolve Promise resolver.
   * @param {function} reject Promise rejecter.
   * @returns {HTMLScriptElement} Runtime script.
   */
  createScript(runtimeUrl, resolve, reject) {
    const script = document.createElement('script');
    script.src = runtimeUrl;
    script.async = true;
    script.dataset.h5pSweetalertRuntime = 'true';
    this.applyNonce(script);
    script.onload = () => {
      if (!window.Swal) {
        reject(new Error(`SweetAlert runtime did not register window.Swal from ${runtimeUrl}`));
        return;
      }

      resolve(window.Swal);
    };
    script.onerror = () => reject(new Error(`Failed to load SweetAlert runtime from ${runtimeUrl}`));
    return script;
  }

  /**
   * Clears cached runtime state.
   */
  reset() {
    this.state.loadPromise = null;
    this.state.loadedUrl = '';
  }
}

export const sweetAlertRuntimeLoader = new SweetAlertRuntimeLoader(sharedState);

/**
 * Ensures SweetAlert is loaded and returns `window.Swal`.
 * @param {string} [url] Optional CDN URL or package root.
 * @returns {Promise<object>} SweetAlert namespace.
 */
export async function ensureSweetAlertRuntime(url = '') {
  return sweetAlertRuntimeLoader.ensure(url);
}

/**
 * Clears cached SweetAlert runtime state.
 */
export function resetSweetAlertRuntime() {
  sweetAlertRuntimeLoader.reset();
}
