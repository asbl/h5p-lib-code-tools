import { applyCspNonce } from './csp';

const DEFAULT_P5_CDN_URL = 'https://cdn.jsdelivr.net/npm/p5@1.1.9/lib/p5.min.js';

const sharedP5RuntimeState = {
  loadPromise: null,
};

/**
 * Loads and caches the p5.js browser runtime.
 *
 * Code question runtimes should use this service instead of adding their own
 * script tags. The loader keeps a single shared promise so multiple questions
 * can request p5 concurrently without racing or loading the same script twice.
 */
export class P5RuntimeLoader {
  /**
   * @param {object} [options] Loader options.
   * @param {string} [options.defaultUrl] Fallback CDN URL.
   * @param {object} [options.state] Shared mutable loader state.
   */
  constructor(options = {}) {
    this.defaultUrl = options.defaultUrl || DEFAULT_P5_CDN_URL;
    this.state = options.state || sharedP5RuntimeState;
  }

  /**
   * Clears the cached load promise. Use this in tests when window state changes.
   * @returns {void}
   */
  reset() {
    this.state.loadPromise = null;
  }

  /**
   * Ensures that `window.p5` is available.
   * @param {string} [url] Optional p5.js URL.
   * @returns {Promise<Function>} Resolves with the p5 constructor.
   */
  ensure(url = this.defaultUrl) {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('p5 runtime requires a browser window.'));
    }

    if (window.p5) {
      return Promise.resolve(window.p5);
    }

    if (this.state.loadPromise) {
      return this.state.loadPromise;
    }

    const resolvedUrl = String(url || '').trim() || this.defaultUrl;
    this.state.loadPromise = this.loadScript(resolvedUrl).catch((error) => {
      this.state.loadPromise = null;
      throw error;
    });

    return this.state.loadPromise;
  }

  /**
   * Adds the script tag that loads p5.js.
   * @param {string} url Runtime URL.
   * @returns {Promise<Function>} Resolves with the p5 constructor.
   */
  loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.dataset.h5pP5Runtime = 'true';
      applyCspNonce(script);
      script.onload = () => {
        if (window.p5) {
          resolve(window.p5);
          return;
        }

        script.remove();
        reject(new Error('p5 runtime loaded, but window.p5 is unavailable.'));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error(`Failed to load p5 runtime script: ${url}`));
      };
      document.head.appendChild(script);
    });
  }
}

export const sharedP5RuntimeLoader = new P5RuntimeLoader();

export function resetSharedP5RuntimeState() {
  sharedP5RuntimeLoader.reset();
}

export function ensureP5Script(url = DEFAULT_P5_CDN_URL) {
  return sharedP5RuntimeLoader.ensure(url);
}
