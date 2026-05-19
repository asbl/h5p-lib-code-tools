import { getLanguagePack } from '../blockly-language-packs.js';
import { getRegisteredBlocklyPackageManagers } from '../blockly-package-managers.js';
import AssetsBlockProvider from './assets-block-provider.js';

const PACKAGE_LANGUAGES = new Set(['python', 'pseudocode']);

/**
 * Builds a (potentially filtered) toolbox based on a category selection map.
 * If `categorySelection` is null/undefined, the full unmodified toolbox is returned.
 * For categories referenced by `categoryFieldMap`, a category is included as long as
 * its boolean field is not explicitly `false`. Categories outside of that map are
 * left untouched.
 * @param {object} toolbox Full toolbox definition.
 * @param {Record<string, boolean>|null|undefined} categorySelection Boolean map keyed by field name.
 * @param {Record<string, string>} categoryFieldMap Maps field names to toolbox category display names.
 * @returns {object} Full or filtered toolbox.
 */
export function buildFilteredToolbox(toolbox, categorySelection, categoryFieldMap) {
  if (!categorySelection || typeof categorySelection !== 'object') {
    return toolbox;
  }

  const mappedNames = new Set(Object.values(categoryFieldMap || {}));
  const enabledNames = new Set(
    Object.entries(categoryFieldMap || {})
      .filter(([fieldKey]) => categorySelection[fieldKey] !== false)
      .map(([, name]) => name)
  );

  const filteredContents = toolbox.contents.filter((cat) => {
    if (!mappedNames.has(cat.name)) {
      return true;
    }

    return enabledNames.has(cat.name);
  });

  if (filteredContents.length === toolbox.contents.length) {
    return toolbox;
  }

  return { ...toolbox, contents: filteredContents };
}

/**
 * Adds package-specific toolbox categories for supported languages.
 * @param {object} toolbox Base toolbox.
 * @param {string} codingLanguage Active language key.
 * @param {string[]} packageNames Selected package names.
 * @param {Array<object>} packageManagers Package manager instances.
 * @returns {object} Base toolbox or extended toolbox.
 */
export function buildPackageToolbox(
  toolbox,
  codingLanguage,
  packageNames = [],
  packageManagers = getRegisteredBlocklyPackageManagers(),
) {
  const normalizedLanguage = String(codingLanguage || '').toLowerCase();
  if (!PACKAGE_LANGUAGES.has(normalizedLanguage)) {
    return toolbox;
  }

  const managerMap = new Map(
    packageManagers.map((manager) => [manager.getPackageName(), manager])
  );

  const selectedPackages = [
    ...new Set(
      (Array.isArray(packageNames) ? packageNames : [])
        .map((name) => String(name || '').trim().toLowerCase())
        .filter(Boolean)
    ),
  ];

  const existingCategoryNames = new Set(
    (Array.isArray(toolbox.contents) ? toolbox.contents : []).map((category) => category?.name)
  );

  const additions = selectedPackages
    .map((packageName) => managerMap.get(packageName))
    .filter((manager) => manager?.supportsLanguage(normalizedLanguage))
    .flatMap((manager) => {
      const categoryResult = manager.buildCategory();
      return Array.isArray(categoryResult) ? categoryResult : [categoryResult];
    })
    .filter((category) => category?.name && !existingCategoryNames.has(category.name));

  if (additions.length === 0) {
    return toolbox;
  }

  return {
    ...toolbox,
    contents: [
      ...toolbox.contents,
      ...additions,
    ],
  };
}

/**
 * Central language manager for Blockly toolbox and code generation.
 */
export default class BlocklyLanguageManager {
  /**
   * @param {string} codingLanguage Active coding language.
   * @param {string[]} packageNames Selected package names.
   * @param {Array<object>} packageManagers Package manager instances.
   * @param {object|null} codeContainer CodeContainer for asset access.
   */
  constructor(codingLanguage, packageNames = [], packageManagers = getRegisteredBlocklyPackageManagers(), codeContainer = null) {
    this.codingLanguage = codingLanguage;
    this.packageNames = Array.isArray(packageNames) ? packageNames : [];
    this.packageManagers = Array.isArray(packageManagers) ? packageManagers : getRegisteredBlocklyPackageManagers();
    this.codeContainer = codeContainer;
    this.languagePack = getLanguagePack(codingLanguage);
    this.assetsBlockProvider = codeContainer ? new AssetsBlockProvider(codeContainer) : null;
  }

  /**
   * Registers language-specific custom Blockly blocks.
   * @param {object} Blockly Loaded Blockly runtime.
   * @returns {void}
   */
  registerBlocks(Blockly) {
    this.languagePack.registerBlocks?.(Blockly);
  }

  /**
   * Returns the resolved language pack.
   * @returns {{toolbox: object, categoryFieldMap: object, generate: function, supported: boolean}} Language pack.
   */
  getLanguagePack() {
    return this.languagePack;
  }

  /**
   * Builds the effective toolbox for the current language and package selection.
   * Includes asset blocks (images/sounds) if codeContainer is available.
   * @param {Record<string, boolean>|null|undefined} categorySelection Category selection map.
   * @returns {object} Filtered toolbox.
   */
  buildToolbox(categorySelection, context = {}) {
    const packageToolbox = buildPackageToolbox(
      this.languagePack.toolbox,
      this.codingLanguage,
      this.packageNames,
      this.packageManagers,
    );

    // Add asset blocks category if available
    let toolboxWithAssets = packageToolbox;
    if (this.assetsBlockProvider) {
      const assetCategory = this.assetsBlockProvider.buildCategory();
      if (assetCategory) {
        toolboxWithAssets = {
          ...packageToolbox,
          contents: [
            ...packageToolbox.contents,
            assetCategory,
          ],
        };
      }
    }

    const dynamicCategories = this.languagePack.buildDynamicCategories?.(context) || [];
    const toolboxWithDynamicCategories = dynamicCategories.length > 0
      ? {
        ...toolboxWithAssets,
        contents: [
          ...toolboxWithAssets.contents,
          ...dynamicCategories,
        ],
      }
      : toolboxWithAssets;

    return buildFilteredToolbox(
      toolboxWithDynamicCategories,
      categorySelection,
      this.languagePack.categoryFieldMap ?? {},
    );
  }

  /**
   * Generates code for the given Blockly workspace.
   * @param {object|null} workspace Blockly workspace.
   * @returns {string} Generated source code.
   */
  generateCode(workspace) {
    if (!workspace) {
      return '';
    }

    return this.languagePack.generate(workspace) || '';
  }
}
