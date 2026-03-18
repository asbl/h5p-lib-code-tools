import BaseObserver from './baseobserver';

/**
 * Observer that triggers callback when a page becomes visible.
 * @augments BaseObserver
 */
export default class PageShowObserver extends BaseObserver {
  constructor(target, callback) {
    // Observe class changes
    const config = { attributes: true, attributeFilter: ['class'] };
    super(target, callback, config);
    this.wasVisible = target.classList.contains('active');
  }

  createObserver() {
    // If page is already visible, fire immediately
    if (this.wasVisible) this.callback();

    const observer = new MutationObserver(() => {
      const isVisible = this.target.classList.contains('active');
      if (isVisible && !this.wasVisible) {
        this.wasVisible = true;
        this.callback();
      }
      else if (!isVisible && this.wasVisible) {
        this.wasVisible = false;
      }
    });

    observer.observe(this.target, this.options);
    return observer;
  }
}
