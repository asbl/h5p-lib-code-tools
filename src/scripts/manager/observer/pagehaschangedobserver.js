import BaseObserver from './baseobserver';

/**
 * Observer for the "code" page.
 * @augments BaseObserver
 */
export default class PageHasChangedObserver extends BaseObserver {
  /**
   * @param {object} params
   * @param {object} params.pageManager - Manages pages.
   * @param {object} params.callbacks - Callback functions for actions.
   * @param {function} params.callbacks.updateButton - Updates button visibility.
   * @param target
   * @param callback
   */
  constructor(target, callback) {
    const config = { childList: true, subtree: true };
    super(target, callback, config);
  }

  createObserver() {
    const observer = new MutationObserver(this.callback);
    observer.observe(this.target, this.options);
    return observer;
  }

}