/**
 * Manager class for handling multiple named observers.
 * @class
 */
export default class ObserverManager {
  constructor() {
    /** @type {Map<string, BaseObserver>} */
    this.observers = new Map();
  }

  /**
   * Registers and starts an observer under a given name.
   * @param {string} name - Unique observer name.
   * @param {BaseObserver} observer - Observer to register.
   */
  register(name, observer) {
    if (this.observers.has(name)) {
      throw new Error(`Observer '${name}' is already registered.`);
    }

    this.observers.set(name, observer);
    observer.start();
  }

  /**
   * Stops and unregisters a single observer.
   * @param {string} name - Observer name.
   */
  unregister(name) {
    const observer = this.observers.get(name);
    if (!observer) return;

    observer.stop();
    this.observers.delete(name);
  }

  /**
   * Stops and removes all observers.
   */
  disconnectAll() {
    this.observers.forEach((observer) => observer.stop());
    this.observers.clear();
  }
}
