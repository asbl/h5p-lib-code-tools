import BaseObserver from './baseobserver';

/**
 * Observer that triggers callback when a page becomes hidden.
 * @augments BaseObserver
 */
export default class PageHideObserver extends BaseObserver {
  constructor(target, callback) {
    const config = { attributes: true, attributeFilter: ['style'] };
    super(target, callback, config);
    this.wasVisible = target.style.display !== 'none';
  }

  createObserver() {
    // If page is already hidden, fire immediately
    if (!this.wasVisible) this.callback();

    const observer = new MutationObserver(() => {
      const isVisible = this.target.style.display !== 'none';
      if (!isVisible && this.wasVisible) {
        this.wasVisible = false;
        this.callback();
      }
      else if (isVisible && !this.wasVisible) {
        this.wasVisible = true;
      }
    });

    observer.observe(this.target, this.options);
    return observer;
  }
}
