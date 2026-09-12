const CODE_EDITOR_FACTORIES = new Map();

/**
 * Registry for custom editor implementations, keyed by editor mode.
 *
 * Content types that need an editor experience beyond CodeMirror/Blockly/
 * fill-blanks (e.g. a relational-algebra editor for SQL) register a factory
 * here during bundle startup instead of having it hard-wired into
 * EditorManager. Factories must follow the same constructor contract as the
 * built-in editors: `(target, content, codingLanguage, options)`.
 */
export class CodeEditorFactoryRegistry {
  /**
   * @param {object} [options] Registry options.
   * @param {Map<string, function>} [options.store] Backing store.
   */
  constructor(options = {}) {
    this.store = options.store || CODE_EDITOR_FACTORIES;
  }

  /**
   * Normalizes an editor mode key before storage/lookup.
   * @param {string} mode Raw editor mode.
   * @returns {string} Normalized key.
   */
  normalizeModeKey(mode) {
    return String(mode || '').trim().toLowerCase();
  }

  /**
   * Registers a custom editor factory for an editor mode.
   * @param {string} mode Editor mode identifier, e.g. 'relalg'.
   * @param {function} factory Editor constructor: (target, content, codingLanguage, options).
   * @returns {void}
   */
  register(mode, factory) {
    const key = this.normalizeModeKey(mode);

    if (!key || typeof factory !== 'function') {
      return;
    }

    this.store.set(key, factory);
  }

  /**
   * Returns the factory registered for an editor mode, if any.
   * @param {string} mode Editor mode identifier.
   * @returns {function|null} Registered editor constructor.
   */
  get(mode) {
    return this.store.get(this.normalizeModeKey(mode)) || null;
  }

  /**
   * Clears registered factories. Intended for unit tests.
   * @returns {void}
   */
  reset() {
    this.store.clear();
  }

  /**
   * Returns registered editor modes. Intended for diagnostics/tests.
   * @returns {string[]} Registered modes.
   */
  getKeys() {
    return [...this.store.keys()];
  }
}

export const codeEditorFactoryRegistry = new CodeEditorFactoryRegistry({ store: CODE_EDITOR_FACTORIES });

/**
 * Registers a custom editor factory in the shared registry.
 * @param {string} mode Editor mode identifier.
 * @param {function} factory Editor constructor.
 * @returns {void}
 */
export function registerCodeEditorFactory(mode, factory) {
  return codeEditorFactoryRegistry.register(mode, factory);
}

/**
 * Resolves a custom editor factory from the shared registry.
 * @param {string} mode Editor mode identifier.
 * @returns {function|null} Registered editor constructor.
 */
export function getCodeEditorFactory(mode) {
  return codeEditorFactoryRegistry.get(mode);
}

/**
 * Clears the shared custom editor factory registry.
 * @returns {void}
 */
export function resetCodeEditorFactories() {
  codeEditorFactoryRegistry.reset();
}

/**
 * Returns editor modes registered in the shared registry.
 * @returns {string[]} Registered modes.
 */
export function getRegisteredCodeEditorModes() {
  return codeEditorFactoryRegistry.getKeys();
}
