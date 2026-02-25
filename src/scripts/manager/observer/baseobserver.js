/**
 * Base class for all DOM observers.
 */
export default class BaseObserver {
  constructor(target, callback, options = {}) {
    this.target = target;
    this.callback = callback;
    this.options = options;
    this.observer = null;
  }

  /**
   * Factory method – must be implemented by subclasses
   */
  createObserver() {
    throw new Error('BaseObserver: createObserver() must be implemented');
  }

  /**
   * Starts observing
   */
  start() {
    if (!(this.target instanceof HTMLElement)) {
      console.warn('BaseObserver: target is not a valid HTMLElement', this.target);
      return;
    }
    if (typeof this.callback !== 'function') {
      console.warn('BaseObserver: callback is not a function', this.callback);
      return;
    }
    if (this.observer) return;

    this.observer = this.createObserver();
  }

  /**
   * Stops observing
   */
  stop() {
    if (!this.observer) return;

    if (typeof this.observer.disconnect === 'function') {
      this.observer.disconnect();
    }

    this.observer = null;
  }
}
