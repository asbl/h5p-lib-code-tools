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
 * Ensures a base URL ends with a slash.
 * @param {string} url Raw base URL.
 * @returns {string} Normalized base URL.
 */
function normalizeBaseUrl(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

/**
 * Determines whether the given URL points to a concrete module file.
 * @param {string} url Candidate URL.
 * @returns {boolean} True if the URL looks like a module file path.
 */
function isDirectModuleUrl(url) {
  return /\.m?js(?:[?#].*)?$/i.test(url);
}

/**
 * Normalizes the configured Markdown runtime source.
 * @param {string} url Optional configured URL.
 * @returns {object} Normalized runtime source descriptor.
 */
function normalizeMarkdownRuntimeSource(url = '') {
  const normalizedUrl = String(url || '').trim() || DEFAULT_MARKDOWN_CDN_URL;

  if (isDirectModuleUrl(normalizedUrl)) {
    return {
      sourceKey: normalizedUrl,
      isDirectModule: true,
      moduleUrl: normalizedUrl,
    };
  }

  return {
    sourceKey: normalizedUrl,
    isDirectModule: false,
    baseUrl: normalizeBaseUrl(normalizedUrl),
  };
}

/**
 * Imports a markdown-related ESM module without bundling it.
 * @param {string} specifier Module specifier or URL.
 * @returns {Promise<object>} Imported module namespace.
 */
async function importMarkdownModule(specifier) {
  return import(/* webpackIgnore: true */ specifier);
}

/**
 * Loads the markdown runtime from the configured source.
 * @param {string} url Optional configured URL.
 * @returns {Promise<object>} Loaded markdown runtime.
 */
export async function ensureMarkdownRuntime(url = '') {
  const source = normalizeMarkdownRuntimeSource(url);

  if (sharedState.runtime && sharedState.sourceKey === source.sourceKey) {
    return sharedState.runtime;
  }

  if (!sharedState.loadPromise || sharedState.sourceKey !== source.sourceKey) {
    sharedState.sourceKey = source.sourceKey;
    sharedState.loadPromise = (async () => {
      if (source.isDirectModule) {
        const runtimeModule = await importMarkdownModule(source.moduleUrl);
        sharedState.runtime = {
          marked: runtimeModule.marked,
          DOMPurify: runtimeModule.DOMPurify,
          markedAdmonition: runtimeModule.markedAdmonition,
        };
        return sharedState.runtime;
      }

      const [markedModule, domPurifyModule, admonitionModule] = await Promise.all([
        importMarkdownModule(`${source.baseUrl}${MARKED_SPECIFIER}`),
        importMarkdownModule(`${source.baseUrl}${DOMPURIFY_SPECIFIER}`),
        importMarkdownModule(`${source.baseUrl}${MARKED_ADMONITION_SPECIFIER}`),
      ]);

      sharedState.runtime = {
        marked: markedModule.marked,
        DOMPurify: domPurifyModule.default,
        markedAdmonition: admonitionModule.default,
      };

      return sharedState.runtime;
    })().catch((error) => {
      sharedState.loadPromise = null;
      throw error;
    });
  }

  return sharedState.loadPromise;
}

/**
 * Returns the cached markdown runtime.
 * @returns {object} Markdown runtime.
 */
export function getMarkdownRuntime() {
  if (!sharedState.runtime) {
    throw new Error('Markdown runtime has not been loaded yet. Call ensureMarkdownRuntime() first.');
  }

  return sharedState.runtime;
}

/**
 * Clears the cached markdown runtime.
 */
export function resetMarkdownRuntime() {
  sharedState.loadPromise = null;
  sharedState.runtime = null;
  sharedState.sourceKey = '';
}