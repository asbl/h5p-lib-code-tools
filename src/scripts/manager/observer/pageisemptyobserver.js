import BaseObserver from './baseobserver';

/**
 * Observer that checks whether a page/element is empty (no HTML content).
 * @augments BaseObserver
 */
export default class PageIsEmptyObserver extends BaseObserver {

  constructor(target, callback) {
    const config = {
      childList: true,
      subtree: true,
      characterData: true
    };

    super(target, callback, config);
  }

  createObserver() {
    const observer = new MutationObserver(() => {
      const isEmpty = this.isEmpty(this.target);
      this.callback(isEmpty, this.target);
    });

    observer.observe(this.target, this.options);

    // initial check (wichtig)
    this.callback(this.isEmpty(this.target), this.target);

    return observer;
  }

  /**
   *
   * @param element The HTML element to check.
   * @returns {boolean} True, if element contains meaningful HTML
   */
  isEmpty(element) {
    if (!element) return true;

    // keine children + kein Text
    return (
      element.children.length === 0 &&
        element.textContent.trim().length === 0
    );
  }
}
