/**
 * Normalizes project file context for language-specific Blockly packs.
 *
 * The editor owns files, active file, and entry file. Language packs should not
 * need to know where that information is stored, so this builder creates a
 * compact, stable context object that Java, Python, SQL, or later languages can
 * all consume when building dynamic toolbox categories.
 */
export class BlocklyProjectContextBuilder {
  /**
   * @param {object} workspace Current editor workspace.
   * @param {object} fallbackOptions Editor workspace options.
   */
  constructor(workspace = {}, fallbackOptions = {}) {
    this.workspace = workspace || {};
    this.fallbackOptions = fallbackOptions || {};
  }

  /**
   * Builds a serializable project context for Blockly language packs.
   * @param {object|null} activeFile Active workspace file.
   * @returns {{activeFileName: string, entryFileName: string, files: object[]}}
   */
  build(activeFile = null) {
    const files = Array.isArray(this.workspace.files) ? this.workspace.files : [];
    const entryFileName = this.workspace.entryFileName || this.fallbackOptions.entryFileName || '';

    return {
      activeFileName: activeFile?.name || this.workspace.activeFileName || entryFileName,
      entryFileName,
      files: files.map((file) => ({
        name: file.name,
        code: file.code,
        visible: file.visible,
        editable: file.editable,
        isEntry: file.isEntry,
        blocklyWorkspaceState: file.blocklyWorkspaceState || null,
      })),
    };
  }
}

/**
 * Extracts class-like symbols from project files in a language-agnostic way.
 *
 * Language packs can pass their own extension or entry file names to get class
 * candidates suitable for object-creation categories. This intentionally uses
 * file names as the common denominator, because that works for Java classes and
 * Python modules/classes without coupling LibCodeTools to either syntax.
 */
export class ProjectClassSymbolExtractor {
  constructor(context = {}, options = {}) {
    this.context = context || {};
    this.extension = options.extension || '';
    this.entryFileName = options.entryFileName || this.context.entryFileName || '';
  }

  /**
   * Returns unique class-like names from project file names.
   * @returns {string[]} Class-like names.
   */
  getClassNames() {
    return [
      ...new Set(
        (Array.isArray(this.context.files) ? this.context.files : [])
          .filter((file) => file?.name && file.name !== this.entryFileName)
          .map((file) => this.getNameWithoutExtension(file.name))
          .map((name) => name.trim())
          .filter(Boolean)
      ),
    ];
  }

  getNameWithoutExtension(fileName) {
    const name = String(fileName || '').split(/[\\/]/).pop() || '';
    if (this.extension && name.toLowerCase().endsWith(this.extension.toLowerCase())) {
      return name.slice(0, -this.extension.length);
    }

    return name.replace(/\.[A-Za-z0-9]+$/i, '');
  }
}

/**
 * Stores dynamic class names for Blockly dropdown callbacks.
 *
 * Blockly dropdown functions are called outside the language-pack object, so a
 * tiny global registry is the least invasive way to keep dropdown options live.
 * Keys are language identifiers such as `java` or `python`.
 */
export class BlocklyProjectClassRegistry {
  constructor(root = globalThis) {
    this.root = root;
    this.registryKey = '__H5P_BLOCKLY_PROJECT_CLASSES__';
  }

  set(language, classNames = []) {
    const key = this.normalizeLanguage(language);
    this.root[this.registryKey] = this.root[this.registryKey] || {};
    this.root[this.registryKey][key] = [
      ...new Set(
        (Array.isArray(classNames) ? classNames : [])
          .map((name) => String(name || '').trim())
          .filter(Boolean)
      ),
    ];
  }

  get(language, fallback = []) {
    const key = this.normalizeLanguage(language);
    const values = this.root[this.registryKey]?.[key];
    return Array.isArray(values) && values.length > 0 ? values : fallback;
  }

  normalizeLanguage(language) {
    return String(language || '').trim().toLowerCase();
  }
}

export const blocklyProjectClassRegistry = new BlocklyProjectClassRegistry();
