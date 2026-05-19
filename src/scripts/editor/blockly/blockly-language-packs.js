import {
  normalizeBlocklyLanguagePack,
  UNSUPPORTED_LANGUAGE_PACK,
} from './blockly-language-pack-contract.js';

const LANGUAGE_PACKS = new Map();

/**
 * Registry for language-specific Blockly toolboxes and code generators.
 *
 * Content types should register their packs during bundle startup. Subclasses
 * can override `normalizeLanguageKey()` to support aliases or case-sensitive
 * language identifiers, and `getFallbackPack()` to change fallback behavior.
 */
export class BlocklyLanguagePackRegistry {
  /**
   * @param {object} [options] Registry options.
   * @param {Map<string, object>} [options.store] Backing store.
   */
  constructor(options = {}) {
    this.store = options.store || LANGUAGE_PACKS;
  }

  /**
   * Normalizes a language key before storage/lookup.
   * @param {string} codingLanguage Raw language key.
   * @returns {string} Normalized key.
   */
  normalizeLanguageKey(codingLanguage) {
    return String(codingLanguage || '').trim().toLowerCase();
  }

  /**
   * Registers a language-specific Blockly toolbox and generator.
   * @param {string|string[]} codingLanguages Language key(s), e.g. python/java.
   * @param {import('./blockly-language-pack-contract.js').BlocklyLanguagePack} languagePack Blockly language pack.
   * @returns {object} Registered language pack.
   */
  register(codingLanguages, languagePack) {
    const keys = Array.isArray(codingLanguages) ? codingLanguages : [codingLanguages];
    const normalizedPack = normalizeBlocklyLanguagePack(languagePack);

    keys
      .map((key) => this.normalizeLanguageKey(key))
      .filter(Boolean)
      .forEach((key) => {
        this.store.set(key, normalizedPack);
      });

    return normalizedPack;
  }

  /**
   * Returns the language pack for the given coding language.
   * @param {string} codingLanguage Active coding language.
   * @returns {{ toolbox: object, categoryFieldMap: object, generate: function, supported: boolean }} Language pack.
   */
  get(codingLanguage) {
    return this.store.get(this.normalizeLanguageKey(codingLanguage))
      || this.getFallbackPack();
  }

  /**
   * Returns fallback pack in priority order. Override if another language
   * should be the fallback for a custom distribution.
   * @returns {object} Fallback language pack.
   */
  getFallbackPack() {
    return this.store.get('pseudocode')
      || this.store.get('python')
      || UNSUPPORTED_LANGUAGE_PACK;
  }

  /**
   * Clears registered packs. Intended for unit tests.
   */
  reset() {
    this.store.clear();
  }

  /**
   * Returns registered language keys. Intended for diagnostics/tests.
   * @returns {string[]} Registered keys.
   */
  getKeys() {
    return [...this.store.keys()];
  }
}

export const blocklyLanguagePackRegistry = new BlocklyLanguagePackRegistry({ store: LANGUAGE_PACKS });

/**
 * Registers a language-specific Blockly pack in the shared registry.
 * @param {string|string[]} codingLanguages Language key(s).
 * @param {import('./blockly-language-pack-contract.js').BlocklyLanguagePack} languagePack Blockly language pack.
 * @returns {object} Registered language pack.
 */
export function registerBlocklyLanguagePack(codingLanguages, languagePack) {
  return blocklyLanguagePackRegistry.register(codingLanguages, languagePack);
}

/**
 * Resolves a Blockly language pack from the shared registry.
 * @param {string} codingLanguage Active coding language.
 * @returns {object} Language pack.
 */
export function getLanguagePack(codingLanguage) {
  return blocklyLanguagePackRegistry.get(codingLanguage);
}

/**
 * Clears the shared Blockly language pack registry.
 */
export function resetBlocklyLanguagePacks() {
  blocklyLanguagePackRegistry.reset();
}

/**
 * Returns language keys registered in the shared registry.
 * @returns {string[]} Registered language keys.
 */
export function getRegisteredBlocklyLanguageKeys() {
  return blocklyLanguagePackRegistry.getKeys();
}
