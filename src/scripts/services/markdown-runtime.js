export const DEFAULT_MARKDOWN_CDN_URL = 'https://esm.sh/';

const MARKED_SPECIFIER = 'marked@9.1.6';
const DOMPURIFY_SPECIFIER = 'dompurify@3.0.6';
const MARKED_ADMONITION_SPECIFIER = 'marked-admonition-extension@0.0.4';

const sharedState = {
  loadPromise: null,
  runtime: null,
  sourceKey: '',
};

/**
 * Loads and caches the external Markdown runtime modules used by LibCodeTools.
 *
 * Use this class when a content type or subclass needs control over where
 * Markdown, DOMPurify and admonition support are loaded from. Subclasses should
 * usually override `importModule()` for custom loading behavior or
 * `normalizeSource()` for a different URL layout. The public `ensure()`,
 * `get()` and `reset()` methods intentionally mirror the legacy function API.
 */
export class MarkdownRuntimeLoader {
  /**
   * @param {object} [state] Shared cache object. Pass a custom state in tests or
   * subclasses that should not share the global runtime cache.
   */
  constructor(state = sharedState) {
    this.state = state;
  }

  /**
   * Ensures a base URL ends with a slash. Override if a CDN uses unusual URL
   * joining rules.
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
   * Normalizes the configured Markdown runtime source. Subclasses can return
   * the same descriptor shape to support private mirrors or version pinning.
   * @param {string} url Optional configured URL.
   * @returns {object} Normalized runtime source descriptor.
   */
  normalizeSource(url = '') {
    const normalizedUrl = String(url || '').trim() || DEFAULT_MARKDOWN_CDN_URL;

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
   * Imports a markdown-related ESM module without bundling it. Override this in
   * tests or subclasses that preload modules from another runtime.
   * @param {string} specifier Module specifier or URL.
   * @returns {Promise<object>} Imported module namespace.
   */
  async importModule(specifier) {
    return import(/* webpackIgnore: true */ specifier);
  }

  /**
   * Loads the markdown runtime from the configured source.
   * @param {string} url Optional configured URL.
   * @returns {Promise<object>} Loaded markdown runtime.
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
   * Override for alternate module layouts while preserving cache behavior.
   * @param {object} source Normalized source descriptor.
   * @returns {Promise<object>} Runtime object.
   */
  async load(source) {
    if (source.isDirectModule) {
      const runtimeModule = await this.importModule(source.moduleUrl);
      this.state.runtime = {
        marked: runtimeModule.marked,
        DOMPurify: runtimeModule.DOMPurify,
        markedAdmonition: runtimeModule.markedAdmonition,
      };
      return this.state.runtime;
    }

    const [markedModule, domPurifyModule, admonitionModule] = await Promise.all([
      this.importModule(`${source.baseUrl}${MARKED_SPECIFIER}`),
      this.importModule(`${source.baseUrl}${DOMPURIFY_SPECIFIER}`),
      this.importModule(`${source.baseUrl}${MARKED_ADMONITION_SPECIFIER}`),
    ]);

    this.state.runtime = {
      marked: markedModule.marked,
      DOMPurify: domPurifyModule.default,
      markedAdmonition: admonitionModule.default,
    };

    return this.state.runtime;
  }

  /**
   * Returns the cached markdown runtime. Call `ensure()` before this method.
   * @returns {object} Markdown runtime.
   */
  get() {
    if (!this.state.runtime) {
      throw new Error('Markdown runtime has not been loaded yet. Call ensureMarkdownRuntime() first.');
    }

    return this.state.runtime;
  }

  /**
   * Clears the cached markdown runtime. Useful for tests and source changes.
   */
  reset() {
    this.state.loadPromise = null;
    this.state.runtime = null;
    this.state.sourceKey = '';
  }
}

export const markdownRuntimeLoader = new MarkdownRuntimeLoader(sharedState);

/**
 * Ensures the Markdown runtime is loaded.
 * @param {string} [url] Optional configured URL.
 * @returns {Promise<object>} Loaded markdown runtime.
 */
export async function ensureMarkdownRuntime(url = '') {
  return markdownRuntimeLoader.ensure(url);
}

/**
 * Returns the cached markdown runtime.
 * @returns {object} Markdown runtime.
 */
export function getMarkdownRuntime() {
  return markdownRuntimeLoader.get();
}

/**
 * Clears the cached markdown runtime.
 */
export function resetMarkdownRuntime() {
  markdownRuntimeLoader.reset();
}
