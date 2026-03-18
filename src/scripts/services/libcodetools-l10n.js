import defaultLanguage from './default-language.json';
import defaultLanguageDe from './default-language.de.json';

const LIB_CODE_TOOLS_LIBRARY = 'H5P.LibCodeTools';
const H5P_MISSING_TRANSLATION_PREFIX = '[Missing translation';

function getPreferredLocale() {
  const documentLanguage = globalThis.document?.documentElement?.lang;
  const navigatorLanguage = Array.isArray(globalThis.navigator?.languages)
    ? globalThis.navigator.languages[0]
    : globalThis.navigator?.language;

  return String(documentLanguage || navigatorLanguage || '').toLowerCase();
}

function getDefaultLibraryStrings() {
  return getPreferredLocale().startsWith('de')
    ? (defaultLanguageDe?.libraryStrings ?? defaultLanguage?.libraryStrings ?? {})
    : (defaultLanguage?.libraryStrings ?? {});
}

const DEFAULT_LIBRARY_STRINGS = getDefaultLibraryStrings();

function hasOwnStringValue(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key)
    && typeof target[key] === 'string'
    && target[key] !== '';
}

function isMissingTranslation(message) {
  return typeof message === 'string' && message.startsWith(H5P_MISSING_TRANSLATION_PREFIX);
}

function getOptionalLibraryString(key) {
  const message = H5P.t(key, undefined, LIB_CODE_TOOLS_LIBRARY);

  if (typeof message === 'string' && message !== '' && !isMissingTranslation(message)) {
    return message;
  }

  const fallback = DEFAULT_LIBRARY_STRINGS[key];
  if (typeof fallback === 'string' && fallback !== '') {
    return fallback;
  }

  return null;
}

function getLibraryString(key) {
  const value = getOptionalLibraryString(key);

  if (value !== null) {
    return value;
  }

  throw new Error(`Missing LibCodeTools language key: ${key}`);
}

export function createLibCodeToolsL10n(l10n = {}) {
  return new Proxy(l10n, {
    get(target, key, receiver) {
      if (typeof key !== 'string') {
        return Reflect.get(target, key, receiver);
      }

      if (hasOwnStringValue(target, key)) {
        return target[key];
      }

      const libraryValue = getOptionalLibraryString(key);
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

export function getLibCodeToolsL10nValue(l10n = {}, key) {
  if (hasOwnStringValue(l10n, key)) {
    return l10n[key];
  }

  const libraryValue = getOptionalLibraryString(key);
  if (libraryValue !== null) {
    return libraryValue;
  }

  const value = Reflect.get(l10n, key);

  if (typeof value !== 'string' || value === '') {
    throw new Error(`Missing LibCodeTools language key: ${key}`);
  }

  return value;
}