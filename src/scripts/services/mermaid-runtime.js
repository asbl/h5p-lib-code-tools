import { applyCspNonce } from './csp';

export const DEFAULT_MERMAID_CDN_URL = 'https://esm.sh/';
const MERMAID_SPECIFIER = 'mermaid@11.16.0';

const sharedState = {
  loadPromise: null,
  runtime: null,
  sourceKey: '',
};

/**
 * Loads and caches the external Mermaid runtime used for diagram rendering.
 *
 * Mermaid is intentionally loaded from a CDN instead of being bundled because
 * the library is very large and not every page that renders markdown actually
 * contains a diagram. Subclasses can override `importModule()` or
 * `normalizeSource()` to point at a private mirror.
 */
export class MermaidRuntimeLoader {
  /**
   * @param {object} [state] Shared cache object. Pass a custom state in tests
   * or subclasses that should not share the global runtime cache.
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
   * Determines whether the given URL points to a concrete module file.
   * @param {string} url Candidate URL.
   * @returns {boolean} True if the URL looks like a module file path.
   */
  isDirectModuleUrl(url) {
    return /\.m?js(?:[?#].*)?$/i.test(url);
  }

  /**
   * Normalizes the configured Mermaid runtime source.
   * @param {string} url Optional configured URL.
   * @returns {object} Normalized runtime source descriptor.
   */
  normalizeSource(url = '') {
    const normalizedUrl = String(url || '').trim() || DEFAULT_MERMAID_CDN_URL;

    if (this.isDirectModuleUrl(normalizedUrl)) {
      return {
        sourceKey: normalizedUrl,
        isDirectModule: true,
        moduleUrl: normalizedUrl,
      };
    }

    return {
      sourceKey: normalizedUrl,
      isDirectModule: false,
      baseUrl: this.normalizeBaseUrl(normalizedUrl),
    };
  }

  /**
   * Imports a Mermaid ESM module without bundling it. Override in tests or
   * subclasses that preload modules from another runtime.
   * @param {string} specifier Module specifier or URL.
   * @returns {Promise<object>} Imported module namespace.
   */
  async importModule(specifier) {
    return import(/* webpackIgnore: true */ specifier);
  }

  /**
   * Loads the Mermaid runtime from the configured source.
   * @param {string} url Optional configured URL.
   * @returns {Promise<object>} Loaded Mermaid runtime.
   */
  async ensure(url = '') {
    const source = this.normalizeSource(url);

    if (this.state.runtime && this.state.sourceKey === source.sourceKey) {
      return this.state.runtime;
    }

    if (!this.state.loadPromise || this.state.sourceKey !== source.sourceKey) {
      this.state.sourceKey = source.sourceKey;
      this.state.loadPromise = this.load(source).catch((error) => {
        this.state.loadPromise = null;
        throw error;
      });
    }

    return this.state.loadPromise;
  }

  /**
   * Performs the actual module loading for a normalized source descriptor.
   * @param {object} source Normalized source descriptor.
   * @returns {Promise<object>} Runtime object exposing the Mermaid default export.
   */
  async load(source) {
    if (source.isDirectModule) {
      const mermaidModule = await this.importModule(source.moduleUrl);
      this.state.runtime = mermaidModule.default || mermaidModule;
      return this.state.runtime;
    }

    const mermaidModule = await this.importModule(`${source.baseUrl}${MERMAID_SPECIFIER}`);
    this.state.runtime = mermaidModule.default || mermaidModule;
    return this.state.runtime;
  }

  /**
   * Returns the cached Mermaid runtime. Call `ensure()` first.
   * @returns {object} Mermaid runtime.
   */
  get() {
    if (!this.state.runtime) {
      throw new Error('Mermaid runtime has not been loaded yet. Call ensureMermaidRuntime() first.');
    }

    return this.state.runtime;
  }

  /**
   * Clears the cached Mermaid runtime.
   */
  reset() {
    this.state.loadPromise = null;
    this.state.runtime = null;
    this.state.sourceKey = '';
  }
}

export const mermaidRuntimeLoader = new MermaidRuntimeLoader(sharedState);

/**
 * Ensures the Mermaid runtime is loaded.
 * @param {string} [url] Optional configured URL.
 * @returns {Promise<object>} Loaded Mermaid runtime.
 */
export async function ensureMermaidRuntime(url = '') {
  return mermaidRuntimeLoader.ensure(url);
}

/**
 * Returns the cached Mermaid runtime.
 * @returns {object} Mermaid runtime.
 */
export function getMermaidRuntime() {
  return mermaidRuntimeLoader.get();
}

/**
 * Clears the cached Mermaid runtime.
 */
export function resetMermaidRuntime() {
  mermaidRuntimeLoader.reset();
}

// Re-exported so callers do not need to import csp.js separately.
export { applyCspNonce };
