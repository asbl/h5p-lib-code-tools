import BaseObserver from './baseobserver';

/**
 * Observer for the "code" page.
 * @augments BaseObserver
 */
export default class PageIsVisibleObserver extends BaseObserver {
  /**
   * @param {object} params
   * @param {object} params.pageManager - Manages pages.
   * @param {object} params.callbacks - Callback functions for actions.
   * @param {function} params.callbacks.updateButton - Updates button visibility.
   * @param target
   * @param callback
   */
  constructor(target, callback) {
    const config = { attributes: true, attributeFilter: ['style'] };
    super(target, callback, config);
  }

  createObserver() {
    const observer = new IntersectionObserver(this.callback, this.options);
    observer.observe(this.target);
    return observer;
  }

}