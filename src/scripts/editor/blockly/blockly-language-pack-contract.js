export const UNSUPPORTED_TOOLBOX = {
  kind: 'categoryToolbox',
  contents: [],
};

/**
 * @typedef {object} BlocklyLanguagePack
 * @property {object} toolbox Blockly toolbox definition.
 * @property {Record<string, string>} [categoryFieldMap] Maps semantic category
 * keys from semantics.json to visible Blockly category labels.
 * @property {(workspace: object) => string} generate Converts a Blockly
 * workspace to executable source code.
 * @property {(Blockly: object) => void} [registerBlocks] Registers custom
 * Blockly blocks required by this language pack.
 * @property {(context: object) => object[]} [buildDynamicCategories] Builds
 * toolbox categories from the active editor/project context.
 * @property {(code: string) => object|null} [createWorkspaceStateFromCode]
 * Creates an initial Blockly workspace state from source code when possible.
 * @property {boolean} [supported=true] Whether Blockly editing is supported for
 * this language.
 */

export const UNSUPPORTED_LANGUAGE_PACK = {
  toolbox: UNSUPPORTED_TOOLBOX,
  categoryFieldMap: {},
  generate: () => '',
  registerBlocks: () => {},
  buildDynamicCategories: () => [],
  createWorkspaceStateFromCode: () => null,
  supported: false,
};

/**
 * Validates and normalizes Blockly language pack objects.
 *
 * Use this class if a content type needs stricter validation or wants to
 * customize the unsupported fallback. Subclasses should override
 * `validate()` for additional contract rules and `normalize()` when extra pack
 * properties must be carried through.
 */
export class BlocklyLanguagePackContract {
  /**
   * @param {object} [options] Contract options.
   * @param {BlocklyLanguagePack} [options.unsupportedPack] Fallback pack.
   */
  constructor(options = {}) {
    this.unsupportedPack = options.unsupportedPack || UNSUPPORTED_LANGUAGE_PACK;
  }

  /**
   * Normalizes language packs registered by content types.
   * @param {Partial<BlocklyLanguagePack>} languagePack Candidate language pack.
   * @returns {BlocklyLanguagePack} Normalized language pack.
   */
  normalize(languagePack = {}) {
    return {
      toolbox: languagePack?.toolbox || UNSUPPORTED_TOOLBOX,
      categoryFieldMap: languagePack?.categoryFieldMap || {},
      generate: typeof languagePack?.generate === 'function'
        ? languagePack.generate
        : () => '',
      registerBlocks: typeof languagePack?.registerBlocks === 'function'
        ? languagePack.registerBlocks
        : () => {},
      buildDynamicCategories: typeof languagePack?.buildDynamicCategories === 'function'
        ? languagePack.buildDynamicCategories
        : () => [],
      createWorkspaceStateFromCode: typeof languagePack?.createWorkspaceStateFromCode === 'function'
        ? languagePack.createWorkspaceStateFromCode
        : () => null,
      supported: languagePack?.supported !== false,
    };
  }

  /**
   * Performs cheap contract checks without requiring a Blockly runtime.
   * @param {Partial<BlocklyLanguagePack>} languagePack Candidate language pack.
   * @returns {string[]} Contract violations.
   */
  validate(languagePack = {}) {
    const errors = [];

    if (!languagePack || typeof languagePack !== 'object') {
      return ['Language pack must be an object.'];
    }

    if (!languagePack.toolbox || typeof languagePack.toolbox !== 'object') {
      errors.push('Language pack must define a toolbox object.');
    }

    if (languagePack.toolbox && !Array.isArray(languagePack.toolbox.contents)) {
      errors.push('Language pack toolbox must define a contents array.');
    }

    if (
      languagePack.categoryFieldMap !== undefined
      && (
        !languagePack.categoryFieldMap
        || typeof languagePack.categoryFieldMap !== 'object'
        || Array.isArray(languagePack.categoryFieldMap)
      )
    ) {
      errors.push('Language pack categoryFieldMap must be an object when present.');
    }

    if (typeof languagePack.generate !== 'function') {
      errors.push('Language pack must define a generate(workspace) function.');
    }

    if (
      languagePack.registerBlocks !== undefined
      && typeof languagePack.registerBlocks !== 'function'
    ) {
      errors.push('Language pack registerBlocks hook must be a function when present.');
    }

    if (
      languagePack.buildDynamicCategories !== undefined
      && typeof languagePack.buildDynamicCategories !== 'function'
    ) {
      errors.push('Language pack buildDynamicCategories hook must be a function when present.');
    }

    if (
      languagePack.createWorkspaceStateFromCode !== undefined
      && typeof languagePack.createWorkspaceStateFromCode !== 'function'
    ) {
      errors.push('Language pack createWorkspaceStateFromCode hook must be a function when present.');
    }

    if (
      languagePack.supported !== undefined
      && typeof languagePack.supported !== 'boolean'
    ) {
      errors.push('Language pack supported flag must be boolean when present.');
    }

    return errors;
  }
}

export const blocklyLanguagePackContract = new BlocklyLanguagePackContract();

/**
 * Normalizes a language pack with the shared contract.
 * @param {BlocklyLanguagePack} languagePack Candidate language pack.
 * @returns {BlocklyLanguagePack} Normalized language pack.
 */
export function normalizeBlocklyLanguagePack(languagePack = {}) {
  return blocklyLanguagePackContract.normalize(languagePack);
}

/**
 * Validates a language pack with the shared contract.
 * @param {BlocklyLanguagePack} languagePack Candidate language pack.
 * @returns {string[]} Validation messages.
 */
export function validateBlocklyLanguagePack(languagePack = {}) {
  return blocklyLanguagePackContract.validate(languagePack);
}
