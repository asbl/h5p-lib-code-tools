export const COMMON_EXTERNAL_LIBRARY_URL_KEYS = {
  blockly: 'blocklyCdnUrl',
  blocklycdnurl: 'blocklyCdnUrl',
  codemirror: 'codeMirrorCdnUrl',
  codemirrorcdnurl: 'codeMirrorCdnUrl',
  markdown: 'markdownCdnUrl',
  markdowncdnurl: 'markdownCdnUrl',
  fontawesome: 'fontAwesomeCdnUrl',
  fontawesomecdnurl: 'fontAwesomeCdnUrl',
  sweetalert: 'sweetAlertCdnUrl',
  sweetalertcdnurl: 'sweetAlertCdnUrl',
  jszip: 'jsZipCdnUrl',
  jszipcdnurl: 'jsZipCdnUrl',
  p5: 'p5CdnUrl',
  p5cdnurl: 'p5CdnUrl',
  skulpt: 'skulptCdnUrl',
  skulptcdnurl: 'skulptCdnUrl',
  sqljs: 'sqlJsUrl',
  sqljsurl: 'sqlJsUrl',
  pyodide: 'pyodideCdnUrl',
  pyodidecdnurl: 'pyodideCdnUrl',
  teavm: 'teavmAssetBaseUrl',
  teavmassetbase: 'teavmAssetBaseUrl',
  teavmassetbaseurl: 'teavmAssetBaseUrl',
  teavmbase: 'teavmAssetBaseUrl',
  teavmbaseurl: 'teavmAssetBaseUrl',
  teavmworker: 'teavmWorkerUrl',
  teavmworkerurl: 'teavmWorkerUrl',
  teavmstdlib: 'teavmStdlibUrl',
  teavmstdliburl: 'teavmStdlibUrl',
  teavmruntimestdlib: 'teavmRuntimeStdlibUrl',
  teavmruntimestdliburl: 'teavmRuntimeStdlibUrl',
  teavmframe: 'teavmFrameUrl',
  teavmframeurl: 'teavmFrameUrl',
  teavmframescript: 'teavmFrameScriptUrl',
  teavmframescripturl: 'teavmFrameScriptUrl',
};

/**
 * Normalizes shared CodeQuestion configuration fragments.
 *
 * Use this class from content types that need to parse `externalLibraryUrls`,
 * decode editor text, or normalize common option shapes. Subclasses can extend
 * `keyMap` in the constructor or override individual methods for stricter
 * language-specific behavior while keeping the same public API.
 */
export class CodeQuestionConfigNormalizer {
  /**
   * @param {object} [options] Normalizer options.
   * @param {Record<string, string>} [options.keyMap] External library URL key map.
   */
  constructor(options = {}) {
    this.keyMap = options.keyMap || COMMON_EXTERNAL_LIBRARY_URL_KEYS;
  }

  /**
   * Decodes HTML entities that may be persisted by H5P editor widgets.
   * @param {string} [value] Encoded text value.
   * @returns {string} Decoded string.
   */
  decodeHtmlCode(value = '') {
    return String(value || '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, '\'')
      .replace(/&#039;/g, '\'')
      .replace(/&amp;/g, '&');
  }

  /**
   * Normalizes author-provided YAML keys before lookup. Override when a content
   * type wants to accept additional punctuation or case-sensitive keys.
   * @param {string} key Raw key.
   * @returns {string} Normalized key.
   */
  normalizeExternalLibraryKey(key = '') {
    return String(key || '').trim().replace(/[^a-z0-9]/gi, '').toLowerCase();
  }

  /**
   * Removes matching quotes from simple YAML scalar values.
   * @param {string} value Raw scalar.
   * @returns {string} Unquoted scalar.
   */
  unquoteYamlScalar(value = '') {
    const trimmed = String(value || '').trim();
    const quote = trimmed[0];

    if (
      trimmed.length >= 2 &&
      (quote === '"' || quote === '\'') &&
      trimmed[trimmed.length - 1] === quote
    ) {
      return trimmed.slice(1, -1).trim();
    }

    return trimmed;
  }

  /**
   * Parses the simple key-value YAML map used for external library URLs.
   * Supports top-level entries and intentionally ignores unknown keys.
   * @param {string} [value] Raw YAML-ish text from semantics.
   * @param {Record<string, string>} [keyMap] Accepted normalized key map.
   * @returns {object} Normalized option keys.
   */
  parseExternalLibraryUrlsYaml(value = '', keyMap = this.keyMap) {
    const result = {};

    this.decodeHtmlCode(value).split(/\r?\n/).forEach((line) => {
      const withoutComment = line.replace(/\s+#.*$/, '').trim();
      if (!withoutComment || withoutComment.startsWith('#')) {
        return;
      }

      const separatorIndex = withoutComment.indexOf(':');
      if (separatorIndex === -1) {
        return;
      }

      const rawKey = withoutComment.slice(0, separatorIndex);
      const rawValue = withoutComment.slice(separatorIndex + 1);
      const url = this.unquoteYamlScalar(rawValue);

      if (!url) {
        return;
      }

      const optionKey = keyMap[this.normalizeExternalLibraryKey(rawKey)];
      if (optionKey) {
        result[optionKey] = url;
      }
    });

    return result;
  }

  /**
   * Resolves one external library URL using YAML overrides first, then fallback
   * options and finally advanced options.
   * @param {object} options Lookup options.
   * @param {object} [options.yamlUrls] Parsed YAML URL overrides.
   * @param {object} [options.advancedOptions] Advanced option values.
   * @param {object} [options.fallbackOptions] Fallback option values.
   * @param {string} [options.optionName] Option key to resolve.
   * @returns {string} Resolved URL or empty string.
   */
  getExternalLibraryUrl({
    yamlUrls = {},
    advancedOptions = {},
    fallbackOptions = {},
    optionName = '',
  } = {}) {
    if (yamlUrls?.[optionName]) {
      return yamlUrls[optionName];
    }

    if (fallbackOptions?.[optionName]) {
      return String(fallbackOptions[optionName] || '').trim();
    }

    return String(advancedOptions?.[optionName] || '').trim();
  }

  /**
   * Returns a plain object or an empty object for invalid inherited values.
   * @param {*} options Candidate options.
   * @returns {object} Plain option object.
   */
  normalizePlainObject(options) {
    return (!Array.isArray(options) && typeof options === 'object' && options !== null)
      ? options
      : {};
  }

  /**
   * Validates an editor mode against supported values.
   * @param {string} mode Candidate mode.
   * @param {string[]} supportedModes Ordered supported modes.
   * @returns {string} Valid mode.
   */
  normalizeEditorMode(mode, supportedModes = ['code']) {
    return supportedModes.includes(mode) ? mode : supportedModes[0] || 'code';
  }
}

export const codeQuestionConfigNormalizer = new CodeQuestionConfigNormalizer();

/**
 * Decodes HTML entities using the shared config normalizer.
 * @param {string} [value] Encoded text value.
 * @returns {string} Decoded string.
 */
export function decodeHtmlCode(value = '') {
  return codeQuestionConfigNormalizer.decodeHtmlCode(value);
}

/**
 * Normalizes an external library YAML key.
 * @param {string} [key] Raw key.
 * @returns {string} Normalized key.
 */
export function normalizeExternalLibraryKey(key = '') {
  return codeQuestionConfigNormalizer.normalizeExternalLibraryKey(key);
}

/**
 * Removes matching quotes from a simple YAML scalar.
 * @param {string} [value] Raw scalar.
 * @returns {string} Unquoted scalar.
 */
export function unquoteYamlScalar(value = '') {
  return codeQuestionConfigNormalizer.unquoteYamlScalar(value);
}

/**
 * Parses common external library URL YAML overrides.
 * @param {string} [value] Raw YAML-ish text.
 * @param {Record<string, string>} [keyMap] Accepted normalized key map.
 * @returns {object} Normalized option keys.
 */
export function parseExternalLibraryUrlsYaml(value = '', keyMap = COMMON_EXTERNAL_LIBRARY_URL_KEYS) {
  return codeQuestionConfigNormalizer.parseExternalLibraryUrlsYaml(value, keyMap);
}

/**
 * Resolves one external library URL through the shared normalizer.
 * @param {object} [options] Lookup options.
 * @returns {string} Resolved URL or empty string.
 */
export function getExternalLibraryUrl(options = {}) {
  return codeQuestionConfigNormalizer.getExternalLibraryUrl(options);
}

/**
 * Returns a plain object or an empty object for invalid option values.
 * @param {*} options Candidate options.
 * @returns {object} Plain option object.
 */
export function normalizePlainObject(options) {
  return codeQuestionConfigNormalizer.normalizePlainObject(options);
}

/**
 * Validates an editor mode against supported values.
 * @param {string} mode Candidate mode.
 * @param {string[]} supportedModes Ordered supported modes.
 * @returns {string} Valid mode.
 */
export function normalizeEditorMode(mode, supportedModes = ['code']) {
  return codeQuestionConfigNormalizer.normalizeEditorMode(mode, supportedModes);
}
