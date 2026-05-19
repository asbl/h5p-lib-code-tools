const PACKAGE_MANAGERS = [];

/**
 * Registry for package-specific Blockly categories and generators.
 *
 * Language content types use this registry to contribute optional block
 * categories such as Python NumPy or Miniworlds without hard-wiring them into
 * LibCodeTools. Subclasses can override `normalizePackageName()` to support
 * custom aliasing or `isValidManager()` to enforce a stricter manager contract.
 */
export class BlocklyPackageManagerRegistry {
  /**
   * @param {object} [options] Registry options.
   * @param {object[]} [options.store] Backing array.
   */
  constructor(options = {}) {
    this.store = options.store || PACKAGE_MANAGERS;
  }

  /**
   * Normalizes package names for matching and replacement.
   * @param {string} name Raw package name.
   * @returns {string} Normalized package name.
   */
  normalizePackageName(name = '') {
    return String(name || '').trim().toLowerCase();
  }

  /**
   * Checks whether a manager satisfies the minimal package manager contract.
   * @param {object} manager Candidate manager.
   * @returns {boolean} True if manager can be registered.
   */
  isValidManager(manager) {
    return manager && typeof manager.getPackageName === 'function';
  }

  /**
   * Registers package-specific Blockly categories/generators.
   * @param {object|object[]} managers Package manager instance(s).
   * @returns {object[]} Registered managers.
   */
  register(managers = []) {
    const entries = Array.isArray(managers) ? managers : [managers];

    entries
      .filter((manager) => this.isValidManager(manager))
      .forEach((manager) => {
        const packageName = this.normalizePackageName(manager.getPackageName());
        const existingIndex = this.store.findIndex((registered) => (
          this.normalizePackageName(registered.getPackageName?.()) === packageName
        ));

        if (existingIndex >= 0) {
          this.store[existingIndex] = manager;
          return;
        }

        this.store.push(manager);
      });

    return this.getAll();
  }

  /**
   * Returns registered managers.
   * @returns {object[]} Registered managers.
   */
  getAll() {
    return [...this.store];
  }

  /**
   * Clears registered managers. Intended for tests and content reloads.
   */
  reset() {
    this.store.length = 0;
  }
}

export const blocklyPackageManagerRegistry = new BlocklyPackageManagerRegistry({ store: PACKAGE_MANAGERS });

/**
 * Registers package managers in the shared registry.
 * @param {object|object[]} managers Package manager instance(s).
 * @returns {object[]} Registered managers.
 */
export function registerBlocklyPackageManagers(managers = []) {
  return blocklyPackageManagerRegistry.register(managers);
}

/**
 * Returns package managers from the shared registry.
 * @returns {object[]} Registered managers.
 */
export function getRegisteredBlocklyPackageManagers() {
  return blocklyPackageManagerRegistry.getAll();
}

/**
 * Clears the shared package manager registry.
 */
export function resetBlocklyPackageManagers() {
  blocklyPackageManagerRegistry.reset();
}
