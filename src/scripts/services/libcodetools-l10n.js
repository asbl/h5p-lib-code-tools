import defaultLanguage from './default-language.json';
import defaultLanguageDe from './default-language.de.json';

const LIB_CODE_TOOLS_LIBRARY = 'H5P.LibCodeTools';
const H5P_MISSING_TRANSLATION_PREFIX = '[Missing translation';

/**
 * Resolves the preferred browser/content locale.
 * @returns {string} Lowercase locale string.
 */
function getPreferredLocale() {
  const documentLanguage = globalThis.document?.documentElement?.lang;
  const navigatorLanguage = Array.isArray(globalThis.navigator?.languages)
    ? globalThis.navigator.languages[0]
    : globalThis.navigator?.language;

  return String(documentLanguage || navigatorLanguage || '').toLowerCase();
}

/**
 * Returns bundled fallback strings for the preferred locale.
 * @returns {object} Fallback library strings.
 */
function getDefaultLibraryStrings() {
  return getPreferredLocale().startsWith('de')
    ? (defaultLanguageDe?.libraryStrings ?? defaultLanguage?.libraryStrings ?? {})
    : (defaultLanguage?.libraryStrings ?? {});
}

/**
 * Checks whether a target object owns a non-empty string value.
 * @param {object} target Candidate object.
 * @param {string} key Property key.
 * @returns {boolean} True if the property is a usable string.
 */
function hasOwnStringValue(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key)
    && typeof target[key] === 'string'
    && target[key] !== '';
}

/**
 * Detects H5P missing-translation placeholders.
 * @param {string} message Candidate host translation.
 * @returns {boolean} True if the message indicates a missing translation.
 */
function isMissingTranslation(message) {
  return typeof message === 'string' && message.startsWith(H5P_MISSING_TRANSLATION_PREFIX);
}

/**
 * Resolves LibCodeTools localization values with content overrides, H5P library
 * strings and built-in JSON fallbacks.
 *
 * Use this class when a component needs predictable localization behavior or
 * testable fallback rules. Subclasses can override `translate()` to connect a
 * different host translation system, or `getDefaultStrings()` to provide
 * component-specific fallback catalogs. The proxy created by `createProxy()` is
 * intentionally compatible with the older plain-object l10n usage.
 */
export class LibCodeToolsL10nProvider {
  /**
   * @param {object} [options] Provider options.
   * @param {string} [options.library] H5P library machine name.
   */
  constructor(options = {}) {
    this.library = options.library || LIB_CODE_TOOLS_LIBRARY;
    this.defaultStrings = options.defaultStrings || getDefaultLibraryStrings();
  }

  /**
   * Returns whether a target object contains a usable explicit string.
   * Override if empty strings should be meaningful in a specialized component.
   * @param {object} target Candidate l10n map.
   * @param {string} key Translation key.
   * @returns {boolean} True if the target owns a usable value.
   */
  hasOwnStringValue(target, key) {
    return hasOwnStringValue(target, key);
  }

  /**
   * Calls the host H5P translation API. Override for tests or non-H5P hosts.
   * @param {string} key Translation key.
   * @returns {string|null} Translated value or null.
   */
  translate(key) {
    const message = H5P.t(key, undefined, this.library);

    if (typeof message === 'string' && message !== '' && !isMissingTranslation(message)) {
      return message;
    }

    return null;
  }

  /**
   * Returns the built-in fallback catalog.
   * @returns {object} Fallback strings.
   */
  getDefaultStrings() {
    return this.defaultStrings;
  }

  /**
   * Resolves an optional library string without throwing.
   * @param {string} key Translation key.
   * @returns {string|null} Resolved value or null.
   */
  getOptionalLibraryString(key) {
    const translated = this.translate(key);
    if (translated !== null) {
      return translated;
    }

    const fallback = this.getDefaultStrings()[key];
    return typeof fallback === 'string' && fallback !== '' ? fallback : null;
  }

  /**
   * Resolves a required library string.
   * @param {string} key Translation key.
   * @returns {string} Resolved value.
   */
  getLibraryString(key) {
    const value = this.getOptionalLibraryString(key);

    if (value !== null) {
      return value;
    }

    throw new Error(`Missing LibCodeTools language key: ${key}`);
  }

  /**
   * Creates a proxy that first honors content-provided l10n values and then
   * falls back to library/default strings. Override to change lookup order.
   * @param {object} [l10n] Content l10n map.
   * @returns {Proxy} Proxy object with lazy fallback resolution.
   */
  createProxy(l10n = {}) {
    return new Proxy(l10n, {
      get: (target, key, receiver) => {
        if (typeof key !== 'string') {
          return Reflect.get(target, key, receiver);
        }

        if (this.hasOwnStringValue(target, key)) {
          return target[key];
        }

        const libraryValue = this.getOptionalLibraryString(key);
        if (libraryValue !== null) {
          return libraryValue;
        }

        const fallbackValue = Reflect.get(target, key, receiver);
        if (typeof fallbackValue === 'string' && fallbackValue !== '') {
          return fallbackValue;
        }

        throw new Error(`Missing LibCodeTools language key: ${key}`);
      },
    });
  }

  /**
   * Resolves one l10n value from a content l10n map and fallbacks.
   * @param {object} [l10n] Content l10n map.
   * @param {string} key Translation key.
   * @returns {string} Resolved value.
   */
  getValue(l10n = {}, key) {
    if (this.hasOwnStringValue(l10n, key)) {
      return l10n[key];
    }

    const libraryValue = this.getOptionalLibraryString(key);
    if (libraryValue !== null) {
      return libraryValue;
    }

    const value = Reflect.get(l10n, key);

    if (typeof value !== 'string' || value === '') {
      throw new Error(`Missing LibCodeTools language key: ${key}`);
    }

    return value;
  }
}

export const libCodeToolsL10nProvider = new LibCodeToolsL10nProvider();

/**
 * Creates a LibCodeTools l10n proxy using the shared provider.
 * @param {object} [l10n] Content-provided l10n map.
 * @returns {Proxy} Proxy object with lazy fallback resolution.
 */
export function createLibCodeToolsL10n(l10n = {}) {
  return libCodeToolsL10nProvider.createProxy(l10n);
}

/**
 * Resolves one LibCodeTools l10n value using the shared provider.
 * @param {object} [l10n] Content-provided l10n map.
 * @param {string} key Translation key.
 * @returns {string} Resolved value.
 */
export function getLibCodeToolsL10nValue(l10n = {}, key) {
  return libCodeToolsL10nProvider.getValue(l10n, key);
}
